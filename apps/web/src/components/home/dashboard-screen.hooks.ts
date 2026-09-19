"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSync } from "@/lib/sync/sync-context";
import { queryKeys, useSyncMutation } from "@/lib/sync/sync-query";
import type { VoicePrefill } from "@/components/capture/capture-sheet";
import type { Txn } from "@/lib/accounts/accounts-store";
import type { Category } from "@/lib/categories/categories-store";
import { useVoicePrefillStore } from "@/lib/voice/voice-store";

export interface CaptureSheetTriggers {
  captureOpen: boolean;
  editTxn: Txn | null;
  typePrefill: VoicePrefill | undefined;
  sheetOpen: boolean;
  voicePrefillValue: VoicePrefill | undefined;
  handleSave: (row: Record<string, unknown>) => void;
  handleCreateCategory: (c: Category) => void;
  handleClose: () => void;
}

export function useCaptureSheetTriggers(uid: string): CaptureSheetTriggers {
  const searchParams = useSearchParams();
  const router = useRouter();
  const captureOpen = searchParams.get("capture") === "1";
  const typeParam = searchParams.get("type");
  const { db } = useSync();
  const [, startTransition] = useTransition();
  const assistantPrefill = useVoicePrefillStore((s) => s.prefill);
  const setAssistantPrefill = useVoicePrefillStore((s) => s.setPrefill);
  const [editTxn, setEditTxn] = useState<Txn | null>(null);

  const saveTxn = useSyncMutation({
    keys: [queryKeys.transactions],
    mutationFn: async (row: Record<string, unknown>) => {
      const next = editTxn ? { ...row, id: editTxn.id } : row;
      await db.table("transactions").upsert(next);
      setEditTxn(null);
    },
  });

  const handleSave = (row: Record<string, unknown>) => {
    saveTxn.mutate(row);
  };

  const createCategoryMutation = useSyncMutation({
    keys: [queryKeys.categories],
    mutationFn: async (c: Category) => {
      await db.table("categories").upsert({
        id: c.id,
        user_id: uid,
        name: c.name,
        color: c.color,
        hideable: c.hideable ? 1 : 0,
        exclude_from_analytics: c.excludeFromAnalytics ? 1 : 0,
        monthly_budget_minor:
          c.monthlyBudgetMinor != null ? Number(c.monthlyBudgetMinor) : null,
        asset_id: c.assetId ?? null,
        created_at: c.createdAt,
        updated_at: c.updatedAt,
        deleted_at: c.deletedAt ?? null,
      });
    },
  });
  const handleCreateCategory = (c: Category) => createCategoryMutation.mutate(c);

  const typePrefill: VoicePrefill | undefined =
    typeParam === "income" || typeParam === "expense"
      ? { accountId: null, amountInput: null, categoryIds: [], description: "", type: typeParam }
      : undefined;

  const sheetOpen = captureOpen || !!editTxn || !!assistantPrefill;
  const voicePrefillValue = typePrefill ?? assistantPrefill;
  const handleClose = () => {
    startTransition(() => {
      setAssistantPrefill(undefined);
      setEditTxn(null);
      router.replace("/dashboard", { scroll: false });
    });
  };

  return {
    captureOpen,
    editTxn,
    typePrefill,
    sheetOpen,
    voicePrefillValue,
    handleSave,
    handleCreateCategory,
    handleClose,
  };
}
