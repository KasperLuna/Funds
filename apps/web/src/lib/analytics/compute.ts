/**
 * Pure analytics computation functions.
 * All inputs are typed arrays from the Dexie store; all outputs are
 * chart-ready data structures. No React, no side effects.
 */
import type { Txn } from "@/lib/accounts/accounts-store";
import type { Category } from "@/lib/categories/categories-store";
import type { ScheduledTxn } from "@/lib/scheduled/compute";
import { advanceRecurrence } from "@funds/core";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

export function monthKey(year: number, month: number): string {
  return `${MONTH_NAMES[month]} ${year}`;
}

function subMonths(date: Date, n: number): { year: number; month: number } {
  const d = new Date(date);
  d.setMonth(d.getMonth() - n);
  return { year: d.getFullYear(), month: d.getMonth() };
}

function ensureBigInt(v: bigint | number | string): bigint {
  return typeof v === "bigint" ? v : BigInt(v);
}

// cavetail: exclusion rule — skip a txn iff it has ≥1 tag and every tag is
// excluded (excludeFromAnalytics && !deletedAt); unknown ids count as
// included. Partially-excluded multi-tag txns split proportionally like
// spendingByMonth: (amt * included) / total. Uncategorized txns are included.
function excludedIdsOf(categories: Category[]): Set<string> {
  return new Set(
    categories.filter((c) => c.excludeFromAnalytics && !c.deletedAt).map((c) => c.id),
  );
}

function effectiveAmount(
  amt: bigint,
  categoryIds: string[],
  excludedIds: Set<string>,
): bigint | null {
  const total = categoryIds.length;
  if (total === 0) return amt;
  const included = categoryIds.filter((id) => !excludedIds.has(id)).length;
  if (included === 0) return null;
  return included === total ? amt : (amt * BigInt(included)) / BigInt(total);
}

// ---------------------------------------------------------------------------
// spendingByMonth — income/expense totals per month for the last N months
// ---------------------------------------------------------------------------

export type MonthStat = {
  month: string;
  year: number;
  monthNum: number;
  income: bigint;
  expense: bigint;
  net: bigint;
};

export function spendingByMonth(
  txns: Txn[],
  categories: Category[],
  lookback: number = 12,
): MonthStat[] {
  const now = new Date();
  const buckets: MonthStat[] = [];
  const excludedIds = new Set(
    categories.filter((c) => c.excludeFromAnalytics && !c.deletedAt).map((c) => c.id),
  );

  for (let i = lookback - 1; i >= 0; i--) {
    const { year, month } = subMonths(now, i);
    buckets.push({
      month: monthKey(year, month),
      year,
      monthNum: month,
      income: 0n,
      expense: 0n,
      net: 0n,
    });
  }

  for (const t of txns) {
    if (t.deletedAt) continue;
    const d = new Date(Number(t.date));
    const yr = d.getFullYear();
    const mo = d.getMonth();
    const bucket = buckets.find((b) => b.year === yr && b.monthNum === mo);
    if (!bucket) continue;
    const amt = ensureBigInt(t.amountMinor);
    const totalCats = t.categoryIds.length;
    const excludedCats = t.categoryIds.filter((id) => excludedIds.has(id)).length;
    if (excludedCats === totalCats) continue;
    const effective = totalCats > 0 && excludedCats > 0
      ? (amt * BigInt(totalCats - excludedCats)) / BigInt(totalCats)
      : amt;
    if (effective >= 0n) {
      bucket.income += effective;
    } else {
      bucket.expense += -effective;
    }
  }

  for (const b of buckets) {
    b.net = b.income - b.expense;
  }

  return buckets;
}

// ---------------------------------------------------------------------------
// savingsRate — (income - expense) / income per month
// ---------------------------------------------------------------------------

export type SavingsRatePoint = {
  month: string;
  rate: number;
};

export function savingsRate(
  txns: Txn[],
  categories: Category[],
  lookback: number = 12,
): SavingsRatePoint[] {
  return spendingByMonth(txns, categories, lookback).map((b) => ({
    month: b.month,
    rate: b.income > 0n
      ? Number(((b.income - b.expense) * 10000n) / b.income) / 100
      : 0,
  }));
}

// ---------------------------------------------------------------------------
// categoryBreakdown — spending by category for a given month
// ---------------------------------------------------------------------------

export type CategorySlice = {
  name: string;
  color: string;
  total: bigint;
  pct: number;
};

