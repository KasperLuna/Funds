import { describe, it, expect } from "vitest";
import type { Txn } from "@/lib/accounts/accounts-store";
import type { Category } from "@/lib/categories/categories-store";
import {
  spendingByMonth,
  categoryBreakdown,
  spendingAnomalies,
  cashFlowForecast,
  monthKey,
} from "./compute.js";
import type { ScheduledTxn } from "@/lib/scheduled/compute";

function cat(overrides: Partial<Category> = {}): Category {
  return {
    id: "cat-1",
    name: "Food",
    color: "#6366f1",
    hideable: false,
    excludeFromAnalytics: false,
    monthlyBudgetMinor: null,
    assetId: null,
    createdAt: 0,
    updatedAt: 0,
    ...overrides,
  };
}

function txn(overrides: Partial<Txn> = {}): Txn {
  return {
    id: "t-1",
    accountId: "acc-1",
    assetId: "ast-1",
    amountMinor: -1000n,
    type: "expense",
    description: "",
    categoryIds: [],
    date: new Date(2026, 0, 15).getTime(),
    ...overrides,
  };
}

describe("excludeFromAnalytics filtering", () => {
  it("spendingByMonth fully excludes transactions tagged only with an exempt category", () => {
    const transfer = cat({ id: "transfer", name: "Transfer", excludeFromAnalytics: true });
    const t = txn({ id: "x", categoryIds: ["transfer"], amountMinor: -50000n });
    const buckets = spendingByMonth([t], [transfer], 12);
    const total = buckets.reduce((s, b) => s + b.expense, 0n);
    expect(total).toBe(0n);
  });

  it("spendingByMonth counts a mixed-tag transaction proportionally to non-exempt categories", () => {
    const transfer = cat({ id: "transfer", name: "Transfer", excludeFromAnalytics: true });
    const food = cat({ id: "food", name: "Food" });
    const t = txn({ id: "x", categoryIds: ["transfer", "food"], amountMinor: -200n });
    const buckets = spendingByMonth([t], [transfer, food], 12);
    const total = buckets.reduce((s, b) => s + b.expense, 0n);
    expect(total).toBe(100n);
  });

  it("spendingByMonth counts a fully non-exempt transaction at full amount", () => {
    const food = cat({ id: "food", name: "Food" });
    const t = txn({ id: "x", categoryIds: ["food"], amountMinor: -200n });
    const buckets = spendingByMonth([t], [food], 12);
    const total = buckets.reduce((s, b) => s + b.expense, 0n);
    expect(total).toBe(200n);
  });

  it("categoryBreakdown attributes a mixed-tag transaction proportionally to the non-exempt category", () => {
    const transfer = cat({ id: "transfer", name: "Transfer", excludeFromAnalytics: true });
    const food = cat({ id: "food", name: "Food" });
    const t = txn({ id: "x", categoryIds: ["transfer", "food"], amountMinor: -200n });
    const d = new Date(t.date);
    const slices = categoryBreakdown([t], [transfer, food], d.getFullYear(), d.getMonth());
    const foodSlice = slices.find((s) => s.name === "Food");
    expect(foodSlice?.total).toBe(100n);
    const transferSlice = slices.find((s) => s.name === "Transfer");
    expect(transferSlice).toBeUndefined();
  });

  it("categoryBreakdown omits exempt categories entirely from the pie", () => {
    const transfer = cat({ id: "transfer", name: "Transfer", excludeFromAnalytics: true });
    const t = txn({ id: "x", categoryIds: ["transfer"], amountMinor: -500n });
    const d = new Date(t.date);
    const slices = categoryBreakdown([t], [transfer], d.getFullYear(), d.getMonth());
    expect(slices).toEqual([]);
  });

  it("spendingAnomalies skips exempt categories even if a transaction is tagged with them", () => {
    const transfer = cat({ id: "transfer", name: "Transfer", excludeFromAnalytics: true });
    const now = new Date();
    const lastYear = new Date(now);
    lastYear.setMonth(lastYear.getMonth() - 1);
    const history = Array.from({ length: 6 }, (_, i) =>
      txn({ id: `h${i}`, categoryIds: ["transfer"], amountMinor: -100n, date: lastYear.getTime() }),
    );
    const current = txn({ id: "c", categoryIds: ["transfer"], amountMinor: -1000n });
    const anomalies = spendingAnomalies([...history, current], [transfer]);
    expect(anomalies).toEqual([]);
  });
});

function scheduled(overrides: Partial<ScheduledTxn> = {}): ScheduledTxn {
  return {
    id: "s-1",
    userId: "u-1",
    name: "Rent",
    description: "",
    type: "expense",
    amountMinor: -100n,
    accountId: "acc-1",
    categoryIds: [],
    recurrence: { frequency: "monthly", interval: 1 },
    timezone: null,
    invokeDate: new Date().getTime(),
    previousDate: null,
    lastNotifiedAt: null,
    active: true,
    createdAt: 0,
    updatedAt: 0,
    deletedAt: null,
    ...overrides,
  };
}

describe("cashFlowForecast boundary", () => {
  it("returns 6 historical (projected=false) followed by N projected (projected=true)", () => {
    const food = cat({ id: "food", name: "Food" });
    const txns: Txn[] = [];
    for (let i = 0; i < 6; i++) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      txns.push(txn({ id: `h${i}`, categoryIds: ["food"], amountMinor: -200n, date: d.getTime() }));
    }
    const future = scheduled({ amountMinor: -500n });
    const result = cashFlowForecast([future], txns, [food], 3);

    expect(result).toHaveLength(9);
    const now = new Date();
    const currentMonth = monthKey(now.getFullYear(), now.getMonth());
    const firstProjected = result.findIndex((p) => p.projected);
    expect(firstProjected).toBeGreaterThan(0);
    const boundary = result[firstProjected - 1]!;
    expect(boundary.month).toBe(currentMonth);
    expect(boundary.projected).toBe(false);
    for (let i = 0; i < firstProjected; i++) {
      expect(result[i]!.projected).toBe(false);
    }
    for (let i = firstProjected; i < result.length; i++) {
      expect(result[i]!.projected).toBe(true);
    }
  });
});
