export type Category = {
  id: string;
  name: string;
  color: string;
  hideable: boolean;
  excludeFromAnalytics: boolean;
  monthlyBudgetMinor: bigint | null;
  assetId: string | null;
  createdAt: number;
  updatedAt: number;
  deletedAt?: number | null;
};

/** Per-month budget record (audit history). `monthStart` is local midnight of the 1st. */
export type CategoryBudget = {
  id: string;
  categoryId: string;
  assetId: string;
  monthStart: number;
  amountMinor: bigint;
  createdAt: number;
  updatedAt: number;
  deletedAt?: number | null;
};

export type BudgetTx = {
  categoryIds: string[];
  amountMinor: bigint;
  assetId?: string;
  date: number;
  deletedAt?: number | null;
};

export function budgetPeriodStart(year: number, month: number): number {
  return new Date(year, month, 1).getTime();
}

export function budgetPeriodKey(year: number, month: number): string {
  return `${year}-${String(month + 1).padStart(2, "0")}`;
}

/**
 * Resolve the budget for a category in a given period: a recorded
 * `category_budgets` row wins; otherwise fall back to the category's live
 * `monthlyBudgetMinor` (legacy/not-yet-recorded current month).
 */
export function budgetFor(
  category: Category,
  budgets: CategoryBudget[],
  year: number,
  month: number,
): { amountMinor: bigint; assetId: string | null } | null {
  const period = budgetPeriodStart(year, month);
  const recorded = budgets.find(
    (b) =>
      !b.deletedAt &&
      b.categoryId === category.id &&
      b.monthStart === period,
  );
  if (recorded) return { amountMinor: recorded.amountMinor, assetId: recorded.assetId };
  if (category.monthlyBudgetMinor != null && category.monthlyBudgetMinor > 0n) {
    return { amountMinor: category.monthlyBudgetMinor, assetId: category.assetId };
  }
  return null;
}

export function computeBudgetUsage(
  categories: Category[],
  budgets: CategoryBudget[],
  txns: BudgetTx[],
  year: number,
  month: number,
): Array<{
  category: Category;
  budgetMinor: bigint;
  budgetAssetId: string | null;
  spentMinor: bigint;
  pct: number;
}> {
  const results: Array<{
    category: Category;
    budgetMinor: bigint;
    budgetAssetId: string | null;
    spentMinor: bigint;
    pct: number;
  }> = [];
  const excludedIds = new Set(
    categories.filter((c) => c.excludeFromAnalytics && !c.deletedAt).map((c) => c.id),
  );
  for (const cat of categories) {
    if (cat.deletedAt) continue;
    if (cat.excludeFromAnalytics) continue;
    const budget = budgetFor(cat, budgets, year, month);
    if (!budget) continue;
    let spent = 0n;
    for (const t of txns) {
      if (t.deletedAt) continue;
      if (t.amountMinor >= 0n) continue;
      if (!t.categoryIds.includes(cat.id)) continue;
      // Exempt categories are fully suppressed from budgets: a transfer tagged
      // alongside a budgeted category is not spending on that category.
      if (t.categoryIds.some((id) => excludedIds.has(id))) continue;
      // Only count spending in the budget's own currency; other-currency
      // transactions are excluded rather than silently mixed.
      if (budget.assetId && t.assetId && t.assetId !== budget.assetId) continue;
      const d = new Date(Number(t.date));
      if (d.getFullYear() === year && d.getMonth() === month) {
        spent += -t.amountMinor;
      }
    }
    const pct = Number((spent * 10000n) / budget.amountMinor) / 100;
    results.push({
      category: cat,
      budgetMinor: budget.amountMinor,
      budgetAssetId: budget.assetId,
      spentMinor: spent,
      pct,
    });
  }
  return results;
}

export const DEFAULT_CATEGORY_COLORS = [
  "#6366f1",
  "#8b5cf6",
  "#ec4899",
  "#ef4444",
  "#f97316",
  "#eab308",
  "#22c55e",
  "#14b8a6",
  "#06b6d4",
  "#3b82f6",
];

/**
 * Deterministic category color. The synced schema has no `color` column, so
 * colors are derived from the category name rather than persisted.
 */
export function categoryColor(name: string): string {
  const palette = DEFAULT_CATEGORY_COLORS;
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) {
    hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  }
  return palette[hash % palette.length]!;
}

/**
 * Resolve a category's display color: use the persisted `color` when present,
 * otherwise fall back to the deterministic name-derived color.
 */
export function resolveCategoryColor(row: Record<string, unknown>): string {
  const color = row.color;
  if (typeof color === "string" && color.trim() !== "") {
    return color;
  }
  return categoryColor(String(row.name ?? ""));
}
