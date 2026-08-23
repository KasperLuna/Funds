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

// ── Golden-file tests for logic.md §9.1 ──

describe("parseTransaction — amount extraction", () => {
  it("extracts plain number", () => {
    const r = parseTransaction("120 for lunch", { accounts, categories });
    expect(r.amount).toBe(120);
    expect(r.currency).toBeUndefined();
  });

  it("extracts amount with $ symbol → USD", () => {
    const r = parseTransaction("$50 groceries", { accounts, categories });
    expect(r.amount).toBe(50);
    expect(r.currency).toBe("USD");
  });

  it("extracts amount with € symbol → EUR", () => {
    const r = parseTransaction("€25.50 coffee", { accounts, categories });
    expect(r.amount).toBe(25.5);
    expect(r.currency).toBe("EUR");
  });

  it("extracts amount with ₱ symbol → PHP", () => {
    const r = parseTransaction("₱150 food", { accounts, categories });
    expect(r.amount).toBe(150);
    expect(r.currency).toBe("PHP");
  });

  it("extracts amount with code suffix (e.g. 50 USD)", () => {
    const r = parseTransaction("50 USD lunch", { accounts, categories });
    expect(r.amount).toBe(50);
    expect(r.currency).toBe("USD");
  });

  it("normalizes comma decimals (12,50 → 12.5)", () => {
    const r = parseTransaction("12,50 for snacks", { accounts, categories });
    expect(r.amount).toBe(12.5);
  });

  it("handles negative amounts", () => {
    const r = parseTransaction("-50 withdrawal", { accounts, categories });
    expect(r.amount).toBe(-50);
  });

  it("no amount → undefined", () => {
    const r = parseTransaction("hello world", { accounts, categories });
    expect(r.amount).toBeUndefined();
  });
});

describe("parseTransaction — account matching", () => {
  it("matches Gcash Wallet by fuzzy substring", () => {
    const r = parseTransaction("150 gcash for load", { accounts, categories });
    expect(r.account).toBe("Gcash Wallet");
  });

  it("matches Cash by exact token", () => {
    const r = parseTransaction("200 cash", { accounts, categories });
    expect(r.account).toBe("Cash");
  });

  it("no account matched → undefined", () => {
    const r = parseTransaction("100 groceries", { accounts, categories });
    expect(r.account).toBeUndefined();
  });

  it("subsumption: Gcash Wallet beats Cash on 'gcash wallet'", () => {
    const r = parseTransaction("100 gcash wallet", { accounts, categories });
    expect(r.account).toBe("Gcash Wallet");
  });
});

describe("parseTransaction — category matching", () => {
  it("matches Food", () => {
    const r = parseTransaction("120 food at restaurant", { accounts, categories });
    expect(r.categories).toContain("Food");
  });

  it("matches multiple categories", () => {
    const r = parseTransaction("200 food and transport", { accounts, categories });
    expect(r.categories).toContain("Food");
    expect(r.categories).toContain("Transport");
  });

  it("no category matched → empty array", () => {
    const r = parseTransaction("100 groceries", { accounts, categories });
    expect(r.categories).toEqual([]);
  });

  it("below threshold → not matched", () => {
    const r = parseTransaction("100 random stuff", { accounts, categories });
    expect(r.categories).toEqual([]);
  });
});

describe("parseTransaction — description", () => {
  it("extracts description as remainder", () => {
    const r = parseTransaction("120 lunch at Jollibee", { accounts, categories });
    expect(r.description).toBeDefined();
    expect(r.description!.length).toBeGreaterThan(0);
  });

  it("strips matched amount token", () => {
    const r = parseTransaction("$50 food gcash", { accounts, categories });
    expect(r.description).not.toContain("$50");
  });

  it("no amount → full text becomes description", () => {
    const r = parseTransaction("hello world", { accounts, categories });
    expect(r.description).toContain("hello world");
  });
});

describe("parseTransaction — confidence", () => {
  it("0.5 base when nothing found", () => {
    const r = parseTransaction("hello world", { accounts, categories });
    expect(r.confidence).toBe(0.5);
  });

  it("+0.3 when amount found", () => {
    const r = parseTransaction("100", { accounts, categories });
    expect(r.confidence).toBe(0.8);
  });

  it("+0.1 when account matched", () => {
    const r = parseTransaction("100 cash", { accounts, categories });
    expect(r.confidence).toBe(0.9);
  });

  it("+0.1 when category matched", () => {
    const r = parseTransaction("120 food", { accounts, categories });
    expect(r.confidence).toBe(0.9);
  });

  it("1.0 when all found (amount + account + category)", () => {
    const r = parseTransaction("$50 food gcash", { accounts, categories });
    expect(r.confidence).toBe(1.0);
  });

  it("caps at 1.0", () => {
    const r = parseTransaction("$50 food gcash", { accounts, categories });
    expect(r.confidence).toBeLessThanOrEqual(1.0);
  });
});

describe("parseTransaction — candidates", () => {
  it("returns scored candidates for accounts and categories", () => {
    const r = parseTransaction("120 food gcash", { accounts, categories });
    expect(r.candidates.length).toBeGreaterThan(0);
    for (const c of r.candidates) {
      expect(typeof c.id).toBe("string");
      expect(typeof c.name).toBe("string");
      expect(typeof c.score).toBe("number");
    }
  });

  it("top account candidate scores >= 0.5", () => {
    const r = parseTransaction("150 gcash", { accounts, categories });
    const gcashCandidate = r.candidates.find((c) => c.name === "Gcash Wallet");
    expect(gcashCandidate).toBeDefined();
    expect(gcashCandidate!.score).toBeGreaterThanOrEqual(0.5);
  });
});

describe("parseTransaction — rawText passthrough", () => {
  it("preserves original input", () => {
    const input = "120 lunch at Jollibee";
    const r = parseTransaction(input, { accounts, categories });
    expect(r.rawText).toBe(input);
  });
});
