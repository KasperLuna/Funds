import { describe, it, expect } from "vitest";
import { parseTransaction } from "@funds/core/parser";
import { resolvePrefill } from "./resolve";

const ACCOUNTS = [
  { id: "acc-1", name: "Gcash Wallet", decimals: 2 },
  { id: "acc-2", name: "Checking", decimals: 2 },
  { id: "acc-3", name: "Bitcoin Vault", decimals: 8 },
];

const CATEGORIES = [
  { id: "cat-1", name: "Food" },
  { id: "cat-2", name: "Transport" },
  { id: "cat-3", name: "Salary" },
];

describe("resolvePrefill", () => {
  it("resolves account id by matched name, categories to ids, amount to minor units", () => {
    const parsed = parseTransaction("$50 food gcash", { accounts: ACCOUNTS, categories: CATEGORIES });
    const prefill = resolvePrefill(parsed, ACCOUNTS, CATEGORIES);

    expect(prefill.accountId).toBe("acc-1");
    expect(prefill.accountName).toBe("Gcash Wallet");
    expect(prefill.categoryIds).toContain("cat-1");
    expect(prefill.amountMinor).toBe(5000n);
    expect(prefill.amountInput).toBe("50");
    expect(prefill.currency).toBe("USD");
    expect(prefill.confidence).toBe(1.0);
  });

  it("uses the matched account's decimals for minor-unit conversion", () => {
    const parsed = parseTransaction("0.5 bitcoin vault", { accounts: ACCOUNTS, categories: CATEGORIES });
    const prefill = resolvePrefill(parsed, ACCOUNTS, CATEGORIES);
    expect(prefill.accountId).toBe("acc-3");
    expect(prefill.amountMinor).toBe(50000000n);
  });

  it("falls back to 2 decimals when no account matched", () => {
    const parsed = parseTransaction("12.50 for snacks", { accounts: [], categories: CATEGORIES });
    const prefill = resolvePrefill(parsed, [], CATEGORIES);
    expect(prefill.accountId).toBeNull();
    expect(prefill.amountMinor).toBe(1250n);
  });

  it("no amount: low confidence still prefills text as description", () => {
    const parsed = parseTransaction("hello world", { accounts: ACCOUNTS, categories: CATEGORIES });
    const prefill = resolvePrefill(parsed, ACCOUNTS, CATEGORIES);
    expect(prefill.amountMinor).toBeNull();
    expect(prefill.amountInput).toBeNull();
    expect(prefill.confidence).toBe(0.5);
    expect(prefill.description).toContain("hello world");
  });

  it("multiple category matches map to multiple ids", () => {
    const parsed = parseTransaction("200 food and transport", { accounts: ACCOUNTS, categories: CATEGORIES });
    const prefill = resolvePrefill(parsed, ACCOUNTS, CATEGORIES);
    expect(parsed.categories).toContain("Food");
    expect(parsed.categories).toContain("Transport");
    expect(prefill.categoryIds.sort()).toEqual(["cat-1", "cat-2"]);
  });

  it("unmatched category names are dropped from ids", () => {
    const parsed = parseTransaction("120 food at restaurant", { accounts: ACCOUNTS, categories: CATEGORIES });
    const prefill = resolvePrefill(parsed, ACCOUNTS, []);
    expect(prefill.categoryIds).toEqual([]);
    expect(prefill.description.length).toBeGreaterThan(0);
  });

  it("negative amount yields signed minor units and absolute keypad input", () => {
    const parsed = parseTransaction("-50 withdrawal", { accounts: ACCOUNTS, categories: CATEGORIES });
    const prefill = resolvePrefill(parsed, ACCOUNTS, CATEGORIES);
    expect(prefill.amountMinor).toBe(-5000n);
    expect(prefill.amountInput).toBe("50");
  });

  it("carries the parsed description through", () => {
    const parsed = parseTransaction("120 lunch at Jollibee", { accounts: ACCOUNTS, categories: CATEGORIES });
    const prefill = resolvePrefill(parsed, ACCOUNTS, CATEGORIES);
    expect(prefill.description).toBe(parsed.description ?? "");
    expect(prefill.rawText).toBe("120 lunch at Jollibee");
  });
});
