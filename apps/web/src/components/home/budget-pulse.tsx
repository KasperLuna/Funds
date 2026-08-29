"use client";

import Link from "next/link";
import { PiggyBank } from "lucide-react";
import type { Category } from "@/lib/categories/categories-store";
import { formatMoney } from "@/lib/money";
import { usePrivacy } from "@/lib/privacy/privacy-context";

function usageColor(pct: number): string {
  if (pct > 90) return "bg-(--danger)";
  if (pct >= 70) return "bg-(--warning)";
  return "bg-(--accent)";
}

function usageLabel(pct: number): string {
  if (pct > 90) return "text-(--danger)";
  if (pct >= 70) return "text-(--warning)";
  return "text-(--accent)";
}

export type BudgetUsageItem = {
  category: Category;
  budgetMinor: bigint;
  budgetAssetId: string | null;
  spentMinor: bigint;
  pct: number;
};

export type BudgetPulseProps = {
  items: BudgetUsageItem[];
  assetsById: Map<string, { code: string; decimals: number }>;
};

export function BudgetPulse({ items, assetsById }: BudgetPulseProps) {
  const { masked: privacy } = usePrivacy();
  const asset = items[0]?.budgetAssetId ? assetsById.get(items[0].budgetAssetId) : undefined;
  const decimals = asset?.decimals ?? 2;
  const code = asset?.code;

  // Grand total only when every budgeted category shares one currency, so the
  // summary never mixes e.g. ₱ with $.
  const homogeneous = items.length > 0 && items.every((i) => i.budgetAssetId === items[0]!.budgetAssetId);
  const totalBudgetMinor = homogeneous
    ? items.reduce((sum, i) => sum + i.budgetMinor, 0n)
    : 0n;
  const totalSpentMinor = homogeneous
    ? items.reduce((sum, i) => sum + i.spentMinor, 0n)
    : 0n;
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
          <p className="max-w-md text-sm text-zinc-500">
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
      {homogeneous ? (
        <>
          <div className="flex items-baseline justify-between">
            <h2 className="font-display text-base font-bold tracking-tight">Budget pulse</h2>
            <span className={`font-display text-2xl font-bold tabular-nums ${usageLabel(totalPct)}`}>
              {Math.round(totalPct)}
              <span className="text-sm font-semibold">%</span>
            </span>
          </div>

          <p className="mt-0.5 text-xs text-zinc-500" aria-label={privacy ? "Budget usage masked" : undefined}>
            {privacy
              ? `${Math.round(totalPct)}% of budget used`
              : `${formatMoney(totalSpentMinor, decimals, code)} of ${formatMoney(totalBudgetMinor, decimals, code)} spent`}
          </p>

          <div
            className="mt-3 h-1 overflow-hidden rounded-full bg-(--surface-3)"
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
        </>
      ) : (
        <h2 className="font-display text-base font-bold tracking-tight">Budget pulse</h2>
      )}

      <div className="mt-4 divide-y divide-(--border)">
        {items
          .sort((a, b) => b.pct - a.pct)
          .map((item) => {
            const itemAsset = item.budgetAssetId ? assetsById.get(item.budgetAssetId) : undefined;
            const itemDecimals = itemAsset?.decimals ?? 2;
            const itemCode = itemAsset?.code;
            return (
              <Link
                key={item.category.id}
                href={`/dashboard/assets?tab=banks&category=${item.category.id}`}
                className="flex items-center justify-between py-2 first:pt-0 last:pb-0 transition-colors hover:bg-(--surface-3)/40 -mx-6 px-6"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-3">
                    <span className="truncate text-sm">{item.category.name}</span>
                    <span className="shrink-0 text-xs tabular-nums text-zinc-500" aria-label={privacy ? "Amount masked" : undefined}>
                      {privacy
                        ? `${Math.round(item.pct)}% used`
                        : `${formatMoney(item.spentMinor, itemDecimals, itemCode)} / ${formatMoney(item.budgetMinor, itemDecimals, itemCode)}`}
                    </span>
                  </div>
                  <div className="mt-1 flex items-center gap-2">
                    <div className="h-1 flex-1 overflow-hidden rounded-full bg-(--surface-3)">
                      <div
                        className={`h-full rounded-full ${usageColor(item.pct)}`}
                        style={{ width: `${Math.min(item.pct, 100)}%` }}
                      />
                    </div>
                    <span className={`shrink-0 text-xs font-semibold tabular-nums ${usageLabel(item.pct)}`}>
                      {Math.round(item.pct)}%
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
      </div>
    </section>
  );
}
