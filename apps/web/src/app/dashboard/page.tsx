"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useSync } from "@/lib/sync/sync-context";
import { computeBalance } from "@/lib/accounts/accounts-store";
import type { Account, Txn } from "@/lib/accounts/accounts-store";
import type { RowRecord } from "@/lib/sync";
import { CaptureSheet } from "@/components/capture/CaptureSheet";
import type { VoicePrefill } from "@/components/capture/CaptureSheet";
import type { RecentTxn } from "@/lib/capture";
import { redeemDraft } from "@/lib/voice/redeem";
import { resolvePrefill } from "@/lib/voice/resolve";
import { NetWorthHero } from "@/components/home/net-worth-hero";
import { RecentActivity } from "@/components/home/recent-activity";
import { BudgetPulse } from "@/components/home/budget-pulse";
import { usePrivacy } from "@/lib/privacy/privacy-context";
import type { Category, CategoryBudget } from "@/lib/categories/categories-store";
import { computeBudgetUsage, categoryColor } from "@/lib/categories/categories-store";
import { useAssets } from "@/lib/assets";

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
    deletedAt: row.deleted_at ? Number(row.deleted_at) : null,
  };
}

function toCategory(row: RowRecord): Category {
  return {
    id: String(row.id),
    name: String(row.name),
    color: categoryColor(String(row.name)),
    hideable: Boolean(row.hideable),
    monthlyBudgetMinor: row.monthly_budget_minor != null
      ? BigInt(row.monthly_budget_minor as string | bigint)
      : null,
    assetId: row.asset_id != null ? String(row.asset_id) : null,
    createdAt: Number(row.created_at),
    updatedAt: Number(row.updated_at),
    deletedAt: row.deleted_at ? Number(row.deleted_at) : null,
  };
}

const CRYPTO_KINDS = new Set(["wallet", "exchange"]);

function DashboardContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const captureOpen = searchParams.get("capture") === "1";
  const draftToken = searchParams.get("draftToken");
  const { db, userId, isConnected } = useSync();
  const uid = userId ?? "local";
  const { assets } = useAssets();
  const assetsById = useMemo(
    () => new Map(assets.map((a) => [a.id, a])),
    [assets],
  );

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [txns, setTxns] = useState<Txn[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [budgets, setBudgets] = useState<CategoryBudget[]>([]);
  const { masked: privacy, toggle: togglePrivacy } = usePrivacy();
  const [lastSyncedAt, setLastSyncedAt] = useState<number | null>(null);
  const [voicePrefill, setVoicePrefill] = useState<VoicePrefill | undefined>();
  const [editTxn, setEditTxn] = useState<Txn | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const accRows = (await db.query("SELECT * FROM accounts")).rows;
      const txnRows = (await db.query("SELECT * FROM transactions")).rows;
      const catRows = (await db.query("SELECT * FROM categories")).rows;
      const budRows = (await db.query("SELECT * FROM category_budgets WHERE deleted_at IS NULL")).rows;
      setAccounts(accRows.map(toAccount));
      setTxns(txnRows.map(toTxn));
      setCategories(catRows.map(toCategory));
      setBudgets(
        budRows.map((row) => ({
          id: String(row.id),
          categoryId: String(row.category_id),
          assetId: String(row.asset_id),
          monthStart: Number(row.month_start),
          amountMinor: BigInt(row.amount_minor as number | string),
          createdAt: Number(row.created_at),
          updatedAt: Number(row.updated_at),
          deletedAt: row.deleted_at != null ? Number(row.deleted_at) : null,
        })),
      );
      setLastSyncedAt(Date.now());
    } catch (error) {
      console.error('Sync error:', error);
      setErrorMessage('Failed to load dashboard data. Check your connection.');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load, isConnected]);

  // Redeem voice draft token when deep-linked
  useEffect(() => {
    if (!draftToken) return;
    let cancelled = false;
    (async () => {
      const result = await redeemDraft(draftToken);
      if (cancelled || !result) return;
      const prefillAccounts = accounts.map((a) => ({
        id: a.id,
        name: a.name,
        decimals: 2,
      }));
      const prefillCategories = categories.map((c) => ({
        id: c.id,
        name: c.name,
      }));
      const prefill = resolvePrefill(result.preview, prefillAccounts, prefillCategories);
      setVoicePrefill({
        accountId: prefill.accountId,
        amountInput: prefill.amountInput,
        categoryIds: prefill.categoryIds,
        description: prefill.description,
      });
      // Clean up URL params
      router.replace("/dashboard?capture=1", { scroll: false });
    })();
    return () => { cancelled = true; };
  }, [draftToken, accounts, categories, router]);

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
    () => computeBudgetUsage(categories, budgets, activeTxns, now.getFullYear(), now.getMonth()),
    [categories, budgets, activeTxns, now.getFullYear(), now.getMonth()],
  );

  const handleSave = useCallback(
    async (row: Record<string, unknown>) => {
      const next = editTxn ? { ...row, id: editTxn.id } : row;
      await db.table("transactions").upsert(next);
      setEditTxn(null);
      await load();
    },
    [db, load, editTxn],
  );

  const accountInfo = useMemo(() => {
    const map: Record<string, { name: string; code: string; decimals: number }> = {};
    for (const a of accounts) {
      const asset = assetsById.get(a.assetId);
      map[a.id] = { name: a.name, code: asset?.code ?? "", decimals: asset?.decimals ?? 2 };
    }
    return map;
  }, [accounts, assetsById]);

  const primaryCode = accounts.length > 0 ? accountInfo[accounts[0]!.id]?.code : "USD";

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

  if (errorMessage) {
      return (
        <div className="mx-auto flex max-w-3xl flex-col gap-4 px-4">
          <p className="text-(--danger) text-sm">{errorMessage}</p>
        </div>
      );
    }

    return (
      <div className="mx-auto flex max-w-3xl flex-col gap-4 px-4">
        <header className="flex items-center justify-between">
          <h1 className="font-display text-2xl font-bold tracking-tight">Home</h1>
        </header>

        <NetWorthHero
        totalBalance={totalBalance}
        bankBalance={bankBalance}
        cryptoBalance={cryptoBalance}
        privacy={privacy}
        onTogglePrivacy={togglePrivacy}
        lastSyncedAt={lastSyncedAt}
        currencyCode={primaryCode}
      />

      <RecentActivity
        txns={recentTxns}
        categories={categories}
        accounts={accountInfo}
        onEdit={setEditTxn}
      />

      <BudgetPulse items={budgetUsage} assetsById={assetsById} />

      <CaptureSheet
        open={captureOpen || !!draftToken || !!editTxn}
        onOpenChange={() => { setVoicePrefill(undefined); setEditTxn(null); router.replace("/dashboard", { scroll: false }); }}
        userId={uid}
        accounts={accounts.map((a) => ({
          id: a.id,
          name: a.name,
          assetId: a.assetId,
          decimals: assetsById.get(a.assetId)?.decimals ?? 2,
          assetCode: assetsById.get(a.assetId)?.code ?? "",
        }))}
        categories={categories}
        recentTxns={recentForCapture}
        onSave={handleSave}
        voicePrefill={voicePrefill ?? txnPrefill}
        editing={!!editTxn}
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
