"use client";

import { Pause, Pencil, Play, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";
import type { ScheduledTxn, OccurrenceStatus } from "@/lib/scheduled/compute";
import type { ScheduledCardAccount } from "@/components/scheduled/scheduled-card";
import { ScheduledRowPopover } from "@/components/scheduled/scheduled-row-popover";

function formatLocalDate(isoDate: string): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  if (!y || !m || !d) return isoDate;
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

export interface ScheduledRowProps {
  row: ScheduledTxn;
  occ: { status: OccurrenceStatus; localDate: string | null };
  account: ScheduledCardAccount | undefined;
  onLogOccurrence: (row: ScheduledTxn) => void;
  onToggle: (row: ScheduledTxn) => void;
  onEdit: (row: ScheduledTxn) => void;
  onDelete: (row: ScheduledTxn) => void;
}

export const ScheduledRow = ({
  row,
  occ,
  account,
  onLogOccurrence,
  onToggle,
  onEdit,
  onDelete,
}: ScheduledRowProps) => {
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

  const body = (
    <>
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

      <div className="flex shrink-0 items-center gap-1.5">
        <span className="whitespace-nowrap text-sm font-semibold tabular-nums text-zinc-500">
          {formatMoney(row.amountMinor, decimals, code)}
        </span>
        {occ.status !== "none" && (
          <span
            className={cn("shrink-0 rounded-full px-2 py-0.5 text-xs font-medium", chip.cls)}
          >
            {chip.label}
          </span>
        )}
      </div>
    </>
  );

  return (
    <div
      className={cn("flex items-center transition-opacity", row.active ? "" : "opacity-50")}
    >
      {needsConfirm ? (
        <button
          type="button"
          onClick={() => onLogOccurrence(row)}
          aria-label={`Log occurrence: ${row.name}`}
          className="flex min-w-0 flex-1 items-center gap-x-3 gap-y-2 px-4 py-3 text-left transition-colors hover:bg-(--surface-2) focus-visible:ring-2 focus-visible:ring-(--accent) focus-visible:outline-none"
        >
          {body}
        </button>
      ) : (
        <div className="flex min-w-0 flex-1 items-center gap-x-3 gap-y-2 px-4 py-3">
          {body}
        </div>
      )}

      <div className="flex shrink-0 items-center gap-1 pr-4">
        {/* Desktop: inline actions. Mobile: a kebab menu keeps rows clean. */}
        <div className="hidden items-center gap-1 sm:flex">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onToggle(row)}
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
            onClick={() => onEdit(row)}
            aria-label="Edit"
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDelete(row)}
            aria-label="Delete"
          >
            <Trash2 className="h-4 w-4 text-(--danger)" />
          </Button>
        </div>

        <ScheduledRowPopover
          row={row}
          onToggle={onToggle}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      </div>
    </div>
  );
};
