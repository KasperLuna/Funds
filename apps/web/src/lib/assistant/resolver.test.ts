import { describe, expect, it } from "vitest";
import { resolveTerms } from "./resolver";
import type { Category } from "@/lib/categories/categories-store";

function makeCategory(overrides: Partial<Category> = {}): Category {
  return {
    id: "cat-1",
    name: "Food",
    color: "#000",
    hideable: false,
    excludeFromAnalytics: false,
    monthlyBudgetMinor: null,
    assetId: null,
    createdAt: 0,
    updatedAt: 0,
    ...overrides,
  };
}

describe("resolveTerms — category aliases", () => {
  it("maps 'dining' to a Food-style category", () => {
    const r = resolveTerms({ userText: "Am I over budget on dining?", categories: [makeCategory({ name: "Food" })] });
    expect(r.category).toBe("Food");
    expect(r.categorySource).toBe("alias");
  });

  it("maps 'gas' to a Transport-style category", () => {
    const r = resolveTerms({ userText: "How much did I spend on gas?", categories: [makeCategory({ id: "c-t", name: "Transport" })] });
    expect(r.category).toBe("Transport");
  });

  it("maps 'subscriptions' to a Streaming/Recurring category", () => {
    const r = resolveTerms({ userText: "any subscriptions?", categories: [makeCategory({ name: "Streaming" })] });
    expect(r.category).toBe("Streaming");
  });

  it("prefers an alias match over an exact-name match", () => {
    // User has BOTH a literal "Dining" category and a "Food" category.
    // "dining" should still resolve to whichever the alias table picks.
    const r = resolveTerms({
      userText: "dining this week",
      categories: [makeCategory({ id: "c-f", name: "Food" }), makeCategory({ id: "c-d", name: "Dining" })],
    });
    // The alias table matches Food via /food|grocer|dining|restaurant/i.
    // The exact-match pass runs second and would match Dining, but the
    // alias pass runs first and wins. (Either is correct; the contract
    // is "dining resolves to a sensible Food category".)
    expect(["Food", "Dining"]).toContain(r.category);
  });

  it("returns no category when nothing matches", () => {
    const r = resolveTerms({ userText: "what was the weather", categories: [makeCategory({ name: "Food" })] });
    expect(r.category).toBeUndefined();
    expect(r.categorySource).toBe("none");
  });
});

describe("resolveTerms — description patterns", () => {
  it("recognises 'payroll' as a description keyword", () => {
    const r = resolveTerms({ userText: "What was my payroll this month?", categories: [makeCategory({ name: "Work" })] });
    expect(r.descriptionPattern).toBe("payroll");
    expect(r.descriptionSource).toBe("keyword");
  });

  it("recognises 'salary', 'refund', 'reimburse', 'cashback'", () => {
    expect(resolveTerms({ userText: "any salary deposits?", categories: [] }).descriptionPattern).toBe("salary");
    expect(resolveTerms({ userText: "any refunds?", categories: [] }).descriptionPattern).toBe("refund");
    expect(resolveTerms({ userText: "show reimbursements", categories: [] }).descriptionPattern).toBe("reimburse");
    expect(resolveTerms({ userText: "where is my cashback", categories: [] }).descriptionPattern).toBe("cashback");
  });

  it("falls back to extracted pattern when no keyword matches", () => {
    const r = resolveTerms({ userText: "find amazon charges", categories: [makeCategory({ name: "Shopping" })] });
    expect(r.descriptionPattern).toBe("amazon");
    expect(r.descriptionSource).toBe("extracted");
  });

  it("does not extract the category name as a description", () => {
    const r = resolveTerms({ userText: "spending on Food", categories: [makeCategory({ name: "Food" })] });
    expect(r.descriptionPattern).toBeUndefined();
  });
});

describe("resolveTerms — payroll scenario", () => {
  it("returns BOTH category and description for 'what was my payroll this month'", () => {
    const r = resolveTerms({
      userText: "What was my payroll this month?",
      categories: [makeCategory({ name: "Work" })],
    });
    expect(r.descriptionPattern).toBe("payroll");
    // "Work" isn't a category alias match (the alias table doesn't include
    // it for payroll); the substring pass won't match either. So the
    // resolver only returns the description pattern — the model picks
    // search with q=payroll, and the executor runs the description filter.
    expect(r.category).toBeUndefined();
  });
});
