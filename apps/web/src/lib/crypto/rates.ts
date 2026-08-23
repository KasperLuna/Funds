const BASE_URL = "https://api.coingecko.com/api/v3";
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const TIMEOUT_MS = 20_000;

export type CoinPrice = {
  id: string;
  symbol: string;
  name: string;
  current_price: number;
  price_change_percentage_24h: number;
  market_cap: number;
  image: string;
};

type CacheEntry = {
  data: Map<string, CoinPrice>;
  fetchedAt: number;
};

let cache: CacheEntry | null = null;
let inflight: Promise<Map<string, CoinPrice>> | null = null;

export async function fetchPrices(
  coingeckoIds: string[],
  vsCurrency = "usd",
): Promise<Map<string, CoinPrice>> {
  if (coingeckoIds.length === 0) return new Map();

  if (cache && Date.now() - cache.fetchedAt < CACHE_TTL_MS) {
    const hits = coingeckoIds.every((id) => cache!.data.has(id));
    if (hits) {
      return new Map<string, CoinPrice>(
        coingeckoIds.map((id) => [id, cache!.data.get(id)!] as const).filter((e) => e[1]),
      );
    }
  }

  if (inflight) return inflight;

  inflight = fetchBatch(coingeckoIds, vsCurrency)
    .then((result) => {
      cache = { data: result, fetchedAt: Date.now() };
      return result;
    })
    .finally(() => {
      inflight = null;
    });

  return inflight;
}

async function fetchBatch(
  ids: string[],
  vsCurrency: string,
): Promise<Map<string, CoinPrice>> {
  const params = new URLSearchParams({
    ids: ids.join(","),
    vs_currency: vsCurrency,
    order: "market_cap_desc",
    per_page: String(ids.length),
    page: "1",
    sparkline: "false",
  });

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(`${BASE_URL}/coins/markets?${params}`, {
      signal: controller.signal,
    });

    if (res.status === 429) {
      return new Map();
    }

    if (!res.ok) {
      throw new Error(`CoinGecko ${res.status}`);
    }

    const json: CoinPrice[] = await res.json();
    const map = new Map<string, CoinPrice>();
    for (const coin of json) {
      map.set(coin.id, coin);
    }
    return map;
  } catch (err) {
    if ((err as Error).name === "AbortError") {
      return new Map();
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

export function invalidateRatesCache(): void {
  cache = null;
}

export function getCachedPrice(
  coingeckoId: string,
): CoinPrice | undefined {
  return cache?.data.get(coingeckoId);
}
