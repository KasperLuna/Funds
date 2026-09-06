"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
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
 *
 * cavetail: writes go through ONE router.replace built from a fresh
 * read — four sequential replaces raced on the same stale snapshot and
 * the last writer silently dropped `?q=`, so typing never stuck.
 */
export function useBanksFilters(): {
  filters: TxnFilters;
  setFilters: (next: TxnFilters) => void;
} {
  const search = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [query] = useUrlString("q");
  const [categoryIds] = useUrlSet("cat");
  const [fromRaw] = useUrlString("from");
  const [toRaw] = useUrlString("to");

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
      const params = new URLSearchParams(search.toString());
      if (next.query) params.set("q", next.query);
      else params.delete("q");
      const cats = [...new Set(next.categoryIds)];
      if (cats.length > 0) params.set("cat", cats.join(","));
      else params.delete("cat");
      if (next.date) {
        params.set("from", String(next.date.from));
        params.set("to", String(next.date.to));
      } else {
        params.delete("from");
        params.delete("to");
      }
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [search, router, pathname],
  );

  return { filters, setFilters };
}

export const QUERY_MIRROR_MS = 300;

/**
 * cavetail: instant applied value, debounced URL echo. Typing filters the
 * list from React state with zero navigations; ?q= mirrors after a pause
 * so links and refresh stay shareable. Outside URL moves (back/forward,
 * deep link) are adopted unless they echo our own pending write.
 */
export function useMirroredQuery(
  urlQuery: string,
  writeUrlQuery: (q: string) => void,
  delayMs: number = QUERY_MIRROR_MS,
): [string, (q: string) => void] {
  const [applied, setApplied] = useState(urlQuery);
  const prevUrl = useRef(urlQuery);
  const lastWritten = useRef<string | null>(null);

  useEffect(() => {
    if (applied === urlQuery) return;
    const t = setTimeout(() => {
      lastWritten.current = applied;
      writeUrlQuery(applied);
    }, delayMs);
    return () => clearTimeout(t);
  }, [applied, urlQuery, writeUrlQuery, delayMs]);

  useEffect(() => {
    if (urlQuery === prevUrl.current) return;
    prevUrl.current = urlQuery;
    if (urlQuery !== lastWritten.current && urlQuery !== applied) {
      setApplied(urlQuery);
    }
  }, [urlQuery, applied]);

  return [applied, setApplied];
}
