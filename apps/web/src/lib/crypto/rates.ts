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

// cavetail: cache is keyed by vs-currency — the dashboard values holdings in
// the user's fiat while the crypto tab shows USD; one global cache would
// poison one surface with the other's currency.
const cache = new Map<string, CacheEntry>();
const inflight = new Map<string, Promise<Map<string, CoinPrice>>>();

export async function fetchPrices(
  coingeckoIds: string[],
  vsCurrency = "usd",
): Promise<Map<string, CoinPrice>> {
  if (coingeckoIds.length === 0) return new Map();
  const key = vsCurrency.toLowerCase();

  const hit = cache.get(key);
  if (hit && Date.now() - hit.fetchedAt < CACHE_TTL_MS) {
    const hits = coingeckoIds.every((id) => hit.data.has(id));
    if (hits) {
      return new Map<string, CoinPrice>(
        coingeckoIds.map((id) => [id, hit.data.get(id)!] as const).filter((e) => e[1]),
      );
    }
  }

  const running = inflight.get(key);
  if (running) return running;

  const p = fetchBatch(coingeckoIds, vsCurrency)
    .then((result) => {
      cache.set(key, { data: result, fetchedAt: Date.now() });
      return result;
    })
    .finally(() => {
      inflight.delete(key);
    });
  inflight.set(key, p);
  return p;
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
  cache.clear();
}

export function getCachedPrice(
  coingeckoId: string,
): CoinPrice | undefined {
  return cache.get("usd")?.data.get(coingeckoId);
}
