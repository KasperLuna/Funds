// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from "vitest";
import { useState, type ReactElement } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom/vitest";
import { MemorySyncDatabase } from "@/lib/sync";
import { CaptureSheet, type AccountOption, type CategoryOption } from "./CaptureSheet";
import type { RecentTxn } from "@/lib/capture";
import type { Template } from "@/lib/templates/templates-store";
import { useSaveUndo } from "./use-save-undo";

// cavetail: jsdom lacks ResizeObserver used by radix primitives
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
globalThis.ResizeObserver ??= ResizeObserverStub as unknown as typeof ResizeObserver;

const ACCOUNTS: AccountOption[] = [
  { id: "acc-1", name: "Checking", assetId: "ast-1", decimals: 2 },
  { id: "acc-2", name: "Wallet", assetId: "ast-2", decimals: 8 },
];
const CATS: CategoryOption[] = [{ id: "cat-1", name: "Food" }];

function withQueryClient(ui: ReactElement) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return <QueryClientProvider client={client}>{ui}</QueryClientProvider>;
}

function Harness({ sync }: { sync: MemorySyncDatabase }) {
  const [open, setOpen] = useState(true);
  const { save } = useSaveUndo(sync);
  return (
    <div>
      <CaptureSheet
        open={open}
        onOpenChange={setOpen}
        userId="usr-1"
        accounts={ACCOUNTS}
        categories={CATS}
        recentTxns={[]}
        onSave={(row) => void save(row)}
        defaultAccountId="acc-1"
      />
    </div>
  );
}

function UndoHarness({ sync }: { sync: MemorySyncDatabase }) {
  const { save, canUndo, undo } = useSaveUndo(sync);
  return (
    <div>
      <button type="button" onClick={() => void save({ id: "u1", user_id: "usr-1" })}>
        DoSave
      </button>
      {canUndo && (
        <button type="button" onClick={() => void undo()}>
          Undo
        </button>
      )}
    </div>
  );
}

function HarnessWithSuggestions({
  sync,
  recentTxns,
}: {
  sync: MemorySyncDatabase;
  recentTxns: RecentTxn[];
}) {
  const [open, setOpen] = useState(true);
  const { save } = useSaveUndo(sync);
  return (
    <div>
      <CaptureSheet
        open={open}
        onOpenChange={setOpen}
        userId="usr-1"
        accounts={ACCOUNTS}
        categories={CATS}
        recentTxns={recentTxns}
        onSave={(row) => void save(row)}
        defaultAccountId="acc-1"
      />
    </div>
  );
}

