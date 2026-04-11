/**
 * Format a number with commas as thousands separators and fixed decimal places.
 */
export function formatNumber(value: number, decimals = 2): string {
  const parts = value.toFixed(decimals).split(".");
  const intPart = parts[0]!;
  const isNegative = intPart.startsWith("-");
  const digits = isNegative ? intPart.slice(1) : intPart;
  const withCommas = digits.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const formatted = parts[1] ? `${withCommas}.${parts[1]}` : withCommas;
  return isNegative ? `-${formatted}` : formatted;
}

/**
 * Format a currency value with symbol and commas.
 */
export function formatCurrency(value: number, symbol = "$", decimals = 2): string {
  const isNegative = value < 0;
  const formatted = formatNumber(Math.abs(value), decimals);
  return isNegative ? `-${symbol}${formatted}` : `${symbol}${formatted}`;
}
