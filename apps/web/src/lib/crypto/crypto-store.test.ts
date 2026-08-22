import { describe, it, expect } from "vitest";
import {
  computeHoldings,
  portfolioAllocation,
  type Token,
  type TokenTransaction,
} from "./crypto-store.js";

function token(overrides: Partial<Token> = {}): Token {
  return {
    id: "tok-1",
    symbol: "BTC",
    name: "Bitcoin",
    decimals: 8,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    ...overrides,
  };
}

function txn(overrides: Partial<TokenTransaction> = {}): TokenTransaction {
  return {
    id: "tt-1",
    tokenId: "tok-1",
    amountMinor: 100000000n, // 1 BTC in sats
    priceAtExecutionMinor: 5000000n, // $50,000.00
    feeMinor: 1000n,
    side: "buy",
    timestamp: Date.now(),
    ...overrides,
  };
}

describe("computeHoldings", () => {
  it("returns empty for no tokens", () => {
    expect(computeHoldings([], [])).toEqual([]);
  });

  it("computes single buy holding", () => {
    const holdings = computeHoldings([token()], [txn()]);
    expect(holdings).toHaveLength(1);
    expect(holdings[0]!.qtyMinor).toBe(100000000n);
    expect(holdings[0]!.totalCostMinor).toBe(
      100000000n * 5000000n + 1000n,
    );
  });

  it("handles buy then sell", () => {
    const buy = txn({ side: "buy", amountMinor: 200000000n });
    const sell = txn({ id: "tt-2", side: "sell", amountMinor: 100000000n });
    const holdings = computeHoldings([token()], [buy, sell]);
    expect(holdings).toHaveLength(1);
    expect(holdings[0]!.qtyMinor).toBe(100000000n);
  });

  it("ignores deleted transactions", () => {
    const t = txn({ deletedAt: Date.now() });
    const holdings = computeHoldings([token()], [t]);
    expect(holdings).toHaveLength(0);
  });

  it("ignores deleted tokens", () => {
    const tok = token({ deletedAt: Date.now() });
    const holdings = computeHoldings([tok], [txn()]);
    expect(holdings).toHaveLength(0);
  });

  it("filters out zero-qty holdings", () => {
    const buy = txn({ side: "buy", amountMinor: 100000000n });
    const sell = txn({ id: "tt-2", side: "sell", amountMinor: 100000000n });
    const holdings = computeHoldings([token()], [buy, sell]);
    expect(holdings).toHaveLength(0);
  });
});

describe("portfolioAllocation", () => {
  it("returns empty for empty holdings", () => {
    expect(portfolioAllocation([])).toEqual([]);
  });

  it("computes percentage allocation", () => {
    const holdings = [
      {
        token: token({ symbol: "BTC" }),
        qtyMinor: 200000000n,
        avgCostMinor: 0n,
        totalCostMinor: 0n,
      },
      {
        token: token({ id: "tok-2", symbol: "ETH" }),
        qtyMinor: 100000000n,
        avgCostMinor: 0n,
        totalCostMinor: 0n,
      },
    ];
    const alloc = portfolioAllocation(holdings);
    expect(alloc).toHaveLength(2);
    expect(alloc[0]!.symbol).toBe("BTC");
    expect(alloc[0]!.pct).toBeCloseTo(66.67, 0);
    expect(alloc[1]!.symbol).toBe("ETH");
    expect(alloc[1]!.pct).toBeCloseTo(33.33, 0);
  });

  it("sorts by allocation descending", () => {
    const holdings = [
      {
        token: token({ symbol: "ETH" }),
        qtyMinor: 100n,
        avgCostMinor: 0n,
        totalCostMinor: 0n,
      },
      {
        token: token({ id: "tok-2", symbol: "BTC" }),
        qtyMinor: 900n,
        avgCostMinor: 0n,
        totalCostMinor: 0n,
      },
    ];
    const alloc = portfolioAllocation(holdings);
    expect(alloc[0]!.symbol).toBe("BTC");
  });
});
