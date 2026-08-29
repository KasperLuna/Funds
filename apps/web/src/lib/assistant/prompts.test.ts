import { describe, expect, it } from "vitest";
import { payloadSummary, TLDR_SYSTEM } from "./prompts";
import type { AssistantMessage } from "./types";

/**
 * The TL;DR model must see money in MAJOR UNITS — the codebase's wire format
 * is `*Minor` strings (no floats, no BigInts in the LLM context). A 1B model
 * asked to read "12540" with a hidden `decimals: 2` will reliably emit
 * "₱12540" as a headline. These tests pin the conversion so a regression
 * can't quietly turn the assistant into a thousand-times-amplifier.
 */
describe("payloadSummary — money is in major units", () => {
  it("converts spending_breakdown totalMinor to a major number", () => {
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
    const json = JSON.parse(payloadSummary(m));
    expect(json.total).toBe(125.4);
    expect(json.slices[0].amount).toBe(125.4);
    expect(json.asset).toBe("PHP");
    expect(json.decimals).toBe(2);
  });

  it("converts summary_dashboard income/expense/net", () => {
    const m = {
      id: "1",
      role: "assistant",
      type: "summary_dashboard",
      ts: 0,
      usedCase: "weekly_summary",
      periodLabel: "This week",
      assetCode: "USD",
      decimals: 2,
      incomeMinor: "10000",
      expenseMinor: "4000",
      netMinor: "6000",
      savingsRatePct: 60,
      topCategories: [],
      budgets: [],
    } as unknown as AssistantMessage;
    const json = JSON.parse(payloadSummary(m));
    expect(json.income).toBe(100);
    expect(json.expense).toBe(40);
    expect(json.net).toBe(60);
    expect(json.savingsRatePct).toBe(60);
    expect(json.asset).toBe("USD");
  });

  it("converts budget_progress spent and limit", () => {
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
    const json = JSON.parse(payloadSummary(m));
    expect(json.spent).toBe(500);
    expect(json.limit).toBe(40);
    expect(json.pctUsed).toBe(125);
  });

  it("converts period_compare current and prior", () => {
    const m = {
      id: "1",
      role: "assistant",
      type: "period_compare",
      ts: 0,
      usedCase: "compare_query",
      category: "Food",
      currentLabel: "This month",
      priorLabel: "Last month",
      assetCode: "PHP",
      decimals: 2,
      currentMinor: "2000",
      priorMinor: "1000",
      deltaPct: 100,
    } as unknown as AssistantMessage;
    const json = JSON.parse(payloadSummary(m));
    expect(json.current).toBe(20);
    expect(json.prior).toBe(10);
    expect(json.deltaPct).toBe(100);
  });

  it("converts burn_rate current/projected/dailyAverage", () => {
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
    const json = JSON.parse(payloadSummary(m));
    expect(json.current).toBe(300);
    expect(json.projected).toBe(465);
    expect(json.dailyAverage).toBe(15);
  });

  it("converts merchant_breakdown and recurring_list per-item amounts", () => {
    const merch = {
      id: "1",
      role: "assistant",
      type: "merchant_breakdown",
      ts: 0,
      usedCase: "merchants_query",
      periodLabel: "This month",
      category: "Food",
      assetCode: "PHP",
      decimals: 2,
      totalMinor: "5000",
      merchants: [{ description: "Jollibee", amountMinor: "5000", count: 2 }],
    } as unknown as AssistantMessage;
    const merchJson = JSON.parse(payloadSummary(merch));
    expect(merchJson.total).toBe(50);
    expect(merchJson.merchants[0].amount).toBe(50);

    const recur = {
      id: "2",
      role: "assistant",
      type: "recurring_list",
      ts: 0,
      usedCase: "recurring_query",
      periodLabel: "Last 90 days",
      assetCode: "PHP",
      decimals: 2,
      totalMonthlyMinor: "54900",
      items: [
        {
          description: "Netflix",
          avgMinor: "54900",
          occurrences: 3,
          lastDateLabel: "Aug 15",
          cadence: "monthly",
          monthlyCostMinor: "54900",
        },
      ],
    } as unknown as AssistantMessage;
    const recurJson = JSON.parse(payloadSummary(recur));
    expect(recurJson.totalMonthly).toBe(549);
    expect(recurJson.items[0].monthlyCost).toBe(549);
  });

  it("respects the asset's decimals (BTC has 8, JPY has 0)", () => {
    const btc = {
      id: "1",
      role: "assistant",
      type: "spending_breakdown",
      ts: 0,
      usedCase: "spending_query",
      periodLabel: "This month",
      assetCode: "BTC",
      decimals: 8,
      totalMinor: "100000000",
      slices: [{ category: "Fees", amountMinor: "100000000", pct: 100 }],
    } as unknown as AssistantMessage;
    const json = JSON.parse(payloadSummary(btc));
    expect(json.total).toBe(1);
    expect(json.asset).toBe("BTC");
    expect(json.decimals).toBe(8);
  });
});

describe("TLDR_SYSTEM", () => {
  it("instructs the model that money is already in major units", () => {
    expect(TLDR_SYSTEM).toMatch(/already in major units/i);
    expect(TLDR_SYSTEM).toMatch(/do NOT divide/i);
  });
});
