"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSyncQuery } from "@/lib/sync/sync-query";
import { toScheduledTxn } from "@/lib/scheduled/scheduled-store";
import {
  partitionSchedules,
  SOON_WINDOW_DAYS,
} from "@/lib/scheduled/compute";
import { ScheduledDialog } from "@/components/scheduled/scheduled-dialog";
import { ScheduledRow } from "@/components/scheduled/scheduled-row";
import { Button } from "@/components/ui/button";
import { CaptureSheet, type VoicePrefill } from "@/components/capture/capture-sheet";
import { queryKeys } from "@/lib/sync/sync-query";
import { useScheduledMutations } from "./scheduled-card.hooks";

export type ScheduledCardAccount = {
  id: string;
  name: string;
  assetId: string;
  decimals: number;
  code: string;
};

export type ScheduledCardCategory = {
  id: string;
  name: string;
  color?: string | null;
};

export interface ScheduledCardProps {
  accounts: ScheduledCardAccount[];
  categories: ScheduledCardCategory[];
}

export const ScheduledCard = ({
  accounts,
  categories,
}: ScheduledCardProps) => {
  const itemsQuery = useSyncQuery({
    key: queryKeys.scheduledTransactions,
    sql: "SELECT * FROM scheduled_transactions WHERE deleted_at IS NULL",
    select: toScheduledTxn,
  });
  const items = itemsQuery.data ?? [];
  const [expanded, setExpanded] = useState(false);

  const {
    notice,
    logOccurrence,
    toggle,
    remove,
    save,
    createCategory,
    logItem,
    setLogItem,
    editItem,
    setEditItem,
    dialogOpen,
    setDialogOpen,
  } = useScheduledMutations(items);

  const accountById = new Map(accounts.map((a) => [a.id, a]));

  const captureAccounts = accounts.map((a) => ({
    id: a.id,
    name: a.name,
    assetId: a.assetId,
    decimals: a.decimals,
    assetCode: a.code,
  }));

  const occurrencePrefill: VoicePrefill | undefined = logItem
    ? (() => {
        const account = accountById.get(logItem.accountId);
        const dec = account?.decimals ?? 2;
        const abs = logItem.amountMinor < 0n ? -logItem.amountMinor : logItem.amountMinor;
        return {
          accountId: logItem.accountId,
          amountInput: (Number(abs) / 10 ** dec).toFixed(dec),
          categoryIds: logItem.categoryIds,
          description: logItem.description || logItem.name,
          type: logItem.type,
        };
      })()
    : undefined;

  const handleEdit = (row: typeof items[number]) => {
    setEditItem(row);
    setDialogOpen(true);
  };

  const now = new Date();

  // Everything the user must see now: due, overdue, or coming up within 3 days.
  // Everything else hides behind an expander so the card stays a glance surface.
  const { soon: soonItems, rest: restItems } = partitionSchedules(items, now, SOON_WINDOW_DAYS);

  const visible = expanded ? [...soonItems, ...restItems] : soonItems;
  const hiddenCount = restItems.length;
  const attentionItems = soonItems.filter(
    ({ occ }) => occ.status === "due" || occ.status === "overdue",
  );
  const hasAttention = attentionItems.length > 0;

  return (
    <section
      aria-label={hasAttention ? "Scheduled transactions needing attention" : "Scheduled"}
      className={cn(
        "rounded-(--radius-lg) border bg-(--surface-1)",
        hasAttention ? "border-(--accent)/40" : "border-(--border)",
      )}
    >
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <div className="min-w-0">
          <h2 className="font-display text-base font-bold tracking-tight">
            {hasAttention ? "Needs attention" : "Scheduled"}
          </h2>
          {hasAttention && (
            <p className="mt-0.5 text-xs text-zinc-500">
              {attentionItems.length === 1
                ? "One transaction is ready to log"
                : `${attentionItems.length} transactions are ready to log`}
            </p>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setEditItem(null);
            setDialogOpen(true);
          }}
        >
          <Plus className="h-4 w-4" aria-hidden />
          Add
        </Button>
      </div>

      {notice && (
        <p className="px-4 pb-2 text-xs text-(--danger)">{notice}</p>
      )}

      <div className="divide-y divide-(--border)">
        {visible.length === 0 && (
          <div className="px-4 pb-4">
            <p className="text-sm text-zinc-500">No scheduled transactions yet</p>
            <p className="text-xs text-zinc-500">Set up recurring entries.</p>
          </div>
        )}
        {visible.map(({ row, occ }) => (
          <ScheduledRow
            key={row.id}
            row={row}
            occ={occ}
            account={accountById.get(row.accountId)}
            onLogOccurrence={setLogItem}
            onToggle={toggle}
            onEdit={handleEdit}
            onDelete={remove}
          />
        ))}

        {hiddenCount > 0 && (
          <button
            type="button"
            onClick={() => setExpanded((e) => !e)}
            aria-expanded={expanded}
            className="flex w-full min-h-11 items-center justify-center gap-1.5 px-4 py-2.5 text-sm font-medium text-zinc-500 transition-colors hover:text-inherit focus-visible:ring-2 focus-visible:ring-(--accent) focus-visible:outline-none"
          >
            {expanded ? (
              <>
                <ChevronUp className="h-4 w-4" aria-hidden />
                Show fewer
              </>
            ) : (
              <>
                <ChevronDown className="h-4 w-4" aria-hidden />
                {hiddenCount} more scheduled
              </>
            )}
          </button>
        )}
      </div>

      <ScheduledDialog
        isOpen={dialogOpen}
        onOpenChange={setDialogOpen}
        onSave={save}
        onDelete={remove}
        editItem={editItem}
        accounts={accounts}
        categories={categories}
      />

      <CaptureSheet
        isOpen={!!logItem}
        onOpenChange={(isOpen) => {
          if (!isOpen) setLogItem(null);
        }}
        accounts={captureAccounts}
        categories={categories}
        recentTxns={[]}
        onSave={logOccurrence}
        voicePrefill={occurrencePrefill}
        onCreateCategory={createCategory}
      />
    </section>
  );
};
