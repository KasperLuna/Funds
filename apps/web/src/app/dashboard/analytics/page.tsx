"use client";

import { useMemo } from "react";
import { queryKeys, useSyncQuery } from "@/lib/sync/sync-query";
import type { Account, Txn } from "@/lib/accounts/accounts-store";
import type { Category } from "@/lib/categories/categories-store";
import { toScheduledTxn } from "@/lib/scheduled/scheduled-store";
import type { RowRecord } from "@/lib/sync";
import { resolveCategoryColor } from "@/lib/categories/categories-store";
import { useAssets } from "@/lib/assets";
import {
  spendingByMonth,
  savingsRate,
  categoryBreakdown,
  cashFlowForecast,
  spendingAnomalies,
} from "@/lib/analytics/compute";
import { SavingsRateCard } from "@/components/analytics/savings-rate-card";
import { SpendingTrendsCard } from "@/components/analytics/spending-trends-card";
import { CategoryBreakdownCard } from "@/components/analytics/category-breakdown-card";
import { CashFlowForecastCard } from "@/components/analytics/cash-flow-forecast-card";
import { AnomalyAlertsCard } from "@/components/analytics/anomaly-alerts-card";

function toAccount(row: RowRecord): Account {
  return {
    id: String(row.id),
    name: String(row.name),
    kind: String(row.kind) as Account["kind"],
    assetId: String(row.asset_id),
    openingBalanceMinor: BigInt(row.opening_balance_minor as string | bigint),
    createdAt: Number(row.created_at),
    updatedAt: Number(row.updated_at),
    deletedAt: row.deleted_at ? Number(row.deleted_at) : null,
  };
}

function toTxn(row: RowRecord): Txn {
  return {
    id: String(row.id),
    accountId: String(row.account_id),
    assetId: String(row.asset_id ?? ""),
    amountMinor: BigInt(row.amount_minor as string | bigint),
    type: String(row.type) as Txn["type"],
    description: String(row.description ?? ""),
    categoryIds: Array.isArray(row.category_ids)
      ? (row.category_ids as string[])
      : [],
    date: Number(row.date),
    transferId: row.transfer_id != null ? String(row.transfer_id) : null,
    deletedAt: row.deleted_at ? Number(row.deleted_at) : null,
  };
}

function toCategory(row: RowRecord): Category {
  return {
    id: String(row.id),
    name: String(row.name),
    color: resolveCategoryColor(row),
    hideable: Boolean(row.hideable),
    excludeFromAnalytics: Boolean(row.exclude_from_analytics),
    monthlyBudgetMinor: row.monthly_budget_minor != null
      ? BigInt(row.monthly_budget_minor as string | bigint)
      : null,
    assetId: row.asset_id != null ? String(row.asset_id) : null,
    createdAt: Number(row.created_at),
    updatedAt: Number(row.updated_at),
    deletedAt: row.deleted_at ? Number(row.deleted_at) : null,
  };
}

export type AssetInfo = { code: string; decimals: number };

export default function AnalyticsPage() {
  const { assets } = useAssets();
  const assetsById = useMemo(
    () => new Map(assets.map((a) => [a.id, a])),
    [assets],
  );

  const accountsQuery = useSyncQuery({
    key: queryKeys.accounts,
    sql: "SELECT * FROM accounts WHERE deleted_at IS NULL AND archived = 0",
    select: toAccount,
  });
  const accounts = accountsQuery.data ?? [];

  const accountAssetInfo = useMemo(() => {
    const map: Record<string, AssetInfo> = {};
    for (const a of accounts) {
      const asset = assetsById.get(a.assetId);
      map[a.id] = { code: asset?.code ?? "", decimals: asset?.decimals ?? 2 };
    }
    return map;
  }, [accounts, assetsById]);

  const primaryCode = accounts.length > 0
    ? accountAssetInfo[accounts[0]!.id]?.code ?? ""
    : "";

  const txnsQuery = useSyncQuery({
    key: queryKeys.transactions,
    scope: "all",
    sql: "SELECT * FROM transactions",
    select: toTxn,
  });
  const txns = txnsQuery.data ?? [];

  const categoriesQuery = useSyncQuery({
    key: queryKeys.categories,
    scope: "all",
    sql: "SELECT * FROM categories",
    select: toCategory,
  });
  const categories = categoriesQuery.data ?? [];

  const scheduledQuery = useSyncQuery({
    key: queryKeys.scheduledTransactions,
    sql: "SELECT * FROM scheduled_transactions WHERE deleted_at IS NULL",
    select: toScheduledTxn,
  });
  const scheduled = scheduledQuery.data ?? [];

  const spending = useMemo(() => spendingByMonth(txns, categories, 12), [txns, categories]);
  const rates = useMemo(() => savingsRate(txns, categories, 12), [txns, categories]);

  const now = new Date();
  const catBreakdown = useMemo(
    () => categoryBreakdown(txns, categories, now.getFullYear(), now.getMonth()),
    [txns, categories],
  );

  const cashFlow = useMemo(
    () => cashFlowForecast(scheduled, txns, categories, 3),
    [scheduled, txns, categories],
  );

  const anomalies = useMemo(() => spendingAnomalies(txns, categories), [txns, categories]);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4 px-4">
      <header>
        <h1 className="font-display text-2xl font-bold tracking-tight">
          Insights
        </h1>
      </header>

      <SavingsRateCard data={rates} />
      <SpendingTrendsCard data={spending} code={primaryCode} />
      <CategoryBreakdownCard data={catBreakdown} accountInfo={accountAssetInfo} />
      <CashFlowForecastCard data={cashFlow} code={primaryCode} />
      <AnomalyAlertsCard data={anomalies} code={primaryCode} />
    </div>
  );
}
