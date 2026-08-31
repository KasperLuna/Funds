import { Fragment, useMemo, useState, useRef } from "react";
import type { Txn } from "@/lib/accounts/accounts-store";
import { groupByDay } from "@/lib/accounts/accounts-store";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { TransactionRow } from "./transaction-row";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { useUrlString, useUrlSet } from "@/lib/url/use-url-state";

type CategoryInfo = { id: string; name: string; color: string };

const ROW_HEIGHT = 72;
const VISIBLE_BUFFER = 5;

function formatMinor(cents: bigint): string {
  const sign = cents < 0n ? "-" : "";
  const abs = cents < 0n ? -cents : cents;
  const major = Number(abs) / 100;
  return `${sign}$${major.toFixed(2)}`;
}

function formatDayHeader(day: string): string {
  const [year, month, dayNum] = day.split("-").map(Number);
  const date = new Date(year!, month! - 1, dayNum);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === today.toDateString()) return "Today";
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";

  return date.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function getMonthOptions(txns: Txn[]): Array<{ value: string; label: string }> {
  const months = new Set<string>();
  for (const txn of txns) {
    if (txn.deletedAt) continue;
    const d = new Date(txn.date);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    months.add(key);
  }
  return [...months]
    .sort()
    .reverse()
    .map((m) => {
      const [y, mo] = m.split("-").map(Number);
      const date = new Date(y!, mo! - 1);
      return {
        value: m,
        label: date.toLocaleDateString(undefined, {
          month: "short",
          year: "numeric",
        }),
      };
    });
}

interface VirtualListProps {
  groups: Array<{ day: string; items: Txn[] }>;
  categories: CategoryInfo[];
  onDuplicate?: (txn: Txn) => void;
  onDelete?: (txn: Txn) => void;
}

const VirtualList = (props: VirtualListProps) => {
  const { groups, categories, onDuplicate, onDelete } = props;
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);

  const flatItems = useMemo(() => {
    const items: Array<
      { type: "header"; day: string; height: number } | { type: "txn"; txn: Txn; height: number }
    > = [];
    for (const group of groups) {
      items.push({ type: "header", day: group.day, height: 36 });
      for (const txn of group.items) {
        items.push({ type: "txn", txn, height: ROW_HEIGHT });
      }
    }
    return items;
  }, [groups]);

  const totalHeight = useMemo(
    () => flatItems.reduce((sum, item) => sum + item.height, 0),
    [flatItems],
  );

  // cavetail: handleScroll is the scroll listener for the virtual list; the
  // div isn't memoized but the listener reference is cheap and React's
  // event system handles identity changes. Inline.
  const handleScroll = () => {
    if (containerRef.current) {
      setScrollTop(containerRef.current.scrollTop);
    }
  };

  const startIndex = useMemo(() => {
    let height = 0;
    for (let i = 0; i < flatItems.length; i++) {
      height += flatItems[i]!.height;
      if (height > scrollTop - ROW_HEIGHT * VISIBLE_BUFFER) return i;
    }
    return 0;
  }, [scrollTop, flatItems]);

  const endIndex = useMemo(() => {
    const containerHeight = containerRef.current?.clientHeight ?? 600;
    let height = 0;
    for (let i = startIndex; i < flatItems.length; i++) {
      height += flatItems[i]!.height;
      if (height > containerHeight + ROW_HEIGHT * VISIBLE_BUFFER * 2) return i;
    }
    return flatItems.length;
  }, [startIndex, flatItems]);

  const visibleItems = useMemo(
    () => flatItems.slice(startIndex, endIndex),
    [flatItems, startIndex, endIndex],
  );

  const offsetY = useMemo(() => {
    let height = 0;
    for (let i = 0; i < startIndex; i++) {
      height += flatItems[i]!.height;
    }
    return height;
  }, [startIndex, flatItems]);

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className="h-full overflow-y-auto"
      data-testid="virtual-list"
    >
      <div style={{ height: totalHeight, position: "relative" }}>
        <div style={{ transform: `translateY(${offsetY}px)` }}>
          {visibleItems.map((item) =>
            item.type === "header" ? (
              <div
                key={item.day}
                className="sticky top-0 z-10 bg-(--bg) px-4 py-2 text-xs font-semibold text-zinc-500 uppercase tracking-wide"
                style={{ height: item.height }}
              >
                {formatDayHeader(item.day)}
              </div>
            ) : (
              <TransactionRow
                key={item.txn.id}
                txn={item.txn}
                categories={categories}
                onDuplicate={onDuplicate}
                onDelete={onDelete}
              />
            ),
          )}
        </div>
      </div>
    </div>
  );
};

interface DesktopTableProps {
  groups: Array<{ day: string; items: Txn[] }>;
  categories: CategoryInfo[];
  onDuplicate?: (txn: Txn) => void;
  onDelete?: (txn: Txn) => void;
}

