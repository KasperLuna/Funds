"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Keypad, type DigitKey } from "@/components/capture/keypad";
import {
  emptyAmount,
  digit as applyDigit,
  backspace,
  clearAmount,
  amountToMinor,
  sanitizeAmountInput,
  buildTransactionRow,
  type AmountState,
} from "@/lib/capture";
import { formatMoney } from "@/lib/money";
import type { Account } from "@/lib/accounts/accounts-store";

interface ReconcileSheetProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  account: Account;
  currentBalance: bigint;
  assetCode?: string;
  assetDecimals?: number;
  userId: string;
  onSave: (row: Record<string, unknown>) => void;
}

function deltaLabel(delta: bigint): "income" | "expense" | null {
  if (delta > 0n) return "income";
  if (delta < 0n) return "expense";
  return null;
}

interface ReconcileFormProps {
  onOpenChange: (open: boolean) => void;
  account: Account;
  currentBalance: bigint;
  assetCode?: string;
  assetDecimals: number;
  userId: string;
  onSave: (row: Record<string, unknown>) => void;
}

const ReconcileForm = ({
  onOpenChange,
  account,
  currentBalance,
  assetCode,
  assetDecimals,
  userId,
  onSave,
}: ReconcileFormProps) => {
  const decimals = assetDecimals;
  const [amount, setAmount] = useState<AmountState>(() => emptyAmount(decimals));

  const enteredMinor = amountToMinor(amount);
  const delta = enteredMinor - currentBalance;
  const direction = deltaLabel(delta);
  const absDelta = delta < 0n ? -delta : delta;
  const canSave = delta !== 0n;

  const save = () => {
    if (!direction || !canSave) return;
    onSave(
      buildTransactionRow({
        type: direction,
        amountMinor: absDelta,
        accountId: account.id,
        assetId: account.assetId,
        userId,
        categoryIds: [],
        description: "Balance adjustment",
        date: new Date(),
      }),
    );
    onOpenChange(false);
  };

  const currentLabel = formatMoney(currentBalance, decimals, assetCode);
  const enteredLabel = formatMoney(enteredMinor, decimals, assetCode);

  return (
    <Sheet open onOpenChange={onOpenChange}>
      <SheetContent className="flex flex-col gap-4">
        <SheetTitle>Adjust balance</SheetTitle>
        <SheetDescription>
          Match {account.name} to your real balance
        </SheetDescription>

        <div className="mt-3 flex items-center justify-between rounded-(--radius-md) border border-(--border) bg-(--surface-2) px-3 py-2.5">
          <span className="text-sm text-zinc-400">Recorded balance</span>
          <span className="text-sm font-semibold tabular-nums">
            {currentLabel}
          </span>
        </div>

        <div className="guilloche relative mt-2 rounded-(--radius-md) border border-(--border) px-4 py-4">
          <div className="flex items-baseline justify-end gap-2">
            {assetCode && (
              <span
                aria-hidden
                className="font-display text-2xl font-semibold text-zinc-400"
              >
                {assetCode === "USD" ? "$" : `${assetCode} `}
              </span>
            )}
            <div
              data-testid="reconcile-readout"
              aria-live="polite"
              className="text-display-sm [font-variant-numeric:tabular-nums] text-zinc-50"
            >
              <span className="sm:hidden">{enteredMinor === 0n ? "0" : enteredLabel}</span>
              <input
                aria-label="New balance"
                inputMode="decimal"
                value={amount.input}
                onChange={(e) =>
                  setAmount((s) => ({ ...s, input: sanitizeAmountInput(e.target.value, s.decimals) }))
                }
                placeholder="0"
                className="hidden w-full min-w-0 bg-transparent text-right font-display outline-none placeholder:text-zinc-600 sm:inline-block"
              />
            </div>
          </div>
        </div>

        <div aria-live="polite" className="mt-3 rounded-(--radius-md) border border-(--border) bg-(--surface-2) px-3 py-2.5 text-sm">
          {delta === 0n ? (
            <span className="text-zinc-400">
              Enter your observed balance. Nothing to post when it matches.
            </span>
          ) : direction === "income" ? (
            <span className="text-(--accent)">
              This will add{" "}
              <strong className="font-semibold tabular-nums">
                {formatMoney(absDelta, decimals, assetCode)}
              </strong>{" "}
              to {account.name} as income.
            </span>
          ) : (
            <span className="text-(--danger)">
              This will remove{" "}
              <strong className="font-semibold tabular-nums">
                {formatMoney(absDelta, decimals, assetCode)}
              </strong>{" "}
              from {account.name} as an expense.
            </span>
          )}
        </div>

        <div className="sm:hidden">
          <Keypad
            onKey={(k: DigitKey) => setAmount((s) => applyDigit(s, k))}
            onBackspace={() => setAmount(backspace)}
            onClear={() => setAmount(clearAmount)}
            onSave={save}
            canSave={canSave}
            currencySymbol={assetCode === "USD" ? "$" : undefined}
          />
        </div>

        <div className="hidden sm:block">
          <Button
            size="lg"
            className="mt-3 w-full"
            disabled={!canSave}
            onClick={save}
            aria-label="Save balance adjustment"
          >
            {canSave ? "Save adjustment" : "Enter new balance"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};

/**
 * Balance reconciliation (logic.md §4.4). The user enters their observed
 * real-world balance; a single income/expense transaction is posted for the
 * difference so the recorded balance matches reality.
 */
export const ReconcileSheet = (props: ReconcileSheetProps) => {
  const { isOpen, onOpenChange, account, currentBalance, assetCode, assetDecimals, userId, onSave } = props;
  // Hooks must run unconditionally. Guard the render output instead, so an
  // undefined account (e.g. empty account list) can never break the rules.
  const decimals = assetDecimals ?? 2;
  if (!account) return null;
  if (!isOpen) return null;
  return (
    <ReconcileForm
      onOpenChange={onOpenChange}
      account={account}
      currentBalance={currentBalance}
      assetCode={assetCode}
      assetDecimals={decimals}
      userId={userId}
      onSave={onSave}
    />
  );
};
