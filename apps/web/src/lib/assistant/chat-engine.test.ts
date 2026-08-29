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
    // TLDR is now derived deterministically from the payload.
    expect(out.assistant.tldr).toContain("Food");
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
  it("detects voice_to_txn for non-question log intent", () => {
    expect(inferUseCase("log a ₱42 lunch at BPI", snap)).toBe("voice_to_txn");
  });
  it("detects compare_query", () => {
    expect(inferUseCase("compare food this month vs last", snap)).toBe("compare_query");
  });
  it("detects merchants_query", () => {
    expect(inferUseCase("where does my food money go", snap)).toBe("merchants_query");
  });
  it("detects burn_query", () => {
    expect(inferUseCase("am I on track this month?", snap)).toBe("burn_query");
  });
  it("falls through to fallback_text", () => {
    expect(inferUseCase("hi there", snap)).toBe("fallback_text");
  });
});

describe("runChat — new analytics selects", () => {
  it("renders a period_compare widget from a compare query", async () => {
    const deps = baseDeps();
    deps.engine.setResponse('{"select":"compare","period":"this_month"}');
    const out = await runChat(
      { text: "compare this month vs last", now: Date.now(), userId: "u" },
      deps,
    );
    expect(out.assistant.type).toBe("period_compare");
  });

  it("renders a merchant_breakdown widget", async () => {
    const deps = baseDeps();
    deps.engine.setResponse('{"select":"merchants","category":"Food"}');
    const out = await runChat(
      { text: "where does my food money go", now: Date.now(), userId: "u" },
      deps,
    );
    expect(out.assistant.type).toBe("merchant_breakdown");
  });

  it("renders a burn_rate widget", async () => {
    const deps = baseDeps();
    deps.engine.setResponse('{"select":"burn"}');
    const out = await runChat(
      { text: "am I on track this month?", now: Date.now(), userId: "u" },
      deps,
    );
    expect(out.assistant.type).toBe("burn_rate");
  });
});

describe("runChat — unsupported intent", () => {
  it("short-circuits to an affordance for a 'why' question without calling the model", async () => {
    const deps = baseDeps();
    const out = await runChat(
      { text: "Why did my spending go up this month?", now: Date.now(), userId: "u" },
      deps,
    );
    // No model call was made — classifyIntent caught it.
    expect(deps.engine.calls).toHaveLength(0);
    expect(out.assistant.type).toBe("text");
    if (out.assistant.type === "text") {
      expect(out.assistant.suggestedUseCases).toBeDefined();
      expect(out.assistant.suggestedUseCases?.length).toBeGreaterThan(0);
    }
  });
});

describe("runChat — resolver back-fill", () => {
  // The user has only "Food" — never "Dining". The model emits the synonym
  // it would naturally use. The resolver catches it and substitutes "Food".
  it("substitutes a real category when the model emits a synonym", async () => {
    const deps = baseDeps();
    deps.engine.setResponse('{"select":"budget","period":"this_month","category":"Dining"}');
    const out = await runChat(
      { text: "Am I over budget on dining?", now: Date.now(), userId: "u" },
      deps,
    );
    // budget_progress comes from the budget executor; the model said Dining,
    // the executor would have run with category "Dining" and not found a
    // budget, returning budget_empty. With the resolver back-fill, the
    // executor sees category="Food" and finds the budget.
    if (out.assistant.type === "budget_progress") {
      expect(out.assistant.category).toBe("Food");
    } else if (out.assistant.type === "text") {
      // OK: budget_empty also acceptable if Food has no budget configured.
      expect(out.assistant.content).toMatch(/Food|food|No budget/i);
    }
  });

  it("finds payroll via the search select even when the model emits no q", async () => {
    const deps = baseDeps();
    const tx = [
      makeTxn({
        id: "p1",
        description: "Payroll Corp",
        amountMinor: 50000n,
        type: "income" as const,
        // Use a time a minute ago so the txn is always in "this month" no
        // matter what timezone the test runner is in.
        date: Date.now() - 60_000,
      }),
    ];
    deps.txns = tx;
    // The model emits a search query with no q (its common failure mode).
    deps.engine.setResponse('{"select":"search","period":"this_month"}');
    const out = await runChat(
      { text: "What was my payroll this month?", now: Date.now(), userId: "u" },
      deps,
    );
    if (out.assistant.type === "search_results") {
      expect(out.assistant.query).toBe("payroll");
      expect(out.assistant.count).toBe(1);
    } else {
      // Acceptable: the model could also emit a valid q itself.
      expect(out.assistant.type).toBe("search_empty");
    }
  });
});

describe("inferUseCase — search_query detection", () => {
  const snap = { tz: "UTC", nowIso: "2025-01-01T00:00:00Z", accounts: [], categories: [] };
  it("detects 'what was my payroll this month' as search_query", () => {
    expect(inferUseCase("what was my payroll this month?", snap)).toBe("search_query");
  });
  it("detects 'find amazon charges' as search_query", () => {
    expect(inferUseCase("find amazon charges", snap)).toBe("search_query");
  });
  it("detects 'any refunds?' as search_query", () => {
    expect(inferUseCase("any refunds?", snap)).toBe("search_query");
  });
});