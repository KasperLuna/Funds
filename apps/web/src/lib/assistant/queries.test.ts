import { describe, expect, it } from "vitest";
import { executeQuery, type QueryCtx } from "./queries";
import type { Account, Txn } from "@/lib/accounts/accounts-store";
import type { Category, CategoryBudget } from "@/lib/categories/categories-store";

function makeAccount(overrides: Partial<Account> = {}): Account {
  return {
    id: "acc-1",
    name: "BPI",
    kind: "bank",
    assetId: "asset-php",
    openingBalanceMinor: 0n,
    createdAt: 0,
    updatedAt: 0,
    ...overrides,
  };
}

function makeCategory(overrides: Partial<Category> = {}): Category {
  return {
    id: "cat-food",
    name: "Food",
    color: "#f00",
    hideable: false,
    excludeFromAnalytics: false,
    monthlyBudgetMinor: null,
    assetId: "asset-php",
    createdAt: 0,
    updatedAt: 0,
    ...overrides,
  };
}

function makeTxn(overrides: Partial<Txn> = {}): Txn {
  return {
    id: "t-1",
    accountId: "acc-1",
    assetId: "asset-php",
    amountMinor: -1000n,
    type: "expense",
    description: "lunch",
    categoryIds: ["cat-food"],
    date: new Date().setHours(12, 0, 0, 0),
    ...overrides,
  };
}

const assetsById = new Map([["asset-php", { code: "PHP", decimals: 2 }]]);

const NOW = new Date(2026, 7, 29, 12, 0, 0).getTime();

function ctx(args: { txns?: Txn[]; accounts?: Account[]; categories?: Category[]; budgets?: CategoryBudget[] } = {}): QueryCtx {
  return {
    accounts: args.accounts ?? [makeAccount()],
    categories: args.categories ?? [makeCategory()],
    categoryBudgets: args.budgets ?? [],
    txns: args.txns ?? [makeTxn()],
    assetsById,
    now: NOW,
  };
}

describe("executeQuery — spending", () => {
  it("includes topTxn and dailyTrend", () => {
    const txns = [
      makeTxn({ id: "t-1", amountMinor: -500n, description: "snack", date: new Date(2026, 7, 5, 12).getTime() }),
      makeTxn({ id: "t-2", amountMinor: -2500n, description: "dinner", date: new Date(2026, 7, 20, 19).getTime() }),
    ];
    const out = executeQuery({ select: "spending" }, ctx({ txns }), "this month");
    expect(out.ok).toBe(true);
    if (!out.ok) return;
    expect(out.data.type).toBe("spending_breakdown");
    if (out.data.type === "spending_breakdown") {
      expect(out.data.totalMinor).toBe("3000");
      expect(out.data.topTxn?.description).toBe("dinner");
      expect(out.data.topTxn?.amountMinor).toBe("2500");
      expect(out.data.dailyTrend?.length).toBe(2);
    }
  });

  it("attaches scope flags for archived/excluded inclusion", () => {
    const out = executeQuery({ select: "spending" }, ctx(), "this month");
    expect(out.ok).toBe(true);
    if (out.ok) {
      const data = out.data as { scope: { includesArchived: boolean; includesExcluded: boolean } };
      expect(data.scope.includesArchived).toBe(true);
      expect(data.scope.includesExcluded).toBe(true);
    }
  });

  it("strips hallucinated money keys via Zod", () => {
    const out = executeQuery(
      // The model can attempt to send anything; cast so the test reflects that.
      {
        select: "spending",
        period: "this_month",
        totalMinor: "999999",
        slices: [{ category: "Food", amountMinor: "999999", pct: 100 }],
      } as unknown as Parameters<typeof executeQuery>[0],
      ctx(),
      "this month",
    );
    expect(out.ok).toBe(true);
    if (out.ok && out.data.type === "spending_breakdown") {
      expect(out.data.totalMinor).toBe("1000"); // not the hallucinated 999999
    }
  });
});

describe("executeQuery — compare", () => {
  it("computes deltaPct against the prior period", () => {
    const lastMonth = new Date(NOW);
    lastMonth.setMonth(lastMonth.getMonth() - 1);
    const txns = [
      makeTxn({ id: "t-cur", amountMinor: -2000n, date: NOW - 2 * 24 * 60 * 60 * 1000 }),
      makeTxn({ id: "t-prior", amountMinor: -1000n, date: lastMonth.getTime() - 2 * 24 * 60 * 60 * 1000 }),
    ];
    const out = executeQuery({ select: "compare", period: "this_month" }, ctx({ txns }), "this month");
    expect(out.ok).toBe(true);
    if (out.ok && out.data.type === "period_compare") {
      expect(out.data.currentMinor).toBe("2000");
      expect(out.data.priorMinor).toBe("1000");
      expect(out.data.deltaPct).toBe(100); // doubled
    }
  });
});

