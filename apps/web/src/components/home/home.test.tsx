// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { RecentActivity } from "./recent-activity";
import { BudgetPulse } from "./budget-pulse";
import type { Txn } from "@/lib/accounts/accounts-store";

function makeTxn(overrides: Partial<Txn> = {}): Txn {
  return {
    id: "t1",
    accountId: "a1",
    amountMinor: -1500n,
    type: "expense",
    description: "Coffee",
    categoryIds: [],
    date: new Date(2025, 0, 15, 10, 30).getTime(),
    ...overrides,
  };
}

describe("RecentActivity", () => {
  it("renders empty state when no transactions", () => {
    render(<RecentActivity txns={[]} categoryNames={new Map()} />);
    expect(screen.getByText("No activity yet")).toBeInTheDocument();
  });

  it("renders transaction rows when txns provided", () => {
    const txns = [
      makeTxn({ id: "t1", description: "Coffee" }),
      makeTxn({ id: "t2", description: "Lunch", amountMinor: -800n }),
    ];
    render(<RecentActivity txns={txns} categoryNames={new Map()} />);
    expect(screen.getByText("Coffee")).toBeInTheDocument();
    expect(screen.getByText("Lunch")).toBeInTheDocument();
    expect(screen.getByText("Recent activity")).toBeInTheDocument();
  });
});

describe("BudgetPulse", () => {
  it("renders empty state placeholder", () => {
    render(<BudgetPulse />);
    expect(screen.getByText("Budgets")).toBeInTheDocument();
    expect(screen.getByText("Set category budgets to track spending pulse.")).toBeInTheDocument();
  });
});
