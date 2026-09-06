import { describe, it, expect } from "vitest";
import {
  computeBalance,
  formatDayHeader,
  groupByDay,
  monthStats,
  dedupeById,
  type Account,
  type Txn,
} from "./accounts-store.js";

function account(overrides: Partial<Account> = {}): Account {
  return {
    id: "a1",
    name: "Checking",
    kind: "bank",
    assetId: "ast-1",
    openingBalanceMinor: 1000n,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    ...overrides,
  };
}

function txn(overrides: Partial<Txn> = {}): Txn {
  return {
    id: "t1",
    accountId: "a1",
    assetId: "ast-1",
    amountMinor: -500n,
    type: "expense",
    description: "Groceries",
    categoryIds: [],
    date: Date.now(),
    ...overrides,
  };
}

describe("computeBalance", () => {
  it("returns opening balance with no transactions", () => {
    const acc = account({ openingBalanceMinor: 5000n });
    expect(computeBalance(acc, [])).toBe(5000n);
  });

  it("adds non-deleted txn amounts to opening balance", () => {
    const acc = account({ openingBalanceMinor: 1000n });
    const txns = [
      txn({ amountMinor: 500n }),
      txn({ id: "t2", amountMinor: -200n }),
    ];
    expect(computeBalance(acc, txns)).toBe(1300n);
  });

  it("ignores deleted transactions", () => {
    const acc = account({ openingBalanceMinor: 1000n });
    const txns = [
      txn({ amountMinor: 500n }),
      txn({ id: "t2", amountMinor: -200n, deletedAt: Date.now() }),
    ];
    expect(computeBalance(acc, txns)).toBe(1500n);
  });

  it("ignores transactions belonging to other accounts", () => {
    // Regression: without the accountId filter every account absorbed the
    // whole ledger, inflating net worth N× by account count.
    const acc = account({ openingBalanceMinor: 1000n });
    const txns = [
      txn({ amountMinor: 500n }),
      txn({ id: "t2", accountId: "a2", amountMinor: -999999n }),
    ];
    expect(computeBalance(acc, txns)).toBe(1500n);
  });
});

describe("groupByDay", () => {
  it("groups transactions by local date key", () => {
    const t1 = txn({
      id: "t1",
      date: new Date(2025, 0, 15, 10, 30).getTime(),
    });
    const t2 = txn({
      id: "t2",
      date: new Date(2025, 0, 15, 14, 0).getTime(),
    });
    const t3 = txn({
      id: "t3",
      date: new Date(2025, 0, 14, 9, 0).getTime(),
    });
    const result = groupByDay([t1, t2, t3]);
    expect(result).toHaveLength(2);
    expect(result[0]!.day).toBe("2025-01-15");
    expect(result[0]!.items).toHaveLength(2);
    expect(result[1]!.day).toBe("2025-01-14");
    expect(result[1]!.items).toHaveLength(1);
  });

  it("sorts days in descending order", () => {
    const t1 = txn({ id: "t1", date: new Date(2025, 5, 1).getTime() });
    const t2 = txn({ id: "t2", date: new Date(2025, 5, 3).getTime() });
    const t3 = txn({ id: "t3", date: new Date(2025, 5, 2).getTime() });
    const result = groupByDay([t1, t2, t3]);
    expect(result.map((d) => d.day)).toEqual([
      "2025-06-03",
      "2025-06-02",
      "2025-06-01",
    ]);
  });

  it("excludes deleted transactions", () => {
    const t1 = txn({
      id: "t1",
      date: new Date(2025, 0, 15).getTime(),
    });
    const t2 = txn({
      id: "t2",
      date: new Date(2025, 0, 15).getTime(),
      deletedAt: Date.now(),
    });
    const result = groupByDay([t1, t2]);
    expect(result).toHaveLength(1);
    expect(result[0]!.items).toHaveLength(1);
  });
});

describe("formatDayHeader", () => {
  const keyOf = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

  it("returns Today for the current day", () => {
    expect(formatDayHeader(keyOf(new Date()))).toBe("Today");
  });

  it("returns Yesterday for the previous day", () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    expect(formatDayHeader(keyOf(yesterday))).toBe("Yesterday");
  });

  it("omits the year for other days in the current year", () => {
    const now = new Date();
    const date = new Date(now.getFullYear(), 0, 15);
    if (date.toDateString() === now.toDateString()) return;
    const label = formatDayHeader(keyOf(date));
    expect(label).not.toContain(String(now.getFullYear()));
  });

  it("includes the year for days outside the current year", () => {
    const pastYear = new Date().getFullYear() - 1;
    const label = formatDayHeader(`${pastYear}-01-15`);
    expect(label).toContain(String(pastYear));
  });
});

describe("monthStats", () => {
  it("computes income, expense, net for matching month", () => {
    const txns = [
      txn({
        id: "t1",
        amountMinor: 3000n,
        type: "income",
        date: new Date(2025, 2, 10).getTime(),
      }),
      txn({
        id: "t2",
        amountMinor: -700n,
        type: "expense",
        date: new Date(2025, 2, 15).getTime(),
      }),
    ];
    const result = monthStats(txns, 2025, 2);
    expect(result.income).toBe(3000n);
    expect(result.expense).toBe(700n);
    expect(result.net).toBe(2300n);
  });

  it("excludes transactions from other months", () => {
    const txns = [
      txn({
        id: "t1",
        amountMinor: 3000n,
        type: "income",
        date: new Date(2025, 2, 10).getTime(),
      }),
      txn({
        id: "t2",
        amountMinor: 500n,
        type: "income",
        date: new Date(2025, 3, 10).getTime(),
      }),
    ];
    const result = monthStats(txns, 2025, 2);
    expect(result.income).toBe(3000n);
  });

  it("ignores deleted transactions", () => {
    const txns = [
      txn({
        id: "t1",
        amountMinor: 1000n,
        type: "income",
        date: new Date(2025, 2, 10).getTime(),
      }),
      txn({
        id: "t2",
        amountMinor: 500n,
        type: "income",
        date: new Date(2025, 2, 10).getTime(),
        deletedAt: Date.now(),
      }),
    ];
    const result = monthStats(txns, 2025, 2);
    expect(result.income).toBe(1000n);
  });
});

describe("dedupeById", () => {
  it("keeps last occurrence of duplicate id", () => {
    const rows = [
      { id: "a", value: 1 },
      { id: "b", value: 2 },
      { id: "a", value: 3 },
    ];
    const result = dedupeById(rows);
    expect(result).toHaveLength(2);
    expect(result.find((r) => r.id === "a")!.value).toBe(3);
  });

  it("returns all rows when no duplicates", () => {
    const rows = [{ id: "a" }, { id: "b" }, { id: "c" }];
    expect(dedupeById(rows)).toHaveLength(3);
  });
});
