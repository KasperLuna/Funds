import { useMemo } from "react";
import { BanksCategsContext } from "../context/BanksCategsContext";
import { useBanksQuery } from "../hooks/useBanksQuery";
import { useCategoriesQuery } from "../hooks/useCategoriesQuery";

export function BanksCategsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const bankData = useBanksQuery();
  const categoryData = useCategoriesQuery();

  const memoizedData = useMemo(
    () => ({ bankData, categoryData }),
    [bankData, categoryData]
  );
  return (
    <BanksCategsContext.Provider value={memoizedData}>
      {children}
    </BanksCategsContext.Provider>
  );
}
