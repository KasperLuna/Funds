"use client";

import { budgetFor, type Category, type CategoryBudget } from "@/lib/categories/categories-store";
import type { Txn } from "@/lib/accounts/accounts-store";
import { formatMoney } from "@/lib/money";
import { usePrivacyStore } from "@/lib/privacy/privacy-store";

export type FlowTx = Pick<Txn, "categoryIds" | "amountMinor" | "date"> &
  Partial<Pick<Txn, "deletedAt" | "transferId">>;

/**
 * Current-month inflow/outflow across transactions tagged only to
 * non-budgeted categories. A category is non-budgeted when
 * `budgetFor` returns null for the month — no recorded
 * `category_budgets` row and no positive live `monthlyBudgetMinor`
 * (null and 0n both count as non-budgeted, per budgetFor's `> 0n` guard).
 * Multi-category tags split proportionally, mirroring spendingByMonth.
 * cavetail: uncategorized transactions count here at full amount (they are
 * by definition non-budgeted), while spendingByMonth drops them
 * (`excludedCats === totalCats` is 0 === 0) — existing function untouched.
 */
export function computeNonBudgetedFlow(
  txns: FlowTx[],
  categories: Category[],
  budgets: CategoryBudget[],
  year: number,
  month: number,
): { inflowMinor: bigint; outflowMinor: bigint } {
  const excludedIds = new Set(
    categories.filter((c) => c.excludeFromAnalytics && !c.deletedAt).map((c) => c.id),
  );
  const budgetedIds = new Set(
    categories
      .filter((c) => !c.deletedAt && !c.excludeFromAnalytics)
      .filter((c) => budgetFor(c, budgets, year, month) !== null)
      .map((c) => c.id),
  );
  let inflowMinor = 0n;
  let outflowMinor = 0n;
  for (const t of txns) {
    if (t.deletedAt) continue;
    // cavetail: transfer legs post twice for one user action — exclude, as analytics does.
    if (t.transferId != null) continue;
    const d = new Date(Number(t.date));
    if (d.getFullYear() !== year || d.getMonth() !== month) continue;
    const amt = typeof t.amountMinor === "bigint" ? t.amountMinor : BigInt(t.amountMinor ?? 0);
    const totalCats = t.categoryIds.length;
    if (totalCats === 0) {
      if (amt >= 0n) inflowMinor += amt;
      else outflowMinor += -amt;
      continue;
    }
    const counted = t.categoryIds.filter(
      (id) => !excludedIds.has(id) && !budgetedIds.has(id),
    ).length;
    if (counted === 0) continue;
    const effective = (amt * BigInt(counted)) / BigInt(totalCats);
    if (effective >= 0n) inflowMinor += effective;
    else outflowMinor += -effective;
  }
  return { inflowMinor, outflowMinor };
}

interface NonBudgetedFlowProps {
  inflowMinor: bigint;
  outflowMinor: bigint;
  code?: string;
  decimals?: number;
}

export const NonBudgetedFlow = ({
  inflowMinor,
  outflowMinor,
  code,
  decimals = 2,
}: NonBudgetedFlowProps) => {
  const masked = usePrivacyStore((s) => s.masked);
  return (
    <section
      aria-label="Non-budgeted flow"
      className="rounded-(--radius-lg) border border-(--border) bg-(--surface-1) px-6 py-4"
    >
      <p className="label-micro">Non-budgeted · this month</p>
      <div className="mt-2 flex items-baseline justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <span className="text-xs text-zinc-500">Inflow</span>
          <span className="text-lg font-semibold tabular-nums text-(--accent)">
            {masked ? "••••" : formatMoney(inflowMinor, decimals, code)}
          </span>
        </div>
        <div className="flex flex-col items-end gap-0.5">
          <span className="text-xs text-zinc-500">Outflow</span>
          <span className="text-lg font-semibold tabular-nums text-(--danger)">
            {masked ? "••••" : formatMoney(outflowMinor, decimals, code)}
          </span>
        </div>
      </div>
    </section>
  );
};