export function categoryBreakdown(
  txns: Txn[],
  categories: Category[],
  year: number,
  month: number,
): CategorySlice[] {
  const catMap = new Map(categories.map((c) => [c.id, c]));
  const excludedIds = new Set(
    categories.filter((c) => c.excludeFromAnalytics && !c.deletedAt).map((c) => c.id),
  );
  const totals = new Map<string, bigint>();
  let grandTotal = 0n;

  for (const t of txns) {
    if (t.deletedAt) continue;
    const amt = ensureBigInt(t.amountMinor);
    if (amt >= 0n) continue;
    const d = new Date(Number(t.date));
    if (d.getFullYear() !== year || d.getMonth() !== month) continue;
    const spend = -amt;
    const totalCats = t.categoryIds.length;
    const includedCats = t.categoryIds.filter((id) => !excludedIds.has(id));
    if (totalCats === 0) continue;
    const share = (spend * BigInt(includedCats.length)) / BigInt(totalCats);
    if (includedCats.length === 0) continue;
    for (const catId of includedCats) {
      const prev = totals.get(catId) ?? 0n;
      totals.set(catId, prev + share);
    }
    grandTotal += share;
  }

  const slices: CategorySlice[] = [];
  for (const [catId, total] of totals) {
    const cat = catMap.get(catId);
    if (!cat || cat.deletedAt) continue;
    slices.push({
      name: cat.name,
      color: cat.color,
      total,
      pct: grandTotal > 0n ? Number((total * 10000n) / grandTotal) / 100 : 0,
    });
  }

  slices.sort((a, b) => (a.total > b.total ? -1 : 1));

  // Bucket small slices into "Other"
  const OTHER_THRESHOLD = 5;
  const main: CategorySlice[] = [];
  let otherTotal = 0n;
  for (const s of slices) {
    if (s.pct < OTHER_THRESHOLD && main.length >= 5) {
      otherTotal += s.total;
    } else {
      main.push(s);
    }
  }
  if (otherTotal > 0n) {
    main.push({
      name: "Other",
      color: "#71717a",
      total: otherTotal,
      pct: grandTotal > 0n ? Number((otherTotal * 10000n) / grandTotal) / 100 : 0,
    });
  }

  return main;
}

// ---------------------------------------------------------------------------
// cashFlowForecast — project forward from scheduled transactions
// ---------------------------------------------------------------------------

export type CashFlowPoint = {
  month: string;
  income: bigint;
  expense: bigint;
  projected: boolean;
};

export function cashFlowForecast(
  scheduled: ScheduledTxn[],
  historicalTxns: Txn[],
  categories: Category[],
  futureMonths: number = 3,
): CashFlowPoint[] {
  // Historical: last 6 months
  const historical = spendingByMonth(historicalTxns, categories, 6).map((b) => ({
    month: b.month,
    income: b.income,
    expense: b.expense,
    projected: false,
  }));

  // Project: for each active scheduled txn, advance from invokeDate forward
  const now = new Date();
  const projectEnd = new Date(now);
  projectEnd.setMonth(projectEnd.getMonth() + futureMonths);

  const projected: CashFlowPoint[] = [];
  for (let i = 1; i <= futureMonths; i++) {
    const d = new Date(now);
    d.setMonth(d.getMonth() + i);
    projected.push({
      month: monthKey(d.getFullYear(), d.getMonth()),
      income: 0n,
      expense: 0n,
      projected: true,
    });
  }

  for (const s of scheduled) {
    if (!s.active || s.deletedAt || !s.recurrence || !s.invokeDate) continue;
    let invokeDate = new Date(s.invokeDate);

    // Advance until within our projection window
    for (let safety = 0; safety < 365; safety++) {
      if (invokeDate >= now) break;
      try {
        const advanced = advanceRecurrence({
          frequency: s.recurrence.frequency,
          interval: s.recurrence.interval,
          invokeDate,
          previousDate: null,
        });
        invokeDate = advanced.invokeDate;
      } catch {
        break;
      }
    }

    // Assign to projected months
    let cursor = invokeDate;
    for (let safety = 0; safety < 100; safety++) {
      if (cursor > projectEnd) break;
      if (cursor >= now) {
        const key = monthKey(cursor.getFullYear(), cursor.getMonth());
        const bucket = projected.find((p) => p.month === key);
        if (bucket) {
          const amt = ensureBigInt(s.amountMinor);
          if (amt >= 0n) {
            bucket.income += amt;
          } else {
            bucket.expense += -amt;
          }
        }
      }
      try {
        const advanced = advanceRecurrence({
          frequency: s.recurrence.frequency,
          interval: s.recurrence.interval,
          invokeDate: cursor,
          previousDate: null,
        });
        cursor = advanced.invokeDate;
      } catch {
        break;
      }
    }
  }

  return [...historical, ...projected];
}

