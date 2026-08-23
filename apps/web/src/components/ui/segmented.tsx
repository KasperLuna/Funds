import { cn } from "@/lib/utils";

export type SegmentOption<T extends string> = {
  value: T;
  label: string;
  ariaLabel?: string;
};

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  className,
}: {
  options: SegmentOption<T>[];
  value: T;
  onChange: (v: T) => void;
  className?: string;
}) {
  return (
    <div
      role="group"
      className={cn(
        "inline-flex items-center gap-0.5 rounded-(--radius-md) border border-(--border) bg-(--surface-2) p-0.5",
        className,
      )}
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            aria-pressed={active}
            aria-label={opt.ariaLabel ?? opt.label}
            onClick={() => onChange(opt.value)}
            className={cn(
              "min-h-11 rounded-(--radius-sm) px-4 text-sm transition-colors duration-150 ease-out focus-visible:ring-2 focus-visible:ring-(--accent) focus-visible:outline-none",
              active
                ? "bg-(--surface-3) font-semibold text-(--accent)"
                : "font-medium text-zinc-500 hover:text-inherit",
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
