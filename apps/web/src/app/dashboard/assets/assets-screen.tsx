"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { SegmentedControl, type SegmentOption } from "@/components/ui/segmented";
import { BanksPanel, toAccount } from "@/components/assets/banks-panel";
import { CryptoPanel } from "@/components/assets/crypto-panel";
import { queryKeys, useSyncQuery } from "@/lib/sync/sync-query";
import { useAssets } from "@/lib/assets";
import { usePrivacy } from "@/lib/privacy/privacy-context";
import { computeBalance, type Txn } from "@/lib/accounts/accounts-store";
import { formatMoney } from "@/lib/money";

type Tab = "banks" | "crypto";

const TABS: SegmentOption<Tab>[] = [
  { value: "banks", label: "Accounts" },
  { value: "crypto", label: "Crypto" },
];

export const AssetsScreen = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { masked: privacy } = usePrivacy();
  const { assets } = useAssets();
  const assetsById = useMemo(
    () => new Map(assets.map((a) => [a.id, a])),
    [assets],
  );

  const initialTab = (searchParams.get("tab") === "crypto" ? "crypto" : "banks") as Tab;
  const [tab, setTab] = useState<Tab>(initialTab);
  const autoOpenTransfer = searchParams.get("transfer") === "1";
  const autoOpenTrade = searchParams.get("trade") === "1";

  // cavetail: deep-link bridge — rewrites URL search params (a browser API
  // outside React's tree) when the page is opened via /dashboard/assets?transfer=1
  // or ?trade=1, so the param doesn't linger on refresh.
  useEffect(() => {
    if (autoOpenTransfer) {
      setTab("banks");
      router.replace("/dashboard/assets?tab=banks", { scroll: false });
    }
    if (autoOpenTrade) {
      setTab("crypto");
      router.replace("/dashboard/assets?tab=crypto", { scroll: false });
    }
  }, [autoOpenTransfer, autoOpenTrade, router]);

  const handleTabChange = (v: Tab) => {
    setTab(v);
    router.replace(`/dashboard/assets?tab=${v}`, { scroll: false });
  };

  const accountsQuery = useSyncQuery({
    key: queryKeys.accounts,
    sql: "SELECT * FROM accounts WHERE deleted_at IS NULL AND archived = 0",
    select: toAccount,
  });
  const txnsQuery = useSyncQuery({
    key: queryKeys.transactions,
    sql: "SELECT * FROM transactions WHERE deleted_at IS NULL",
    select: (row: Record<string, unknown>): Txn => ({
      id: String(row.id),
      accountId: String(row.account_id),
      assetId: String(row.asset_id ?? ""),
      amountMinor: BigInt(row.amount_minor as number | string),
      type: String(row.type) as Txn["type"],
      description: String(row.description ?? ""),
      categoryIds: Array.isArray(row.category_ids) ? (row.category_ids as string[]) : [],
      date: Number(row.date),
      transferId: row.transfer_id != null ? String(row.transfer_id) : null,
      deletedAt: row.deleted_at != null ? Number(row.deleted_at) : null,
    }),
  });

  const accounts = accountsQuery.data ?? [];
  const txns = txnsQuery.data ?? [];

  const totalBalance = useMemo(
    () =>
      accounts.reduce((sum, a) => {
        const acctTxns = txns.filter((t) => t.accountId === a.id);
        return sum + computeBalance(a, acctTxns);
      }, 0n),
    [accounts, txns],
  );

  const primaryInfo = accounts.length > 0
    ? (() => {
        const first = accounts[0]!;
        const asset = assetsById.get(first.assetId);
        return { code: asset?.code ?? "", decimals: asset?.decimals ?? 2 };
      })()
    : undefined;

  const fmt = (minor: bigint) =>
    formatMoney(minor, primaryInfo?.decimals ?? 2, primaryInfo?.code);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4 px-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-bold tracking-tight">Assets</h1>
        <div className="flex items-center gap-3">
          <span className="text-sm text-zinc-500">Total</span>
          <span
            className="font-display text-xl font-bold tabular-nums"
            aria-label={privacy ? "Total masked" : `Total ${fmt(totalBalance)}`}
          >
            {privacy ? "••••" : fmt(totalBalance)}
          </span>
        </div>
      </header>

      <SegmentedControl options={TABS} value={tab} onChange={handleTabChange} />

      {tab === "banks" ? (
        <BanksPanel autoOpenTransfer={autoOpenTransfer} />
      ) : (
        <CryptoPanel autoOpenTrade={autoOpenTrade} />
      )}
    </div>
  );
};
