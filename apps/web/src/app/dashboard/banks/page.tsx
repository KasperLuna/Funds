"use client";

import { useCallback, useEffect, useMemo, useRef, useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
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
import { ReconcileSheet } from "@/components/banks/reconcile-sheet";
import { TransactionRow } from "@/components/banks/transaction-row";
import {
  TransactionFilters,
  filterTxns,
  type TxnFilters,
} from "@/components/banks/transaction-filters";
import { CaptureSheet } from "@/components/capture/CaptureSheet";
import { TransferSheet } from "@/components/capture/TransferSheet";
import { insertTransfer } from "@/lib/transfers/transfer-store";
import { useAssets } from "@/lib/assets";
import { formatMoney } from "@/lib/money";
import { usePrivacy } from "@/lib/privacy/privacy-context";
import { type VoicePrefill } from "@/components/capture/CaptureSheet";

const PAGE_SIZE = 50;

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
  return (
    <Suspense>
      <BanksContent />
    </Suspense>
  );
}

function BanksContent() {
  const { db, userId, isConnected, lastSyncedAt } = useSync();
  const { masked: privacy } = usePrivacy();
  const searchParams = useSearchParams();
  const router = useRouter();
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
  const [reconcileAccount, setReconcileAccount] = useState<Account | null>(null);
  const [editTxn, setEditTxn] = useState<Txn | null>(null);
  const undoDeleteTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [filters, setFilters] = useState<TxnFilters>({
    query: "",
    categoryIds: [],
    date: null,
  });

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
  }, [reload, isConnected, lastSyncedAt]);

  // Deep link from the long-press Add menu: open the transfer sheet once.
  useEffect(() => {
    if (searchParams.get("transfer") === "1") {
      setTransferOpen(true);
      router.replace("/dashboard/banks", { scroll: false });
    }
  }, [searchParams, router]);

  useEffect(() => () => {
    if (undoDeleteTimer.current) clearTimeout(undoDeleteTimer.current);
  }, []);

  const totalBalance = useMemo(
    () => accounts.reduce((sum, a) => sum + computeBalance(a, txns), 0n),
    [accounts, txns],
  );

  const visibleTxns = useMemo(
    () => {
      const byAccount = selectedAccountId
        ? txns.filter((t) => t.accountId === selectedAccountId)
        : txns;
      return filterTxns(byAccount, filters, {
        categories,
        accounts: accounts.map((a) => ({ id: a.id, name: a.name })),
      });
    },
    [txns, selectedAccountId, filters, categories, accounts],
  );

  // Newest → oldest; the latest transaction is first, scrolling loads older pages.
  const sortedDesc = useMemo(
    () =>
      [...visibleTxns].sort((a, b) => b.date - a.date || a.id.localeCompare(b.id)),
    [visibleTxns],
  );

  const pagedTxns = useMemo(() => sortedDesc.slice(0, visibleCount), [sortedDesc, visibleCount]);

  const grouped = useMemo(() => groupByDay(pagedTxns), [pagedTxns]);

  // Reset pagination when the account filter or data set changes.
  useEffect(() => setVisibleCount(PAGE_SIZE), [visibleTxns]);

  // Load the next page when the sentinel scrolls into view.
  useEffect(() => {
    const el = loadMoreRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setVisibleCount((c) => Math.min(c + PAGE_SIZE, sortedDesc.length));
        }
      },
      { rootMargin: "400px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [sortedDesc.length]);

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
    hideable: c.hideable,
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

  const handleReconcileSave = useCallback(
    async (row: Record<string, unknown>) => {
      await db.table("transactions").upsert(upsertTxnRow(uid, row));
      setReconcileAccount(null);
      await reload();
    },
    [db, reload, uid],
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
          <span
            className="font-display text-xl font-bold tabular-nums"
            aria-label={privacy ? "Total masked" : `Total ${fmt(totalBalance)}`}
          >
            {privacy ? "••••" : fmt(totalBalance)}
          </span>
        </div>
      </header>

      <div className="flex flex-wrap items-center gap-2 pb-1">
        <button
          onClick={() => setSelectedAccountId(null)}
          className={`shrink-0 min-h-11 rounded-md border px-3 py-1.5 text-sm font-medium transition-colors ${
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
              className={`shrink-0 min-h-11 rounded-md border px-3 py-1.5 text-sm font-medium transition-colors ${
                selectedAccountId === a.id
                  ? "border-(--accent) bg-(--accent) text-(--accent-foreground)"
                  : "border-(--border) bg-(--surface-2) text-zinc-500 hover:text-inherit"
              }`}
            >
              {a.name}
            </button>
          ))}
        <button
          onClick={() => { setEditAccount(null); setDialogOpen(true); }}
          aria-label="New account"
          className="inline-flex min-h-11 shrink-0 items-center gap-1 rounded-md border border-dashed border-(--border-strong) px-3 py-1.5 text-sm font-medium text-zinc-400 transition-colors hover:text-inherit"
        >
          <Plus className="h-4 w-4" aria-hidden />
          New
        </button>
      </div>

      {selectedAccountId && (
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3 rounded-(--radius-lg) border border-(--border) bg-(--surface-1) px-5 py-4">
          <div className="min-w-0">
            <p className="label-micro">This month</p>
            <p className="mt-0.5 truncate text-sm font-medium text-zinc-400">
              {new Date().toLocaleDateString(undefined, { month: "long" })}
            </p>
          </div>
          <span aria-hidden className="hidden h-8 w-px shrink-0 bg-(--border) sm:block" />
          <div>
            <p className="label-micro">Income</p>
            <p className="mt-0.5 font-display text-lg font-bold tabular-nums text-(--accent)" aria-label={privacy ? "Income masked" : undefined}>
              {privacy ? "••••" : fmt(stats.income)}
            </p>
          </div>
          <div>
            <p className="label-micro">Expense</p>
            <p className="mt-0.5 font-display text-lg font-bold tabular-nums text-(--danger)" aria-label={privacy ? "Expense masked" : undefined}>
              {privacy ? "••••" : fmt(stats.expense)}
            </p>
          </div>
          <div>
            <p className="label-micro">Net</p>
            <p className={`mt-0.5 font-display text-lg font-bold tabular-nums ${stats.net >= 0n ? "text-zinc-50" : "text-(--danger)"}`} aria-label={privacy ? "Net masked" : undefined}>
              {privacy ? "••••" : fmt(stats.net)}
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
          onAdjust={setReconcileAccount}
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

      <div className="sticky top-[65px] z-20 -mx-4 border-y border-(--border) bg-(--bg)/95 px-4 py-2.5 backdrop-blur md:top-0 md:-mx-0 md:border-x md:rounded-b-(--radius-md) md:px-4">
        <TransactionFilters
          filters={filters}
          onChange={setFilters}
          categories={categories}
          accounts={accounts}
        />
      </div>

      <section className="overflow-clip rounded-(--radius-lg) border border-(--border) bg-(--surface-1) divide-y divide-(--border)">
        {grouped.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-10 text-center">
            {accounts.length === 0 ? (
              <>
                <p className="text-sm font-semibold text-zinc-200">Add your first account</p>
                <p className="max-w-xs text-sm text-zinc-400">
                  Create a bank, cash, wallet, or exchange account to start tracking.
                </p>
                <Button onClick={() => { setEditAccount(null); setDialogOpen(true); }}>
                  <Plus className="h-4 w-4" aria-hidden /> New account
                </Button>
              </>
            ) : (
              <>
                <p className="text-sm text-zinc-500">No transactions yet</p>
                <Button size="sm" className="hidden md:inline-flex" onClick={() => setCaptureOpen(true)}>
                  <Plus className="h-4 w-4" aria-hidden /> Add transaction
                </Button>
              </>
            )}
          </div>
        ) : (
          <>
            <div className="hidden justify-end border-b border-(--border) bg-(--surface-2) px-4 py-2 md:flex">
              <Button size="sm" onClick={() => setCaptureOpen(true)}>
                <Plus className="h-4 w-4" aria-hidden /> Add transaction
              </Button>
            </div>
            <div className="border-b border-(--border) bg-(--surface-2) px-4 py-2 text-[11px] text-zinc-400 lg:hidden">
              Tap a transaction to edit · swipe right to duplicate · swipe left to delete
            </div>
            {grouped.map((g) => (
              <div key={g.day}>
                <p className="label-micro sticky top-[182px] z-10 bg-(--surface-2) px-4 py-1.5 md:top-[117px]">
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
            {sortedDesc.length > visibleCount && (
              <div
                ref={loadMoreRef}
                className="flex justify-center py-3 text-xs text-zinc-500"
                aria-hidden
              >
                Loading more…
              </div>
            )}
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

      <ReconcileSheet
        open={reconcileAccount !== null}
        onOpenChange={(open) => { if (!open) setReconcileAccount(null); }}
        account={reconcileAccount ?? (accounts[0] as Account)}
        currentBalance={reconcileAccount ? computeBalance(reconcileAccount, txns) : 0n}
        assetCode={reconcileAccount ? accountInfo[reconcileAccount.id]?.code : undefined}
        assetDecimals={reconcileAccount ? accountInfo[reconcileAccount.id]?.decimals : undefined}
        userId={uid}
        onSave={handleReconcileSave}
      />
    </div>
  );
}
