"use client";

import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  TransactionFilters,
  type TxnFilters,
} from "@/components/banks/transaction-filters";
import { TransactionRow } from "@/components/banks/transaction-row";
import { usePrivacyStore } from "@/lib/privacy/privacy-store";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";
import type { Account, Txn } from "@/lib/accounts/accounts-store";
import type { Category } from "@/lib/categories/categories-store";
import { queryKeys, useSyncQuery } from "@/lib/sync/sync-query";
import { useAssets } from "@/lib/assets";

export interface GroupedDay {
  day: string;
  items: Txn[];
}

type AccountInfo = {
  name: string;
  code: string;
  decimals: number;
};

export interface BankTransactionsListProps {
  grouped: GroupedDay[];
  sortedDesc: Txn[];
  visibleCount: number;
  filters: TxnFilters;
  onFiltersChange: (next: TxnFilters) => void;
  dataPending: boolean;
  hasAccounts: boolean;
  loadMoreRef: React.RefObject<HTMLDivElement | null>;
  onAddTransaction: () => void;
  onNewAccount: () => void;
  onEditTxn: (txn: Txn) => void;
  onDuplicateTxn: (txn: Txn) => void;
  onDeleteTxn: (txn: Txn) => void;
  onUndoDeleteTxn: (txn: Txn) => void;
  formatDayHeader: (day: string) => string;
}

