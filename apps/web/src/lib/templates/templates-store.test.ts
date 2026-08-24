import { describe, it, expect } from "vitest";
import { MemorySyncDatabase } from "@/lib/sync/memory-sync";
import { toTemplate, templateRow, loadTemplates } from "./templates-store";

function makeRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: "tpl-1",
    name: "Coffee",
    type: "expense",
    amount_minor: 500,
    description: "Morning coffee",
    account_id: "acc-1",
    category_ids: ["cat-1"],
    created_at: 1000,
    updated_at: 1000,
    deleted_at: null,
    ...overrides,
  };
}

describe("templates-store", () => {
  it("toTemplate parses array and string category_ids", () => {
    const arrayRow = toTemplate(makeRow());
    expect(arrayRow.categoryIds).toEqual(["cat-1"]);

    const stringRow = toTemplate(makeRow({ category_ids: JSON.stringify(["cat-1"]) }));
    expect(stringRow.categoryIds).toEqual(["cat-1"]);
  });

  it("templateRow round-trips through the sync db", async () => {
    const db = new MemorySyncDatabase();
    db.connect();
    const t = toTemplate(makeRow());
    await db.table("templates").upsert(templateRow("user-1", t));
    const loaded = await loadTemplates(db);
    expect(loaded).toHaveLength(1);
    expect(loaded[0]).toMatchObject({
      id: t.id,
      name: t.name,
      type: t.type,
      amountMinor: t.amountMinor,
      description: t.description,
      accountId: t.accountId,
      categoryIds: t.categoryIds,
    });
  });

  it("tombstoned template is excluded from loadTemplates", async () => {
    const db = new MemorySyncDatabase();
    db.connect();
    const t = toTemplate(makeRow());
    await db.table("templates").upsert(templateRow("user-1", t));
    await db
      .table("templates")
      .upsert(templateRow("user-1", { ...t, deletedAt: Date.now(), updatedAt: Date.now() }));
    const loaded = await loadTemplates(db);
    expect(loaded).toHaveLength(0);
  });
});