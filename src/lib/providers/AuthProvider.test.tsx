import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useContext } from "react";
import { AuthContext, AuthProvider } from "./AuthProvider";

// Mock PocketBase
const mockAuthWithPassword = vi.fn();
const mockAuthWithOAuth2 = vi.fn();
const mockAuthRefresh = vi.fn();
const mockAuthStoreClear = vi.fn();

vi.mock("@/lib/pocketbase/pocketbase", () => {
  const authStore = {
    isValid: false,
    clear: (...args: unknown[]) => mockAuthStoreClear(...args),
  };
  return {
    default: {
      authStore,
      collection: () => ({
        authWithPassword: mockAuthWithPassword,
        authWithOAuth2: mockAuthWithOAuth2,
        authRefresh: mockAuthRefresh,
      }),
    },
  };
});

// Mock Zustand auth store
const mockSetToken = vi.fn();
const mockClearAuth = vi.fn();

vi.mock("@/lib/stores/useAuthStore", () => ({
  useAuthStore: () => ({
    setToken: mockSetToken,
    clearAuth: mockClearAuth,
  }),
}));

// Helper to access context values
function AuthConsumer() {
  const ctx = useContext(AuthContext);
  if (!ctx) return <div>No context</div>;
  return (
    <div>
      <span data-testid="loading">{String(ctx.isLoading)}</span>
      <span data-testid="authenticated">{String(ctx.isAuthenticated)}</span>
      <span data-testid="user">{ctx.user ? ctx.user.email : "null"}</span>
      <button onClick={() => ctx.login("test@example.com", "password123")}>Login</button>
      <button onClick={() => ctx.loginWithOAuth("google")}>OAuth</button>
      <button onClick={() => ctx.logout()}>Logout</button>
    </div>
  );
}

const mockRecord = {
  id: "user1",
  email: "test@example.com",
  username: "testuser",
  currency: { code: "USD", name: "US Dollar", symbol: "$" },
  emailVisibility: true,
  verified: true,
  created: "2024-01-01T00:00:00Z",
  updated: "2024-01-01T00:00:00Z",
  collectionId: "users",
  collectionName: "users",
};

// Access the mocked pb module to toggle authStore.isValid
async function getPbMock() {
  const mod = await import("@/lib/pocketbase/pocketbase");
  return mod.default;
}

describe("AuthProvider", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders children and finishes loading when authStore is invalid", async () => {
    const pb = await getPbMock();
    pb.authStore.isValid = false;

    render(
      <AuthProvider>
        <AuthConsumer />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("loading").textContent).toBe("false");
    });
    expect(screen.getByTestId("authenticated").textContent).toBe("false");
    expect(screen.getByTestId("user").textContent).toBe("null");
  });

  it("restores session on mount when authStore is valid", async () => {
    const pb = await getPbMock();
    pb.authStore.isValid = true;
    mockAuthRefresh.mockResolvedValueOnce({ record: mockRecord, token: "refreshed-token" });

    render(
      <AuthProvider>
        <AuthConsumer />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("loading").textContent).toBe("false");
    });
    expect(screen.getByTestId("authenticated").textContent).toBe("true");
    expect(screen.getByTestId("user").textContent).toBe("test@example.com");
    expect(mockSetToken).toHaveBeenCalledWith("refreshed-token");
  });

  it("clears auth when session restore fails", async () => {
    const pb = await getPbMock();
    pb.authStore.isValid = true;
    mockAuthRefresh.mockRejectedValueOnce(new Error("Token expired"));

    render(
      <AuthProvider>
        <AuthConsumer />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("loading").textContent).toBe("false");
    });
    expect(screen.getByTestId("authenticated").textContent).toBe("false");
    expect(mockAuthStoreClear).toHaveBeenCalled();
    expect(mockClearAuth).toHaveBeenCalled();
  });

  it("login sets user and token on success", async () => {
    const pb = await getPbMock();
    pb.authStore.isValid = false;
    mockAuthWithPassword.mockResolvedValueOnce({ record: mockRecord, token: "auth-token" });

    const user = userEvent.setup();

    render(
      <AuthProvider>
        <AuthConsumer />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("loading").textContent).toBe("false");
    });

    await user.click(screen.getByText("Login"));

    await waitFor(() => {
      expect(screen.getByTestId("authenticated").textContent).toBe("true");
    });
    expect(screen.getByTestId("user").textContent).toBe("test@example.com");
    expect(mockSetToken).toHaveBeenCalledWith("auth-token");
    expect(mockAuthWithPassword).toHaveBeenCalledWith("test@example.com", "password123");
  });

  it("loginWithOAuth sets user and token on success", async () => {
    const pb = await getPbMock();
    pb.authStore.isValid = false;
    mockAuthWithOAuth2.mockResolvedValueOnce({ record: mockRecord, token: "oauth-token" });

    const user = userEvent.setup();

    render(
      <AuthProvider>
        <AuthConsumer />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("loading").textContent).toBe("false");
    });

    await user.click(screen.getByText("OAuth"));

    await waitFor(() => {
      expect(screen.getByTestId("authenticated").textContent).toBe("true");
    });
    expect(mockSetToken).toHaveBeenCalledWith("oauth-token");
    expect(mockAuthWithOAuth2).toHaveBeenCalledWith({ provider: "google" });
  });

  it("logout clears user, token, and PocketBase authStore", async () => {
    const pb = await getPbMock();
    pb.authStore.isValid = true;
    mockAuthRefresh.mockResolvedValueOnce({ record: mockRecord, token: "token" });

    const user = userEvent.setup();

    render(
      <AuthProvider>
        <AuthConsumer />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("authenticated").textContent).toBe("true");
    });

    await user.click(screen.getByText("Logout"));

    await waitFor(() => {
      expect(screen.getByTestId("authenticated").textContent).toBe("false");
    });
    expect(screen.getByTestId("user").textContent).toBe("null");
    expect(mockAuthStoreClear).toHaveBeenCalled();
    expect(mockClearAuth).toHaveBeenCalled();
  });
});
