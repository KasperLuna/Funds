import { createContext } from "react";
import { Bank, Category, Currency } from "../types";

export type BanksCategsContextType = {
  bankData?: {
    banks: Bank[];
    loading: boolean;
    refetch: () => Promise<unknown>;
  };
  categoryData?: {
    categories: Category[];
    loading: boolean;
    refetch: () => Promise<unknown>;
  };
  baseCurrency?: Currency;
};

export const BanksCategsContext = createContext<BanksCategsContextType>({
  bankData: undefined,
  categoryData: undefined,
  baseCurrency: undefined,
});
