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
        "inline-flex items-center rounded-(--radius-md) bg-(--surface-2) p-1",
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
              "min-h-11 rounded-(--radius-sm) px-4 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-(--accent) focus-visible:outline-none",
              active
                ? "bg-(--surface-1) text-(--accent)"
                : "text-slate-400 hover:text-inherit",
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}