const DesktopTable = (props: DesktopTableProps) => {
  const { groups, categories, onDuplicate, onDelete } = props;
  return (
    <ScrollArea className="w-full">
      <ScrollBar orientation="horizontal" />
      <table className="w-full min-w-[600px]">
        <thead>
          <tr className="border-b border-(--border) text-left text-xs font-semibold text-zinc-500 uppercase tracking-wide">
            <th className="px-4 py-3">Description</th>
            <th className="px-4 py-3">Category</th>
            <th className="px-4 py-3">Date</th>
            <th className="px-4 py-3 text-right">Amount</th>
            <th className="px-4 py-3 w-20">Actions</th>
          </tr>
        </thead>
        <tbody>
          {groups.map((group) => (
            <Fragment key={group.day}>
              <tr>
                <td
                  colSpan={5}
                  className="sticky top-0 z-10 bg-(--bg) px-4 py-2 text-xs font-semibold text-zinc-500 uppercase tracking-wide"
                >
                  {formatDayHeader(group.day)}
                </td>
              </tr>
              {group.items.map((txn) => {
                const cats = txn.categoryIds
                  .map((id) => categories.find((c) => c.id === id))
                  .filter(Boolean) as CategoryInfo[];
                const isExpense = txn.amountMinor < 0n;
                return (
                  <tr
                    key={txn.id}
                    className="border-b border-(--border)/50 hover:bg-(--surface-3)/40"
                  >
                    <td className="px-4 py-3 text-sm font-medium">
                      {txn.description || "No description"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {cats.map((cat) => (
                          <span
                            key={cat.id}
                            className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
                            style={{
                              backgroundColor: cat.color,
                              color: "#fff",
                            }}
                          >
                            {cat.name}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs tabular-nums text-zinc-500">
                      {formatDayHeader(group.day)}
                    </td>
                    <td
                      className={cn(
                        "px-4 py-3 text-right text-sm font-semibold tabular-nums",
                        isExpense ? "text-(--danger)" : "text-(--accent)",
                      )}
                    >
                      {formatMinor(txn.amountMinor)}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => onDuplicate?.(txn)}
                        className="text-zinc-500 hover:text-zinc-200 text-xs mr-2"
                      >
                        Copy
                      </button>
                      <button
                        onClick={() => onDelete?.(txn)}
                        className="font-medium text-(--danger) hover:brightness-110 text-xs"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                );
              })}
            </Fragment>
          ))}
        </tbody>
      </table>
    </ScrollArea>
  );
};

interface TransactionListProps {
  txns: Txn[];
  categories: CategoryInfo[];
  onDuplicate?: (txn: Txn) => void;
  onDelete?: (txn: Txn) => void;
}

export const TransactionList = (props: TransactionListProps) => {
  const { txns, categories, onDuplicate, onDelete } = props;
  const [search, setSearch] = useUrlString("q");
  const [selectedCategories, setSelectedCategories] = useUrlSet("cat");
  const [selectedMonth, setSelectedMonth] = useUrlString("month");

  const monthOptions = getMonthOptions(txns);
  const effectiveSearch = search ?? "";
  const effectiveSelectedMonth = selectedMonth ?? "";

  const filteredTxns = (() => {
    let result = txns.filter((t) => !t.deletedAt);

    if (effectiveSearch) {
      const q = effectiveSearch.toLowerCase();
      result = result.filter(
        (t) =>
          t.description.toLowerCase().includes(q) ||
          t.amountMinor.toString().includes(q),
      );
    }

    if (selectedCategories.size > 0) {
      result = result.filter((t) =>
        t.categoryIds.some((id) => selectedCategories.has(id)),
      );
    }

    if (effectiveSelectedMonth) {
      const [year, month] = effectiveSelectedMonth.split("-").map(Number);
      result = result.filter((t) => {
        const d = new Date(t.date);
        return d.getFullYear() === year && d.getMonth() + 1 === month;
      });
    }

    return result;
  })();

  const groups = groupByDay(filteredTxns);

  const toggleCategory = (catId: string) => {
    const next = new Set(selectedCategories);
    if (next.has(catId)) {
      next.delete(catId);
    } else {
      next.add(catId);
    }
    setSelectedCategories(next);
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-wrap items-center gap-3 border-b border-(--border) px-4 py-3">
        <Input
          type="text"
          placeholder="Search transactions..."
          value={effectiveSearch}
          onChange={(e) => setSearch(e.target.value || null)}
          className="flex-1 min-w-[200px]"
          data-testid="search-input"
        />

        <div className="flex flex-wrap gap-1" data-testid="category-filter" aria-label="Category filter">
          {[...categories].sort((a, b) => a.name.localeCompare(b.name)).map((cat) => {
            const isActive = selectedCategories.has(cat.id);
            return (
              <button
                key={cat.id}
                onClick={() => toggleCategory(cat.id)}
                className={cn(
                  "rounded-full px-2 py-1 text-xs font-medium transition-colors",
                  isActive ? "text-white" : "text-zinc-500 hover:text-zinc-200",
                )}
                style={
                  isActive
                    ? { backgroundColor: cat.color }
                    : { backgroundColor: "transparent" }
                }
              >
                {cat.name}
              </button>
            );
          })}
        </div>

        <Select
          value={effectiveSelectedMonth || "__all__"}
          onValueChange={(v) => setSelectedMonth(v === "__all__" ? null : v)}
        >
          <SelectTrigger aria-label="Month" className="h-11 w-[160px]" data-testid="month-picker">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All months</SelectItem>
            {monthOptions.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex-1 overflow-hidden lg:hidden" data-testid="mobile-list" aria-label="Transaction list">
        <VirtualList
          groups={groups}
          categories={categories}
          onDuplicate={onDuplicate}
          onDelete={onDelete}
        />
      </div>

      <div className="flex-1 overflow-hidden hidden lg:block" data-testid="desktop-table" aria-label="Transaction table">
        <DesktopTable
          groups={groups}
          categories={categories}
          onDuplicate={onDuplicate}
          onDelete={onDelete}
        />
      </div>
    </div>
  );
};
