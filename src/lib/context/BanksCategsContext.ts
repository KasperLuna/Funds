import { createContext } from "react";
import { Bank, Category } from "../types";

export type BanksCategsContextType = {
  bankData?: { banks: Bank[]; loading: boolean };
  categoryData?: { categories: Category[]; loading: boolean };
};

export const BanksCategsContext = createContext<BanksCategsContextType>({
  bankData: undefined,
  categoryData: undefined,
});
