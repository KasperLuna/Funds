"use client";

import { useMemo } from "react";
import { HoldingsList } from "@/components/crypto/holdings-list";
import type { AccountOption } from "@/components/crypto/trade-capture";
import { queryKeys, useSyncQuery } from "@/lib/sync/sync-query";
import { useAssets } from "@/lib/assets";

export const CryptoPanel = () => {
  const { assets } = useAssets();
  const assetsById = useMemo(
    () => new Map(assets.map((a) => [a.id, a])),
    [assets],
  );

  const accountsQuery = useSyncQuery<AccountOption>({
    key: queryKeys.accounts,
    sql: "SELECT * FROM accounts WHERE deleted_at IS NULL AND archived = 0",
    select: (r) => ({
      id: String(r.id),
      name: String(r.name),
      kind: String(r.kind),
      assetId: String(r.asset_id),
      decimals: assetsById.get(String(r.asset_id))?.decimals ?? 2,
    }),
  });
  const accounts = accountsQuery.data ?? [];

  return (
    <div className="flex flex-col gap-4">
      <HoldingsList accounts={accounts} />
    </div>
  );
}
