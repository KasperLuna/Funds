// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from "vitest";
import { useState } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom/vitest";
import { MemorySyncDatabase } from "@/lib/sync";
import { TransferSheet, type TransferSheetProps } from "./transfer-sheet";
import { insertTransfer } from "@/lib/transfers/transfer-store";
import type { CategoryOption } from "./capture-sheet";
import type { TransferRows } from "@/lib/capture";

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
globalThis.ResizeObserver ??= ResizeObserverStub as unknown as typeof ResizeObserver;

const ACCOUNTS = [
  { id: "acc-1", name: "Checking", assetId: "ast-1", decimals: 2 },
  { id: "acc-2", name: "Savings", assetId: "ast-2", decimals: 2 },
];

const CATEGORIES: CategoryOption[] = [
  { id: "cat-food", name: "Food" },
  { id: "cat-rent", name: "Rent" },
];

interface HarnessProps {
  onSave: TransferSheetProps["onSave"];
  categories?: CategoryOption[];
  onCreateCategory?: TransferSheetProps["onCreateCategory"];
}

const Harness = ({
  onSave,
  categories = [],
  onCreateCategory,
}: HarnessProps) => {
  const [open, setOpen] = useState(true);
  return (
    <TransferSheet
      isOpen={open}
      onOpenChange={setOpen}

      accounts={ACCOUNTS}
      categories={categories}
      onCreateCategory={onCreateCategory}
      onSave={onSave}
      defaultFromAccountId="acc-1"
    />
  );
};

