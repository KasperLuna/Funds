import { describe, expect, it } from "vitest";
import { buildSnapshot } from "./serialize";
import type { Account, Txn } from "@/lib/accounts/accounts-store";
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

function makeAccount(overrides: Partial<Account> = {}): Account {
  return {
    id: "acc-1",
    name: "BPI",
    kind: "bank",
    assetId: "asset-php",
    openingBalanceMinor: 0n,
    createdAt: 0,
    updatedAt: 0,
    ...overrides,
  };
}

function makeTxn(overrides: Partial<Txn> = {}): Txn {
  return {
    id: "t-1",
    accountId: "acc-1",
    assetId: "asset-php",
    amountMinor: -1000n,
    type: "expense",
    description: "lunch",
    categoryIds: ["cat-1"],
    date: 0,
    ...overrides,
  };
}

describe("buildSnapshot — categories surface", () => {
  it("includes all categories the user has (under the byte cap)", () => {
    const cats: Category[] = [];
    for (let i = 0; i < 10; i++) {
      cats.push(makeCategory({ id: `c-${i}`, name: `Cat ${i}` }));
    }
    const snap = buildSnapshot({
      accounts: [makeAccount()],
      categories: cats,
      txns: [],
      assetsById: new Map([["asset-php", { code: "PHP" }]]),
    });
    // 10 cats, each ~`{"id":"c-N","name":"Cat N"}` is well under 2KB.
    expect(snap.categories.length).toBe(10);
  });

  it("attaches the resolved object so the model can read it", () => {
    const snap = buildSnapshot({
      accounts: [makeAccount()],
      categories: [makeCategory({ name: "Food" })],
      txns: [],
      assetsById: new Map([["asset-php", { code: "PHP" }]]),
      userText: "how much on dining",
    });
    expect(snap.resolved?.category).toBe("Food");
    expect(snap.resolved?.categorySource).toBe("alias");
  });
});

describe("buildSnapshot — resolved category survives truncation", () => {
  it("prepends the resolved category when the byte cap would hide it", () => {
    // Build enough categories to force the 2KB budget to kick in.
    const cats: Category[] = [];
    for (let i = 0; i < 40; i++) {
      cats.push(makeCategory({ id: `c-${i}`, name: `Category Number ${i}` }));
    }
    // The resolver will pick "Category Number 5" via the substring pass
    // (none of the alias stems match "show me category number 5" but
    // "category" itself isn't a keyword, so we use a user text that
    // *does* match an alias). We pick "Food" via "dining" against
    // a category named "Food and Drink" that has low txn count.
    cats.push(makeCategory({ id: "c-low", name: "Food and Drink" }));
    const snap = buildSnapshot({
      accounts: [makeAccount()],
      categories: cats,
      txns: [makeTxn({ categoryIds: ["c-0"] })], // only the first cat has txns
      assetsById: new Map([["asset-php", { code: "PHP" }]]),
      userText: "dining", // resolves to "Food and Drink" via /food|.../i
    });
    expect(snap.resolved?.category).toBe("Food and Drink");
    // The resolved category is prepended so the model can see it.
    expect(snap.categories[0]?.name).toBe("Food and Drink");
    expect(snap.categories[0]?.id).toBe("__resolved__");
  });
});
