import type { Category, CategoryBudget, BudgetTx } from "@/lib/categories/categories-store";
import type { Txn, Account } from "@/lib/accounts/accounts-store";
import type {
  AssistantMessage,
  BudgetProgressPayload,
  FallbackTextPayload,
  SpendingBreakdownPayload,
  SummaryDashboardPayload,
  VoiceTxnPrefillPayload,
  UseCaseId,
} from "./types";
import { computeBudgetUsage, budgetFor } from "@/lib/categories/categories-store";
import { categoryBreakdown, spendingByMonth, type MonthStat } from "@/lib/analytics/compute";

/**
 * Context passed to every handler. Handlers NEVER trust the model for money;
 * they look up the named category/account in the local snapshot and re-derive
 * the figure from the transaction rows.
 */
export type HandlerCtx = {
  accounts: Account[];
  categories: Category[];
  categoryBudgets: CategoryBudget[];
  txns: Txn[];
  assetsById: Map<string, { code: string; decimals: number }>;
  /** ms timestamp — used to anchor "this month" / "this week" labels. */
  now: number;
};

export type Handler = (payload: unknown, ctx: HandlerCtx) => AssistantMessage;

function newId(): string {
  // Match the ULID shape used elsewhere in the app for cross-system id parity.
  return crypto.randomUUID().replace(/-/g, "").slice(0, 26);
}

function tsToMsg(payload: object, usedCase: UseCaseId, ts: number): AssistantMessage {
  return { ...(payload as object), id: newId(), role: "assistant", ts, usedCase } as AssistantMessage;
}

function findAccountByName(
  ctx: HandlerCtx,
  name: string,
): Account | null {
  const needle = name.trim().toLowerCase();
  return ctx.accounts.find((a) => a.name.trim().toLowerCase() === needle) ?? null;
}

function primaryAsset(
  ctx: HandlerCtx,
): { code: string; decimals: number; assetId: string } {
  const first = ctx.accounts.find((a) => !a.archived && !a.deletedAt);
  if (first) {
    const a = ctx.assetsById.get(first.assetId);
    return { code: a?.code ?? "USD", decimals: a?.decimals ?? 2, assetId: first.assetId };
  }
  return { code: "USD", decimals: 2, assetId: "" };
}

function toMinorString(v: bigint | number | string): string {
  return typeof v === "bigint" ? v.toString() : String(v);
}

function pctOf(spent: bigint, limit: bigint): number {
  if (limit <= 0n) return 0;
  return Math.min(150, Math.round(Number((spent * 10000n) / limit) / 100));
}

function statusOf(pct: number): "under" | "near" | "over" {
  if (pct > 90) return "over";
  if (pct >= 70) return "near";
  return "under";
}

function monthKeyForDate(d: Date): { year: number; month: number } {
  return { year: d.getFullYear(), month: d.getMonth() };
}

function startOfWeek(d: Date): Date {
  const out = new Date(d);
  out.setHours(0, 0, 0, 0);
  const day = out.getDay();
  // Treat Monday as start of week (ISO).
  const offset = (day + 6) % 7;
  out.setDate(out.getDate() - offset);
  return out;
}

// ---------------------------------------------------------------------------
// spending_query — re-derive category breakdown for the current month from
// local rows. Model only tells us WHICH category to focus on (or null for the
// full breakdown).
// ---------------------------------------------------------------------------

export const spendingQueryHandler: Handler = (payload, ctx) => {
  const now = new Date(ctx.now);
  const { year, month } = monthKeyForDate(now);
  const asset = primaryAsset(ctx);
  const periodLabel = "This month";

  const slices = categoryBreakdown(ctx.txns, ctx.categories, year, month);
  if (slices.length === 0) {
    return tsToMsg(
      <FallbackTextPayload>{
        type: "text",
        content: `No spending recorded for ${periodLabel.toLowerCase()} yet.`,
      },
      "spending_query",
      ctx.now,
    );
  }

  const totalMinor = slices.reduce((s, x) => s + x.total, 0n);
  const focusedName = (payload as { category?: string }).category;
  const filtered = focusedName
    ? slices.filter((s) => s.name.trim().toLowerCase() === focusedName.trim().toLowerCase())
    : slices;
  const chosen = (filtered.length > 0 ? filtered : slices).slice(0, 8);

  const payloadOut: SpendingBreakdownPayload = {
    type: "spending_breakdown",
    periodLabel,
    assetCode: asset.code,
    decimals: asset.decimals,
    totalMinor: toMinorString(totalMinor),
    slices: chosen.map((s) => ({
      category: s.name,
      amountMinor: toMinorString(s.total),
      pct: Math.round(s.pct),
    })),
  };
  return tsToMsg(payloadOut, "spending_query", ctx.now);
};

// ---------------------------------------------------------------------------
// budget_check — pick the named category (or the highest-pct one) and report
// spend vs limit. Re-derived from computeBudgetUsage, NEVER from the model.
// ---------------------------------------------------------------------------

export const budgetCheckHandler: Handler = (payload, ctx) => {
  const now = new Date(ctx.now);
  const { year, month } = monthKeyForDate(now);
  const asset = primaryAsset(ctx);
  const periodLabel = "This month";

  const usage = computeBudgetUsage(
    ctx.categories,
    ctx.categoryBudgets,
    ctx.txns as unknown as BudgetTx[],
    year,
    month,
  ).filter((u) => u.budgetMinor > 0n);

  let chosen = usage[0] ?? null;
  const named = (payload as { category?: string }).category;
  if (named) {
    const needle = named.trim().toLowerCase();
    const match = usage.find((u) => u.category.name.trim().toLowerCase() === needle);
    if (match) chosen = match;
  }
  if (!chosen) {
    return tsToMsg(
      <FallbackTextPayload>{
        type: "text",
        content: "No budget set yet — add a monthly budget to a category to track it.",
      },
      "budget_check",
      ctx.now,
    );
  }

  const pct = pctOf(chosen.spentMinor, chosen.budgetMinor);
  const payloadOut: BudgetProgressPayload = {
    type: "budget_progress",
    category: chosen.category.name,
    spentMinor: toMinorString(chosen.spentMinor),
    limitMinor: toMinorString(chosen.budgetMinor),
    periodLabel,
    pctUsed: pct,
    status: statusOf(pct),
    assetCode: asset.code,
    decimals: asset.decimals,
  };
  return tsToMsg(payloadOut, "budget_check", ctx.now);
};

