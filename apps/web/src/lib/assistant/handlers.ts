import type { AssistantMessage, UseCaseId } from "./types";
import { executeQuery, type AssistantQuery, type QueryCtx } from "./queries";

/**
 * Deterministic answer assembly — used when the model is unavailable or fails
 * to emit a valid query. Delegates to the SAME query executor the model-driven
 * path uses, so fallback answers are identical to model-assisted ones.
 */
export type HandlerCtx = QueryCtx;

export function newId(): string {
  return crypto.randomUUID().replace(/-/g, "").slice(0, 26);
}

export function tsToMsg(payload: object, usedCase: UseCaseId, ts: number): AssistantMessage {
  return { ...(payload as object), id: newId(), role: "assistant", ts, usedCase } as AssistantMessage;
}

/** Query for each use case, used when the model produced nothing usable. */
const USE_CASE_QUERY: Record<UseCaseId, AssistantQuery | null> = {
  spending_query: { select: "spending" },
  budget_check: { select: "budget" },
  weekly_summary: { select: "summary" },
  voice_to_txn: { select: "log_txn" },
  fallback_text: null,
};

/**
 * Convert a query result into a renderable AssistantMessage. Returns null only
 * when execution itself failed. Empty-data variants degrade to text.
 */
export function queryResultToMessage(
  result: ReturnType<typeof executeQuery>,
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
  return tsToMsg(result.data, usedCase, ts);
}

/**
 * Derive the same widgets from local rows without the model. `userText` is
 * the period hint so "last month" still resolves on the fallback path.
 */
export function deterministicFallback(
  useCase: UseCaseId,
  ctx: QueryCtx,
  userText?: string,
): AssistantMessage {
  const query = USE_CASE_QUERY[useCase];
  if (!query) {
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
  const result = executeQuery(query, ctx, userText ?? "");
  const msg = queryResultToMessage(result, useCase, ctx.now);
  return msg ?? tsToMsg({ type: "text", content: "No data available." }, useCase, ctx.now);
}

/** Model-unavailable variant: same widget, plus a notice. */
export function fallbackWithNotice(
  useCase: UseCaseId,
  ctx: QueryCtx,
  notice: string,
  userText?: string,
): AssistantMessage {
  const msg = deterministicFallback(useCase, ctx, userText);
  return { ...msg, notice } as AssistantMessage;
}
