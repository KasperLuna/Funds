/**
 * Pure scheduled-transaction computations (logic.md §8).
 * Timezones here are IANA names (stored on scheduled_transactions.timezone,
 * fallback users.timezone, fallback UTC). Recurrence advancement reuses
 * @funds/core recurrence (tz-agnostic pure date math).
 */
import { advanceWaive } from "@funds/core";

export type Frequency = "daily" | "weekly" | "monthly" | "yearly";

export type ScheduledTxn = {
  id: string;
  userId: string;
  name: string;
  description: string;
  type: "income" | "expense";
  amountMinor: bigint;
  accountId: string;
  categoryIds: string[];
  recurrence: { frequency: Frequency; interval: number } | null;
  timezone: string | null; // IANA
  invokeDate: number | null; // epoch ms
  previousDate: number | null; // epoch ms
  lastNotifiedAt: number | null; // epoch ms
  active: boolean;
  createdAt: number;
  updatedAt: number;
  deletedAt?: number | null;
};

export const DEFAULT_TZ = "UTC";

const localDateFormatters = new Map<string, Intl.DateTimeFormat>();

function localDateStr(ts: number, tz: string): string {
  let fmt = localDateFormatters.get(tz);
  if (!fmt) {
    try {
      fmt = new Intl.DateTimeFormat("en-CA", {
        timeZone: tz,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      });
    } catch {
      fmt = new Intl.DateTimeFormat("en-CA", {
        timeZone: DEFAULT_TZ,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      });
    }
    localDateFormatters.set(tz, fmt);
  }
  return fmt.format(new Date(ts));
}

function tzOf(row: ScheduledTxn): string {
  return row.timezone || DEFAULT_TZ;
}

/**
 * Rows needing action now: active, invokeDate reached (instant passed),
 * local invoke date <= local today, and not already logged this cycle.
 */
export function dueTodaySet(rows: ScheduledTxn[], now: Date): ScheduledTxn[] {
  return rows.filter((row) => {
    if (!row.active || row.deletedAt) return false;
    if (row.invokeDate == null) return false;
    const tz = tzOf(row);
    const todayStr = localDateStr(now.getTime(), tz);
    const invokeStr = localDateStr(row.invokeDate, tz);
    if (invokeStr > todayStr) return false;
    if (row.invokeDate > now.getTime()) return false;
    if (row.previousDate != null) {
      const prevStr = localDateStr(row.previousDate, tz);
      if (prevStr >= todayStr) return false;
    }
    return true;
  });
}

export type OccurrenceStatus = "due" | "overdue" | "upcoming" | "none";

export function nextOccurrence(
  row: ScheduledTxn,
  now: Date,
): {
  status: OccurrenceStatus;
  localDate: string | null;
} {
  if (!row.invokeDate) return { status: "none", localDate: null };
  const tz = tzOf(row);
  const todayStr = localDateStr(now.getTime(), tz);
  const invokeStr = localDateStr(row.invokeDate, tz);
  const loggedThisCycle =
    row.previousDate != null &&
    localDateStr(row.previousDate, tz) >= todayStr &&
    invokeStr <= todayStr;
  if (loggedThisCycle) return { status: "upcoming", localDate: invokeStr };
  if (invokeStr < todayStr) return { status: "overdue", localDate: invokeStr };
  if (invokeStr === todayStr) {
    return {
      status: row.invokeDate <= now.getTime() ? "due" : "upcoming",
      localDate: invokeStr,
    };
  }
  return { status: "upcoming", localDate: invokeStr };
}

/**
 * Days until the next occurrence; negative when due/overdue. Null when the
 * schedule has no invoke date.
 */
export function daysUntil(localDate: string | null, now: Date): number | null {
  if (!localDate) return null;
  const [y, m, d] = localDate.split("-").map(Number);
  if (!y || !m || !d) return null;
  const target = new Date(y, m - 1, d);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((target.getTime() - today.getTime()) / 86_400_000);
}

/** Default glance surface: show only items coming up within this many days. */
export const SOON_WINDOW_DAYS = 3;

export type ScheduledOccurrence = {
  row: ScheduledTxn;
  occ: { status: OccurrenceStatus; localDate: string | null };
};

/**
 * Split schedules into the "soon" glance set (active + within the window,
 * nearest first) and everything else, so a card can surface what needs
 * attention now and tuck the rest behind an expander.
 */
export function partitionSchedules(
  rows: ScheduledTxn[],
  now: Date,
  windowDays: number = SOON_WINDOW_DAYS,
): { soon: ScheduledOccurrence[]; rest: ScheduledOccurrence[] } {
  const upcoming = rows
    .map((row) => ({ row, occ: nextOccurrence(row, now) }))
    .sort((a, b) => {
      const da = daysUntil(a.occ.localDate, now) ?? 365;
      const db = daysUntil(b.occ.localDate, now) ?? 365;
      return da - db;
    });
  const soon = upcoming.filter(
    ({ row, occ }) =>
      row.active && (daysUntil(occ.localDate, now) ?? 365) <= windowDays,
  );
  const rest = upcoming.filter(({ row, occ }) => {
    if (!row.active) return true;
    return (daysUntil(occ.localDate, now) ?? 365) > windowDays;
  });
  return { soon, rest };
}

/**
 * Waive = advance the schedule without creating a transaction (logic.md §8.3).
 * Returns patched invoke/previous dates; caller persists.
 */
export function waiveAdvance(
  row: ScheduledTxn,
): { previousDate: number; invokeDate: number } {
  if (row.invokeDate == null || !row.recurrence) {
    throw new Error("Cannot advance schedule with no invokeDate/recurrence");
  }
  const { previousDate, invokeDate } = advanceWaive({
    frequency: row.recurrence.frequency,
    interval: row.recurrence.interval,
    invokeDate: new Date(row.invokeDate),
    previousDate: row.previousDate != null ? new Date(row.previousDate) : null,
  });
  return {
    previousDate: previousDate.getTime(),
    invokeDate: invokeDate.getTime(),
  };
}

/**
 * Reminder eligibility (logic.md §8.4): invoke local date == today,
 * due instant reached, not logged this cycle, and either never notified
 * or last notification >= 3h ago.
 */
export const RENOTIFY_AFTER_MS = 3 * 3600_000;

export function shouldNotify(row: ScheduledTxn, now: Date): boolean {
  if (!row.active || row.deletedAt) return false;
  if (row.invokeDate == null) return false;
  const tz = tzOf(row);
  const todayStr = localDateStr(now.getTime(), tz);
  const invokeStr = localDateStr(row.invokeDate, tz);
  if (invokeStr !== todayStr) return false;
  if (row.invokeDate > now.getTime()) return false;
  if (row.previousDate != null) {
    if (localDateStr(row.previousDate, tz) >= todayStr) return false;
  }
  if (row.lastNotifiedAt != null) {
    if (now.getTime() - row.lastNotifiedAt < RENOTIFY_AFTER_MS) return false;
  }
  return true;
}
