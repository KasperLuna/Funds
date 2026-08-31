"use client";

import { useMemo, useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSync } from "@/lib/sync/sync-context";
import { queryKeys, useSyncMutation, useSyncQuery } from "@/lib/sync/sync-query";
import {
  resolveCategoryColor,
  computeBudgetUsage,
  budgetPeriodKey,
  budgetFor,
  type Category,
  type CategoryBudget,
} from "@/lib/categories/categories-store";
import type { Txn, Account } from "@/lib/accounts/accounts-store";
import { useAssets } from "@/lib/assets";
import { formatMoney } from "@/lib/money";
import { usePrivacyStore } from "@/lib/privacy/privacy-store";
import { useUrlDate } from "@/lib/url/use-url-state";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { CategoryDialog } from "./category-dialog";
import { BudgetProgressCard } from "./budget-progress-card";

function toCategory(row: Record<string, unknown>): Category {
  const name = String(row.name);
  return {
    id: String(row.id),
    name,
    color: resolveCategoryColor(row),
    hideable: Boolean(row.hideable),
    excludeFromAnalytics: Boolean(row.exclude_from_analytics),
    monthlyBudgetMinor: row.monthly_budget_minor != null ? BigInt(row.monthly_budget_minor as number | string) : null,
    assetId: row.asset_id != null ? String(row.asset_id) : null,
    createdAt: Number(row.created_at),
    updatedAt: Number(row.updated_at),
    deletedAt: row.deleted_at != null ? Number(row.deleted_at) : null,
  };
}

function toTxn(row: Record<string, unknown>): Txn {
  return {
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
  };
}

function toBudget(row: Record<string, unknown>): CategoryBudget {
  return {
    id: String(row.id),
    categoryId: String(row.category_id),
    assetId: String(row.asset_id),
    monthStart: Number(row.month_start),
    amountMinor: BigInt(row.amount_minor as number | string),
    createdAt: Number(row.created_at),
    updatedAt: Number(row.updated_at),
    deletedAt: row.deleted_at != null ? Number(row.deleted_at) : null,
  };
}

function categoryRow(userId: string, c: Category): Record<string, unknown> {
  return {
    id: c.id,
    user_id: userId,
    name: c.name,
    color: c.color ?? null,
    hideable: c.hideable ? 1 : 0,
    exclude_from_analytics: c.excludeFromAnalytics ? 1 : 0,
    monthly_budget_minor: c.monthlyBudgetMinor != null ? Number(c.monthlyBudgetMinor) : null,
    asset_id: c.assetId ?? null,
    created_at: c.createdAt,
    updated_at: c.updatedAt,
    deleted_at: c.deletedAt ?? null,
  };
}

function txnRow(userId: string, txn: Txn, categoryIds: string[], assetId: string): Record<string, unknown> {
  return {
    id: txn.id,
    user_id: userId,
    account_id: txn.accountId,
    asset_id: assetId,
    // cavetail: display-only formatting, not arithmetic
    // eslint-disable-next-line local/no-money-float
    amount_minor: Number(txn.amountMinor),
    type: txn.type,
    description: txn.description,
    category_ids: categoryIds,
    date: txn.date,
    created_at: Date.now(),
    updated_at: Date.now(),
    deleted_at: txn.deletedAt ?? null,
  };
}

function monthOptions(): Array<{ value: string; label: string; year: number; month: number }> {
  const now = new Date();
  const options: Array<{ value: string; label: string; year: number; month: number }> = [];
  for (let i = 0; i < 13; i += 1) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    options.push({
      value: budgetPeriodKey(d.getFullYear(), d.getMonth()),
      label: d.toLocaleDateString(undefined, { month: "long", year: "numeric" }),
      year: d.getFullYear(),
      month: d.getMonth(),
    });
  }
  return options;
}

