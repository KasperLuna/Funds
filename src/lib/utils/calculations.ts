import type { Bank, Transaction, DateRange } from "@/lib/types";

/**
 * Calculate total spending for a category within a date range.
 * Only counts expense and withdrawal transactions.
 */
export function calculateCategorySpending(
  transactions: Transaction[],
  categoryId: string,
  dateRange: DateRange,
): number {
  return transactions
    .filter((tx) => {
      const txDate = new Date(tx.date);
      return (
        tx.categories.includes(categoryId) &&
        (tx.type === "expense" || tx.type === "withdrawal") &&
        txDate >= dateRange.start &&
        txDate <= dateRange.end
      );
    })
    .reduce((sum, tx) => sum + tx.amount, 0);
}

/**
 * Calculate remaining budget. Never returns a negative value.
 */
export function calculateBudgetRemaining(budget: number, spending: number): number {
  return Math.max(0, budget - spending);
}

/**
 * Get the start and end of the month for a given date, respecting timezone offset.
 * @param date - The reference date
 * @param timezoneOffset - Timezone offset in minutes (e.g., new Date().getTimezoneOffset()).
 *   Positive values are west of UTC, negative are east (same convention as Date.getTimezoneOffset()).
 *   If omitted, uses the local timezone.
 * @returns DateRange with start (first ms of month) and end (last ms of month) in the given timezone.
 */
export function getMonthBoundaries(date: Date, timezoneOffset?: number): DateRange {
  const offset = timezoneOffset ?? date.getTimezoneOffset();

  // Adjust the date to the target timezone to find the correct local year/month
  const localTime = new Date(date.getTime() - offset * 60 * 1000);
  const year = localTime.getUTCFullYear();
  const month = localTime.getUTCMonth();

  // Start of month in the target timezone, converted back to UTC
  const startUTC = Date.UTC(year, month, 1);
  const start = new Date(startUTC + offset * 60 * 1000);

  // Start of next month in the target timezone, then subtract 1ms for end
  const endUTC = Date.UTC(year, month + 1, 1);
  const end = new Date(endUTC + offset * 60 * 1000 - 1);

  return { start, end };
}

/**
 * Calculate total balance across all banks.
 */
export function calculateTotalBalance(banks: Pick<Bank, "balance">[]): number {
  return banks.reduce((sum, bank) => sum + bank.balance, 0);
}
