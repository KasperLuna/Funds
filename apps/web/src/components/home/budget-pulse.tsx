import { PiggyBank } from "lucide-react";
import type { Category } from "@/lib/categories/categories-store";

function formatMinor(cents: bigint): string {
  const sign = cents < 0n ? "-" : "";
  const abs = cents < 0n ? -cents : cents;
  const major = Number(abs) / 100;
  return `${sign}$${major.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function usageColor(pct: number): string {
  if (pct > 90) return "bg-red-500";
  if (pct >= 70) return "bg-yellow-500";
  return "bg-green-500";
}

function usageLabel(pct: number): string {
  if (pct > 90) return "text-red-400";
  if (pct >= 70) return "text-yellow-400";
  return "text-green-400";
}

export type BudgetUsageItem = {
  category: Category;
  spentMinor: bigint;
  pct: number;
};

export type BudgetPulseProps = {
  items: BudgetUsageItem[];
  totalBudgetMinor: bigint;
  totalSpentMinor: bigint;
};

export function BudgetPulse({ items, totalBudgetMinor, totalSpentMinor }: BudgetPulseProps) {
  const totalPct = totalBudgetMinor > 0n
    ? Number((totalSpentMinor * 10000n) / totalBudgetMinor) / 100
    : 0;

  if (items.length === 0) {
    return (
      <section
        aria-label="Budget pulse"
        className="rounded-(--radius-lg) border border-(--border) bg-(--surface-1) p-6"
      >
        <div className="flex flex-col items-center gap-2 text-center">
          <div className="text-(--accent)" aria-hidden>
            <PiggyBank className="h-8 w-8" />
          </div>
          <h2 className="text-base font-semibold">Budgets</h2>
          <p className="max-w-md text-sm text-slate-400">
            Set category budgets to track spending pulse.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section
      aria-label="Budget pulse"
      className="rounded-(--radius-lg) border border-(--border) bg-(--surface-1) p-6"
    >
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">Budget pulse</h2>
        <span className={`text-xs font-medium ${usageLabel(totalPct)}`}>
          {Math.round(totalPct)}%
        </span>
      </div>

      <p className="mt-1 text-xs text-slate-400">
        {formatMinor(totalSpentMinor)} of {formatMinor(totalBudgetMinor)} spent
      </p>

      <div
        className="mt-3 h-2 overflow-hidden rounded-full bg-(--surface-2)"
        role="progressbar"
        aria-valuenow={Math.round(totalPct)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Budget usage ${Math.round(totalPct)}%`}
      >
        <div
          className={`h-full rounded-full transition-all ${usageColor(totalPct)}`}
          style={{ width: `${Math.min(totalPct, 100)}%` }}
        />
      </div>

      <div className="mt-4 divide-y divide-(--border)">
        {items
          .sort((a, b) => b.pct - a.pct)
          .map((item) => (
            <div key={item.category.id} className="flex items-center justify-between py-2 first:pt-0 last:pb-0">
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <span className="truncate text-sm">{item.category.name}</span>
                  <span className="ml-2 shrink-0 text-xs tabular-nums text-slate-400">
                    {formatMinor(item.spentMinor)} / {formatMinor(item.category.monthlyBudgetMinor!)}
                  </span>
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-(--surface-2)">
                  <div
                    className={`h-full rounded-full ${usageColor(item.pct)}`}
                    style={{ width: `${Math.min(item.pct, 100)}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
      </div>
    </section>
  );
}
