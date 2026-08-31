"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSync } from "@/lib/sync/sync-context";
import { queryKeys, useSyncQuery } from "@/lib/sync/sync-query";
import { computeBalance } from "@/lib/accounts/accounts-store";
import type { Account, Txn } from "@/lib/accounts/accounts-store";
import type { Category } from "@/lib/categories/categories-store";
import { useCaptureSheet } from "@/components/capture/capture-sheet-context";
import type { VoicePrefill } from "@/components/capture/capture-sheet";
import { redeemDraft } from "@/lib/voice/redeem";
import { resolvePrefill } from "@/lib/voice/resolve";
import { useVoicePrefill } from "@/lib/voice/voice-context";
import { NetWorthHero } from "@/components/home/net-worth-hero";
import { BankProportionCard, FALLBACK_COLORS } from "@/components/home/bank-proportion-card";
import { RecentActivity } from "@/components/home/recent-activity";
import { BudgetPulse } from "@/components/home/budget-pulse";
import { ScheduledCard } from "@/components/scheduled/scheduled-card";
import { TemplateCard } from "@/components/templates/template-card";
import { toTemplate } from "@/lib/templates/templates-store";
import { usePrivacy } from "@/lib/privacy/privacy-context";
import { computeBudgetUsage, resolveCategoryColor } from "@/lib/categories/categories-store";
import { useAssets } from "@/lib/assets";
import { computeHoldings, toToken, toTokenTxn } from "@/lib/crypto/crypto-store";
import { fetchPrices, type CoinPrice } from "@/lib/crypto/rates";
import { spendingByMonth } from "@/lib/analytics/compute";
import { SparkLine } from "@/components/charts";
import Link from "next/link";

const CRYPTO_KINDS = new Set(["wallet", "exchange"]);

