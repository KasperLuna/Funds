"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSync } from "@/lib/sync/sync-context";
import { queryKeys, useSyncMutation, useSyncQuery } from "@/lib/sync/sync-query";
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
import { ScheduledCard } from "@/components/scheduled/scheduled-card";
import { TemplateCard } from "@/components/templates/template-card";
import { toTemplate } from "@/lib/templates/templates-store";
import { usePrivacy } from "@/lib/privacy/privacy-context";
import type { Category } from "@/lib/categories/categories-store";
import { computeBudgetUsage, resolveCategoryColor } from "@/lib/categories/categories-store";
import { useAssets } from "@/lib/assets";
import { computeHoldings, toToken, toTokenTxn } from "@/lib/crypto/crypto-store";
import { fetchPrices, type CoinPrice } from "@/lib/crypto/rates";
import { spendingByMonth } from "@/lib/analytics/compute";
import { SparkLine } from "@/components/charts";
import Link from "next/link";

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
    color: resolveCategoryColor(row),
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
  const typeParam = searchParams.get("type");
  const draftToken = searchParams.get("draftToken");
  const { db, userId, syncStatus } = useSync();
  const uid = userId ?? "local";
  const { assets } = useAssets();
  const assetsById = useMemo(
    () => new Map(assets.map((a) => [a.id, a])),
    [assets],
  );
  const queryClient = useQueryClient();

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

  const budgetsQuery = useSyncQuery({
    key: queryKeys.categoryBudgets,
    sql: "SELECT * FROM category_budgets WHERE deleted_at IS NULL",
    select: (row) => ({
      id: String(row.id),
      categoryId: String(row.category_id),
      assetId: String(row.asset_id),
      monthStart: Number(row.month_start),
      amountMinor: BigInt(row.amount_minor as number | string),
      createdAt: Number(row.created_at),
      updatedAt: Number(row.updated_at),
      deletedAt: row.deleted_at != null ? Number(row.deleted_at) : null,
    }),
  });
  const budgets = budgetsQuery.data ?? [];

  // cavetail: templates load via a raw select map (useSyncQuery) rather than
  // the store helper so they stay reactive like every other entity collection.
  const templatesQuery = useSyncQuery({
    key: queryKeys.templates,
    sql: "SELECT * FROM templates WHERE deleted_at IS NULL",
    select: toTemplate,
  });
  const templates = templatesQuery.data ?? [];

  const tokensQuery = useSyncQuery({
    key: queryKeys.tokens,
    sql: "SELECT * FROM tokens WHERE deleted_at IS NULL",
    select: toToken,
  });
  const tokens = tokensQuery.data ?? [];

  const tokenTxnsQuery = useSyncQuery({
    key: queryKeys.tokenTransactions,
    sql: "SELECT * FROM token_transactions WHERE deleted_at IS NULL",
    select: toTokenTxn,
  });
  const tokenTxns = tokenTxnsQuery.data ?? [];

  const { masked: privacy, toggle: togglePrivacy } = usePrivacy();
  const [voicePrefill, setVoicePrefill] = useState<VoicePrefill | undefined>();
  const [editTxn, setEditTxn] = useState<Txn | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const failed = [
      accountsQuery,
      txnsQuery,
      categoriesQuery,
      budgetsQuery,
      tokensQuery,
      tokenTxnsQuery,
      templatesQuery,
    ].find((q) => q.isError);
    if (failed) {
      console.error("Sync error:", failed.error);
      setErrorMessage("Failed to load dashboard data. Check your connection.");
    }
  }, [
    accountsQuery.isError,
    txnsQuery.isError,
    categoriesQuery.isError,
    budgetsQuery.isError,
    tokensQuery.isError,
    tokenTxnsQuery.isError,
    templatesQuery.isError,
  ]);

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

  const bankBalance = useMemo(
    () =>
      accounts
        .filter((a) => !CRYPTO_KINDS.has(a.kind))
        .reduce((sum, acc) => sum + computeBalance(acc, activeTxns), 0n),
    [accounts, activeTxns],
  );

  const cryptoAccountBalance = useMemo(
    () =>
      accounts
        .filter((a) => CRYPTO_KINDS.has(a.kind))
        .reduce((sum, acc) => sum + computeBalance(acc, activeTxns), 0n),
    [accounts, activeTxns],
  );

  // Token holdings (crypto tab model) — not represented as accounts, so they
  // must be valued separately to count toward net worth.
  const tokenHoldings = useMemo(
    () => computeHoldings(tokens, tokenTxns),
    [tokens, tokenTxns],
  );

  const recentTxns = useMemo(() => {
    return [...activeTxns]
      .sort((a, b) => b.date - a.date)
      .slice(0, 5);
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

  const saveTxn = useSyncMutation({
    keys: [queryKeys.transactions],
    mutationFn: async (row: Record<string, unknown>) => {
      const next = editTxn ? { ...row, id: editTxn.id } : row;
      await db.table("transactions").upsert(next);
      setEditTxn(null);
    },
  });

  const handleSave = useCallback(
    (row: Record<string, unknown>) => {
      saveTxn.mutate(row);
    },
    [saveTxn, editTxn],
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

  const monthlySpending = useMemo(() => spendingByMonth(activeTxns, 12), [activeTxns]);
  const sparkData = useMemo(
    () => monthlySpending.map((m) => ({ month: m.month, expense: privacy ? 0 : Number(m.expense) })),
    [monthlySpending, privacy],
  );

  const coingeckoKey = useMemo(
    () =>
      [...new Set(tokenHoldings.map((h) => h.token.coingeckoId).filter((id): id is string => !!id))].sort().join(","),
    [tokenHoldings],
  );
  const pricesQuery = useQuery({
    queryKey: ["prices", coingeckoKey, primaryCode],
    enabled: !!coingeckoKey,
    queryFn: () => fetchPrices(coingeckoKey.split(","), (primaryCode || "USD").toLowerCase()),
  });
  const prices = pricesQuery.data ?? new Map<string, CoinPrice>();

  // cavetail: display valuation only (float price × qty → fiat minor)
  const tokenValueMinor = useMemo(
    () =>
      tokenHoldings.reduce((sum, h) => {
        const dec = Number(h.token.decimals) || 0;
        const qty = Number(h.qtyMinor) / 10 ** dec;
        const price = Number(h.token.coingeckoId ? prices.get(h.token.coingeckoId)?.current_price ?? 0 : 0);
        return sum + BigInt(Math.round(qty * price * 100));
      }, 0n),
    [tokenHoldings, prices],
  );

  const cryptoBalance = useMemo(
    () => cryptoAccountBalance + tokenValueMinor,
    [cryptoAccountBalance, tokenValueMinor],
  );

  const totalBalance = useMemo(
    () => bankBalance + cryptoBalance,
    [bankBalance, cryptoBalance],
  );

  const typePrefill: VoicePrefill | undefined =
    typeParam === "income" || typeParam === "expense"
      ? { accountId: null, amountInput: null, categoryIds: [], description: "", type: typeParam }
      : undefined;

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
        lastSyncedAt={syncStatus.lastSyncedAt}
        currencyCode={primaryCode}
      />

      <RecentActivity
        txns={recentTxns}
        categories={categories}
        accounts={accountInfo}
        onEdit={setEditTxn}
      />

      <BudgetPulse items={budgetUsage} assetsById={assetsById} />

      <section className="rounded-(--radius-lg) border border-(--border) bg-(--surface-1) p-6">
        <div className="flex items-center justify-between">
          <p className="label-micro">Monthly trend</p>
          <Link
            href="/dashboard/analytics"
            className="text-xs text-zinc-500 transition-colors hover:text-zinc-300"
          >
            View all
          </Link>
        </div>
        <div className="mt-3">
          {privacy ? (
            <p className="py-6 text-center text-sm text-zinc-500">••••</p>
          ) : (
            <SparkLine data={sparkData} dataKey="expense" height={48} />
          )}
        </div>
      </section>

      <ScheduledCard
        accounts={accounts.map((a) => ({
          id: a.id,
          name: a.name,
          assetId: a.assetId,
          decimals: assetsById.get(a.assetId)?.decimals ?? 2,
          code: assetsById.get(a.assetId)?.code ?? "",
        }))}
        categories={categories.map((c) => ({ id: c.id, name: c.name }))}
      />

      <TemplateCard
        accounts={accounts.map((a) => ({
          id: a.id,
          name: a.name,
          decimals: assetsById.get(a.assetId)?.decimals ?? 2,
          assetCode: assetsById.get(a.assetId)?.code,
        }))}
        categories={categories.map((c) => ({ id: c.id, name: c.name }))}
        onChanged={() => void queryClient.invalidateQueries({ queryKey: [...queryKeys.templates] })}
      />

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
        templates={templates}
        onSave={handleSave}
        voicePrefill={voicePrefill ?? typePrefill ?? txnPrefill}
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
