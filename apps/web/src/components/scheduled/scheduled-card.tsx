"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronUp, Plus } from "lucide-react";
import { useSync } from "@/lib/sync/sync-context";
import { useSyncQuery, useSyncMutation, queryKeys } from "@/lib/sync/sync-query";
import { toScheduledTxn } from "@/lib/scheduled/scheduled-store";
import {
  partitionSchedules,
  waiveAdvance,
  SOON_WINDOW_DAYS,
  type ScheduledTxn,
} from "@/lib/scheduled/compute";
import { ScheduledDialog } from "@/components/scheduled/scheduled-dialog";
import { ScheduledRow } from "@/components/scheduled/scheduled-row";
import { Button } from "@/components/ui/button";
import { CaptureSheet, type VoicePrefill } from "@/components/capture/capture-sheet";

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
};

export interface ScheduledCardProps {
  accounts: ScheduledCardAccount[];
  categories: ScheduledCardCategory[];
}

export const ScheduledCard = ({
  accounts,
  categories,
}: ScheduledCardProps) => {
  const { db, userId } = useSync();
  const uid = userId ?? "local";
  const itemsQuery = useSyncQuery({
    key: queryKeys.scheduledTransactions,
    sql: "SELECT * FROM scheduled_transactions WHERE deleted_at IS NULL",
    select: toScheduledTxn,
  });
  const items = itemsQuery.data ?? [];
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<ScheduledTxn | null>(null);
  const [logItem, setLogItem] = useState<ScheduledTxn | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  // cavetail: accountById Map is built once per accounts change; used in a hot
  // per-row map lookup. KEEP.
  const accountById = useMemo(
    () => new Map(accounts.map((a) => [a.id, a])),
    [accounts],
  );

  // cavetail: setTimeout + clearTimeout are imperative browser timers, not
  // derived state. Auto-dismiss the error notice after 4s.
  useEffect(() => {
    if (!notice) return;
    const t = window.setTimeout(() => setNotice(null), 4000);
    return () => window.clearTimeout(t);
  }, [notice]);

  const logOccurrenceMutation = useSyncMutation<{
    row: Record<string, unknown>;
    schedule: ScheduledTxn;
  }>({
    keys: [queryKeys.transactions, queryKeys.scheduledTransactions],
    mutationFn: async ({ row, schedule }) => {
      // Advance first: if the schedule can't advance (no recurrence), bail
      // before writing so a txn is never logged without a schedule roll.
      if (schedule.recurrence) {
        const advanced = waiveAdvance(schedule);
        await db.table("transactions").upsert(row);
        await db.table("scheduled_transactions").upsert({
          id: schedule.id,
          user_id: schedule.userId,
          name: schedule.name,
          description: schedule.description,
          type: schedule.type,
          // cavetail: converting bigint minor units to the SyncTable number column
          // eslint-disable-next-line local/no-money-float
          amount_minor: Number(schedule.amountMinor),
          account_id: schedule.accountId,
          category_ids: schedule.categoryIds,
          recurrence: {
            frequency: schedule.recurrence.frequency,
            interval: schedule.recurrence.interval,
          },
          timezone: schedule.timezone,
          invoke_date: advanced.invokeDate,
          previous_date: advanced.previousDate,
          last_notified_at: schedule.lastNotifiedAt,
          active: schedule.active ? 1 : 0,
          created_at: schedule.createdAt,
          updated_at: Date.now(),
          deleted_at: schedule.deletedAt ?? null,
        });
      } else {
        await db.table("transactions").upsert(row);
        await db.table("scheduled_transactions").upsert({
          id: schedule.id,
          user_id: schedule.userId,
          name: schedule.name,
          description: schedule.description,
          type: schedule.type,
          // cavetail: converting bigint minor units to the SyncTable number column
          // eslint-disable-next-line local/no-money-float
          amount_minor: Number(schedule.amountMinor),
          account_id: schedule.accountId,
          category_ids: schedule.categoryIds,
          recurrence: null,
          timezone: schedule.timezone,
          invoke_date: schedule.invokeDate,
          previous_date: schedule.previousDate,
          last_notified_at: schedule.lastNotifiedAt,
          active: 0,
          created_at: schedule.createdAt,
          updated_at: Date.now(),
          deleted_at: schedule.deletedAt ?? null,
        });
      }
    },
    onError: (error) => {
      console.error("Failed to log scheduled transaction:", error);
      setNotice("Couldn't log this occurrence. Please try again.");
    },
  });

  const handleOccurrenceSave = (row: Record<string, unknown>) => {
    if (!logItem) return;
    logOccurrenceMutation.mutate({ row, schedule: logItem });
  };

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

  const toggleMutation = useSyncMutation<ScheduledTxn>({
    keys: [queryKeys.scheduledTransactions],
    mutationFn: async (row) => {
      await db.table("scheduled_transactions").update({
        id: row.id,
        active: row.active ? 0 : 1,
      });
    },
    onError: (error) => {
      console.error("Failed to toggle scheduled transaction:", error);
      setNotice("Couldn't update schedule");
    },
  });

  const handleToggle = (row: ScheduledTxn) => {
    toggleMutation.mutate(row);
  };

  const deleteMutation = useSyncMutation<ScheduledTxn>({
    keys: [queryKeys.scheduledTransactions],
    mutationFn: async (row) => {
      await db.table("scheduled_transactions").update({
        id: row.id,
        deleted_at: Date.now(),
      });
    },
    onError: (error) => {
      console.error("Failed to delete scheduled transaction:", error);
      setNotice("Couldn't delete schedule");
    },
  });

  const handleDelete = (row: ScheduledTxn) => {
    deleteMutation.mutate(row);
  };

  const saveMutation = useSyncMutation<ScheduledTxn>({
    keys: [queryKeys.scheduledTransactions],
    mutationFn: async (item) => {
      const isNew = !items.some((i) => i.id === item.id);
      await db.table("scheduled_transactions").upsert({
        id: item.id,
        user_id: isNew ? uid : item.userId,
        name: item.name,
        description: item.description,
        type: item.type,
        // cavetail: converting bigint minor units to the SyncTable number column
        // eslint-disable-next-line local/no-money-float
        amount_minor: Number(item.amountMinor),
        account_id: item.accountId,
        category_ids: item.categoryIds,
        recurrence: item.recurrence
          ? {
              frequency: item.recurrence.frequency,
              interval: item.recurrence.interval,
            }
          : null,
        timezone: item.timezone,
        invoke_date: item.invokeDate,
        previous_date: item.previousDate,
        last_notified_at: item.lastNotifiedAt,
        active: item.active ? 1 : 0,
        created_at: item.createdAt,
        updated_at: item.updatedAt,
        deleted_at: item.deletedAt ?? null,
      });
    },
    onError: (error) => {
      console.error("Failed to save scheduled transaction:", error);
      setNotice("Couldn't save schedule");
    },
  });

  const handleSave = (item: ScheduledTxn) => {
    saveMutation.mutate(item);
  };

  const handleEdit = (row: ScheduledTxn) => {
    setEditItem(row);
    setDialogOpen(true);
  };

  const now = new Date();

  // Everything the user must see now: due, overdue, or coming up within 3 days.
  // Everything else hides behind an expander so the card stays a glance surface.
  const { soon: soonItems, rest: restItems } = partitionSchedules(items, now, SOON_WINDOW_DAYS);

  const visible = expanded ? [...soonItems, ...restItems] : soonItems;
  const hiddenCount = restItems.length;

  return (
    <section
      aria-label="Scheduled"
      className="rounded-(--radius-lg) border border-(--border) bg-(--surface-1)"
    >
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <h2 className="font-display text-base font-bold tracking-tight">
          Scheduled
        </h2>
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
            onToggle={handleToggle}
            onEdit={handleEdit}
            onDelete={handleDelete}
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
        onSave={handleSave}
        onDelete={handleDelete}
        editItem={editItem}
        accounts={accounts}
        categories={categories}
      />

      <CaptureSheet
        isOpen={!!logItem}
        onOpenChange={(isOpen) => {
          if (!isOpen) setLogItem(null);
        }}
        userId={uid}
        accounts={captureAccounts}
        categories={categories}
        recentTxns={[]}
        onSave={handleOccurrenceSave}
        voicePrefill={occurrencePrefill}
      />
    </section>
  );
};
