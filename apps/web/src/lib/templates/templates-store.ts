import type { SyncDatabase } from "@/lib/sync/types";

export type Template = {
  id: string;
  name: string;
  type: "income" | "expense";
  amountMinor: bigint;
  description: string;
  accountId: string;
  categoryIds: string[];
  createdAt: number;
  updatedAt: number;
  deletedAt: number | null;
};

function parseCategoryIds(value: unknown): string[] {
  if (Array.isArray(value)) return value as string[];
  if (typeof value === "string" && value.trim() !== "") {
    try {
      const parsed: unknown = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed as string[];
    } catch {}
  }
  return [];
}

export function toTemplate(row: Record<string, unknown>): Template {
  return {
    id: String(row.id),
    name: String(row.name),
    type: String(row.type) as Template["type"],
    amountMinor: BigInt(row.amount_minor as string | number | bigint),
    description: String(row.description ?? ""),
    accountId: String(row.account_id ?? ""),
    categoryIds: parseCategoryIds(row.category_ids),
    createdAt: Number(row.created_at ?? 0),
    updatedAt: Number(row.updated_at ?? 0),
    deletedAt: row.deleted_at != null ? Number(row.deleted_at) : null,
  };
}

export async function loadTemplates(db: SyncDatabase): Promise<Template[]> {
  const { rows } = await db.query("SELECT * FROM templates WHERE deleted_at IS NULL");
  return rows.map(toTemplate);
}

/** Build a templates row for `db.table("templates").upsert`. */
export function templateRow(uid: string, t: Template): Record<string, unknown> {
  return {
    id: t.id,
    user_id: uid,
    name: t.name,
    type: t.type,
    // cavetail: display-only formatting, not arithmetic
    // eslint-disable-next-line local/no-money-float
    amount_minor: Number(t.amountMinor),
    description: t.description,
    account_id: t.accountId,
    category_ids: t.categoryIds,
    created_at: t.createdAt,
    updated_at: t.updatedAt,
    deleted_at: t.deletedAt ?? null,
  };
}
