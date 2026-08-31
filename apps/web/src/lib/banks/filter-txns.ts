import type { Txn } from "@/lib/accounts/accounts-store";
import type { Category } from "@/lib/categories/categories-store";

export type DateRangeFilter = { from: number; to: number } | null;

export type TxnFilters = {
  query: string;
  categoryIds: string[];
  date: DateRangeFilter;
};

export const EMPTY_FILTERS: TxnFilters = { query: "", categoryIds: [], date: null };

type TxnFilterDeps = {
  categories: Category[];
  accounts: Array<{ id: string; name: string }>;
};

function normalize(s: string): string {
  return s.trim().toLowerCase();
}

/** Pure filter over a transaction list. */
export function filterTxns(
  txns: Txn[],
  filters: TxnFilters,
  deps: TxnFilterDeps,
): Txn[] {
  const q = normalize(filters.query);
  const catSet = new Set(filters.categoryIds);
  const accountName = new Map(deps.accounts.map((a) => [a.id, normalize(a.name)]));
  const categoryName = new Map(deps.categories.map((c) => [c.id, normalize(c.name)]));
  const { from, to } = filters.date ?? { from: -Infinity, to: Infinity };

  return txns.filter((t) => {
    if (filters.date && (t.date < from || t.date > to)) return false;
    if (catSet.size > 0 && !t.categoryIds.some((id) => catSet.has(id))) return false;
    if (q) {
      const inDescription = normalize(t.description).includes(q);
      const inCategory = t.categoryIds.some((id) => categoryName.get(id)?.includes(q));
      const inAccount = accountName.get(t.accountId)?.includes(q) ?? false;
      if (!inDescription && !inCategory && !inAccount) return false;
    }
    return true;
  });
}
