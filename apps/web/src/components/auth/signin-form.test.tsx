// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom/vitest";
import { SignInForm } from "./signin-form";
import { DemoButton } from "./demo-button";

const { signInEmailMock, fetchMock, pushMock, refreshMock } = vi.hoisted(() => ({
  signInEmailMock: vi.fn(),
  fetchMock: vi.fn(),
  pushMock: vi.fn(),
  refreshMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock, refresh: refreshMock }),
}));

vi.mock("better-auth/react", () => ({
  createAuthClient: () => ({
    signIn: { email: signInEmailMock },
    signOut: vi.fn(),
    useSession: () => ({ data: null, isPending: false }),
  }),
}));

describe("SignInForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls signIn.email with credentials and routes to /dashboard on success", async () => {
    signInEmailMock.mockResolvedValue({ data: { user: { id: "u1" } }, error: null });
    const user = userEvent.setup();
    render(<SignInForm />);

    await user.type(screen.getByLabelText("Email"), "me@example.com");
    await user.type(screen.getByLabelText("Password"), "hunter2");
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    await waitFor(() =>
      expect(signInEmailMock).toHaveBeenCalledWith({
        email: "me@example.com",
        password: "hunter2",
      }),
    );
    await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/dashboard"));
    expect(refreshMock).toHaveBeenCalled();
  });

  it("shows the server error message when sign-in is rejected", async () => {
    signInEmailMock.mockResolvedValue({ data: null, error: { message: "Invalid email or password" } });
    const user = userEvent.setup();
    render(<SignInForm />);

    await user.type(screen.getByLabelText("Email"), "me@example.com");
    await user.type(screen.getByLabelText("Password"), "wrong");
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Invalid email or password");
    expect(pushMock).not.toHaveBeenCalled();
  });

  it("shows a fallback message when sign-in throws", async () => {
    signInEmailMock.mockRejectedValue(new Error("network down"));
    const user = userEvent.setup();
    render(<SignInForm />);

    await user.type(screen.getByLabelText("Email"), "me@example.com");
    await user.type(screen.getByLabelText("Password"), "hunter2");
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Sign-in failed");
    expect(pushMock).not.toHaveBeenCalled();
  });
});

describe("DemoButton", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("calls /api/auth/demo and routes to /dashboard on 200", async () => {
    fetchMock.mockResolvedValue({ status: 200, ok: true });
    const user = userEvent.setup();
    render(<DemoButton />);

    await user.click(screen.getByRole("button", { name: "Try the demo" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith("/api/auth/demo"));
    await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/dashboard"));
    expect(refreshMock).toHaveBeenCalled();
  });

  it("shows 'Too many attempts' on 429 and does not navigate", async () => {
    fetchMock.mockResolvedValue({ status: 429, ok: false });
    const user = userEvent.setup();
    render(<DemoButton />);

    await user.click(screen.getByRole("button", { name: "Try the demo" }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Too many attempts");
    expect(pushMock).not.toHaveBeenCalled();
  });

  it("shows a generic error on other non-2xx responses", async () => {
    fetchMock.mockResolvedValue({ status: 500, ok: false });
    const user = userEvent.setup();
    render(<DemoButton />);

    await user.click(screen.getByRole("button", { name: "Try the demo" }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Something went wrong");
    expect(pushMock).not.toHaveBeenCalled();
  });
});