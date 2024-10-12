import { useMemo } from "react";
import { BanksCategsContext } from "../context/BanksCategsContext";
import { useBanksQuery } from "../hooks/useBanksQuery";
import { useCategoriesQuery } from "../hooks/useCategoriesQuery";
import { useUserQuery } from "../hooks/useUserQuery";

export function BanksCategsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const bankData = useBanksQuery();
  const categoryData = useCategoriesQuery();
  const userData = useUserQuery();

  const memoizedData = useMemo(
    () => ({
      bankData,
      categoryData,
      baseCurrency: userData?.data?.currency,
    }),
    [bankData, categoryData, userData]
  );
  return (
    <BanksCategsContext.Provider value={memoizedData}>
      {children}
    </BanksCategsContext.Provider>
  );
}
