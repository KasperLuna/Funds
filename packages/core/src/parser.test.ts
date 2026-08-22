import { describe, expect, it } from "vitest";
import { parseTransaction } from "./parser";

const accounts = [
  { id: "a1", name: "Gcash Wallet" },
  { id: "a2", name: "Cash" },
  { id: "a3", name: "BPI Savings" },
];

const categories = [
  { id: "c1", name: "Food" },
  { id: "c2", name: "Transport" },
  { id: "c3", name: "Salary" },
];

describe("parseTransaction", () => {
  it("extracts amount from plain number", () => {
    const r = parseTransaction("120 for lunch", { accounts, categories });
    expect(r.amount).toBe(120);
  });

  it("extracts amount with currency symbol", () => {
    const r = parseTransaction("$50 groceries", { accounts, categories });
    expect(r.amount).toBe(50);
    expect(r.currency).toBe("USD");
  });

  it("extracts amount with euro symbol", () => {
    const r = parseTransaction("€25.50 coffee", { accounts, categories });
    expect(r.amount).toBe(25.5);
    expect(r.currency).toBe("EUR");
  });

  it("matches account by fuzzy name", () => {
    const r = parseTransaction("150 gcash for load", { accounts, categories });
    expect(r.account).toBe("Gcash Wallet");
  });

  it("matches category", () => {
    const r = parseTransaction("120 food at restaurant", { accounts, categories });
    expect(r.categories).toContain("Food");
  });

  it("matches multiple categories", () => {
    const r = parseTransaction("200 food and transport", { accounts, categories });
    expect(r.categories).toContain("Food");
    expect(r.categories).toContain("Transport");
  });

  it("extracts description as remainder", () => {
    const r = parseTransaction("120 lunch at Jollibee", { accounts, categories });
    expect(r.description).toBeDefined();
    expect(r.description!.length).toBeGreaterThan(0);
  });

  it("returns confidence 1.0 when all parts found", () => {
    const r = parseTransaction("$50 food gcash", { accounts, categories });
    expect(r.confidence).toBe(1.0);
  });

  it("returns lower confidence when only amount found", () => {
    const r = parseTransaction("100", { accounts, categories });
    expect(r.confidence).toBeLessThan(1.0);
    expect(r.confidence).toBeGreaterThanOrEqual(0.5);
  });

  it("returns confidence 0.5 when nothing found", () => {
    const r = parseTransaction("hello world", { accounts, categories });
    expect(r.confidence).toBe(0.5);
  });

  it("handles comma decimal (e.g. 12,50)", () => {
    const r = parseTransaction("12,50 for snacks", { accounts, categories });
    expect(r.amount).toBe(12.5);
  });

  it("handles negative amounts", () => {
    const r = parseTransaction("-50 withdrawal", { accounts, categories });
    expect(r.amount).toBe(-50);
  });

  it("handles peso symbol", () => {
    const r = parseTransaction("₱150 food", { accounts, categories });
    expect(r.amount).toBe(150);
    expect(r.currency).toBe("PHP");
  });
});
