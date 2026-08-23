import { Delete, Check } from "lucide-react";
import { cn } from "@/lib/utils";

export type DigitKey = "0" | "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "00" | ".";

export type KeypadProps = {
  onKey: (k: DigitKey) => void;
  onBackspace: () => void;
  onClear: () => void;
  onSave: () => void;
  canSave?: boolean;
  currencySymbol?: string;
  disabled?: boolean;
};

const ARIA_LABEL: Partial<Record<DigitKey | "back" | "clear" | "save", string>> = {
  ".": "Decimal point",
  "00": "00",
  back: "Backspace",
  clear: "Clear",
  save: "Save",
};

const keyCls =
  "min-h-14 rounded-(--radius-md) border border-(--border) bg-(--surface-2) font-display text-xl font-semibold tracking-tight text-zinc-100 hover:bg-(--surface-3) active:scale-[0.96] focus-visible:ring-2 focus-visible:ring-(--accent) focus-visible:outline-none disabled:opacity-50 transition-[background-color,transform] duration-150 ease-out";

export function Keypad({
  onKey,
  onBackspace,
  onClear,
  onSave,
  canSave = false,
  currencySymbol,
  disabled,
}: KeypadProps) {
  const press = (k: DigitKey) => () => onKey(k);
  const digit = (label: DigitKey) => (
    <button
      key={label}
      type="button"
      aria-label={ARIA_LABEL[label] ?? label}
      className={keyCls}
      onClick={press(label)}
      disabled={disabled}
    >
      {label}
    </button>
  );
  const fn = (label: "back" | "clear", onClick: () => void) => (
    <button
      key={label}
      type="button"
      aria-label={ARIA_LABEL[label]}
      className={cn(keyCls, "text-zinc-400")}
      onClick={onClick}
      disabled={disabled}
    >
      {label === "back" ? (
        <Delete className="mx-auto h-5 w-5" aria-hidden />
      ) : (
        <span className="text-base font-bold">C</span>
      )}
    </button>
  );

  return (
    <div role="group" aria-label="Amount keypad" className="grid grid-cols-4 gap-1.5">
      {digit("1")}
      {digit("2")}
      {digit("3")}
      {fn("back", onBackspace)}
      {digit("4")}
      {digit("5")}
      {digit("6")}
      {digit(".")}
      {digit("7")}
      {digit("8")}
      {digit("9")}
      {digit("00")}
      {fn("clear", onClear)}
      {digit("0")}
      <button
        type="button"
        aria-label={ARIA_LABEL.save}
        className={cn(
          "col-span-2 min-h-14 rounded-(--radius-md) font-display text-lg tracking-tight transition-[background-color,transform,filter] duration-150 ease-out focus-visible:ring-2 focus-visible:ring-(--accent) focus-visible:outline-none",
          canSave
            ? "bg-(--accent) font-bold text-(--accent-foreground) hover:brightness-110 active:scale-[0.97]"
            : "cursor-not-allowed border border-(--border) bg-(--surface-2) font-semibold text-zinc-500",
        )}
        onClick={onSave}
        disabled={!canSave || disabled}
      >
        {canSave ? (
          <span className="inline-flex items-center gap-1.5">
            {currencySymbol ? `${currencySymbol} ` : ""}
            <Check className="h-5 w-5" strokeWidth={3} aria-hidden />
          </span>
        ) : (
          "Enter amount"
        )}
      </button>
    </div>
  );
}