// ---------------------------------------------------------------------------
// weekly_summary — week-to-date income/expense/net + top categories + budget
// status. Re-derived from spendingByMonth + categoryBreakdown.
// ---------------------------------------------------------------------------

export const weeklySummaryHandler: Handler = (_, ctx) => {
  const now = new Date(ctx.now);
  const weekStart = startOfWeek(now);
  const asset = primaryAsset(ctx);

  let income = 0n;
  let expense = 0n;
  for (const t of ctx.txns) {
    if (t.deletedAt) continue;
    if (new Date(Number(t.date)) < weekStart) continue;
    if (t.amountMinor >= 0n) income += t.amountMinor;
    else expense += -t.amountMinor;
  }
  const net = income - expense;

  // Reuse the month breakdown for top categories, but recompute share for
  // the week so the percentages match the displayed period.
  const { year, month } = monthKeyForDate(weekStart);
  const monthSlices = categoryBreakdown(ctx.txns, ctx.categories, year, month);
  const topCategories = monthSlices.slice(0, 5).map((s) => ({
    category: s.name,
    amountMinor: toMinorString(s.total),
    pct: Math.round(s.pct),
  }));

  const usage = computeBudgetUsage(
    ctx.categories,
    ctx.categoryBudgets,
    ctx.txns as unknown as BudgetTx[],
    year,
    month,
  )
    .filter((u) => u.budgetMinor > 0n)
    .sort((a, b) => b.pct - a.pct)
    .slice(0, 4);

  const payloadOut: SummaryDashboardPayload = {
    type: "summary_dashboard",
    periodLabel: "This week",
    assetCode: asset.code,
    decimals: asset.decimals,
    incomeMinor: toMinorString(income),
    expenseMinor: toMinorString(expense),
    netMinor: toMinorString(net),
    topCategories,
    budgets: usage.map((u) => ({
      category: u.category.name,
      pctUsed: pctOf(u.spentMinor, u.budgetMinor),
      status: statusOf(pctOf(u.spentMinor, u.budgetMinor)),
    })),
  };
  return tsToMsg(payloadOut, "weekly_summary", ctx.now);
};

// ---------------------------------------------------------------------------
// voice_to_txn — translate the model's named entities into local ids. If the
// account name doesn't match, we fall back to the user's primary account.
// ---------------------------------------------------------------------------

export const voiceToTxnHandler: Handler = (payload, ctx) => {
  const p = payload as Partial<VoiceTxnPrefillPayload>;
  const account =
    (p.accountName ? findAccountByName(ctx, p.accountName) : null) ??
    ctx.accounts.find((a) => !a.archived && !a.deletedAt) ??
    null;
  const categories: string[] = [];
  for (const cid of p.categoryIds ?? []) {
    if (ctx.categories.find((c) => c.id === cid)) categories.push(cid);
  }
  const payloadOut: VoiceTxnPrefillPayload = {
    type: "voice_to_txn",
    accountId: account?.id ?? null,
    accountName: account?.name ?? p.accountName ?? null,
    amountInput: p.amountInput ?? null,
    amountMinor: p.amountMinor ?? null,
    currency: p.currency ?? null,
    categoryIds: categories,
    description: (p.description ?? "").trim(),
    confidence: typeof p.confidence === "number" ? p.confidence : 0.5,
  };
  return tsToMsg(payloadOut, "voice_to_txn", ctx.now);
};

// ---------------------------------------------------------------------------
// fallback_text — assemble a plain-text answer from the same data. Used when
// the model fails to emit valid JSON twice.
// ---------------------------------------------------------------------------

export const fallbackTextHandler: Handler = (payload, ctx) => {
  const content =
    typeof (payload as { content?: string }).content === "string"
      ? (payload as { content: string }).content
      : "I couldn't reach a structured answer. Try asking about spending on a category, a budget, or a weekly summary.";
  return tsToMsg(
    <FallbackTextPayload>{ type: "text", content },
    "fallback_text",
    ctx.now,
  );
};

// Helper used by chat-engine when the model fails twice. Picks the most
// appropriate deterministic answer for the asked-about topic.
export function deterministicFallback(
  useCase: UseCaseId,
  ctx: HandlerCtx,
): AssistantMessage {
  switch (useCase) {
    case "spending_query":
      return spendingQueryHandler({}, ctx);
    case "budget_check":
      return budgetCheckHandler({}, ctx);
    case "weekly_summary":
      return weeklySummaryHandler({}, ctx);
    case "voice_to_txn":
      return voiceToTxnHandler({ description: "" }, ctx);
    case "fallback_text":
    default:
      return fallbackTextHandler({}, ctx);
  }
}

export const handlersByUseCase: Record<UseCaseId, Handler> = {
  spending_query: spendingQueryHandler,
  budget_check: budgetCheckHandler,
  weekly_summary: weeklySummaryHandler,
  voice_to_txn: voiceToTxnHandler,
  fallback_text: fallbackTextHandler,
};

// Re-export for callers that want to keep imports small.
export { budgetFor, spendingByMonth, type MonthStat };
