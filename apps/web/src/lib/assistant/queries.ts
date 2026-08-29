import { z } from "zod";
import type { Account, Txn } from "@/lib/accounts/accounts-store";
import type { Category, CategoryBudget } from "@/lib/categories/categories-store";
import { computeBudgetUsage } from "@/lib/categories/categories-store";
import {
  resolvePeriod,
  rangeToYearMonth,
  previousRange,
  resolveCompareTo,
  type PeriodRange,
} from "./period";
import type { ScopeFlags, TopTxnPayload } from "./types";

/**
 * All valid widget payloads (discriminated by `type`). Exported so callers —
 * the chat engine, the test suite — can narrow `QueryResult.data` without
 * hand-rolling unions. This mirrors the wire types in `./types` but lives
 * here so the executor can return it without importing from types.ts (which
 * would invert the dependency: types.ts imports nothing from queries.ts, but
 * the executor's output is the same shape that the renderer consumes).
 */
export type AssistantPayload =
  | { type: "spending_empty"; periodLabel: string; scope?: ScopeFlags }
  | { type: "budget_empty"; periodLabel: string; scope?: ScopeFlags }
  | {
      type: "spending_breakdown";
      periodLabel: string;
      assetCode: string;
      decimals: number;
      totalMinor: string;
      slices: Array<{ category: string; amountMinor: string; pct: number }>;
      topTxn?: TopTxnPayload;
      dailyTrend?: Array<{ day: string; amountMinor: string }>;
      scope?: ScopeFlags;
    }
  | {
      type: "budget_progress";
      category: string;
      spentMinor: string;
      limitMinor: string;
      periodLabel: string;
      pctUsed: number;
      status: "under" | "near" | "over";
      assetCode: string;
      decimals: number;
      scope?: ScopeFlags;
    }
  | {
      type: "summary_dashboard";
      periodLabel: string;
      assetCode: string;
      decimals: number;
      incomeMinor: string;
      expenseMinor: string;
      netMinor: string;
      savingsRatePct: number | null;
      topCategories: Array<{ category: string; amountMinor: string; pct: number }>;
      budgets: Array<{ category: string; pctUsed: number; status: "under" | "near" | "over" }>;
      scope?: ScopeFlags;
    }
  | {
      type: "voice_to_txn";
      accountId: string | null;
      accountName: string | null;
      amountInput: string | null;
      amountMinor: string | null;
      currency: string | null;
      categoryIds: string[];
      description: string;
      confidence: number;
    }
  | {
      type: "period_compare";
      category: string | null;
      currentLabel: string;
      priorLabel: string;
      assetCode: string;
      decimals: number;
      currentMinor: string;
      priorMinor: string;
      deltaPct: number | null;
      scope?: ScopeFlags;
    }
  | {
      type: "merchant_breakdown";
      periodLabel: string;
      category: string | null;
      assetCode: string;
      decimals: number;
      totalMinor: string;
      merchants: Array<{ description: string; amountMinor: string; count: number }>;
      scope?: ScopeFlags;
    }
  | {
      type: "recurring_list";
      periodLabel: string;
      assetCode: string;
      decimals: number;
      totalMonthlyMinor: string;
      items: Array<{
        description: string;
        avgMinor: string;
        occurrences: number;
        lastDateLabel: string;
        cadence: "weekly" | "biweekly" | "monthly" | "irregular";
        monthlyCostMinor: string;
      }>;
      scope?: ScopeFlags;
    }
  | {
      type: "burn_rate";
      periodLabel: string;
      assetCode: string;
      decimals: number;
      currentMinor: string;
      priorMonthMinor: string;
      dailyAverageMinor: string;
      daysElapsed: number;
      daysInPeriod: number;
      projectedMinor: string;
      vsPriorPct: number | null;
      scope?: ScopeFlags;
    }
  | {
      type: "anomaly_list";
      periodLabel: string;
      assetCode: string;
      decimals: number;
      items: Array<{
        description: string;
        amountMinor: string;
        dateLabel: string;
        multipleOfMedian: number;
        medianMinor: string;
      }>;
      scope?: ScopeFlags;
    }
  | { type: "search_empty"; periodLabel: string; scope?: ScopeFlags }
  | {
      type: "search_results";
      periodLabel: string;
      query: string;
      category: string | null;
      assetCode: string;
      decimals: number;
      count: number;
      totalMinor: string;
      hits: Array<{
        description: string;
        amountMinor: string;
        dateLabel: string;
        categoryName: string | null;
        accountName: string | null;
      }>;
      scope?: ScopeFlags;
    };

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
 *
 * Selects beyond the basics (compare / merchants / recurring / burn /
 * anomalies) are analytics-grade views the assets-page filters cannot
 * produce — they exist for the user's benefit, not the model's.
 */

