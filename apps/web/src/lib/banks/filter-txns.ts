import Fuse from "fuse.js";
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
  accounts: Array<{ id: string; name: string; decimals?: number }>;
};

const DEFAULT_DECIMALS = 2;
const FUZZY_MIN_TOKEN = 3;

function fold(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

// cavetail: boundary armor — a mis-shaped row must degrade to 0n, not throw.
function toMinor(v: unknown): bigint {
  if (typeof v === "bigint") return v;
  try {
    return BigInt((v as number | string | null | undefined) ?? 0);
  } catch {
    return 0n;
  }
}

type AmountToken = { sign: -1 | 0 | 1; digits: string };

function parseAmountToken(raw: string): AmountToken | null {
  let s = raw.trim();
  let sign: -1 | 0 | 1 = 0;
  if (s.startsWith("-")) {
    sign = -1;
    s = s.slice(1);
  } else if (s.startsWith("+")) {
    sign = 1;
    s = s.slice(1);
  }
  s = s.replace(/[$€£¥₹\s,]/g, "");
  if (!/^\d+(\.\d*)?$/.test(s) && !/^\.\d+$/.test(s)) return null;
  return { sign, digits: s };
}

function canonAmount(s: string): string {
  const dot = s.indexOf(".");
  const int = (dot < 0 ? s : s.slice(0, dot)).replace(/^0+(?=\d)/, "") || "0";
  if (dot < 0) return int;
  const frac = s.slice(dot + 1).replace(/0+$/, "");
  return frac ? `${int}.${frac}` : int;
}

// cavetail: exact BigInt render — no float boundary, so huge minor values stay precise.
function formatMinorAbs(minor: bigint, decimals: number): string {
  const abs = minor < 0n ? -minor : minor;
  if (decimals <= 0) return abs.toString();
  const s = abs.toString().padStart(decimals + 1, "0");
  return canonAmount(`${s.slice(0, -decimals)}.${s.slice(-decimals)}`);
}

function wildcardToRegExp(foldedToken: string): RegExp {
  const escaped = foldedToken
    .split("*")
    .map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  return new RegExp(escaped.join(".*"));
}

function intersectSets(a: Set<string> | null, b: Set<string>): Set<string> {
  if (a === null) return b;
  return new Set([...a].filter((id) => b.has(id)));
}

/** Pure filter over a transaction list. */
export function filterTxns(
  txns: Txn[],
  filters: TxnFilters,
  deps: TxnFilterDeps,
): Txn[] {
  const rawTokens = filters.query.trim().split(/\s+/).filter(Boolean);
  const catSet = new Set(filters.categoryIds);
  const accountById = new Map(deps.accounts.map((a) => [a.id, a]));
  const categoryName = new Map(deps.categories.map((c) => [c.id, fold(c.name)]));
  const { from, to } = filters.date ?? { from: -Infinity, to: Infinity };

  let candidates: Set<string> | null = null;
  if (rawTokens.length > 0) {
    const hay = new Map<string, string>();
    const decimals = new Map<string, number>();
    for (const t of txns) {
      const parts = [fold(t.description ?? "")];
      for (const id of t.categoryIds) {
        const n = categoryName.get(id);
        if (n) parts.push(n);
      }
      const acc = accountById.get(t.accountId);
      if (acc) parts.push(fold(acc.name));
      hay.set(t.id, parts.join(" "));
      decimals.set(t.id, acc?.decimals ?? DEFAULT_DECIMALS);
    }

    // cavetail: Fuse builds lazily — exact-substring hits never pay the index cost.
    let fuse: Fuse<{ id: string; hay: string }> | null = null;
    const getFuse = () =>
      (fuse ??= new Fuse(
        txns.map((t) => ({ id: t.id, hay: hay.get(t.id) ?? "" })),
        {
          keys: ["hay"],
          threshold: 0.4,
          ignoreLocation: true,
          minMatchCharLength: FUZZY_MIN_TOKEN,
        },
      ));

    for (const raw of rawTokens) {
      const amount = parseAmountToken(raw);
      if (amount) {
        const q = canonAmount(amount.digits);
        const ids = new Set<string>();
        for (const t of txns) {
          const minor = toMinor(t.amountMinor);
          if (amount.sign === -1 && minor >= 0n) continue;
          if (amount.sign === 1 && minor <= 0n) continue;
          if (
            formatMinorAbs(minor, decimals.get(t.id) ?? DEFAULT_DECIMALS).includes(q)
          ) {
            ids.add(t.id);
          }
        }
        candidates = intersectSets(candidates, ids);
      } else {
        const tok = fold(raw);
        let ids: Set<string>;
        if (tok.includes("*")) {
          const re = wildcardToRegExp(tok);
          ids = new Set(
            [...hay].filter(([, h]) => re.test(h)).map(([id]) => id),
          );
        } else {
          ids = new Set([...hay].filter(([, h]) => h.includes(tok)).map(([id]) => id));
          if (ids.size === 0 && tok.length >= FUZZY_MIN_TOKEN) {
            ids = new Set(getFuse().search(tok).map((r) => r.item.id));
          }
        }
        candidates = intersectSets(candidates, ids);
      }
      if (candidates.size === 0) break;
    }
  }

  return txns.filter((t) => {
    if (filters.date && (t.date < from || t.date > to)) return false;
    if (catSet.size > 0 && !t.categoryIds.some((id) => catSet.has(id))) return false;
    if (candidates !== null && !candidates.has(t.id)) return false;
    return true;
  });
}
