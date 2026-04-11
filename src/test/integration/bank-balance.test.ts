/**
 * Integration tests for Bank balance calculation
 * Validates: Requirement 28.3
 */
import { describe, it, expect } from "vitest";
import { calculateTotalBalance } from "@/lib/utils/calculations";
import { expectCurrencyEqual } from "@/test/helpers";
import { createMockBank } from "@/test/factories";

describe("Bank balance calculation integration", () => {
  describe("calculateTotalBalance", () => {
    it("calculates total balance across multiple banks", () => {
      const banks = [
        createMockBank({ balance: 1000 }),
        createMockBank({ balance: 2500 }),
        createMockBank({ balance: 500 }),
      ];

      const total = calculateTotalBalance(banks);
      expectCurrencyEqual(total, 4000);
    });

    it("returns 0 for empty bank list", () => {
      const total = calculateTotalBalance([]);
      expect(total).toBe(0);
    });

    it("handles single bank", () => {
      const banks = [createMockBank({ balance: 1500 })];
      const total = calculateTotalBalance(banks);
      expectCurrencyEqual(total, 1500);
    });

    it("handles banks with zero balance", () => {
      const banks = [
        createMockBank({ balance: 0 }),
        createMockBank({ balance: 1000 }),
        createMockBank({ balance: 0 }),
      ];

      const total = calculateTotalBalance(banks);
      expectCurrencyEqual(total, 1000);
    });

    it("handles banks with negative balance (overdraft)", () => {
      const banks = [createMockBank({ balance: -200 }), createMockBank({ balance: 1000 })];

      const total = calculateTotalBalance(banks);
      expectCurrencyEqual(total, 800);
    });

    it("handles decimal amounts correctly", () => {
      const banks = [createMockBank({ balance: 100.5 }), createMockBank({ balance: 200.75 })];

      const total = calculateTotalBalance(banks);
      expectCurrencyEqual(total, 301.25);
    });
  });

  describe("Balance as sum of transactions", () => {
    it("income transactions increase balance", () => {
      // Simulate: bank starts at 0, income of 1000 and 500
      const transactions = [
        { type: "income" as const, amount: 1000 },
        { type: "income" as const, amount: 500 },
      ];

      const balance = transactions.reduce((sum, tx) => {
        return tx.type === "income" || tx.type === "deposit" ? sum + tx.amount : sum - tx.amount;
      }, 0);

      expectCurrencyEqual(balance, 1500);
    });

    it("expense transactions decrease balance", () => {
      const transactions = [
        { type: "income" as const, amount: 2000 },
        { type: "expense" as const, amount: 500 },
        { type: "expense" as const, amount: 300 },
      ];

      const balance = transactions.reduce((sum, tx) => {
        return tx.type === "income" || tx.type === "deposit" ? sum + tx.amount : sum - tx.amount;
      }, 0);

      expectCurrencyEqual(balance, 1200);
    });

    it("deposits and withdrawals affect balance correctly", () => {
      const transactions = [
        { type: "deposit" as const, amount: 1000 },
        { type: "withdrawal" as const, amount: 200 },
      ];

      const balance = transactions.reduce((sum, tx) => {
        return tx.type === "income" || tx.type === "deposit" ? sum + tx.amount : sum - tx.amount;
      }, 0);

      expectCurrencyEqual(balance, 800);
    });

    it("mixed transaction types produce correct balance", () => {
      const transactions = [
        { type: "income" as const, amount: 3000 },
        { type: "expense" as const, amount: 500 },
        { type: "deposit" as const, amount: 200 },
        { type: "withdrawal" as const, amount: 100 },
        { type: "expense" as const, amount: 50 },
      ];

      const balance = transactions.reduce((sum, tx) => {
        return tx.type === "income" || tx.type === "deposit" ? sum + tx.amount : sum - tx.amount;
      }, 0);

      expectCurrencyEqual(balance, 2550);
    });
  });
});
