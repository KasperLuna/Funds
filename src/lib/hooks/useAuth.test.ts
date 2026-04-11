import { describe, it, expect, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { createElement, type ReactNode } from "react";
import { AuthContext, type AuthContextType } from "@/lib/providers/AuthProvider";
import { useAuth } from "./useAuth";

const mockContextValue: AuthContextType = {
  user: null,
  isLoading: false,
  isAuthenticated: false,
  login: vi.fn(),
  loginWithOAuth: vi.fn(),
  logout: vi.fn(),
};

function createWrapper(value: AuthContextType) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return createElement(AuthContext.Provider, { value }, children);
  };
}

describe("useAuth", () => {
  it("throws when used outside AuthProvider", () => {
    expect(() => renderHook(() => useAuth())).toThrow(
      "useAuth must be used within an AuthProvider",
    );
  });

  it("returns context value when used inside AuthProvider", () => {
    const { result } = renderHook(() => useAuth(), {
      wrapper: createWrapper(mockContextValue),
    });

    expect(result.current.user).toBeNull();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.login).toBeDefined();
    expect(result.current.loginWithOAuth).toBeDefined();
    expect(result.current.logout).toBeDefined();
  });

  it("returns authenticated user when context has user", () => {
    const authedContext: AuthContextType = {
      ...mockContextValue,
      user: {
        id: "u1",
        email: "test@example.com",
        username: "tester",
        currency: { code: "USD", name: "US Dollar", symbol: "$" },
        emailVisibility: true,
        verified: true,
        created: new Date(),
        updated: new Date(),
      },
      isAuthenticated: true,
    };

    const { result } = renderHook(() => useAuth(), {
      wrapper: createWrapper(authedContext),
    });

    expect(result.current.user?.email).toBe("test@example.com");
    expect(result.current.isAuthenticated).toBe(true);
  });
});
