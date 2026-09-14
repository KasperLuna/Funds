import { describe, it, expect } from "vitest";
import type { Txn } from "@/lib/accounts/accounts-store";
import type { Category } from "@/lib/categories/categories-store";
import {
  spendingByMonth,
  categoryBreakdown,
  spendingAnomalies,
  cashFlowForecast,
  monthKey,
  txnsByAccount,
  monthHeatmap,
  monthHighlights,
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
    autoDeduct: false,
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

describe("txnsByAccount", () => {
  const accounts = [
    { id: "acc-1", name: "Checking" },
    { id: "acc-2", name: "Wallet" },
  ];
  const jan = (day: number) => new Date(2026, 0, day).getTime();

  it("counts and splits flows per account, sorted by count", () => {
    const rows = txnsByAccount(
      [
        txn({ id: "t1", accountId: "acc-1", amountMinor: -1000n, date: jan(5) }),
        txn({ id: "t2", accountId: "acc-1", amountMinor: 5000n, date: jan(6) }),
        txn({ id: "t3", accountId: "acc-2", amountMinor: -200n, date: jan(7) }),
      ],
      accounts,
      [],
      2026,
      0,
    );
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ accountId: "acc-1", name: "Checking", count: 2 });
    expect(rows[0]!.inflow).toBe(5000n);
    expect(rows[0]!.outflow).toBe(1000n);
    expect(rows[1]).toMatchObject({ accountId: "acc-2", count: 1, outflow: 200n });
  });

  it("excludes transfer legs, deleted rows, and other months", () => {
    const rows = txnsByAccount(
      [
        txn({ id: "t1", accountId: "acc-1", amountMinor: -1000n, transferId: "xfer-1", date: jan(5) }),
        txn({ id: "t2", accountId: "acc-1", amountMinor: -1000n, deletedAt: jan(6), date: jan(5) }),
        txn({ id: "t3", accountId: "acc-1", amountMinor: -1000n, date: new Date(2026, 1, 5).getTime() }),
      ],
      accounts,
      [],
      2026,
      0,
    );
    expect(rows).toEqual([]);
  });
});

describe("monthHeatmap", () => {
  it("buckets counts and outflow per day with weekday-aligned blanks", () => {
    // Jan 2026: 31 days, Jan 1 is a Thursday (4 leading blanks, Sun-first).
    const heat = monthHeatmap(
      [
        txn({ id: "t1", amountMinor: -1000n, date: new Date(2026, 0, 3).getTime() }),
        txn({ id: "t2", amountMinor: -500n, date: new Date(2026, 0, 3).getTime() }),
        txn({ id: "t3", amountMinor: 9000n, date: new Date(2026, 0, 10).getTime() }),
      ],
      [],
      2026,
      0,
    );
    expect(heat.leadingBlanks).toBe(4);
    expect(heat.days).toHaveLength(31);
    expect(heat.days[2]).toMatchObject({ day: 3, count: 2 });
    expect(heat.days[2]!.outflow).toBe(1500n);
    expect(heat.days[9]).toMatchObject({ day: 10, count: 1, outflow: 0n });
    expect(heat.maxOutflow).toBe(1500n);
  });

  it("sizes February correctly in a leap year", () => {
    const heat = monthHeatmap([], [], 2024, 1);
    expect(heat.days).toHaveLength(29);
    expect(heat.maxOutflow).toBe(0n);
  });
});

describe("monthHighlights", () => {
  it("finds busiest/biggest days with earliest-wins ties, weekday, streak, top inflow", () => {
    // Jan 2026: Jan 3 = Saturday, Jan 5 = Monday, Jan 6 = Tuesday.
    const rows = monthHighlights(
      [
        txn({ id: "t1", accountId: "acc-1", amountMinor: -500n, date: new Date(2026, 0, 3).getTime() }),
        txn({ id: "t2", accountId: "acc-1", amountMinor: -500n, date: new Date(2026, 0, 3).getTime() }),
        txn({ id: "t3", accountId: "acc-1", amountMinor: -2000n, date: new Date(2026, 0, 5).getTime() }),
        txn({ id: "t4", accountId: "acc-1", amountMinor: -2000n, date: new Date(2026, 0, 6).getTime() }),
        txn({ id: "t5", accountId: "acc-2", amountMinor: 9000n, date: new Date(2026, 0, 8).getTime() }),
      ],
      [],
      2026,
      0,
    );
    expect(rows.busiestDay).toEqual({ day: 3, count: 2 });
    // Tie at 2000 between the 5th and 6th: earliest wins.
    expect(rows.biggestDay?.day).toBe(5);
    expect(rows.biggestDay?.outflow).toBe(2000n);
    // Saturday (weekday 6) has 2 txns, every other day at most 1.
    expect(rows.busiestWeekday).toEqual({ weekday: 6, count: 2 });
    // Runs: {3}, {5, 6}, {8} → longest 2.
    expect(rows.longestStreak).toBe(2);
    expect(rows.topInflowAccountId).toBe("acc-2");
  });
});

