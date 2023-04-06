import React, {
  createContext,
  useEffect,
  useState,
  useContext,
  useMemo,
} from "react";
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut as logOut,
  User,
  UserCredential,
} from "firebase/auth";
import { auth } from "../../firebase/initFirebase";

export type AuthContextType = {
  user?: User | null;
  signIn: (email: string, password: string) => Promise<UserCredential>;
  signUp: (email: string, password: string) => Promise<UserCredential>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
  signIn: () => Promise.reject("Not initialized"),
  signUp: () => Promise.reject("Not initialized"),
  signOut: () => Promise.reject("Not initialized"),
} as AuthContextType);

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>();
  const [loading, setLoading] = React.useState<boolean>(true);
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (userEvent) => {
      if (userEvent) {
        setUser(userEvent);
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signUp = (email: string, password: string) => {
    return createUserWithEmailAndPassword(auth, email, password);
  };

  const signIn = (email: string, password: string) => {
    return signInWithEmailAndPassword(auth, email, password);
  };

  const signOut = () => {
    setUser(null);
    return logOut(auth);
  };

  const memoizedData = useMemo(
    () => ({ user, signIn, signUp, signOut }),
    [user]
  );

  return (
    <AuthContext.Provider value={memoizedData}>
      {loading ? null : children}
    </AuthContext.Provider>
  );
};
