// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { filterTxns, type TxnFilters } from "./transaction-filters";
import type { Txn } from "@/lib/accounts/accounts-store";
import type { Category } from "@/lib/categories/categories-store";

function txn(overrides: Partial<Txn> = {}): Txn {
  return {
    id: "t1",
    accountId: "acc-1",
    assetId: "ast-1",
    amountMinor: -1000n,
    type: "expense",
    description: "Coffee",
    categoryIds: ["cat-1"],
    date: Date.UTC(2026, 7, 15, 10, 0, 0),
    ...overrides,
  };
}

const CATS: Category[] = [
  { id: "cat-1", name: "Food", color: "#22c55e", hideable: false, excludeFromAnalytics: false, monthlyBudgetMinor: null, assetId: null, createdAt: 0, updatedAt: 0 },
  { id: "cat-2", name: "Transport", color: "#3b82f6", hideable: false, excludeFromAnalytics: false, monthlyBudgetMinor: null, assetId: null, createdAt: 0, updatedAt: 0 },
];

const ACCOUNTS = [{ id: "acc-1", name: "Checking" }];

const DEPS = { categories: CATS, accounts: ACCOUNTS };

const EMPTY: TxnFilters = { query: "", categoryIds: [], date: null };

describe("filterTxns", () => {
  it("returns everything when no filters are active", () => {
    const list = [txn(), txn({ id: "t2", description: "Bus fare", categoryIds: ["cat-2"] })];
    expect(filterTxns(list, EMPTY, DEPS)).toHaveLength(2);
  });

  it("matches full-text search across description, category name, and account name", () => {
    const list = [
      txn({ id: "t1", description: "Coffee" }),
      txn({ id: "t2", description: "Bus fare", categoryIds: ["cat-2"] }),
      txn({ id: "t3", description: "x", accountId: "acc-1", categoryIds: ["cat-2"] }),
    ];
    expect(filterTxns(list, { ...EMPTY, query: "coffee" }, DEPS).map((t) => t.id)).toEqual(["t1"]);
    expect(filterTxns(list, { ...EMPTY, query: "transport" }, DEPS).map((t) => t.id)).toEqual(["t2", "t3"]);
    expect(filterTxns(list, { ...EMPTY, query: "checking" }, DEPS).map((t) => t.id)).toEqual(["t1", "t2", "t3"]);
  });

  it("filters by category id", () => {
    const list = [txn({ id: "t1", categoryIds: ["cat-1"] }), txn({ id: "t2", categoryIds: ["cat-2"] })];
    expect(filterTxns(list, { ...EMPTY, categoryIds: ["cat-1"] }, DEPS).map((t) => t.id)).toEqual(["t1"]);
  });

  it("filters by date range inclusively", () => {
    const list = [
      txn({ id: "t1", date: Date.UTC(2026, 7, 10) }),
      txn({ id: "t2", date: Date.UTC(2026, 7, 20) }),
      txn({ id: "t3", date: Date.UTC(2026, 8, 1) }),
    ];
    const range = { from: Date.UTC(2026, 7, 15), to: Date.UTC(2026, 7, 31) };
    expect(filterTxns(list, { ...EMPTY, date: range }, DEPS).map((t) => t.id)).toEqual(["t2"]);
  });

  it("combines all filters", () => {
    const list = [
      txn({ id: "t1", description: "Coffee", categoryIds: ["cat-1"], date: Date.UTC(2026, 7, 10) }),
      txn({ id: "t2", description: "Coffee", categoryIds: ["cat-1"], date: Date.UTC(2026, 7, 20) }),
    ];
    const filters: TxnFilters = {
      query: "coffee",
      categoryIds: ["cat-1"],
      date: { from: Date.UTC(2026, 7, 15), to: Date.UTC(2026, 7, 31) },
    };
    expect(filterTxns(list, filters, DEPS).map((t) => t.id)).toEqual(["t2"]);
  });
});