// ---------------------------------------------------------------------------
// txnsByAccount — per-account counts + flows for a given month
// ---------------------------------------------------------------------------

export type AccountActivity = {
  accountId: string;
  name: string;
  count: number;
  inflow: bigint;
  outflow: bigint;
};

export function txnsByAccount(
  txns: Txn[],
  accounts: { id: string; name: string }[],
  categories: Category[],
  year: number,
  month: number,
): AccountActivity[] {
  const excludedIds = excludedIdsOf(categories);
  const activity = new Map<string, AccountActivity>();
  for (const a of accounts) {
    activity.set(a.id, { accountId: a.id, name: a.name, count: 0, inflow: 0n, outflow: 0n });
  }

  for (const t of txns) {
    if (t.deletedAt) continue;
    // cavetail: transfers post a leg in each account — counting legs would
    // credit both sides for one user action, so legs are excluded here.
    if (t.transferId != null) continue;
    const d = new Date(Number(t.date));
    if (d.getFullYear() !== year || d.getMonth() !== month) continue;
    const row = activity.get(t.accountId);
    if (!row) continue;
    const effective = effectiveAmount(ensureBigInt(t.amountMinor), t.categoryIds, excludedIds);
    if (effective === null) continue;
    row.count += 1;
    if (effective >= 0n) {
      row.inflow += effective;
    } else {
      row.outflow += -effective;
    }
  }

  return [...activity.values()]
    .filter((a) => a.count > 0)
    .sort((a, b) => b.count - a.count || (a.name < b.name ? -1 : 1));
}

// ---------------------------------------------------------------------------
// monthHeatmap — per-day counts + outflow for a given month
// ---------------------------------------------------------------------------

export type HeatmapDay = {
  day: number;
  count: number;
  outflow: bigint;
  income: bigint;
};

export type MonthHeatmap = {
  year: number;
  month: number;
  /** Blank cells before day 1 so the grid aligns to weekday columns. */
  leadingBlanks: number;
  days: HeatmapDay[];
  maxOutflow: bigint;
};

export function monthHeatmap(txns: Txn[], categories: Category[], year: number, month: number): MonthHeatmap {
  const excludedIds = excludedIdsOf(categories);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const days: HeatmapDay[] = Array.from({ length: daysInMonth }, (_, i) => ({
    day: i + 1,
    count: 0,
    outflow: 0n,
    income: 0n,
  }));
  const today = new Date();
  const isCurrentMonth =
    today.getFullYear() === year && today.getMonth() === month;

  for (const t of txns) {
    if (t.deletedAt || t.transferId != null) continue;
    const d = new Date(Number(t.date));
    if (d.getFullYear() !== year || d.getMonth() !== month) continue;
    // Future-dated rows are plans, not activity.
    if (isCurrentMonth && d.getDate() > today.getDate()) continue;
    const effective = effectiveAmount(ensureBigInt(t.amountMinor), t.categoryIds, excludedIds);
    if (effective === null) continue;
    const cell = days[d.getDate() - 1]!;
    cell.count += 1;
    if (effective < 0n) cell.outflow += -effective;
    else cell.income += effective;
  }

  let maxOutflow = 0n;
  for (const c of days) {
    if (c.outflow > maxOutflow) maxOutflow = c.outflow;
  }

  return {
    year,
    month,
    leadingBlanks: new Date(year, month, 1).getDay(),
    days,
    maxOutflow,
  };
}

// ---------------------------------------------------------------------------
// monthHighlights — busiest/biggest day, busiest weekday, streak, top inflow
// ---------------------------------------------------------------------------

export type MonthHighlights = {
  busiestDay: { day: number; count: number } | null;
  biggestDay: { day: number; outflow: bigint } | null;
  busiestWeekday: { weekday: number; count: number } | null;
  longestStreak: number;
  topInflowAccountId: string | null;
};

