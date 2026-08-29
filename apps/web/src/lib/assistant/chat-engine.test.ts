import { describe, expect, it } from "vitest";
import { inferUseCase, runChat } from "./chat-engine";
import { createMockLlmEngine } from "./engine-mock";
import type { Account, Txn } from "@/lib/accounts/accounts-store";
import type { Category, CategoryBudget } from "@/lib/categories/categories-store";

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

function makeCategory(overrides: Partial<Category> = {}): Category {
  return {
    id: "cat-food",
    name: "Food",
    color: "#f00",
    hideable: false,
    excludeFromAnalytics: false,
    monthlyBudgetMinor: 4000n,
    assetId: "asset-php",
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
    amountMinor: -1500n,
    type: "expense",
    description: "lunch",
    categoryIds: ["cat-food"],
    date: new Date().setHours(0, 0, 0, 0),
    ...overrides,
  };
}

const assetsById = new Map([["asset-php", { code: "PHP", decimals: 2 }]]);

const baseDeps = () => ({
  engine: createMockLlmEngine(),
  accounts: [makeAccount()],
  categories: [makeCategory()],
  categoryBudgets: [] as CategoryBudget[],
  txns: [makeTxn()],
  assetsById,
  inferUseCase,
});

describe("runChat", () => {
  it("returns a user message and a valid assistant message on a clean budget reply", async () => {
    const deps = baseDeps();
    deps.engine.setResponse(
      JSON.stringify({
        type: "budget_progress",
        category: "Food",
        spentMinor: "1500",
        limitMinor: "4000",
        periodLabel: "This month",
        pctUsed: 38,
        status: "under",
        assetCode: "PHP",
        decimals: 2,
      }),
    );
    const out = await runChat(
      { text: "Am I over budget on food?", now: Date.now(), userId: "u" },
      deps,
    );
    expect(out.user.role).toBe("user");
    expect(out.assistant.type).toBe("budget_progress");
    if (out.assistant.type === "budget_progress") {
      // Handler re-derives spent from local rows: the 1500 txn is what we
      // fed in, NOT the model's number — the model is just naming the
      // category.
      expect(out.assistant.spentMinor).toBe("1500");
    }
  });

  it("retries once on a malformed first response and accepts the second", async () => {
    const deps = baseDeps();
    deps.engine.setResponses([
      "not json at all",
      JSON.stringify({
        type: "spending_breakdown",
        periodLabel: "This month",
        assetCode: "PHP",
        decimals: 2,
        totalMinor: "1500",
        slices: [{ category: "Food", amountMinor: "1500", pct: 100 }],
      }),
    ]);
    const out = await runChat(
      { text: "How much did I spend on food?", now: Date.now(), userId: "u" },
      deps,
    );
    expect(out.assistant.type).toBe("spending_breakdown");
    expect(deps.engine.calls).toHaveLength(2);
  });

  it("falls back to a text or structured answer when both attempts fail", async () => {
    const deps = baseDeps();
    deps.engine.setResponses(["not json", "still not json"]);
    const out = await runChat(
      { text: "How much did I spend on food?", now: Date.now(), userId: "u" },
      deps,
    );
    // The fallback for a spending_query question is a spending_breakdown
    // derived from local data, not a model-narrated text answer.
    expect(out.assistant.type).toBe("spending_breakdown");
  });

  it("returns a friendly error when the engine throws", async () => {
    const deps = baseDeps();
    deps.engine.failNext(new Error("boom"));
    const out = await runChat(
      { text: "anything", now: Date.now(), userId: "u" },
      deps,
    );
    expect(out.assistant.type).toBe("error");
    if (out.assistant.type === "error") {
      expect(out.assistant.reason).toMatch(/unavailable/i);
    }
  });

  it("rejects a JSON that looks right but doesn't match any schema", async () => {
    const deps = baseDeps();
    deps.engine.setResponses([
      JSON.stringify({ type: "budget_progress", category: "Food" }),
      JSON.stringify({ type: "budget_progress", category: "Food" }),
    ]);
    const out = await runChat(
      { text: "How much on food this month?", now: Date.now(), userId: "u" },
      deps,
    );
    expect(out.assistant.type).toBe("spending_breakdown");
  });
});

describe("inferUseCase", () => {
  const snap = { tz: "UTC", nowIso: "2025-01-01T00:00:00Z", accounts: [], categories: [{ id: "c1", name: "Food" }] };
  it("detects spending_query", () => {
    expect(inferUseCase("how much on food?", snap)).toBe("spending_query");
  });
  it("detects budget_check", () => {
    expect(inferUseCase("am I over budget on dining?", snap)).toBe("budget_check");
  });
  it("detects weekly_summary", () => {
    expect(inferUseCase("summarize this week", snap)).toBe("weekly_summary");
  });
  it("detects voice_to_txn for non-question log intent", () => {
    expect(inferUseCase("log a ₱42 lunch at BPI", snap)).toBe("voice_to_txn");
  });
  it("falls through to fallback_text", () => {
    expect(inferUseCase("hi there", snap)).toBe("fallback_text");
  });
});
