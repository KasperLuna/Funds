import { describe, it, expect } from "vitest";
import type { Txn } from "@/lib/accounts/accounts-store";
import type { Category } from "@/lib/categories/categories-store";
import {
  spendingByMonth,
  categoryBreakdown,
  spendingAnomalies,
} from "./compute.js";

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
