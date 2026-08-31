"use client";

import { useCallback, useMemo } from "react";
import { useUrlSet, useUrlString } from "@/lib/url/use-url-state";
import type { TxnFilters } from "./transaction-filters";

function parseDateRange(
  fromRaw: string | null,
  toRaw: string | null,
): { from: number; to: number } | null {
  if (fromRaw == null || toRaw == null) return null;
  const from = Number(fromRaw);
  const to = Number(toRaw);
  if (!Number.isFinite(from) || !Number.isFinite(to)) return null;
  return { from, to };
}

/**
 * cavetail: composes four URL keys (`q`, `cat`, `from`, `to`) into the
 * `TxnFilters` shape the existing `<BankTransactionsList>` and
 * `filterTxns` consume. The keys stay independent in the URL so a
 * refresh rehydrates each piece; the read side merges them into one
 * object. Plan 11: "Compose the 4 hooks into a `useBanksFilters()`."
 */
export function useBanksFilters(): {
  filters: TxnFilters;
  setFilters: (next: TxnFilters) => void;
} {
  const [query, setQuery] = useUrlString("q");
  const [categoryIds, setCategoryIds] = useUrlSet("cat");
  const [fromRaw, setFrom] = useUrlString("from");
  const [toRaw, setTo] = useUrlString("to");

  const filters = useMemo<TxnFilters>(
    () => ({
      query: query ?? "",
      categoryIds: [...categoryIds],
      date: parseDateRange(fromRaw, toRaw),
    }),
    [query, categoryIds, fromRaw, toRaw],
  );

  const setFilters = useCallback(
    (next: TxnFilters) => {
      setQuery(next.query || null);
      const catSet = new Set(next.categoryIds);
      setCategoryIds(catSet.size > 0 ? catSet : null);
      setFrom(next.date ? String(next.date.from) : null);
      setTo(next.date ? String(next.date.to) : null);
    },
    [setQuery, setCategoryIds, setFrom, setTo],
  );

  return { filters, setFilters };
}
