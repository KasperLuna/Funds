import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  fetchCryptoPrices,
  calculatePortfolioValue,
  calculatePercentageChange,
  _config,
} from "./crypto";
import type { Token } from "@/lib/types";

// --- Helper to build a minimal Token ---
function makeToken(overrides: Partial<Token> = {}): Token {
  return {
    id: "t1",
    user: "u1",
    name: "Bitcoin",
    symbol: "BTC",
    coingecko_id: "bitcoin",
    total: 1,
    costAvg: 30000,
    ...overrides,
  };
}

// ============================================================
// fetchCryptoPrices
// ============================================================
describe("fetchCryptoPrices", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("returns empty object for empty ids array", async () => {
    const result = await fetchCryptoPrices([]);
    expect(result).toEqual({});
  });

  it("fetches prices and returns id → price map", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            bitcoin: { usd: 65000 },
            ethereum: { usd: 3500 },
          }),
      }),
    );

    const result = await fetchCryptoPrices(["bitcoin", "ethereum"]);
    expect(result).toEqual({ bitcoin: 65000, ethereum: 3500 });
    expect(fetch).toHaveBeenCalledWith(expect.stringContaining("ids=bitcoin,ethereum"));
  });

  it("omits tokens not present in the API response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ bitcoin: { usd: 65000 } }),
      }),
    );

    const result = await fetchCryptoPrices(["bitcoin", "unknown-token"]);
    expect(result).toEqual({ bitcoin: 65000 });
  });

  it("throws on non-ok, non-429 response after retries", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
      }),
    );

    await expect(fetchCryptoPrices(["bitcoin"])).rejects.toThrow("CoinGecko API error: 500");
  });

  it("throws rate limit error after max retries on 429", async () => {
    const originalDelay = _config.retryDelayMs;
    _config.retryDelayMs = 0;

    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 429,
      statusText: "Too Many Requests",
    });
    vi.stubGlobal("fetch", mockFetch);

    await expect(fetchCryptoPrices(["bitcoin"])).rejects.toThrow("rate limit exceeded");
    // Should have attempted 3 times total (initial + 2 retries)
    expect(mockFetch).toHaveBeenCalledTimes(3);

    _config.retryDelayMs = originalDelay;
  });

  it("throws on network error after retries", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("Network failure")));

    await expect(fetchCryptoPrices(["bitcoin"])).rejects.toThrow("Network failure");
  });
});

// ============================================================
// calculatePortfolioValue
// ============================================================
describe("calculatePortfolioValue", () => {
  it("calculates total value as sum of (total × price)", () => {
    const tokens = [
      makeToken({ coingecko_id: "bitcoin", total: 2 }),
      makeToken({ coingecko_id: "ethereum", total: 10 }),
    ];
    const prices = { bitcoin: 65000, ethereum: 3500 };

    expect(calculatePortfolioValue(tokens, prices)).toBe(2 * 65000 + 10 * 3500);
  });

  it("returns 0 for empty tokens array", () => {
    expect(calculatePortfolioValue([], { bitcoin: 65000 })).toBe(0);
  });

  it("treats missing prices as 0", () => {
    const tokens = [makeToken({ coingecko_id: "bitcoin", total: 2 })];
    expect(calculatePortfolioValue(tokens, {})).toBe(0);
  });

  it("handles tokens with 0 quantity", () => {
    const tokens = [makeToken({ coingecko_id: "bitcoin", total: 0 })];
    expect(calculatePortfolioValue(tokens, { bitcoin: 65000 })).toBe(0);
  });
});

// ============================================================
// calculatePercentageChange
// ============================================================
describe("calculatePercentageChange", () => {
  it("calculates positive percentage change", () => {
    // (65000 - 30000) / 30000 * 100 = 116.67%
    const result = calculatePercentageChange(65000, 30000);
    expect(result).toBeCloseTo(116.6667, 2);
  });

  it("calculates negative percentage change", () => {
    // (20000 - 30000) / 30000 * 100 = -33.33%
    const result = calculatePercentageChange(20000, 30000);
    expect(result).toBeCloseTo(-33.3333, 2);
  });

  it("returns 0 when costAvg is 0 (avoids division by zero)", () => {
    expect(calculatePercentageChange(65000, 0)).toBe(0);
  });

  it("returns 0 when price equals costAvg", () => {
    expect(calculatePercentageChange(30000, 30000)).toBe(0);
  });

  it("returns -100 when price drops to 0", () => {
    expect(calculatePercentageChange(0, 30000)).toBe(-100);
  });
});
