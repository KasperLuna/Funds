import { z } from "zod";
import type { Account, Txn } from "@/lib/accounts/accounts-store";
import type { Category, CategoryBudget } from "@/lib/categories/categories-store";
import { computeBudgetUsage } from "@/lib/categories/categories-store";
import { resolvePeriod, rangeToYearMonth, type PeriodRange } from "./period";

/**
 * The assistant's query language. The model's ONLY job is to translate the
 * user's question into one of these query objects; it never sees or computes
 * money. Execution is pure reads over the local rows — the query language has
 * no write path, so a hallucinating model cannot mutate anything.
 *
 * cavetail: the deterministic layer fills in what small models forget. If the
 * model omits `period`, it is re-parsed from the user's own words; same for a
 * category named in the question. Unknown keys (e.g. hallucinated amounts)
 * are stripped by Zod before execution.
 */

export const assistantQuerySchema = z.object({
  select: z.enum(["spending", "budget", "summary", "log_txn"]),
  period: z.string().max(40).optional(),
  category: z.string().max(80).optional(),
  account: z.string().max(80).optional(),
  amount: z.string().max(40).optional(),
  description: z.string().max(200).optional(),
});

export type AssistantQuery = z.infer<typeof assistantQuerySchema>;

export type QueryCtx = {
  accounts: Account[];
  categories: Category[];
  categoryBudgets: CategoryBudget[];
  txns: Txn[];
  assetsById: Map<string, { code: string; decimals: number }>;
  now: number;
};

export type QueryResult =
  | { ok: true; data: object }
  | { ok: false; error: string };

// ---------------------------------------------------------------------------
// Money helpers (minor BigInt; no floats — local/no-money-float)
// ---------------------------------------------------------------------------

function ensureBigInt(v: bigint | number | string): bigint {
  return typeof v === "bigint" ? v : BigInt(v);
}

function excludedIds(categories: Category[]): Set<string> {
  return new Set(
    categories.filter((c) => c.excludeFromAnalytics && !c.deletedAt).map((c) => c.id),
  );
}

function primaryAsset(ctx: QueryCtx): { code: string; decimals: number } {
  const first = ctx.accounts.find((a) => !a.archived && !a.deletedAt);
  if (first) {
    const a = ctx.assetsById.get(first.assetId);
    return { code: a?.code ?? "USD", decimals: a?.decimals ?? 2 };
  }
  return { code: "USD", decimals: 2 };
}

function findCategory(ctx: QueryCtx, name?: unknown): Category | null {
  if (typeof name !== "string" || !name.trim()) return null;
  const needle = name.trim().toLowerCase();
  return ctx.categories.find((c) => c.name.trim().toLowerCase() === needle) ?? null;
}

function findAccountByName(ctx: QueryCtx, name: string): Account | null {
  const needle = name.trim().toLowerCase();
  return ctx.accounts.find((a) => a.name.trim().toLowerCase() === needle) ?? null;
}

/** Resolve a category mentioned in the user's own words (deterministic fill-in). */
function categoryFromText(ctx: QueryCtx, text: string): Category | null {
  const t = text.toLowerCase();
  return (
    ctx.categories.find(
      (c) => !c.deletedAt && t.includes(c.name.trim().toLowerCase()),
    ) ?? null
  );
}

/**
 * Convert a model-supplied decimal amount string ("42.50") to a minor-unit
 * BigInt string without ever touching floats (local/no-money-float). Truncates
 * extra fractional digits; returns null for anything non-numeric.
 */
function decimalStringToMinor(v: string, decimals: number): string | null {
  const s = v.trim().replace(/[^0-9.]/g, "");
  if (!s) return null;
  const [wholeRaw, fracRaw = ""] = s.split(".");
  const whole = wholeRaw ?? "";
  const frac = fracRaw ?? "";
  if (!/^\d*$/.test(whole) || !/^\d*$/.test(frac) || s.includes("..")) return null;
  const fracFixed = (frac + "0".repeat(decimals)).slice(0, decimals);
  return (BigInt(whole || "0") * 10n ** BigInt(decimals) + BigInt(fracFixed || "0")).toString();
}

