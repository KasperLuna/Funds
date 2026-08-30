"use client";

import { Keypad, type DigitKey } from "@/components/capture/keypad";
import { Button } from "@/components/ui/button";
import { AmountInput } from "@/components/capture/amount-input";
import {
  sanitizeAmountInput,
  amountToMinor,
  type AmountState,
  type RecentTxn,
} from "@/lib/capture";
import type { AccountOption } from "@/components/capture/capture-sheet";

export interface CaptureAmountKeypadProps {
  amount: AmountState;
  onAmountInputChange: (next: AmountState) => void;
  onKey: (key: DigitKey) => void;
  onBackspace: () => void;
  onClear: () => void;
  onSave: () => void;
  canSave: boolean;
  selected: AccountOption | undefined;
  type: "income" | "expense";
  suggestions: RecentTxn[];
  onApplySuggestion: (txn: RecentTxn) => void;
  decimals: number;
}

export const CaptureAmountKeypad = (props: CaptureAmountKeypadProps) => {
  const {
    amount,
    onAmountInputChange,
    onKey,
    onBackspace,
    onClear,
    onSave,
    canSave,
    selected,
    type,
    suggestions,
    onApplySuggestion,
    decimals,
  } = props;

  return (
    <>
      {/* Hero — the amount readout, the one dominant plate. */}
      <AmountInput
        className="mt-4"
        assetCode={selected?.assetCode}
        tone={type === "expense" ? "danger" : "accent"}
        value={amount.input}
        // cavetail: display-only formatting, not arithmetic
        display={(Number(amountToMinor(amount)) / 10 ** decimals).toFixed(decimals)}
        onChange={(v) => onAmountInputChange({ ...amount, input: sanitizeAmountInput(v, amount.decimals) })}
        sanitize={(v) => v}
        decimals={decimals}
        aria-label="Amount"
        autoFocus
      />

      {/* Quick-fill zone — suggestions (recent repeats) below the hero. */}
      {suggestions.length > 0 && (
        <div className="mt-3 flex gap-1.5 overflow-x-auto" role="list" aria-label="Suggestions">
          {suggestions.map((s) => (
            <button
              key={s.id}
              type="button"
              role="listitem"
              onClick={() => onApplySuggestion(s)}
              className="flex-shrink-0 rounded-(--radius-sm) px-2.5 py-1.5 text-sm font-medium text-zinc-400 transition-colors duration-150 ease-out hover:text-inherit focus-visible:ring-2 focus-visible:ring-(--accent) focus-visible:outline-none"
            >
              {s.description}{" "}
              <span className="font-semibold tabular-nums text-zinc-200">
                {/* cavetail: display-only formatting, not arithmetic */}
                {/* eslint-disable-next-line local/no-money-float */}
                {(Number(s.amountMinor) / 10 ** decimals).toFixed(decimals)}
              </span>
            </button>
          ))}
        </div>
      )}

      <div className="mt-5 sm:hidden">
        <Keypad
          onKey={onKey}
          onBackspace={onBackspace}
          onClear={onClear}
          onSave={onSave}
          canSave={canSave}
          currencySymbol={selected?.assetCode === "USD" ? "$" : undefined}
        />
      </div>

      <div className="hidden sm:block">
        <Button
          size="lg"
          className="mt-5 w-full"
          disabled={!canSave}
          onClick={onSave}
          aria-label="Save transaction"
        >
          {canSave ? "Save" : "Enter amount"}
        </Button>
      </div>
    </>
  );
};
