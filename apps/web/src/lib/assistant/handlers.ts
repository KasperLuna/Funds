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
  voice_to_txn: { select: "log_txn" },
  compare_query: { select: "compare" },
  merchants_query: { select: "merchants" },
  burn_query: { select: "burn" },
  search_query: { select: "search" },
  fallback_text: null,
};

const EMPTY_TEXT: Record<string, string> = {
  spending_empty: "No spending recorded for {period} yet.",
  budget_empty: "No budget found for {period}.",
  compare_empty: "Not enough data to compare for {period} yet.",
  merchants_empty: "No merchant spending found for {period}.",
  burn_empty: "Not enough spend yet to project a pace for {period}.",
  search_empty: "No transactions matching that description in {period}.",
};

function emptyText(type: string, periodLabel: string): string {
  const tpl = EMPTY_TEXT[type];
  if (!tpl) return `No data available for ${periodLabel.toLowerCase()}.`;
  return tpl.replace("{period}", periodLabel.toLowerCase());
}

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
  if (typeof data.type === "string" && data.type.endsWith("_empty")) {
    const label = data.periodLabel ?? "this period";
    return tsToMsg({ type: "text", content: emptyText(data.type, label) }, usedCase, ts);
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
          "I couldn't reach a structured answer. Try asking about spending on a category, a budget, or a comparison.",
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
