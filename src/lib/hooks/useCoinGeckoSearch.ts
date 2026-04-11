import { useQuery } from "@tanstack/react-query";

export interface CoinGeckoSearchCoin {
  id: string;
  name: string;
  api_symbol: string;
  symbol: string;
  market_cap_rank: number | null;
  thumb: string;
  large: string;
}

interface CoinGeckoSearchResponse {
  coins: CoinGeckoSearchCoin[];
}

export const useCoinGeckoSearch = (query: string) => {
  return useQuery<CoinGeckoSearchCoin[]>({
    queryKey: ["coingecko-search", query],
    queryFn: async () => {
      if (!query || query.length < 2) return [];
      const res = await fetch(
        `https://api.coingecko.com/api/v3/search?query=${encodeURIComponent(query)}`
      );
      if (!res.ok) throw new Error("Failed to search CoinGecko");
      const data: CoinGeckoSearchResponse = await res.json();
      return data.coins.slice(0, 20);
    },
    enabled: query.length >= 2,
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: false,
  });
};
