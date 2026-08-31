"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useSync } from "@/lib/sync/sync-context";
import { queryKeys, useSyncMutation, useSyncQuery } from "@/lib/sync/sync-query";
import { useSyncStore } from "@/lib/sync/sync-store";
import { useUrlBridge } from "@/lib/url/use-url-bridge";
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
import { persistTrade } from "@/lib/crypto/persist-trade";
import { useAssets } from "@/lib/assets";
import { AllocationBar } from "@/components/crypto/allocation-bar";
import { HoldingsTotals } from "@/components/crypto/holdings-totals";
import { HoldingsTable } from "@/components/crypto/holdings-table";
import {
  TradeCapture,
  type TradePayload,
  type AccountOption,
} from "@/components/crypto/trade-capture";
import { Button } from "@/components/ui/button";
import { TokenAddSheet, TokenAddTrigger } from "@/components/crypto/token-add-sheet";

function computeValueUsd(holding: Holding, prices: Map<string, CoinPrice>): number {
  const dec = Number(holding.token.decimals) || 0;
  const qty = Number(holding.qtyMinor) / 10 ** dec;
  const price = holding.token.coingeckoId ? prices.get(holding.token.coingeckoId) : undefined;
  return qty * (price?.current_price ?? 0);
}

export interface HoldingsListProps {
  accounts?: AccountOption[];
}

export const HoldingsList = (props: HoldingsListProps) => {
  const {
    accounts = [],
  } = props;
  const { db } = useSync();
  const userId = useSyncStore((s) => s.userId);
  const { assets } = useAssets();
  const assetsById = useMemo(() => new Map(assets.map((a) => [a.id, a])), [assets]);
  const uid = userId ?? "dev-user";
  const [tradeOpen, setTradeOpen] = useState(false);
  const [addTokenOpen, setAddTokenOpen] = useState(false);
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

  // cavetail: deep-link bridge — opens the trade sheet when the page is
  // opened via /dashboard/assets?tab=crypto&trade=1. Reads the URL itself
  // (and strips the param) so the parent doesn't have to plumb a prop.
  useUrlBridge({ param: "trade", onMatch: () => setTradeOpen(true) });

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

  const coingeckoKey = useMemo(
    () => [...new Set(coingeckoIds)].sort().join(","),
    [coingeckoIds],
  );
  const primaryCode = accounts.length > 0 ? assetsById.get(accounts[0]!.assetId)?.code ?? "USD" : "USD";

  // honey: shared cache slot with dashboard-screen.tsx — both screens fetch
  // the same CoinGecko prices; keying on the same (coingeckoKey, primaryCode)
  // dedupes the request in the TanStack cache.
  const pricesQuery = useQuery({
    queryKey: ["prices", coingeckoKey, primaryCode],
    enabled: coingeckoIds.length > 0,
    queryFn: () => fetchPrices(coingeckoIds, (primaryCode || "USD").toLowerCase()),
  });
  const prices = pricesQuery.data ?? new Map();

  const totalValue = holdings.reduce((sum, h) => sum + computeValueUsd(h, prices), 0);

  const totalPL = holdings.reduce((sum, h) => {
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

  const allocationWithPct = holdings.map((h) => ({
    ...h,
    allocationPct: allocation.find((a) => a.symbol === h.token.symbol)?.pct ?? 0,
  }));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <HoldingsTotals totalValue={totalValue} totalPL={totalPL} />
        <div className="flex items-center gap-2">
          <TokenAddTrigger onClick={() => setAddTokenOpen(true)} />
          <Button size="sm" onClick={() => setTradeOpen(true)}>
            <Plus className="h-4 w-4" />
            Trade
          </Button>
        </div>
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
        onLogFirstTrade={() => setTradeOpen(true)}
      />

      <TradeCapture
        isOpen={tradeOpen}
        onOpenChange={setTradeOpen}
        accounts={accounts}
        tokens={tokens}
        prices={prices}
        onSave={handleTradeSave}
      />

      <TokenAddSheet
        isOpen={addTokenOpen}
        onOpenChange={setAddTokenOpen}
        existingTokens={tokens}
      />
    </div>
  );
};
