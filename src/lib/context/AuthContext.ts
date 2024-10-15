import { createContext } from "react";
import { AuthModel } from "pocketbase";

export type AuthContextType = {
  user: AuthModel | null | undefined;
  isLoading: boolean;
};

export const AuthContext = createContext<AuthContextType>({
  user: undefined,
  isLoading: true,
});
