import React, { createContext, useContext, useMemo } from "react";
import { useBanksQuery, useCategoriesQuery } from "../../firebase/queries";
import { useAuth } from "../../components/config/AuthContext";
import { Bank, Category } from "../../utils/db";

export type BanksCategsContextType = {
  bankData?: { banks: Bank[]; loading: boolean };
  categoryData?: { categories: Category[]; loading: boolean };
};

const BanksCategsContext = createContext<BanksCategsContextType>({
  bankData: undefined,
  categoryData: undefined,
});

export const useBanksCategsContext = () => useContext(BanksCategsContext);

export const BanksCategsProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const { user } = useAuth();
  const bankData = useBanksQuery(user?.uid || "");
  const categoryData = useCategoriesQuery(user?.uid || "");

  const memoizedData = useMemo(
    () => ({ bankData, categoryData }),
    [bankData, categoryData],
  );

  return (
    <BanksCategsContext.Provider value={memoizedData}>
      {children}
    </BanksCategsContext.Provider>
  );
};
