"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useSync } from "@/lib/sync/sync-context";
import { computeBalance } from "@/lib/accounts/accounts-store";
import type { Account, Txn } from "@/lib/accounts/accounts-store";
import type { RowRecord } from "@/lib/sync";
import { CaptureSheet } from "@/components/capture/CaptureSheet";
import type { RecentTxn } from "@/lib/capture";
import { NetWorthHero } from "@/components/home/net-worth-hero";
import { RecentActivity } from "@/components/home/recent-activity";
import { BudgetPulse } from "@/components/home/budget-pulse";
import { usePrivacy } from "@/lib/privacy/privacy-context";
import type { Category } from "@/lib/categories/categories-store";
import { computeBudgetUsage } from "@/lib/categories/categories-store";

function toAccount(row: RowRecord): Account {
  return {
    id: String(row.id),
    name: String(row.name),
    kind: String(row.kind) as Account["kind"],
    assetId: String(row.assetId),
    openingBalanceMinor: BigInt(row.openingBalanceMinor as string | bigint),
    createdAt: Number(row.createdAt),
    updatedAt: Number(row.updatedAt),
    deletedAt: row.deletedAt ? Number(row.deletedAt) : null,
  };
}

function toTxn(row: RowRecord): Txn {
  return {
    id: String(row.id),
    accountId: String(row.accountId),
    amountMinor: BigInt(row.amountMinor as string | bigint),
    type: String(row.type) as Txn["type"],
    description: String(row.description),
    categoryIds: row.categoryIds
      ? (row.categoryIds as string).split(",").filter(Boolean)
      : [],
    date: Number(row.date),
    deletedAt: row.deletedAt ? Number(row.deletedAt) : null,
  };
}

function toCategory(row: RowRecord): Category {
  return {
    id: String(row.id),
    name: String(row.name),
    color: String(row.color ?? "#6366f1"),
    hideable: Boolean(row.hideable),
    monthlyBudgetMinor: row.monthlyBudgetMinor != null
      ? BigInt(row.monthlyBudgetMinor as string | bigint)
      : null,
    createdAt: Number(row.createdAt),
    updatedAt: Number(row.updatedAt),
    deletedAt: row.deletedAt ? Number(row.deletedAt) : null,
  };
}

const CRYPTO_KINDS = new Set(["wallet", "exchange"]);

function DashboardContent() {
  const searchParams = useSearchParams();
  const captureOpen = searchParams.get("capture") === "1";
  const { db } = useSync();

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [txns, setTxns] = useState<Txn[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const { masked: privacy, toggle: togglePrivacy } = usePrivacy();
  const [lastSyncedAt, setLastSyncedAt] = useState<number | null>(null);

  const load = useCallback(async () => {
    const accRows = (await db.query("SELECT * FROM accounts")).rows;
    const txnRows = (await db.query("SELECT * FROM transactions")).rows;
    const catRows = (await db.query("SELECT * FROM categories")).rows;
    setAccounts(accRows.map(toAccount));
    setTxns(txnRows.map(toTxn));
    setCategories(catRows.map(toCategory));
    setLastSyncedAt(Date.now());
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const activeTxns = useMemo(
    () => txns.filter((t) => !t.deletedAt),
    [txns],
  );

  const totalBalance = useMemo(
    () => accounts.reduce((sum, acc) => sum + computeBalance(acc, activeTxns), 0n),
    [accounts, activeTxns],
  );

  const bankBalance = useMemo(
    () =>
      accounts
        .filter((a) => !CRYPTO_KINDS.has(a.kind))
        .reduce((sum, acc) => sum + computeBalance(acc, activeTxns), 0n),
    [accounts, activeTxns],
  );

  const cryptoBalance = useMemo(
    () =>
      accounts
        .filter((a) => CRYPTO_KINDS.has(a.kind))
        .reduce((sum, acc) => sum + computeBalance(acc, activeTxns), 0n),
    [accounts, activeTxns],
  );

  const recentTxns = useMemo(() => {
    return [...activeTxns]
      .sort((a, b) => b.date - a.date)
      .slice(0, 10);
  }, [activeTxns]);

  const recentForCapture: RecentTxn[] = useMemo(
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

  const now = new Date();
  const budgetUsage = useMemo(
    () => computeBudgetUsage(categories, activeTxns, now.getFullYear(), now.getMonth()),
    [categories, activeTxns, now.getFullYear(), now.getMonth()],
  );

  const totalBudgetMinor = useMemo(
    () => budgetUsage.reduce((sum, item) => sum + item.category.monthlyBudgetMinor!, 0n),
    [budgetUsage],
  );

  const totalSpentMinor = useMemo(
    () => budgetUsage.reduce((sum, item) => sum + item.spentMinor, 0n),
    [budgetUsage],
  );

  const handleSave = useCallback(
    async (row: Record<string, unknown>) => {
      const cols = Object.keys(row);
      const vals = Object.values(row);
      const phs = cols.map(() => "?").join(", ");
      const conflictSet = cols
        .filter((c) => c !== "id")
        .map((c) => `${c} = excluded.${c}`)
        .join(", ");
      await db.execute(
        `INSERT INTO transactions (${cols.join(", ")}) VALUES (${phs}) ON CONFLICT (id) DO UPDATE SET ${conflictSet}`,
        vals,
      );
      await load();
    },
    [load],
  );

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4 px-4">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Home</h1>
      </header>

      <NetWorthHero
        totalBalance={totalBalance}
        bankBalance={bankBalance}
        cryptoBalance={cryptoBalance}
        privacy={privacy}
        onTogglePrivacy={togglePrivacy}
        lastSyncedAt={lastSyncedAt}
      />

      <RecentActivity txns={recentTxns} categories={[]} />

      <BudgetPulse
        items={budgetUsage}
        totalBudgetMinor={totalBudgetMinor}
        totalSpentMinor={totalSpentMinor}
      />

      <CaptureSheet
        open={captureOpen}
        onOpenChange={() => {}}
        userId="local"
        accounts={accounts.map((a) => ({
          id: a.id,
          name: a.name,
          assetId: a.assetId,
          decimals: 2,
        }))}
        categories={[]}
        recentTxns={recentForCapture}
        onSave={handleSave}
      />
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense>
      <DashboardContent />
    </Suspense>
  );
}
