"use client";

import { useMemo } from "react";
import { useSync } from "@/lib/sync/sync-context";
import { queryKeys, useSyncMutation, useSyncQuery } from "@/lib/sync/sync-query";
import { resolveCategoryColor } from "@/lib/categories/categories-store";
import type { Account, Txn } from "@/lib/accounts/accounts-store";
import type { Category } from "@/lib/categories/categories-store";
import { toTemplate, type Template } from "@/lib/templates/templates-store";
import { useAssets } from "@/lib/assets";
import type { RowRecord } from "@/lib/sync";
import { type RecentTxn } from "@/lib/capture";
import { CaptureSheet } from "@/components/capture/capture-sheet";
import { useCaptureSheet } from "@/components/capture/capture-sheet-context";

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

/**
 * Mounts the capture sheet once at the dashboard layout level. The sheet is
 * lazy: the body (useForm + Zod + keypad) only spins up when the provider is
 * open, so closed renders cost nothing.
 *
 * Owns its own data hook reads via `useSyncQuery` — TanStack Query dedupes by
 * key with the dashboard's other consumers, so this doesn't add round-trips.
 */
export const CaptureSheetMount = () => {
  const { open, setOpen, prefill, defaultAccountId, editingTxnId } = useCaptureSheet();
  const { db, userId } = useSync();
  const uid = userId ?? "local";
  const { assets } = useAssets();

  const accountsQuery = useSyncQuery({
    key: queryKeys.accounts,
    sql: "SELECT * FROM accounts WHERE deleted_at IS NULL AND archived = 0",
    select: toAccount,
  });
  const accounts = accountsQuery.data ?? [];

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

  const templatesQuery = useSyncQuery({
    key: queryKeys.templates,
    sql: "SELECT * FROM templates WHERE deleted_at IS NULL",
    select: toTemplate as (row: RowRecord) => Template,
  });
  const templates = templatesQuery.data ?? [];

  const assetsById = useMemo(
    () => new Map(assets.map((a) => [a.id, a])),
    [assets],
  );

  const captureAccounts = useMemo(
    () =>
      accounts.map((a) => ({
        id: a.id,
        name: a.name,
        assetId: a.assetId,
        decimals: assetsById.get(a.assetId)?.decimals ?? 2,
        assetCode: assetsById.get(a.assetId)?.code ?? "",
      })),
    [accounts, assetsById],
  );
  const captureCategories = useMemo(
    () => categories.map((c) => ({ id: c.id, name: c.name, color: c.color })),
    [categories],
  );

  const activeTxns = useMemo(() => txns.filter((t) => !t.deletedAt), [txns]);
  const recentTxns = useMemo(
    () => [...activeTxns].sort((a, b) => b.date - a.date).slice(0, 5),
    [activeTxns],
  );
  const captureRecent: RecentTxn[] = useMemo(
    () =>
      recentTxns.map((t) => ({
        id: t.id,
        description: t.description,
        amountMinor: t.amountMinor,
        categoryIds: t.categoryIds,
        date: t.date,
      })),
    [recentTxns],
  );

  const saveTxn = useSyncMutation({
    keys: [queryKeys.transactions],
    mutationFn: async (row: Record<string, unknown>) => {
      const next = editingTxnId ? { ...row, id: editingTxnId } : row;
      await db.table("transactions").upsert(next);
    },
  });

  const createCategoryMutation = useSyncMutation({
    keys: [queryKeys.categories],
    mutationFn: async (c: Category) => {
      await db.table("categories").upsert({
        id: c.id,
        user_id: uid,
        name: c.name,
        color: c.color,
        hideable: c.hideable ? 1 : 0,
        exclude_from_analytics: c.excludeFromAnalytics ? 1 : 0,
        monthly_budget_minor:
          c.monthlyBudgetMinor != null ? Number(c.monthlyBudgetMinor) : null,
        asset_id: c.assetId ?? null,
        created_at: c.createdAt,
        updated_at: c.updatedAt,
        deleted_at: c.deletedAt ?? null,
      });
    },
  });

  if (!open) return null;

  return (
    <CaptureSheet
      isOpen={open}
      onOpenChange={(o) => {
        if (!o) {
          setOpen(false);
        }
      }}
      userId={uid}
      accounts={captureAccounts}
      categories={captureCategories}
      recentTxns={captureRecent}
      templates={templates}
      voicePrefill={prefill}
      defaultAccountId={defaultAccountId}
      editing={!!editingTxnId}
      onSave={(row) => saveTxn.mutate(row)}
      onCreateCategory={(c) => createCategoryMutation.mutate(c)}
    />
  );
};
