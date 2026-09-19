"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { useSync } from "@/lib/sync/sync-context";
import { queryKeys, useSyncQuery } from "@/lib/sync/sync-query";
import { computeBalance } from "@/lib/accounts/accounts-store";
import type { Account, Txn } from "@/lib/accounts/accounts-store";
import type { RowRecord } from "@/lib/sync";
import { CaptureSheet } from "@/components/capture/capture-sheet";
import type { VoicePrefill } from "@/components/capture/capture-sheet";
import type { RecentTxn } from "@/lib/capture";
import { usePrivacyStore } from "@/lib/privacy/privacy-store";
import type { Category } from "@/lib/categories/categories-store";
import { computeBudgetUsage, resolveCategoryColor } from "@/lib/categories/categories-store";
import { useAssets } from "@/lib/assets";
import { computeHoldings, toToken, toTokenTxn } from "@/lib/crypto/crypto-store";
import { fetchPrices, type CoinPrice } from "@/lib/crypto/rates";
import {
  coingeckoKeyForHoldings,
  computeTokenValueMinor,
  cryptoPriceQueryKey,
} from "@/lib/crypto/valuation";
import { spendingByMonth } from "@/lib/analytics/compute";
import { SparkLine } from "@/components/charts";
import Link from "next/link";
import { NetWorthHero } from "@/components/home/net-worth-hero";
import { BankProportionCard, FALLBACK_COLORS } from "@/components/home/bank-proportion-card";
import { RecentActivity } from "@/components/home/recent-activity";
import { BudgetPulse } from "@/components/home/budget-pulse";
import { NonBudgetedFlow, computeNonBudgetedFlow } from "@/components/home/non-budgeted-flow";
import { ScheduledCard } from "@/components/scheduled/scheduled-card";
import { DraftInboxCard } from "@/components/home/draft-inbox-card";
import { resolvePrefill } from "@/lib/voice/resolve";
import { discardDraft, listDrafts, type DraftItem } from "@/lib/voice/drafts";
import { TemplateCard } from "@/components/templates/template-card";
import { toTemplate } from "@/lib/templates/templates-store";
import { toScheduledTxn } from "@/lib/scheduled/scheduled-store";
import { partitionSchedules, SOON_WINDOW_DAYS } from "@/lib/scheduled/compute";
import { useCaptureSheetTriggers } from "./dashboard-screen.hooks";

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

