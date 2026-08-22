export type RecentTxn = {
  id: string;
  description: string;
  amountMinor: bigint;
  categoryIds: string[];
  date: number;
};

const key = (t: RecentTxn) =>
  `${t.description}\u0000${t.amountMinor.toString()}\u0000${t.categoryIds.join(",")}`;

export function recentRepeats(
  transactions: RecentTxn[],
  limit: number = 3,
): RecentTxn[] {
  const seen = new Set<string>();
  const out: RecentTxn[] = [];
  const sorted = [...transactions].sort((a, b) => b.date - a.date);
  for (const t of sorted) {
    const k = key(t);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(t);
    if (out.length >= limit) break;
  }
  return out;
}