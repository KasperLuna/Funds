import type { Token } from "@/lib/types";

const COINGECKO_API_BASE = "https://api.coingecko.com/api/v3/simple/price";
const RATE_LIMIT_RETRY_DELAY_MS = 60_000;
const MAX_RETRIES = 2;

/** Exposed for testing — override to control retry delay in tests. */
export const _config = {
  retryDelayMs: RATE_LIMIT_RETRY_DELAY_MS,
};

/**
 * Fetch current USD prices for a list of CoinGecko token IDs.
 * Handles 429 rate-limit responses by waiting and retrying.
 * Returns a map of coingecko_id → price in USD.
 */
export async function fetchCryptoPrices(ids: string[]): Promise<Record<string, number>> {
  if (ids.length === 0) return {};

  const url = `${COINGECKO_API_BASE}?ids=${ids.join(",")}&vs_currencies=usd`;

  let lastError: unknown;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await fetchOnce(url);
      return parsePriceResponse(response, ids);
    } catch (error) {
      lastError = error;
      if (error instanceof RateLimitError && attempt < MAX_RETRIES) {
        await delay(_config.retryDelayMs);
        continue;
      }
      if (attempt === MAX_RETRIES || error instanceof RateLimitError) break;
    }
  }

  throw lastError instanceof Error ? lastError : new Error("Failed to fetch crypto prices");
}

async function fetchOnce(url: string): Promise<Response> {
  const response = await fetch(url);

  if (response.status === 429) {
    throw new RateLimitError();
  }

  if (!response.ok) {
    throw new Error(`CoinGecko API error: ${response.status} ${response.statusText}`);
  }

  return response;
}

class RateLimitError extends Error {
  constructor() {
    super("CoinGecko rate limit exceeded. Please try again later.");
  }
}

async function parsePriceResponse(
  response: Response,
  ids: string[],
): Promise<Record<string, number>> {
  const data: Record<string, { usd?: number }> = await response.json();
  const prices: Record<string, number> = {};
  for (const id of ids) {
    const usdPrice = data[id]?.usd;
    if (usdPrice !== undefined) {
      prices[id] = usdPrice;
    }
  }
  return prices;
}

/**
 * Calculate total portfolio value: sum of (token.total × price) for each token.
 */
export function calculatePortfolioValue(tokens: Token[], prices: Record<string, number>): number {
  return tokens.reduce((sum, token) => {
    const price = prices[token.coingecko_id] ?? 0;
    return sum + token.total * price;
  }, 0);
}

/**
 * Calculate percentage change between current price and cost average.
 * Returns 0 when costAvg is 0 to avoid division by zero.
 */
export function calculatePercentageChange(currentPrice: number, costAvg: number): number {
  if (costAvg === 0) return 0;
  return ((currentPrice - costAvg) / costAvg) * 100;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
