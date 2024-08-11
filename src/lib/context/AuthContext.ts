import { createContext } from "react";
import { User, UserCredential } from "firebase/auth";

export type AuthContextType = {
  user: User | null | undefined;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<UserCredential>;
  signUp: (email: string, password: string) => Promise<UserCredential>;
  signOut: () => Promise<void>;
};

export const AuthContext = createContext<AuthContextType>({
  user: undefined,
  isLoading: true,
  signIn: () => {
    throw new Error("Not initialized");
  },
  signUp: () => {
    throw new Error("Not initialized");
  },
  signOut: () => {
    throw new Error("Not initialized");
  },
});
