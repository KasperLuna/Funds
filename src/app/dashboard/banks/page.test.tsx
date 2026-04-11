import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createElement, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import BanksPage from "./page";

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

vi.mock("@/lib/hooks/useResponsive", () => ({
  useResponsive: () => ({
    isMobile: false,
    isTablet: false,
    isDesktop: true,
    breakpoint: "desktop",
  }),
}));

vi.mock("@/lib/stores/useUIStore", () => ({
  useUIStore: vi.fn((selector) => {
    const state = { privacyMode: false };
    return selector(state);
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

describe("BanksPage", () => {
  it("renders the page heading", () => {
    render(createElement(BanksPage), { wrapper: createWrapper() });
    expect(screen.getByRole("heading", { name: "Banks" })).toBeInTheDocument();
  });

  it("renders Add Bank and Add Transaction buttons", () => {
    render(createElement(BanksPage), { wrapper: createWrapper() });
    expect(screen.getByRole("button", { name: /Add Bank/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Add Transaction/i })).toBeInTheDocument();
  });

  it("renders the bank select dropdown", () => {
    render(createElement(BanksPage), { wrapper: createWrapper() });
    expect(screen.getByRole("combobox", { name: "Select bank" })).toBeInTheDocument();
  });

  it("opens bank dialog when Add Bank is clicked", async () => {
    const user = userEvent.setup();
    render(createElement(BanksPage), { wrapper: createWrapper() });

    await user.click(screen.getByRole("button", { name: /Add Bank/i }));

    expect(screen.getByRole("heading", { name: "Create Bank" })).toBeInTheDocument();
    expect(screen.getByLabelText("Name")).toBeInTheDocument();
  });

  it("opens transaction dialog when Add Transaction is clicked", async () => {
    const user = userEvent.setup();
    render(createElement(BanksPage), { wrapper: createWrapper() });

    await user.click(screen.getByRole("button", { name: /Add Transaction/i }));

    expect(screen.getByRole("heading", { name: "Create Transaction" })).toBeInTheDocument();
  });
});
