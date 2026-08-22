import { cn } from "@/lib/utils";

export type DigitKey = "0" | "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "00" | ".";

export type KeypadProps = {
  onKey: (k: DigitKey) => void;
  onBackspace: () => void;
  onClear: () => void;
  disabled?: boolean;
};

const ARIA_LABEL: Partial<Record<DigitKey | "back" | "clear", string>> = {
  ".": "Decimal point",
  "00": "00",
  back: "Backspace",
  clear: "Clear",
};

const keyCls =
  "min-h-12 rounded-(--radius-md) bg-(--surface-2) text-lg hover:bg-(--surface-3) focus-visible:ring-2 focus-visible:ring-(--accent) focus-visible:outline-none disabled:opacity-50 transition-colors";

export function Keypad({ onKey, onBackspace, onClear, disabled }: KeypadProps) {
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
      className={cn(keyCls, "text-base")}
      onClick={onClick}
      disabled={disabled}
    >
      {label === "back" ? "⌫" : "C"}
    </button>
  );

  return (
    <div role="group" aria-label="Amount keypad" className="grid grid-cols-4 gap-2">
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
      <div className="col-span-2" />
    </div>
  );
}