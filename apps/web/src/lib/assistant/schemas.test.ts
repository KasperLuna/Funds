import { describe, expect, it } from "vitest";
import { schemaByUseCase, extractJson, spendingBreakdownSchema, budgetProgressSchema, summaryDashboardSchema, voiceTxnPrefillSchema } from "./schemas";

describe("assistant/schemas", () => {
  describe("budgetProgress", () => {
    it("accepts a valid budget payload", () => {
      const ok = budgetProgressSchema.safeParse({
        type: "budget_progress",
        category: "Dining",
        spentMinor: "3120",
        limitMinor: "4000",
        periodLabel: "This month",
        pctUsed: 78,
        status: "near",
        assetCode: "PHP",
        decimals: 2,
      });
      expect(ok.success).toBe(true);
    });
    it("rejects negative spentMinor (money must be a non-negative integer string)", () => {
      const r = budgetProgressSchema.safeParse({
        type: "budget_progress",
        category: "Dining",
        spentMinor: "-1",
        limitMinor: "4000",
        periodLabel: "This month",
        pctUsed: 78,
        status: "near",
        assetCode: "PHP",
        decimals: 2,
      });
      expect(r.success).toBe(false);
    });
    it("rejects float spentMinor", () => {
      const r = budgetProgressSchema.safeParse({
        type: "budget_progress",
        category: "Dining",
        spentMinor: "31.20",
        limitMinor: "4000",
        periodLabel: "This month",
        pctUsed: 78,
        status: "near",
        assetCode: "PHP",
        decimals: 2,
      });
      expect(r.success).toBe(false);
    });
    it("rejects out-of-range pctUsed", () => {
      const r = budgetProgressSchema.safeParse({
        type: "budget_progress",
        category: "Dining",
        spentMinor: "3120",
        limitMinor: "4000",
        periodLabel: "This month",
        pctUsed: 200,
        status: "near",
        assetCode: "PHP",
        decimals: 2,
      });
      expect(r.success).toBe(false);
    });
  });

  describe("spendingBreakdown", () => {
    it("accepts a valid payload", () => {
      const r = spendingBreakdownSchema.safeParse({
        type: "spending_breakdown",
        periodLabel: "This month",
        assetCode: "PHP",
        decimals: 2,
        totalMinor: "12540",
        slices: [{ category: "Food", amountMinor: "4200", pct: 33 }],
      });
      expect(r.success).toBe(true);
    });
    it("rejects empty slices", () => {
      const r = spendingBreakdownSchema.safeParse({
        type: "spending_breakdown",
        periodLabel: "This month",
        assetCode: "PHP",
        decimals: 2,
        totalMinor: "0",
        slices: [],
      });
      expect(r.success).toBe(false);
    });
  });

  describe("summaryDashboard", () => {
    it("accepts a valid payload including negative netMinor", () => {
      const r = summaryDashboardSchema.safeParse({
        type: "summary_dashboard",
        periodLabel: "This week",
        assetCode: "PHP",
        decimals: 2,
        incomeMinor: "100",
        expenseMinor: "500",
        netMinor: "-400",
        topCategories: [],
        budgets: [],
      });
      expect(r.success).toBe(true);
    });
  });

  describe("voiceTxnPrefill", () => {
    it("accepts nullable fields", () => {
      const r = voiceTxnPrefillSchema.safeParse({
        type: "voice_to_txn",
        accountId: null,
        accountName: "BPI",
        amountInput: null,
        amountMinor: null,
        currency: "PHP",
        categoryIds: [],
        description: "lunch",
        confidence: 0.5,
      });
      expect(r.success).toBe(true);
    });
  });

  describe("schemaByUseCase", () => {
    it("exposes a schema for every use case", () => {
      expect(Object.keys(schemaByUseCase)).toEqual(
        expect.arrayContaining([
          "spending_query",
          "budget_check",
          "weekly_summary",
          "voice_to_txn",
          "fallback_text",
        ]),
      );
    });
  });
});

describe("extractJson", () => {
  it("extracts a clean JSON object", () => {
    expect(extractJson('{"a":1}')).toEqual({ a: 1 });
  });
  it("strips leading and trailing prose", () => {
    expect(extractJson('Here you go: {"a":1} hope it helps')).toEqual({ a: 1 });
  });
  it("strips a markdown fence", () => {
    expect(extractJson('```json\n{"a":1}\n```')).toEqual({ a: 1 });
  });
  it("handles nested braces inside strings", () => {
    expect(extractJson('{"a":"{not really}","b":2}')).toEqual({ a: "{not really}", b: 2 });
  });
  it("returns null when there is no JSON", () => {
    expect(extractJson("nope")).toBeNull();
  });
});
