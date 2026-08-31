"use client";

import { useState } from "react";
import { CalendarDays, Search, Tag } from "lucide-react";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { Category } from "@/lib/categories/categories-store";
import {
  type TxnFilters,
} from "@/lib/banks/filter-txns";

interface FilterPopoverProps {
  children: (controls: { isOpen: boolean; setIsOpen: (open: boolean) => void }) => React.ReactNode;
}

const FilterPopover = ({ children }: FilterPopoverProps) => {
  const [isOpen, setIsOpen] = useState(false);
  return <Popover open={isOpen} onOpenChange={setIsOpen}>{children({ isOpen, setIsOpen })}</Popover>;
};

export type { DateRangeFilter, TxnFilters } from "@/lib/banks/filter-txns";
export { EMPTY_FILTERS, filterTxns } from "@/lib/banks/filter-txns";

function fmtRange(from: number, to: number): string {
  const sameYear = new Date(from).getFullYear() === new Date(to).getFullYear();
  const fromStr = new Date(from).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: sameYear ? undefined : "numeric",
  });
  const toStr = new Date(to).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  return `${fromStr} – ${toStr}`;
}

interface TransactionFiltersProps {
  filters: TxnFilters;
  onChange: (filters: TxnFilters) => void;
  categories: Category[];
  accounts: Array<{ id: string; name: string }>;
}

