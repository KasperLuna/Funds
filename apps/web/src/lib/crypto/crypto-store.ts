export type Token = {
  id: string;
  symbol: string;
  name: string;
  decimals: number;
  coingeckoId?: string | null;
  createdAt: number;
  updatedAt: number;
  deletedAt?: number | null;
};

export type TokenTransaction = {
  id: string;
  tokenId: string;
  amountMinor: bigint;
  priceAtExecutionMinor: bigint;
  feeMinor: bigint;
  side: "buy" | "sell";
  timestamp: number;
  deletedAt?: number | null;
};

/** Map a synced `tokens` row (snake_case) to the app shape. */
export function toToken(row: Record<string, unknown>): Token {
  return {
    id: String(row.id),
    symbol: String(row.symbol),
    name: String(row.name),
    decimals: Number(row.decimals),
    coingeckoId: row.coingecko_id != null ? String(row.coingecko_id) : null,
    createdAt: Number(row.created_at),
    updatedAt: Number(row.updated_at),
    deletedAt: row.deleted_at != null ? Number(row.deleted_at) : null,
  };
}

/** Map a synced `token_transactions` row (snake_case) to the app shape. */
export function toTokenTxn(row: Record<string, unknown>): TokenTransaction {
  return {
    id: String(row.id),
    tokenId: String(row.token_id),
    amountMinor: BigInt(row.amount_minor as number | string),
    priceAtExecutionMinor: BigInt(row.price_at_execution_minor as number | string),
    feeMinor: BigInt((row.fee_minor as number | string | null | undefined) ?? 0),
    side: String(row.side) as "buy" | "sell",
    timestamp: Number(row.timestamp),
    deletedAt: row.deleted_at != null ? Number(row.deleted_at) : null,
  };
}

export type Holding = {
  token: Token;
  qtyMinor: bigint;
  avgCostMinor: bigint;
  totalCostMinor: bigint;
};

export function computeHoldings(
  tokens: Token[],
  txns: TokenTransaction[],
): Holding[] {
  const map = new Map<string, Holding>();
  for (const token of tokens) {
    if (token.deletedAt) continue;
    map.set(token.id, {
      token,
      qtyMinor: 0n,
      avgCostMinor: 0n,
      totalCostMinor: 0n,
    });
  }
  for (const t of txns) {
    if (t.deletedAt) continue;
    const h = map.get(t.tokenId);
    if (!h) continue;
    const signed = t.side === "buy" ? t.amountMinor : -t.amountMinor;
    const cost = t.amountMinor * t.priceAtExecutionMinor + t.feeMinor;
    const signedCost = t.side === "buy" ? cost : -cost;
    h.qtyMinor += signed;
    h.totalCostMinor += signedCost;
  }
  const result = [...map.values()].filter((h) => h.qtyMinor !== 0n);
  for (const h of result) {
    h.avgCostMinor =
      h.qtyMinor !== 0n ? h.totalCostMinor / h.qtyMinor : 0n;
  }
  return result;
}

export function portfolioAllocation(
  holdings: Holding[],
): Array<{ symbol: string; pct: number }> {
  const total = holdings.reduce((s, h) => s + (h.qtyMinor > 0n ? h.qtyMinor : 0n), 0n);
  if (total === 0n) return [];
  return holdings
    .map((h) => ({
      symbol: h.token.symbol,
      pct: Number((h.qtyMinor * 10000n) / total) / 100,
    }))
    .sort((a, b) => b.pct - a.pct);
}
