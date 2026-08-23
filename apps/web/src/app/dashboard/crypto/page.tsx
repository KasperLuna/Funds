"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { HoldingsList } from "@/components/crypto/holdings-list";
import type { AccountOption } from "@/components/crypto/trade-capture";
import { useSync } from "@/lib/sync/sync-context";
import { useAssets } from "@/lib/assets";

export default function CryptoPage() {
  const { db, userId, isConnected, lastSyncedAt } = useSync();
  const uid = userId ?? "dev-user";
  const { assets } = useAssets();
  const assetsById = useMemo(
    () => new Map(assets.map((a) => [a.id, a])),
    [assets],
  );
  const [accounts, setAccounts] = useState<AccountOption[]>([]);

  const reloadAccounts = useCallback(async () => {
    const res = await db.query(`SELECT * FROM accounts WHERE deleted_at IS NULL`);
    setAccounts(
      res.rows.map((r) => ({
        id: String(r.id),
        name: String(r.name),
        kind: String(r.kind),
        assetId: String(r.asset_id),
        decimals: assetsById.get(String(r.asset_id))?.decimals ?? 2,
      })),
    );
  }, [db, assetsById]);

  useEffect(() => {
    void reloadAccounts();
  }, [reloadAccounts, isConnected, lastSyncedAt]);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4 px-4">
      <header className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold tracking-tight">Crypto</h1>
      </header>

      <HoldingsList accounts={accounts} userId={uid} />
    </div>
  );
}
