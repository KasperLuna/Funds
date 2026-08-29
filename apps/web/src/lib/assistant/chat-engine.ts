import type { LlmEngine } from "@/lib/llm/types";
import { buildSnapshot, type AssistantSnapshot } from "./serialize";
import { buildSystemPrompt, buildUserPrompt, buildCorrectivePrompt } from "./prompts";
import { extractJson, schemaByUseCase } from "./schemas";
import { deterministicFallback, fallbackWithNotice, queryResultToMessage, tsToMsg, newId } from "./handlers";
import { assistantQuerySchema, executeQuery, type QueryCtx } from "./queries";
import type { AssistantMessage, ChatMessage, UseCaseId } from "./types";
import type { Account, Txn } from "@/lib/accounts/accounts-store";
import type { Category, CategoryBudget } from "@/lib/categories/categories-store";

/**
 * Query-generation orchestrator. The model's ONLY job is to translate the
 * user's question into one JSON query object (SELECT-only by construction —
 * the query language has no write path). The data layer computes every figure
 * from local rows; the widget renders directly. Hallucinated money cannot
 * reach the UI: hallucinated keys are stripped by Zod, and the executor
 * re-derives everything from rows.
 *
 * cavetail: small models forget parameters, so the deterministic layer
 * back-fills period/category from the user's own words (queries.ts). On any
 * parse/validation failure we retry once with a corrective prompt, then
 * derive the answer deterministically via inferUseCase. Every raw model
 * generation is kept on the message (rawOutput) for debugging.
 */
export type ChatEngineDeps = {
  engine: LlmEngine;
  accounts: Account[];
  categories: Category[];
  categoryBudgets: CategoryBudget[];
  txns: Txn[];
  assetsById: Map<string, { code: string; decimals: number }>;
  /** Heuristic to pick the fallback use case when the model produces nothing usable. */
  inferUseCase: (userText: string, snapshot: AssistantSnapshot) => UseCaseId;
  /** Called for each token as the model streams its response. */
  onToken?: (token: string) => void;
};

export type ChatEngineInput = {
  text: string;
  now: number;
  userId: string;
};

export type ChatEngineResult = {
  user: ChatMessage;
  assistant: AssistantMessage;
};

const USE_CASE_ORDER: UseCaseId[] = [
  "spending_query",
  "budget_check",
  "weekly_summary",
  "voice_to_txn",
  "fallback_text",
];

const USE_CASE_OF_SELECT: Record<"spending" | "budget" | "summary" | "log_txn", UseCaseId> = {
  spending: "spending_query",
  budget: "budget_check",
  summary: "weekly_summary",
  log_txn: "voice_to_txn",
};

function buildCtx(deps: ChatEngineDeps, now: number): QueryCtx {
  return {
    accounts: deps.accounts,
    categories: deps.categories,
    categoryBudgets: deps.categoryBudgets,
    txns: deps.txns,
    assetsById: deps.assetsById,
    now,
  };
}

function buildSnapshotFor(deps: ChatEngineDeps): AssistantSnapshot {
  return buildSnapshot({
    accounts: deps.accounts,
    categories: deps.categories,
    txns: deps.txns,
    assetsById: new Map([...deps.assetsById.entries()].map(([k, v]) => [k, { code: v.code }])),
  });
}

function tryAllSchemas(parsed: unknown): {
  useCase: UseCaseId;
  payload: unknown;
} | null {
  for (const useCase of USE_CASE_ORDER) {
    const result = schemaByUseCase[useCase].safeParse(parsed);
    if (result.success) {
      return { useCase, payload: result.data };
    }
  }
  return null;
}

type Dispatch =
  | { kind: "widget"; message: AssistantMessage }
  | { kind: "text"; content: string }
  | { kind: "invalid" };

/**
 * Turn one raw model generation into an answer (or "invalid" to trigger a
 * corrective retry). Money NEVER comes from the model: queries execute
 * against local rows, and legacy widget JSON only contributes its use case
 * (figures are re-derived deterministically).
 */
