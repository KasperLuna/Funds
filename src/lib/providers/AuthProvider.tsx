"use client";

import { useState, useEffect, useMemo } from "react";
import { AuthContext } from "../context/AuthContext";
import { pb } from "../pocketbase/pocketbase";
import { AuthModel } from "pocketbase";

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<AuthModel | null>(pb.authStore.model);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const unsubscribe = pb.authStore.onChange((token, model) => {
      if (model) {
        setUser(model);
      }
    });

    setIsLoading(false);

    return () => {
      unsubscribe();
    };
  }, []);

  const memoizedData = useMemo(() => ({ user, isLoading }), [user, isLoading]);

  return (
    <AuthContext.Provider value={memoizedData}>
      {isLoading ? null : children}
    </AuthContext.Provider>
  );
};
