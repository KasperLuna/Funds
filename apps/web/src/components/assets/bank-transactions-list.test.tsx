// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { PrivacyProvider } from "@/lib/privacy/privacy-context";
import { BankTransactionsList, type GroupedDay } from "./bank-transactions-list";
import type { Txn } from "@/lib/accounts/accounts-store";
import type { Category } from "@/lib/categories/categories-store";
import { groupByDay } from "@/lib/accounts/accounts-store";

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
globalThis.ResizeObserver ??= ResizeObserverStub as unknown as typeof ResizeObserver;

class PointerEventStub extends MouseEvent {
  readonly pointerId: number;
  constructor(type: string, init: PointerEventInit = {}) {
    super(type, init);
    this.pointerId = init.pointerId ?? 1;
  }
}
globalThis.PointerEvent ??= PointerEventStub as unknown as typeof PointerEvent;

function makeTxn(overrides: Partial<Txn> = {}): Txn {
  return {
    id: "t1",
    accountId: "acc-1",
    assetId: "ast-usd",
    amountMinor: -1500n,
    type: "expense",
    description: "Coffee",
    categoryIds: [],
    date: new Date(2025, 0, 15, 10, 30).getTime(),
    transferId: null,
    ...overrides,
  };
}

const CATEGORIES: Category[] = [];
const ACCOUNTS = [{ id: "acc-1", name: "Checking", kind: "bank" as const, assetId: "ast-usd", openingBalanceMinor: 0n, primaryColor: null, secondaryColor: null, createdAt: 0, updatedAt: 0, archived: false, deletedAt: null }];
const ACCOUNT_INFO = { "acc-1": { name: "Checking", code: "USD", decimals: 2 } };
const FORMAT_DAY = (day: string) => day;

function defaultProps(grouped: GroupedDay[]) {
  return {
    grouped,
    sortedDesc: grouped.flatMap((g) => g.items),
    visibleCount: 1000,
    filters: { query: "", categoryIds: [], date: null },
    onFiltersChange: () => {},
    categories: CATEGORIES,
    accounts: ACCOUNTS,
    categoryInfoList: [],
    accountInfo: ACCOUNT_INFO,
    dataPending: false,
    hasAccounts: true,
    loadMoreRef: { current: null },
    onAddTransaction: () => {},
    onNewAccount: () => {},
    onEditTxn: () => {},
    onDuplicateTxn: () => {},
    onDeleteTxn: () => {},
    onUndoDeleteTxn: () => {},
    formatDayHeader: FORMAT_DAY,
  };
}

describe("BankTransactionsList day totals", () => {
  beforeEach(() => {
    // jsdom defaults to UTC; groupByDay formats with the local TZ. Both
    // 2025-01-15 fixtures fall on the same calendar day in any TZ we test in.
  });

  it("renders the day's net total on the day header (positive net = neutral)", () => {
    const txns = [
      makeTxn({ id: "t1", amountMinor: 5000n, type: "income", date: new Date(2025, 0, 15, 10).getTime() }),
      makeTxn({ id: "t2", amountMinor: -1500n, type: "expense", date: new Date(2025, 0, 15, 14).getTime() }),
    ];
    const grouped = groupByDay(txns);
    render(
      <PrivacyProvider initialMasked={false}>
        <BankTransactionsList {...defaultProps(grouped)} />
      </PrivacyProvider>,
    );
    const header = screen.getByRole("paragraph", { name: /Day total \$35\.00/ });
    expect(header).toBeInTheDocument();
    expect(header).toHaveTextContent("$35.00");
  });

  it("negative day net renders in --danger tone", () => {
    const txns = [
      makeTxn({ id: "t1", amountMinor: -5000n, type: "expense", date: new Date(2025, 0, 15, 10).getTime() }),
      makeTxn({ id: "t2", amountMinor: -1500n, type: "expense", date: new Date(2025, 0, 15, 14).getTime() }),
    ];
    const grouped = groupByDay(txns);
    render(
      <PrivacyProvider initialMasked={false}>
        <BankTransactionsList {...defaultProps(grouped)} />
      </PrivacyProvider>,
    );
    const header = screen.getByRole("paragraph", { name: /Day total -\$65\.00/ });
    expect(header).toBeInTheDocument();
    expect(header).toHaveClass("text-(--danger)");
  });

  it("masks the day total when privacy is on", () => {
    const txns = [
      makeTxn({ id: "t1", amountMinor: 5000n, type: "income", date: new Date(2025, 0, 15, 10).getTime() }),
    ];
    const grouped = groupByDay(txns);
    render(
      <PrivacyProvider initialMasked>
        <BankTransactionsList {...defaultProps(grouped)} />
      </PrivacyProvider>,
    );
    const header = screen.getByRole("paragraph", { name: "Day total masked" });
    expect(header).toHaveTextContent("••••");
    expect(within(header).queryByText(/\$50\.00/)).not.toBeInTheDocument();
  });

  it("does not show day totals for the empty state", () => {
    render(
      <PrivacyProvider initialMasked={false}>
        <BankTransactionsList {...defaultProps([])} />
      </PrivacyProvider>,
    );
    expect(screen.getByText("No transactions yet")).toBeInTheDocument();
    expect(screen.queryByText(/Day total/)).not.toBeInTheDocument();
  });
});