function dispatchReply(
  raw: string,
  ctx: QueryCtx,
  userText: string,
  heuristic: UseCaseId,
): Dispatch {
  const parsed = extractJson(raw);
  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
    return { kind: "invalid" };
  }
  const obj = parsed as Record<string, unknown>;

  // Conversational escape hatch — only trusted for non-data questions.
  if (typeof obj.reply === "string" && obj.reply.trim()) {
    return heuristic === "fallback_text"
      ? { kind: "text", content: obj.reply.trim() }
      : { kind: "invalid" };
  }

  // Happy path: a query object. Validated against a closed schema whose ops
  // are pure reads over local rows; unknown keys (hallucinated money) are
  // stripped before execution.
  const q = assistantQuerySchema.safeParse(obj);
  if (q.success) {
    const message = queryResultToMessage(
      executeQuery(q.data, ctx, userText),
      USE_CASE_OF_SELECT[q.data.select],
      ctx.now,
    );
    if (message) return { kind: "widget", message };
  }

  // Legacy widget JSON (model skipped the query protocol): only the use case
  // is trusted; all figures re-derived from local rows.
  const legacy = tryAllSchemas(parsed);
  if (legacy) {
    return { kind: "widget", message: deterministicFallback(legacy.useCase, ctx, userText) };
  }
  return { kind: "invalid" };
}

export async function runChat(
  input: ChatEngineInput,
  deps: ChatEngineDeps,
): Promise<ChatEngineResult> {
  const ctx = buildCtx(deps, input.now);
  const snapshot = buildSnapshotFor(deps);
  const system = buildSystemPrompt();
  const userPrompt = buildUserPrompt({ userText: input.text, snapshot });
  const userMsg: ChatMessage = { id: newId(), role: "user", content: input.text, ts: input.now };
  const heuristic = deps.inferUseCase(input.text, snapshot);
  const raws: string[] = [];

  const attachRaw = (msg: AssistantMessage): AssistantMessage =>
    raws.length > 0 ? { ...msg, rawOutput: raws.join("\n---\n") } : msg;

  const finish = (assistant: AssistantMessage): ChatEngineResult => ({
    user: userMsg,
    assistant: attachRaw(assistant),
  });

  const settle = (d: Dispatch): ChatEngineResult | null => {
    if (d.kind === "widget") return finish(d.message);
    if (d.kind === "text") {
      return finish(
        tsToMsg({ type: "text", content: d.content }, "fallback_text", input.now),
      );
    }
    return null;
  };

  try {
    const raw1 = await deps.engine.complete({
      system,
      user: userPrompt,
      jsonMode: true,
      temperature: 0.1,
      maxTokens: 300,
      onToken: (token) => deps.onToken?.(token),
    });
    raws.push(raw1);

    let d = dispatchReply(raw1, ctx, input.text, heuristic);
    const settled1 = settle(d);
    if (settled1) return settled1;

    // Corrective retry: show the model its bad output and ask again.
    const raw2 = await deps.engine.complete({
      system,
      user: buildCorrectivePrompt(raw1),
      jsonMode: true,
      temperature: 0.0,
      maxTokens: 300,
    });
    raws.push(raw2);
    d = dispatchReply(raw2, ctx, input.text, heuristic);
    const settled2 = settle(d);
    if (settled2) return settled2;

    // Both rounds failed → deterministic answer from the same local data.
    const guessed = deps.inferUseCase(input.text, snapshot);
    return finish(deterministicFallback(guessed, ctx, input.text));
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      return {
        user: userMsg,
        assistant: {
          id: newId(),
          role: "assistant",
          type: "error",
          reason: "Request cancelled.",
          ts: input.now,
          usedCase: "fallback_text",
          ...(raws.length > 0 ? { rawOutput: raws.join("\n---\n") } : {}),
        },
      };
    }
    const detail = err instanceof Error ? err.message : String(err);
    return finish(
      fallbackWithNotice(
        heuristic,
        ctx,
        `Model unavailable — showing local results instead. (${detail})`,
        input.text,
      ),
    );
  }
}

/**
 * Best-effort use-case inference. Kept dumb (keyword match) on purpose:
 * used only as the fallback tie-breaker when the model produces nothing
 * usable, or the engine errors/crashes.
 */
export function inferUseCase(userText: string, snapshot: AssistantSnapshot): UseCaseId {
  const t = userText.toLowerCase();
  if (/\b(buy|purchase|paid|spent|₱|php|spend|cost|log)\b/.test(t) && /\b(trans|en|entry|add|record|log)/.test(t)) {
    return "voice_to_txn";
  }
  if (/\b(log|add|enter|record|spent .* on)\b/.test(t) && !/\?$/.test(t)) {
    return "voice_to_txn";
  }
  if (/\b(budget|over|under|limit|allowance)\b/.test(t)) {
    return "budget_check";
  }
  if (/\b(week|summary|recap|overview|how (did|am)|last 7|this week)\b/.test(t)) {
    return "weekly_summary";
  }
  if (/\b(spend|spent|how much|spending|category|breakdown)\b/.test(t)) {
    return "spending_query";
  }
  if (snapshot.categories.some((c) => t.includes(c.name.toLowerCase()))) {
    return "spending_query";
  }
  return "fallback_text";
}
