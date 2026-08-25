"use client";

import { Suspense, useEffect, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { HoldingsList } from "@/components/crypto/holdings-list";
import type { AccountOption } from "@/components/crypto/trade-capture";
import { useSync } from "@/lib/sync/sync-context";
import { queryKeys, useSyncQuery } from "@/lib/sync/sync-query";
import { useAssets } from "@/lib/assets";
import { usePrivacy } from "@/lib/privacy/privacy-context";

function CryptoContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const tradeParam = searchParams.get("trade") === "1";
  const { masked: privacy } = usePrivacy();
  const { userId } = useSync();
  const uid = userId ?? "dev-user";
  const { assets } = useAssets();
  const assetsById = useMemo(
    () => new Map(assets.map((a) => [a.id, a])),
    [assets],
  );

  useEffect(() => {
    if (tradeParam) router.replace("/dashboard/crypto", { scroll: false });
  }, [tradeParam, router]);

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
    <div className="mx-auto flex max-w-3xl flex-col gap-4 px-4">
      <header className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold tracking-tight">Crypto</h1>
      </header>

      <HoldingsList accounts={accounts} userId={uid} autoOpenTrade={tradeParam} masked={privacy} />
    </div>
  );
}

export default function CryptoPage() {
  return (
    <Suspense>
      <CryptoContent />
    </Suspense>
  );
}
