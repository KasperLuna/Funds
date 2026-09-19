import { describe, it, expect } from "vitest";
import type { Holding, Token } from "./crypto-store.js";
import type { CoinPrice } from "./rates.js";
import {
  coingeckoKeyForHoldings,
  computeHoldingCostMinor,
  computeHoldingUnitCostMinor,
  computeHoldingValueMinor,
  computeTokenCostMinor,
  computeTokenValueMinor,
  cryptoPriceQueryKey,
} from "./valuation.js";

function token(overrides: Partial<Token> = {}): Token {
  return {
    id: "tok-1",
    symbol: "BTC",
    name: "Bitcoin",
    decimals: 8,
    coingeckoId: "bitcoin",
    createdAt: 0,
    updatedAt: 0,
    ...overrides,
  };
}

function holding(overrides: Partial<Holding> = {}): Holding {
  return {
    token: token(),
    qtyMinor: 100000000n,
    avgCostMinor: 0n,
    totalCostMinor: 0n,
    ...overrides,
  };
}

function prices(entries: Record<string, number>): Map<string, CoinPrice> {
  return new Map(
    Object.entries(entries).map(([id, current_price]) => [
      id,
      { id, current_price } as CoinPrice,
    ]),
  );
}

describe("coingeckoKeyForHoldings", () => {
  it("sorts, dedupes, and skips missing ids", () => {
    const holdings = [
      holding({ token: token({ id: "a", coingeckoId: "solana" }) }),
      holding({ token: token({ id: "b", coingeckoId: "bitcoin" }) }),
      holding({ token: token({ id: "c", coingeckoId: "bitcoin" }) }),
      holding({ token: token({ id: "d", coingeckoId: null }) }),
    ];
    expect(coingeckoKeyForHoldings(holdings)).toBe("bitcoin,solana");
  });

  it("is empty with no priced holdings", () => {
    expect(coingeckoKeyForHoldings([])).toBe("");
  });
});

describe("cryptoPriceQueryKey", () => {
  it("matches the shared TanStack slot shape", () => {
    expect(cryptoPriceQueryKey("bitcoin", "PHP")).toEqual([
      "prices",
      "bitcoin",
      "PHP",
    ]);
  });
});

describe("computeHoldingValueMinor", () => {
  it("values qty × rate in fiat minor", () => {
    const h = holding({
      token: token({ decimals: 2 }),
      qtyMinor: 150n,
    });
    expect(computeHoldingValueMinor(h, prices({ bitcoin: 10 }), 2)).toBe(1500n);
  });

  it("contributes 0 with no price", () => {
    expect(computeHoldingValueMinor(holding(), new Map(), 2)).toBe(0n);
  });

  it("contributes 0 with no coingecko id", () => {
    const h = holding({ token: token({ coingeckoId: null }) });
    expect(computeHoldingValueMinor(h, prices({ bitcoin: 60000 }), 2)).toBe(0n);
  });
});

describe("computeTokenValueMinor", () => {
  it("sums holdings like the dashboard hero", () => {
    const holdings = [
      holding({ token: token({ id: "a", decimals: 2 }), qtyMinor: 150n }),
      holding({
        token: token({ id: "b", coingeckoId: "solana", decimals: 2 }),
        qtyMinor: 200n,
      }),
    ];
    const p = prices({ bitcoin: 10, solana: 5 });
    expect(computeTokenValueMinor(holdings, p, 2)).toBe(2500n);
  });
});

describe("computeHoldingCostMinor", () => {
  it("rescales qty_base × rate_base exactly", () => {
    const h = holding({
      token: token({ decimals: 2 }),
      totalCostMinor: 150000n,
    });
    expect(computeHoldingCostMinor(h, 2)).toBe(1500n);
  });

  it("matches the legacy float cost basis at 8dp tokens", () => {
    const h = holding({
      qtyMinor: 100000000n,
      totalCostMinor: 100000000n * 5000000n + 1000n,
    });
    const raw = h.totalCostMinor;
    const legacy = Number(raw) / 10 ** 16;
    expect(Number(computeHoldingCostMinor(h, 2)) / 100).toBeCloseTo(
      legacy,
      2,
    );
  });

  it("sums token cost", () => {
    const holdings = [
      holding({ totalCostMinor: 150000n, token: token({ decimals: 2 }) }),
      holding({
        totalCostMinor: 50000n,
        token: token({ id: "b", decimals: 2 }),
      }),
    ];
    expect(computeTokenCostMinor(holdings, 2)).toBe(2000n);
  });
});

describe("computeHoldingUnitCostMinor", () => {
  it("converts the per-unit rate to fiat minor", () => {
    const h = holding({
      token: token({ decimals: 2 }),
      avgCostMinor: 1050n,
    });
    expect(computeHoldingUnitCostMinor(h, 2)).toBe(1050n);
  });
});