describe("executeQuery — merchants", () => {
  it("groups by description and orders by amount", () => {
    const txns = [
      makeTxn({ id: "a", description: "Jollibee", amountMinor: -2000n, date: new Date(2026, 7, 5).getTime() }),
      makeTxn({ id: "b", description: "Jollibee", amountMinor: -1500n, date: new Date(2026, 7, 10).getTime() }),
      makeTxn({ id: "c", description: "Mini Stop", amountMinor: -3000n, date: new Date(2026, 7, 12).getTime() }),
    ];
    const out = executeQuery({ select: "merchants" }, ctx({ txns }), "this month");
    expect(out.ok).toBe(true);
    if (out.ok && out.data.type === "merchant_breakdown") {
      // Jollibee totals 3500 (> Mini Stop 3000) so it wins despite one fewer tx.
      expect(out.data.merchants[0]?.description).toBe("Jollibee");
      expect(out.data.merchants[0]?.count).toBe(2);
      expect(out.data.merchants[1]?.description).toBe("Mini Stop");
      expect(out.data.merchants[1]?.count).toBe(1);
    }
  });
});

describe("executeQuery — burn", () => {
  it("projects end-of-period and reports vs prior", () => {
    const txns = [
      makeTxn({ id: "t1", amountMinor: -10000n, date: new Date(2026, 7, 5).getTime() }),
      makeTxn({ id: "t2", amountMinor: -10000n, date: new Date(2026, 7, 12).getTime() }),
      makeTxn({ id: "t3", amountMinor: -10000n, date: new Date(2026, 7, 19).getTime() }),
    ];
    const out = executeQuery({ select: "burn" }, ctx({ txns }), "this month");
    expect(out.ok).toBe(true);
    if (!out.ok) return;
    const data = out.data as Extract<typeof out.data, { type: "burn_rate" }>;
    if (data.type === "burn_rate") {
      expect(data.currentMinor).toBe("30000");
      expect(data.daysElapsed).toBeGreaterThan(15);
      expect(data.projectedMinor).not.toBe("0");
    }
  });
});

describe("executeQuery — search", () => {
  it("finds transactions by free-text description", () => {
    const txns = [
      makeTxn({ id: "p1", description: "Payroll Corp", amountMinor: 50000n, type: "income" as const, date: new Date(2026, 7, 5).getTime() }),
      makeTxn({ id: "p2", description: "Payroll Corp", amountMinor: 50000n, type: "income" as const, date: new Date(2026, 6, 5).getTime() }),
      makeTxn({ id: "x1", description: "Coffee", amountMinor: -200n, date: new Date(2026, 7, 6).getTime() }),
    ];
    const out = executeQuery({ select: "search", q: "payroll" }, ctx({ txns }), "this month");
    expect(out.ok).toBe(true);
    if (!out.ok) return;
    const data = out.data as Extract<typeof out.data, { type: "search_results" }>;
    if (data.type === "search_results") {
      expect(data.count).toBe(1);
      expect(data.query).toBe("payroll");
      expect(data.hits[0]?.description).toBe("Payroll Corp");
    }
  });

  it("scopes search to a category when given", () => {
    const txns = [
      makeTxn({ id: "a1", description: "Amazon", amountMinor: -1000n, date: new Date(2026, 7, 5).getTime() }),
      makeTxn({ id: "a2", description: "Amazon Prime", amountMinor: -200n, categoryIds: ["cat-shopping"] as string[], date: new Date(2026, 7, 6).getTime() }),
    ];
    const out = executeQuery(
      { select: "search", q: "amazon", category: "Shopping" },
      ctx({ txns, categories: [makeCategory({ name: "Shopping", id: "cat-shopping" })] }),
      "this month",
    );
    expect(out.ok).toBe(true);
    if (!out.ok) return;
    const data = out.data as Extract<typeof out.data, { type: "search_results" }>;
    if (data.type === "search_results") {
      expect(data.count).toBe(1);
      expect(data.hits[0]?.description).toBe("Amazon Prime");
    }
  });

  it("returns search_empty when no description is supplied", () => {
    const out = executeQuery({ select: "search" }, ctx(), "this month");
    expect(out.ok).toBe(true);
    if (!out.ok) return;
    const data = out.data as Extract<typeof out.data, { type: "search_empty" }>;
    expect(data.type).toBe("search_empty");
  });
});
