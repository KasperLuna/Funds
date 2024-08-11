import { useState, useEffect, useMemo } from "react";
import { PrivacyModeContext } from "../context/PrivacyModeContext";
import { AuthContext } from "../context/AuthContext";
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut as logOut,
  User,
  UserCredential,
} from "firebase/auth";
import { auth } from "../firebase/firebase";

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>();
  const [isLoading, setLoading] = useState<boolean>(true);
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
    () => ({ user, isLoading, signIn, signUp, signOut }),
    [user, isLoading]
  );

  return (
    <AuthContext.Provider value={memoizedData}>
      {isLoading ? null : children}
    </AuthContext.Provider>
  );
};