export const BankTransactionsList = (props: BankTransactionsListProps) => {
  const {
    grouped,
    sortedDesc,
    visibleCount,
    filters,
    onFiltersChange,
    dataPending,
    hasAccounts,
    loadMoreRef,
    onAddTransaction,
    onNewAccount,
    onEditTxn,
    onDuplicateTxn,
    onDeleteTxn,
    onUndoDeleteTxn,
    formatDayHeader,
  } = props;
  const privacy = usePrivacyStore((s) => s.masked);
  const { assets } = useAssets();
  const assetsById = new Map(assets.map((a) => [a.id, a]));

  const accountsQuery = useSyncQuery({
    key: queryKeys.accounts,
    sql: `SELECT * FROM accounts WHERE deleted_at IS NULL AND archived = 0`,
    select: (r) => ({
      id: String(r.id),
      name: String(r.name),
      kind: String(r.kind) as Account["kind"],
      assetId: String(r.asset_id),
      openingBalanceMinor: BigInt(r.opening_balance_minor as number | string),
      createdAt: Number(r.created_at),
      updatedAt: Number(r.updated_at),
      archived: Boolean(r.archived),
      deletedAt: r.deleted_at != null ? Number(r.deleted_at) : null,
    } satisfies Account),
  });
  const categoriesQuery = useSyncQuery({
    key: queryKeys.categories,
    sql: `SELECT * FROM categories WHERE deleted_at IS NULL`,
  });
  const accounts = accountsQuery.data ?? [];
  const categories = (categoriesQuery.data ?? []) as Category[];

  const accountInfo: Record<string, { name: string; code: string; decimals: number } | undefined> = {};
  for (const a of accounts) {
    const asset = assetsById.get(a.assetId);
    accountInfo[a.id] = { name: a.name, code: asset?.code ?? "", decimals: asset?.decimals ?? 2 };
  }

  const categoryInfoList = categories.map((c) => ({
    id: c.id,
    name: c.name,
    color: c.color,
    hideable: c.hideable,
  }));

  const primaryDecimals = primaryAssetDecimals(accountInfo, accounts);
  const primaryCode = primaryAssetCode(accountInfo, accounts);

  return (
    <>
      <div className="sticky top-[65px] z-20 -mx-4 border-y border-(--border) bg-(--bg)/95 px-4 py-2.5 backdrop-blur md:top-0 md:-mx-0 md:border-x md:rounded-b-(--radius-md) md:px-4">
        <TransactionFilters
          filters={filters}
          onChange={onFiltersChange}
          categories={categories}
          accounts={accounts}
        />
      </div>

      <section className="overflow-clip rounded-(--radius-lg) border border-(--border) bg-(--surface-1) divide-y divide-(--border)">
        {dataPending ? (
          <div className="flex items-center justify-center py-10 text-sm text-zinc-500" aria-label="Loading">
            Loading…
          </div>
        ) : grouped.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-10 text-center">
            {!hasAccounts ? (
              <>
                <p className="text-sm font-semibold text-zinc-200">Add your first account</p>
                <p className="max-w-xs text-sm text-zinc-400">
                  Create a bank, cash, wallet, or exchange account to start tracking.
                </p>
                <Button onClick={onNewAccount}>
                  <Plus className="h-4 w-4" aria-hidden /> New account
                </Button>
              </>
            ) : (
              <>
                <p className="text-sm text-zinc-500">No transactions yet</p>
                <Button size="sm" className="hidden md:inline-flex" onClick={onAddTransaction}>
                  <Plus className="h-4 w-4" aria-hidden /> Add transaction
                </Button>
              </>
            )}
          </div>
        ) : (
          <>
            <div className="hidden justify-end border-b border-(--border) bg-(--surface-2) px-4 py-2 md:flex">
              <Button size="sm" onClick={onAddTransaction}>
                <Plus className="h-4 w-4" aria-hidden /> Add transaction
              </Button>
            </div>
            {grouped.map((g) => {
              const dayNet = g.items.reduce((sum, t) => sum + t.amountMinor, 0n);
              const dayLabel = formatDayMoney(dayNet, primaryDecimals, primaryCode, privacy);
              return (
                <div key={g.day}>
                  <div className="sticky top-[182px] z-10 flex items-center justify-between gap-3 bg-(--surface-2) px-4 py-1.5 md:top-[117px]">
                    <p className="label-micro">{formatDayHeader(g.day)}</p>
                    <p
                      className={cn(
                        "text-xs font-semibold tabular-nums",
                        dayNet >= 0n ? "text-zinc-50" : "text-(--danger)",
                      )}
                      aria-label={privacy ? "Day total masked" : `Day total ${dayLabel}`}
                    >
                      {privacy ? "••••" : dayLabel}
                    </p>
                  </div>
                  {g.items.flatMap((t, i) => {
                    const info = accountInfo[t.accountId];
                    const next = g.items[i + 1];
                    const linked = !!t.transferId && next?.transferId === t.transferId;
                    const row = (
                      <TransactionRow
                        key={t.id}
                        txn={t}
                        categories={categoryInfoList}
                        accountName={info?.name}
                        assetCode={info?.code}
                        assetDecimals={info?.decimals}
                        onEdit={onEditTxn}
                        onDuplicate={onDuplicateTxn}
                        onDelete={onDeleteTxn}
                        onUndoDelete={onUndoDeleteTxn}
                      />
                    );
                    if (!linked) return [row];
                    return [
                      row,
                      <span
                        key={`link-${t.id}`}
                        aria-hidden
                        className="pointer-events-none relative z-10 -mt-px block h-3.5"
                      >
                        <span className="absolute left-[17px] top-0 h-full w-px bg-(--accent)/30" />
                      </span>,
                    ];
                  })}
                </div>
              );
            })}
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
    </>
  );
};

function primaryAssetDecimals(
  accountInfo: Record<string, AccountInfo | undefined>,
  accounts: Account[],
): number {
  const first = accounts[0];
  if (!first) return 2;
  return accountInfo[first.id]?.decimals ?? 2;
}

function primaryAssetCode(
  accountInfo: Record<string, AccountInfo | undefined>,
  accounts: Account[],
): string {
  const first = accounts[0];
  if (!first) return "";
  return accountInfo[first.id]?.code ?? "";
}

function formatDayMoney(
  minor: bigint,
  decimals: number,
  code: string,
  privacy: boolean,
): string {
  if (privacy) return "••••";
  return formatMoney(minor, decimals, code);
}
