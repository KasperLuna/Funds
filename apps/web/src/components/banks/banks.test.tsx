// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { AccountCard } from "./account-card";
import { TransactionRow } from "./transaction-row";
import { AccountDialog } from "./account-dialog";
import type { Account, Txn } from "@/lib/accounts/accounts-store";
import { computeBalance } from "@/lib/accounts/accounts-store";

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
    assetId: "ast-1",
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

  it("displays primary color indicator when set", () => {
    const acc = makeAccount({ primaryColor: "#ef4444" });
    const { container } = render(
      <AccountCard
        account={acc}
        balance={0n}
        onRename={vi.fn()}
        onDelete={vi.fn()}
      />,
    );
    const indicator = container.querySelector('[aria-hidden="true"]');
    expect(indicator).toBeTruthy();
    expect(indicator).toHaveStyle({ backgroundColor: "rgb(239, 68, 68)" });
  });

  it("shows archive button when onArchive provided", () => {
    const acc = makeAccount({ name: "Test" });
    render(
      <AccountCard
        account={acc}
        balance={0n}
        onRename={vi.fn()}
        onDelete={vi.fn()}
        onArchive={vi.fn()}
      />,
    );
    expect(screen.getByRole("button", { name: "Archive Test" })).toBeInTheDocument();
  });

  it("shows archived state with reduced opacity", () => {
    const acc = makeAccount({ deletedAt: Date.now() });
    const { container } = render(
      <AccountCard
        account={acc}
        balance={0n}
        onRename={vi.fn()}
        onDelete={vi.fn()}
        onArchive={vi.fn()}
      />,
    );
    const card = container.firstElementChild;
    expect(card?.className).toContain("opacity-60");
  });
});

describe("computeBalance", () => {
  it("sums opening balance + all non-deleted transactions", () => {
    const acc = makeAccount({ openingBalanceMinor: 5000n });
    const txns = [
      makeTxn({ amountMinor: -1000n }),
      makeTxn({ id: "t2", amountMinor: 2000n }),
      makeTxn({ id: "t3", amountMinor: -500n, deletedAt: Date.now() }),
    ];
    expect(computeBalance(acc, txns)).toBe(6000n);
  });

  it("handles empty transactions", () => {
    const acc = makeAccount({ openingBalanceMinor: 100n });
    expect(computeBalance(acc, [])).toBe(100n);
  });

  it("handles all deleted transactions", () => {
    const acc = makeAccount({ openingBalanceMinor: 100n });
    const txns = [makeTxn({ deletedAt: Date.now() })];
    expect(computeBalance(acc, txns)).toBe(100n);
  });
});

describe("AccountDialog", () => {
  it("renders empty form for new account", () => {
    render(
      <AccountDialog
        open={true}
        onOpenChange={vi.fn()}
        onSave={vi.fn()}
      />,
    );
    expect(screen.getByText("New account")).toBeInTheDocument();
    expect(screen.getByText("Create")).toBeInTheDocument();
  });

  it("renders pre-filled form for edit", () => {
    const acc = makeAccount({ name: "My Bank", kind: "cash" });
    render(
      <AccountDialog
        open={true}
        onOpenChange={vi.fn()}
        onSave={vi.fn()}
        editAccount={acc}
      />,
    );
    expect(screen.getByText("Edit account")).toBeInTheDocument();
    expect(screen.getByDisplayValue("My Bank")).toBeInTheDocument();
    expect(screen.getByText("Save")).toBeInTheDocument();
  });

  it("shows kind selector with all options", () => {
    render(
      <AccountDialog open={true} onOpenChange={vi.fn()} onSave={vi.fn()} />,
    );
    const select = screen.getByDisplayValue("Bank");
    expect(select).toBeInTheDocument();
  });
});

