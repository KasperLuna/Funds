"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Bitcoin } from "lucide-react";
import { MemorySyncDatabase, type SyncDatabase } from "@/lib/sync";
import {
  computeHoldings,
  portfolioAllocation,
  type Token,
  type TokenTransaction,
} from "@/lib/crypto/crypto-store";
import { HoldingRow } from "@/components/crypto/holding-row";
import { AllocationBar } from "@/components/crypto/allocation-bar";

function toToken(row: Record<string, unknown>): Token {
  return {
    id: String(row.id),
    symbol: String(row.symbol),
    name: String(row.name),
    decimals: Number(row.decimals),
    createdAt: Number(row.created_at),
    updatedAt: Number(row.updated_at),
    deletedAt: row.deleted_at != null ? Number(row.deleted_at) : null,
  };
}

function toTokenTxn(row: Record<string, unknown>): TokenTransaction {
  return {
    id: String(row.id),
    tokenId: String(row.token_id),
    amountMinor: BigInt(row.amount_minor as number | string),
    priceAtExecutionMinor: BigInt(row.price_at_execution_minor as number | string),
    feeMinor: BigInt(row.fee_minor as number | string),
    side: String(row.side) as "buy" | "sell",
    timestamp: Number(row.timestamp),
    deletedAt: row.deleted_at != null ? Number(row.deleted_at) : null,
  };
}

export default function CryptoPage() {
  const [db] = useState<SyncDatabase>(() => {
    const d = new MemorySyncDatabase();
    d.connect();
    return d;
  });
  const [tokens, setTokens] = useState<Token[]>([]);
  const [txns, setTxns] = useState<TokenTransaction[]>([]);

  const reload = useCallback(async () => {
    const tokRes = await db.query("SELECT * FROM tokens WHERE deleted_at IS NULL");
    setTokens(tokRes.rows.map(toToken));
    const txnRes = await db.query("SELECT * FROM token_transactions WHERE deleted_at IS NULL");
    setTxns(txnRes.rows.map(toTokenTxn));
  }, [db]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const holdings = useMemo(() => computeHoldings(tokens, txns), [tokens, txns]);
  const allocation = useMemo(() => portfolioAllocation(holdings), [holdings]);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4 px-4">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Crypto</h1>
      </header>

      {allocation.length > 0 && (
        <section className="rounded-(--radius-lg) border border-(--border) bg-(--surface-1) p-4">
          <p className="mb-2 text-sm text-slate-400">Portfolio allocation</p>
          <AllocationBar allocation={allocation} />
        </section>
      )}

      <section className="rounded-(--radius-lg) border border-(--border) bg-(--surface-1) divide-y divide-(--border)">
        {holdings.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-10 text-center">
            <div className="text-(--accent)" aria-hidden>
              <Bitcoin className="h-8 w-8" />
            </div>
            <h2 className="text-base font-semibold">No holdings yet</h2>
            <p className="max-w-md text-sm text-slate-400">
              Trades and holdings land in Phase 8 (CoinGecko rates + cost-basis engine).
            </p>
          </div>
        ) : (
          holdings.map((h) => <HoldingRow key={h.token.id} holding={h} />)
        )}
      </section>
    </div>
  );
}
