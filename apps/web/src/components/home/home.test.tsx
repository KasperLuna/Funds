// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { RecentActivity } from "./recent-activity";
import { BudgetPulse } from "./budget-pulse";
import type { Txn } from "@/lib/accounts/accounts-store";
import type { BudgetUsageItem } from "./budget-pulse";
import type { Category } from "@/lib/categories/categories-store";

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

function makeCategory(overrides: Partial<Category> = {}): Category {
  return {
    id: "c1",
    name: "Food",
    color: "#6366f1",
    hideable: false,
    monthlyBudgetMinor: 50000n,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    ...overrides,
  };
}

describe("RecentActivity", () => {
  it("renders empty state when no transactions", () => {
    render(<RecentActivity txns={[]} categories={[]} />);
    expect(screen.getByText("No activity yet")).toBeInTheDocument();
  });

  it("renders transaction rows when txns provided", () => {
    const txns = [
      makeTxn({ id: "t1", description: "Coffee" }),
      makeTxn({ id: "t2", description: "Lunch", amountMinor: -800n }),
    ];
    render(<RecentActivity txns={txns} categories={[]} />);
    expect(screen.getByText("Coffee")).toBeInTheDocument();
    expect(screen.getByText("Lunch")).toBeInTheDocument();
    expect(screen.getByText("Recent activity")).toBeInTheDocument();
  });
});

describe("BudgetPulse", () => {
  it("renders empty state when no budget items", () => {
    render(
      <BudgetPulse items={[]} totalBudgetMinor={0n} totalSpentMinor={0n} />,
    );
    expect(screen.getByText("Budgets")).toBeInTheDocument();
    expect(screen.getByText("Set category budgets to track spending pulse.")).toBeInTheDocument();
  });

  it("renders budget usage with total and categories", () => {
    const cat = makeCategory({ name: "Food", monthlyBudgetMinor: 100000n });
    const items: BudgetUsageItem[] = [
      { category: cat, spentMinor: 45000n, pct: 45 },
    ];
    render(
      <BudgetPulse items={items} totalBudgetMinor={100000n} totalSpentMinor={45000n} />,
    );
    expect(screen.getByText("Budget pulse")).toBeInTheDocument();
    expect(screen.getByText("Food")).toBeInTheDocument();
    expect(screen.getByText("$450.00 of $1,000.00 spent")).toBeInTheDocument();
    expect(screen.getByText("45%")).toBeInTheDocument();
  });

  it("applies red color for over 90%", () => {
    const cat = makeCategory({ name: "Rent", monthlyBudgetMinor: 200000n });
    const items: BudgetUsageItem[] = [
      { category: cat, spentMinor: 200000n, pct: 100 },
    ];
    const { container } = render(
      <BudgetPulse items={items} totalBudgetMinor={200000n} totalSpentMinor={200000n} />,
    );
    const fill = container.querySelector('[role="progressbar"] > div');
    expect(fill).toHaveClass("bg-red-500");
  });

  it("applies yellow color for 70-90%", () => {
    const cat = makeCategory({ name: "Groceries", monthlyBudgetMinor: 100000n });
    const items: BudgetUsageItem[] = [
      { category: cat, spentMinor: 80000n, pct: 80 },
    ];
    const { container } = render(
      <BudgetPulse items={items} totalBudgetMinor={100000n} totalSpentMinor={80000n} />,
    );
    const fill = container.querySelector('[role="progressbar"] > div');
    expect(fill).toHaveClass("bg-yellow-500");
  });

  it("applies green color for under 70%", () => {
    const cat = makeCategory({ name: "Food", monthlyBudgetMinor: 100000n });
    const items: BudgetUsageItem[] = [
      { category: cat, spentMinor: 30000n, pct: 30 },
    ];
    const { container } = render(
      <BudgetPulse items={items} totalBudgetMinor={100000n} totalSpentMinor={30000n} />,
    );
    const fill = container.querySelector('[role="progressbar"] > div');
    expect(fill).toHaveClass("bg-green-500");
  });
});
