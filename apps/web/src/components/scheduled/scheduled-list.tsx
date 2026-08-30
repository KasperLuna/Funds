import { CalendarClock, Pencil, Trash2, Pause, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ScheduledTxn } from "@/lib/scheduled/compute";
import { cn } from "@/lib/utils";

type AccountInfo = { id: string; name: string };

function formatFrequency(freq: string, interval: number): string {
  if (interval === 1) {
    return freq.charAt(0).toUpperCase() + freq.slice(1);
  }
  return `Every ${interval} ${freq}s`;
}

function formatDate(ts: number | null): string {
  if (ts === null) return "—";
  return new Date(ts).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatAmount(minor: bigint, type: "income" | "expense"): string {
  const sign = type === "expense" ? "-" : "";
  const abs = minor < 0n ? -minor : minor;
  return `${sign}$${(Number(abs) / 100).toFixed(2)}`;
}

export interface ScheduledListProps {
  items: ScheduledTxn[];
  accounts: AccountInfo[];
  onToggle: (item: ScheduledTxn) => void;
  onEdit: (item: ScheduledTxn) => void;
  onDelete: (item: ScheduledTxn) => void;
}

export const ScheduledList = ({
  items,
  accounts,
  onToggle,
  onEdit,
  onDelete,
}: ScheduledListProps) => {
  const accountName = Object.fromEntries(accounts.map((a) => [a.id, a.name]));

  if (items.length === 0) {
    return (
      <section
        aria-label="Scheduled transactions"
        className="rounded-(--radius-lg) border border-(--border) bg-(--surface-1) p-6"
      >
        <div className="flex flex-col items-center gap-2 text-center">
          <div className="text-(--accent)" aria-hidden>
            <CalendarClock className="h-8 w-8" />
          </div>
          <h2 className="text-base font-semibold">No scheduled transactions</h2>
          <p className="max-w-md text-sm text-zinc-500">
            Create a scheduled transaction to automate recurring entries.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section
      aria-label="Scheduled transactions"
      className="rounded-(--radius-lg) border border-(--border) bg-(--surface-1)"
    >
      <div className="px-4 pt-4 pb-2">
        <h2 className="text-sm font-semibold">Scheduled transactions</h2>
      </div>
      <div className="divide-y divide-(--border)">
        {items.map((item) => (
          <div
            key={item.id}
            className={cn(
              "flex items-center gap-3 px-4 py-3 transition-opacity",
              item.active ? "" : "opacity-50",
            )}
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="truncate text-sm font-medium">
                  {item.name}
                </span>
                <span
                  className={cn(
                    "shrink-0 rounded-full px-2 py-0.5 text-xs font-medium",
                    item.type === "income"
                      ? "bg-(--accent)/10 text-(--accent)"
                      : "bg-(--danger)/10 text-(--danger)",
                  )}
                >
                  {formatAmount(item.amountMinor, item.type)}
                </span>
              </div>
              <div className="mt-0.5 flex items-center gap-2 text-xs text-zinc-500">
                <span>
                  {item.recurrence
                    ? formatFrequency(item.recurrence.frequency, item.recurrence.interval)
                    : "One-time"}
                </span>
                <span>·</span>
                <span>{accountName[item.accountId] ?? "Unknown"}</span>
                {item.invokeDate && (
                  <>
                    <span>·</span>
                    <span>Next: {formatDate(item.invokeDate)}</span>
                  </>
                )}
                {item.lastNotifiedAt && (
                  <>
                    <span>·</span>
                    <span>Notified: {formatDate(item.lastNotifiedAt)}</span>
                  </>
                )}
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onToggle(item)}
                aria-label={item.active ? "Pause" : "Resume"}
              >
                {item.active ? (
                  <Pause className="h-4 w-4" />
                ) : (
                  <Play className="h-4 w-4" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onEdit(item)}
                aria-label="Edit"
              >
                <Pencil className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onDelete(item)}
                aria-label="Delete"
              >
                <Trash2 className="h-4 w-4 text-(--danger)" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};
