import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { createElement } from "react";

import { TransactionsContainer } from "./TransactionsContainer";
import type { Bank, Category, Transaction } from "@/lib/types";

// Mock useResponsive
const mockUseResponsive = vi.fn().mockReturnValue({
  isMobile: false,
  isTablet: false,
  isDesktop: true,
  breakpoint: "desktop",
});

vi.mock("@/lib/hooks/useResponsive", () => ({
  useResponsive: () => mockUseResponsive(),
}));

// Mock useUIStore for TransactionCard/TransactionsTable
vi.mock("@/lib/stores/useUIStore", () => ({
  useUIStore: vi.fn((selector) => {
    const state = { privacyMode: false };
    return selector(state);
  }),
}));

const banks: Bank[] = [
  { id: "b1", user: "u1", name: "Checking", balance: 500, primaryColor: "#3b82f6" },
];

const categories: Category[] = [{ id: "c1", user: "u1", name: "Food", hideable: false }];

const transactions: Transaction[] = [
  {
    id: "t1",
    user: "u1",
    description: "Groceries",
    type: "expense",
    amount: 50,
    bank: "b1",
    categories: ["c1"],
    date: "2024-01-15T00:00:00.000Z",
  },
];

describe("TransactionsContainer", () => {
  it("renders TransactionsTable on desktop", () => {
    mockUseResponsive.mockReturnValue({
      isMobile: false,
      isTablet: false,
      isDesktop: true,
      breakpoint: "desktop",
    });

    render(
      createElement(TransactionsContainer, {
        transactions,
        banks,
        categories,
      }),
    );

    // Table should be present (has a table element)
    expect(screen.getByRole("table")).toBeInTheDocument();
    expect(screen.getByText("Groceries")).toBeInTheDocument();
  });

  it("renders TransactionCards on mobile", () => {
    mockUseResponsive.mockReturnValue({
      isMobile: true,
      isTablet: false,
      isDesktop: false,
      breakpoint: "mobile",
    });

    render(
      createElement(TransactionsContainer, {
        transactions,
        banks,
        categories,
      }),
    );

    // No table on mobile
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
    expect(screen.getByText("Groceries")).toBeInTheDocument();
  });

  it("shows empty state when no transactions", () => {
    mockUseResponsive.mockReturnValue({
      isMobile: true,
      isTablet: false,
      isDesktop: false,
      breakpoint: "mobile",
    });

    render(
      createElement(TransactionsContainer, {
        transactions: [],
        banks,
        categories,
      }),
    );

    expect(screen.getByText("No transactions found.")).toBeInTheDocument();
  });
});
