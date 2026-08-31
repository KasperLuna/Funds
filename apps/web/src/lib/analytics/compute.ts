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

function monthKey(year: number, month: number): string {
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