export const assistantQuerySchema = z.object({
  select: z.enum([
    "spending",
    "budget",
    "summary",
    "log_txn",
    "compare",
    "merchants",
    "recurring",
    "burn",
    "anomalies",
    "search",
  ]),
  period: z.string().max(40).optional(),
  category: z.string().max(80).optional(),
  account: z.string().max(80).optional(),
  amount: z.string().max(40).optional(),
  description: z.string().max(200).optional(),
  /** "previous" (default) or "last_year" — for compare. */
  compareTo: z.string().max(40).optional(),
  /** Top N (for merchants / search). String so the model can't use a float. */
  limit: z.string().max(8).optional(),
  /** Minimum occurrences to count as recurring (string for the same reason). */
  minOccurrences: z.string().max(8).optional(),
  /** Threshold percent of the merchant median (string). */
  thresholdPct: z.string().max(8).optional(),
  /** Free-text description pattern (string). */
  q: z.string().max(80).optional(),
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
  | { ok: true; data: AssistantPayload }
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

function parseIntInRange(v: string | undefined, fallback: number, min: number, max: number): number {
  if (typeof v !== "string") return fallback;
  const n = Number.parseInt(v, 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, n));
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
): { slices: Slice[]; totalMinor: bigint; topTxn: TopTxnPayload | null; daily: Array<{ day: string; amountMinor: string }> } {
  const catMap = new Map(ctx.categories.map((c) => [c.id, c]));
  const excl = excludedIds(ctx.categories);
  const totals = new Map<string, bigint>();
  let grandTotal = 0n;
  let top: { amt: bigint; date: number; desc: string } | null = null;
  const dailyMap = new Map<string, bigint>();

  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const dayFmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

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

    // Top single txn within the period (entire txn, not per-category share).
    if (!top || spend > top.amt) {
      top = { amt: spend, date, desc: t.description || "Unnamed" };
    }

    // Daily bucketing — only count the portion of the spend that goes to
    // non-excluded categories (matches the slice computation).
    const dayKey = dayFmt.format(new Date(date));
    dailyMap.set(dayKey, (dailyMap.get(dayKey) ?? 0n) + share);
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
      topTxn: top ? { description: top.desc, amountMinor: top.amt.toString(), dateLabel: formatDayLabel(top.date) } : null,
      daily: dailyToArray(dailyMap),
    };
  }

  return {
    slices: slices.slice(0, 8),
    totalMinor: grandTotal,
    topTxn: top ? { description: top.desc, amountMinor: top.amt.toString(), dateLabel: formatDayLabel(top.date) } : null,
    daily: dailyToArray(dailyMap),
  };
}

function dailyToArray(map: Map<string, bigint>): Array<{ day: string; amountMinor: string }> {
  return [...map.entries()]
    .sort(([a], [b]) => (a > b ? 1 : -1))
    .map(([day, amount]) => ({ day, amountMinor: amount.toString() }));
}

function formatDayLabel(ms: number): string {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
  }).format(new Date(ms));
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

function deltaPctOf(current: bigint, prior: bigint): number | null {
  if (prior === 0n) return current === 0n ? 0 : null;
  // Round to 1 decimal in percent.
  const ratio = Number(current - prior) / Number(prior);
  return Math.round(ratio * 1000) / 10;
}