describe("TransferSheet", () => {
  let sync: MemorySyncDatabase;

  beforeEach(() => {
    sync = new MemorySyncDatabase();
    sync.connect();
  });

  it("keypad drives the readout", async () => {
    const user = userEvent.setup();
    render(<Harness onSave={() => {}} />);
    const readout = screen.getByLabelText("Amount");
    for (const k of ["1", "2", "5"]) await user.click(screen.getByRole("button", { name: k }));
    expect(readout).toHaveValue("125");
  });

  it("save is disabled with zero amount", () => {
    render(<Harness onSave={() => {}} />);
    expect(screen.getByRole("button", { name: "Enter amount" })).toBeDisabled();
  });

  it("same from/to shows validation and blocks save", async () => {
    const user = userEvent.setup();
    render(<Harness onSave={() => {}} />);
    await user.click(screen.getByRole("combobox", { name: "To account" }));
    await user.click(screen.getByRole("option", { name: "Checking" }));
    const btn = screen.getByRole("button", { name: /Origin and destination must differ/ });
    expect(btn).toBeDisabled();
  });

  it("fee disclosure appears only when a fee is entered", async () => {
    const user = userEvent.setup();
    render(<Harness onSave={() => {}} />);
    const fee = screen.getByRole("textbox", { name: "Fee" });
    expect(screen.getByText(/No fee\./)).toBeInTheDocument();
    await user.type(fee, "2.50");
    expect(screen.getByText(/Fee 2\.50 is deducted from Checking/)).toBeInTheDocument();
  });

  it("writes transfer, two legs and fee row locally", async () => {
    const user = userEvent.setup();
    const saved: TransferRows[] = [];
    render(
      <Harness
        onSave={(rows) => {
          saved.push(rows);
          void insertTransfer(sync, rows);
        }}
      />,
    );

    for (const k of ["5", "0"]) await user.click(screen.getByRole("button", { name: k }));
    await user.type(screen.getByRole("textbox", { name: "Fee" }), "1.50");
    await user.click(screen.getByRole("button", { name: "Transfer" }));

    const txns = (await sync.query("select * from transactions")).rows;
    expect(txns).toHaveLength(3);
    const from = txns.find((t) => t.account_id === "acc-1" && t.amount_minor === -5000n);
    const fee = txns.find((t) => t.amount_minor === -150n);
    const to = txns.find((t) => t.account_id === "acc-2");
    expect(from).toBeTruthy();
    expect(to!.amount_minor).toBe(5000n);
    expect(to!.type).toBe("income");
    expect(fee).toBeTruthy();

    const transfers = (await sync.query("select * from transfers")).rows;
    expect(transfers).toHaveLength(1);
    expect(transfers[0]!.fee_transaction_id).toBe(fee!.id);
    expect(from!.transfer_id).toBe(transfers[0]!.id);
    expect(to!.transfer_id).toBe(transfers[0]!.id);
  });

  it("selected categories are applied to both legs", async () => {
    const user = userEvent.setup();
    const saved: TransferRows[] = [];
    render(
      <Harness
        categories={CATEGORIES}
        onSave={(rows) => {
          saved.push(rows);
        }}
      />,
    );

    for (const k of ["5", "0"]) await user.click(screen.getByRole("button", { name: k }));
    await user.click(screen.getByRole("button", { name: "Food" }));
    await user.click(screen.getByRole("button", { name: "Rent" }));
    await user.click(screen.getByRole("button", { name: "Transfer" }));

    expect(saved).toHaveLength(1);
    expect(saved[0]!.fromLeg.category_ids).toEqual(["cat-food", "cat-rent"]);
    expect(saved[0]!.toLeg.category_ids).toEqual(["cat-food", "cat-rent"]);
  });

  it("inline-created category is persisted, auto-selected, and applied to both legs", async () => {
    const user = userEvent.setup();
    const created: unknown[] = [];
    const saved: TransferRows[] = [];
    render(
      <Harness
        categories={CATEGORIES}
        onCreateCategory={(c) => {
          created.push(c);
          void sync.table("categories").upsert({
            id: c.id,
            user_id: "usr-1",
            name: c.name,
            color: c.color,
            hideable: 0,
            exclude_from_analytics: 0,
            monthly_budget_minor: null,
            asset_id: null,
            created_at: c.createdAt,
            updated_at: c.updatedAt,
            deleted_at: null,
          });
        }}
        onSave={(rows) => {
          saved.push(rows);
          void insertTransfer(sync, rows);
        }}
      />,
    );

    for (const k of ["5", "0"]) await user.click(screen.getByRole("button", { name: k }));
    await user.click(screen.getByRole("button", { name: "New category" }));
    await user.type(screen.getByRole("textbox", { name: "New category name" }), "Coffee");
    await user.click(screen.getByRole("button", { name: "Create" }));
    await user.click(screen.getByRole("button", { name: "Transfer" }));

    expect(created).toHaveLength(1);
    expect(created[0]).toMatchObject({ name: "Coffee" });
    const newId = (created[0] as { id: string }).id;

    const categories = (await sync.query("SELECT * FROM categories")).rows;
    expect(categories).toHaveLength(1);
    expect(categories[0]!.id).toBe(newId);
    expect(categories[0]!.name).toBe("Coffee");

    expect(saved).toHaveLength(1);
    expect(saved[0]!.fromLeg.category_ids).toEqual([newId]);
    expect(saved[0]!.toLeg.category_ids).toEqual([newId]);

    const txns = (await sync.query("select * from transactions")).rows;
    const tagged = txns.filter((t) => {
      const ids = (t.category_ids as unknown as string[] | undefined) ?? [];
      return ids.includes(newId);
    });
    expect(tagged).toHaveLength(2);
  });

  it("mobile keypad stays visible when a text input gains focus", async () => {
    const user = userEvent.setup();
    render(<Harness onSave={() => {}} />);
    // The mobile keypad is pinned to the sheet footer and never collapses —
    // previously the wrapper hid itself via max-h-0 + aria-hidden while a
    // text input was focused, but vaul's repositionInputs handler left the
    // drawer shrunken on blur. Now the keypad is always visible and the
    // browser scrolls the focused field into view inside the sheet's
    // overflow-y-auto region.
    const key = screen.getByRole("button", { name: "5" });
    expect(key).toBeVisible();

    const fee = screen.getByRole("textbox", { name: "Fee" });
    await user.click(fee);
    expect(key).toBeVisible();
  });
});
