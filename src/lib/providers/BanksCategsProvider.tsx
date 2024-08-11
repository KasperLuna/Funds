import { useMemo, useState } from "react";
import { BanksCategsContext } from "../context/BanksCategsContext";
import { useBanksQuery, useCategoriesQuery } from "../firebase/firestore";

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
