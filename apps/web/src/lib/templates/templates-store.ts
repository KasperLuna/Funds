import type { SyncDatabase } from "@/lib/sync/types";

export type Template = {
  id: string;
  name: string;
  type: "income" | "expense";
  amountMinor: bigint;
  description: string;
  accountId: string;
  categoryIds: string[];
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
  };
}

export async function loadTemplates(db: SyncDatabase): Promise<Template[]> {
  const { rows } = await db.query("SELECT * FROM templates WHERE deleted_at IS NULL");
  return rows.map(toTemplate);
}
