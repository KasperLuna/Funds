import type { LlmEngine, CompletionResult } from "@/lib/llm/types";
import { buildSnapshot, type AssistantSnapshot } from "./serialize";
import { buildSystemPrompt, buildUserPrompt, buildCorrectivePrompt, toolDefinitions } from "./prompts";
import { extractJson, schemaByUseCase } from "./schemas";
import { deterministicFallback, fallbackWithNotice, toolResultToMessage, tsToMsg } from "./handlers";
import { executeTool, type ToolCtx } from "./tools";
import type { AssistantMessage, ChatMessage, UseCaseId } from "./types";
import type { Account, Txn } from "@/lib/accounts/accounts-store";
import type { Category, CategoryBudget } from "@/lib/categories/categories-store";

/**
 * Pure orchestrator implementing a bounded agent loop:
 *
 *   user question → model picks a tool → executor runs the REAL query over
 *   local rows → result appended as a tool message → model may refine →
 *   first widget-shaped result renders.
 *
 * The invariant from the old design holds: the model only NAMES things
 * (period, category, account); every money figure is re-derived from local
 * rows by the tool executors. A widget payload coming back from a tool is
 * rendered directly — no model round-trip re-emitting numbers it never saw.
 *
 * cavetail: a 1B model's tool arguments are untrusted. Args are parsed
 * tolerantly (extractJson), executors never throw, and any failure degrades
 * to the deterministic fallback derived from the same local rows.
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

const MAX_TOOL_ROUNDS = 3;

type EngineMessage = { role: "assistant" | "tool" | "user"; content: string; toolCallId?: string };

function buildCtx(deps: ChatEngineDeps, now: number): ToolCtx {
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
  for (const useCase of USE_CASE_ORDER) {
    const result = schemaByUseCase[useCase].safeParse(parsed);
    if (result.success) {
      return { useCase, payload: result.data };
    }
  }
  return null;
}

const TOOL_USE_CASE: Record<string, UseCaseId> = {
  get_spending_breakdown: "spending_query",
  get_budget_status: "budget_check",
  get_summary: "weekly_summary",
  list_categories: "fallback_text",
  log_transaction: "voice_to_txn",
};

/**
 * Execute one model-requested tool call and shape the reply for the message
 * list. Returns the widget message when the tool produced data, null when it
 * failed (the error JSON is still appended so the model can retry).
 */
function runToolCall(
  name: string,
  args: unknown,
  ctx: ToolCtx,
): { message: AssistantMessage | null; resultJson: string } {
  const result = executeTool(name, args, ctx);
  const usedCase = TOOL_USE_CASE[name] ?? "fallback_text";
  const message = toolResultToMessage(result, usedCase, ctx.now);
  const resultJson = result.ok ? JSON.stringify(result.data) : JSON.stringify({ error: result.error });
  return { message, resultJson };
}

export async function runChat(
  input: ChatEngineInput,
  deps: ChatEngineDeps,
): Promise<ChatEngineResult> {
  const ctx = buildCtx(deps, input.now);
  const snapshot = buildSnapshotFor(deps);
  const system = buildSystemPrompt();
  const userPrompt = buildUserPrompt({ userText: input.text, snapshot });
  const tools = toolDefinitions();
  const userMsg: ChatMessage = { id: newId(), role: "user", content: input.text, ts: input.now };
  const onToken = deps.onToken;
  const engineMessages: EngineMessage[] = [];

  const finish = (assistant: AssistantMessage): ChatEngineResult => ({
    user: userMsg,
    assistant,
  });

  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    let res: CompletionResult;
    try {
      res = await deps.engine.complete({
        system,
        user: userPrompt,
        messages: engineMessages,
        tools,
        temperature: 0.1,
        maxTokens: 600,
        onToken: (token) => onToken?.(token),
      });
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
          },
        };
      }
      const detail = err instanceof Error ? err.message : String(err);
      const guessed = deps.inferUseCase(input.text, snapshot);
      return finish(
        fallbackWithNotice(
          guessed,
          ctx,
          `Model unavailable — showing local results instead. (${detail})`,
          input.text,
        ),
      );
    }

    // Model called a tool: execute against local rows, append result as a
    // tool message. The first widget-shaped result terminates the loop.
    if (res.toolCalls.length > 0) {
      let widget: AssistantMessage | null = null;
      for (const tc of res.toolCalls) {
        const args = extractJson(tc.arguments) ?? {};
        const { message, resultJson } = runToolCall(tc.name, args, ctx);
        engineMessages.push({ role: "assistant", content: "", toolCallId: tc.id });
        engineMessages.push({ role: "tool", content: resultJson, toolCallId: tc.id });
        if (!widget) widget = message;
      }
      if (widget) return finish(widget);
      continue; // all tool calls errored — let the next round try again
    }

    // No tool call. Accept a legacy widget JSON (small models sometimes skip
    // tool-calling) — but only its NAMES; money is re-derived deterministically.
    const parsed = extractJson(res.content);
    const match = parsed ? tryAllSchemas(parsed) : null;
    const heuristic = deps.inferUseCase(input.text, snapshot);

    // A bare "text" widget only wins for conversational input; for a
    // data-seeking question it's a failed round (the deterministic fallback
    // answers from local rows instead — the old spec's double-failure path).
    if (match && (match.useCase !== "fallback_text" || heuristic === "fallback_text")) {
      if (match.useCase === "fallback_text") {
        return finish(
          tsToMsg({ type: "text", content: res.content.trim() }, "fallback_text", input.now),
        );
      }
      return finish(deterministicFallback(match.useCase, ctx, input.text));
    }

    // Conversational input (heuristic: not data-seeking) → render the model's
    // text answer directly.
    if (res.content.trim() && heuristic === "fallback_text") {
      return finish(
        tsToMsg({ type: "text", content: res.content.trim() }, "fallback_text", input.now),
      );
    }

    // Unusable output for a data-seeking question — one corrective retry
    // before the rounds run out.
    engineMessages.push({ role: "assistant", content: res.content || "(empty)" });
    engineMessages.push({
      role: "user",
      content: buildCorrectivePrompt("Output was empty or not valid JSON"),
    });
  }

  const guessed = deps.inferUseCase(input.text, snapshot);
  return finish(deterministicFallback(guessed, ctx, input.text));
}

/**
 * Best-effort use-case inference. Kept dumb (keyword match) on purpose:
 * used only as the fallback tie-breaker when the model produces nothing
 * usable in MAX_TOOL_ROUNDS rounds, or the engine errors/crashes.
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