describe("excludeFromAnalytics in txnsByAccount/monthHeatmap/monthHighlights", () => {
  const transfer = () => cat({ id: "transfer", name: "Transfer", excludeFromAnalytics: true });
  const food = () => cat({ id: "food", name: "Food" });
  const jan = (day: number) => new Date(2026, 0, day).getTime();
  const accounts = [
    { id: "acc-1", name: "Checking" },
    { id: "acc-2", name: "Wallet" },
  ];

  it("txnsByAccount drops fully-excluded, splits partial, keeps uncategorized", () => {
    const cats = [transfer(), food()];
    const rows = txnsByAccount(
      [
        txn({ id: "e1", accountId: "acc-1", amountMinor: -1000n, categoryIds: ["transfer"], date: jan(5) }),
        txn({ id: "p1", accountId: "acc-1", amountMinor: -200n, categoryIds: ["transfer", "food"], date: jan(5) }),
        txn({ id: "u1", accountId: "acc-2", amountMinor: -300n, categoryIds: [], date: jan(6) }),
      ],
      accounts,
      cats,
      2026,
      0,
    );
    expect(rows).toHaveLength(2);
    // e1 dropped entirely; p1 split 50/50.
    expect(rows[0]).toMatchObject({ accountId: "acc-1", count: 1 });
    expect(rows[0]!.outflow).toBe(100n);
    expect(rows[1]).toMatchObject({ accountId: "acc-2", count: 1 });
    expect(rows[1]!.outflow).toBe(300n);
  });

  it("monthHeatmap drops fully-excluded, splits partial, tracks income per day", () => {
    const cats = [transfer(), food()];
    const heat = monthHeatmap(
      [
        txn({ id: "e1", amountMinor: -1000n, categoryIds: ["transfer"], date: jan(3) }),
        txn({ id: "p1", amountMinor: -200n, categoryIds: ["transfer", "food"], date: jan(3) }),
        txn({ id: "i1", amountMinor: 9000n, categoryIds: [], date: jan(10) }),
      ],
      cats,
      2026,
      0,
    );
    expect(heat.days[2]).toMatchObject({ day: 3, count: 1 });
    expect(heat.days[2]!.outflow).toBe(100n);
    expect(heat.days[2]!.income).toBe(0n);
    expect(heat.days[9]).toMatchObject({ day: 10, count: 1, outflow: 0n });
    expect(heat.days[9]!.income).toBe(9000n);
    expect(heat.maxOutflow).toBe(100n);
  });

  it("monthHighlights ignores excluded txns for days and top inflow", () => {
    const cats = [transfer(), food()];
    const rows = monthHighlights(
      [
        txn({ id: "t1", accountId: "acc-1", amountMinor: -500n, categoryIds: ["food"], date: jan(3) }),
        txn({ id: "t2", accountId: "acc-1", amountMinor: -500n, categoryIds: ["food"], date: jan(3) }),
        txn({ id: "t3", accountId: "acc-1", amountMinor: -5000n, categoryIds: ["transfer"], date: jan(5) }),
        txn({ id: "t4", accountId: "acc-1", amountMinor: -2000n, categoryIds: ["food"], date: jan(6) }),
        txn({ id: "t5", accountId: "acc-2", amountMinor: 9000n, categoryIds: ["transfer"], date: jan(8) }),
        txn({ id: "t6", accountId: "acc-1", amountMinor: 1000n, categoryIds: ["food"], date: jan(8) }),
      ],
      cats,
      2026,
      0,
    );
    expect(rows.busiestDay).toEqual({ day: 3, count: 2 });
    // Excluded -5000 on the 5th must not win biggest day.
    expect(rows.biggestDay).toEqual({ day: 6, outflow: 2000n });
    // Excluded +9000 must not win top inflow.
    expect(rows.topInflowAccountId).toBe("acc-1");
  });

  it("empty month yields nulls and zero streak", () => {
    expect(monthHighlights([], [], 2026, 0)).toEqual({
      busiestDay: null,
      biggestDay: null,
      busiestWeekday: null,
      longestStreak: 0,
      topInflowAccountId: null,
    });
  });
});
