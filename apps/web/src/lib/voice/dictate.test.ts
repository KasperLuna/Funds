import { describe, expect, it } from "vitest";
import { dictateToPrefill } from "./dictate";

const ACCOUNTS = [
  { id: "acc-1", name: "Checking", decimals: 2 },
  { id: "acc-2", name: "Gcash Wallet", decimals: 2 },
];
const CATEGORIES = [
  { id: "cat-1", name: "Food" },
  { id: "cat-2", name: "Transport" },
];

describe("dictateToPrefill", () => {
  it("plain utterance fills amount and description", () => {
    const res = dictateToPrefill("Coffee 120", ACCOUNTS, CATEGORIES);
    expect(res?.missingAmount).toBe(false);
    expect(res?.prefill.amountInput).toBe("120");
    expect(res?.prefill.description).toBe("Coffee");
    expect(res?.prefill.categoryIds).toEqual([]);
  });

  it("resolves a named account and category from the utterance", () => {
    const res = dictateToPrefill("Food 500 gcash", ACCOUNTS, CATEGORIES);
    expect(res?.missingAmount).toBe(false);
    expect(res?.prefill.amountInput).toBe("500");
    expect(res?.prefill.accountId).toBe("acc-2");
    expect(res?.prefill.categoryIds).toEqual(["cat-1"]);
  });

  it("documents the currency-word description leak (parser follow-up)", () => {
    // "pesos" survives in the description; the shared parser should exclude
    // the currency span alongside amount/account/category spans.
    const res = dictateToPrefill("Food 500 pesos", ACCOUNTS, CATEGORIES);
    expect(res?.prefill.amountInput).toBe("500");
    expect(res?.prefill.categoryIds).toEqual(["cat-1"]);
    expect(res?.prefill.description).toBe("pesos");
  });

  it("no amount heard flags missingAmount and keeps the raw text", () => {
    const res = dictateToPrefill("Lunch with friends", ACCOUNTS, CATEGORIES);
    expect(res?.missingAmount).toBe(true);
    expect(res?.prefill.amountInput).toBeNull();
    expect(res?.prefill.description).toBe("Lunch with friends");
  });

  it("blank utterance returns null so the sheet stays listening", () => {
    expect(dictateToPrefill("   ", ACCOUNTS, CATEGORIES)).toBeNull();
  });
});
