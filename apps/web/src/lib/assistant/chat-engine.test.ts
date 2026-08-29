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

describe("runChat — query generation", () => {
  it("executes a spending query and derives money from local rows, keeping raw output", async () => {
    const deps = baseDeps();
    deps.engine.setResponse('{"select":"spending","period":"this_month"}');
    const out = await runChat(
      { text: "How much did I spend on food?", now: Date.now(), userId: "u" },
      deps,
    );
    expect(deps.engine.calls).toHaveLength(1);
    expect(out.assistant.type).toBe("spending_breakdown");
    if (out.assistant.type === "spending_breakdown") {
      expect(out.assistant.totalMinor).toBe("1500");
      expect(out.assistant.slices[0]?.category).toBe("Food");
    }
    expect(out.assistant.rawOutput).toContain('"select":"spending"');
  });

  it("renders a budget widget from a budget query", async () => {
    const deps = baseDeps();
    deps.engine.setResponse('{"select":"budget","category":"Food"}');
    const out = await runChat(
      { text: "Am I over budget on food?", now: Date.now(), userId: "u" },
      deps,
    );
    expect(out.assistant.type).toBe("budget_progress");
    if (out.assistant.type === "budget_progress") {
      expect(out.assistant.spentMinor).toBe("1500");
    }
  });

  it("re-parses the period from the user's words when the model omits it", async () => {
    const deps = baseDeps();
    const lastMonth = new Date();
    lastMonth.setMonth(lastMonth.getMonth() - 1);
    lastMonth.setDate(15);
    deps.txns = [makeTxn({ date: lastMonth.getTime() })];
    deps.engine.setResponse('{"select":"spending","category":"Food"}');
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

  it("strips hallucinated money keys before execution", async () => {
    const deps = baseDeps();
    deps.engine.setResponse(
      '{"select":"spending","period":"this_month","totalMinor":"999999","slices":[{"category":"Food","amountMinor":"999999","pct":100}]}',
    );
    const out = await runChat(
      { text: "How much did I spend on food?", now: Date.now(), userId: "u" },
      deps,
    );
    expect(out.assistant.type).toBe("spending_breakdown");
    if (out.assistant.type === "spending_breakdown") {
      expect(out.assistant.totalMinor).toBe("1500");
    }
  });

  it("renders a conversational reply for non-data questions", async () => {
    const deps = baseDeps();
    deps.engine.setResponse('{"reply":"Hi! Ask me about your spending."}');
    const out = await runChat({ text: "hello", now: Date.now(), userId: "u" }, deps);
    expect(out.assistant.type).toBe("text");
    if (out.assistant.type === "text") {
      expect(out.assistant.content).toContain("Hi");
    }
  });
});

describe("runChat — retry and fallback", () => {
  it("retries once with a corrective prompt then accepts the query", async () => {
    const deps = baseDeps();
    deps.engine.setResponses(["not json", '{"select":"spending","period":"this_month"}']);
    const out = await runChat(
      { text: "How much did I spend on food?", now: Date.now(), userId: "u" },
      deps,
    );
    expect(deps.engine.calls).toHaveLength(2);
    expect(out.assistant.type).toBe("spending_breakdown");
    expect(out.assistant.rawOutput).toContain("not json");
  });

  it("falls back to a deterministic breakdown when both rounds fail", async () => {
    const deps = baseDeps();
    deps.engine.setResponses(["not json", "still not json"]);
    const out = await runChat(
      { text: "How much did I spend on food?", now: Date.now(), userId: "u" },
      deps,
    );
    expect(out.assistant.type).toBe("spending_breakdown");
  });

  it("rejects a real-looking widget JSON whose schema fails and derives deterministically", async () => {
    const deps = baseDeps();
    deps.engine.setResponses([
      JSON.stringify({ select: "spending" }),
      JSON.stringify({ type: "budget_progress", category: "Food" }),
    ]);
    const out = await runChat(
      { text: "How much on food this month?", now: Date.now(), userId: "u" },
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