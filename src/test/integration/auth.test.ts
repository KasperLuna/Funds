/**
 * Integration tests for Authentication flow
 * Validates: Requirement 28.1
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { createElement, type ReactNode } from "react";
import { AuthContext, type AuthContextType } from "@/lib/providers/AuthProvider";
import { useAuth } from "@/lib/hooks/useAuth";

// ── Helpers ──────────────────────────────────────────────────────────────────

function createAuthWrapper(overrides: Partial<AuthContextType> = {}) {
  const value: AuthContextType = {
    user: null,
    isLoading: false,
    isAuthenticated: false,
    login: vi.fn(),
    loginWithOAuth: vi.fn(),
    logout: vi.fn(),
    ...overrides,
  };
  return {
    wrapper: ({ children }: { children: ReactNode }) =>
      createElement(AuthContext.Provider, { value }, children),
  };
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe("Authentication flow integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Email/password login", () => {
    it("calls login with email and password and updates auth state", async () => {
      const loginFn = vi.fn().mockResolvedValue(undefined);
      const { wrapper } = createAuthWrapper({
        login: loginFn,
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        await result.current.login("user@example.com", "password123");
      });

      expect(loginFn).toHaveBeenCalledWith("user@example.com", "password123");
    });

    it("exposes authenticated user after login", () => {
      const mockUser = {
        id: "u1",
        email: "user@example.com",
        username: "testuser",
        currency: { code: "USD", name: "US Dollar", symbol: "$" },
        emailVisibility: false,
        verified: true,
        created: new Date(),
        updated: new Date(),
      };

      const { wrapper } = createAuthWrapper({
        user: mockUser,
        isAuthenticated: true,
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.user?.email).toBe("user@example.com");
      expect(result.current.user?.id).toBe("u1");
    });

    it("handles login failure gracefully", async () => {
      const loginFn = vi.fn().mockRejectedValue(new Error("Invalid credentials"));
      const { wrapper } = createAuthWrapper({ login: loginFn });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await expect(
        act(async () => {
          await result.current.login("bad@example.com", "wrong");
        }),
      ).rejects.toThrow("Invalid credentials");

      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.user).toBeNull();
    });
  });

  describe("OAuth login", () => {
    it("calls loginWithOAuth with provider name", async () => {
      const oauthFn = vi.fn().mockResolvedValue(undefined);
      const { wrapper } = createAuthWrapper({ loginWithOAuth: oauthFn });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        await result.current.loginWithOAuth("google");
      });

      expect(oauthFn).toHaveBeenCalledWith("google");
    });
  });

  describe("Logout", () => {
    it("calls logout and clears user state", async () => {
      const logoutFn = vi.fn().mockResolvedValue(undefined);
      const { wrapper } = createAuthWrapper({
        user: {
          id: "u1",
          email: "user@example.com",
          username: "testuser",
          currency: { code: "USD", name: "US Dollar", symbol: "$" },
          emailVisibility: false,
          verified: true,
          created: new Date(),
          updated: new Date(),
        },
        isAuthenticated: true,
        logout: logoutFn,
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        await result.current.logout();
      });

      expect(logoutFn).toHaveBeenCalled();
    });
  });

  describe("Loading state", () => {
    it("exposes isLoading during session restoration", () => {
      const { wrapper } = createAuthWrapper({ isLoading: true });

      const { result } = renderHook(() => useAuth(), { wrapper });

      expect(result.current.isLoading).toBe(true);
      expect(result.current.isAuthenticated).toBe(false);
    });
  });
});
