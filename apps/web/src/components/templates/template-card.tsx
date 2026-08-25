"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useSync } from "@/lib/sync/sync-context";
import { queryKeys, useSyncMutation } from "@/lib/sync/sync-query";
import { loadTemplates, templateRow, type Template } from "@/lib/templates/templates-store";
import { TemplateDialog } from "@/components/templates/template-dialog";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/money";

export type TemplateCardAccount = {
  id: string;
  name: string;
  decimals: number;
  assetCode?: string;
};

export type TemplateCardCategory = {
  id: string;
  name: string;
};

export function TemplateCard({
  accounts,
  categories,
  onChanged,
}: {
  accounts: TemplateCardAccount[];
  categories: TemplateCardCategory[];
  onChanged?: () => void;
}) {
  const { db, userId, isReady, lastSyncedAt } = useSync();
  const uid = userId ?? "local";
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<Template | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const accountById = useMemo(
    () => new Map(accounts.map((a) => [a.id, a])),
    [accounts],
  );

  const templatesQuery = useQuery({
    queryKey: [queryKeys.templates, lastSyncedAt],
    enabled: isReady,
    queryFn: () => loadTemplates(db),
  });
  const items = templatesQuery.data ?? [];

  useEffect(() => {
    if (!notice) return;
    const t = window.setTimeout(() => setNotice(null), 4000);
    return () => window.clearTimeout(t);
  }, [notice]);

  const saveMutation = useSyncMutation({
    keys: [queryKeys.templates],
    mutationFn: async (item: Template) => {
      await db.table("templates").upsert(templateRow(uid, item));
    },
    onError: () => setNotice("Couldn't save template"),
  });

  const deleteMutation = useSyncMutation({
    keys: [queryKeys.templates],
    mutationFn: async (item: Template) => {
      await db.table("templates").upsert(
        templateRow(uid, { ...item, deletedAt: Date.now(), updatedAt: Date.now() }),
      );
    },
    onError: () => setNotice("Couldn't delete template"),
  });

  const handleSave = useCallback(
    (item: Template) => {
      saveMutation.mutate(item, { onSuccess: () => onChanged?.() });
    },
    [saveMutation, onChanged],
  );

  const handleDelete = useCallback(
    (item: Template) => {
      deleteMutation.mutate(item, { onSuccess: () => onChanged?.() });
    },
    [deleteMutation, onChanged],
  );

  return (
    <section
      aria-label="Templates"
      className="rounded-(--radius-lg) border border-(--border) bg-(--surface-1)"
    >
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <h2 className="font-display text-base font-bold tracking-tight">
          Templates
        </h2>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setEditItem(null);
            setDialogOpen(true);
          }}
        >
          <Plus className="h-4 w-4" aria-hidden />
          Add
        </Button>
      </div>

      {notice && (
        <p className="px-4 pb-2 text-xs text-(--danger)">{notice}</p>
      )}

      <div className="divide-y divide-(--border)">
        {items.length === 0 && (
          <div className="px-4 pb-4">
            <p className="text-sm text-zinc-500">No templates yet</p>
            <p className="text-xs text-zinc-500">Create reusable transaction templates.</p>
          </div>
        )}
        {items.map((row) => {
          const account = accountById.get(row.accountId);
          const decimals = account?.decimals ?? 2;
          return (
            <div
              key={row.id}
              className="flex items-center gap-3 px-4 py-3"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate text-sm font-medium">{row.name}</span>
                  <span className="shrink-0 text-sm font-semibold tabular-nums text-zinc-500">
                    {formatMoney(row.amountMinor, decimals, account?.assetCode)}
                  </span>
                </div>
                <div className="mt-0.5 flex items-center gap-2 text-xs text-zinc-500">
                  <span className={row.type === "expense" ? "text-(--danger)" : "text-(--accent)"}>
                    {row.type === "expense" ? "Expense" : "Income"}
                  </span>
                  <span aria-hidden>·</span>
                  <span className="truncate">
                    {account?.name ?? "Unknown"}
                  </span>
                  {row.description && (
                    <>
                      <span aria-hidden>·</span>
                      <span className="truncate">{row.description}</span>
                    </>
                  )}
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setEditItem(row);
                    setDialogOpen(true);
                  }}
                  aria-label="Edit"
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => void handleDelete(row)}
                  aria-label="Delete"
                >
                  <Trash2 className="h-4 w-4 text-(--danger)" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      <TemplateDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSave={handleSave}
        editTemplate={editItem}
        accounts={accounts}
        categories={categories}
      />
    </section>
  );
}
