"use client";

import { cn } from "@/lib/utils";

export interface AmountInputProps {
  /** The asset code to render on the left (e.g. "PHP", "USD", "BTC"). Optional. */
  assetCode?: string;
  /** tint of the asset label + number. Defaults to foreground. */
  tone?: "foreground" | "accent" | "danger";
  /**
   * The displayed number. Always a string. On mobile (keypad-driven) this
   * comes from the parent form's keystroke buffer; on desktop the user types
   * here directly. The number is always right-aligned and the input owns
   * `min-w-0 flex-1` so it can never be pushed off the plate.
   */
  value: string;
  /**
   * The pre-formatted number to show on mobile (where the input is hidden
   * and the keypad drives the buffer). The keypad buffer is a partial
   * keystroke string like "1" or "1.5"; `display` is the canonical formatted
   * string for the buffer ("1.00000000" for an 8-decimal account). If
   * omitted, the raw `value` is shown.
   */
  display?: string;
  /** Called on every keystroke with the sanitized buffer. */
  onChange: (next: string) => void;
  /** Sanitizer: receives the raw input, returns the cleaned buffer. */
  sanitize: (raw: string) => string;
  /** Decimals the displayed number can have — drives maxLength cap. */
  decimals: number;
  /** ARIA label for the input. */
  "aria-label"?: string;
  /** Optional className for the outer plate. */
  className?: string;
  /** Auto-focus the input on mount (desktop only). */
  autoFocus?: boolean;
  /** Test id forwarded to the readout wrapper. */
  testId?: string;
}

const toneClass: Record<NonNullable<AmountInputProps["tone"]>, string> = {
  foreground: "text-zinc-50",
  accent: "text-(--accent)",
  danger: "text-(--danger)",
};

const labelToneClass: Record<NonNullable<AmountInputProps["tone"]>, string> = {
  foreground: "text-zinc-500",
  accent: "text-(--accent)/70",
  danger: "text-(--danger)/70",
};

/**
 * Unified amount hero plate. Used by capture, transfer, and trade.
 *
 * Layout: a guilloche-bordered plate with a 2-cell row. Asset code sits on
 * the left in a fixed-width cell with a 1px hairline divider; the number
 * fills the right cell, right-aligned, and never gets pushed off the plate
 * because it owns `min-w-0 flex-1`. Same shape on mobile and desktop, so the
 * three capture paths read as one family.
 *
 * On mobile the keypad drives the number, so we render a read-only span
 * (no input, no soft keyboard, no autofocus). On desktop the user types,
 * so we render a real <input>. Both paths produce the same visual.
 */
export const AmountInput = (props: AmountInputProps) => {
  const {
    assetCode,
    tone = "foreground",
    value,
    display,
    onChange,
    sanitize,
    decimals,
    "aria-label": ariaLabel = "Amount",
    className,
    autoFocus,
    testId,
  } = props;
  return (
    <div
      className={cn(
        "guilloche relative flex items-stretch rounded-(--radius-md) border border-(--border)",
        className,
      )}
    >
      {assetCode ? (
        <div
          aria-hidden
          className={cn(
            "flex shrink-0 items-center pl-4 pr-3 text-display-sm font-semibold tracking-tight",
            labelToneClass[tone],
          )}
        >
          {assetCode}
        </div>
      ) : null}
      {assetCode ? (
        <div aria-hidden className="my-3 w-px self-stretch bg-white/10" />
      ) : null}
      <div
        data-testid={testId ?? "amount-readout"}
        aria-live="polite"
        className={cn(
          "flex min-w-0 flex-1 items-center justify-end overflow-hidden px-4 py-3 text-display-sm font-semibold tracking-tight tabular-nums",
          toneClass[tone],
        )}
      >
        {/* Mobile: keypad drives the buffer, span displays it (formatted). */}
        <span className="truncate text-right sm:hidden">
          {(display ?? value) || "0"}
        </span>
        {/* Desktop: user types. */}
        <input
          type="text"
          inputMode="decimal"
          aria-label={ariaLabel}
          autoFocus={autoFocus}
          value={value}
          onChange={(e) => onChange(sanitize(e.target.value))}
          placeholder="0"
          maxLength={decimals + 16}
          className="hidden min-w-0 flex-1 border-0 bg-transparent text-right font-display text-inherit outline-none placeholder:text-zinc-600 focus:ring-0 sm:block"
        />
      </div>
    </div>
  );
};
