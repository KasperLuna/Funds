// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from "vitest";
import { useState } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom/vitest";
import { MemorySyncDatabase } from "@/lib/sync";
import { TransferSheet, type TransferSheetProps } from "./TransferSheet";
import { insertTransfer } from "@/lib/transfers/transfer-store";
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

function Harness({ onSave }: { onSave: TransferSheetProps["onSave"] }) {
  const [open, setOpen] = useState(true);
  return (
    <TransferSheet
      open={open}
      onOpenChange={setOpen}
      userId="usr-1"
      accounts={ACCOUNTS}
      onSave={onSave}
      defaultFromAccountId="acc-1"
    />
  );
}

describe("TransferSheet", () => {
  let sync: MemorySyncDatabase;

  beforeEach(() => {
    sync = new MemorySyncDatabase();
    sync.connect();
  });

  it("keypad drives the readout", async () => {
    const user = userEvent.setup();
    render(<Harness onSave={() => {}} />);
    const readout = screen.getByTestId("amount-readout");
    for (const k of ["1", "2", "5"]) await user.click(screen.getByRole("button", { name: k }));
    expect(readout).toHaveTextContent("125.00");
  });

  it("save is disabled with zero amount", () => {
    render(<Harness onSave={() => {}} />);
    expect(screen.getByRole("button", { name: "Enter amount" })).toBeDisabled();
  });

  it("same from/to shows validation and blocks save", async () => {
    const user = userEvent.setup();
    render(<Harness onSave={() => {}} />);
    await user.selectOptions(screen.getByRole("combobox", { name: "To account" }), "acc-1");
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
});
