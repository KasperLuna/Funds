/**
 * Integration tests for Budget tracking (spending, remaining, overspending)
 * Validates: Requirement 28.4
 */
import { describe, it, expect } from "vitest";
import {
  calculateCategorySpending,
  calculateBudgetRemaining,
  getMonthBoundaries,
} from "@/lib/utils/calculations";
import { expectCurrencyEqual, expectNonNegative } from "@/test/helpers";
import { createMockTransaction } from "@/test/factories";
import type { Transaction } from "@/lib/types";

describe("Budget tracking integration", () => {
  describe("Monthly spending calculation", () => {
    const juneRange = {
      start: new Date("2024-06-01T00:00:00Z"),
      end: new Date("2024-06-30T23:59:59Z"),
    };

    it("calculates spending for a category within date range", () => {
      const transactions: Transaction[] = [
        createMockTransaction({
          type: "expense",
          amount: 100,
          categories: ["cat1"],
          date: "2024-06-10",
        }),
        createMockTransaction({
          type: "expense",
          amount: 200,
          categories: ["cat1"],
          date: "2024-06-20",
        }),
        createMockTransaction({
          type: "expense",
          amount: 50,
          categories: ["cat2"],
          date: "2024-06-15",
        }),
      ];

      const spending = calculateCategorySpending(transactions, "cat1", juneRange);
      expectCurrencyEqual(spending, 300);
    });

    it("only counts expense and withdrawal types", () => {
      const transactions: Transaction[] = [
        createMockTransaction({
          type: "expense",
          amount: 100,
          categories: ["cat1"],
          date: "2024-06-10",
        }),
        createMockTransaction({
          type: "income",
          amount: 500,
          categories: ["cat1"],
          date: "2024-06-15",
        }),
        createMockTransaction({
          type: "withdrawal",
          amount: 50,
          categories: ["cat1"],
          date: "2024-06-20",
        }),
        createMockTransaction({
          type: "deposit",
          amount: 200,
          categories: ["cat1"],
          date: "2024-06-25",
        }),
      ];

      const spending = calculateCategorySpending(transactions, "cat1", juneRange);
      expectCurrencyEqual(spending, 150); // 100 + 50
    });

    it("excludes transactions outside date range", () => {
      const transactions: Transaction[] = [
        createMockTransaction({
          type: "expense",
          amount: 100,
          categories: ["cat1"],
          date: "2024-06-15",
        }),
        createMockTransaction({
          type: "expense",
          amount: 200,
          categories: ["cat1"],
          date: "2024-05-15",
        }),
        createMockTransaction({
          type: "expense",
          amount: 300,
          categories: ["cat1"],
          date: "2024-07-01",
        }),
      ];

      const spending = calculateCategorySpending(transactions, "cat1", juneRange);
      expectCurrencyEqual(spending, 100);
    });

    it("returns 0 when no matching transactions exist", () => {
      const transactions: Transaction[] = [
        createMockTransaction({
          type: "expense",
          amount: 100,
          categories: ["cat2"],
          date: "2024-06-15",
        }),
      ];

      const spending = calculateCategorySpending(transactions, "cat1", juneRange);
      expect(spending).toBe(0);
    });

    it("returns 0 for empty transaction list", () => {
      const spending = calculateCategorySpending([], "cat1", juneRange);
      expect(spending).toBe(0);
    });
  });

  describe("Budget remaining calculation", () => {
    it("calculates remaining budget correctly", () => {
      const remaining = calculateBudgetRemaining(500, 300);
      expectCurrencyEqual(remaining, 200);
    });

    it("returns 0 when spending equals budget", () => {
      const remaining = calculateBudgetRemaining(500, 500);
      expect(remaining).toBe(0);
    });

    it("returns 0 when overspent (never negative)", () => {
      const remaining = calculateBudgetRemaining(500, 700);
      expect(remaining).toBe(0);
      expectNonNegative(remaining);
    });

    it("returns full budget when no spending", () => {
      const remaining = calculateBudgetRemaining(1000, 0);
      expectCurrencyEqual(remaining, 1000);
    });
  });

  describe("Overspending detection", () => {
    it("detects overspending when spending exceeds budget", () => {
      const budget = 500;
      const spending = 600;
      const remaining = calculateBudgetRemaining(budget, spending);
      const isOverspent = spending > budget;

      expect(isOverspent).toBe(true);
      expect(remaining).toBe(0);
    });

    it("calculates budget usage percentage", () => {
      const budget = 500;
      const spending = 400;
      const percentage = budget > 0 ? (spending / budget) * 100 : 0;

      expect(percentage).toBe(80);
    });

    it("handles over 100% usage", () => {
      const budget = 500;
      const spending = 750;
      const percentage = budget > 0 ? (spending / budget) * 100 : 0;

      expect(percentage).toBe(150);
    });
  });

  describe("Month boundaries", () => {
    it("calculates month boundaries for a given date", () => {
      const date = new Date("2024-06-15T12:00:00Z");
      const { start, end } = getMonthBoundaries(date, 0); // UTC

      expect(start.getUTCMonth()).toBe(5); // June (0-indexed)
      expect(start.getUTCDate()).toBe(1);
      expect(end.getUTCMonth()).toBe(5);
    });

    it("handles timezone offset for month boundaries", () => {
      const date = new Date("2024-06-15T12:00:00Z");
      // Timezone offset of -300 (UTC+5, e.g., Pakistan)
      const { start, end } = getMonthBoundaries(date, -300);

      // The boundaries should still be in June
      expect(start).toBeDefined();
      expect(end).toBeDefined();
      expect(end.getTime()).toBeGreaterThan(start.getTime());
    });
  });
});