export const TransactionFilters = (props: TransactionFiltersProps) => {
  const { filters, onChange, categories, accounts } = props;
  const [query, setQuery] = useState(filters.query);
  const hasQuery = filters.query !== "";
  const hasCategory = filters.categoryIds.length > 0;
  const hasDate = filters.date !== null;
  const activeCount =
    (hasQuery ? 1 : 0) + (hasCategory ? 1 : 0) + (hasDate ? 1 : 0);

  const dateLabel = !filters.date ? "All dates" : fmtRange(filters.date.from, filters.date.to);

  const commitQuery = (v: string) => {
    setQuery(v);
    onChange({ ...filters, query: v });
  };

  const toggleCategory = (id: string) => {
    const next = filters.categoryIds.includes(id)
      ? filters.categoryIds.filter((x) => x !== id)
      : [...filters.categoryIds, id];
    onChange({ ...filters, categoryIds: next });
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500"
            aria-hidden
          />
          <Input
            type="search"
            aria-label="Search transactions"
            value={query}
            onChange={(e) => commitQuery(e.target.value)}
            placeholder="Search transactions…"
            className="h-11 w-full pl-9 [&::-webkit-search-cancel-button]:hidden"
          />
        </div>

        {activeCount > 0 && (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              onChange({ query: "", categoryIds: [], date: null });
            }}
            className="shrink-0 rounded-(--radius-md) px-2 py-1.5 text-xs font-medium text-zinc-500 transition-colors hover:text-inherit"
          >
            Clear ({activeCount})
          </button>
        )}
      </div>

      <div className="flex items-center gap-1.5">
        <FilterPopover>
          {({ isOpen: catIsOpen }) => (
            <>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  aria-label="Filter by category"
                  aria-expanded={catIsOpen}
                  className={cn(
                    "inline-flex min-h-11 items-center gap-1.5 rounded-(--radius-md) border px-3 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-(--accent) focus-visible:outline-none",
                    hasCategory
                      ? "border-(--accent) bg-(--accent)/10 text-(--accent)"
                      : "border-(--border) bg-(--surface-2) text-zinc-400 hover:text-inherit",
                  )}
                >
                  <Tag className="h-4 w-4" aria-hidden />
                  {hasCategory
                    ? `${filters.categoryIds.length} categor${filters.categoryIds.length === 1 ? "y" : "ies"}`
                    : "Categories"}
                </button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-56">
                <div className="flex max-h-64 flex-col gap-0.5 overflow-y-auto">
                  {[...categories].sort((a, b) => a.name.localeCompare(b.name)).map((c) => {
                    const active = filters.categoryIds.includes(c.id);
                    return (
                      <button
                        key={c.id}
                        type="button"
                        aria-pressed={active}
                        onClick={() => toggleCategory(c.id)}
                        className={cn(
                          "flex min-h-11 items-center justify-between gap-3 rounded-(--radius-sm) px-3 text-sm transition-colors hover:bg-(--surface-2)",
                          active ? "font-semibold text-inherit" : "text-zinc-400",
                        )}
                      >
                        <span className="flex min-w-0 items-center gap-2">
                          <span
                            className="h-2.5 w-2.5 shrink-0 rounded-full"
                            style={{ backgroundColor: c.color }}
                            aria-hidden
                          />
                          <span className="truncate">{c.name}</span>
                        </span>
                        <span
                          className={cn(
                            "h-4 w-4 shrink-0 rounded-(--radius-sm) border",
                            active ? "border-(--accent) bg-(--accent)" : "border-(--border-strong)",
                          )}
                          aria-hidden
                        />
                      </button>
                    );
                  })}
                </div>
              </PopoverContent>
            </>
          )}
        </FilterPopover>

        <FilterPopover>
          {({ isOpen: dateIsOpen, setIsOpen: setDateIsOpen }) => (
            <>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  aria-label="Filter by date"
                  aria-expanded={dateIsOpen}
                  className={cn(
                    "inline-flex min-h-11 items-center gap-1.5 rounded-(--radius-md) border px-3 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-(--accent) focus-visible:outline-none",
                    hasDate
                      ? "border-(--accent) bg-(--accent)/10 text-(--accent)"
                      : "border-(--border) bg-(--surface-2) text-zinc-400 hover:text-inherit",
                  )}
                >
                  <CalendarDays className="h-4 w-4" aria-hidden />
                  <span className="max-w-36 truncate tabular-nums">{dateLabel}</span>
                </button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-auto min-w-64">
                <div className="flex gap-1.5 p-1">
                  <button
                    type="button"
                    onClick={() => {
                      onChange({ ...filters, date: null });
                      setDateIsOpen(false);
                    }}
                    className={cn(
                      "min-h-11 flex-1 rounded-(--radius-sm) px-3 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-(--accent) focus-visible:outline-none",
                      !hasDate ? "bg-(--surface-2) text-inherit" : "text-zinc-400 hover:bg-(--surface-2) hover:text-inherit",
                    )}
                  >
                    All dates
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const now = new Date();
                      const from = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
                      const to = now.getTime();
                      onChange({ ...filters, date: { from, to } });
                      setDateIsOpen(false);
                    }}
                    className="min-h-11 flex-1 rounded-(--radius-sm) px-3 text-sm font-medium text-zinc-400 transition-colors hover:bg-(--surface-2) hover:text-inherit focus-visible:ring-2 focus-visible:ring-(--accent) focus-visible:outline-none"
                  >
                    This month
                  </button>
                </div>
                <div className="mt-1 border-t border-(--border) pt-1.5">
                  <Calendar
                    mode="range"
                    selected={
                      filters.date
                        ? { from: new Date(filters.date.from), to: new Date(filters.date.to) }
                        : undefined
                    }
                    onSelect={(range) => {
                      if (!range?.from) return;
                      const to = range.to ?? range.from;
                      // Range end is exclusive to the day; extend to end-of-day.
                      const toEnd = new Date(to);
                      toEnd.setHours(23, 59, 59, 999);
                      onChange({ ...filters, date: { from: range.from.getTime(), to: toEnd.getTime() } });
                    }}
                  />
                </div>
              </PopoverContent>
            </>
          )}
        </FilterPopover>

        {accounts.length > 0 && (
          <p className="ml-auto hidden text-xs text-zinc-500 sm:block">
            {accounts.length} account{accounts.length === 1 ? "" : "s"}
          </p>
        )}
      </div>
    </div>
  );
};
