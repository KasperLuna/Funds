"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Check,
  Pause,
  Pencil,
  Play,
  Plus,
  Trash2,
} from "lucide-react";
import { useSync } from "@/lib/sync/sync-context";
import { toScheduledTxn } from "@/lib/scheduled/scheduled-store";
import {
  nextOccurrence,
  waiveAdvance,
  type ScheduledTxn,
} from "@/lib/scheduled/compute";
import { ScheduledDialog } from "@/components/scheduled/scheduled-dialog";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/money";

export type ScheduledCardAccount = {
  id: string;
  name: string;
  assetId: string;
  decimals: number;
};

export type ScheduledCardCategory = {
  id: string;
  name: string;
};

function formatLocalDate(isoDate: string): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  if (!y || !m || !d) return isoDate;
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function newTxnId(now: number): string {
  return `txn-${now.toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function ScheduledCard({
  accounts,
  categories,
}: {
  accounts: ScheduledCardAccount[];
  categories: ScheduledCardCategory[];
}) {
  const { db, userId, isConnected, lastSyncedAt } = useSync();
  const uid = userId ?? "local";
  const [items, setItems] = useState<ScheduledTxn[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<ScheduledTxn | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const accountById = useMemo(
    () => new Map(accounts.map((a) => [a.id, a])),
    [accounts],
  );

  const reload = useCallback(async () => {
    try {
      const res = await db.query(
        "SELECT * FROM scheduled_transactions WHERE deleted_at IS NULL",
      );
      setItems(res.rows.map(toScheduledTxn));
    } catch (error) {
      console.error("Failed to load scheduled transactions:", error);
      setNotice("Couldn't load scheduled transactions");
    }
  }, [db]);

  useEffect(() => {
    void reload();
  }, [reload, isConnected, lastSyncedAt]);

  useEffect(() => {
    if (!notice) return;
    const t = window.setTimeout(() => setNotice(null), 4000);
    return () => window.clearTimeout(t);
  }, [notice]);

  const handleConfirm = useCallback(
    async (row: ScheduledTxn) => {
      try {
        const account = accountById.get(row.accountId);
        if (!account) throw new Error("Account not found");
        // Pure advance first: if the schedule can't advance (no recurrence),
        // bail before writing anything so a txn isn't logged without an advance.
        const advanced = waiveAdvance(row);
        const now = Date.now();
        await db.table("transactions").upsert({
          id: newTxnId(now),
          user_id: row.userId,
          account_id: row.accountId,
          asset_id: account.assetId,
          // cavetail: converting bigint minor units to the SyncTable number column
          // eslint-disable-next-line local/no-money-float
          amount_minor: Number(row.amountMinor),
          type: row.type,
          description: row.description || row.name,
          category_ids: row.categoryIds,
          date: row.invokeDate ?? now,
          created_at: now,
          updated_at: now,
          deleted_at: null,
        });
        await db.table("scheduled_transactions").update({
          id: row.id,
          previous_date: advanced.previousDate,
          invoke_date: advanced.invokeDate,
        });
        await reload();
      } catch (error) {
        console.error("Failed to confirm scheduled transaction:", error);
        setNotice("Couldn't confirm. Please try again.");
      }
    },
    [db, reload, accountById],
  );

  const handleToggle = useCallback(
    async (row: ScheduledTxn) => {
      try {
        await db.table("scheduled_transactions").update({
          id: row.id,
          active: row.active ? 0 : 1,
        });
        await reload();
      } catch (error) {
        console.error("Failed to toggle scheduled transaction:", error);
        setNotice("Couldn't update schedule");
      }
    },
    [db, reload],
  );

  const handleDelete = useCallback(
    async (row: ScheduledTxn) => {
      try {
        await db.table("scheduled_transactions").update({
          id: row.id,
          deleted_at: Date.now(),
        });
        await reload();
      } catch (error) {
        console.error("Failed to delete scheduled transaction:", error);
        setNotice("Couldn't delete schedule");
      }
    },
    [db, reload],
  );

  const handleSave = useCallback(
    async (item: ScheduledTxn) => {
      try {
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
        await reload();
      } catch (error) {
        console.error("Failed to save scheduled transaction:", error);
        setNotice("Couldn't save schedule");
      }
    },
    [db, reload, uid, items],
  );

  if (items.length === 0) return null;

  const now = new Date();

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
        {items.map((row) => {
          const occ = nextOccurrence(row, now);
          const account = accountById.get(row.accountId);
          const decimals = account?.decimals ?? 2;
          const needsConfirm =
            occ.status === "due" || occ.status === "overdue";
          const chip =
            occ.status === "overdue"
              ? { cls: "bg-(--danger)/10 text-(--danger)", label: "Overdue" }
              : occ.status === "due"
                ? { cls: "bg-(--accent)/10 text-(--accent)", label: "Due" }
                : { cls: "bg-(--surface-2) text-zinc-500", label: "Upcoming" };

          return (
            <div
              key={row.id}
              className={`flex items-center gap-3 px-4 py-3 transition-opacity ${row.active ? "" : "opacity-50"}`}
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate text-sm font-medium">{row.name}</span>
                  <span className="shrink-0 text-sm font-semibold tabular-nums text-zinc-500">
                    {formatMoney(row.amountMinor, decimals)}
                  </span>
                </div>
                <div className="mt-0.5 flex items-center gap-2 text-xs text-zinc-500">
                  <span className="truncate">
                    {account?.name ?? "Unknown"}
                  </span>
                  <span aria-hidden>·</span>
                  <span>
                    {occ.localDate ? formatLocalDate(occ.localDate) : "—"}
                  </span>
                  {occ.status !== "none" && (
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${chip.cls}`}
                    >
                      {chip.label}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-1">
                {needsConfirm && (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => void handleConfirm(row)}
                  >
                    <Check className="h-4 w-4" aria-hidden />
                    Confirm
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => void handleToggle(row)}
                  aria-label={row.active ? "Pause" : "Resume"}
                >
                  {row.active ? (
                    <Pause className="h-4 w-4" />
                  ) : (
                    <Play className="h-4 w-4" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setEditItem(row);
                    setDialogOpen(true);
                  }}
                  aria-label="Edit"
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => void handleDelete(row)}
                  aria-label="Delete"
                >
                  <Trash2 className="h-4 w-4 text-(--danger)" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      <ScheduledDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSave={handleSave}
        onDelete={handleDelete}
        editItem={editItem}
        accounts={accounts}
        categories={categories}
      />
    </section>
  );
}
