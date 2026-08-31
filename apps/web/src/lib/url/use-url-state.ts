"use client";

import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useCallback, useMemo } from "react";

/**
 * cavetail: thin URL-state primitive. Stores one `T`-shaped value in
 * `?key=…`, deletes the key when serialized to `null`. `scroll: false`
 * keeps the user's scroll position stable. The same shape composes for
 * the banks-panel filters (4 keys → one `TxnFilters`).
 */
export function useUrlState<T>(
  key: string,
  parse: (raw: string | null) => T | null,
  serialize: (v: T | null) => string | null,
): [T | null, (next: T | null) => void] {
  const search = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const value = useMemo(() => parse(search.get(key)), [search, key, parse]);
  const set = useCallback(
    (next: T | null) => {
      const params = new URLSearchParams(search.toString());
      const serialized = serialize(next);
      if (serialized === null) params.delete(key);
      else params.set(key, serialized);
      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [search, router, pathname, key, serialize],
  );
  return [value, set];
}

const idParse = (raw: string | null) => raw;
const idSerialize = (v: string | null) => v;

/** Read/write a single string value at `?key=…`. */
export function useUrlString(key: string): [string | null, (next: string | null) => void] {
  return useUrlState<string>(key, idParse, idSerialize);
}

/** Read/write a boolean at `?key=1`; absent → `defaultValue`. */
export function useUrlBool(
  key: string,
  defaultValue: boolean,
): [boolean, (next: boolean) => void] {
  const parse = useCallback(
    (raw: string | null) => (raw == null ? defaultValue : raw === "1"),
    [defaultValue],
  );
  const serialize = useCallback((v: boolean | null) => (v ? "1" : null), []);
  const [value, set] = useUrlState<boolean>(key, parse, serialize);
  const setBool = useCallback((next: boolean) => set(next), [set]);
  return [value ?? defaultValue, setBool];
}

const setParse = (raw: string | null): Set<string> | null =>
  raw == null ? null : new Set(raw.split(",").filter(Boolean));
const setSerialize = (v: Set<string> | null) =>
  v == null || v.size === 0 ? null : [...v].join(",");

/** Read/write a string set at `?key=id1,id2,…`. Empty / absent → empty set. */
export function useUrlSet(
  key: string,
): [Set<string>, (next: Set<string> | null) => void] {
  const [value, set] = useUrlState<Set<string>>(key, setParse, setSerialize);
  return [value ?? new Set<string>(), set];
}

const MONTH_RE = /^(\d{4})-(\d{2})$/;

/** Read/write a budget-month at `?key=YYYY-MM`. Absent → null. */
export function useUrlDate(
  key: string,
): [
  { year: number; month: number } | null,
  (next: { year: number; month: number } | null) => void,
] {
  const parse = useCallback((raw: string | null) => {
    if (raw == null) return null;
    const m = MONTH_RE.exec(raw);
    if (!m) return null;
    const year = Number(m[1]);
    const month = Number(m[2]) - 1;
    if (!Number.isFinite(year) || !Number.isFinite(month) || month < 0 || month > 11) {
      return null;
    }
    return { year, month };
  }, []);
  const serialize = useCallback(
    (v: { year: number; month: number } | null) =>
      v == null ? null : `${v.year}-${String(v.month + 1).padStart(2, "0")}`,
    [],
  );
  return useUrlState<{ year: number; month: number }>(key, parse, serialize);
}
