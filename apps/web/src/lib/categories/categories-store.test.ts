import { describe, it, expect } from "vitest";
import {
  computeBudgetUsage,
  budgetFor,
  type Category,
  type CategoryBudget,
} from "./categories-store.js";

function cat(overrides: Partial<Category> = {}): Category {
  return {
    id: "cat-1",
    name: "Food",
    color: "#6366f1",
    hideable: false,
    excludeFromAnalytics: false,
    monthlyBudgetMinor: 50000n, // $500
    assetId: null,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    ...overrides,
  };
}

function budget(overrides: Partial<CategoryBudget> = {}): CategoryBudget {
  return {
    id: "bud-1",
    categoryId: "cat-1",
    assetId: "php",
    monthStart: new Date(2025, 2, 1).getTime(),
    amountMinor: 30000n,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    deletedAt: null,
    ...overrides,
  };
}

function txn(overrides: { categoryIds?: string[]; amountMinor?: bigint; assetId?: string; date?: number; deletedAt?: number | null } = {}) {
  return {
    categoryIds: ["cat-1"],
    amountMinor: -1500n,
    assetId: "php",
    date: new Date(2025, 2, 10).getTime(),
    deletedAt: null as number | null,
    ...overrides,
  };
}

describe("computeBudgetUsage", () => {
  it("returns empty when no categories have budgets", () => {
    const noBudget = cat({ monthlyBudgetMinor: null });
    expect(computeBudgetUsage([noBudget], [], [txn()], 2025, 2)).toEqual([]);
  });

  it("computes spent amount for matching month", () => {
    const t = txn({ amountMinor: -3000n, date: new Date(2025, 2, 15).getTime() });
    const result = computeBudgetUsage([cat()], [], [t], 2025, 2);
    expect(result).toHaveLength(1);
    expect(result[0]!.spentMinor).toBe(3000n);
    expect(result[0]!.pct).toBe(6);
  });

  it("ignores income transactions", () => {
    const t = txn({ amountMinor: 5000n, date: new Date(2025, 2, 15).getTime() });
    const result = computeBudgetUsage([cat()], [], [t], 2025, 2);
    expect(result[0]!.spentMinor).toBe(0n);
  });

  it("ignores transactions from other months", () => {
    const t = txn({ amountMinor: -3000n, date: new Date(2025, 3, 10).getTime() });
    const result = computeBudgetUsage([cat()], [], [t], 2025, 2);
    expect(result[0]!.spentMinor).toBe(0n);
  });

  it("ignores deleted transactions", () => {
    const t = txn({ amountMinor: -3000n, date: new Date(2025, 2, 15).getTime(), deletedAt: Date.now() });
    const result = computeBudgetUsage([cat()], [], [t], 2025, 2);
    expect(result[0]!.spentMinor).toBe(0n);
  });

  it("ignores deleted categories", () => {
    const deleted = cat({ deletedAt: Date.now() });
    const t = txn({ amountMinor: -3000n });
    const result = computeBudgetUsage([deleted], [], [t], 2025, 2);
    expect(result).toEqual([]);
  });

  it("suppresses categories marked as excludeFromAnalytics from the budget list", () => {
    const exempt = cat({ id: "exempt", name: "Transfer", excludeFromAnalytics: true, monthlyBudgetMinor: 50000n });
    const result = computeBudgetUsage([exempt], [], [txn()], 2025, 2);
    expect(result).toEqual([]);
  });

  it("excludes transactions tagged with an exempt category from other categories' spend", () => {
    const exempt = cat({ id: "exempt", name: "Transfer", excludeFromAnalytics: true, monthlyBudgetMinor: 50000n });
    const food = cat({ id: "food", name: "Food" });
    const t = txn({ amountMinor: -3000n, categoryIds: ["exempt", "food"] });
    const result = computeBudgetUsage([exempt, food], [], [t], 2025, 2);
    const foodResult = result.find((r) => r.category.id === "food");
    expect(foodResult?.spentMinor).toBe(0n);
  });

  it("sums multiple transactions for same category", () => {
    const t1 = txn({ amountMinor: -1000n, date: new Date(2025, 2, 5).getTime() });
    const t2 = txn({ amountMinor: -2000n, date: new Date(2025, 2, 20).getTime(), categoryIds: ["cat-1"] });
    const result = computeBudgetUsage([cat()], [], [t1, t2], 2025, 2);
    expect(result[0]!.spentMinor).toBe(3000n);
  });

  it("uses a recorded budget for the period over the live value", () => {
    const result = computeBudgetUsage([cat()], [budget({ amountMinor: 40000n })], [txn()], 2025, 2);
    expect(result[0]!.budgetMinor).toBe(40000n);
    expect(result[0]!.budgetAssetId).toBe("php");
  });

  it("excludes spending in a different currency from the budget", () => {
    const other = txn({ amountMinor: -9000n, assetId: "usd" });
    const result = computeBudgetUsage([cat()], [budget()], [txn(), other], 2025, 2);
    // php budget: only the php txn (1500) counts; the usd txn is ignored
    expect(result[0]!.spentMinor).toBe(1500n);
  });

  it("does not apply the recorded budget to another month (history preserved)", () => {
    const result = computeBudgetUsage([cat()], [budget()], [txn()], 2025, 3);
    // no recorded budget for March -> falls back to the live $500 budget
    expect(result[0]!.budgetMinor).toBe(50000n);
  });
});

describe("budgetFor", () => {
  it("returns null when nothing is set", () => {
    expect(budgetFor(cat({ monthlyBudgetMinor: null }), [], 2025, 2)).toBeNull();
  });

  it("ignores tombstones of a recorded budget", () => {
    const b = budget({ deletedAt: Date.now() });
    expect(budgetFor(cat(), [b], 2025, 2)).toEqual({ amountMinor: 50000n, assetId: null });
  });
});
