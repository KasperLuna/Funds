"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSync } from "@/lib/sync/sync-context";
import { queryKeys, useSyncMutation } from "@/lib/sync/sync-query";
import type { VoicePrefill } from "@/components/capture/capture-sheet";
import type { Txn, Account } from "@/lib/accounts/accounts-store";
import type { Category } from "@/lib/categories/categories-store";
import { redeemDraft } from "@/lib/voice/redeem";
import { resolvePrefill } from "@/lib/voice/resolve";
import { useVoicePrefillStore } from "@/lib/voice/voice-store";

export interface CaptureSheetTriggers {
  captureOpen: boolean;
  editTxn: Txn | null;
  voicePrefill: VoicePrefill | undefined;
  typePrefill: VoicePrefill | undefined;
  sheetOpen: boolean;
  voicePrefillValue: VoicePrefill | undefined;
  handleSave: (row: Record<string, unknown>) => void;
  handleCreateCategory: (c: Category) => void;
  handleClose: () => void;
}

export function useCaptureSheetTriggers(
  uid: string,
  accounts: Account[],
  categories: Category[],
): CaptureSheetTriggers {
  const searchParams = useSearchParams();
  const router = useRouter();
  const captureOpen = searchParams.get("capture") === "1";
  const typeParam = searchParams.get("type");
  const draftToken = searchParams.get("draftToken");
  const { db } = useSync();
  const [, startTransition] = useTransition();
  const assistantPrefill = useVoicePrefillStore((s) => s.prefill);
  const setAssistantPrefill = useVoicePrefillStore((s) => s.setPrefill);
  const [voicePrefill, setVoicePrefill] = useState<VoicePrefill | undefined>();
  const [editTxn, setEditTxn] = useState<Txn | null>(null);

  // cavetail: redeemDraft mutates server state (consumes the one-shot voice
  // draft token) and rewrites the URL — both live outside React, so this
  // reaction to a search-param change is a real side effect.
  useEffect(() => {
    if (!draftToken) return;
    let cancelled = false;
    (async () => {
      const result = await redeemDraft(draftToken);
      if (cancelled || !result) return;
      const prefillAccounts = accounts.map((a) => ({
        id: a.id,
        name: a.name,
        decimals: 2,
      }));
      const prefillCategories = categories.map((c) => ({
        id: c.id,
        name: c.name,
      }));
      const prefill = resolvePrefill(result.preview, prefillAccounts, prefillCategories);
      setVoicePrefill({
        accountId: prefill.accountId,
        amountInput: prefill.amountInput,
        categoryIds: prefill.categoryIds,
        description: prefill.description,
      });
      // Clean up URL params
      router.replace("/dashboard?capture=1", { scroll: false });
    })();
    return () => { cancelled = true; };
  }, [draftToken, accounts, categories, router]);

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

  const sheetOpen = captureOpen || !!draftToken || !!editTxn || !!assistantPrefill;
  const voicePrefillValue = voicePrefill ?? typePrefill ?? assistantPrefill;
  const handleClose = () => {
    startTransition(() => {
      setVoicePrefill(undefined);
      setAssistantPrefill(undefined);
      setEditTxn(null);
      router.replace("/dashboard", { scroll: false });
    });
  };

  return {
    captureOpen,
    editTxn,
    voicePrefill,
    typePrefill,
    sheetOpen,
    voicePrefillValue,
    handleSave,
    handleCreateCategory,
    handleClose,
  };
}
