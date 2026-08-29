import { describe, expect, it } from "vitest";
import { deriveTldr } from "./prompts";
import type { AssistantMessage } from "./types";

/**
 * The TL;DR is now derived deterministically from the validated payload —
 * no second LLM call. These tests pin the headline format so a regression
 * can't quietly change the UX (e.g. regressing to "₱12540" because a
 * widget was added without scaling the minor → major conversion).
 */
describe("deriveTldr", () => {
  it("returns a single-category headline for spending_breakdown with one slice", () => {
    const m = {
      id: "1",
      role: "assistant",
      type: "spending_breakdown",
      ts: 0,
      usedCase: "spending_query",
      periodLabel: "This month",
      assetCode: "PHP",
      decimals: 2,
      totalMinor: "12540",
      slices: [{ category: "Food", amountMinor: "12540", pct: 100 }],
    } as unknown as AssistantMessage;
    expect(deriveTldr(m)).toBe("Spent ₱125.40 on Food.");
  });

  it("returns a multi-category headline", () => {
    const m = {
      id: "1",
      role: "assistant",
      type: "spending_breakdown",
      ts: 0,
      usedCase: "spending_query",
      periodLabel: "This month",
      assetCode: "PHP",
      decimals: 2,
      totalMinor: "30000",
      slices: [
        { category: "Food", amountMinor: "12540", pct: 42 },
        { category: "Transport", amountMinor: "17460", pct: 58 },
      ],
    } as unknown as AssistantMessage;
    expect(deriveTldr(m)).toBe("Spent ₱300.00 across 2 categories.");
  });

  it("omits the leading $ for USD but keeps ₱ for PHP", () => {
    const usd = {
      id: "1",
      role: "assistant",
      type: "spending_breakdown",
      ts: 0,
      usedCase: "spending_query",
      periodLabel: "This month",
      assetCode: "USD",
      decimals: 2,
      totalMinor: "10000",
      slices: [{ category: "Food", amountMinor: "10000", pct: 100 }],
    } as unknown as AssistantMessage;
    expect(deriveTldr(usd)).toBe("Spent 100.00 on Food.");

    const php = {
      ...usd,
      assetCode: "PHP",
    } as unknown as AssistantMessage;
    expect(deriveTldr(php)).toBe("Spent ₱100.00 on Food.");
  });

  it("returns a delta headline for period_compare", () => {
    const m = {
      id: "1",
      role: "assistant",
      type: "period_compare",
      ts: 0,
      usedCase: "compare_query",
      category: null,
      currentLabel: "This month",
      priorLabel: "Last month",
      assetCode: "PHP",
      decimals: 2,
      currentMinor: "15000",
      priorMinor: "10000",
      deltaPct: 50,
    } as unknown as AssistantMessage;
    expect(deriveTldr(m)).toBe("Up 50% vs Last month.");
  });

  it("returns a 'flat' headline when deltaPct is null", () => {
    const m = {
      id: "1",
      role: "assistant",
      type: "period_compare",
      ts: 0,
      usedCase: "compare_query",
      category: null,
      currentLabel: "This month",
      priorLabel: "Last month",
      assetCode: "PHP",
      decimals: 2,
      currentMinor: "0",
      priorMinor: "0",
      deltaPct: null,
    } as unknown as AssistantMessage;
    expect(deriveTldr(m)).toBe("No comparable spend in Last month.");
  });

  it("returns an over-budget headline for budget_progress", () => {
    const m = {
      id: "1",
      role: "assistant",
      type: "budget_progress",
      ts: 0,
      usedCase: "budget_check",
      category: "Food",
      spentMinor: "50000",
      limitMinor: "4000",
      periodLabel: "This month",
      pctUsed: 125,
      status: "over",
      assetCode: "PHP",
      decimals: 2,
    } as unknown as AssistantMessage;
    expect(deriveTldr(m)).toBe("Over budget on Food (125%).");
  });

  it("returns a search headline", () => {
    const m = {
      id: "1",
      role: "assistant",
      type: "search_results",
      ts: 0,
      usedCase: "search_query",
      periodLabel: "This month",
      query: "payroll",
      category: null,
      assetCode: "PHP",
      decimals: 2,
      count: 1,
      totalMinor: "50000",
      hits: [],
    } as unknown as AssistantMessage;
    expect(deriveTldr(m)).toBe(`1 match for "payroll".`);
  });

  it("returns a burn rate headline", () => {
    const m = {
      id: "1",
      role: "assistant",
      type: "burn_rate",
      ts: 0,
      usedCase: "burn_query",
      periodLabel: "This month",
      assetCode: "PHP",
      decimals: 2,
      currentMinor: "30000",
      priorMonthMinor: "20000",
      dailyAverageMinor: "1500",
      daysElapsed: 20,
      daysInPeriod: 31,
      projectedMinor: "46500",
      vsPriorPct: 50,
    } as unknown as AssistantMessage;
    expect(deriveTldr(m)).toBe("On pace to spend 50% more than last month.");
  });

  it("returns null for text and error messages", () => {
    const text = {
      id: "1",
      role: "assistant",
      type: "text",
      content: "hi",
      ts: 0,
      usedCase: "fallback_text",
    } as unknown as AssistantMessage;
    const err = {
      id: "2",
      role: "assistant",
      type: "error",
      reason: "boom",
      ts: 0,
      usedCase: "fallback_text",
    } as unknown as AssistantMessage;
    expect(deriveTldr(text)).toBeNull();
    expect(deriveTldr(err)).toBeNull();
  });
});

describe("buildUserPrompt — Resolved header", () => {
  it("prepends 'Resolved: category=…' when the resolver matched a category", async () => {
    const { buildUserPrompt } = await import("./prompts");
    const out = buildUserPrompt({
      userText: "how much on dining",
      snapshot: {
        tz: "UTC",
        nowIso: "2026-01-01T00:00:00Z",
        accounts: [],
        categories: [{ id: "c1", name: "Food" }],
        resolved: {
          category: "Food",
          categorySource: "alias",
          descriptionSource: "none",
          matched: ['category≈"Food"'],
        },
      },
    });
    expect(out.startsWith("Resolved: category=Food")).toBe(true);
  });

  it("prepends 'Resolved: q=…' when the resolver matched a description pattern", async () => {
    const { buildUserPrompt } = await import("./prompts");
    const out = buildUserPrompt({
      userText: "what was my payroll",
      snapshot: {
        tz: "UTC",
        nowIso: "2026-01-01T00:00:00Z",
        accounts: [],
        categories: [],
        resolved: {
          descriptionPattern: "payroll",
          categorySource: "none",
          descriptionSource: "keyword",
          matched: ['description≈"payroll"'],
        },
      },
    });
    expect(out.startsWith("Resolved: q=payroll")).toBe(true);
  });

  it("omits the Resolved line when the resolver found nothing", async () => {
    const { buildUserPrompt } = await import("./prompts");
    const out = buildUserPrompt({
      userText: "hello",
      snapshot: {
        tz: "UTC",
        nowIso: "2026-01-01T00:00:00Z",
        accounts: [],
        categories: [],
        resolved: {
          categorySource: "none",
          descriptionSource: "none",
          matched: [],
        },
      },
    });
    expect(out.startsWith("Resolved:")).toBe(false);
  });
});
