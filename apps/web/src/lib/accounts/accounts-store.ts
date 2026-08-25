export type Account = {
  id: string;
  name: string;
  kind: "bank" | "cash" | "wallet" | "exchange";
  assetId: string;
  openingBalanceMinor: bigint;
  primaryColor?: string | null;
  secondaryColor?: string | null;
  createdAt: number;
  updatedAt: number;
  archived?: boolean;
  deletedAt?: number | null;
};

export type Txn = {
  id: string;
  accountId: string;
  assetId: string;
  amountMinor: bigint;
  type: "income" | "expense";
  description: string;
  categoryIds: string[];
  date: number;
  deletedAt?: number | null;
};

export function computeBalance(account: Account, txns: Txn[]): bigint {
  // cavetail: boundary armor — a mis-shaped row (e.g. a stale cache entry from
  // a different consumer) must degrade to 0n, not throw "Cannot mix BigInt".
  let sum = account.openingBalanceMinor;
  if (typeof sum !== "bigint") sum = BigInt((sum as unknown as number | string) ?? 0);
  for (const t of txns) {
    if (t.deletedAt) continue;
    if (t.accountId !== account.id) continue;
    const amt = t.amountMinor;
    sum += typeof amt === "bigint" ? amt : BigInt((amt as unknown as number | string) ?? 0);
  }
  return sum;
}

export function groupByDay(
  txns: Txn[],
): Array<{ day: string; items: Txn[] }> {
  const map = new Map<string, Txn[]>();
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  for (const t of txns) {
    if (t.deletedAt) continue;
    const key = fmt.format(new Date(Number(t.date)));
    let bucket = map.get(key);
    if (!bucket) {
      bucket = [];
      map.set(key, bucket);
    }
    bucket.push(t);
  }
  const entries = [...map.entries()];
  entries.sort((a, b) => (a[0] >= b[0] ? -1 : 1));
  return entries.map(([day, items]) => ({ day, items }));
}

export function monthStats(
  txns: Txn[],
  year: number,
  month: number,
): { income: bigint; expense: bigint; net: bigint } {
  let income = 0n;
  let expense = 0n;
  for (const t of txns) {
    if (t.deletedAt) continue;
    const d = new Date(Number(t.date));
    if (d.getFullYear() === year && d.getMonth() === month) {
      if (t.amountMinor >= 0n) {
        income += t.amountMinor;
      } else {
        expense += -t.amountMinor;
      }
    }
  }
  return { income, expense, net: income - expense };
}

export function dedupeById<T extends { id: string }>(rows: T[]): T[] {
  const map = new Map<string, T>();
  for (const r of rows) {
    map.set(r.id, r);
  }
  return [...map.values()];
}
