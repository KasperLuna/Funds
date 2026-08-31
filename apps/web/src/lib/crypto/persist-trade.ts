import type { SyncDatabase } from "@/lib/sync/types";
import type { Token } from "@/lib/crypto/crypto-store";
import type { AccountOption, TradePayload } from "@/components/crypto/trade-capture";

// Rescale a minor-unit qty from one decimal base to another, keeping integer math.
function rescaleMinor(minor: bigint, fromDecimals: number, toDecimals: number): bigint {
  if (fromDecimals === toDecimals) return minor;
  const diff = toDecimals - fromDecimals;
  if (diff > 0) return minor * 10n ** BigInt(diff);
  const divisor = 10n ** BigInt(-diff);
  return (minor + divisor / 2n) / divisor;
}

export async function persistTrade(
  db: SyncDatabase,
  uid: string,
  tokens: Token[],
  accounts: AccountOption[],
  trade: TradePayload,
): Promise<void> {
  const now = Date.now();
  const tokenId = trade.side === "buy" ? trade.buyTokenId : trade.sellTokenId;
  const token = tokens.find((t) => t.id === tokenId && !t.deletedAt);
  if (!token) return;

  // The capture stores crypto qty on a 10^8 base; rescale to the token's decimals.
  const capturedQtyMinor = trade.side === "buy" ? trade.buyAmountMinor : trade.sellAmountMinor;
  const qtyMinor = rescaleMinor(capturedQtyMinor, 8, token.decimals);
  // cavetail: CoinGecko rate is a plain USD float; store scaled integer minor units
  const priceExecMinor = BigInt(Math.round(trade.rate * 10 ** token.decimals));

  await db.table("token_transactions").upsert({
    id: `tt-${now.toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    token_id: tokenId,
    user_id: uid,
    amount_minor: Number(qtyMinor),
    // cavetail: rate scaled to token decimals, integer minor units
    // eslint-disable-next-line local/no-money-float
    price_at_execution_minor: Number(priceExecMinor),
    fee_minor: Number(trade.feeMinor),
    side: trade.side,
    timestamp: trade.date.getTime(),
    created_at: now,
    updated_at: now,
    deleted_at: null,
  });

  // Fiat leg — the money actually leaves/enters the linked fiat account.
  const fiatAccountId = trade.side === "buy" ? trade.sellAccountId : trade.buyAccountId;
  const fiatAssetId = trade.side === "buy" ? trade.sellAssetId : trade.buyAssetId;
  const fiatAmountMinor = trade.side === "buy" ? -trade.sellAmountMinor : trade.buyAmountMinor;
  await db.table("transactions").upsert({
    id: `txn-${now.toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    user_id: uid,
    account_id: fiatAccountId,
    asset_id: fiatAssetId,
    // cavetail: integer fiat minor units; stored as number for SQLite
    amount_minor: Number(fiatAmountMinor),
    type: trade.side === "buy" ? "expense" : "income",
    description: trade.description || (trade.side === "buy" ? `Bought ${token.symbol}` : `Sold ${token.symbol}`),
    category_ids: [],
    date: trade.date.getTime(),
    created_at: now,
    updated_at: now,
    deleted_at: null,
  });

  const feeAccount =
    trade.feeMinor > 0n ? accounts.find((a) => a.id === trade.feeAssetId) : undefined;
  if (feeAccount) {
    await db.table("transactions").upsert({
      id: `txn-${now.toString(36)}-${Math.random().toString(36).slice(2, 8)}-fee`,
      user_id: uid,
      account_id: feeAccount.id,
      asset_id: feeAccount.assetId,
      // cavetail: fee is integer fiat minor units from capture
      amount_minor: Number(-trade.feeMinor),
      type: "expense",
      description: "Trade fee",
      category_ids: [],
      date: trade.date.getTime(),
      created_at: now,
      updated_at: now,
      deleted_at: null,
    });
  }
}
