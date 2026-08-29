import type { AssistantMessage, UseCaseId } from "./types";
import { executeTool, type ToolCtx, type ToolResult } from "./tools";

/**
 * Deterministic answer assembly — used when the model is unavailable or fails
 * to produce a usable tool call twice. Delegates to the SAME tool executors
 * the agent loop uses, so fallback answers are identical to model-assisted
 * ones (minus the model's tool selection).
 */
export type HandlerCtx = ToolCtx;

export function newId(): string {
  return crypto.randomUUID().replace(/-/g, "").slice(0, 26);
}

export function tsToMsg(payload: object, usedCase: UseCaseId, ts: number): AssistantMessage {
  return { ...(payload as object), id: newId(), role: "assistant", ts, usedCase } as AssistantMessage;
}

/**
 * Convert a tool executor result into a renderable AssistantMessage. Returns
 * null only when the tool itself failed (bad name / executor throw) — the
 * caller decides whether to let the model retry or fall back.
 * Empty-data variants (spending_empty, budget_empty) degrade to text.
 */
export function toolResultToMessage(
  result: ToolResult,
  usedCase: UseCaseId,
  ts: number,
): AssistantMessage | null {
  if (!result.ok) return null;
  const data = result.data as { type?: string; periodLabel?: string };
  if (data.type === "spending_empty" || data.type === "budget_empty") {
    const label = data.periodLabel ?? "this period";
    return tsToMsg(
      { type: "text", content: `No spending recorded for ${label.toLowerCase()} yet.` },
      usedCase,
      ts,
    );
  }
  return tsToMsg(result.data as object, usedCase, ts);
}

const USE_CASE_TOOL: Record<UseCaseId, string | null> = {
  spending_query: "get_spending_breakdown",
  budget_check: "get_budget_status",
  weekly_summary: "get_summary",
  voice_to_txn: "log_transaction",
  fallback_text: null,
};

/**
 * Derive the same widgets from local rows without the model. `userText` is
 * passed as the period hint so "last month" still resolves on the fallback
 * path (resolvePeriod matches temporal phrases in free text).
 */
export function deterministicFallback(
  useCase: UseCaseId,
  ctx: HandlerCtx,
  userText?: string,
): AssistantMessage {
  const tool = USE_CASE_TOOL[useCase];
  if (!tool) {
    return tsToMsg(
      {
        type: "text",
        content:
          "I couldn't reach a structured answer. Try asking about spending on a category, a budget, or a weekly summary.",
      },
      useCase,
      ctx.now,
    );
  }
  const result = executeTool(tool, userText ? { period: userText } : {}, ctx);
  const msg = toolResultToMessage(result, useCase, ctx.now);
  return msg ?? tsToMsg({ type: "text", content: "No data available." }, useCase, ctx.now);
}

/** Model-unavailable variant: same widget, plus a notice. */
export function fallbackWithNotice(
  useCase: UseCaseId,
  ctx: HandlerCtx,
  notice: string,
  userText?: string,
): AssistantMessage {
  const msg = deterministicFallback(useCase, ctx, userText);
  return { ...msg, notice } as AssistantMessage;
}