export const CategoriesScreen = () => {
  const { db, userId } = useSync();
  const privacy = usePrivacyStore((s) => s.masked);
  const uid = userId ?? "dev-user";
  const { assets } = useAssets();
  const assetsById = useMemo(() => new Map(assets.map((a) => [a.id, a])), [assets]);

  const categoriesQuery = useSyncQuery({
    key: queryKeys.categories,
    scope: "ordered",
    sql: "SELECT * FROM categories WHERE deleted_at IS NULL ORDER BY created_at DESC",
    select: toCategory,
  });
  const txnsQuery = useSyncQuery({
    key: queryKeys.transactions,
    sql: "SELECT * FROM transactions WHERE deleted_at IS NULL",
    select: toTxn,
  });
  const accountsQuery = useSyncQuery({
    key: queryKeys.accounts,
    sql: "SELECT * FROM accounts WHERE deleted_at IS NULL AND archived = 0",
    select: (row) => ({
      id: String(row.id),
      name: String(row.name),
      kind: String(row.kind) as Account["kind"],
      assetId: String(row.asset_id),
      openingBalanceMinor: BigInt(row.opening_balance_minor as number | string),
      createdAt: Number(row.created_at),
      updatedAt: Number(row.updated_at),
      deletedAt: row.deleted_at != null ? Number(row.deleted_at) : null,
    }),
  });
  const budgetsQuery = useSyncQuery({
    key: queryKeys.categoryBudgets,
    sql: "SELECT * FROM category_budgets WHERE deleted_at IS NULL",
    select: toBudget,
  });

  const categories = categoriesQuery.data ?? [];
  const txns = txnsQuery.data ?? [];
  const accounts = accountsQuery.data ?? [];
  const budgets = budgetsQuery.data ?? [];

  const [editCategory, setEditCategory] = useState<Category | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<Category | null>(null);
  const now = new Date();
  const [viewMonth, setViewMonth] = useUrlDate("month");
  const monthOpts = useMemo(monthOptions, []);
  const effectiveViewMonth = viewMonth ?? {
    year: now.getFullYear(),
    month: now.getMonth(),
  };

  const shiftMonth = (delta: number) => {
    const d = new Date(effectiveViewMonth.year, effectiveViewMonth.month + delta, 1);
    setViewMonth({ year: d.getFullYear(), month: d.getMonth() });
  };

  const saveCategory = useSyncMutation({
    keys: [queryKeys.categories, queryKeys.categoryBudgets],
    mutationFn: async (c: Category) => {
      await db.table("categories").upsert(categoryRow(uid, c));

      // Record the budget for the current period (auditable history): past
      // months keep their own entries untouched by later edits.
      const periodKey = budgetPeriodKey(effectiveViewMonth.year, effectiveViewMonth.month);
      const id = `budget-${c.id}-${periodKey}`;
      const monthStart = new Date(effectiveViewMonth.year, effectiveViewMonth.month, 1).getTime();
      const ts = Date.now();
      const hasBudget = c.monthlyBudgetMinor != null && c.monthlyBudgetMinor > 0n;
      await db.table("category_budgets").upsert({
        id,
        user_id: uid,
        category_id: c.id,
        asset_id: hasBudget ? (c.assetId ?? null) : null,
        month_start: monthStart,
        amount_minor: hasBudget ? Number(c.monthlyBudgetMinor) : 0,
        created_at: ts,
        updated_at: ts,
        deleted_at: hasBudget ? null : ts,
      });
    },
  });

  const handleSave = (c: Category) => {
    void saveCategory.mutate(c);
  };

  const deleteCategory = useSyncMutation({
    keys: [queryKeys.categories, queryKeys.transactions],
    mutationFn: async (c: Category) => {
      const tomb = { ...c, deletedAt: Date.now(), updatedAt: Date.now() };
      await db.table("categories").upsert(categoryRow(uid, tomb));

      for (const txn of txns) {
        if (!txn.categoryIds.includes(c.id)) continue;
        const updatedIds = txn.categoryIds.filter((id) => id !== c.id);
        const assetId = accounts.find((a) => a.id === txn.accountId)?.assetId ?? "ast-1";
        await db.table("transactions").upsert(txnRow(uid, txn, updatedIds, assetId));
      }
    },
  });

  const handleDelete = (c: Category) => {
    setPendingDelete(c);
  };

  const confirmDelete = () => {
    if (!pendingDelete) return;
    void deleteCategory.mutate(pendingDelete);
    setPendingDelete(null);
  };

  // honey: budgetUsages scans every txn × every category once; the result feeds
  // the overall budget bar + N per-category rows. Re-running on every render
  // would reformat every row's BigInt math.
  const budgetUsages = useMemo(
    () => computeBudgetUsage(categories, budgets, txns, effectiveViewMonth.year, effectiveViewMonth.month),
    [categories, budgets, txns, effectiveViewMonth],
  );

  const openNew = () => {
    setEditCategory(null);
    setIsDialogOpen(true);
  };

  const openEdit = (c: Category) => {
    setEditCategory(c);
    setIsDialogOpen(true);
  };

  const defaultBudgetAssetId =
    accounts.find((a) => !a.deletedAt)?.assetId ??
    assets.find((a) => a.code === "USD")?.id ??
    assets[0]?.id ??
    null;

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4 px-4">
      <header className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold tracking-tight">Categories</h1>
        <Button size="sm" onClick={openNew}>
          <Plus className="h-4 w-4" aria-hidden /> New category
        </Button>
      </header>

      <BudgetProgressCard
        budgetUsages={budgetUsages}
        effectiveViewMonth={effectiveViewMonth}
        monthOpts={monthOpts}
        assetsById={assetsById}
        privacy={privacy}
        onShiftMonth={shiftMonth}
        onSelectMonth={(year, month) => setViewMonth({ year, month })}
      />

      {categories.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-10 text-center">
          <p className="text-sm text-zinc-500">No categories yet</p>
          <Button size="sm" onClick={openNew}>
            <Plus className="h-4 w-4" aria-hidden /> Add category
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 min-[480px]:grid-cols-2 sm:grid-cols-3">
          {categories.map((c) => {
            const asset = c.assetId ? assetsById.get(c.assetId) : undefined;
            const budget = budgetFor(c, budgets, effectiveViewMonth.year, effectiveViewMonth.month);
            return (
              <div
                key={c.id}
                className="flex min-w-0 items-center justify-between gap-2 rounded-(--radius-lg) border border-(--border) bg-(--surface-1) p-4"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span
                    className="h-4 w-4 shrink-0 rounded-full"
                    style={{ backgroundColor: c.color }}
                    aria-hidden
                  />
                  <div className="flex min-w-0 flex-col">
                    <span className="truncate text-sm font-medium">{c.name}</span>
                    {budget && (
                      <span className="truncate text-xs text-zinc-500" aria-label={privacy ? "Budget masked" : undefined}>
                        {privacy ? "••••" : formatMoney(budget.amountMinor, asset?.decimals ?? 2, asset?.code)}
                      </span>
                    )}
                    {c.hideable && (
                      <span className="mt-0.5 w-fit rounded-full border border-(--border) bg-(--surface-2) px-2 py-0.5 text-xs text-zinc-500">
                        hidden
                      </span>
                    )}
                    {c.excludeFromAnalytics && (
                      <span className="mt-0.5 w-fit rounded-full border border-(--border) bg-(--surface-2) px-2 py-0.5 text-xs text-zinc-500">
                        stats-excluded
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    aria-label={`Edit ${c.name}`}
                    onClick={() => openEdit(c)}
                    className="rounded-(--radius-sm) p-1.5 text-zinc-500 hover:bg-(--surface-3) hover:text-inherit"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    aria-label={`Delete ${c.name}`}
                    onClick={() => handleDelete(c)}
                    className="rounded-(--radius-sm) p-1.5 text-zinc-500 hover:bg-(--surface-3) hover:text-(--danger)"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {isDialogOpen && (
        <CategoryDialog
          isOpen={isDialogOpen}
          onOpenChange={setIsDialogOpen}
          onSave={handleSave}
          editCategory={editCategory}
          assets={assets}
          defaultAssetId={defaultBudgetAssetId}
        />
      )}

      <Sheet open={pendingDelete !== null} onOpenChange={(open) => { if (!open) setPendingDelete(null); }}>
        <SheetContent className="flex flex-col gap-4 p-0">
          <div className="flex flex-col gap-4 px-6 pb-6 pt-6">
            <SheetTitle>Delete category?</SheetTitle>
            <SheetDescription>
              This deletes the category and removes it from all tagged transactions.
              Past transactions keep their amounts but lose this category tag.
            </SheetDescription>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setPendingDelete(null)}>
                Cancel
              </Button>
              <Button type="button" variant="destructive" onClick={confirmDelete}>
                Delete
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
};
