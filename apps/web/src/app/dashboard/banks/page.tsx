"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSync } from "@/lib/sync/sync-context";
import type { TransferRows } from "@/lib/capture";
import {
  computeBalance,
  groupByDay,
  monthStats,
  type Account,
  type Txn,
} from "@/lib/accounts/accounts-store";
import { type Category, categoryColor } from "@/lib/categories/categories-store";

import { AccountCard } from "@/components/banks/account-card";
import { AccountDialog } from "@/components/banks/account-dialog";
import { TransactionRow } from "@/components/banks/transaction-row";
import { CaptureSheet } from "@/components/capture/CaptureSheet";
import { TransferSheet } from "@/components/capture/TransferSheet";
import { insertTransfer } from "@/lib/transfers/transfer-store";
import { useAssets } from "@/lib/assets";
import { formatMoney } from "@/lib/money";
import type { VoicePrefill } from "@/components/capture/CaptureSheet";

function toAccount(row: Record<string, unknown>): Account {
  const colors = row.colors;
  let parsed: { primary_color?: string; secondary_color?: string } | null = null;
  if (colors != null) {
    if (typeof colors === "string") {
      try {
        parsed = JSON.parse(colors) as { primary_color?: string; secondary_color?: string };
      } catch {
        parsed = null;
      }
    } else if (typeof colors === "object") {
      parsed = colors as { primary_color?: string; secondary_color?: string };
    }
  }
  return {
    id: String(row.id),
    name: String(row.name),
    kind: String(row.kind) as Account["kind"],
    assetId: String(row.asset_id),
    openingBalanceMinor: BigInt(row.opening_balance_minor as number | string),
    primaryColor: parsed?.primary_color ?? null,
    secondaryColor: parsed?.secondary_color ?? null,
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

function upsertAccountRow(userId: string, a: Account): Record<string, unknown> {
  const colors =
    a.primaryColor || a.secondaryColor
      ? JSON.stringify({
          primary_color: a.primaryColor ?? undefined,
          secondary_color: a.secondaryColor ?? undefined,
        })
      : null;
  return {
    id: a.id,
    user_id: userId,
    name: a.name,
    kind: a.kind,
    asset_id: a.assetId,
    opening_balance_minor: Number(a.openingBalanceMinor),
    colors,
    archived: 0,
    created_at: a.createdAt,
    updated_at: a.updatedAt,
    deleted_at: a.deletedAt ?? null,
  };
}

function upsertTxnRow(userId: string, row: Record<string, unknown>): Record<string, unknown> {
  return {
    id: String(row.id),
    user_id: userId,
    account_id: String(row.account_id),
    asset_id: String(row.asset_id ?? "ast-1"),
    // cavetail: wire value is already a number (minor units); pass through, no float math
    // eslint-disable-next-line local/no-money-float
    amount_minor: Number(row.amount_minor),
    type: String(row.type),
    description: String(row.description ?? ""),
    category_ids: row.category_ids ?? [],
    date: Number(row.date),
    created_at: Number(row.created_at),
    updated_at: Number(row.updated_at),
    deleted_at: row.deleted_at ?? null,
  };
}

function toCategory(row: Record<string, unknown>): Category {
  return {
    id: String(row.id),
    name: String(row.name),
    color: categoryColor(String(row.name)),
    hideable: Boolean(row.hideable),
    monthlyBudgetMinor: row.monthly_budget_minor != null ? BigInt(row.monthly_budget_minor as number | string) : null,
    assetId: row.asset_id != null ? String(row.asset_id) : null,
    createdAt: Number(row.created_at),
    updatedAt: Number(row.updated_at),
    deletedAt: row.deleted_at != null ? Number(row.deleted_at) : null,
  };
}

function formatDayHeader(day: string): string {
  const [year, month, dayNum] = day.split("-").map(Number);
  const date = new Date(year!, month! - 1, dayNum);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (date.toDateString() === today.toDateString()) return "Today";
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
  return date.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export default function BanksPage() {
  const { db, userId, isConnected } = useSync();
  const uid = userId ?? "dev-user";
  const { assets } = useAssets();
  const assetsById = useMemo(
    () => new Map(assets.map((a) => [a.id, a])),
    [assets],
  );
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [txns, setTxns] = useState<Txn[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editAccount, setEditAccount] = useState<Account | null>(null);
  const [captureOpen, setCaptureOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const [editTxn, setEditTxn] = useState<Txn | null>(null);
  const undoDeleteTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const reload = useCallback(async () => {
    const accRes = await db.query(`SELECT * FROM accounts WHERE deleted_at IS NULL`);
    setAccounts(accRes.rows.map(toAccount));
    const txnRes = await db.query(`SELECT * FROM transactions WHERE deleted_at IS NULL`);
    setTxns(txnRes.rows.map(toTxn));
    const catRes = await db.query(`SELECT * FROM categories WHERE deleted_at IS NULL`);
    setCategories(catRes.rows.map(toCategory));
  }, [db]);

  // Re-query once the sync engine connects (it swaps the db impl asynchronously).
  useEffect(() => {
    void reload();
  }, [reload, isConnected]);

  useEffect(() => () => {
    if (undoDeleteTimer.current) clearTimeout(undoDeleteTimer.current);
  }, []);

  const totalBalance = useMemo(
    () => accounts.reduce((sum, a) => sum + computeBalance(a, txns), 0n),
    [accounts, txns],
  );

  const visibleTxns = useMemo(
    () =>
      selectedAccountId
        ? txns.filter((t) => t.accountId === selectedAccountId)
        : txns,
    [txns, selectedAccountId],
  );

  const grouped = useMemo(() => groupByDay(visibleTxns), [visibleTxns]);

  const stats = useMemo(() => {
    const now = new Date();
    return monthStats(visibleTxns, now.getFullYear(), now.getMonth());
  }, [visibleTxns]);

  const selectedAccount = useMemo(
    () => accounts.find((a) => a.id === selectedAccountId) ?? null,
    [accounts, selectedAccountId],
  );

  const categoryOptions = categories.map((c) => ({
    id: c.id,
    name: c.name,
    color: c.color,
  }));

  const categoryInfoList = categories.map((c) => ({
    id: c.id,
    name: c.name,
    color: c.color,
  }));

  const handleAccountSave = useCallback(
    async (a: Account) => {
      await db.table("accounts").upsert(upsertAccountRow(uid, a));
      await reload();
    },
    [db, reload, uid],
  );

  const handleAccountDelete = useCallback(
    async (a: Account) => {
      const tomb = { ...a, deletedAt: Date.now(), updatedAt: Date.now() };
      await db.table("accounts").upsert(upsertAccountRow(uid, tomb));

      const acctTxns = txns.filter((t) => t.accountId === a.id);
      for (const txn of acctTxns) {
        const deletedTxn = { ...txn, deletedAt: Date.now() };
        const row: Record<string, unknown> = {
          id: deletedTxn.id,
          user_id: uid,
          account_id: deletedTxn.accountId,
          asset_id: a.assetId,
          // cavetail: display-only formatting, not arithmetic
          // eslint-disable-next-line local/no-money-float
          amount_minor: Number(deletedTxn.amountMinor),
          type: deletedTxn.type,
          description: deletedTxn.description,
          category_ids: deletedTxn.categoryIds,
          date: deletedTxn.date,
          created_at: Date.now(),
          updated_at: Date.now(),
          deleted_at: deletedTxn.deletedAt,
        };
        await db.table("transactions").upsert(upsertTxnRow(uid, row));
      }

      if (selectedAccountId === a.id) setSelectedAccountId(null);
      await reload();
    },
    [db, reload, selectedAccountId, txns, uid],
  );

  const handleAccountArchive = useCallback(
    async (a: Account) => {
      const now = Date.now();
      const archived = {
        ...a,
        deletedAt: a.deletedAt ? null : now,
        updatedAt: now,
      };
      await db.table("accounts").upsert(upsertAccountRow(uid, archived));
      await reload();
    },
    [db, reload, uid],
  );

  const handleTxnSave = useCallback(
    async (row: Record<string, unknown>) => {
      // Preserve the original row id when editing, so we update in place.
      const next = editTxn ? { ...row, id: editTxn.id } : row;
      await db.table("transactions").upsert(upsertTxnRow(uid, next));
      setEditTxn(null);
      await reload();
    },
    [db, reload, uid, editTxn],
  );

  const handleTxnEdit = useCallback((txn: Txn) => {
    setEditTxn(txn);
    setCaptureOpen(true);
  }, []);

  const handleTxnDelete = useCallback(
    async (txn: Txn) => {
      await db.table("transactions").upsert(upsertTxnRow(uid, {
        id: txn.id,
        user_id: uid,
        account_id: txn.accountId,
        asset_id: txn.accountId ? (accounts.find((a) => a.id === txn.accountId)?.assetId ?? "ast-1") : "ast-1",
        // cavetail: wire value is already minor units; no arithmetic
        // eslint-disable-next-line local/no-money-float
        amount_minor: Number(txn.amountMinor),
        type: txn.type,
        description: txn.description,
        category_ids: txn.categoryIds,
        date: txn.date,
        created_at: Date.now(),
        updated_at: Date.now(),
        deleted_at: Date.now(),
      }));
      // Keep the row mounted so its Undo toast stays clickable, then refresh.
      if (undoDeleteTimer.current) clearTimeout(undoDeleteTimer.current);
      undoDeleteTimer.current = setTimeout(() => void reload(), 5000);
    },
    [db, reload, uid, accounts],
  );

  const handleTxnUndoDelete = useCallback(
    async (txn: Txn) => {
      if (undoDeleteTimer.current) {
        clearTimeout(undoDeleteTimer.current);
        undoDeleteTimer.current = null;
      }
      await db.table("transactions").upsert(upsertTxnRow(uid, {
        id: txn.id,
        user_id: uid,
        account_id: txn.accountId,
        asset_id: txn.accountId ? (accounts.find((a) => a.id === txn.accountId)?.assetId ?? "ast-1") : "ast-1",
        // cavetail: wire value is already minor units; no arithmetic
        // eslint-disable-next-line local/no-money-float
        amount_minor: Number(txn.amountMinor),
        type: txn.type,
        description: txn.description,
        category_ids: txn.categoryIds,
        date: txn.date,
        created_at: Date.now(),
        updated_at: Date.now(),
        deleted_at: null,
      }));
      await reload();
    },
    [db, reload, uid, accounts],
  );

  const handleTxnDuplicate = useCallback(
    async (txn: Txn) => {
      const now = Date.now();
      const copy: Record<string, unknown> = {
        id: `txn-${now.toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
        user_id: uid,
        account_id: txn.accountId,
        asset_id: txn.accountId ? (accounts.find((a) => a.id === txn.accountId)?.assetId ?? "ast-1") : "ast-1",
        // cavetail: wire value is already minor units; no arithmetic
        // eslint-disable-next-line local/no-money-float
        amount_minor: Number(txn.amountMinor),
        type: txn.type,
        description: txn.description,
        category_ids: txn.categoryIds,
        date: now,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      };
      await db.table("transactions").upsert(upsertTxnRow(uid, copy));
      await reload();
    },
    [db, reload, uid, accounts],
  );

  const accountInfo = useMemo(() => {
    const map: Record<string, { name: string; code: string; decimals: number }> = {};
    for (const a of accounts) {
      const asset = assetsById.get(a.assetId);
      map[a.id] = { name: a.name, code: asset?.code ?? "", decimals: asset?.decimals ?? 2 };
    }
    return map;
  }, [accounts, assetsById]);

  const primaryInfo = selectedAccount
    ? accountInfo[selectedAccount.id]
    : accounts.length > 0
      ? accountInfo[accounts[0]!.id]
      : undefined;

  const fmt = (minor: bigint) =>
    formatMoney(minor, primaryInfo?.decimals ?? 2, primaryInfo?.code);

  const txnPrefill: VoicePrefill | undefined = editTxn
    ? {
        accountId: editTxn.accountId,
        amountInput: (() => {
          const dec = accountInfo[editTxn.accountId]?.decimals ?? 2;
          const abs = editTxn.amountMinor < 0n ? -editTxn.amountMinor : editTxn.amountMinor;
          return (Number(abs) / 10 ** dec).toFixed(dec);
        })(),
        categoryIds: editTxn.categoryIds,
        description: editTxn.description,
        type: editTxn.type,
        date: editTxn.date,
      }
    : undefined;

  const handleTransferSave = useCallback(
    async (rows: TransferRows) => {
      await insertTransfer(db, rows);
      await reload();
    },
    [db, reload],
  );

  const openRename = useCallback(
    (a: Account) => {
      setEditAccount(a);
      setDialogOpen(true);
    },
    [],
  );

  const accountOptions = accounts
    .filter((a) => !a.deletedAt)
    .map((a) => ({
      id: a.id,
      name: a.name,
      assetId: a.assetId,
      decimals: assetsById.get(a.assetId)?.decimals ?? 2,
      assetCode: assetsById.get(a.assetId)?.code ?? "",
    }));

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4 px-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-bold tracking-tight">Banks</h1>
        <div className="flex items-center gap-3">
          <span className="text-sm text-zinc-500">Total</span>
          <span className="font-display text-xl font-bold tabular-nums">
            {fmt(totalBalance)}
          </span>
          <Button size="sm" variant="outline" onClick={() => setTransferOpen(true)}>
            Transfer
          </Button>
          <Button size="sm" onClick={() => { setEditAccount(null); setDialogOpen(true); }}>
            <Plus className="h-4 w-4" aria-hidden /> New account
          </Button>
        </div>
      </header>

      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <button
          onClick={() => setSelectedAccountId(null)}
          className={`shrink-0 rounded-md border px-3 py-1.5 text-sm font-medium transition-colors ${
            selectedAccountId === null
              ? "border-(--accent) bg-(--accent) text-(--accent-foreground)"
              : "border-(--border) bg-(--surface-2) text-zinc-500 hover:text-inherit"
          }`}
        >
          All
        </button>
        {accounts
          .filter((a) => !a.deletedAt)
          .map((a) => (
            <button
              key={a.id}
              onClick={() => setSelectedAccountId(a.id)}
              className={`shrink-0 rounded-md border px-3 py-1.5 text-sm font-medium transition-colors ${
                selectedAccountId === a.id
                  ? "border-(--accent) bg-(--accent) text-(--accent-foreground)"
                  : "border-(--border) bg-(--surface-2) text-zinc-500 hover:text-inherit"
              }`}
            >
              {a.name}
            </button>
          ))}
      </div>

      {selectedAccountId && (
        <div className="flex items-center gap-6 rounded-(--radius-lg) border border-(--border) bg-(--surface-1) px-5 py-4">
          <div>
            <p className="label-micro">Income</p>
            <p className="mt-0.5 font-display text-lg font-bold tabular-nums text-(--accent)">
              {fmt(stats.income)}
            </p>
          </div>
          <div>
            <p className="label-micro">Expense</p>
            <p className="mt-0.5 font-display text-lg font-bold tabular-nums text-(--danger)">
              {fmt(stats.expense)}
            </p>
          </div>
          <div>
            <p className="label-micro">Net</p>
            <p className={`mt-0.5 font-display text-lg font-bold tabular-nums ${stats.net >= 0n ? "text-zinc-50" : "text-(--danger)"}`}>
              {fmt(stats.net)}
            </p>
          </div>
        </div>
      )}

      {selectedAccount && (
        <AccountCard
          account={selectedAccount}
          balance={computeBalance(selectedAccount, txns)}
          assetCode={accountInfo[selectedAccount.id]?.code}
          assetDecimals={accountInfo[selectedAccount.id]?.decimals}
          onRename={openRename}
          onDelete={handleAccountDelete}
          onArchive={handleAccountArchive}
        />
      )}

      {categories.length === 0 && (
        <div className="flex items-center justify-between gap-3 rounded-(--radius-md) border border-(--border-strong) bg-(--surface-2) px-3 py-2.5">
          <p className="text-xs text-zinc-400">
            <span className="font-semibold text-zinc-200">No categories yet</span> — log a trade or tap a transaction to categorize spending.
          </p>
          <Link
            href="/dashboard/categories"
            className="shrink-0 rounded-(--radius-sm) border border-(--border-strong) px-2.5 py-1 text-xs font-semibold"
          >
            Create categories
          </Link>
        </div>
      )}

      <section className="rounded-(--radius-lg) border border-(--border) bg-(--surface-1) divide-y divide-(--border)">
        {grouped.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-10 text-center">
            <p className="text-sm text-zinc-500">No transactions yet</p>
            <Button size="sm" onClick={() => setCaptureOpen(true)}>
              <Plus className="h-4 w-4" aria-hidden /> Add transaction
            </Button>
          </div>
        ) : (
          <>
            <div className="border-b border-(--border) bg-(--surface-2) px-4 py-2 text-[11px] text-zinc-500 lg:hidden">
              Tap a transaction to edit · swipe right to duplicate · swipe left to delete
            </div>
            {grouped.map((g) => (
              <div key={g.day}>
                <p className="sticky top-0 z-10 bg-(--surface-2) px-4 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                  {formatDayHeader(g.day)}
                </p>
                {g.items.map((t) => {
                  const info = accountInfo[t.accountId];
                  return (
                    <TransactionRow
                      key={t.id}
                      txn={t}
                      categories={categoryInfoList}
                      accountName={info?.name}
                      assetCode={info?.code}
                      assetDecimals={info?.decimals}
                      onEdit={handleTxnEdit}
                      onDuplicate={handleTxnDuplicate}
                      onDelete={handleTxnDelete}
                      onUndoDelete={handleTxnUndoDelete}
                    />
                  );
                })}
              </div>
            ))}
            <div className="flex justify-center py-3">
              <Button size="sm" onClick={() => setCaptureOpen(true)}>
                <Plus className="h-4 w-4" aria-hidden /> Add transaction
              </Button>
            </div>
          </>
        )}
      </section>

      <AccountDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setEditAccount(null);
        }}
        onSave={handleAccountSave}
        editAccount={editAccount}
      />

      <CaptureSheet
        open={captureOpen}
        onOpenChange={(open) => {
          setCaptureOpen(open);
          if (!open) setEditTxn(null);
        }}
        userId={uid}
        accounts={accountOptions}
        categories={categoryOptions}
        recentTxns={[]}
        onSave={handleTxnSave}
        defaultAccountId={selectedAccountId ?? undefined}
        voicePrefill={txnPrefill}
        editing={!!editTxn}
      />

      <TransferSheet
        open={transferOpen}
        onOpenChange={setTransferOpen}
        userId={uid}
        accounts={accountOptions}
        onSave={(rows) => void handleTransferSave(rows)}
        defaultFromAccountId={selectedAccountId ?? undefined}
      />
    </div>
  );
}
