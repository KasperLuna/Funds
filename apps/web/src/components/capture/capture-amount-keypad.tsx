"use client";

import type { DigitKey } from "@/components/capture/keypad";
import { AmountInput } from "@/components/capture/amount-input";
import {
  sanitizeAmountInput,
  amountToMinor,
  type AmountState,
  type RecentTxn,
} from "@/lib/capture";
import type { AccountOption } from "@/components/capture/capture-sheet";
import { cn } from "@/lib/utils";

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
  onTypeChange: (next: "income" | "expense") => void;
  suggestions: RecentTxn[];
  onApplySuggestion: (txn: RecentTxn) => void;
  decimals: number;
  /** When true, suppress top margin — used inside a scrollable sheet region. */
  compact?: boolean;
  /** Forwarded to the outer wrapper. Use to size the readout inside a flex row. */
  className?: string;
}

export const CaptureAmountKeypad = (props: CaptureAmountKeypadProps) => {
  const {
    amount,
    onAmountInputChange,
    selected,
    type,
    onTypeChange,
    suggestions,
    onApplySuggestion,
    decimals,
    compact,
    className,
  } = props;

  return (
    <div className={cn(compact ? "" : "mt-4", className)}>
      {/* Type — Expense | Income. A small modifier row above the amount
          hero, not a sibling of it: the type colours the amount readout
          (red/green) so the two read as one statement without competing
          for width on mobile. */}
      <div role="group" aria-label="Type" className="flex justify-center">
        <div className="inline-flex items-center gap-0.5 rounded-(--radius-md) border border-(--border) bg-(--surface-2) p-0.5">
          {(["expense", "income"] as const).map((value) => {
            const active = type === value;
            const activeColor = value === "expense" ? "text-(--danger)" : "text-(--accent)";
            return (
              <button
                key={value}
                type="button"
                aria-pressed={active}
                onClick={() => onTypeChange(value)}
                className={cn(
                  "min-h-9 rounded-(--radius-sm) px-4 text-sm transition-colors duration-150 ease-out focus-visible:ring-2 focus-visible:ring-(--accent) focus-visible:outline-none",
                  active
                    ? cn("bg-(--surface-3) font-semibold", activeColor)
                    : "font-medium text-zinc-500 hover:text-inherit",
                )}
              >
                {value === "expense" ? "Expense" : "Income"}
              </button>
            );
          })}
        </div>
      </div>

      {/* Hero — the amount readout, the one dominant plate. */}
      <AmountInput
        className="mt-3"
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
    </div>
  );
};
