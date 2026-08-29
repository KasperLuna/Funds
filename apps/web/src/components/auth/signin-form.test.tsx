// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom/vitest";
import { DemoButton } from "./demo-button";

const { fetchMock, pushMock, refreshMock } = vi.hoisted(() => ({
  fetchMock: vi.fn(),
  pushMock: vi.fn(),
  refreshMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock, refresh: refreshMock }),
}));

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