import { describe, it, expect } from "vitest";
import {
  calculateCategorySpending,
  calculateBudgetRemaining,
  getMonthBoundaries,
  calculateTotalBalance,
} from "./calculations";
import type { Transaction } from "@/lib/types";

// --- Helper to build a minimal transaction ---
function makeTx(overrides: Partial<Transaction> = {}): Transaction {
  return {
    user: "u1",
    description: "tx",
    type: "expense",
    amount: 100,
    bank: "b1",
    categories: ["cat1"],
    date: "2024-06-15T12:00:00.000Z",
    ...overrides,
  };
}

// ============================================================
// calculateCategorySpending
// ============================================================
describe("calculateCategorySpending", () => {
  const range = {
    start: new Date("2024-06-01T00:00:00.000Z"),
    end: new Date("2024-06-30T23:59:59.999Z"),
  };

  it("sums expense transactions matching category and date range", () => {
    const txs = [makeTx({ amount: 50 }), makeTx({ amount: 30 })];
    expect(calculateCategorySpending(txs, "cat1", range)).toBe(80);
  });

  it("includes withdrawal transactions", () => {
    const txs = [makeTx({ type: "withdrawal", amount: 40 })];
    expect(calculateCategorySpending(txs, "cat1", range)).toBe(40);
  });

  it("excludes income and deposit transactions", () => {
    const txs = [
      makeTx({ type: "income", amount: 200 }),
      makeTx({ type: "deposit", amount: 150 }),
      makeTx({ type: "expense", amount: 10 }),
    ];
    expect(calculateCategorySpending(txs, "cat1", range)).toBe(10);
  });

  it("excludes transactions outside the date range", () => {
    const txs = [
      makeTx({ date: "2024-05-31T23:59:59.999Z", amount: 99 }),
      makeTx({ date: "2024-07-01T00:00:00.000Z", amount: 88 }),
      makeTx({ date: "2024-06-15T00:00:00.000Z", amount: 10 }),
    ];
    expect(calculateCategorySpending(txs, "cat1", range)).toBe(10);
  });

  it("excludes transactions not in the given category", () => {
    const txs = [
      makeTx({ categories: ["other"], amount: 50 }),
      makeTx({ categories: ["cat1", "cat2"], amount: 20 }),
    ];
    expect(calculateCategorySpending(txs, "cat1", range)).toBe(20);
  });

  it("returns 0 for an empty transaction list", () => {
    expect(calculateCategorySpending([], "cat1", range)).toBe(0);
  });
});

// ============================================================
// calculateBudgetRemaining
// ============================================================
describe("calculateBudgetRemaining", () => {
  it("returns the difference when spending is under budget", () => {
    expect(calculateBudgetRemaining(1000, 600)).toBe(400);
  });

  it("returns 0 when spending equals budget", () => {
    expect(calculateBudgetRemaining(500, 500)).toBe(0);
  });

  it("returns 0 when spending exceeds budget (never negative)", () => {
    expect(calculateBudgetRemaining(1000, 1200)).toBe(0);
  });

  it("returns the full budget when spending is 0", () => {
    expect(calculateBudgetRemaining(750, 0)).toBe(750);
  });
});

// ============================================================
// getMonthBoundaries
// ============================================================
describe("getMonthBoundaries", () => {
  it("returns correct boundaries for a mid-month UTC date with offset 0", () => {
    const date = new Date("2024-06-15T10:00:00.000Z");
    const { start, end } = getMonthBoundaries(date, 0);

    expect(start.toISOString()).toBe("2024-06-01T00:00:00.000Z");
    expect(end.toISOString()).toBe("2024-06-30T23:59:59.999Z");
  });

  it("handles positive timezone offset (west of UTC, e.g. UTC-5)", () => {
    // UTC-5 → offset = 300
    // A UTC time of Jan 1 03:00 is still Dec 31 22:00 local
    const date = new Date("2024-01-01T03:00:00.000Z");
    const { start, end } = getMonthBoundaries(date, 300);

    // Local month is December 2023
    expect(start.toISOString()).toBe("2023-12-01T05:00:00.000Z"); // Dec 1 00:00 local = Dec 1 05:00 UTC
    expect(end.toISOString()).toBe("2024-01-01T04:59:59.999Z"); // Dec 31 23:59:59.999 local
  });

  it("handles negative timezone offset (east of UTC, e.g. UTC+9)", () => {
    // UTC+9 → offset = -540
    // A UTC time of Dec 31 20:00 is Jan 1 05:00 local
    const date = new Date("2023-12-31T20:00:00.000Z");
    const { start, end } = getMonthBoundaries(date, -540);

    // Local month is January 2024
    expect(start.toISOString()).toBe("2023-12-31T15:00:00.000Z"); // Jan 1 00:00 JST = Dec 31 15:00 UTC
    expect(end.toISOString()).toBe("2024-01-31T14:59:59.999Z"); // Jan 31 23:59:59.999 JST
  });

  it("handles year boundary correctly", () => {
    const date = new Date("2024-12-15T12:00:00.000Z");
    const { start, end } = getMonthBoundaries(date, 0);

    expect(start.toISOString()).toBe("2024-12-01T00:00:00.000Z");
    expect(end.toISOString()).toBe("2024-12-31T23:59:59.999Z");
  });

  it("handles February in a leap year", () => {
    const date = new Date("2024-02-15T12:00:00.000Z");
    const { start, end } = getMonthBoundaries(date, 0);

    expect(start.toISOString()).toBe("2024-02-01T00:00:00.000Z");
    expect(end.toISOString()).toBe("2024-02-29T23:59:59.999Z");
  });
});

// ============================================================
// calculateTotalBalance
// ============================================================
describe("calculateTotalBalance", () => {
  it("sums balances of all banks", () => {
    const banks = [{ balance: 100 }, { balance: 200 }, { balance: 50 }];
    expect(calculateTotalBalance(banks)).toBe(350);
  });

  it("returns 0 for an empty array", () => {
    expect(calculateTotalBalance([])).toBe(0);
  });

  it("handles negative balances", () => {
    const banks = [{ balance: 100 }, { balance: -30 }];
    expect(calculateTotalBalance(banks)).toBe(70);
  });
});
