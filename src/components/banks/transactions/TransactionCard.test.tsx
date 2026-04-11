import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createElement } from "react";

import { TransactionCard } from "./TransactionCard";
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
  { id: "b2", user: "u1", name: "Savings", balance: 5000 },
];

const categories: Category[] = [
  { id: "c1", user: "u1", name: "Food", hideable: false },
  { id: "c2", user: "u1", name: "Transport", hideable: false },
];

const transaction: Transaction = {
  id: "tx-1",
  user: "u1",
  description: "Grocery shopping",
  type: "expense",
  amount: 42.5,
  bank: "b1",
  categories: ["c1", "c2"],
  date: "2024-06-15T00:00:00.000Z",
};

const incomeTransaction: Transaction = {
  id: "tx-2",
  user: "u1",
  description: "Salary",
  type: "income",
  amount: 3000,
  bank: "b1",
  categories: ["c1"],
  date: "2024-06-01T00:00:00.000Z",
};

// ── Tests ────────────────────────────────────────────────────────────────────

describe("TransactionCard", () => {
  it("renders description, amount, date, and categories", () => {
    render(createElement(TransactionCard, { transaction, banks, categories }));

    expect(screen.getByText("Grocery shopping")).toBeInTheDocument();
    expect(screen.getByText("-$42.50")).toBeInTheDocument();
    expect(screen.getByText("Food")).toBeInTheDocument();
    expect(screen.getByText("Transport")).toBeInTheDocument();
  });

  it("shows bank color indicator", () => {
    render(createElement(TransactionCard, { transaction, banks, categories }));

    const indicator = screen.getByLabelText("Bank: Checking");
    expect(indicator).toBeInTheDocument();
    expect(indicator).toHaveStyle({ backgroundColor: "#3b82f6" });
  });

  it("shows positive sign for income transactions", () => {
    render(
      createElement(TransactionCard, {
        transaction: incomeTransaction,
        banks,
        categories,
      }),
    );

    expect(screen.getByText("+$3000.00")).toBeInTheDocument();
  });

  it("hides amount in privacy mode", () => {
    mockPrivacyMode = true;
    render(createElement(TransactionCard, { transaction, banks, categories }));

    expect(screen.getByText("●●●●")).toBeInTheDocument();
    expect(screen.queryByText("-$42.50")).not.toBeInTheDocument();
    mockPrivacyMode = false;
  });

  it("calls onEdit when edit button is clicked", async () => {
    const onEdit = vi.fn();
    const user = userEvent.setup();

    render(
      createElement(TransactionCard, {
        transaction,
        banks,
        categories,
        onEdit,
      }),
    );

    await user.click(screen.getByLabelText("Edit Grocery shopping"));
    expect(onEdit).toHaveBeenCalledWith(transaction);
  });

  it("calls onDelete when delete button is clicked", async () => {
    const onDelete = vi.fn();
    const user = userEvent.setup();

    render(
      createElement(TransactionCard, {
        transaction,
        banks,
        categories,
        onDelete,
      }),
    );

    await user.click(screen.getByLabelText("Delete Grocery shopping"));
    expect(onDelete).toHaveBeenCalledWith(transaction);
  });

  it("does not render edit/delete buttons when callbacks are not provided", () => {
    render(createElement(TransactionCard, { transaction, banks, categories }));

    expect(screen.queryByLabelText("Edit Grocery shopping")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Delete Grocery shopping")).not.toBeInTheDocument();
  });
});
