import { describe, expect, it } from "vitest";
import { inferUseCase, runChat } from "./chat-engine";
import { createMockLlmEngine, toolCall } from "./engine-mock";
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

describe("runChat — tool-call loop", () => {
  it("executes a model tool call and renders the widget without a second model turn", async () => {
    const deps = baseDeps();
    deps.engine.setResponse(toolCall("get_spending_breakdown", { period: "this_month" }));
    const out = await runChat(
      { text: "How much did I spend on food?", now: Date.now(), userId: "u" },
      deps,
    );
    expect(deps.engine.calls).toHaveLength(1);
    expect(out.assistant.type).toBe("spending_breakdown");
    if (out.assistant.type === "spending_breakdown") {
      // Money re-derived from the local txn, not the model.
      expect(out.assistant.totalMinor).toBe("1500");
      expect(out.assistant.slices[0]?.category).toBe("Food");
    }
  });

  it("resolves 'last month' from the model's tool arguments", async () => {
    const deps = baseDeps();
    const lastMonth = new Date();
    lastMonth.setMonth(lastMonth.getMonth() - 1);
    lastMonth.setDate(15);
    deps.txns = [makeTxn({ date: lastMonth.getTime() })];
    deps.engine.setResponse(toolCall("get_spending_breakdown", { period: "last_month", category: "Food" }));
    const out = await runChat(
      { text: "How much did I spend on food last month?", now: Date.now(), userId: "u" },
      deps,
    );
    expect(out.assistant.type).toBe("spending_breakdown");
    if (out.assistant.type === "spending_breakdown") {
      expect(out.assistant.periodLabel).toBe("Last month");
      expect(out.assistant.totalMinor).toBe("1500");
    }
  });

  it("feeds a failed tool result back and renders the retry", async () => {
    const deps = baseDeps();
    deps.engine.setResponses([
      toolCall("unknown_tool", {}),
      toolCall("get_budget_status", { category: "Food" }),
    ]);
    const out = await runChat(
      { text: "Am I over budget on food?", now: Date.now(), userId: "u" },
      deps,
    );
    expect(out.assistant.type).toBe("budget_progress");
    expect(deps.engine.calls).toHaveLength(2);
    const secondCall = deps.engine.calls[1]!;
    expect(secondCall.messages?.some((m) => m.role === "tool")).toBe(true);
  });

  it("renders model text directly for conversational input (no tool call)", async () => {
    const deps = baseDeps();
    deps.engine.setResponse("Hi! I can help you track spending.");
    const out = await runChat({ text: "hello", now: Date.now(), userId: "u" }, deps);
    expect(out.assistant.type).toBe("text");
    if (out.assistant.type === "text") {
      expect(out.assistant.content).toContain("Hi");
    }
  });
});

describe("runChat — fallbacks", () => {
  it("falls back to a deterministic breakdown when both rounds produce junk", async () => {
    const deps = baseDeps();
    deps.engine.setResponses(["not json", "still not json"]);
    const out = await runChat(
      { text: "How much did I spend on food?", now: Date.now(), userId: "u" },
      deps,
    );
    expect(out.assistant.type).toBe("spending_breakdown");
  });

  it("answers from local rows with a notice when the engine throws", async () => {
    const deps = baseDeps();
    deps.engine.failNext(new Error("boom"));
    const out = await runChat(
      { text: "How much did I spend on food?", now: Date.now(), userId: "u" },
      deps,
    );
    expect(out.assistant.type).toBe("spending_breakdown");
    if (out.assistant.type === "spending_breakdown") {
      expect(out.assistant.notice).toMatch(/unavailable/i);
      expect(out.assistant.notice).toContain("boom");
      expect(out.assistant.totalMinor).toBe("1500");
    }
  });

  it("keeps a cancelled request as an error bubble without a local answer", async () => {
    const deps = baseDeps();
    deps.engine.failNext(new DOMException("Aborted", "AbortError"));
    const out = await runChat({ text: "anything", now: Date.now(), userId: "u" }, deps);
    expect(out.assistant.type).toBe("error");
    if (out.assistant.type === "error") {
      expect(out.assistant.reason).toMatch(/cancelled/i);
    }
  });

  it("re-derives money from local rows even when the model emits its own JSON", async () => {
    const deps = baseDeps();
    // Model fabricates spentMinor: 99999 — must be ignored.
    deps.engine.setResponse(
      JSON.stringify({
        type: "budget_progress",
        category: "Food",
        spentMinor: "99999",
        limitMinor: "4000",
        periodLabel: "This month",
        pctUsed: 250,
        status: "over",
        assetCode: "PHP",
        decimals: 2,
      }),
    );
    const out = await runChat(
      { text: "Am I over budget on food?", now: Date.now(), userId: "u" },
      deps,
    );
    expect(out.assistant.type).toBe("budget_progress");
    if (out.assistant.type === "budget_progress") {
      expect(out.assistant.spentMinor).toBe("1500");
    }
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
