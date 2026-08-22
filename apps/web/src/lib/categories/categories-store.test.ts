import { describe, it, expect } from "vitest";
import { computeBudgetUsage, type Category } from "./categories-store.js";

function cat(overrides: Partial<Category> = {}): Category {
  return {
    id: "cat-1",
    name: "Food",
    hideable: false,
    monthlyBudgetMinor: 50000n, // $500
    createdAt: Date.now(),
    updatedAt: Date.now(),
    ...overrides,
  };
}

function txn(overrides: { categoryIds?: string[]; amountMinor?: bigint; date?: number; deletedAt?: number | null } = {}) {
  return {
    categoryIds: ["cat-1"],
    amountMinor: -1500n,
    date: new Date(2025, 2, 10).getTime(),
    deletedAt: null as number | null,
    ...overrides,
  };
}

describe("computeBudgetUsage", () => {
  it("returns empty when no categories have budgets", () => {
    const noBudget = cat({ monthlyBudgetMinor: null });
    expect(computeBudgetUsage([noBudget], [txn()], 2025, 2)).toEqual([]);
  });

  it("computes spent amount for matching month", () => {
    const t = txn({ amountMinor: -3000n, date: new Date(2025, 2, 15).getTime() });
    const result = computeBudgetUsage([cat()], [t], 2025, 2);
    expect(result).toHaveLength(1);
    expect(result[0]!.spentMinor).toBe(3000n);
    expect(result[0]!.pct).toBe(6);
  });

  it("ignores income transactions", () => {
    const t = txn({ amountMinor: 5000n, date: new Date(2025, 2, 15).getTime() });
    const result = computeBudgetUsage([cat()], [t], 2025, 2);
    expect(result[0]!.spentMinor).toBe(0n);
  });

  it("ignores transactions from other months", () => {
    const t = txn({ amountMinor: -3000n, date: new Date(2025, 3, 10).getTime() });
    const result = computeBudgetUsage([cat()], [t], 2025, 2);
    expect(result[0]!.spentMinor).toBe(0n);
  });

  it("ignores deleted transactions", () => {
    const t = txn({ amountMinor: -3000n, date: new Date(2025, 2, 15).getTime(), deletedAt: Date.now() });
    const result = computeBudgetUsage([cat()], [t], 2025, 2);
    expect(result[0]!.spentMinor).toBe(0n);
  });

  it("ignores deleted categories", () => {
    const deleted = cat({ deletedAt: Date.now() });
    const t = txn({ amountMinor: -3000n });
    const result = computeBudgetUsage([deleted], [t], 2025, 2);
    expect(result).toEqual([]);
  });

  it("sums multiple transactions for same category", () => {
    const t1 = txn({ amountMinor: -1000n, date: new Date(2025, 2, 5).getTime() });
    const t2 = txn({ amountMinor: -2000n, date: new Date(2025, 2, 20).getTime(), categoryIds: ["cat-1"] });
    const result = computeBudgetUsage([cat()], [t1, t2], 2025, 2);
    expect(result[0]!.spentMinor).toBe(3000n);
  });
});
