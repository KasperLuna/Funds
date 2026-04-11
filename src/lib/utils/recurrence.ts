import type { RecurrenceRule } from "@/lib/types";

/**
 * Calculates the next occurrence date based on a recurrence rule and a previous date.
 *
 * Supports daily, weekly, monthly, and yearly frequencies with configurable intervals.
 * Handles month overflow correctly (e.g., Jan 31 + 1 month = Feb 28/29).
 * The returned date is always strictly after the previousDate.
 *
 * @param recurrenceRule - The recurrence rule defining frequency and optional interval
 * @param previousDate - The previous occurrence date to calculate from
 * @returns The next occurrence Date, always strictly after previousDate
 */
export function calculateNextOccurrence(recurrenceRule: RecurrenceRule, previousDate: Date): Date {
  const interval = recurrenceRule.interval ?? 1;
  const next = new Date(previousDate.getTime());

  switch (recurrenceRule.frequency) {
    case "daily":
      next.setDate(next.getDate() + interval);
      break;

    case "weekly":
      next.setDate(next.getDate() + 7 * interval);
      break;

    case "monthly": {
      const targetDay = previousDate.getDate();
      next.setMonth(next.getMonth() + interval);
      // Handle month overflow: if the day changed (e.g., 31 -> 28),
      // it means the target day doesn't exist in the new month.
      // Roll back to the last day of the intended month.
      if (next.getDate() !== targetDay) {
        next.setDate(0); // Sets to last day of previous month
      }
      break;
    }

    case "yearly": {
      const targetMonth = previousDate.getMonth();
      const targetDayOfMonth = previousDate.getDate();
      next.setFullYear(next.getFullYear() + interval);
      // Handle leap year edge case: Feb 29 -> Feb 28 in non-leap year
      if (next.getMonth() !== targetMonth || next.getDate() !== targetDayOfMonth) {
        next.setMonth(targetMonth + 1, 0); // Last day of target month
      }
      break;
    }
  }

  return next;
}
