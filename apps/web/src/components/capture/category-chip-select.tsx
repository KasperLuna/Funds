import { Plus, Tag } from "lucide-react";
import { categoryColor } from "@/lib/categories/categories-store";
import { cn } from "@/lib/utils";

export interface CategoryChipSelectProps {
  /** Categories available to choose from. Sorted alphabetically by name. */
  categories: { id: string; name: string; color?: string | null }[];
  /** Selected category ids. */
  value: string[];
  /** Replace the selected set with the next one. */
  onChange: (next: string[]) => void;
  /** Optional section label rendered above the chip row. */
  label?: string;
  /** Hide the row entirely when there are no categories. Default: true. */
  hideWhenEmpty?: boolean;
  className?: string;
  /** Optional handler that, when provided, renders a trailing "+ New category" button. */
  onCreateCategory?: () => void;
}

const toggle = (value: string[], id: string): string[] =>
  value.includes(id) ? value.filter((c) => c !== id) : [...value, id];

export const CategoryChipSelect = ({
  categories,
  value,
  onChange,
  label = "Categories",
  hideWhenEmpty = true,
  className,
  onCreateCategory,
}: CategoryChipSelectProps) => {
  if (hideWhenEmpty && categories.length === 0 && !onCreateCategory) return null;
  const sorted = [...categories].sort((a, b) => a.name.localeCompare(b.name));
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {label && <span className="text-sm text-zinc-500">{label}</span>}
      <div role="group" aria-label="Categories" className="flex flex-wrap gap-1.5">
        {sorted.map((c) => {
          const active = value.includes(c.id);
          const fill = c.color ?? categoryColor(c.name);
          return (
            <button
              key={c.id}
              type="button"
              aria-pressed={active}
              onClick={() => onChange(toggle(value, c.id))}
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:ring-(--accent) focus-visible:outline-none",
                active
                  ? "text-white"
                  : "bg-(--surface-2) text-zinc-500 hover:text-inherit",
              )}
              style={active ? { backgroundColor: fill } : undefined}
            >
              {active && <Tag className="h-3 w-3" strokeWidth={2.5} aria-hidden />}
              {c.name}
            </button>
          );
        })}
        {onCreateCategory && (
          <button
            type="button"
            aria-label="New category"
            onClick={onCreateCategory}
            className="inline-flex items-center gap-1 rounded-full bg-(--surface-2) px-2.5 py-1 text-xs font-medium text-zinc-500 hover:text-inherit focus-visible:ring-2 focus-visible:ring-(--accent) focus-visible:outline-none"
          >
            <Plus className="h-3 w-3" strokeWidth={2.5} aria-hidden />
            New category
          </button>
        )}
      </div>
    </div>
  );
};