/**
 * Execute a validated query against the local data layer. READ-ONLY by
 * construction: every op maps to a pure reduction over in-memory rows.
 * `userText` back-fills period/category the model omitted.
 *
 * cavetail: archived accounts and excludeFromAnalytics categories are NOW
 * INCLUDED in assistant results (the user can opt out via a filter on the
 * assets page). The widget surfaces an "includes archived" badge so the
 * user knows. A transfer-only category (an excluded-only split) still
 * drops a tx from the per-category share, since the share math explicitly
 * drops excluded categories — a non-excluded category on the same tx is
 * still counted.
 */
export function executeQuery(
  q: AssistantQuery,
  ctx: QueryCtx,
  userText: string,
): QueryResult {
  const asset = primaryAsset(ctx);
  const code = asset.code;
  const decimals = asset.decimals;
  // The query layer now includes archived/excluded by default; widget renders a
  // badge. (Opt-out filters are out of scope for the LLM query language — the
  // 1B model is already at the edge of reliable shape emission.)
  const flags: ScopeFlags = { includesArchived: true, includesExcluded: true };

  switch (q.select) {
    case "spending": {
      const range = resolvePeriod(q.period ?? userText, ctx.now);
      const category = q.category ?? categoryFromText(ctx, userText)?.name ?? undefined;
      const { slices, totalMinor, topTxn, daily } = categorySlicesForRange(ctx, range, category);
      if (slices.length === 0) {
        return {
          ok: true,
          data: { type: "spending_empty", periodLabel: range.label, scope: flags },
        };
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
          ...(topTxn ? { topTxn } : {}),
          dailyTrend: daily,
          scope: flags,
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
        return {
          ok: true,
          data: { type: "budget_empty", periodLabel: range.label, scope: flags },
        };
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
          scope: flags,
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
      const savingsRatePct = income > 0n
        ? Math.round(Number(((income - expense) * 10000n) / income) / 100)
        : null;
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
          savingsRatePct,
          topCategories: slices.slice(0, 5),
          budgets,
          scope: flags,
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
    case "compare": {
      const range = resolvePeriod(q.period ?? userText, ctx.now);
      const prior = previousRange(range, resolveCompareTo(q.compareTo ?? userText));
      const cat = q.category ? findCategory(ctx, q.category) : categoryFromText(ctx, userText);
      const catName = cat?.name;
      const { totalMinor: currentTotal } = categorySlicesForRange(ctx, range, catName);
      const { totalMinor: priorTotal } = categorySlicesForRange(ctx, prior, catName);
      return {
        ok: true,
        data: {
          type: "period_compare",
          category: catName ?? null,
          currentLabel: range.label,
          priorLabel: prior.label,
          assetCode: code,
          decimals,
          currentMinor: currentTotal.toString(),
          priorMinor: priorTotal.toString(),
          deltaPct: deltaPctOf(currentTotal, priorTotal),
          scope: flags,
        },
      };
    }
    case "merchants": {
      const range = resolvePeriod(q.period ?? userText, ctx.now);
      const cat = q.category ? findCategory(ctx, q.category) : categoryFromText(ctx, userText);
      const limit = parseIntInRange(q.limit, 5, 1, 12);
      const descNorm = (s: string) => s.trim().toLowerCase();
      const catId = cat?.id ?? null;
      const buckets = new Map<string, { amt: bigint; count: number; display: string }>();
      let total = 0n;
      for (const t of ctx.txns) {
        if (t.deletedAt) continue;
        const date = Number(t.date);
        if (date < range.from || date > range.to) continue;
        const amt = ensureBigInt(t.amountMinor);
        if (amt >= 0n) continue;
        if (catId && !t.categoryIds.includes(catId)) continue;
        const key = descNorm(t.description) || "—";
        const cur = buckets.get(key) ?? { amt: 0n, count: 0, display: t.description.trim() || "Unnamed" };
        cur.amt += -amt;
        cur.count += 1;
        buckets.set(key, cur);
        total += -amt;
      }
      const ranked = [...buckets.values()].sort((a, b) => (a.amt > b.amt ? -1 : 1)).slice(0, limit);
      return {
        ok: true,
        data: {
          type: "merchant_breakdown",
          periodLabel: range.label,
          category: cat?.name ?? null,
          assetCode: code,
          decimals,
          totalMinor: fmtMoney(total),
          merchants: ranked.map((m) => ({
            description: m.display,
            amountMinor: m.amt.toString(),
            count: m.count,
          })),
          scope: flags,
        },
      };
    }
    case "recurring": {
      // Look back over the resolved period (default 90d). A tx is "recurring"
      // when the same description string repeats and the amounts are within
      // a 25% relative tolerance of the cluster's median.
      const range = resolvePeriod(q.period ?? "last 90 days", ctx.now);
      const minOcc = parseIntInRange(q.minOccurrences, 3, 2, 12);
      const clusters = new Map<string, { display: string; txns: Array<{ amt: bigint; date: number }> }>();
      for (const t of ctx.txns) {
        if (t.deletedAt) continue;
        const date = Number(t.date);
        if (date < range.from || date > range.to) continue;
        const amt = ensureBigInt(t.amountMinor);
        if (amt >= 0n) continue;
        const key = t.description.trim().toLowerCase();
        if (!key) continue;
        const cur = clusters.get(key) ?? { display: t.description.trim() || "Unnamed", txns: [] };
        cur.txns.push({ amt: -amt, date });
        clusters.set(key, cur);
      }
      const median = (xs: bigint[]): bigint => {
        if (xs.length === 0) return 0n;
        const sorted = [...xs].sort((a, b) => (a > b ? 1 : -1));
        const mid = Math.floor(sorted.length / 2);
        if (sorted.length % 2 === 0) return (sorted[mid - 1]! + sorted[mid]!) / 2n;
        return sorted[mid]!;
      };
      const items: Array<{
        description: string;
        avgMinor: string;
        occurrences: number;
        lastDateLabel: string;
        cadence: "weekly" | "biweekly" | "monthly" | "irregular";
        monthlyCostMinor: string;
      }> = [];
      let totalMonthly = 0n;
      for (const c of clusters.values()) {
        if (c.txns.length < minOcc) continue;
        const amounts = c.txns.map((x) => x.amt);
        const med = median(amounts);
        if (med === 0n) continue;
        // Drop outliers (anything more than 50% off the cluster median).
        const tight = c.txns.filter((x) => {
          const diff = x.amt > med ? x.amt - med : med - x.amt;
          return diff * 2n <= med;
        });
        if (tight.length < minOcc) continue;
        const sum = tight.reduce((s, x) => s + x.amt, 0n);
        const avg = sum / BigInt(tight.length);
        // Cadence: average gap between tight txns.
        const sorted = [...tight].sort((a, b) => (a.date > b.date ? -1 : 1));
        const last = sorted[0]!;
        let cadence: "weekly" | "biweekly" | "monthly" | "irregular" = "irregular";
        if (sorted.length >= 2) {
          const first = sorted[sorted.length - 1]!;
          const spanDays = Math.max(1, (last.date - first.date) / (24 * 60 * 60 * 1000));
          const gap = spanDays / Math.max(1, sorted.length - 1);
          if (gap <= 9) cadence = "weekly";
          else if (gap <= 18) cadence = "biweekly";
          else if (gap <= 40) cadence = "monthly";
        }
        // Normalize to monthly cost: weekly → 4.345, biweekly → 2.1725, monthly → 1.
        const multiplier = cadence === "weekly" ? 4345n : cadence === "biweekly" ? 2173n : 1000n;
        const monthly = (avg * multiplier) / 1000n;
        totalMonthly += monthly;
        items.push({
          description: c.display,
          avgMinor: avg.toString(),
          occurrences: tight.length,
          lastDateLabel: formatDayLabel(last.date),
          cadence,
          monthlyCostMinor: monthly.toString(),
        });
      }
      items.sort((a, b) => (BigInt(a.monthlyCostMinor) > BigInt(b.monthlyCostMinor) ? -1 : 1));
      return {
        ok: true,
        data: {
          type: "recurring_list",
          periodLabel: range.label,
          assetCode: code,
          decimals,
          totalMonthlyMinor: totalMonthly.toString(),
          items: items.slice(0, 12),
          scope: flags,
        },
      };
    }
    case "burn": {
      const range = resolvePeriod(q.period ?? "this_month", ctx.now);
      const prior = previousRange(range);
      const { expense: cur } = incomeExpense(ctx, range);
      const { expense: prev } = incomeExpense(ctx, prior);
      const daysElapsed = Math.max(1, Math.ceil((Math.min(range.to, ctx.now) - range.from) / (24 * 60 * 60 * 1000)));
      const daysInPeriod = Math.max(1, Math.ceil((range.to - range.from) / (24 * 60 * 60 * 1000)));
      const dailyAvg = cur / BigInt(daysElapsed);
      const projected = (cur * BigInt(daysInPeriod)) / BigInt(daysElapsed);
      return {
        ok: true,
        data: {
          type: "burn_rate",
          periodLabel: range.label,
          assetCode: code,
          decimals,
          currentMinor: cur.toString(),
          priorMonthMinor: prev.toString(),
          dailyAverageMinor: dailyAvg.toString(),
          daysElapsed,
          daysInPeriod,
          projectedMinor: projected.toString(),
          vsPriorPct: deltaPctOf(cur, prev),
          scope: flags,
        },
      };
    }
    case "anomalies": {
      const range = resolvePeriod(q.period ?? "last 30 days", ctx.now);
      const threshold = parseIntInRange(q.thresholdPct, 200, 110, 1000);
      const perMerchant = new Map<string, { display: string; amounts: bigint[]; txns: Array<{ amt: bigint; date: number }> }>();
      // Two-pass: first gather amounts, then identify outliers.
      for (const t of ctx.txns) {
        if (t.deletedAt) continue;
        const date = Number(t.date);
        if (date < range.from || date > range.to) continue;
        const amt = ensureBigInt(t.amountMinor);
        if (amt >= 0n) continue;
        const key = t.description.trim().toLowerCase();
        if (!key) continue;
        const cur = perMerchant.get(key) ?? { display: t.description.trim() || "Unnamed", amounts: [], txns: [] };
        cur.amounts.push(-amt);
        cur.txns.push({ amt: -amt, date });
        perMerchant.set(key, cur);
      }
      const median = (xs: bigint[]): bigint => {
        if (xs.length === 0) return 0n;
        const sorted = [...xs].sort((a, b) => (a > b ? 1 : -1));
        const mid = Math.floor(sorted.length / 2);
        if (sorted.length % 2 === 0) return (sorted[mid - 1]! + sorted[mid]!) / 2n;
        return sorted[mid]!;
      };
      const anomalies: Array<{
        description: string;
        amountMinor: string;
        dateLabel: string;
        multipleOfMedian: number;
        medianMinor: string;
      }> = [];
      for (const m of perMerchant.values()) {
        if (m.amounts.length < 3) continue;
        const med = median(m.amounts);
        if (med === 0n) continue;
        for (const t of m.txns) {
          if (t.amt * 100n <= med * BigInt(threshold)) continue;
          const multiple = Number((t.amt * 100n) / med) / 100;
          anomalies.push({
            description: m.display,
            amountMinor: t.amt.toString(),
            dateLabel: formatDayLabel(t.date),
            multipleOfMedian: multiple,
            medianMinor: med.toString(),
          });
        }
      }
      anomalies.sort((a, b) => (BigInt(a.amountMinor) > BigInt(b.amountMinor) ? -1 : 1));
      return {
        ok: true,
        data: {
          type: "anomaly_list",
          periodLabel: range.label,
          assetCode: code,
          decimals,
          items: anomalies.slice(0, 5),
          scope: flags,
        },
      };
    }
    case "search": {
      // Free-text search over txn descriptions. Back-filled from the resolver
      // when the model omits `q` and the user spoke a known description
      // keyword (e.g. "payroll" → q="payroll"). Also used when the model
      // explicitly asks "find transactions where description contains X".
      const range = resolvePeriod(q.period ?? userText, ctx.now);
      const pattern = (q.q ?? "").trim().toLowerCase();
      const cat = q.category ? findCategory(ctx, q.category) : categoryFromText(ctx, userText);
      const limit = parseIntInRange(q.limit, 10, 1, 50);
      if (!pattern) {
        return {
          ok: true,
          data: {
            type: "search_empty",
            periodLabel: range.label,
            scope: flags,
          },
        };
      }
      const hits: Array<{
        description: string;
        amountMinor: string;
        dateLabel: string;
        categoryName: string | null;
        accountName: string | null;
      }> = [];
      const accountMap = new Map(ctx.accounts.map((a) => [a.id, a.name]));
      const catMap = new Map(ctx.categories.map((c) => [c.id, c.name]));
      for (const t of ctx.txns) {
        if (t.deletedAt) continue;
        const date = Number(t.date);
        if (date < range.from || date > range.to) continue;
        if (!t.description.toLowerCase().includes(pattern)) continue;
        if (cat && !t.categoryIds.includes(cat.id)) continue;
        hits.push({
          description: t.description.trim() || "Unnamed",
          amountMinor: t.amountMinor.toString(),
          dateLabel: formatDayLabel(date),
          categoryName:
            t.categoryIds
              .map((id) => catMap.get(id))
              .filter((n): n is string => Boolean(n))[0] ?? null,
          accountName: accountMap.get(t.accountId) ?? null,
        });
      }
      // Newest first; cap at limit.
      hits.sort((a, b) => (BigInt(a.amountMinor) < BigInt(b.amountMinor) ? 1 : -1));
      const totalMinor = hits.reduce((s, h) => s + BigInt(h.amountMinor), 0n);
      return {
        ok: true,
        data: {
          type: "search_results",
          periodLabel: range.label,
          query: pattern,
          category: cat?.name ?? null,
          assetCode: code,
          decimals,
          count: hits.length,
          totalMinor: totalMinor.toString(),
          hits: hits.slice(0, limit),
          scope: flags,
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
{"select":"compare","period":"<period>","category":"<category>","compareTo":"previous|last_year"}  — current vs prior period
{"select":"merchants","period":"<period>","category":"<category>","limit":"<n>"}  — top descriptions, default 5
{"select":"recurring","period":"<period>","minOccurrences":"<n>"}  — repeat charges and monthly cost
{"select":"burn","period":"<period>"}  — current pace vs prior month
{"select":"anomalies","period":"<period>","thresholdPct":"<n>"}  — transactions well above their merchant median
{"select":"search","period":"<period>","q":"<text>","category":"<category>","limit":"<n>"}  — find transactions whose description contains q
{"reply":"<short text>"}  — greetings or anything not about their data`;

export const QUERY_EXAMPLES = `User: "How much did I spend this month?" → {"select":"spending","period":"this_month"}
User: "food spending last month" → {"select":"spending","period":"last_month","category":"Food"}
User: "am I over budget on dining?" → {"select":"budget","period":"this_month","category":"Dining"}
User: "summarize this week" → {"select":"summary","period":"this_week"}
User: "log 42.50 lunch" → {"select":"log_txn","amount":"42.50","description":"lunch"}
User: "compare food spending this month vs last" → {"select":"compare","period":"this_month","category":"Food"}
User: "where does my food money go" → {"select":"merchants","category":"Food"}
User: "any subscriptions?" → {"select":"recurring"}
User: "am I on track this month" → {"select":"burn"}
User: "any weird big purchases lately" → {"select":"anomalies"}
User: "what was my payroll this month" → {"select":"search","period":"this_month","q":"payroll"}
User: "find amazon charges" → {"select":"search","q":"amazon"}
User: "hello" → {"reply":"Hi! Ask me about your spending, budgets, or a weekly summary."}`;