function fmtMoney(v: bigint | number | string): string {
  return typeof v === "bigint" ? v.toString() : String(v);
}

// ---------------------------------------------------------------------------
// Range aggregation over local rows (SELECT-equivalents, pure reads)
// ---------------------------------------------------------------------------

type Slice = { category: string; amountMinor: string; pct: number };

function categorySlicesForRange(
  ctx: QueryCtx,
  range: PeriodRange,
  categoryName?: string,
): { slices: Slice[]; totalMinor: bigint } {
  const catMap = new Map(ctx.categories.map((c) => [c.id, c]));
  const excl = excludedIds(ctx.categories);
  const totals = new Map<string, bigint>();
  let grandTotal = 0n;

  for (const t of ctx.txns) {
    if (t.deletedAt) continue;
    const date = Number(t.date);
    if (date < range.from || date > range.to) continue;
    const amt = ensureBigInt(t.amountMinor);
    if (amt >= 0n) continue;
    const spend = -amt;
    const totalCats = t.categoryIds.length;
    const included = t.categoryIds.filter((id) => !excl.has(id));
    if (totalCats === 0 || included.length === 0) continue;
    const share = (spend * BigInt(included.length)) / BigInt(totalCats);
    for (const catId of included) {
      totals.set(catId, (totals.get(catId) ?? 0n) + share);
    }
    grandTotal += share;
  }

  const slices: Slice[] = [];
  for (const [catId, total] of totals) {
    const cat = catMap.get(catId);
    if (!cat || cat.deletedAt) continue;
    slices.push({
      category: cat.name,
      amountMinor: total.toString(),
      pct: grandTotal > 0n ? Number((total * 10000n) / grandTotal) / 100 : 0,
    });
  }
  slices.sort((a, b) => (BigInt(a.amountMinor) > BigInt(b.amountMinor) ? -1 : 1));

  if (categoryName) {
    const needle = categoryName.trim().toLowerCase();
    const focused = slices.filter((s) => s.category.trim().toLowerCase() === needle);
    return {
      slices: (focused.length > 0 ? focused : slices).slice(0, 8),
      totalMinor: focused.length > 0 ? BigInt(focused[0]!.amountMinor) : grandTotal,
    };
  }

  return { slices: slices.slice(0, 8), totalMinor: grandTotal };
}

function incomeExpense(ctx: QueryCtx, range: PeriodRange): { income: bigint; expense: bigint } {
  let income = 0n;
  let expense = 0n;
  for (const t of ctx.txns) {
    if (t.deletedAt) continue;
    const date = Number(t.date);
    if (date < range.from || date > range.to) continue;
    if (t.amountMinor >= 0n) income += t.amountMinor;
    else expense += -t.amountMinor;
  }
  return { income, expense };
}

