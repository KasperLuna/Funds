"use client";

import { Bitcoin, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HoldingRow } from "@/components/crypto/holding-row";
import type { Holding } from "@/lib/crypto/crypto-store";
import type { CoinPrice } from "@/lib/crypto/rates";

export interface HoldingsTableProps {
  rows: (Holding & { allocationPct: number })[];
  prices: Map<string, CoinPrice>;
  isMasked: boolean;
  onLogFirstTrade: () => void;
}

export const HoldingsTable = ({ rows, prices, isMasked, onLogFirstTrade }: HoldingsTableProps) => {
  if (rows.length === 0) {
    return (
      <div className="divide-y divide-(--border) rounded-(--radius-lg) border border-(--border) bg-(--surface-1)">
        <div className="flex flex-col items-center gap-2 py-10 text-center">
          <div className="text-(--accent)" aria-hidden>
            <Bitcoin className="h-8 w-8" />
          </div>
          <h2 className="text-base font-semibold">No holdings yet</h2>
          <p className="max-w-md text-sm text-zinc-500">
            Log a trade to start tracking your crypto portfolio.
          </p>
          <Button size="sm" className="mt-2" onClick={onLogFirstTrade}>
            <Plus className="h-4 w-4" />
            Log first trade
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="divide-y divide-(--border) rounded-(--radius-lg) border border-(--border) bg-(--surface-1)">
      {rows.map((h) => (
        <HoldingRow
          key={h.token.id}
          holding={h}
          price={h.token.coingeckoId ? prices.get(h.token.coingeckoId) : undefined}
          allocationPct={h.allocationPct}
          isMasked={isMasked}
        />
      ))}
    </div>
  );
};
