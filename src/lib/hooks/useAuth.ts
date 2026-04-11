"use client";

import { useContext } from "react";
import { AuthContext } from "@/lib/providers/AuthProvider";
import type { AuthContextType } from "@/lib/providers/AuthProvider";

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
