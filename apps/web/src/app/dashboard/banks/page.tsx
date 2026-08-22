"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSync } from "@/lib/sync/sync-context";
import {
  computeBalance,
  groupByDay,
  monthStats,
  type Account,
  type Txn,
} from "@/lib/accounts/accounts-store";

import { AccountCard } from "@/components/banks/account-card";
import { AccountDialog } from "@/components/banks/account-dialog";
import { TransactionRow } from "@/components/banks/transaction-row";
import { CaptureSheet } from "@/components/capture/CaptureSheet";

const USER_ID = "dev-user";

const ACCOUNT_COLS =
  "id,user_id,name,kind,asset_id,opening_balance_minor,created_at,updated_at,deleted_at";
const TXN_COLS =
  "id,user_id,account_id,asset_id,amount_minor,type,description,category_ids,date,created_at,updated_at,deleted_at";

function toAccount(row: Record<string, unknown>): Account {
  return {
    id: String(row.id),
    name: String(row.name),
    kind: String(row.kind) as Account["kind"],
    assetId: String(row.asset_id),
    openingBalanceMinor: BigInt(row.opening_balance_minor as number | string),
    createdAt: Number(row.created_at),
    updatedAt: Number(row.updated_at),
    deletedAt: row.deleted_at != null ? Number(row.deleted_at) : null,
  };
}

function toTxn(row: Record<string, unknown>): Txn {
  return {
    id: String(row.id),
    accountId: String(row.account_id),
    amountMinor: BigInt(row.amount_minor as number | string),
    type: String(row.type) as Txn["type"],
    description: String(row.description ?? ""),
    categoryIds: Array.isArray(row.category_ids) ? (row.category_ids as string[]) : [],
    date: Number(row.date),
    deletedAt: row.deleted_at != null ? Number(row.deleted_at) : null,
  };
}

function upsertAccountSql(a: Account): { sql: string; params: unknown[] } {
  const cols = ACCOUNT_COLS.split(",");
  const placeholders = cols.map(() => "?").join(", ");
  const conflictSet = cols
    .filter((c) => c !== "id")
    .map((c) => `${c} = excluded.${c}`)
    .join(", ");
  const params = [
    a.id,
    USER_ID,
    a.name,
    a.kind,
    a.assetId,
    Number(a.openingBalanceMinor),
    a.createdAt,
    a.updatedAt,
    a.deletedAt ?? null,
  ];
  return {
    sql: `INSERT INTO accounts (${cols.join(", ")}) VALUES (${placeholders}) ON CONFLICT (id) DO UPDATE SET ${conflictSet}`,
    params,
  };
}

function upsertTxnSql(row: Record<string, unknown>): {
  sql: string;
  params: unknown[];
} {
  const cols = TXN_COLS.split(",");
  const placeholders = cols.map(() => "?").join(", ");
  const conflictSet = cols
    .filter((c) => c !== "id")
    .map((c) => `${c} = excluded.${c}`)
    .join(", ");
  const params = cols.map((c) => row[c]);
  return {
    sql: `INSERT INTO transactions (${cols.join(", ")}) VALUES (${placeholders}) ON CONFLICT (id) DO UPDATE SET ${conflictSet}`,
    params,
  };
}