function budgetUsageFor(ctx: QueryCtx, range: PeriodRange) {
  const { year, month } = rangeToYearMonth(range);
  return computeBudgetUsage(
    ctx.categories,
    ctx.categoryBudgets,
    ctx.txns as unknown as import("@/lib/categories/categories-store").BudgetTx[],
    year,
    month,
  ).filter((u) => u.budgetMinor > 0n);
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

/**
 * Execute a validated query against the local data layer. READ-ONLY by
 * construction: every op maps to a pure reduction over in-memory rows.
 * `userText` back-fills period/category the model omitted.
 */
export function executeQuery(
  q: AssistantQuery,
  ctx: QueryCtx,
  userText: string,
): QueryResult {
  const asset = primaryAsset(ctx);
  const code = asset.code;
  const decimals = asset.decimals;

  switch (q.select) {
    case "spending": {
      const range = resolvePeriod(q.period ?? userText, ctx.now);
      const category = q.category ?? categoryFromText(ctx, userText)?.name ?? undefined;
      const { slices, totalMinor } = categorySlicesForRange(ctx, range, category);
      if (slices.length === 0) {
        return { ok: true, data: { type: "spending_empty", periodLabel: range.label } };
      }
      return {
        ok: true,
        data: {
          type: "spending_breakdown",
          periodLabel: range.label,
          assetCode: code,
          decimals,
          totalMinor: fmtMoney(totalMinor),
          slices,
        },
      };
    }
    case "budget": {
      const range = resolvePeriod(q.period ?? userText, ctx.now);
      const usage = budgetUsageFor(ctx, range);
      let chosen = usage[0] ?? null;
      const named = q.category ?? categoryFromText(ctx, userText)?.name;
      if (named) {
        const needle = named.trim().toLowerCase();
        chosen = usage.find((u) => u.category.name.trim().toLowerCase() === needle) ?? chosen;
      }
      if (!chosen) {
        return { ok: true, data: { type: "budget_empty", periodLabel: range.label } };
      }
      const pct = pctOf(chosen.spentMinor, chosen.budgetMinor);
      return {
        ok: true,
        data: {
          type: "budget_progress",
          category: chosen.category.name,
          spentMinor: fmtMoney(chosen.spentMinor),
          limitMinor: fmtMoney(chosen.budgetMinor),
          periodLabel: range.label,
          pctUsed: pct,
          status: statusOf(pct),
          assetCode: code,
          decimals,
        },
      };
    }
    case "summary": {
      const range = resolvePeriod(q.period ?? userText, ctx.now);
      const { income, expense } = incomeExpense(ctx, range);
      const { slices } = categorySlicesForRange(ctx, range);
      const budgets = budgetUsageFor(ctx, range)
        .sort((x, y) => y.pct - x.pct)
        .slice(0, 4)
        .map((u) => {
          const pct = pctOf(u.spentMinor, u.budgetMinor);
          return { category: u.category.name, pctUsed: pct, status: statusOf(pct) };
        });
      return {
        ok: true,
        data: {
          type: "summary_dashboard",
          periodLabel: range.label,
          assetCode: code,
          decimals,
          incomeMinor: fmtMoney(income),
          expenseMinor: fmtMoney(expense),
          netMinor: fmtMoney(income - expense),
          topCategories: slices.slice(0, 5),
          budgets,
        },
      };
    }
    case "log_txn": {
      const account =
        (q.account ? findAccountByName(ctx, q.account) : null) ??
        ctx.accounts.find((a) => !a.archived && !a.deletedAt) ??
        null;
      const category = q.category ? findCategory(ctx, q.category) : categoryFromText(ctx, userText);
      const amountMinor = q.amount != null ? decimalStringToMinor(q.amount, decimals) : null;
      return {
        ok: true,
        data: {
          type: "voice_to_txn",
          accountId: account?.id ?? null,
          accountName: account?.name ?? q.account ?? null,
          amountInput: q.amount ?? null,
          amountMinor,
          currency: code,
          categoryIds: category ? [category.id] : [],
          description: (q.description ?? "").trim(),
          confidence: 0.5,
        },
      };
    }
  }
}

// ---------------------------------------------------------------------------
// Query language doc + few-shot examples (the reliability lever for 1B models)
// ---------------------------------------------------------------------------

export const QUERY_LANGUAGE_DOC = `{"select":"spending","period":"<period>","category":"<category>"}  — spending by category (category optional)
{"select":"budget","period":"<period>","category":"<category>"}  — spend vs budget for a category
{"select":"summary","period":"<period>"}                          — income, expense, net, top categories
{"select":"log_txn","account":"<name>","amount":"<n>","description":"<text>","category":"<category>"}  — prepare a transaction entry
{"reply":"<short text>"}  — greetings or anything not about their data`;

export const QUERY_EXAMPLES = `User: "How much did I spend this month?" → {"select":"spending","period":"this_month"}
User: "food spending last month" → {"select":"spending","period":"last_month","category":"Food"}
User: "am I over budget on dining?" → {"select":"budget","period":"this_month","category":"Dining"}
User: "summarize this week" → {"select":"summary","period":"this_week"}
User: "log 42.50 lunch" → {"select":"log_txn","amount":"42.50","description":"lunch"}
User: "hello" → {"reply":"Hi! Ask me about your spending, budgets, or a weekly summary."}`;
