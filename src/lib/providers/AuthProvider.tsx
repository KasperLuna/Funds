"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation"; // For client-side navigation
import { AuthContext } from "../context/AuthContext";
import { pb } from "../pocketbase/pocketbase";
import { AuthModel } from "pocketbase";
import { LoaderCircle } from "lucide-react";
import { FundsLogo } from "@/components/icons/FundsLogo";

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<AuthModel | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const router = useRouter(); // For redirecting

  useEffect(() => {
    // Handle the initial state
    if (pb.authStore.model) {
      setUser(pb.authStore.model);
      setIsLoading(false);
    } else {
      setIsLoading(false); // No user but still set loading to false
    }

    // Subscribe to auth changes
    const unsubscribe = pb.authStore.onChange((_token, model) => {
      setUser(model ?? null);
      setIsLoading(false); // Ensure loading is false after any auth change
    });

    return () => {
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    // Redirect if there's a user and loading is complete
    if (!isLoading && !user) {
      router.push("/"); // : redirect to the dashboard
    }
  }, [isLoading, user, router]);

  const memoizedData = useMemo(() => ({ user, isLoading }), [user, isLoading]);

  return (
    <AuthContext.Provider value={memoizedData}>
      {isLoading ? (
        <div className="text-slate-50 w-full h-screen align-middle flex flex-col gap-5 justify-center items-center">
          <FundsLogo className="fill-white w-20 h-10" />
          <LoaderCircle className="animate-spin size-10" />
          <div className="h-10" />
        </div>
      ) : (
        children
      )}
    </AuthContext.Provider>
  );
};
