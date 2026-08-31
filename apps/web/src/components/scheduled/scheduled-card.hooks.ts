"use client";

import { useEffect, useState } from "react";
import { useSync } from "@/lib/sync/sync-context";
import { useSyncMutation, queryKeys } from "@/lib/sync/sync-query";
import { waiveAdvance, type ScheduledTxn } from "@/lib/scheduled/compute";
import type { Category } from "@/lib/categories/categories-store";

export interface ScheduledMutations {
  notice: string | null;
  setNotice: (n: string | null) => void;
  logOccurrence: (row: Record<string, unknown>) => void;
  toggle: (row: ScheduledTxn) => void;
  remove: (row: ScheduledTxn) => void;
  save: (item: ScheduledTxn) => void;
  createCategory: (c: Category) => void;
  logItem: ScheduledTxn | null;
  setLogItem: (s: ScheduledTxn | null) => void;
  editItem: ScheduledTxn | null;
  setEditItem: (s: ScheduledTxn | null) => void;
  dialogOpen: boolean;
  setDialogOpen: (b: boolean) => void;
  userId: string;
}

export function useScheduledMutations(items: ScheduledTxn[]): ScheduledMutations {
  const { db, userId } = useSync();
  const uid = userId ?? "local";

  const [notice, setNotice] = useState<string | null>(null);
  const [logItem, setLogItem] = useState<ScheduledTxn | null>(null);
  const [editItem, setEditItem] = useState<ScheduledTxn | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

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

  const createCategoryMutation = useSyncMutation({
    keys: [queryKeys.categories],
    mutationFn: async (c: Category) => {
      await db.table("categories").upsert({
        id: c.id,
        user_id: uid,
        name: c.name,
        color: c.color,
        hideable: c.hideable ? 1 : 0,
        exclude_from_analytics: c.excludeFromAnalytics ? 1 : 0,
        monthly_budget_minor:
          c.monthlyBudgetMinor != null ? Number(c.monthlyBudgetMinor) : null,
        asset_id: c.assetId ?? null,
        created_at: c.createdAt,
        updated_at: c.updatedAt,
        deleted_at: c.deletedAt ?? null,
      });
    },
  });

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

  return {
    notice,
    setNotice,
    logOccurrence: (row) => {
      if (!logItem) return;
      logOccurrenceMutation.mutate({ row, schedule: logItem });
    },
    toggle: (row) => toggleMutation.mutate(row),
    remove: (row) => deleteMutation.mutate(row),
    save: (item) => saveMutation.mutate(item),
    createCategory: (c) => createCategoryMutation.mutate(c),
    logItem,
    setLogItem,
    editItem,
    setEditItem,
    dialogOpen,
    setDialogOpen,
    userId: uid,
  };
}