export function monthHighlights(
  txns: Txn[],
  categories: Category[],
  year: number,
  month: number,
): MonthHighlights {
  const excludedIds = excludedIdsOf(categories);
  const heat = monthHeatmap(txns, categories, year, month);
  const empty: MonthHighlights = {
    busiestDay: null,
    biggestDay: null,
    busiestWeekday: null,
    longestStreak: 0,
    topInflowAccountId: null,
  };
  if (heat.maxOutflow === 0n && heat.days.every((d) => d.count === 0)) {
    return empty;
  }

  // Days ascending + strict greater-than: ties resolve to the earliest day.
  let busiestDay: { day: number; count: number } | null = null;
  let biggestDay: { day: number; outflow: bigint } | null = null;
  for (const d of heat.days) {
    if (d.count > 0 && (!busiestDay || d.count > busiestDay.count)) {
      busiestDay = { day: d.day, count: d.count };
    }
    if (d.outflow > 0n && (!biggestDay || d.outflow > biggestDay.outflow)) {
      biggestDay = { day: d.day, outflow: d.outflow };
    }
  }

  const weekdayCounts = new Array<number>(7).fill(0);
  for (const d of heat.days) {
    if (d.count === 0) continue;
    const wd = new Date(year, month, d.day).getDay();
    weekdayCounts[wd]! += d.count;
  }
  let busiestWeekday: { weekday: number; count: number } | null = null;
  for (let wd = 0; wd < 7; wd++) {
    const count = weekdayCounts[wd]!;
    if (count > 0 && (!busiestWeekday || count > busiestWeekday.count)) {
      busiestWeekday = { weekday: wd, count };
    }
  }

  let longestStreak = 0;
  let run = 0;
  for (const d of heat.days) {
    run = d.count > 0 ? run + 1 : 0;
    if (run > longestStreak) longestStreak = run;
  }

  const inflowByAccount = new Map<string, bigint>();
  for (const t of txns) {
    if (t.deletedAt || t.transferId != null) continue;
    const d = new Date(Number(t.date));
    if (d.getFullYear() !== year || d.getMonth() !== month) continue;
    const effective = effectiveAmount(ensureBigInt(t.amountMinor), t.categoryIds, excludedIds);
    if (effective === null || effective <= 0n) continue;
    inflowByAccount.set(t.accountId, (inflowByAccount.get(t.accountId) ?? 0n) + effective);
  }
  let topInflowAccountId: string | null = null;
  let topInflow = 0n;
  for (const [id, total] of inflowByAccount) {
    if (total > topInflow) {
      topInflow = total;
      topInflowAccountId = id;
    }
  }

  return { busiestDay, biggestDay, busiestWeekday, longestStreak, topInflowAccountId };
}

// ---------------------------------------------------------------------------
// spendingAnomalies — z-score outliers per category
// ---------------------------------------------------------------------------

export type Anomaly = {
  txnId: string;
  description: string;
  amount: bigint;
  categoryName: string;
  zScore: number;
  date: number;
};

export function spendingAnomalies(
  txns: Txn[],
  categories: Category[],
): Anomaly[] {
  const catMap = new Map(categories.map((c) => [c.id, c]));
  const excludedIds = new Set(
    categories.filter((c) => c.excludeFromAnalytics && !c.deletedAt).map((c) => c.id),
  );
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  // Build per-category monthly spend history
  const history = new Map<string, number[]>();
  const current = new Map<string, { txn: Txn; spend: number }[]>();

  for (const t of txns) {
    if (t.deletedAt) continue;
    const amt = ensureBigInt(t.amountMinor);
    if (amt >= 0n) continue;
    const d = new Date(Number(t.date));
    const spend = Number(-amt);
    const yr = d.getFullYear();
    const mo = d.getMonth();
    const totalCats = t.categoryIds.length;
    const includedCats = t.categoryIds.filter((id) => !excludedIds.has(id));
    if (totalCats === 0 || includedCats.length === 0) continue;
    const share = (spend * includedCats.length) / totalCats;

    for (const catId of includedCats) {
      if (yr === currentYear && mo === currentMonth) {
        const arr = current.get(catId) ?? [];
        arr.push({ txn: t, spend: share });
        current.set(catId, arr);
      } else {
        const arr = history.get(catId) ?? [];
        arr.push(share);
        history.set(catId, arr);
      }
    }
  }

  const anomalies: Anomaly[] = [];
  for (const [catId, txns] of current) {
    const hist = history.get(catId);
    if (!hist || hist.length < 3) continue;
    const mean = hist.reduce((a, b) => a + b, 0) / hist.length;
    const variance = hist.reduce((a, b) => a + (b - mean) ** 2, 0) / hist.length;
    const stddev = Math.sqrt(variance);
    if (stddev === 0) continue;

    for (const { txn, spend } of txns) {
      const z = (spend - mean) / stddev;
      if (Math.abs(z) > 2) {
        const cat = catMap.get(catId);
        anomalies.push({
          txnId: txn.id,
          description: txn.description,
          amount: ensureBigInt(txn.amountMinor),
          categoryName: cat?.name ?? "Unknown",
          zScore: Math.round(z * 10) / 10,
          date: Number(txn.date),
        });
      }
    }
  }

  anomalies.sort((a, b) => Math.abs(b.zScore) - Math.abs(a.zScore));
  return anomalies;
}
