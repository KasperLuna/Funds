import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { createElement } from "react";

import DashboardPage from "./page";

// ── Mocks ────────────────────────────────────────────────────────────────────

vi.mock("@/lib/stores/useUIStore", () => ({
  useUIStore: vi.fn((selector?: (s: Record<string, unknown>) => unknown) => {
    const state = { privacyMode: false, togglePrivacyMode: vi.fn() };
    return selector ? selector(state) : state;
  }),
}));

vi.mock("@/lib/hooks/useAuth", () => ({
  useAuth: () => ({
    user: { username: "testuser", currency: { symbol: "$" } },
  }),
}));

vi.mock("@/lib/hooks/useResponsive", () => ({
  useResponsive: () => ({ isMobile: false, isTablet: false }),
}));

vi.mock("@/lib/hooks/useBanks", () => ({
  useBanks: () => ({
    data: [
      { id: "b1", user: "u1", name: "Checking", balance: 1000 },
      { id: "b2", user: "u1", name: "Savings", balance: 2000 },
    ],
    isLoading: false,
  }),
}));

vi.mock("@/lib/hooks/useTransactions", () => ({
  useTransactions: () => ({ data: [], isLoading: false }),
}));

vi.mock("@/lib/hooks/useCategories", () => ({
  useCategories: () => ({ data: [], isLoading: false }),
}));

vi.mock("@/lib/hooks/usePlannedTransactions", () => ({
  usePlannedTransactions: () => ({ data: [], isLoading: false }),
}));

vi.mock("@/lib/providers/TokensProvider", () => ({
  useTokensContext: () => ({
    tokens: [],
    prices: {},
    portfolioValue: 500,
    isLoadingTokens: false,
    isLoadingPrices: false,
  }),
}));

// ── Tests ────────────────────────────────────────────────────────────────────

describe("DashboardPage", () => {
  it("renders the dashboard greeting", () => {
    render(createElement(DashboardPage));

    expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument();
  });

  it("renders AssetSummary with bank and crypto totals", () => {
    render(createElement(DashboardPage));

    // Total assets = bank total (1000 + 2000) + crypto (500) = 3500
    expect(screen.getByTestId("total-assets")).toHaveTextContent("$3,500.00");
    expect(screen.getByTestId("bank-total")).toHaveTextContent("$3,000.00");
    expect(screen.getByTestId("crypto-total")).toHaveTextContent("$500.00");
  });

  it("renders BankSummary with bank cards", () => {
    render(createElement(DashboardPage));

    expect(screen.getByText("Checking")).toBeInTheDocument();
    expect(screen.getByText("Savings")).toBeInTheDocument();
  });

  it("renders BudgetsSummary section", () => {
    render(createElement(DashboardPage));

    expect(screen.getByText("Budgets")).toBeInTheDocument();
  });

  it("renders UpcomingPlannedTransactions section", () => {
    render(createElement(DashboardPage));

    expect(screen.getByText("Upcoming")).toBeInTheDocument();
  });

  it("renders CryptoDashboard section", () => {
    render(createElement(DashboardPage));

    expect(screen.getByText("Portfolio")).toBeInTheDocument();
  });
});
