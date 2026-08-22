export type Category = {
  id: string;
  name: string;
  color: string;
  hideable: boolean;
  monthlyBudgetMinor: bigint | null;
  createdAt: number;
  updatedAt: number;
  deletedAt?: number | null;
};

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

export function computeBudgetUsage(
  categories: Category[],
  txns: Array<{
    categoryIds: string[];
    amountMinor: bigint;
    date: number;
    deletedAt?: number | null;
  }>,
  year: number,
  month: number,
): Array<{ category: Category; spentMinor: bigint; pct: number }> {
  const results: Array<{ category: Category; spentMinor: bigint; pct: number }> = [];
  for (const cat of categories) {
    if (cat.deletedAt) continue;
    if (!cat.monthlyBudgetMinor || cat.monthlyBudgetMinor <= 0n) continue;
    let spent = 0n;
    for (const t of txns) {
      if (t.deletedAt) continue;
      if (t.amountMinor >= 0n) continue;
      if (!t.categoryIds.includes(cat.id)) continue;
      const d = new Date(t.date);
      if (d.getFullYear() === year && d.getMonth() === month) {
        spent += -t.amountMinor;
      }
    }
    const pct = Number((spent * 10000n) / cat.monthlyBudgetMinor) / 100;
    results.push({ category: cat, spentMinor: spent, pct });
  }
  return results;
}
