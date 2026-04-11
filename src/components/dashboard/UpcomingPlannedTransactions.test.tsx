import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { createElement } from "react";

import { UpcomingPlannedTransactions } from "./UpcomingPlannedTransactions";
import type { PlannedTransaction } from "@/lib/types";

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

const basePlanned: PlannedTransaction = {
  id: "pt1",
  user: "u1",
  description: "Monthly Rent",
  type: "expense",
  amount: 1200,
  bank: "b1",
  categories: ["c1"],
  recurrence: { frequency: "monthly", interval: 1 },
  timezone: 0,
  previousDate: new Date("2025-01-15"),
  invokeDate: new Date("2025-01-01"),
  active: true,
};

const planned: PlannedTransaction[] = [
  basePlanned,
  {
    id: "pt2",
    user: "u1",
    description: "Weekly Groceries",
    type: "expense",
    amount: 80,
    bank: "b1",
    categories: ["c2"],
    recurrence: { frequency: "weekly", interval: 1 },
    timezone: 0,
    previousDate: new Date("2025-06-20"),
    invokeDate: new Date("2025-06-01"),
    active: true,
  },
  {
    id: "pt3",
    user: "u1",
    description: "Salary",
    type: "income",
    amount: 5000,
    bank: "b1",
    categories: ["c3"],
    recurrence: { frequency: "monthly", interval: 1 },
    timezone: 0,
    previousDate: new Date("2025-06-01"),
    invokeDate: new Date("2025-06-01"),
    active: true,
  },
  {
    id: "pt4",
    user: "u1",
    description: "Cancelled Sub",
    type: "expense",
    amount: 15,
    bank: "b1",
    categories: ["c1"],
    recurrence: { frequency: "monthly", interval: 1 },
    timezone: 0,
    previousDate: new Date("2025-06-01"),
    invokeDate: new Date("2025-06-01"),
    active: false,
  },
];

// ── Tests ────────────────────────────────────────────────────────────────────

describe("UpcomingPlannedTransactions", () => {
  it("renders active planned transactions and filters out inactive ones", () => {
    render(createElement(UpcomingPlannedTransactions, { plannedTransactions: planned }));

    expect(screen.getByText("Monthly Rent")).toBeInTheDocument();
    expect(screen.getByText("Weekly Groceries")).toBeInTheDocument();
    expect(screen.getByText("Salary")).toBeInTheDocument();
    // Inactive transaction should not appear
    expect(screen.queryByText("Cancelled Sub")).not.toBeInTheDocument();
  });

  it("sorts transactions by next occurrence date (soonest first)", () => {
    render(createElement(UpcomingPlannedTransactions, { plannedTransactions: planned }));

    const items = screen.getAllByText(/\$[\d,]+\.\d{2}|●●●●/);
    // All 3 active transactions are rendered
    expect(items).toHaveLength(3);
  });

  it("displays description, type, and amount for each transaction", () => {
    render(createElement(UpcomingPlannedTransactions, { plannedTransactions: [basePlanned] }));

    expect(screen.getByText("Monthly Rent")).toBeInTheDocument();
    expect(screen.getByText(/expense/)).toBeInTheDocument();
    expect(screen.getByText("-$1,200.00")).toBeInTheDocument();
  });

  it("shows green color for income/deposit and red for expense/withdrawal", () => {
    const incomeTransaction: PlannedTransaction = {
      ...basePlanned,
      id: "pt-income",
      description: "Salary Income",
      type: "income",
      amount: 3000,
    };

    render(
      createElement(UpcomingPlannedTransactions, {
        plannedTransactions: [basePlanned, incomeTransaction],
      }),
    );

    const expenseAmount = screen.getByText("-$1,200.00");
    expect(expenseAmount.className).toContain("text-danger");

    const incomeAmount = screen.getByText("+$3,000.00");
    expect(incomeAmount.className).toContain("text-success");
  });

  it("hides amounts in privacy mode", () => {
    mockPrivacyMode = true;
    render(createElement(UpcomingPlannedTransactions, { plannedTransactions: [basePlanned] }));

    expect(screen.getByText("●●●●")).toBeInTheDocument();
    expect(screen.queryByText("-$1,200.00")).not.toBeInTheDocument();

    mockPrivacyMode = false;
  });

  it("shows empty state when no planned transactions exist", () => {
    render(createElement(UpcomingPlannedTransactions, { plannedTransactions: [] }));

    expect(screen.getByText(/no planned transactions/i)).toBeInTheDocument();
  });

  it("shows empty state when all planned transactions are inactive", () => {
    const inactiveOnly: PlannedTransaction[] = [{ ...basePlanned, active: false }];

    render(createElement(UpcomingPlannedTransactions, { plannedTransactions: inactiveOnly }));

    expect(screen.getByText(/no planned transactions/i)).toBeInTheDocument();
  });

  it("uses invokeDate when previousDate is null", () => {
    const noPrevDate: PlannedTransaction = {
      ...basePlanned,
      id: "pt-no-prev",
      description: "New Planned",
      previousDate: null,
      invokeDate: new Date("2025-03-01"),
      recurrence: { frequency: "monthly", interval: 1 },
    };

    render(createElement(UpcomingPlannedTransactions, { plannedTransactions: [noPrevDate] }));

    expect(screen.getByText("New Planned")).toBeInTheDocument();
    // Next occurrence from invokeDate (Mar 1) + 1 month = Apr 1
    expect(screen.getByText(/Apr 1, 2025/)).toBeInTheDocument();
  });
});
