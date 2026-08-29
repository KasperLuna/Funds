import type { LlmEngine } from "@/lib/llm/types";
import { buildSnapshot, type AssistantSnapshot } from "./serialize";
import { buildSystemPrompt, buildUserPrompt, buildCorrectivePrompt } from "./prompts";
import { schemaByUseCase, extractJson, type SchemaByUseCase } from "./schemas";
import { handlersByUseCase, deterministicFallback, type HandlerCtx } from "./handlers";
import type { AssistantMessage, ChatMessage, UseCaseId } from "./types";
import type { Account, Txn } from "@/lib/accounts/accounts-store";
import type { Category, CategoryBudget } from "@/lib/categories/categories-store";

/**
 * Pure orchestrator: prompt the model, extract JSON, validate against the
 * per-use-case schema, dispatch to the handler. On validation failure we
 * retry once with a corrective prompt; on second failure we assemble a
 * deterministic text/structured answer from local data.
 *
 * cavetail: handlers do not run on the model's numbers. The model names
 * things (category, account); the handler re-derives money from local rows.
 * This means a model hallucination on amounts is harmless — the worst case is
 * the wrong category label, which the user can correct.
 */
export type ChatEngineDeps = {
  engine: LlmEngine;
  accounts: Account[];
  categories: Category[];
  categoryBudgets: CategoryBudget[];
  txns: Txn[];
  assetsById: Map<string, { code: string; decimals: number }>;
  /** Heuristic to pick the default use case when the model returns generic text. */
  inferUseCase: (userText: string, snapshot: AssistantSnapshot) => UseCaseId;
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

function buildCtx(deps: ChatEngineDeps, now: number): HandlerCtx {
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

function newId(): string {
  return crypto.randomUUID().replace(/-/g, "").slice(0, 26);
}

function tryAllSchemas(parsed: unknown): {
  useCase: UseCaseId;
  payload: unknown;
} | null {
  const schemas = schemaByUseCase as SchemaByUseCase;
  for (const useCase of USE_CASE_ORDER) {
    const schema = schemas[useCase];
    const result = schema.safeParse(parsed);
    if (result.success) {
      return { useCase, payload: result.data };
    }
  }
  return null;
}

export async function runChat(
  input: ChatEngineInput,
  deps: ChatEngineDeps,
): Promise<ChatEngineResult> {
  const ctx = buildCtx(deps, input.now);
  const snapshot = buildSnapshotFor(deps);
  const system = buildSystemPrompt();
  const userPrompt = buildUserPrompt({ userText: input.text, snapshot });
  const useCaseHint = deps.inferUseCase(input.text, snapshot);
  void useCaseHint; // future: bias which schema the orchestrator accepts first

  let raw: string;
  try {
    raw = await deps.engine.complete({
      system,
      user: userPrompt,
      jsonMode: true,
      temperature: 0.1,
      maxTokens: 600,
    });
  } catch (err) {
    const reason =
      err instanceof DOMException && err.name === "AbortError"
        ? "Request cancelled."
        : "Model unavailable. Showing local results instead.";
    return {
      user: { id: newId(), role: "user", content: input.text, ts: input.now },
      assistant: {
        id: newId(),
        role: "assistant",
        type: "error",
        reason,
        ts: input.now,
        usedCase: "fallback_text",
      },
    };
  }

  // First attempt: parse JSON, try every schema.
  let parsed = extractJson(raw);
  let firstMatch = parsed ? tryAllSchemas(parsed) : null;

  // Retry once with a corrective note.
  if (!firstMatch) {
    let raw2: string;
    try {
      raw2 = await deps.engine.complete({
        system,
        user: buildCorrectivePrompt("Output was not valid JSON matching any schema"),
        jsonMode: true,
        temperature: 0.0,
        maxTokens: 600,
      });
    } catch {
      raw2 = "";
    }
    parsed = extractJson(raw2);
    firstMatch = parsed ? tryAllSchemas(parsed) : null;
  }

  if (firstMatch) {
    const assistant = handlersByUseCase[firstMatch.useCase](firstMatch.payload, ctx);
    return {
      user: { id: newId(), role: "user", content: input.text, ts: input.now },
      assistant,
    };
  }

  // Spec §6: on second failure, fall back to a text response using the same
  // underlying data. The deterministic fallback derives the same widgets
  // from local rows but emits a text variant where applicable.
  const guessed: UseCaseId = deps.inferUseCase(input.text, snapshot);
  const assistant: AssistantMessage = deterministicFallback(guessed, ctx);
  return {
    user: { id: newId(), role: "user", content: input.text, ts: input.now },
    assistant,
  };
}

/**
 * Best-effort use-case inference. Kept dumb (keyword match) on purpose:
 * intent classification is something the LLM does well in its first
 * reasoning step; we use this as a tie-breaker only when the model fails to
 * emit JSON twice. The list of triggers reflects the v1 use cases — adding
 * a new one means adding a trigger here and a Zod schema in `schemas.ts`.
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
  // If only one category is hinted, still a spending query.
  if (snapshot.categories.some((c) => t.includes(c.name.toLowerCase()))) {
    return "spending_query";
  }
  return "fallback_text";
}
