/**
 * Serialize a camelCase drizzle row to a snake_case plain object for the
 * delta-pull wire format. Money columns become strings (JSON can't carry
 * bigint; numbers lose precision > 2^53), timestamps become epoch ms numbers,
 * jsonb columns pass through as objects.
 */
const MONEY_KEYS = new Set([
  "openingBalanceMinor",
  "monthlyBudgetMinor",
  "amountMinor",
  "valueBaseMinor",
  "priceAtExecutionMinor",
  "feeMinor",
]);

export function serializeRow(
  row: Record<string, unknown>,
  camelToSnake: Record<string, string>
): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const [camelKey, val] of Object.entries(row)) {
    const snakeKey = camelToSnake[camelKey];
    if (!snakeKey) continue;

    if (val == null) {
      result[snakeKey] = val;
    } else if (val instanceof Date) {
      result[snakeKey] = val.getTime();
    } else if (typeof val === "bigint") {
      result[snakeKey] = val.toString();
    } else if (MONEY_KEYS.has(camelKey) && typeof val === "number") {
      result[snakeKey] = val.toString();
    } else {
      result[snakeKey] = val;
    }
  }

  return result;
}
