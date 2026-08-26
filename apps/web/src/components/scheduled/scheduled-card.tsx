"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Check,
  ChevronDown,
  ChevronUp,
  Ellipsis,
  Pause,
  Pencil,
  Play,
  Plus,
  Trash2,
} from "lucide-react";
import { useSync } from "@/lib/sync/sync-context";
import { useSyncQuery, useSyncMutation, queryKeys } from "@/lib/sync/sync-query";
import { toScheduledTxn } from "@/lib/scheduled/scheduled-store";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import {
  partitionSchedules,
  waiveAdvance,
  SOON_WINDOW_DAYS,
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
  code: string;
};

export type ScheduledCardCategory = {
  id: string;
  name: string;
};

/** Days until the next occurrence; negative when due/overdue. */
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

/** Controlled popover exposing open state to its trigger (for caret/icon). */
function RowPopover({
  children,
}: {
  children: (controls: { open: boolean; setOpen: (open: boolean) => void }) => React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return <Popover open={open} onOpenChange={setOpen}>{children({ open, setOpen })}</Popover>;
}

export function ScheduledCard({
  accounts,
  categories,
}: {
  accounts: ScheduledCardAccount[];
  categories: ScheduledCardCategory[];
}) {
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
  const [notice, setNotice] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  const accountById = useMemo(
    () => new Map(accounts.map((a) => [a.id, a])),
    [accounts],
  );

  useEffect(() => {
    if (!notice) return;
    const t = window.setTimeout(() => setNotice(null), 4000);
    return () => window.clearTimeout(t);
  }, [notice]);

  const confirmMutation = useSyncMutation<ScheduledTxn>({
    keys: [queryKeys.transactions, queryKeys.scheduledTransactions],
    mutationFn: async (row) => {
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
    },
    onError: (error) => {
      console.error("Failed to confirm scheduled transaction:", error);
      setNotice("Couldn't confirm. Please try again.");
    },
  });

  const handleConfirm = (row: ScheduledTxn) => {
    confirmMutation.mutate(row);
  };

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

  const now = new Date();

  // Everything the user must see now: due, overdue, or coming up within 3 days.
  // Everything else hides behind an expander so the card stays a glance surface.
  const { soon: soonItems, rest: restItems } = useMemo(
    () => partitionSchedules(items, now, SOON_WINDOW_DAYS),
    [items, now],
  );

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
        {visible.map(({ row, occ }) => {
          const account = accountById.get(row.accountId);
          const decimals = account?.decimals ?? 2;
          const code = account?.code;
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
              className={`flex items-center gap-x-3 gap-y-2 px-4 py-3 transition-opacity ${row.active ? "" : "opacity-50"}`}
            >
              <div className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">{row.name}</span>
                <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-zinc-500">
                  <span className="truncate">
                    {account?.name ?? "Unknown"}
                  </span>
                  <span aria-hidden>·</span>
                  <span>
                    {occ.localDate ? formatLocalDate(occ.localDate) : "—"}
                  </span>
                </div>
              </div>

              {/* Amount + status, Confirm, and actions stay on one line with the name. */}
              <div className="flex shrink-0 items-center gap-1.5">
                <span className="whitespace-nowrap text-sm font-semibold tabular-nums text-zinc-500">
                  {formatMoney(row.amountMinor, decimals, code)}
                </span>
                {occ.status !== "none" && (
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${chip.cls}`}
                  >
                    {chip.label}
                  </span>
                )}
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
                {/* Desktop: inline actions. Mobile: a kebab menu keeps rows clean. */}
                <div className="hidden items-center gap-1 sm:flex">
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

                <RowPopover>
                  {({ open, setOpen }) => (
                    <>
                      <PopoverTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          aria-label="Schedule actions"
                          aria-expanded={open}
                          className="sm:hidden"
                        >
                          <Ellipsis className="h-4 w-4" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent align="end" className="w-44 p-1 sm:hidden">
                        <div className="flex flex-col gap-0.5">
                          <button
                            type="button"
                            onClick={() => {
                              void handleToggle(row);
                              setOpen(false);
                            }}
                            className="flex min-h-11 items-center gap-2.5 rounded-(--radius-sm) px-3 text-sm text-zinc-300 transition-colors hover:bg-(--surface-2) hover:text-inherit"
                          >
                            {row.active ? (
                              <Pause className="h-4 w-4 text-zinc-500" aria-hidden />
                            ) : (
                              <Play className="h-4 w-4 text-zinc-500" aria-hidden />
                            )}
                            {row.active ? "Pause" : "Resume"}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setEditItem(row);
                              setDialogOpen(true);
                              setOpen(false);
                            }}
                            className="flex min-h-11 items-center gap-2.5 rounded-(--radius-sm) px-3 text-sm text-zinc-300 transition-colors hover:bg-(--surface-2) hover:text-inherit"
                          >
                            <Pencil className="h-4 w-4 text-zinc-500" aria-hidden />
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              void handleDelete(row);
                              setOpen(false);
                            }}
                            className="flex min-h-11 items-center gap-2.5 rounded-(--radius-sm) px-3 text-sm text-(--danger) transition-colors hover:bg-(--surface-2)"
                          >
                            <Trash2 className="h-4 w-4" aria-hidden />
                            Delete
                          </button>
                        </div>
                      </PopoverContent>
                    </>
                  )}
                </RowPopover>
              </div>
            </div>
          );
        })}

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