export default function BanksPage() {
  const { db } = useSync();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [txns, setTxns] = useState<Txn[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editAccount, setEditAccount] = useState<Account | null>(null);
  const [captureOpen, setCaptureOpen] = useState(false);

  const reload = useCallback(async () => {
    const accRes = await db.query(`SELECT * FROM accounts WHERE deleted_at IS NULL`);
    setAccounts(accRes.rows.map(toAccount));
    const txnRes = await db.query(`SELECT * FROM transactions WHERE deleted_at IS NULL`);
    setTxns(txnRes.rows.map(toTxn));
  }, [db]);

  useEffect(() => {
    void reload();
  }, [reload]);

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

  const handleAccountSave = useCallback(
    async (a: Account) => {
      const { sql, params } = upsertAccountSql(a);
      await db.execute(sql, params);
      await reload();
    },
    [db, reload],
  );

  const handleAccountDelete = useCallback(
    async (a: Account) => {
      const tomb = {
        ...a,
        deletedAt: Date.now(),
        updatedAt: Date.now(),
      };
      const { sql, params } = upsertAccountSql(tomb);
      await db.execute(sql, params);
      if (selectedAccountId === a.id) setSelectedAccountId(null);
      await reload();
    },
    [db, reload, selectedAccountId],
  );

  const handleTxnSave = useCallback(
    async (row: Record<string, unknown>) => {
      const { sql, params } = upsertTxnSql(row);
      await db.execute(sql, params);
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

  const formatMinor = (cents: bigint) => {
    const sign = cents < 0n ? "-" : "";
    const abs = cents < 0n ? -cents : cents;
    return `${sign}$${(Number(abs) / 100).toFixed(2)}`;
  };

  const accountOptions = accounts.map((a) => ({
    id: a.id,
    name: a.name,
    assetId: a.assetId,
    decimals: 2,
  }));

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4 px-4">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Banks</h1>
        <div className="flex items-center gap-3">
          <span className="text-sm text-slate-400">Total</span>
          <span className="text-lg tabular-nums font-medium">
            {formatMinor(totalBalance)}
          </span>
          <Button size="sm" onClick={() => { setEditAccount(null); setDialogOpen(true); }}>
            <Plus className="h-4 w-4" aria-hidden /> New account
          </Button>
        </div>
      </header>

      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <button
          onClick={() => setSelectedAccountId(null)}
          className={`shrink-0 rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
            selectedAccountId === null
              ? "bg-(--accent) text-(--accent-foreground)"
              : "bg-(--surface-2) text-slate-400 hover:text-inherit"
          }`}
        >
          All
        </button>
        {accounts.map((a) => (
          <button
            key={a.id}
            onClick={() => setSelectedAccountId(a.id)}
            className={`shrink-0 rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
              selectedAccountId === a.id
                ? "bg-(--accent) text-(--accent-foreground)"
                : "bg-(--surface-2) text-slate-400 hover:text-inherit"
            }`}
          >
            {a.name}
          </button>
        ))}
      </div>

      {selectedAccountId && (
        <div className="flex items-center gap-4 rounded-(--radius-lg) border border-(--border) bg-(--surface-1) px-4 py-3">
          <div className="text-center">
            <p className="text-xs text-slate-400">Income</p>
            <p className="text-sm tabular-nums text-green-500">
              {formatMinor(stats.income)}
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs text-slate-400">Expense</p>
            <p className="text-sm tabular-nums text-red-500">
              {formatMinor(stats.expense)}
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs text-slate-400">Net</p>
            <p className={`text-sm tabular-nums font-medium ${stats.net >= 0n ? "text-green-500" : "text-red-500"}`}>
              {formatMinor(stats.net)}
            </p>
          </div>
        </div>
      )}

      {selectedAccount && (
        <AccountCard
          account={selectedAccount}
          balance={computeBalance(selectedAccount, txns)}
          onRename={openRename}
          onDelete={handleAccountDelete}
        />
      )}

      <section className="rounded-(--radius-lg) border border-(--border) bg-(--surface-1) divide-y divide-(--border)">
        {grouped.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-10 text-center">
            <p className="text-sm text-slate-400">No transactions yet</p>
            <Button size="sm" onClick={() => setCaptureOpen(true)}>
              <Plus className="h-4 w-4" aria-hidden /> Add transaction
            </Button>
          </div>
        ) : (
          <>
            {grouped.map((g) => (
              <div key={g.day}>
                <p className="px-4 py-1.5 text-xs font-medium text-slate-500 bg-(--surface-2)">
                  {g.day}
                </p>
                {g.items.map((t) => (
                  <TransactionRow
                    key={t.id}
                    txn={t}
                    categoryNames={new Map()}
                  />
                ))}
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
        onOpenChange={setCaptureOpen}
        userId={USER_ID}
        accounts={accountOptions}
        categories={[]}
        recentTxns={[]}
        onSave={handleTxnSave}
        defaultAccountId={selectedAccountId ?? undefined}
      />
    </div>
  );
}
