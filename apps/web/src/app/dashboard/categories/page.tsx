"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Plus, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSync } from "@/lib/sync/sync-context";
import {
  DEFAULT_CATEGORY_COLORS,
  categoryColor,
  computeBudgetUsage,
  budgetPeriodKey,
  budgetFor,
  type Category,
  type CategoryBudget,
} from "@/lib/categories/categories-store";
import type { Txn, Account } from "@/lib/accounts/accounts-store";
import { useAssets } from "@/lib/assets";
import { formatMoney, assetSymbol } from "@/lib/money";
import { usePrivacy } from "@/lib/privacy/privacy-context";
import {
  Dialog,
  DialogContent,
  DialogContentTitle,
  DialogContentDescription,
} from "@/components/ui/dialog";

function toCategory(row: Record<string, unknown>): Category {
  const name = String(row.name);
  return {
    id: String(row.id),
    name,
    color: categoryColor(name),
    hideable: Boolean(row.hideable),
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
    hideable: c.hideable ? 1 : 0,
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

export default function CategoriesPage() {
  const { db, userId, isConnected, lastSyncedAt } = useSync();
  const { masked: privacy } = usePrivacy();
  const uid = userId ?? "dev-user";
  const { assets } = useAssets();
  const assetsById = useMemo(() => new Map(assets.map((a) => [a.id, a])), [assets]);

  const [categories, setCategories] = useState<Category[]>([]);
  const [txns, setTxns] = useState<Txn[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [budgets, setBudgets] = useState<CategoryBudget[]>([]);
  const [editCategory, setEditCategory] = useState<Category | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const now = new Date();
  const [viewMonth, setViewMonth] = useState(() => ({
    year: now.getFullYear(),
    month: now.getMonth(),
  }));
  const monthOpts = useMemo(monthOptions, []);

  const shiftMonth = useCallback((delta: number) => {
    setViewMonth(({ year, month }) => {
      const d = new Date(year, month + delta, 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    });
  }, []);

  const reload = useCallback(async () => {
    const catRes = await db.query(`SELECT * FROM categories WHERE deleted_at IS NULL ORDER BY created_at DESC`);
    setCategories(catRes.rows.map(toCategory));
    const txnRes = await db.query(`SELECT * FROM transactions WHERE deleted_at IS NULL`);
    setTxns(txnRes.rows.map(toTxn));
    const accRes = await db.query(`SELECT * FROM accounts WHERE deleted_at IS NULL`);
    setAccounts(accRes.rows.map((r) => ({
      id: String(r.id),
      name: String(r.name),
      kind: String(r.kind) as Account["kind"],
      assetId: String(r.asset_id),
      openingBalanceMinor: BigInt(r.opening_balance_minor as number | string),
      createdAt: Number(r.created_at),
      updatedAt: Number(r.updated_at),
      deletedAt: r.deleted_at != null ? Number(r.deleted_at) : null,
    })));
    const budRes = await db.query(`SELECT * FROM category_budgets WHERE deleted_at IS NULL`);
    setBudgets(budRes.rows.map(toBudget));
  }, [db]);

  useEffect(() => {
    void reload();
  }, [reload, isConnected, lastSyncedAt]);

  const handleSave = useCallback(
    async (c: Category) => {
      await db.table("categories").upsert(categoryRow(uid, c));

      // Record the budget for the current period (auditable history): past
      // months keep their own entries untouched by later edits.
      const periodKey = budgetPeriodKey(viewMonth.year, viewMonth.month);
      const id = `budget-${c.id}-${periodKey}`;
      const monthStart = new Date(viewMonth.year, viewMonth.month, 1).getTime();
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

      await reload();
    },
    [db, reload, uid, viewMonth],
  );

  const handleDelete = useCallback(
    async (c: Category) => {
      const tomb = { ...c, deletedAt: Date.now(), updatedAt: Date.now() };
      await db.table("categories").upsert(categoryRow(uid, tomb));

      for (const txn of txns) {
        if (!txn.categoryIds.includes(c.id)) continue;
        const updatedIds = txn.categoryIds.filter((id) => id !== c.id);
        const assetId = accounts.find((a) => a.id === txn.accountId)?.assetId ?? "ast-1";
        await db.table("transactions").upsert(txnRow(uid, txn, updatedIds, assetId));
      }
      await reload();
    },
    [db, reload, txns, uid, accounts],
  );

  const budgetUsages = useMemo(
    () => computeBudgetUsage(categories, budgets, txns, viewMonth.year, viewMonth.month),
    [categories, budgets, txns, viewMonth],
  );

  const openNew = useCallback(() => {
    setEditCategory(null);
    setDialogOpen(true);
  }, []);

  const openEdit = useCallback((c: Category) => {
    setEditCategory(c);
    setDialogOpen(true);
  }, []);

  const defaultBudgetAssetId = useMemo(
    () =>
      accounts.find((a) => !a.deletedAt)?.assetId ??
      assets.find((a) => a.code === "USD")?.id ??
      assets[0]?.id ??
      null,
    [accounts, assets],
  );

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4 px-4">
      <header className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold tracking-tight">Categories</h1>
        <Button size="sm" onClick={openNew}>
          <Plus className="h-4 w-4" aria-hidden /> New category
        </Button>
      </header>

      {budgetUsages.length > 0 && (
        <div className="rounded-(--radius-lg) border border-(--border) bg-(--surface-1) p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="label-micro">Budget progress</h2>
            <div className="flex items-center gap-1">
              <button
                type="button"
                aria-label="Previous month"
                onClick={() => shiftMonth(-1)}
                className="grid h-9 w-9 place-items-center rounded-(--radius-md) border border-(--border) bg-(--surface-2) text-zinc-400 transition-colors hover:bg-(--surface-3) hover:text-inherit focus-visible:ring-2 focus-visible:ring-(--accent) focus-visible:outline-none"
              >
                <ChevronLeft className="h-4 w-4" aria-hidden />
              </button>
              <select
                aria-label="Budget month"
                value={budgetPeriodKey(viewMonth.year, viewMonth.month)}
                onChange={(e) => {
                  const opt = monthOpts.find((o) => o.value === e.target.value);
                  if (opt) setViewMonth({ year: opt.year, month: opt.month });
                }}
                className="h-9 rounded-(--radius-md) border border-(--border) bg-(--surface-2) px-2 text-sm text-zinc-200 focus-visible:ring-2 focus-visible:ring-(--accent) focus-visible:outline-none"
              >
                {monthOpts.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
              <button
                type="button"
                aria-label="Next month"
                onClick={() => shiftMonth(1)}
                className="grid h-9 w-9 place-items-center rounded-(--radius-md) border border-(--border) bg-(--surface-2) text-zinc-400 transition-colors hover:bg-(--surface-3) hover:text-inherit focus-visible:ring-2 focus-visible:ring-(--accent) focus-visible:outline-none"
              >
                <ChevronRight className="h-4 w-4" aria-hidden />
              </button>
            </div>
          </div>
          <div className="flex flex-col gap-3">
            {budgetUsages.map(({ category, spentMinor, budgetMinor, budgetAssetId }) => {
              const asset = budgetAssetId ? assetsById.get(budgetAssetId) : undefined;
              const decimals = asset?.decimals ?? 2;
              const code = asset?.code ?? undefined;
              const pct = Number((spentMinor * 10000n) / budgetMinor) / 100;
              const clampedPct = Math.min(pct, 100);
              const isWarning = pct >= 80 && pct <= 100;
              const isOver = pct > 100;
              return (
                <div key={category.id} className="flex flex-col gap-1">
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="flex min-w-0 items-center gap-2">
                      <span
                        className="h-3 w-3 shrink-0 rounded-full"
                        style={{ backgroundColor: category.color }}
                      />
                      <span className="flex min-w-0 flex-col">
                        <span className="truncate">{category.name}</span>
                        <span className="text-xs text-zinc-500" aria-label={privacy ? "Budget masked" : undefined}>
                          {privacy ? "••••" : `${formatMoney(budgetMinor, decimals, code)}/mo`}
                        </span>
                      </span>
                    </span>
                    <span className={`shrink-0 tabular-nums ${isOver ? "font-medium text-(--danger)" : isWarning ? "font-medium text-(--warning)" : "text-zinc-500"}`} aria-label={privacy ? "Spent masked" : undefined}>
                      {privacy
                        ? `${Math.round(pct)}%`
                        : `${formatMoney(spentMinor, decimals, code)} / ${formatMoney(budgetMinor, decimals, code)} · ${Math.round(pct)}%`}
                    </span>
                  </div>
                  <div className="h-1 w-full rounded-full bg-(--surface-3) overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${isOver ? "bg-(--danger)" : isWarning ? "bg-(--warning)" : "bg-(--accent)"}`}
                      style={{ width: `${clampedPct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
          <p className="mt-3 text-xs text-zinc-500">
            Budgets are recorded per month — changing one only affects this and future months.
          </p>
        </div>
      )}

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
            const budget = budgetFor(c, budgets, viewMonth.year, viewMonth.month);
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
                        {privacy ? "••••/mo" : `${formatMoney(budget.amountMinor, asset?.decimals ?? 2, asset?.code)}/mo`}
                      </span>
                    )}
                    {c.hideable && (
                      <span className="mt-0.5 w-fit rounded-full border border-(--border) bg-(--surface-2) px-2 py-0.5 text-xs text-zinc-500">
                        hidden
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

      {dialogOpen && (
        <CategoryDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          onSave={handleSave}
          editCategory={editCategory}
          assets={assets}
          defaultAssetId={defaultBudgetAssetId}
        />
      )}
    </div>
  );
}

function CategoryDialog({
  open,
  onOpenChange,
  onSave,
  editCategory,
  assets,
  defaultAssetId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (c: Category) => void;
  editCategory: Category | null;
  assets: Array<{ id: string; code: string; decimals: number }>;
  defaultAssetId: string | null;
}) {
  const [name, setName] = useState("");
  const [color, setColor] = useState(DEFAULT_CATEGORY_COLORS[0]!);
  const [hideable, setHideable] = useState(false);
  const [budget, setBudget] = useState("");
  const [assetId, setAssetId] = useState<string>("");

  useEffect(() => {
    if (open) {
      if (editCategory) {
        setName(editCategory.name);
        setColor(editCategory.color);
        setHideable(editCategory.hideable);
        setBudget(
          editCategory.monthlyBudgetMinor != null
            ? (Number(editCategory.monthlyBudgetMinor) / 10 ** (assets.find((a) => a.id === editCategory.assetId)?.decimals ?? 2)).toFixed(2)
            : "",
        );
        setAssetId(editCategory.assetId ?? defaultAssetId ?? "");
      } else {
        setName("");
        setColor(DEFAULT_CATEGORY_COLORS[0]!);
        setHideable(false);
        setBudget("");
        setAssetId(defaultAssetId ?? "");
      }
    }
  }, [open, editCategory, assets, defaultAssetId]);

  const decimals = assets.find((a) => a.id === assetId)?.decimals ?? 2;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    const now = Date.now();
    // cavetail: display-only formatting, not arithmetic
    // eslint-disable-next-line local/no-money-float
    const budgetMinor = budget.trim() ? BigInt(Math.round(Number(budget) * 10 ** decimals)) : null;
    if (editCategory) {
      onSave({
        ...editCategory,
        name: trimmed,
        color,
        hideable,
        monthlyBudgetMinor: budgetMinor,
        assetId: budgetMinor ? assetId : null,
        updatedAt: now,
      });
    } else {
      onSave({
        id: `cat-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
        name: trimmed,
        color,
        hideable,
        monthlyBudgetMinor: budgetMinor,
        assetId: budgetMinor ? assetId : null,
        createdAt: now,
        updatedAt: now,
      });
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogContentTitle>
          {editCategory ? "Edit category" : "New category"}
        </DialogContentTitle>
        <DialogContentDescription>
          {editCategory ? "Update category details." : "Create a spending category."}
        </DialogContentDescription>
        <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-4">
          <label className="flex flex-col gap-1.5">
            <span className="text-sm text-zinc-500">Name</span>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Groceries"
              className="h-11 rounded-(--radius-md) border border-(--border) bg-(--surface-2) px-3 text-sm text-zinc-200 placeholder:text-zinc-500 focus-visible:ring-2 focus-visible:ring-(--accent) focus-visible:outline-none"
              autoFocus
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-sm text-zinc-500">Color</span>
            <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Color">
              {DEFAULT_CATEGORY_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  role="radio"
                  aria-checked={color === c}
                  aria-label={c}
                  onClick={() => setColor(c)}
                  className={`h-8 w-8 rounded-full transition-transform ${
                    color === c ? "scale-110 ring-2 ring-white" : "hover:scale-105"
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </label>

          <div className="flex gap-2">
            <label className="flex flex-col gap-1.5 flex-1">
              <span className="text-sm text-zinc-500">Monthly budget (optional)</span>
              <input
                type="text"
                inputMode="decimal"
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                placeholder="0.00"
                className="h-11 rounded-(--radius-md) border border-(--border) bg-(--surface-2) px-3 text-sm text-zinc-200 placeholder:text-zinc-500 focus-visible:ring-2 focus-visible:ring-(--accent) focus-visible:outline-none"
              />
            </label>
            <label className="flex flex-col gap-1.5 w-32">
              <span className="text-sm text-zinc-500">Currency</span>
              <select
                value={assetId}
                onChange={(e) => setAssetId(e.target.value)}
                disabled={!budget.trim()}
                className="h-11 rounded-(--radius-md) border border-(--border) bg-(--surface-2) px-3 text-sm text-zinc-200 focus-visible:ring-2 focus-visible:ring-(--accent) focus-visible:outline-none disabled:opacity-50"
              >
                {assets.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.code} ({assetSymbol(a.code).trim()})
                  </option>
                ))}
              </select>
            </label>
          </div>
          {budget.trim() && assetId && (
            <p className="-mt-2 text-xs text-zinc-500">
              Budget in {assets.find((a) => a.id === assetId)?.code ?? "USD"}; recorded per month.
            </p>
          )}

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={hideable}
              onChange={(e) => setHideable(e.target.checked)}
              className="h-4 w-4 rounded border-(--border)"
            />
            <div className="flex flex-col">
              <span className="text-sm font-medium">Hidden</span>
              <span className="text-xs text-zinc-500">In privacy mode, amounts for its transactions stay hidden</span>
            </div>
          </label>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!name.trim()}>
              {editCategory ? "Save" : "Create"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
