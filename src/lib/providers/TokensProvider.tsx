import { useQuery } from "@tanstack/react-query";
import { useBanksCategsContext } from "../hooks/useBanksCategsContext";
import { CoinGeckoMarketData } from "../types/coingecko";
import { useMemo } from "react";
import { TokensContext } from "../context/TokensContext";
import { useTokensQuery } from "../hooks/useTokensQuery";

export function TokensProvider({ children }: { children: React.ReactNode }) {
  const tokenData = useTokensQuery();
  const { baseCurrency } = useBanksCategsContext();
  const coins = useMemo(() => tokenData?.tokens || [], [tokenData?.tokens]);
  const CURRENCY = baseCurrency?.code || "USD";
  const uniqueIds = useMemo(
    () => Array.from(new Set(coins.map((c) => c.coingecko_id))),
    [coins]
  );
  const coinsParam = uniqueIds.join(",");

  const {
    data: marketData = [],
    isLoading: marketLoading,
    isError,
    error: marketError,
  } = useQuery<CoinGeckoMarketData[], Error>({
    queryKey: ["coingecko-market", coinsParam, CURRENCY],
    queryFn: async () => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 20000);
      try {
        const res = await fetch(
          `https://api.coingecko.com/api/v3/coins/markets?vs_currency=${CURRENCY.toLowerCase()}&ids=${coinsParam}&order=market_cap_desc&per_page=${uniqueIds.length}&page=1&sparkline=false&price_change_percentage=24h`,
          { signal: controller.signal }
        );
        if (!res.ok) {
          let msg = "Failed to fetch market data";
          try {
            const err = await res.json();
            if (err?.error_code === 429 || err?.status?.error_code === 429) {
              msg =
                "CoinGecko API rate limit exceeded. Please try again in a few minutes.";
            }
          } catch {}
          throw new Error(msg);
        }
        return (await res.json()) as CoinGeckoMarketData[];
      } finally {
        clearTimeout(timeout);
      }
    },
    staleTime: 1000 * 60 * 60 * 24,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: (failureCount: number, error: Error) => {
      if (error?.message?.includes("rate limit")) return false;
      return failureCount < 2;
    },
    enabled: !!baseCurrency?.symbol && coins.length > 0,
  });

  const memoizedData = useMemo(
    () => ({
      tokenData,
      marketData,
      marketLoading,
      marketError: isError ? marketError : null,
    }),
    [tokenData, marketData, marketLoading, isError, marketError]
  );

  return (
    <TokensContext.Provider value={memoizedData}>
      {children}
    </TokensContext.Provider>
  );
}