describe("TransactionRow", () => {
  it("renders description and expense amount in red", () => {
    const txn = makeTxn({ description: "Coffee", amountMinor: -450n });
    render(<TransactionRow txn={txn} categories={[]} />);
    expect(screen.getByText("Coffee")).toBeInTheDocument();
    const amount = screen.getByText("-$4.50");
    expect(amount).toBeInTheDocument();
    expect(amount.className).toContain("--danger");
  });

  it("renders income amount in green", () => {
    const txn = makeTxn({ description: "Salary", amountMinor: 50000n, type: "income" });
    render(<TransactionRow txn={txn} categories={[]} />);
    const amount = screen.getByText("$500.00");
    expect(amount).toBeInTheDocument();
    expect(amount.className).toContain("--accent");
  });

  it("shows category chips with colors when provided", () => {
    const cats = [
      { id: "cat-1", name: "Food", color: "#6366f1" },
      { id: "cat-2", name: "Daily", color: "#22c55e" },
    ];
    const txn = makeTxn({ categoryIds: ["cat-1", "cat-2"] });
    render(<TransactionRow txn={txn} categories={cats} />);
    expect(screen.getAllByText("Food").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Daily").length).toBeGreaterThanOrEqual(1);
  });

  it("shows 'No description' when description is empty", () => {
    const txn = makeTxn({ description: "" });
    render(<TransactionRow txn={txn} categories={[]} />);
    expect(screen.getByText("No description")).toBeInTheDocument();
  });
});

describe("TransactionRow - Swipe Actions", () => {
  it("swipe right triggers duplicate callback", () => {
    const txn = makeTxn();
    const onDuplicate = vi.fn();
    render(
      <TransactionRow txn={txn} categories={[]} onDuplicate={onDuplicate} />,
    );
    const row = screen.getByText("Groceries").closest("[data-testid]") ?? screen.getByText("Groceries").parentElement?.parentElement;

    fireEvent.touchStart(row!, {
      touches: [{ clientX: 0, clientY: 0 }],
    });
    fireEvent.touchMove(row!, {
      touches: [{ clientX: 100, clientY: 0 }],
    });
    fireEvent.touchEnd(row!);

    expect(onDuplicate).toHaveBeenCalledWith(txn);
  });

  it("swipe left triggers delete callback", () => {
    const txn = makeTxn();
    const onDelete = vi.fn();
    render(
      <TransactionRow txn={txn} categories={[]} onDelete={onDelete} />,
    );
    const row = screen.getByText("Groceries").closest("[data-testid]") ?? screen.getByText("Groceries").parentElement?.parentElement;

    fireEvent.touchStart(row!, {
      touches: [{ clientX: 100, clientY: 0 }],
    });
    fireEvent.touchMove(row!, {
      touches: [{ clientX: 0, clientY: 0 }],
    });
    fireEvent.touchEnd(row!);

    expect(onDelete).toHaveBeenCalledWith(txn);
  });

  it("shows duplicate label during right swipe", () => {
    const txn = makeTxn();
    render(
      <TransactionRow txn={txn} categories={[]} onDuplicate={vi.fn()} />,
    );
    const row = screen.getByText("Groceries").closest("[data-testid]") ?? screen.getByText("Groceries").parentElement?.parentElement;

    fireEvent.touchStart(row!, {
      touches: [{ clientX: 0, clientY: 0 }],
    });
    fireEvent.touchMove(row!, {
      touches: [{ clientX: 50, clientY: 0 }],
    });

    expect(screen.getByText("Duplicate")).toBeInTheDocument();
  });

  it("shows delete label during left swipe", () => {
    const txn = makeTxn();
    render(
      <TransactionRow txn={txn} categories={[]} onDelete={vi.fn()} />,
    );
    const row = screen.getByText("Groceries").closest("[data-testid]") ?? screen.getByText("Groceries").parentElement?.parentElement;

    fireEvent.touchStart(row!, {
      touches: [{ clientX: 100, clientY: 0 }],
    });
    fireEvent.touchMove(row!, {
      touches: [{ clientX: 50, clientY: 0 }],
    });

    expect(screen.getByText("Delete")).toBeInTheDocument();
  });
});
