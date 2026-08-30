"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useSync } from "@/lib/sync/sync-context";
import { queryKeys, useSyncMutation, useSyncQuery } from "@/lib/sync/sync-query";
import type { SyncDatabase } from "@/lib/sync/types";
import {
  computeHoldings,
  portfolioAllocation,
  toToken,
  toTokenTxn,
  type Token,
  type TokenTransaction,
  type Holding,
} from "@/lib/crypto/crypto-store";
import { fetchPrices, type CoinPrice } from "@/lib/crypto/rates";
import { AllocationBar } from "@/components/crypto/allocation-bar";
import { HoldingsTotals } from "@/components/crypto/holdings-totals";
import { HoldingsTable } from "@/components/crypto/holdings-table";
import {
  TradeCapture,
  type TradePayload,
  type AccountOption,
} from "@/components/crypto/trade-capture";
import { Button } from "@/components/ui/button";

function computeValueUsd(holding: Holding, prices: Map<string, CoinPrice>): number {
  const dec = Number(holding.token.decimals) || 0;
  const qty = Number(holding.qtyMinor) / 10 ** dec;
  const price = holding.token.coingeckoId ? prices.get(holding.token.coingeckoId) : undefined;
  return qty * (price?.current_price ?? 0);
}

// Rescale a minor-unit qty from one decimal base to another, keeping integer math.
function rescaleMinor(minor: bigint, fromDecimals: number, toDecimals: number): bigint {
  if (fromDecimals === toDecimals) return minor;
  const diff = toDecimals - fromDecimals;
  if (diff > 0) return minor * 10n ** BigInt(diff);
  const divisor = 10n ** BigInt(-diff);
  return (minor + divisor / 2n) / divisor;
}

async function persistTrade(
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

export interface HoldingsListProps {
  accounts?: AccountOption[];
  userId?: string;
  isAutoOpenTrade?: boolean;
  isMasked?: boolean;
}

export const HoldingsList = (props: HoldingsListProps) => {
  const {
    accounts = [],
    userId,
    isAutoOpenTrade: autoOpenTrade = false,
    isMasked: masked = false,
  } = props;
  const { db } = useSync();
  const uid = userId ?? "dev-user";
  const [tradeOpen, setTradeOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const tokensQuery = useSyncQuery<Token>({
    key: queryKeys.tokens,
    sql: "SELECT * FROM tokens WHERE deleted_at IS NULL",
    select: toToken,
  });
  const tokens = tokensQuery.data ?? [];

  const txnsQuery = useSyncQuery<TokenTransaction>({
    key: queryKeys.tokenTransactions,
    sql: "SELECT * FROM token_transactions WHERE deleted_at IS NULL",
    select: toTokenTxn,
  });
  const txns = txnsQuery.data ?? [];

  // cavetail: deep-link bridge — opens the trade sheet once when the page
  // is opened via the long-press Add menu's ?trade=1 entry.
  useEffect(() => {
    if (autoOpenTrade) setTradeOpen(true);
  }, [autoOpenTrade]);

  // cavetail: setTimeout + clearTimeout are imperative browser timers, not
  // derived state. Auto-dismiss the error notice after 4s.
  useEffect(() => {
    if (!notice) return;
    const t = window.setTimeout(() => setNotice(null), 4000);
    return () => window.clearTimeout(t);
  }, [notice]);

  const tradeMutation = useSyncMutation<TradePayload>({
    keys: [queryKeys.tokens, queryKeys.tokenTransactions, queryKeys.transactions],
    mutationFn: async (trade: TradePayload) => {
      await persistTrade(db, uid, tokens, accounts, trade);
    },
    onError: () => setNotice("Couldn't log trade"),
  });

  const handleTradeSave = (trade: TradePayload) => {
    tradeMutation.mutate(trade, {
      onSuccess: () => {
        setTradeOpen(false);
        setNotice(`Trade logged (${trade.side})`);
      },
    });
  };

  const holdings = useMemo(() => computeHoldings(tokens, txns), [tokens, txns]);
  const allocation = useMemo(() => portfolioAllocation(holdings), [holdings]);

  // cavetail: coingeckoIds feeds the react-query key; allocating a fresh
  // array per render would re-key the query and re-fetch prices. KEEP.
  const coingeckoIds = useMemo(
    () => tokens.map((t) => t.coingeckoId).filter((id): id is string => !!id),
    [tokens],
  );

  const pricesQuery = useQuery({
    queryKey: ["crypto-prices", coingeckoIds.join(",")],
    enabled: coingeckoIds.length > 0,
    queryFn: () => fetchPrices(coingeckoIds),
  });
  const prices = pricesQuery.data ?? new Map();

  const totalValue = useMemo(
    () => holdings.reduce((sum, h) => sum + computeValueUsd(h, prices), 0),
    [holdings, prices],
  );

  const totalPL = useMemo(() => {
    return holdings.reduce((sum, h) => {
      const dec = Number(h.token.decimals) || 0;
      const qty = Number(h.qtyMinor) / 10 ** dec;
      const price = h.token.coingeckoId ? prices.get(h.token.coingeckoId) : undefined;
      const value = qty * (price?.current_price ?? 0);
      // cavetail: totalCostMinor = qty_minor × price_minor = qty×rate×10^(2·decimals);
      // /10^(2·decimals) recovers dollars. Display-only, not arithmetic.
      // eslint-disable-next-line local/no-money-float
      const costBasis = Number(h.totalCostMinor) / 10 ** (2 * dec);
      return sum + (value - costBasis);
    }, 0);
  }, [holdings, prices]);

  const allocationWithPct = holdings.map((h) => ({
    ...h,
    allocationPct: allocation.find((a) => a.symbol === h.token.symbol)?.pct ?? 0,
  }));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <HoldingsTotals totalValue={totalValue} totalPL={totalPL} isMasked={masked} />
        <Button size="sm" onClick={() => setTradeOpen(true)}>
          <Plus className="h-4 w-4" />
          Trade
        </Button>
      </div>

      {notice && (
        <div className="rounded-(--radius-md) border border-(--border-strong) bg-(--surface-2) px-3 py-2 text-sm text-zinc-200">
          {notice}
        </div>
      )}

      {allocation.length > 0 && (
        <AllocationBar allocation={allocation} />
      )}

      <HoldingsTable
        rows={allocationWithPct}
        prices={prices}
        isMasked={masked}
        onLogFirstTrade={() => setTradeOpen(true)}
      />

      <TradeCapture
        isOpen={tradeOpen}
        onOpenChange={setTradeOpen}
        userId={uid}
        accounts={accounts}
        tokens={tokens}
        prices={prices}
        onSave={handleTradeSave}
      />
    </div>
  );
};
