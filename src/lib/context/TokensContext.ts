import { createContext } from "react";
import { Token } from "../types";
import { CoinGeckoMarketData } from "../types/coingecko";

export type TokensContextType = {
  tokenData?: {
    tokens: Token[];
    loading: boolean;
    refetch: () => Promise<unknown>;
  };
  marketData?: CoinGeckoMarketData[];
  marketLoading?: boolean;
  marketError?: Error | null;
};

export const TokensContext = createContext<TokensContextType>({
  tokenData: undefined,
  marketData: undefined,
  marketLoading: false,
  marketError: null,
});
