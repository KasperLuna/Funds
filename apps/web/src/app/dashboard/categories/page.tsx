"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, Pencil, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSync } from "@/lib/sync/sync-context";
import {
  DEFAULT_CATEGORY_COLORS,
  type Category,
} from "@/lib/categories/categories-store";

const CATEGORY_COLS = "id,name,color,hideable,monthly_budget_minor,created_at,updated_at,deleted_at";

function toCategory(row: Record<string, unknown>): Category {
  return {
    id: String(row.id),
    name: String(row.name),
    color: String(row.color),
    hideable: Boolean(row.hideable),
    monthlyBudgetMinor: row.monthly_budget_minor != null ? BigInt(row.monthly_budget_minor as number | string) : null,
    createdAt: Number(row.created_at),
    updatedAt: Number(row.updated_at),
    deletedAt: row.deleted_at != null ? Number(row.deleted_at) : null,
  };
}

function upsertCategorySql(c: Category): { sql: string; params: unknown[] } {
  const cols = CATEGORY_COLS.split(",");
  const placeholders = cols.map(() => "?").join(", ");
  const conflictSet = cols
    .filter((col) => col !== "id")
    .map((col) => `${col} = excluded.${col}`)
    .join(", ");
  const params = [
    c.id,
    c.name,
    c.color,
    c.hideable ? 1 : 0,
    c.monthlyBudgetMinor != null ? Number(c.monthlyBudgetMinor) : null,
    c.createdAt,
    c.updatedAt,
    c.deletedAt ?? null,
  ];
  return {
    sql: `INSERT INTO categories (${cols.join(", ")}) VALUES (${placeholders}) ON CONFLICT (id) DO UPDATE SET ${conflictSet}`,
    params,
  };
}

export default function CategoriesPage() {
  const { db } = useSync();
  const [categories, setCategories] = useState<Category[]>([]);
  const [editCategory, setEditCategory] = useState<Category | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const reload = useCallback(async () => {
    const res = await db.query(`SELECT * FROM categories WHERE deleted_at IS NULL ORDER BY created_at DESC`);
    setCategories(res.rows.map(toCategory));
  }, [db]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const handleSave = useCallback(
    async (c: Category) => {
      const { sql, params } = upsertCategorySql(c);
      await db.execute(sql, params);
      await reload();
    },
    [db, reload],
  );

  const handleDelete = useCallback(
    async (c: Category) => {
      const tomb = {
        ...c,
        deletedAt: Date.now(),
        updatedAt: Date.now(),
      };
      const { sql, params } = upsertCategorySql(tomb);
      await db.execute(sql, params);
      await reload();
    },
    [db, reload],
  );

  const openNew = useCallback(() => {
    setEditCategory(null);
    setDialogOpen(true);
  }, []);

  const openEdit = useCallback((c: Category) => {
    setEditCategory(c);
    setDialogOpen(true);
  }, []);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4 px-4">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Categories</h1>
        <Button size="sm" onClick={openNew}>
          <Plus className="h-4 w-4" aria-hidden /> New category
        </Button>
      </header>

      {categories.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-10 text-center">
          <p className="text-sm text-slate-400">No categories yet</p>
          <Button size="sm" onClick={openNew}>
            <Plus className="h-4 w-4" aria-hidden /> Add category
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {categories.map((c) => (
            <div
              key={c.id}
              className="flex items-center justify-between rounded-(--radius-lg) border border-(--border) bg-(--surface-1) p-4"
            >
              <div className="flex items-center gap-3">
                <span
                  className="h-4 w-4 rounded-full"
                  style={{ backgroundColor: c.color }}
                  aria-hidden
                />
                <span className="text-sm font-medium">{c.name}</span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  aria-label={`Edit ${c.name}`}
                  onClick={() => openEdit(c)}
                  className="rounded-(--radius-sm) p-1.5 text-slate-400 hover:bg-(--surface-2) hover:text-inherit"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  aria-label={`Delete ${c.name}`}
                  onClick={() => handleDelete(c)}
                  className="rounded-(--radius-sm) p-1.5 text-slate-400 hover:bg-(--surface-2) hover:text-(--danger)"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {dialogOpen && (
        <CategoryDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          onSave={handleSave}
          editCategory={editCategory}
        />
      )}
    </div>
  );
}

function CategoryDialog({
  open,
  onOpenChange,
  onSave,
  editCategory,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (c: Category) => void;
  editCategory: Category | null;
}) {
  const [name, setName] = useState("");
  const [color, setColor] = useState(DEFAULT_CATEGORY_COLORS[0]!);

  useEffect(() => {
    if (open) {
      if (editCategory) {
        setName(editCategory.name);
        setColor(editCategory.color);
      } else {
        setName("");
        setColor(DEFAULT_CATEGORY_COLORS[0]!);
      }
    }
  }, [open, editCategory]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    const now = Date.now();
    if (editCategory) {
      onSave({ ...editCategory, name: trimmed, color, updatedAt: now });
    } else {
      onSave({
        id: `cat-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
        name: trimmed,
        color,
        hideable: false,
        monthlyBudgetMinor: null,
        createdAt: now,
        updatedAt: now,
      });
    }
    onOpenChange(false);
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60">
      <div className="w-full max-w-md rounded-(--radius-lg) border border-(--border) bg-(--surface-1) p-4 shadow-lg">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">
            {editCategory ? "Edit category" : "New category"}
          </h2>
          <button
            type="button"
            aria-label="Close"
            onClick={() => onOpenChange(false)}
            className="rounded-(--radius-sm) p-1.5 text-slate-400 hover:bg-(--surface-2) hover:text-inherit"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-4">
          <label className="flex flex-col gap-1.5">
            <span className="text-sm text-slate-400">Name</span>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Groceries"
              className="h-11 rounded-(--radius-md) border border-(--border) bg-(--surface-2) px-3 text-sm focus-visible:ring-2 focus-visible:ring-(--accent) focus-visible:outline-none"
              autoFocus
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-sm text-slate-400">Color</span>
            <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Color">
              {DEFAULT_CATEGORY_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  role="radio"
                  aria-checked={color === c}
                  aria-label={c}
                  onClick={() => setColor(c)}
                  className={`h-8 w-8 rounded-full transition-transform ${
                    color === c ? "scale-110 ring-2 ring-white" : "hover:scale-105"
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </label>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!name.trim()}>
              {editCategory ? "Save" : "Create"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
