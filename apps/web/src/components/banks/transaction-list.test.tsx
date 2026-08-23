// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { TransactionList } from "./transaction-list";
import type { Txn } from "@/lib/accounts/accounts-store";

function makeTxn(overrides: Partial<Txn> = {}): Txn {
  return {
    id: "t1",
    accountId: "a1",
    assetId: "ast-1",
    amountMinor: -1500n,
    type: "expense",
    description: "Groceries",
    categoryIds: [],
    date: new Date(2025, 0, 15, 10, 30).getTime(),
    ...overrides,
  };
}

const CATEGORIES = [
  { id: "cat-1", name: "Food", color: "#6366f1" },
  { id: "cat-2", name: "Transport", color: "#22c55e" },
];

describe("TransactionList", () => {
  it("renders transactions grouped by day", () => {
    const txns = [
      makeTxn({ id: "t1", description: "Coffee", date: new Date(2025, 0, 15, 10).getTime() }),
      makeTxn({ id: "t2", description: "Lunch", date: new Date(2025, 0, 15, 12).getTime() }),
      makeTxn({ id: "t3", description: "Dinner", date: new Date(2025, 0, 14, 18).getTime() }),
    ];
    render(<TransactionList txns={txns} categories={CATEGORIES} />);
    const mobileList = screen.getByTestId("mobile-list");
    expect(within(mobileList).getByText("Coffee")).toBeInTheDocument();
    expect(within(mobileList).getByText("Lunch")).toBeInTheDocument();
    expect(within(mobileList).getByText("Dinner")).toBeInTheDocument();
  });

  it("filters by search text", () => {
    const txns = [
      makeTxn({ id: "t1", description: "Coffee Shop" }),
      makeTxn({ id: "t2", description: "Grocery Store" }),
    ];
    render(<TransactionList txns={txns} categories={CATEGORIES} />);
    fireEvent.change(screen.getByTestId("search-input"), { target: { value: "coffee" } });
    const mobileList = screen.getByTestId("mobile-list");
    expect(within(mobileList).getByText("Coffee Shop")).toBeInTheDocument();
    expect(within(mobileList).queryByText("Grocery Store")).not.toBeInTheDocument();
  });

  it("filters by category", () => {
    const txns = [
      makeTxn({ id: "t1", description: "Coffee", categoryIds: ["cat-1"] }),
      makeTxn({ id: "t2", description: "Bus", categoryIds: ["cat-2"] }),
    ];
    render(<TransactionList txns={txns} categories={CATEGORIES} />);
    const categoryFilter = screen.getByTestId("category-filter");
    fireEvent.click(within(categoryFilter).getByText("Food"));
    const mobileList = screen.getByTestId("mobile-list");
    expect(within(mobileList).getByText("Coffee")).toBeInTheDocument();
    expect(within(mobileList).queryByText("Bus")).not.toBeInTheDocument();
  });

  it("filters by month", () => {
    const txns = [
      makeTxn({ id: "t1", description: "Jan item", date: new Date(2025, 0, 15).getTime() }),
      makeTxn({ id: "t2", description: "Feb item", date: new Date(2025, 1, 15).getTime() }),
    ];
    render(<TransactionList txns={txns} categories={CATEGORIES} />);
    fireEvent.change(screen.getByTestId("month-picker"), { target: { value: "2025-01" } });
    const mobileList = screen.getByTestId("mobile-list");
    expect(within(mobileList).getByText("Jan item")).toBeInTheDocument();
    expect(within(mobileList).queryByText("Feb item")).not.toBeInTheDocument();
  });

  it("calls onDuplicate when swipe right on mobile", () => {
    const txns = [makeTxn({ id: "t1", description: "Swipeable" })];
    const onDuplicate = vi.fn();
    render(<TransactionList txns={txns} categories={CATEGORIES} onDuplicate={onDuplicate} />);
    const mobileList = screen.getByTestId("mobile-list");
    const descriptions = within(mobileList).getAllByText("Swipeable");
    const targetRow = descriptions[0]!.closest("[class*='touch']")!;
    fireEvent.touchStart(targetRow, { touches: [{ clientX: 0, clientY: 0 }] });
    fireEvent.touchMove(targetRow, { touches: [{ clientX: 100, clientY: 0 }] });
    fireEvent.touchEnd(targetRow);
    expect(onDuplicate).toHaveBeenCalled();
  });

  it("calls onDelete when swipe left on mobile", () => {
    const txns = [makeTxn({ id: "t1", description: "Deletable" })];
    const onDelete = vi.fn();
    render(<TransactionList txns={txns} categories={CATEGORIES} onDelete={onDelete} />);
    const mobileList = screen.getByTestId("mobile-list");
    const descriptions = within(mobileList).getAllByText("Deletable");
    const targetRow = descriptions[0]!.closest("[class*='touch']")!;
    fireEvent.touchStart(targetRow, { touches: [{ clientX: 100, clientY: 0 }] });
    fireEvent.touchMove(targetRow, { touches: [{ clientX: 0, clientY: 0 }] });
    fireEvent.touchEnd(targetRow);
    expect(onDelete).toHaveBeenCalled();
  });

  it("shows today header for current day transactions", () => {
    const today = new Date();
    today.setHours(10, 0, 0, 0);
    const txns = [makeTxn({ id: "t1", description: "Today item", date: today.getTime() })];
    render(<TransactionList txns={txns} categories={CATEGORIES} />);
    const mobileList = screen.getByTestId("mobile-list");
    expect(within(mobileList).getByText("Today")).toBeInTheDocument();
  });
});
