import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createElement, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import CryptoPage from "./page";

// ── Mocks ────────────────────────────────────────────────────────────────────

vi.mock("@/lib/pocketbase/pocketbase", () => ({
  default: {
    collection: vi.fn(() => ({
      getFullList: vi.fn().mockResolvedValue([]),
      create: vi.fn().mockResolvedValue({ id: "new" }),
      update: vi.fn().mockResolvedValue({}),
      delete: vi.fn().mockResolvedValue({}),
    })),
    authStore: { record: { id: "u1" } },
  },
}));

vi.mock("@/lib/stores/useUIStore", () => ({
  useUIStore: vi.fn((selector) => {
    const state = { privacyMode: false };
    return selector(state);
  }),
}));

vi.mock("@/lib/hooks/useAuth", () => ({
  useAuth: () => ({
    user: { currency: { symbol: "$" } },
  }),
}));

// ── Helpers ──────────────────────────────────────────────────────────────────

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });
  return function Wrapper({ children }: { children: ReactNode }) {
    return createElement(QueryClientProvider, { client: queryClient }, children);
  };
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe("CryptoPage", () => {
  it("renders the page heading", () => {
    render(createElement(CryptoPage), { wrapper: createWrapper() });
    expect(screen.getByRole("heading", { name: "Crypto" })).toBeInTheDocument();
  });

  it("renders the Add Token button", () => {
    render(createElement(CryptoPage), { wrapper: createWrapper() });
    expect(screen.getByRole("button", { name: /Add Token/i })).toBeInTheDocument();
  });

  it("renders the CryptoDashboard", () => {
    render(createElement(CryptoPage), { wrapper: createWrapper() });
    expect(screen.getByText("Loading crypto data…")).toBeInTheDocument();
  });

  it("opens token dialog when Add Token is clicked", async () => {
    const user = userEvent.setup();
    render(createElement(CryptoPage), { wrapper: createWrapper() });

    await user.click(screen.getByRole("button", { name: /Add Token/i }));

    expect(screen.getByRole("heading", { name: "Add Token" })).toBeInTheDocument();
    expect(screen.getByLabelText("Name")).toBeInTheDocument();
    expect(screen.getByLabelText("Symbol")).toBeInTheDocument();
    expect(screen.getByLabelText("CoinGecko ID")).toBeInTheDocument();
  });
});
