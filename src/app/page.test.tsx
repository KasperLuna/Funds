import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import LoginPage from "./page";

// Mock next/navigation
const pushMock = vi.fn();
const replaceMock = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock, replace: replaceMock }),
}));

// Mock useAuth
const loginMock = vi.fn();
const loginWithOAuthMock = vi.fn();
let mockAuth = {
  login: loginMock,
  loginWithOAuth: loginWithOAuthMock,
  isAuthenticated: false,
  isLoading: false,
  user: null,
  logout: vi.fn(),
};

vi.mock("@/lib/hooks/useAuth", () => ({
  useAuth: () => mockAuth,
}));

describe("LoginPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth = {
      login: loginMock,
      loginWithOAuth: loginWithOAuthMock,
      isAuthenticated: false,
      isLoading: false,
      user: null,
      logout: vi.fn(),
    };
  });

  it("renders the login form with email and password fields", () => {
    render(<LoginPage />);
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /sign in/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /continue with google/i })).toBeInTheDocument();
  });

  it("shows validation errors when submitting empty form", async () => {
    const user = userEvent.setup();
    render(<LoginPage />);

    await user.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByText(/email is required/i)).toBeInTheDocument();
      expect(screen.getByText(/password is required/i)).toBeInTheDocument();
    });
    expect(loginMock).not.toHaveBeenCalled();
  });

  it("shows validation error for invalid email", async () => {
    const user = userEvent.setup();
    render(<LoginPage />);

    await user.type(screen.getByLabelText(/email/i), "not-an-email");
    await user.type(screen.getByLabelText(/password/i), "password123");
    await user.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByText(/please enter a valid email/i)).toBeInTheDocument();
    });
    expect(loginMock).not.toHaveBeenCalled();
  });

  it("calls login and redirects on successful email/password login", async () => {
    loginMock.mockResolvedValueOnce(undefined);
    const user = userEvent.setup();
    render(<LoginPage />);

    await user.type(screen.getByLabelText(/email/i), "test@example.com");
    await user.type(screen.getByLabelText(/password/i), "password123");
    await user.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() => {
      expect(loginMock).toHaveBeenCalledWith("test@example.com", "password123");
      expect(pushMock).toHaveBeenCalledWith("/dashboard");
    });
  });

  it("displays error message on failed email/password login", async () => {
    loginMock.mockRejectedValueOnce(new Error("Invalid credentials"));
    const user = userEvent.setup();
    render(<LoginPage />);

    await user.type(screen.getByLabelText(/email/i), "test@example.com");
    await user.type(screen.getByLabelText(/password/i), "wrong");
    await user.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("Invalid credentials");
    });
    expect(pushMock).not.toHaveBeenCalled();
  });

  it("calls loginWithOAuth and redirects on Google login", async () => {
    loginWithOAuthMock.mockResolvedValueOnce(undefined);
    const user = userEvent.setup();
    render(<LoginPage />);

    await user.click(screen.getByRole("button", { name: /continue with google/i }));

    await waitFor(() => {
      expect(loginWithOAuthMock).toHaveBeenCalledWith("google");
      expect(pushMock).toHaveBeenCalledWith("/dashboard");
    });
  });

  it("displays error message on failed Google login", async () => {
    loginWithOAuthMock.mockRejectedValueOnce(new Error("OAuth failed"));
    const user = userEvent.setup();
    render(<LoginPage />);

    await user.click(screen.getByRole("button", { name: /continue with google/i }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("OAuth failed");
    });
    expect(pushMock).not.toHaveBeenCalled();
  });

  it("redirects to dashboard if already authenticated", () => {
    mockAuth = { ...mockAuth, isAuthenticated: true };
    render(<LoginPage />);
    expect(replaceMock).toHaveBeenCalledWith("/dashboard");
  });

  it("disables form controls during submission", async () => {
    loginMock.mockImplementation(() => new Promise(() => {})); // never resolves
    const user = userEvent.setup();
    render(<LoginPage />);

    await user.type(screen.getByLabelText(/email/i), "test@example.com");
    await user.type(screen.getByLabelText(/password/i), "password123");
    await user.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /signing in/i })).toBeDisabled();
    });
  });
});
