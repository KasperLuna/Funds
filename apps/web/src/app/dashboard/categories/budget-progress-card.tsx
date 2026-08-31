"use client";

import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { budgetPeriodKey, type Category } from "@/lib/categories/categories-store";
import type { Asset } from "@/lib/assets";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";

interface BudgetUsage {
  category: Category;
  spentMinor: bigint;
  budgetMinor: bigint;
  budgetAssetId: string | null;
}

interface BudgetProgressCardProps {
  budgetUsages: BudgetUsage[];
  effectiveViewMonth: { year: number; month: number };
  monthOpts: Array<{ value: string; label: string; year: number; month: number }>;
  assetsById: Map<string, Asset>;
  privacy: boolean;
  onShiftMonth: (delta: number) => void;
  onSelectMonth: (year: number, month: number) => void;
}

export const BudgetProgressCard = ({
  budgetUsages,
  effectiveViewMonth,
  monthOpts,
  assetsById,
  privacy,
  onShiftMonth,
  onSelectMonth,
}: BudgetProgressCardProps) => {
  const totalSpent = budgetUsages.reduce((s, u) => s + u.spentMinor, 0n);
  const totalBudget = budgetUsages.reduce((s, u) => s + u.budgetMinor, 0n);
  const totalPct = totalBudget > 0n ? Number((totalSpent * 10000n) / totalBudget) / 100 : 0;
  const totalClamped = Math.min(totalPct, 100);
  const isTotalWarning = totalPct >= 80 && totalPct <= 100;
  const isTotalOver = totalPct > 100;

  const totalPctTone = isTotalOver
    ? "font-medium text-(--danger)"
    : isTotalWarning
      ? "font-medium text-(--warning)"
      : "text-zinc-400";

  const totalBarFill = isTotalOver
    ? "bg-(--danger)"
    : isTotalWarning
      ? "bg-(--warning)"
      : "bg-(--accent)";

  if (budgetUsages.length === 0) return null;

  return (
    <div className="rounded-(--radius-lg) border border-(--border) bg-(--surface-1) p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="label-micro">Budget progress</h2>
        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label="Previous month"
            onClick={() => onShiftMonth(-1)}
            className="grid h-9 w-9 place-items-center rounded-(--radius-md) border border-(--border) bg-(--surface-2) text-zinc-400 transition-colors hover:bg-(--surface-3) hover:text-inherit focus-visible:ring-2 focus-visible:ring-(--accent) focus-visible:outline-none"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden />
          </button>
          <Select
            value={budgetPeriodKey(effectiveViewMonth.year, effectiveViewMonth.month)}
            onValueChange={(v) => {
              const opt = monthOpts.find((o) => o.value === v);
              if (opt) onSelectMonth(opt.year, opt.month);
            }}
          >
            <SelectTrigger aria-label="Budget month" className="h-9 w-auto min-w-[10ch]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {monthOpts.map((o) => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <button
            type="button"
            aria-label="Next month"
            onClick={() => onShiftMonth(1)}
            className="grid h-9 w-9 place-items-center rounded-(--radius-md) border border-(--border) bg-(--surface-2) text-zinc-400 transition-colors hover:bg-(--surface-3) hover:text-inherit focus-visible:ring-2 focus-visible:ring-(--accent) focus-visible:outline-none"
          >
            <ChevronRight className="h-4 w-4" aria-hidden />
          </button>
        </div>
      </div>
      <div className="flex flex-col gap-3">
        <div className="rounded-(--radius-md) bg-(--surface-2) p-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-zinc-400">Overall</span>
            <span className={cn("tabular-nums", totalPctTone)}>
              {Math.round(totalPct)}%
            </span>
          </div>
          <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-(--surface-3)">
            <div
              className={cn("h-full rounded-full transition-all", totalBarFill)}
              style={{ width: `${totalClamped}%` }}
            />
          </div>
        </div>
        {budgetUsages.map(({ category, spentMinor, budgetMinor, budgetAssetId }) => {
          const asset = budgetAssetId ? assetsById.get(budgetAssetId) : undefined;
          const decimals = asset?.decimals ?? 2;
          const code = asset?.code ?? undefined;
          const pct = Number((spentMinor * 10000n) / budgetMinor) / 100;
          const clampedPct = Math.min(pct, 100);
          const isWarning = pct >= 80 && pct <= 100;
          const isOver = pct > 100;

          const rowPctTone = isOver
            ? "font-medium text-(--danger)"
            : isWarning
              ? "font-medium text-(--warning)"
              : "text-zinc-500";

          const rowBarFill = isOver
            ? "bg-(--danger)"
            : isWarning
              ? "bg-(--warning)"
              : "bg-(--accent)";
          return (
            <Link
              key={category.id}
              href={`/dashboard/assets?tab=banks&category=${category.id}`}
              className="flex flex-col gap-1 rounded-(--radius-md) p-2 -m-2 transition-colors hover:bg-(--surface-3)/40"
            >
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="flex min-w-0 items-center gap-2">
                  <span
                    className="h-3 w-3 shrink-0 rounded-full"
                    style={{ backgroundColor: category.color }}
                  />
                  <span className="truncate">{category.name}</span>
                </span>
                <span
                  className={cn("shrink-0 tabular-nums", rowPctTone)}
                  aria-label={privacy ? "Spent masked" : undefined}
                >
                  {privacy
                    ? `${Math.round(pct)}%`
                    : `${formatMoney(spentMinor, decimals, code)} / ${formatMoney(budgetMinor, decimals, code)} · ${Math.round(pct)}%`}
                </span>
              </div>
              <div className="h-1 w-full rounded-full bg-(--surface-3) overflow-hidden">
                <div
                  className={cn("h-full rounded-full transition-all", rowBarFill)}
                  style={{ width: `${clampedPct}%` }}
                />
              </div>
            </Link>
          );
        })}
      </div>
      <p className="mt-3 text-xs text-zinc-500">
        Budgets are recorded per month — changing one only affects this and future months.
      </p>
    </div>
  );
};
