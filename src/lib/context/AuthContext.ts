import { createContext } from "react";
import { AuthModel, RecordAuthResponse, RecordModel } from "pocketbase";

export type AuthContextType = {
  // user: User | null | undefined;
  user: AuthModel | null | undefined;
  isLoading: boolean;
  // signIn: (email: string, password: string) => Promise<UserCredential>;
  // signUp: (email: string, password: string) => Promise<UserCredential>;
  // signInWithGoogle: () => Promise<RecordAuthResponse<AuthModel> | undefined>;
  // signIn: (
  //   email: string,
  //   password: string
  // ) => Promise<RecordAuthResponse<AuthModel> | undefined>;
  // signUp: (email: string, password: string) => Promise<RecordModel | undefined>;
  // signOut: () => void;
};

export const AuthContext = createContext<AuthContextType>({
  user: undefined,
  isLoading: true,
  // signIn: () => {
  //   throw new Error("Not initialized");
  // },
  // signInWithGoogle: () => {
  //   throw new Error("Not initialized");
  // },
  // signUp: () => {
  //   throw new Error("Not initialized");
  // },
  // signOut: () => {
  //   throw new Error("Not initialized");
  // },
});
