import { createContext } from "react";
import { Token } from "../types";

export type TokensContextType = {
  tokenData?: {
    tokens: Token[];
    loading: boolean;
    refetch: () => Promise<unknown>;
  };
};

export const TokensContext = createContext<TokensContextType>({
  tokenData: undefined,
});
