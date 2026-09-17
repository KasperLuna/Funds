"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, ChevronUp, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSyncQuery } from "@/lib/sync/sync-query";
import { toScheduledTxn } from "@/lib/scheduled/scheduled-store";
import {
  partitionSchedules,
  selectAutoDue,
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
    autoDeduct,
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

  // cavetail: auto-deduct posts due schedules once per app open. The ref set
  // dedupes re-renders/StrictMode; the mutation re-checks each schedule fresh
  // so a second tab racing the same morning skips instead of double-posting.
  const autoDoneRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (items.length === 0) return;
    const due = selectAutoDue(items, new Date()).filter(
      (s) => !autoDoneRef.current.has(s.id),
    );
    if (due.length === 0) return;
    for (const s of due) autoDoneRef.current.add(s.id);
    autoDeduct(
      due,
      (accountId) => accountById.get(accountId)?.assetId,
    );
  }, [items]);

  const captureAccounts = accounts.map((a) => ({
    id: a.id,
    name: a.name,
    assetId: a.assetId,
    decimals: a.decimals,
    assetCode: a.code,
  }));

  // cavetail: memoized on the row, not the render — rebuilding this object
  // every render re-fires the capture form's open effect and wipes the user's
  // in-progress typing on each parent re-render (sync ticks). Deliberately
  // keyed on logItem only: the account lookup is read at open time, and
  // keying on the accounts array (new identity per render) would void this.
  // A zero amount prefills as empty (not "0.00") so typing starts from a
  // clean buffer on both the keypad and desktop paths with no clear first.
  const occurrencePrefill: VoicePrefill | undefined = useMemo(
    () =>
      logItem
        ? (() => {
            const account = accountById.get(logItem.accountId);
            const dec = account?.decimals ?? 2;
            const abs =
              logItem.amountMinor < 0n ? -logItem.amountMinor : logItem.amountMinor;
            return {
              accountId: logItem.accountId,
              amountInput: abs === 0n ? "" : (Number(abs) / 10 ** dec).toFixed(dec),
              categoryIds: logItem.categoryIds,
              description: logItem.description || logItem.name,
              type: logItem.type,
            };
          })()
        : undefined,
    [logItem],
  );

  const handleEdit = (row: typeof items[number]) => {
    setEditItem(row);
    setDialogOpen(true);
  };

  const now = new Date();

  // Everything the user must see now: due, overdue, or coming up within 3 days.
  // Everything else hides behind an expander so the card stays a glance surface.
  const { soon: soonItems, rest: restItems } = partitionSchedules(items, now, SOON_WINDOW_DAYS);

  // cavetail: collapsed view previews far-future rows when nothing is soon so
  // existing schedules never read as "none". restItems is nearest-first.
  const collapsedVisible = soonItems.length > 0 ? soonItems : restItems.slice(0, 3);
  const visible = expanded ? [...soonItems, ...restItems] : collapsedVisible;
  const hiddenCount = items.length - collapsedVisible.length;
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
        {items.length === 0 && (
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
