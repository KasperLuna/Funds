"use client";

import { useMemo } from "react";
import { HoldingsList } from "@/components/crypto/holdings-list";
import type { AccountOption } from "@/components/crypto/trade-capture";
import { useSync } from "@/lib/sync/sync-context";
import { queryKeys, useSyncQuery } from "@/lib/sync/sync-query";
import { useAssets } from "@/lib/assets";
import { usePrivacy } from "@/lib/privacy/privacy-context";

export function CryptoPanel({ autoOpenTrade }: { autoOpenTrade?: boolean }) {
  const { masked: privacy } = usePrivacy();
  const { userId } = useSync();
  const uid = userId ?? "dev-user";
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
      <HoldingsList accounts={accounts} userId={uid} autoOpenTrade={autoOpenTrade} masked={privacy} />
    </div>
  );
}
