import type { LlmEngine } from "@/lib/llm/types";
import { buildSnapshot, type AssistantSnapshot } from "./serialize";
import { buildSystemPrompt, buildUserPrompt, buildCorrectivePrompt, deriveTldr } from "./prompts";
import { extractJson, schemaByUseCase } from "./schemas";
import { deterministicFallback, fallbackWithNotice, queryResultToMessage, tsToMsg, newId } from "./handlers";
import { assistantQuerySchema, executeQuery, type QueryCtx } from "./queries";
import { classifyIntent, resolveTerms, type ResolvedTerms } from "./resolver";
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
 *
 * The TL;DR is computed deterministically from the validated payload via
 * `deriveTldr` — no second LLM call. The unsupported-intent classifier
 * short-circuits before any model call when the user's question is outside
 * what the assistant can answer.
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
  "compare_query",
  "merchants_query",
  "burn_query",
  "search_query",
  "voice_to_txn",
  "fallback_text",
];

type SelectKey =
  | "spending"
  | "budget"
  | "log_txn"
  | "compare"
  | "merchants"
  | "burn"
  | "search";

const USE_CASE_OF_SELECT: Record<SelectKey, UseCaseId> = {
  spending: "spending_query",
  budget: "budget_check",
  log_txn: "voice_to_txn",
  compare: "compare_query",
  merchants: "merchants_query",
  burn: "burn_query",
  search: "search_query",
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

function buildSnapshotFor(deps: ChatEngineDeps, userText: string): AssistantSnapshot {
  return buildSnapshot({
    accounts: deps.accounts,
    categories: deps.categories,
    txns: deps.txns,
    assetsById: new Map([...deps.assetsById.entries()].map(([k, v]) => [k, { code: v.code }])),
    userText,
  });
}

/**
 * Back-fill the model's query with what the resolver already matched. A
 * 1B model can emit the right shape but the wrong word ("Dining" instead
 * of "Food") — when the model's `category` doesn't match any real category
 * name, we substitute the resolver's. Same for the search `q` pattern.
 */
function backfillFromResolver(
  q: { select: string; category?: string; q?: string },
  resolved: ResolvedTerms,
  categories: { name: string }[],
): { select: string; category?: string; q?: string } {
  const out = { ...q };
  const realNames = new Set(categories.map((c) => c.name.toLowerCase()));
  if (out.category && !realNames.has(out.category.toLowerCase())) {
    if (resolved.category) out.category = resolved.category;
    else delete out.category;
  }
  if (out.select === "search" && (!out.q || !out.q.trim()) && resolved.descriptionPattern) {
    out.q = resolved.descriptionPattern;
  }
  if (
    (out.select === "spending" ||
      out.select === "budget" ||
      out.select === "compare" ||
      out.select === "merchants") &&
    resolved.category
  ) {
    const modelOk = out.category && realNames.has(out.category.toLowerCase());
    if (!modelOk) out.category = resolved.category;
  }
  return out;
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

  if (typeof obj.reply === "string" && obj.reply.trim()) {
    return heuristic === "fallback_text"
      ? { kind: "text", content: obj.reply.trim() }
      : { kind: "invalid" };
  }

  const q = assistantQuerySchema.safeParse(obj);
  if (q.success) {
    const resolved = resolveTerms({ userText, categories: ctx.categories });
    const filled = backfillFromResolver(
      { select: q.data.select, category: q.data.category, q: q.data.q },
      resolved,
      ctx.categories,
    );
    const adjusted = { ...q.data, ...filled, select: q.data.select as SelectKey };
    const select = adjusted.select;
    const message = queryResultToMessage(
      executeQuery(adjusted, ctx, userText),
      USE_CASE_OF_SELECT[select],
      ctx.now,
    );
    if (message) return { kind: "widget", message };
  }

  const legacy = tryAllSchemas(parsed);
  if (legacy) {
    return { kind: "widget", message: deterministicFallback(legacy.useCase, ctx, userText) };
  }
  return { kind: "invalid" };
}

/**
 * Build an "I can help with…" affordance for an unsupported question. The
 * caller has already classified the intent as unsupported; this helper
 * turns the suggested use cases into a chat message.
 */
function buildUnsupportedMessage(
  intent: { suggestedUseCases: UseCaseId[] },
  now: number,
): AssistantMessage {
  return tsToMsg(
    {
      type: "text",
      content: "That's outside what I can help with. I can answer:",
      suggestedUseCases: intent.suggestedUseCases,
    },
    "fallback_text",
    now,
  );
}

export async function runChat(
  input: ChatEngineInput,
  deps: ChatEngineDeps,
): Promise<ChatEngineResult> {
  const ctx = buildCtx(deps, input.now);
  const snapshot = buildSnapshotFor(deps, input.text);
  const userMsg: ChatMessage = { id: newId(), role: "user", content: input.text, ts: input.now };
  const heuristic = deps.inferUseCase(input.text, snapshot);
  const raws: string[] = [];

  const attachRaw = (msg: AssistantMessage): AssistantMessage =>
    raws.length > 0 ? { ...msg, rawOutput: raws.join("\n---\n") } : msg;

  const withTldr = (msg: AssistantMessage): AssistantMessage => {
    const tldr = deriveTldr(msg);
    return tldr ? ({ ...msg, tldr } as AssistantMessage) : msg;
  };

  const finish = (assistant: AssistantMessage): ChatEngineResult => ({
    user: userMsg,
    assistant: attachRaw(withTldr(assistant)),
  });

  // Short-circuit: if the question is outside what the assistant can answer,
  // render the affordance immediately — skip the model call.
  const intent = classifyIntent(input.text);
  if (!intent.supported) {
    return finish(buildUnsupportedMessage(intent, input.now));
  }

  const system = buildSystemPrompt();
  const userPrompt = buildUserPrompt({ userText: input.text, snapshot });

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

    const guessed = deps.inferUseCase(input.text, snapshot);
    const fallback = deterministicFallback(guessed, ctx, input.text);
    return finish(fallback);
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
  if (/\b(compare|vs|versus|year over year|yoy|vs last)\b/.test(t)) {
    return "compare_query";
  }
  if (/\b(merchant|where .* (spend|money|go)|top|biggest|most .* on)\b/.test(t)) {
    return "merchants_query";
  }
  if (/\b(pace|on track|burn|projected|will (i|you) (spend|overspend))\b/.test(t)) {
    return "burn_query";
  }
  if (
    /\bpayro|\bsalar|\bpaid me|\bincome|\bdeposit|\brefun|\breimb|\bcashb|\bfind\b|\bcharges|\bpayments\b|\bpurchases\b/.test(t)
  ) {
    return "search_query";
  }
  if (/\b(spend|spent|how much|spending|category|breakdown)\b/.test(t)) {
    return "spending_query";
  }
  if (snapshot.categories.some((c) => t.includes(c.name.toLowerCase()))) {
    return "spending_query";
  }
  return "fallback_text";
}
