import { describe, expect, it } from "vitest";
import { computeHoldings, computeRealizedPL } from "./lots";

describe("computeHoldings", () => {
  it("computes empty holdings", () => {
    expect(computeHoldings([])).toEqual({ total: 0, costAvg: 0 });
  });

  it("computes single buy", () => {
    const result = computeHoldings([{ type: "buy", amount: 1, price: 50000, date: "2026-01-01" }]);
    expect(result.total).toBe(1);
    expect(result.costAvg).toBe(50000);
  });

  it("computes average cost for multiple buys", () => {
    const result = computeHoldings([
      { type: "buy", amount: 1, price: 30000, date: "2026-01-01" },
      { type: "buy", amount: 1, price: 50000, date: "2026-02-01" },
    ]);
    expect(result.total).toBe(2);
    expect(result.costAvg).toBe(40000);
  });

  it("computes sell reducing quantity and cost", () => {
    const result = computeHoldings([
      { type: "buy", amount: 2, price: 40000, date: "2026-01-01" },
      { type: "sell", amount: 1, price: 50000, date: "2026-02-01" },
    ]);
    expect(result.total).toBe(1);
    expect(result.costAvg).toBe(40000);
  });

  it("handles full liquidation", () => {
    const result = computeHoldings([
      { type: "buy", amount: 1, price: 50000, date: "2026-01-01" },
      { type: "sell", amount: 1, price: 60000, date: "2026-02-01" },
    ]);
    expect(result.total).toBe(0);
    expect(result.costAvg).toBe(0);
  });

  it("sorts by date ascending", () => {
    const result = computeHoldings([
      { type: "buy", amount: 1, price: 50000, date: "2026-02-01" },
      { type: "buy", amount: 1, price: 30000, date: "2026-01-01" },
    ]);
    expect(result.total).toBe(2);
    expect(result.costAvg).toBe(40000);
  });
});

describe("computeRealizedPL", () => {
  it("computes profit on sell", () => {
    const holdings = { total: 1, costAvg: 40000 };
    const result = computeRealizedPL(
      { type: "sell", amount: 1, price: 50000, date: "2026-01-01" },
      holdings,
    );
    expect(result.realizedPL).toBe(10000);
    expect(result.updatedHoldings.total).toBe(0);
  });

  it("computes loss on sell", () => {
    const holdings = { total: 1, costAvg: 50000 };
    const result = computeRealizedPL(
      { type: "sell", amount: 1, price: 40000, date: "2026-01-01" },
      holdings,
    );
    expect(result.realizedPL).toBe(-10000);
  });

  it("partial sell preserves cost average", () => {
    const holdings = { total: 2, costAvg: 40000 };
    const result = computeRealizedPL(
      { type: "sell", amount: 1, price: 50000, date: "2026-01-01" },
      holdings,
    );
    expect(result.realizedPL).toBe(10000);
    expect(result.updatedHoldings.total).toBe(1);
    expect(result.updatedHoldings.costAvg).toBe(40000);
  });
});
