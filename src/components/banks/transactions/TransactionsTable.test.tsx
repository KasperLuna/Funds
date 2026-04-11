import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createElement } from "react";

import { TransactionsTable } from "./TransactionsTable";
import type { Transaction, Bank, Category } from "@/lib/types";

// ── Mocks ────────────────────────────────────────────────────────────────────

let mockPrivacyMode = false;

vi.mock("@/lib/stores/useUIStore", () => ({
  useUIStore: (selector: (s: { privacyMode: boolean }) => boolean) =>
    selector({ privacyMode: mockPrivacyMode }),
}));

// ── Fixtures ─────────────────────────────────────────────────────────────────

const banks: Bank[] = [
  { id: "b1", user: "u1", name: "Checking", balance: 1000, primaryColor: "#3b82f6" },
];

const categories: Category[] = [
  { id: "c1", user: "u1", name: "Food", hideable: false },
  { id: "c2", user: "u1", name: "Transport", hideable: false },
];

const transactions: Transaction[] = [
  {
    id: "tx-1",
    user: "u1",
    description: "Grocery shopping",
    type: "expense",
    amount: 42.5,
    bank: "b1",
    categories: ["c1"],
    date: "2024-06-15T00:00:00.000Z",
  },
  {
    id: "tx-2",
    user: "u1",
    description: "Salary",
    type: "income",
    amount: 3000,
    bank: "b1",
    categories: ["c1", "c2"],
    date: "2024-06-01T00:00:00.000Z",
  },
];

// ── Tests ────────────────────────────────────────────────────────────────────

describe("TransactionsTable", () => {
  it("renders table headers", () => {
    render(
      createElement(TransactionsTable, {
        transactions,
        banks,
        categories,
      }),
    );

    expect(screen.getByText("Date")).toBeInTheDocument();
    expect(screen.getByText("Description")).toBeInTheDocument();
    expect(screen.getByText("Type")).toBeInTheDocument();
    expect(screen.getByText("Amount")).toBeInTheDocument();
    expect(screen.getByText("Categories")).toBeInTheDocument();
  });

  it("renders transaction rows with correct data", () => {
    render(
      createElement(TransactionsTable, {
        transactions,
        banks,
        categories,
      }),
    );

    expect(screen.getByText("Grocery shopping")).toBeInTheDocument();
    expect(screen.getByText("-$42.50")).toBeInTheDocument();
    expect(screen.getByText("Expense")).toBeInTheDocument();

    expect(screen.getByText("Salary")).toBeInTheDocument();
    expect(screen.getByText("+$3000.00")).toBeInTheDocument();
    expect(screen.getByText("Income")).toBeInTheDocument();
  });

  it("shows empty state when no transactions", () => {
    render(
      createElement(TransactionsTable, {
        transactions: [],
        banks,
        categories,
      }),
    );

    expect(screen.getByText("No transactions found.")).toBeInTheDocument();
  });

  it("hides amounts in privacy mode", () => {
    mockPrivacyMode = true;
    render(
      createElement(TransactionsTable, {
        transactions,
        banks,
        categories,
      }),
    );

    const masks = screen.getAllByText("●●●●");
    expect(masks).toHaveLength(2);
    expect(screen.queryByText("-$42.50")).not.toBeInTheDocument();
    mockPrivacyMode = false;
  });

  it("shows bank color indicator in description column", () => {
    render(
      createElement(TransactionsTable, {
        transactions,
        banks,
        categories,
      }),
    );

    const indicators = screen.getAllByLabelText("Bank: Checking");
    expect(indicators.length).toBeGreaterThan(0);
    expect(indicators[0]).toHaveStyle({ backgroundColor: "#3b82f6" });
  });

  it("renders category tags for each row", () => {
    render(
      createElement(TransactionsTable, {
        transactions,
        banks,
        categories,
      }),
    );

    // "Food" appears in both rows, "Transport" in the salary row
    const foodTags = screen.getAllByText("Food");
    expect(foodTags).toHaveLength(2);
    expect(screen.getByText("Transport")).toBeInTheDocument();
  });

  it("calls onEdit when edit button is clicked", async () => {
    const onEdit = vi.fn();
    const user = userEvent.setup();

    render(
      createElement(TransactionsTable, {
        transactions,
        banks,
        categories,
        onEdit,
      }),
    );

    await user.click(screen.getByLabelText("Edit Grocery shopping"));
    expect(onEdit).toHaveBeenCalledWith(transactions[0]);
  });

  it("calls onDelete when delete button is clicked", async () => {
    const onDelete = vi.fn();
    const user = userEvent.setup();

    render(
      createElement(TransactionsTable, {
        transactions,
        banks,
        categories,
        onDelete,
      }),
    );

    await user.click(screen.getByLabelText("Delete Salary"));
    expect(onDelete).toHaveBeenCalledWith(transactions[1]);
  });

  it("does not render action buttons when callbacks are not provided", () => {
    render(
      createElement(TransactionsTable, {
        transactions,
        banks,
        categories,
      }),
    );

    expect(screen.queryByLabelText("Edit Grocery shopping")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Delete Grocery shopping")).not.toBeInTheDocument();
  });
});
