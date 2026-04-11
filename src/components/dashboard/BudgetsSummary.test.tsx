import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { createElement } from "react";

import { BudgetsSummary } from "./BudgetsSummary";
import type { Category, Transaction } from "@/lib/types";

// ── Mocks ────────────────────────────────────────────────────────────────────

let mockPrivacyMode = false;

vi.mock("@/lib/stores/useUIStore", () => ({
  useUIStore: (selector: (s: { privacyMode: boolean }) => boolean) =>
    selector({ privacyMode: mockPrivacyMode }),
}));

vi.mock("@/lib/hooks/useAuth", () => ({
  useAuth: () => ({
    user: { currency: { symbol: "$" } },
  }),
}));

// ── Fixtures ─────────────────────────────────────────────────────────────────

const now = new Date();
const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

const categories: Category[] = [
  { id: "c1", user: "u1", name: "Food", hideable: false, monthly_budget: 500 },
  { id: "c2", user: "u1", name: "Transport", hideable: false, monthly_budget: 200 },
  { id: "c3", user: "u1", name: "Entertainment", hideable: false }, // no budget
  { id: "c4", user: "u1", name: "Utilities", hideable: false, monthly_budget: 100 },
];

const transactions: Transaction[] = [
  {
    id: "tx1",
    user: "u1",
    description: "Groceries",
    type: "expense",
    amount: 150,
    bank: "b1",
    categories: ["c1"],
    date: `${currentMonth}-10T12:00:00.000Z`,
  },
  {
    id: "tx2",
    user: "u1",
    description: "Bus pass",
    type: "expense",
    amount: 120,
    bank: "b1",
    categories: ["c2"],
    date: `${currentMonth}-05T12:00:00.000Z`,
  },
  {
    id: "tx3",
    user: "u1",
    description: "Electric bill",
    type: "expense",
    amount: 90,
    bank: "b1",
    categories: ["c4"],
    date: `${currentMonth}-15T12:00:00.000Z`,
  },
  {
    // Income should not count toward spending
    id: "tx4",
    user: "u1",
    description: "Salary",
    type: "income",
    amount: 3000,
    bank: "b1",
    categories: ["c1"],
    date: `${currentMonth}-01T12:00:00.000Z`,
  },
];

// ── Tests ────────────────────────────────────────────────────────────────────

describe("BudgetsSummary", () => {
  it("renders budgeted categories and skips those without a budget", () => {
    render(createElement(BudgetsSummary, { categories, transactions }));

    expect(screen.getByText("Food")).toBeInTheDocument();
    expect(screen.getByText("Transport")).toBeInTheDocument();
    expect(screen.getByText("Utilities")).toBeInTheDocument();
    // Entertainment has no budget, should not appear
    expect(screen.queryByText("Entertainment")).not.toBeInTheDocument();
  });

  it("displays spending vs budget amounts with commas", () => {
    render(createElement(BudgetsSummary, { categories, transactions }));

    // Food: $150.00 / $500.00
    expect(screen.getByText("$150.00 / $500.00")).toBeInTheDocument();
    // Transport: $120.00 / $200.00
    expect(screen.getByText("$120.00 / $200.00")).toBeInTheDocument();
    // Utilities: $90.00 / $100.00
    expect(screen.getByText("$90.00 / $100.00")).toBeInTheDocument();
  });

  it("displays percentage used", () => {
    render(createElement(BudgetsSummary, { categories, transactions }));

    // Food: 150/500 = 30%
    expect(screen.getByText("30%")).toBeInTheDocument();
    // Transport: 120/200 = 60%
    expect(screen.getByText("60%")).toBeInTheDocument();
    // Utilities: 90/100 = 90%
    expect(screen.getByText("90%")).toBeInTheDocument();
  });

  it("applies green color for < 50% usage", () => {
    render(createElement(BudgetsSummary, { categories, transactions }));

    // Food is 30% — green
    const foodBar = screen.getByLabelText("Food budget usage");
    const fill = foodBar.querySelector("[class*='bg-green']");
    expect(fill).toBeInTheDocument();
  });

  it("applies yellow color for 50-80% usage", () => {
    render(createElement(BudgetsSummary, { categories, transactions }));

    // Transport is 60% — yellow
    const transportBar = screen.getByLabelText("Transport budget usage");
    const fill = transportBar.querySelector("[class*='bg-yellow']");
    expect(fill).toBeInTheDocument();
  });

  it("applies red color for > 80% usage", () => {
    render(createElement(BudgetsSummary, { categories, transactions }));

    // Utilities is 90% — red
    const utilitiesBar = screen.getByLabelText("Utilities budget usage");
    const fill = utilitiesBar.querySelector("[class*='bg-red']");
    expect(fill).toBeInTheDocument();
  });

  it("hides amounts in privacy mode", () => {
    mockPrivacyMode = true;
    render(createElement(BudgetsSummary, { categories, transactions }));

    // Should show masked values
    expect(screen.getAllByText("●●●● / ●●●●")).toHaveLength(3);
    expect(screen.getAllByText("●●")).toHaveLength(3);

    // Should not show actual amounts
    expect(screen.queryByText("$150.00 / $500.00")).not.toBeInTheDocument();
    expect(screen.queryByText("30%")).not.toBeInTheDocument();

    mockPrivacyMode = false;
  });

  it("shows empty state when no categories have budgets", () => {
    const noBudgetCategories: Category[] = [
      { id: "c1", user: "u1", name: "Food", hideable: false },
    ];

    render(createElement(BudgetsSummary, { categories: noBudgetCategories, transactions }));

    expect(screen.getByText(/no budgets set/i)).toBeInTheDocument();
  });

  it("renders progress bars with correct aria attributes", () => {
    render(createElement(BudgetsSummary, { categories, transactions }));

    const foodBar = screen.getByLabelText("Food budget usage");
    expect(foodBar).toHaveAttribute("aria-valuenow", "30");
    expect(foodBar).toHaveAttribute("aria-valuemax", "100");
  });
});
