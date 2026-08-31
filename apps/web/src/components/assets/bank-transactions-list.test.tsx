// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { BankTransactionsList, type GroupedDay } from "./bank-transactions-list";
import type { Txn } from "@/lib/accounts/accounts-store";
import { groupByDay } from "@/lib/accounts/accounts-store";

let maskedState = true;

vi.mock("@/lib/privacy/privacy-store", () => ({
  usePrivacyStore: (selector: (s: { masked: boolean; toggle: () => void; setMasked: (v: boolean) => void }) => unknown) =>
    selector({ masked: maskedState, toggle: vi.fn(), setMasked: vi.fn() }),
}));

vi.mock("@/lib/sync/sync-query", () => ({
  useSyncQuery: () => ({ data: [], isPending: false }),
  queryKeys: { accounts: ["accounts"], categories: ["categories"] },
}));

vi.mock("@/lib/assets", () => ({
  useAssets: () => ({ assets: [], loading: false }),
}));

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

const FORMAT_DAY = (day: string) => day;

function defaultProps(grouped: GroupedDay[]) {
  return {
    grouped,
    sortedDesc: grouped.flatMap((g) => g.items),
    visibleCount: 1000,
    filters: { query: "", categoryIds: [], date: null },
    onFiltersChange: () => {},
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
    maskedState = false;
    const txns = [
      makeTxn({ id: "t1", amountMinor: 5000n, type: "income", date: new Date(2025, 0, 15, 10).getTime() }),
      makeTxn({ id: "t2", amountMinor: -1500n, type: "expense", date: new Date(2025, 0, 15, 14).getTime() }),
    ];
    const grouped = groupByDay(txns);
    render(<BankTransactionsList {...defaultProps(grouped)} />);
    const header = screen.getByRole("paragraph", { name: /Day total \$35\.00/ });
    expect(header).toBeInTheDocument();
    expect(header).toHaveTextContent("$35.00");
  });

  it("negative day net renders in --danger tone", () => {
    maskedState = false;
    const txns = [
      makeTxn({ id: "t1", amountMinor: -5000n, type: "expense", date: new Date(2025, 0, 15, 10).getTime() }),
      makeTxn({ id: "t2", amountMinor: -1500n, type: "expense", date: new Date(2025, 0, 15, 14).getTime() }),
    ];
    const grouped = groupByDay(txns);
    render(<BankTransactionsList {...defaultProps(grouped)} />);
    const header = screen.getByRole("paragraph", { name: /Day total -\$65\.00/ });
    expect(header).toBeInTheDocument();
    expect(header).toHaveClass("text-(--danger)");
  });

  it("masks the day total when privacy is on", () => {
    maskedState = true;
    const txns = [
      makeTxn({ id: "t1", amountMinor: 5000n, type: "income", date: new Date(2025, 0, 15, 10).getTime() }),
    ];
    const grouped = groupByDay(txns);
    render(<BankTransactionsList {...defaultProps(grouped)} />);
    const header = screen.getByRole("paragraph", { name: "Day total masked" });
    expect(header).toHaveTextContent("••••");
    expect(within(header).queryByText(/\$50\.00/)).not.toBeInTheDocument();
  });

  it("does not show day totals for the empty state", () => {
    maskedState = false;
    render(<BankTransactionsList {...defaultProps([])} />);
    expect(screen.getByText("No transactions yet")).toBeInTheDocument();
    expect(screen.queryByText(/Day total/)).not.toBeInTheDocument();
  });
});
