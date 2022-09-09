import React, { createContext, useContext } from "react";
import { useBanksQuery, useCategoriesQuery } from "../../firebase/queries";
import { useAuth } from "../../components/config/AuthContext";
import { Bank, Category } from "../../utils/db";
import { useRouter } from "next/router";

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
  const router = useRouter();
  const bank = router.query["bank"];
  const { user } = useAuth();
  const bankData = useBanksQuery(user?.uid || "", bank);
  const categoryData = useCategoriesQuery(user?.uid || "");

  return (
    <BanksCategsContext.Provider value={{ bankData, categoryData }}>
      {children}
    </BanksCategsContext.Provider>
  );
};
