"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTokens } from "@/lib/hooks/useTokens";
import { queryKeys } from "@/lib/hooks/queryKeys";
import { fetchCryptoPrices, calculatePortfolioValue } from "@/lib/utils/crypto";
import type { Token } from "@/lib/types";

const PRICE_REFETCH_INTERVAL = 5 * 60 * 1000; // 5 minutes

export interface TokensContextType {
  tokens: Token[];
  prices: Record<string, number>;
  portfolioValue: number;
  isLoadingTokens: boolean;
  isLoadingPrices: boolean;
}

const TokensContext = createContext<TokensContextType | undefined>(undefined);

export function TokensProvider({ children }: Readonly<{ children: ReactNode }>) {
  const { data: tokens = [], isLoading: isLoadingTokens } = useTokens();

  const coinIds = useMemo(() => tokens.map((t) => t.coingecko_id).filter(Boolean), [tokens]);

  const { data: prices = {}, isLoading: isLoadingPrices } = useQuery<Record<string, number>>({
    queryKey: queryKeys.crypto.prices(),
    queryFn: () => fetchCryptoPrices(coinIds),
    enabled: coinIds.length > 0,
    refetchInterval: PRICE_REFETCH_INTERVAL,
  });

  const portfolioValue = useMemo(() => calculatePortfolioValue(tokens, prices), [tokens, prices]);

  const value = useMemo<TokensContextType>(
    () => ({
      tokens,
      prices,
      portfolioValue,
      isLoadingTokens,
      isLoadingPrices,
    }),
    [tokens, prices, portfolioValue, isLoadingTokens, isLoadingPrices],
  );

  return <TokensContext.Provider value={value}>{children}</TokensContext.Provider>;
}

export function useTokensContext(): TokensContextType {
  const context = useContext(TokensContext);
  if (context === undefined) {
    throw new Error("useTokensContext must be used within a TokensProvider");
  }
  return context;
}
