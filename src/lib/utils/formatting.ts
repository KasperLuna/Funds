import type { Currency } from "@/lib/types";

/**
 * Format a numeric amount as currency using the user's currency preference.
 * Uses Intl.NumberFormat for locale-aware formatting.
 *
 * @param amount - The numeric amount to format
 * @param currency - Optional Currency object with code, name, symbol. Defaults to USD.
 * @returns Formatted currency string (e.g., "$1,234.56")
 */
export function formatCurrency(amount: number, currency?: Currency): string {
  const code = currency?.code ?? "USD";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: code,
  }).format(amount);
}

/**
 * Format a date in a user-friendly way (e.g., "Jun 15, 2024").
 *
 * @param date - A Date object or ISO date string
 * @returns Formatted date string
 */
export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/**
 * Format a numeric value as a percentage string.
 *
 * @param value - The value to format (e.g., 0.5 for 50%)
 * @param decimals - Number of decimal places (default: 2)
 * @returns Formatted percentage string (e.g., "50.00%")
 */
export function formatPercentage(value: number, decimals = 2): string {
  return `${(value * 100).toFixed(decimals)}%`;
}
