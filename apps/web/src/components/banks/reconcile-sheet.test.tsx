// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom/vitest";
import { ReconcileSheet } from "./reconcile-sheet";
import type { Account } from "@/lib/accounts/accounts-store";

// cavetail: jsdom lacks ResizeObserver (radix) + pointer-capture/scrollIntoView (vaul)
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
globalThis.ResizeObserver ??= ResizeObserverStub as unknown as typeof ResizeObserver;
const elementProto = Element.prototype as unknown as Record<string, unknown>;
if (typeof elementProto.scrollIntoView !== "function") {
  elementProto.scrollIntoView = function () {};
}
if (typeof elementProto.hasPointerCapture !== "function") {
  elementProto.hasPointerCapture = function () {
    return false;
  };
}
if (typeof elementProto.setPointerCapture !== "function") {
  elementProto.setPointerCapture = function () {};
}
if (typeof elementProto.releasePointerCapture !== "function") {
  elementProto.releasePointerCapture = function () {};
}

const ACCOUNT: Account = {
  id: "a1",
  name: "Main Checking",
  kind: "bank",
  assetId: "ast-1",
  openingBalanceMinor: 0n,
  createdAt: Date.now(),
  updatedAt: Date.now(),
};

function harness(currentBalance: bigint, onSave = vi.fn()) {
  const utils = render(
    <ReconcileSheet
      isOpen
      onOpenChange={vi.fn()}
      account={ACCOUNT}
      currentBalance={currentBalance}
      assetCode="USD"
      assetDecimals={2}
      userId="usr-1"
      onSave={onSave}
    />,
  );
  return { onSave, ...utils };
}

describe("ReconcileSheet", () => {
  it("explains the projected delta when a higher balance is entered", async () => {
    const user = userEvent.setup();
    harness(10000n); // $100.00 recorded
    for (const k of ["1", "2", "5"]) await user.click(screen.getByRole("button", { name: k }));
    const matches = screen.getAllByText((_, node) =>
      !!node?.textContent?.includes("will add $25.00 to Main Checking as income"),
    );
    expect(matches.length).toBeGreaterThan(0);
  });

  it("posts an income transaction for a positive delta", async () => {
    const user = userEvent.setup();
    const { onSave } = harness(10000n);
    for (const k of ["1", "2", "5"]) await user.click(screen.getByRole("button", { name: k }));
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(onSave).toHaveBeenCalledTimes(1);
    const row = onSave.mock.calls[0]![0] as Record<string, unknown>;
    expect(row.type).toBe("income");
    expect(row.amount_minor).toBe(2500);
    expect(row.account_id).toBe("a1");
  });

  it("posts an expense transaction for a negative delta", async () => {
    const user = userEvent.setup();
    const { onSave } = harness(10000n);
    for (const k of ["5", "0"]) await user.click(screen.getByRole("button", { name: k }));
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(onSave).toHaveBeenCalledTimes(1);
    const row = onSave.mock.calls[0]![0] as Record<string, unknown>;
    expect(row.type).toBe("expense");
    // buildTransactionRow signs expense transactions negative in minor units
    expect(row.amount_minor).toBe(-5000);
  });

  it("disables save when the entered balance matches", async () => {
    const user = userEvent.setup();
    harness(10000n);
    for (const k of ["1", "0", "0"]) await user.click(screen.getByRole("button", { name: k }));
    const save = screen.getByRole("button", { name: "Save" });
    expect(save).toBeDisabled();
  });

  it("guards against an undefined account", () => {
    const { container } = render(
      <ReconcileSheet
        isOpen
        onOpenChange={vi.fn()}
        account={undefined as unknown as Account}
        currentBalance={0n}
        userId="usr-1"
        onSave={vi.fn()}
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("renders recorded balance", () => {
    harness(12345n);
    expect(screen.getAllByText("$123.45").length).toBeGreaterThan(0);
  });

  it("typing in the desktop input clears on a fresh open", async () => {
    const onOpenChange = vi.fn();
    const { rerender } = render(
      <ReconcileSheet
        isOpen
        onOpenChange={onOpenChange}
        account={ACCOUNT}
        currentBalance={0n}
        userId="usr-1"
        onSave={vi.fn()}
      />,
    );
    const input = screen.getByRole("textbox", { name: "New balance" });
    fireEvent.change(input, { target: { value: "42" } });
    expect(input).toHaveValue("42");
    rerender(
      <ReconcileSheet
        isOpen={false}
        onOpenChange={onOpenChange}
        account={ACCOUNT}
        currentBalance={0n}
        userId="usr-1"
        onSave={vi.fn()}
      />,
    );
    rerender(
      <ReconcileSheet
        isOpen
        onOpenChange={onOpenChange}
        account={ACCOUNT}
        currentBalance={0n}
        userId="usr-1"
        onSave={vi.fn()}
      />,
    );
    expect(screen.getByRole("textbox", { name: "New balance" })).toHaveValue("");
  });
});