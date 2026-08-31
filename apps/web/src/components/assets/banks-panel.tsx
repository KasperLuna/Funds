"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
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
import {
  AccountConfirmDialog,
  type AccountConfirmAction,
} from "@/components/banks/bank-confirm-dialogs";
import { ReconcileSheet } from "@/components/banks/reconcile-sheet";
import {
  filterTxns,
  type TxnFilters,
} from "@/components/banks/transaction-filters";
import { CaptureSheet } from "@/components/capture/capture-sheet";
import { TransferSheet } from "@/components/capture/transfer-sheet";
import { insertTransfer } from "@/lib/transfers/transfer-store";
import { useAssets } from "@/lib/assets";
import { formatMoney } from "@/lib/money";
import { usePrivacy } from "@/lib/privacy/privacy-context";
import { type VoicePrefill } from "@/components/capture/capture-sheet";
import { useSync } from "@/lib/sync/sync-context";
import { queryKeys, useSyncMutation, useSyncQuery } from "@/lib/sync/sync-query";
import { BankList } from "@/components/assets/bank-list";
import {
  BankTransactionsList,
  type CategoryInfo,
  type AccountInfo,
} from "@/components/assets/bank-transactions-list";

const PAGE_SIZE = 50;

export function toAccount(row: Record<string, unknown>): Account {
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
    archived: Boolean(row.archived),
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
    archived: a.archived ? 1 : 0,
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
    color:
      typeof row.color === "string" && row.color
        ? row.color
        : categoryColor(String(row.name)),
    hideable: Boolean(row.hideable),
    excludeFromAnalytics: Boolean(row.exclude_from_analytics),
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

interface BanksPanelProps {
  isAutoOpenTransfer?: boolean;
}

export const BanksPanel = (props: BanksPanelProps) => {
  const { isAutoOpenTransfer } = props;
  const { db, userId } = useSync();
  const queryClient = useQueryClient();
  const { masked: privacy } = usePrivacy();
  const searchParams = useSearchParams();
  const router = useRouter();
  const uid = userId ?? "dev-user";
  const { assets } = useAssets();
  const assetsById = useMemo(
    () => new Map(assets.map((a) => [a.id, a])),
    [assets],
  );
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
  const [showArchived, setShowArchived] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{
    account: Account;
    action: AccountConfirmAction;
  } | null>(null);

  const accountsQuery = useSyncQuery({
    key: queryKeys.accounts,
    sql: `SELECT * FROM accounts WHERE deleted_at IS NULL AND archived = 0`,
    select: toAccount,
  });
  const txnsQuery = useSyncQuery({
    key: queryKeys.transactions,
    sql: `SELECT * FROM transactions WHERE deleted_at IS NULL`,
    select: toTxn,
  });
  const categoriesQuery = useSyncQuery({
    key: queryKeys.categories,
    sql: `SELECT * FROM categories WHERE deleted_at IS NULL`,
    select: toCategory,
  });
  const archivedAccountsQuery = useSyncQuery({
    key: queryKeys.accounts,
    scope: "archived",
    sql: `SELECT * FROM accounts WHERE deleted_at IS NULL AND archived = 1`,
    select: toAccount,
  });
  const accounts = accountsQuery.data ?? [];
  const txns = txnsQuery.data ?? [];
  const categories = categoriesQuery.data ?? [];
  const archivedAccounts = archivedAccountsQuery.data ?? [];
  const dataPending = accountsQuery.isPending || txnsQuery.isPending || categoriesQuery.isPending;

  // Deep link: filter by category from budget pulse / categories page.
  useEffect(() => {
    const catId = searchParams.get("category");
    if (catId) {
      setFilters((f) => ({ ...f, categoryIds: [catId] }));
      setVisibleCount(PAGE_SIZE);
      router.replace("/dashboard/assets?tab=banks", { scroll: false });
    }
  }, [searchParams, router]);

  // Deep link: scroll to and highlight a specific transaction.
  useEffect(() => {
    const txnId = searchParams.get("txn");
    if (txnId) {
      router.replace("/dashboard/assets?tab=banks", { scroll: false });
      requestAnimationFrame(() => {
        const el = document.getElementById(`txn-${txnId}`);
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "center" });
          el.classList.add("highlight-txn");
          setTimeout(() => el.classList.remove("highlight-txn"), 2000);
        }
      });
    }
  }, [searchParams, router]);

  useEffect(() => () => {
    if (undoDeleteTimer.current) clearTimeout(undoDeleteTimer.current);
  }, []);

  // cavetail: one-time deep-link signal from the parent's URL search params.
  // React's controlled-component model can't express "open on mount based on a
  // prop" without an effect; the effect runs exactly once per flag value and
  // the parent already strips the query param after consumption.
  useEffect(() => {
    if (isAutoOpenTransfer) setTransferOpen(true);
  }, [isAutoOpenTransfer]);

  const handleFiltersChange = (next: TxnFilters) => {
    setFilters(next);
    setVisibleCount(PAGE_SIZE);
  };

  const handleSelectAccount = (id: string | null) => {
    setSelectedAccountId(id);
    setVisibleCount(PAGE_SIZE);
  };

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

  const sortedDesc = useMemo(
    () =>
      [...visibleTxns].sort((a, b) => b.date - a.date || a.id.localeCompare(b.id)),
    [visibleTxns],
  );

  const pagedTxns = useMemo(() => sortedDesc.slice(0, visibleCount), [sortedDesc, visibleCount]);

  const grouped = useMemo(() => groupByDay(pagedTxns), [pagedTxns]);

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

  const selectedAccount = accounts.find((a) => a.id === selectedAccountId) ?? null;

  const categoryOptions = categories.map((c) => ({
    id: c.id,
    name: c.name,
    color: c.color,
  }));

  const categoryInfoList: CategoryInfo[] = categories.map((c) => ({
    id: c.id,
    name: c.name,
    color: c.color,
    hideable: c.hideable,
  }));

  const accountSaveMutation = useSyncMutation({
    keys: [queryKeys.accounts],
    mutationFn: async (a: Account) => {
      await db.table("accounts").upsert(upsertAccountRow(uid, a));
    },
  });
  const handleAccountSave = (a: Account) => accountSaveMutation.mutate(a);

  const accountDeleteMutation = useSyncMutation({
    keys: [queryKeys.accounts, queryKeys.transactions],
    mutationFn: async (a: Account) => {
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

      if (selectedAccountId === a.id) handleSelectAccount(null);
    },
  });
  const handleAccountDelete = (a: Account) => accountDeleteMutation.mutate(a);

  const accountArchiveMutation = useSyncMutation({
    keys: [queryKeys.accounts],
    mutationFn: async (a: Account) => {
      const now = Date.now();
      const archived = {
        ...a,
        archived: !a.archived,
        updatedAt: now,
      };
      await db.table("accounts").upsert(upsertAccountRow(uid, archived));
    },
  });
  const handleAccountArchive = (a: Account) => accountArchiveMutation.mutate(a);

  const handleAccountActionRequest = (a: Account, action: AccountConfirmAction) =>
    setConfirmAction({ account: a, action });

  const handleAccountActionConfirm = (a: Account) => {
    if (confirmAction?.action === "delete") {
      handleAccountDelete(a);
    } else {
      handleAccountArchive(a);
    }
    setConfirmAction(null);
  };

  const txnSaveMutation = useSyncMutation({
    keys: [queryKeys.transactions],
    mutationFn: async (row: Record<string, unknown>) => {
      const next = editTxn ? { ...row, id: editTxn.id } : row;
      await db.table("transactions").upsert(upsertTxnRow(uid, next));
      setEditTxn(null);
    },
  });
  const handleTxnSave = (row: Record<string, unknown>) => txnSaveMutation.mutate(row);

  const handleTxnEdit = (txn: Txn) => {
    setEditTxn(txn);
    setCaptureOpen(true);
  };

  const txnDeleteMutation = useSyncMutation({
    keys: [],
    mutationFn: async (txn: Txn) => {
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
    },
  });
  const handleTxnDelete = (txn: Txn) => {
    txnDeleteMutation.mutate(txn);
    if (undoDeleteTimer.current) clearTimeout(undoDeleteTimer.current);
    undoDeleteTimer.current = setTimeout(() => {
      void queryClient.invalidateQueries({ queryKey: [...queryKeys.transactions] });
    }, 5000);
  };

  const txnUndoDeleteMutation = useSyncMutation({
    keys: [queryKeys.transactions],
    mutationFn: async (txn: Txn) => {
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
    },
  });
  const handleTxnUndoDelete = (txn: Txn) => txnUndoDeleteMutation.mutate(txn);

  const txnDuplicateMutation = useSyncMutation({
    keys: [queryKeys.transactions],
    mutationFn: async (txn: Txn) => {
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
    },
  });
  const handleTxnDuplicate = (txn: Txn) => txnDuplicateMutation.mutate(txn);

  const accountInfo = useMemo(() => {
    const map: Record<string, AccountInfo> = {};
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

  const transferSaveMutation = useSyncMutation({
    keys: [queryKeys.transfers, queryKeys.transactions],
    mutationFn: async (rows: TransferRows) => {
      await insertTransfer(db, rows);
    },
  });
  const handleTransferSave = (rows: TransferRows) => transferSaveMutation.mutate(rows);

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
        monthly_budget_minor: c.monthlyBudgetMinor != null ? Number(c.monthlyBudgetMinor) : null,
        asset_id: c.assetId ?? null,
        created_at: c.createdAt,
        updated_at: c.updatedAt,
        deleted_at: c.deletedAt ?? null,
      });
    },
  });
  const handleCreateCategory = (c: Category) => createCategoryMutation.mutate(c);

  const reconcileSaveMutation = useSyncMutation({
    keys: [queryKeys.transactions],
    mutationFn: async (row: Record<string, unknown>) => {
      await db.table("transactions").upsert(upsertTxnRow(uid, row));
      setReconcileAccount(null);
    },
  });
  const handleReconcileSave = (row: Record<string, unknown>) => reconcileSaveMutation.mutate(row);

  const openRename = (a: Account) => {
    setEditAccount(a);
    setDialogOpen(true);
  };

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
    <div className="flex flex-col gap-4">
      <BankList
        accounts={accounts}
        archivedAccounts={archivedAccounts}
        selectedAccountId={selectedAccountId}
        showArchived={showArchived}
        onSelectAll={() => handleSelectAccount(null)}
        onSelectAccount={handleSelectAccount}
        onNewAccount={() => { setEditAccount(null); setDialogOpen(true); }}
        onToggleArchived={() => setShowArchived((s) => !s)}
      />

      {showArchived && (
        <section className="flex flex-col gap-2">
          {archivedAccounts.map((a) => (
            <AccountCard
              key={a.id}
              account={a}
              balance={computeBalance(a, txns)}
              assetCode={accountInfo[a.id]?.code}
              assetDecimals={accountInfo[a.id]?.decimals}
              onRename={openRename}
              onDelete={(a) => handleAccountActionRequest(a, "delete")}
              onArchive={(a) => handleAccountActionRequest(a, "unarchive")}
            />
          ))}
        </section>
      )}

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
            <p className={cn("mt-0.5 font-display text-lg font-bold tabular-nums", stats.net >= 0n ? "text-zinc-50" : "text-(--danger)")} aria-label={privacy ? "Net masked" : undefined}>
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
          onDelete={(a) => handleAccountActionRequest(a, "delete")}
          onArchive={(a) => handleAccountActionRequest(a, "archive")}
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

      <BankTransactionsList
        grouped={grouped}
        sortedDesc={sortedDesc}
        visibleCount={visibleCount}
        filters={filters}
        onFiltersChange={handleFiltersChange}
        categories={categories}
        accounts={accounts}
        categoryInfoList={categoryInfoList}
        accountInfo={accountInfo}
        dataPending={dataPending}
        hasAccounts={accounts.length > 0}
        loadMoreRef={loadMoreRef}
        onAddTransaction={() => setCaptureOpen(true)}
        onNewAccount={() => { setEditAccount(null); setDialogOpen(true); }}
        onEditTxn={handleTxnEdit}
        onDuplicateTxn={handleTxnDuplicate}
        onDeleteTxn={handleTxnDelete}
        onUndoDeleteTxn={handleTxnUndoDelete}
        formatDayHeader={formatDayHeader}
      />

      <AccountDialog
        isOpen={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setEditAccount(null);
        }}
        onSave={handleAccountSave}
        editAccount={editAccount}
      />

      <AccountConfirmDialog
        account={confirmAction?.account ?? null}
        action={confirmAction?.action ?? null}
        onOpenChange={(open) => {
          if (!open) setConfirmAction(null);
        }}
        onConfirm={handleAccountActionConfirm}
      />

      <CaptureSheet
        isOpen={captureOpen}
        onOpenChange={(isOpen) => {
          setCaptureOpen(isOpen);
          if (!isOpen) setEditTxn(null);
        }}
        userId={uid}
        accounts={accountOptions}
        categories={categoryOptions}
        recentTxns={[]}
        onSave={handleTxnSave}
        defaultAccountId={selectedAccountId ?? undefined}
        voicePrefill={txnPrefill}
        editing={!!editTxn}
        onCreateCategory={handleCreateCategory}
      />

      <TransferSheet
        isOpen={transferOpen}
        onOpenChange={setTransferOpen}
        userId={uid}
        accounts={accountOptions}
        categories={categoryOptions}
        onCreateCategory={handleCreateCategory}
        onSave={(rows) => void handleTransferSave(rows)}
        defaultFromAccountId={selectedAccountId ?? undefined}
      />

      <ReconcileSheet
        isOpen={reconcileAccount !== null}
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
};