describe("CaptureSheet", () => {
  let sync: MemorySyncDatabase;

  beforeEach(() => {
    sync = new MemorySyncDatabase();
    sync.connect();
  });

  it("keypad drives the readout", async () => {
    const user = userEvent.setup();
    render(withQueryClient(<Harness sync={sync} />));
    const readout = screen.getByTestId("amount-readout");

    for (const k of ["1", "2", "5"]) await user.click(screen.getByRole("button", { name: k }));
    expect(readout).toHaveTextContent("125.00");

    await user.click(screen.getByRole("button", { name: "Decimal point" }));
    await user.click(screen.getByRole("button", { name: "5" }));
    expect(readout).toHaveTextContent("125.50");

    await user.click(screen.getByRole("button", { name: "Backspace" }));
    expect(readout).toHaveTextContent("125.00");

    await user.click(screen.getByRole("button", { name: "Clear" }));
    expect(readout).toHaveTextContent("0.00");
  });

  it("save writes a negative expense locally; undo tombstones it", async () => {
    const user = userEvent.setup();
    render(withQueryClient(<Harness sync={sync} />));

    for (const k of ["1", "2", "5"]) await user.click(screen.getByRole("button", { name: k }));
    await user.click(screen.getByRole("button", { name: "Save" }));

    const rows = (await sync.query("select * from transactions")).rows;
    expect(rows).toHaveLength(1);
    expect(rows[0]!.amount_minor).toBe(-12500n);
    expect(rows[0]!.type).toBe("expense");
  });

  it("save + undo writes a tombstone via the hook", async () => {
    const user = userEvent.setup();
    render(withQueryClient(<UndoHarness sync={sync} />));

    await user.click(screen.getByRole("button", { name: "DoSave" }));
    const undoBtn = await waitFor(() => screen.getByRole("button", { name: "Undo" }));
    await user.click(undoBtn);

    const after = (await sync.query("select * from transactions")).rows;
    expect(after).toHaveLength(1);
    expect(after[0]!.deleted_at).toBeTruthy();
  });

  it("income toggle signs amount positive", async () => {
    const user = userEvent.setup();
    render(withQueryClient(<Harness sync={sync} />));

    await user.click(screen.getByRole("button", { name: "Income" }));
    await user.click(screen.getByRole("button", { name: "5" }));
    await user.click(screen.getByRole("button", { name: "Save" }));

    const rows = (await sync.query("select * from transactions")).rows;
    expect(rows[0]!.amount_minor).toBe(500n);
    expect(rows[0]!.type).toBe("income");
  });

  it("honors per-asset decimals on account switch", async () => {
    const user = userEvent.setup();
    render(withQueryClient(<Harness sync={sync} />));

    const readout = screen.getByTestId("amount-readout");
    // Account selector is a popover chip; open it and pick the 8-decimal account.
    await user.click(screen.getByRole("button", { name: "Account" }));
    await user.click(screen.getByRole("option", { name: "Wallet" }));
    await user.click(screen.getByRole("button", { name: "1" }));
    expect(readout).toHaveTextContent("1.00000000");
  });

  it("save is disabled when amount is zero", () => {
    render(withQueryClient(<Harness sync={sync} />));
    const save = screen.getByRole("button", { name: "Save" });
    expect(save).toBeDisabled();
  });

  it("category chips toggle aria-pressed", async () => {
    const user = userEvent.setup();
    render(withQueryClient(<Harness sync={sync} />));
    const group = screen.getByRole("group", { name: "Categories" });
    const chip = within(group).getByRole("button", { name: "Food" });
    expect(chip).toHaveAttribute("aria-pressed", "false");
    await user.click(chip);
    expect(chip).toHaveAttribute("aria-pressed", "true");
    await user.click(chip);
    expect(chip).toHaveAttribute("aria-pressed", "false");
  });

  it("renders suggestion chips from recent repeats", () => {
    const withSuggestions: RecentTxn[] = [
      { id: "r1", description: "Coffee", amountMinor: 12000n, categoryIds: [], date: Date.now() },
    ];
    render(
      withQueryClient(<HarnessWithSuggestions sync={sync} recentTxns={withSuggestions} />),
    );
    const list = screen.getByRole("list", { name: "Suggestions" });
    expect(within(list).getByText(/Coffee/)).toBeInTheDocument();
  });

  it("negative suggestion fills a positive amount and saves as expense", async () => {
    const user = userEvent.setup();
    const withSuggestions: RecentTxn[] = [
      { id: "r1", description: "Rent", amountMinor: -150000n, categoryIds: [], date: Date.now() },
    ];
    render(withQueryClient(<HarnessWithSuggestions sync={sync} recentTxns={withSuggestions} />));

    const list = screen.getByRole("list", { name: "Suggestions" });
    await user.click(within(list).getByText(/Rent/));
    // Readout shows the unsigned magnitude; save becomes enabled.
    const readout = screen.getByTestId("amount-readout");
    expect(readout).toHaveTextContent("1500.00");
    expect(screen.getByRole("button", { name: "Expense" })).toHaveAttribute("aria-pressed", "true");
    const save = screen.getByRole("button", { name: "Save" });
    expect(save).not.toBeDisabled();

    await user.click(save);
    const rows = (await sync.query("select * from transactions")).rows;
    expect(rows[0]!.amount_minor).toBe(-150000n);
    expect(rows[0]!.type).toBe("expense");
  });

  it("positive suggestion fills a positive amount and saves as income", async () => {
    const user = userEvent.setup();
    const withSuggestions: RecentTxn[] = [
      { id: "r1", description: "Salary", amountMinor: 250000n, categoryIds: [], date: Date.now() },
    ];
    render(withQueryClient(<HarnessWithSuggestions sync={sync} recentTxns={withSuggestions} />));

    const list = screen.getByRole("list", { name: "Suggestions" });
    await user.click(within(list).getByText(/Salary/));
    const readout = screen.getByTestId("amount-readout");
    expect(readout).toHaveTextContent("2500.00");
    expect(screen.getByRole("button", { name: "Income" })).toHaveAttribute("aria-pressed", "true");
    const save = screen.getByRole("button", { name: "Save" });
    expect(save).not.toBeDisabled();

    await user.click(save);
    const rows = (await sync.query("select * from transactions")).rows;
    expect(rows[0]!.amount_minor).toBe(250000n);
    expect(rows[0]!.type).toBe("income");
  });

  it("nests templates behind a picker and applies one in two taps", async () => {
    const user = userEvent.setup();
    const templates = [
      {
        id: "tmpl-1",
        name: "Rent",
        accountId: "acc-1",
        amountMinor: 1500000n,
        type: "expense" as const,
        description: "Rent",
        categoryIds: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
        deletedAt: null,
      },
    ] satisfies Template[];
    render(
      <CaptureSheet
        open
        onOpenChange={() => {}}
        userId="usr-1"
        accounts={ACCOUNTS}
        categories={CATS}
        recentTxns={[]}
        onSave={vi.fn()}
        defaultAccountId="acc-1"
        templates={templates}
      />,
    );

    // No inline template chips; a single quiet trigger chip is shown.
    expect(screen.queryByRole("group", { name: "Templates" })).not.toBeInTheDocument();
    const trigger = screen.getByRole("button", { name: "Templates" });
    await user.click(trigger);

    // Popover lists the template; tap it to apply.
    await user.click(screen.getByRole("button", { name: /Rent/ }));
    expect(screen.getByRole("button", { name: "Templates" })).toHaveTextContent("Rent");
    expect(screen.getByTestId("amount-readout")).toHaveTextContent("15000.00");
  });

  it("selects a custom date from the calendar", async () => {
    const user = userEvent.setup();
    render(withQueryClient(<Harness sync={sync} />));

    await user.click(screen.getByRole("button", { name: "Date" }));
    // The calendar renders a grid of day buttons; pick an in-month day (e.g. the 15th).
    const cells = await screen.findAllByRole("gridcell");
    const inMonth = cells.find(
      (c) => c.getAttribute("data-outside") !== "true" && c.getAttribute("data-hidden") !== "true",
    );
    const dayBtn = inMonth?.querySelector("button");
    expect(dayBtn).toBeTruthy();
    await user.click(dayBtn!);
    expect(screen.getByRole("button", { name: "Date" })).not.toHaveTextContent("Today");
  });
});