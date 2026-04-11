"use client";

import { createContext, useCallback, useEffect, useState, type ReactNode } from "react";
import pb from "@/lib/pocketbase/pocketbase";
import { useAuthStore } from "@/lib/stores/useAuthStore";
import type { User } from "@/lib/types";
import type { RecordModel } from "pocketbase";

export interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginWithOAuth: (provider: string) => Promise<void>;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

function mapRecordToUser(record: RecordModel): User {
  return {
    id: record.id,
    email: record.email as string,
    username: record.username as string,
    currency: (record.currency as User["currency"]) ?? {
      code: "USD",
      name: "US Dollar",
      symbol: "$",
    },
    emailVisibility: record.emailVisibility as boolean,
    verified: record.verified as boolean,
    created: new Date(record.created as string),
    updated: new Date(record.updated as string),
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { setToken, clearAuth } = useAuthStore();

  // Restore session on mount
  useEffect(() => {
    const restoreSession = async () => {
      try {
        if (pb.authStore.isValid) {
          const authData = await pb.collection("users").authRefresh();
          setUser(mapRecordToUser(authData.record));
          setToken(authData.token);
        } else {
          setUser(null);
          clearAuth();
        }
      } catch {
        // Token invalid or expired — clear everything
        pb.authStore.clear();
        setUser(null);
        clearAuth();
      } finally {
        setIsLoading(false);
      }
    };

    restoreSession();
  }, [setToken, clearAuth]);

  const login = useCallback(
    async (email: string, password: string) => {
      const authData = await pb.collection("users").authWithPassword(email, password);
      setUser(mapRecordToUser(authData.record));
      setToken(authData.token);
    },
    [setToken],
  );

  const loginWithOAuth = useCallback(
    async (provider: string) => {
      const authData = await pb.collection("users").authWithOAuth2({ provider });
      setUser(mapRecordToUser(authData.record));
      setToken(authData.token);
    },
    [setToken],
  );

  const logout = useCallback(async () => {
    pb.authStore.clear();
    setUser(null);
    clearAuth();
  }, [clearAuth]);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        loginWithOAuth,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
