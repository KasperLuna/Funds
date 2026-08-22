// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { AccountCard } from "./account-card";
import { TransactionRow } from "./transaction-row";
import type { Account, Txn } from "@/lib/accounts/accounts-store";

function makeAccount(overrides: Partial<Account> = {}): Account {
  return {
    id: "a1",
    name: "Main Checking",
    kind: "bank",
    assetId: "ast-1",
    openingBalanceMinor: 1000n,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    ...overrides,
  };
}

function makeTxn(overrides: Partial<Txn> = {}): Txn {
  return {
    id: "t1",
    accountId: "a1",
    amountMinor: -1500n,
    type: "expense",
    description: "Groceries",
    categoryIds: [],
    date: new Date(2025, 0, 15, 10, 30).getTime(),
    ...overrides,
  };
}

describe("AccountCard", () => {
  it("renders account name, kind badge, and balance", () => {
    const acc = makeAccount({ name: "Savings", kind: "cash" });
    render(
      <AccountCard
        account={acc}
        balance={2500n}
        onRename={vi.fn()}
        onDelete={vi.fn()}
      />,
    );
    expect(screen.getByText("Savings")).toBeInTheDocument();
    expect(screen.getByText("Cash")).toBeInTheDocument();
    expect(screen.getByText("$25.00")).toBeInTheDocument();
  });

  it("renders negative balance with minus sign", () => {
    const acc = makeAccount({ name: "Overdraft" });
    render(
      <AccountCard
        account={acc}
        balance={-500n}
        onRename={vi.fn()}
        onDelete={vi.fn()}
      />,
    );
    expect(screen.getByText("-$5.00")).toBeInTheDocument();
  });

  it("has rename and delete buttons with accessible labels", () => {
    const acc = makeAccount({ name: "Wallet" });
    render(
      <AccountCard
        account={acc}
        balance={0n}
        onRename={vi.fn()}
        onDelete={vi.fn()}
      />,
    );
    expect(screen.getByRole("button", { name: "Rename Wallet" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Delete Wallet" })).toBeInTheDocument();
  });
});

describe("TransactionRow", () => {
  it("renders description and expense amount in red", () => {
    const txn = makeTxn({ description: "Coffee", amountMinor: -450n });
    render(<TransactionRow txn={txn} categoryNames={new Map()} />);
    expect(screen.getByText("Coffee")).toBeInTheDocument();
    const amount = screen.getByText("-$4.50");
    expect(amount).toBeInTheDocument();
    expect(amount.className).toContain("red");
  });

  it("renders income amount in green", () => {
    const txn = makeTxn({ description: "Salary", amountMinor: 50000n, type: "income" });
    render(<TransactionRow txn={txn} categoryNames={new Map()} />);
    const amount = screen.getByText("$500.00");
    expect(amount).toBeInTheDocument();
    expect(amount.className).toContain("green");
  });

  it("shows category names when provided", () => {
    const cats = new Map([["cat-1", "Food"], ["cat-2", "Daily"]]);
    const txn = makeTxn({ categoryIds: ["cat-1", "cat-2"] });
    render(<TransactionRow txn={txn} categoryNames={cats} />);
    expect(screen.getByText("Food, Daily")).toBeInTheDocument();
  });

  it("shows 'No description' when description is empty", () => {
    const txn = makeTxn({ description: "" });
    render(<TransactionRow txn={txn} categoryNames={new Map()} />);
    expect(screen.getByText("No description")).toBeInTheDocument();
  });
});