export const DashboardScreen = () => {
  const searchParams = useSearchParams();
  const draftToken = searchParams.get("draftToken");
  const { syncStatus } = useSync();
  const { assets } = useAssets();
  const assetsById = useMemo(
    () => new Map(assets.map((a) => [a.id, a])),
    [assets],
  );
  const queryClient = useQueryClient();
  const captureSheet = useCaptureSheet();

  const accountsQuery = useSyncQuery({
    key: queryKeys.accounts,
    sql: "SELECT * FROM accounts WHERE deleted_at IS NULL AND archived = 0",
    select: (row): Account => ({
      id: String(row.id),
      name: String(row.name),
      kind: String(row.kind) as Account["kind"],
      assetId: String(row.asset_id),
      openingBalanceMinor: BigInt(row.opening_balance_minor as string | bigint),
      createdAt: Number(row.created_at),
      updatedAt: Number(row.updated_at),
      deletedAt: row.deleted_at ? Number(row.deleted_at) : null,
    }),
  });
  const accounts = accountsQuery.data ?? [];

  const txnsQuery = useSyncQuery({
    key: queryKeys.transactions,
    scope: "all",
    sql: "SELECT * FROM transactions",
    select: (row): Txn => ({
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
    }),
  });
  const txns = txnsQuery.data ?? [];

  const categoriesQuery = useSyncQuery({
    key: queryKeys.categories,
    scope: "all",
    sql: "SELECT * FROM categories",
    select: (row): Category => ({
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
    }),
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
  const { prefill: assistantPrefill, setPrefill: setAssistantPrefill } = useVoicePrefill();
  const [voicePrefill, setVoicePrefill] = useState<VoicePrefill | undefined>();
  const [editTxn, setEditTxn] = useState<Txn | null>(null);

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

  // cavetail: redeemDraft mutates server state (consumes the one-shot voice
  // draft token) and rewrites the URL — both live outside React, so this
  // reaction to a search-param change is a real side effect.
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
      const next: VoicePrefill = {
        accountId: prefill.accountId,
        amountInput: prefill.amountInput,
        categoryIds: prefill.categoryIds,
        description: prefill.description,
      };
      setVoicePrefill(next);
      captureSheet.setPrefill(next);
      captureSheet.setOpen(true);
      // Clean up URL params
      const params = new URLSearchParams(window.location.search);
      params.delete("draftToken");
      const qs = params.toString();
      const url = qs ? `${window.location.pathname}?${qs}` : window.location.pathname;
      window.history.replaceState(null, "", url);
    })();
    return () => { cancelled = true; };
  }, [draftToken, accounts, categories, captureSheet]);

  const activeTxns = useMemo(
    () => txns.filter((t) => !t.deletedAt),
    [txns],
  );

  const bankBalance =
    accounts
      .filter((a) => !CRYPTO_KINDS.has(a.kind))
      .reduce((sum, acc) => sum + computeBalance(acc, activeTxns), 0n);

  const cryptoAccountBalance =
    accounts
      .filter((a) => CRYPTO_KINDS.has(a.kind))
      .reduce((sum, acc) => sum + computeBalance(acc, activeTxns), 0n);

  const bankAccountSlices = (() => {
    const bankAccounts = accounts
      .filter((a) => !CRYPTO_KINDS.has(a.kind))
      .map((a) => ({
        name: a.name,
        color: a.primaryColor || FALLBACK_COLORS[0]!,
        balance: computeBalance(a, activeTxns),
      }))
      .filter((s) => s.balance !== 0n)
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

  const now = new Date();
  const budgetUsage = useMemo(
    () => computeBudgetUsage(categories, budgets, activeTxns, now.getFullYear(), now.getMonth()),
    [categories, budgets, activeTxns, now.getFullYear(), now.getMonth()],
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

  const monthlySpending = spendingByMonth(activeTxns, categories, 12);
  const sparkData = monthlySpending.map((m) => ({ month: m.month, expense: privacy ? 0 : Number(m.expense) }));

  const coingeckoKey = useMemo(
    () =>
      [...new Set(tokenHoldings.map((h) => h.token.coingeckoId).filter((id): id is string => !!id))].sort().join(","),
    [tokenHoldings],
  );
  // Cavetail: skip the CoinGecko fetch when the capture sheet is open — it is
  // not visible behind the sheet, and the network round-trip + BigInt
  // recompute add main-thread work on the same frame as the sheet opening.
  const pricesQuery = useQuery({
    queryKey: ["prices", coingeckoKey, primaryCode],
    enabled: !!coingeckoKey && !captureSheet.open,
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

  const cryptoBalance = cryptoAccountBalance + tokenValueMinor;

  const totalBalance = bankBalance + cryptoBalance;

  // Drive the shell-owned capture sheet from the dashboard's prefill
  // triggers (edit txn, voice draft, assistant). URL-param deep links
  // (`?capture=1`, `?type=...`) are handled by CaptureOpener at the layout
  // level; this effect only fires for in-app triggers.
  const editPrefill: VoicePrefill | undefined = useMemo(() => {
    if (!editTxn) return undefined;
    const dec = accountInfo[editTxn.accountId]?.decimals ?? 2;
    const abs = editTxn.amountMinor < 0n ? -editTxn.amountMinor : editTxn.amountMinor;
    return {
      accountId: editTxn.accountId,
      amountInput: (Number(abs) / 10 ** dec).toFixed(dec),
      categoryIds: editTxn.categoryIds,
      description: editTxn.description,
      type: editTxn.type,
      date: editTxn.date,
    };
  }, [editTxn, accountInfo]);
  useEffect(() => {
    if (editTxn) {
      captureSheet.setEditingTxnId(editTxn.id);
      captureSheet.setPrefill(editPrefill);
      captureSheet.setOpen(true);
    } else if (voicePrefill) {
      captureSheet.setPrefill(voicePrefill);
      captureSheet.setOpen(true);
    } else if (assistantPrefill) {
      captureSheet.setPrefill(assistantPrefill);
      captureSheet.setOpen(true);
    }
    // editPrefill's identity changes only when its inputs change; the
    // effect intentionally re-pushes the prefill so a decimal re-mapping
    // lands in the open sheet. Without useMemo, the object would be new
    // every render and the sheet's reset effect would wipe user input.
  }, [editTxn, voicePrefill, assistantPrefill, editPrefill, captureSheet]);

  // When the sheet closes, clear the dashboard's local prefill triggers so
  // the next open is a clean entry. Compare against the previous open value
  // via a ref to detect the true->false transition. The `hadTrigger` guard
  // means a shell-button open that the user dismisses without going through
  // any dashboard trigger leaves editTxn/voicePrefill/assistantPrefill alone
  // — only the provider's transient slots get reset.
  const wasOpenRef = useRef(false);
  useEffect(() => {
    if (wasOpenRef.current && !captureSheet.open) {
      const hadTrigger = !!(editTxn || voicePrefill || assistantPrefill);
      if (hadTrigger) {
        if (editTxn) setEditTxn(null);
        if (voicePrefill) setVoicePrefill(undefined);
        if (assistantPrefill) setAssistantPrefill(undefined);
      }
      captureSheet.setPrefill(undefined);
      captureSheet.setEditingTxnId(undefined);
    }
    wasOpenRef.current = captureSheet.open;
  }, [captureSheet.open, editTxn, voicePrefill, assistantPrefill, captureSheet]);

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
        isPrivate={privacy}
        onTogglePrivacy={togglePrivacy}
        lastSyncedAt={syncStatus.lastSyncedAt}
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
        categories={categories.map((c) => ({ id: c.id, name: c.name, color: c.color }))}
      />

      <TemplateCard
        accounts={accounts.map((a) => ({
          id: a.id,
          name: a.name,
          decimals: assetsById.get(a.assetId)?.decimals ?? 2,
          assetCode: assetsById.get(a.assetId)?.code,
        }))}
        categories={categories.map((c) => ({ id: c.id, name: c.name, color: c.color }))}
        onChanged={() => void queryClient.invalidateQueries({ queryKey: [...queryKeys.templates] })}
      />
    </div>
  );
};
