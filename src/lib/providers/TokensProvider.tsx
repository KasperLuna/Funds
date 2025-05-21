import { useMemo } from "react";
import { TokensContext } from "../context/TokensContext";
import { useTokensQuery } from "../hooks/useTokensQuery";

export function TokensProvider({ children }: { children: React.ReactNode }) {
  const tokenData = useTokensQuery();

  const memoizedData = useMemo(
    () => ({
      tokenData,
    }),
    [tokenData]
  );

  return (
    <TokensContext.Provider value={memoizedData}>
      {children}
    </TokensContext.Provider>
  );
}