export const DashboardScreen = () => {
  const { userId } = useSync();
  const uid = userId ?? "local";
  const { assets } = useAssets();
  const assetsById = useMemo(
    () => new Map(assets.map((a) => [a.id, a])),
    [assets],
  );

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
  const scheduledQuery = useSyncQuery({
    key: queryKeys.scheduledTransactions,
    sql: "SELECT * FROM scheduled_transactions WHERE deleted_at IS NULL",
    select: toScheduledTxn,
  });
  const scheduled = scheduledQuery.data ?? [];

  // cavetail: ScheduledCard sits up top only when something is soon (due /
  // overdue / within SOON_WINDOW_DAYS); otherwise it lives at the bottom above
  // Templates. Loading keeps it top to avoid a bottom-then-top jump.
  const hasUpcoming =
    scheduledQuery.isLoading ||
    partitionSchedules(scheduled, new Date(), SOON_WINDOW_DAYS).soon.length > 0;
  const scheduledAccounts = accounts.map((a) => ({
    id: a.id,
    name: a.name,
    assetId: a.assetId,
    decimals: assetsById.get(a.assetId)?.decimals ?? 2,
    code: assetsById.get(a.assetId)?.code ?? "",
  }));
  const scheduledCategories = categories.map((c) => ({ id: c.id, name: c.name, color: c.color }));

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

  const privacy = usePrivacyStore((s) => s.masked);
  const togglePrivacy = usePrivacyStore((s) => s.toggle);
  const {
    captureOpen,
    editTxn,
    sheetOpen: hookSheetOpen,
    voicePrefillValue: hookVoicePrefillValue,
    handleSave,
    handleCreateCategory,
    handleClose: hookHandleClose,
  } = useCaptureSheetTriggers(uid);

  // cavetail: Shortcut/voice drafts are ephemeral inbox rows fetched from the
  // server (not synced entities): they are born online and expire in 3 days.
  const [drafts, setDrafts] = useState<DraftItem[]>([]);
  const [draftsReady, setDraftsReady] = useState(false);
  const [activeDraftId, setActiveDraftId] = useState<string | null>(null);
  const [draftPrefill, setDraftPrefill] = useState<VoicePrefill | undefined>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const draftIdParam = searchParams.get("draftId");
  const handledDraftRef = useRef("");

  const refreshDrafts = useCallback(async () => {
    try {
      setDrafts(await listDrafts());
    } catch (err) {
      console.error("Failed to load drafts:", err);
    } finally {
      setDraftsReady(true);
    }
  }, []);

  useEffect(() => {
    void refreshDrafts();
    const onVisible = () => {
      if (document.visibilityState === "visible") void refreshDrafts();
    };
    const onOnline = () => void refreshDrafts();
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("online", onOnline);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("online", onOnline);
    };
  }, [refreshDrafts]);

  const openDraft = useCallback(
    (draft: DraftItem) => {
      const prefill = resolvePrefill(
        draft.preview,
        accounts.map((a) => ({
          id: a.id,
          name: a.name,
          decimals: assetsById.get(a.assetId)?.decimals ?? 2,
        })),
        categories.map((c) => ({ id: c.id, name: c.name })),
      );
      // cavetail: prefer the stored account binding over the fuzzy name match;
      // fall back to the resolved name when the account still exists by name,
      // else the picker opens blank for the user to choose.
      const accountId =
        draft.accountId && accounts.some((a) => a.id === draft.accountId)
          ? draft.accountId
          : prefill.accountId;
      setActiveDraftId(draft.id);
      setDraftPrefill({
        accountId,
        amountInput: prefill.amountInput,
        categoryIds: prefill.categoryIds,
        description: prefill.description,
      });
    },
    [accounts, categories, assetsById],
  );

  // cavetail: drafts are persistent rows (not one-shot tokens), so re-running
  // this effect on sync ticks is idempotent — the handled ref only stops a
  // repeat toast/open for the same param.
  useEffect(() => {
    if (!draftIdParam) {
      handledDraftRef.current = "";
      return;
    }
    if (!draftsReady || draftIdParam === handledDraftRef.current) return;
    handledDraftRef.current = draftIdParam;
    const draft = drafts.find((d) => d.id === draftIdParam);
    router.replace("/dashboard", { scroll: false });
    if (!draft) {
      toast("Draft already logged or expired");
      return;
    }
    openDraft(draft);
  }, [draftIdParam, draftsReady, drafts, openDraft, router]);

  const handleDiscardDraft = (id: string) => {
    discardDraft(id)
      .then(() => refreshDrafts())
      .catch((err) => console.error("Failed to discard draft:", err));
  };

  const handleDraftSave = (row: Record<string, unknown>) => {
    handleSave(row);
    if (activeDraftId) {
      const id = activeDraftId;
      setActiveDraftId(null);
      setDraftPrefill(undefined);
      discardDraft(id)
        .then(() => refreshDrafts())
        .catch((err) => console.error("Failed to clear logged draft:", err));
    }
  };

  const handleSheetClose = () => {
    setActiveDraftId(null);
    setDraftPrefill(undefined);
    hookHandleClose();
  };

  const sheetOpen = hookSheetOpen || !!draftPrefill;

  const failedQuery = [
    accountsQuery,
    txnsQuery,
    categoriesQuery,
    budgetsQuery,
    tokensQuery,
    tokenTxnsQuery,
    templatesQuery,
  ].find((q) => q.isError);
  const errorMessage = failedQuery
    ? "Failed to load dashboard data. Check your connection."
    : null;

  // cavetail: console.error is an imperative browser API, must live in an effect
  useEffect(() => {
    if (failedQuery) console.error("Sync error:", failedQuery.error);
  }, [failedQuery]);

  // honey: txns is the full transaction set (scoped 'all'); pre-filter once
  // for downstream balance + recent + budget consumers that only want actives.
  const activeTxns = useMemo(
    () => txns.filter((t) => !t.deletedAt),
    [txns],
  );

  // cavetail: the accounts total counts every active account once (wallet /
  // exchange balances live here, not in the crypto row) while the crypto row
  // is token value only — the assets screen totals the same two sources, so
  // the rows match by construction instead of double-counting divisions.
  const bankBalance = accounts.reduce(
    (sum, acc) => sum + computeBalance(acc, activeTxns),
    0n,
  );

  const bankAccountSlices = (() => {
    const bankAccounts = accounts
      .map((a) => ({
        name: a.name,
        color: a.primaryColor || FALLBACK_COLORS[0]!,
        balance: computeBalance(a, activeTxns),
      }))
      .sort((a, b) => (a.balance < 0n ? -a.balance : a.balance) > (b.balance < 0n ? -b.balance : b.balance) ? -1 : 1);
    const total = bankAccounts.reduce((sum, s) => sum + (s.balance < 0n ? -s.balance : s.balance), 0n);
    return bankAccounts.map((s, i) => ({
      ...s,
      color: s.color === FALLBACK_COLORS[0] ? FALLBACK_COLORS[i % FALLBACK_COLORS.length]! : s.color,
      pct: total > 0n ? Number(((s.balance < 0n ? -s.balance : s.balance) * 100n) / total) : 0,
    }));
  })();

  // Token holdings (crypto tab model) — not represented as accounts, so they
  // must be valued separately to count toward net worth.
  const tokenHoldings = computeHoldings(tokens, tokenTxns);

  const recentTxns = [...activeTxns]
    .sort((a, b) => b.date - a.date)
    .slice(0, 5);

  const recentForCapture: RecentTxn[] = recentTxns.map((t) => ({
    id: t.id,
    description: t.description,
    amountMinor: t.amountMinor,
    categoryIds: t.categoryIds,
    date: t.date,
  }));

  const now = new Date();
  // honey: budgetUsage is computed once per month/categories/budgets/activeTxns
  // change; BudgetPulse renders one bar per category so re-running it on every
  // render would touch every row.
  const accountAssetId = useMemo(
    () => new Map(accounts.map((a) => [a.id, a.assetId])),
    [accounts],
  );
  const budgetUsage = useMemo(
    () => computeBudgetUsage(categories, budgets, activeTxns, now.getFullYear(), now.getMonth(), scheduled, accountAssetId),
    [categories, budgets, activeTxns, now.getFullYear(), now.getMonth(), scheduled, accountAssetId],
  );

  // honey: accountInfo is consumed by RecentActivity + ScheduledCard + TemplateCard
  // + edit-amount prefill; rebuilding per render would force those to remount or
  // re-derive formatting on every render.
  const accountInfo = useMemo(() => {
    const map: Record<string, { name: string; code: string; decimals: number }> = {};
    for (const a of accounts) {
      const asset = assetsById.get(a.assetId);
      map[a.id] = { name: a.name, code: asset?.code ?? "", decimals: asset?.decimals ?? 2 };
    }
    return map;
  }, [accounts, assetsById]);

  const primaryCode = accounts.length > 0 ? accountInfo[accounts[0]!.id]?.code : "USD";
  const primaryDecimals = accounts.length > 0 ? accountInfo[accounts[0]!.id]?.decimals ?? 2 : 2;

  const nonBudgetedFlow = useMemo(
    () => computeNonBudgetedFlow(activeTxns, categories, budgets, now.getFullYear(), now.getMonth()),
    [activeTxns, categories, budgets, now.getFullYear(), now.getMonth()],
  );

  const monthlySpending = spendingByMonth(activeTxns, categories, 12);
  const sparkData = monthlySpending.map((m) => ({ month: m.month, expense: privacy ? 0 : Number(m.expense) }));

  const coingeckoKey = useMemo(
    () => coingeckoKeyForHoldings(tokenHoldings),
    [tokenHoldings],
  );
  // Cavetail: skip the CoinGecko fetch when the capture sheet is open — it is
  // not visible behind the sheet, and the network round-trip + BigInt
  // recompute add main-thread work on the same frame as the sheet opening.
  // honey: shared cache slot with holdings-list.tsx — same key shape dedupes
  // the CoinGecko request across the home dashboard and the crypto page.
  const pricesQuery = useQuery({
    queryKey: cryptoPriceQueryKey(coingeckoKey, primaryCode ?? "USD"),
    enabled: coingeckoKey.length > 0 && !captureOpen,
    queryFn: () => fetchPrices(coingeckoKey.split(","), (primaryCode || "USD").toLowerCase()),
  });
  const prices = pricesQuery.data ?? new Map<string, CoinPrice>();

  const tokenValueMinor = useMemo(
    () => computeTokenValueMinor(tokenHoldings, prices, primaryDecimals),
    [tokenHoldings, prices, primaryDecimals],
  );

  const cryptoBalance = tokenValueMinor;

  const totalBalance = bankBalance + cryptoBalance;

  const editAmountInput = editTxn
    ? (() => {
        const dec = accountInfo[editTxn.accountId]?.decimals ?? 2;
        const abs = editTxn.amountMinor < 0n ? -editTxn.amountMinor : editTxn.amountMinor;
        return (Number(abs) / 10 ** dec).toFixed(dec);
      })()
    : null;

  const txnPrefill: VoicePrefill | undefined = editTxn
    ? {
        accountId: editTxn.accountId,
        amountInput: editAmountInput!,
        categoryIds: editTxn.categoryIds,
        description: editTxn.description,
        type: editTxn.type,
        date: editTxn.date,
      }
    : undefined;

  // Cavetail: memoize so CaptureSheet's reset effect does not refire on every
  // dashboard render — without stable references the form would re-reset on
  // every sync tick and wipe in-progress input.
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
  const captureRecent = recentForCapture;

  // Cavetail: only mount CaptureSheet when actually open. Dialog always
  // renders its children otherwise, which would spin up useForm + Zod
  // validation on every dashboard render.
  const voicePrefillValue = draftPrefill ?? hookVoicePrefillValue ?? txnPrefill;

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

      {drafts.length > 0 && (
        <DraftInboxCard
          drafts={drafts}
          accounts={accounts}
          onOpen={openDraft}
          onDiscard={handleDiscardDraft}
        />
      )}

      {hasUpcoming && (
        <ScheduledCard
          accounts={scheduledAccounts}
          categories={scheduledCategories}
        />
      )}

        <NetWorthHero
        totalBalance={totalBalance}
        bankBalance={bankBalance}
        cryptoBalance={cryptoBalance}
        onTogglePrivacy={togglePrivacy}
        currencyCode={primaryCode}
      />

      {bankAccountSlices.length > 1 && (
        <BankProportionCard data={bankAccountSlices} code={primaryCode} />
      )}

      <RecentActivity
        txns={recentTxns}
        categories={categories}
        accounts={accountInfo}
      />

      <BudgetPulse items={budgetUsage} assetsById={assetsById} />

      <NonBudgetedFlow
        inflowMinor={nonBudgetedFlow.inflowMinor}
        outflowMinor={nonBudgetedFlow.outflowMinor}
        code={primaryCode}
        decimals={primaryDecimals}
      />

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

      {!hasUpcoming && (
        <ScheduledCard
          accounts={scheduledAccounts}
          categories={scheduledCategories}
        />
      )}

      <TemplateCard
        accounts={accounts.map((a) => ({
          id: a.id,
          name: a.name,
          decimals: assetsById.get(a.assetId)?.decimals ?? 2,
          assetCode: assetsById.get(a.assetId)?.code,
        }))}
        categories={categories.map((c) => ({ id: c.id, name: c.name, color: c.color }))}
      />

      {sheetOpen && (
        <CaptureSheet
          isOpen={sheetOpen}
          onOpenChange={(o) => {
            if (!o) handleSheetClose();
          }}
          accounts={captureAccounts}
          categories={captureCategories}
          recentTxns={captureRecent}
          templates={templates}
          onSave={handleDraftSave}
          voicePrefill={voicePrefillValue}
          editing={!!editTxn}
          onCreateCategory={handleCreateCategory}
        />
      )}
    </div>
  );
};
