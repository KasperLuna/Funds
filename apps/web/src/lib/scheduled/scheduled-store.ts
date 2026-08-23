import type { ScheduledTxn } from "@/lib/scheduled/compute";

export type { ScheduledTxn };

export const SCHEDULED_COLS =
  "id,user_id,name,description,type,amount_minor,account_id,category_ids,recurrence,timezone,invoke_date,previous_date,last_notified_at,active,is_template,created_at,updated_at,deleted_at";

export function toScheduledTxn(row: Record<string, unknown>): ScheduledTxn {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    name: String(row.name),
    description: String(row.description ?? ""),
    type: String(row.type) as ScheduledTxn["type"],
    amountMinor: BigInt(row.amount_minor as number | string),
    accountId: String(row.account_id),
    categoryIds: Array.isArray(row.category_ids)
      ? (row.category_ids as string[])
      : [],
    recurrence: row.recurrence as ScheduledTxn["recurrence"],
    timezone: row.timezone as string | null,
    invokeDate: row.invoke_date != null ? Number(row.invoke_date) : null,
    previousDate: row.previous_date != null ? Number(row.previous_date) : null,
    lastNotifiedAt: row.last_notified_at != null ? Number(row.last_notified_at) : null,
    active: Boolean(row.active),
    createdAt: Number(row.created_at),
    updatedAt: Number(row.updated_at),
    deletedAt: row.deleted_at != null ? Number(row.deleted_at) : null,
  };
}

export function upsertScheduledSql(s: ScheduledTxn): {
  sql: string;
  params: unknown[];
} {
  const cols = SCHEDULED_COLS.split(",");
  const placeholders = cols.map(() => "?").join(", ");
  const conflictSet = cols
    .filter((c) => c !== "id")
    .map((c) => `${c} = excluded.${c}`)
    .join(", ");
  const params = [
    s.id,
    s.userId,
    s.name,
    s.description,
    s.type,
    // cavetail: display-only formatting, not arithmetic
    // eslint-disable-next-line local/no-money-float
    Number(s.amountMinor),
    s.accountId,
    JSON.stringify(s.categoryIds),
    s.recurrence ? JSON.stringify(s.recurrence) : null,
    s.timezone,
    s.invokeDate ?? null,
    s.previousDate ?? null,
    s.lastNotifiedAt ?? null,
    s.active,
    false, // is_template
    s.createdAt,
    s.updatedAt,
    s.deletedAt ?? null,
  ];
  return {
    sql: `INSERT INTO scheduled_transactions (${cols.join(", ")}) VALUES (${placeholders}) ON CONFLICT (id) DO UPDATE SET ${conflictSet}`,
    params,
  };
}
