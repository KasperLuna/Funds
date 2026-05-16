"use client";

import { useQueryParams } from "@/lib/hooks/useQueryParams";
import { MixedDialog } from "@/components/banks/MixedDialog";
import { Transaction } from "@/lib/types";
import { useBanksQuery } from "@/lib/hooks/useBanksQuery";
import { useCategoriesQuery } from "@/lib/hooks/useCategoriesQuery";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/hooks/useAuth";

export function VoiceDraftPrefillHandler() {
  const { queryParams, setQueryParams } = useQueryParams();
  const token = queryParams.voiceDraft;
  const bankData = useBanksQuery();
  const categoryData = useCategoriesQuery();
  const { user } = useAuth();
  const { data: draftBody, isLoading: draftLoading } = useQuery<{
    draft?: any;
  }>({
    queryKey: ["voiceDraft", token],
    queryFn: async ({ queryKey, signal }: any) => {
      const [, t] = queryKey as [string, string | undefined];
      if (!t) throw new Error("No token");
      const res = await fetch(
        `/api/voice-draft?token=${encodeURIComponent(t)}`,
        {
          signal,
        },
      );
      if (!res.ok) throw new Error("Failed to fetch draft");
      return res.json();
    },
    enabled: !!token,
    retry: false,
  });

  const prefill = useMemo(() => {
    const draft = draftBody?.draft;
    if (!draft) return undefined;
    const preview = draft.preview || {};

    const accountName: string | undefined = preview.account;
    let bankId = "";
    if (accountName && bankData?.banks?.length) {
      const anorm = accountName.toLowerCase();
      const found =
        bankData.banks.find((b) => {
          const bn = (b.name || "").toLowerCase();
          return bn === anorm;
        }) ??
        bankData.banks.find((b) => {
          const bn = (b.name || "").toLowerCase();
          return bn.includes(anorm);
        });
      bankId = found?.id || "";
    }

    // Support both new multi-category array and legacy single category
    const categoryNames: string[] = preview.categories?.length
      ? preview.categories
      : preview.category
        ? [preview.category]
        : [];
    const categoryIds: string[] = [];
    if (categoryNames.length && categoryData?.categories?.length) {
      for (const categoryName of categoryNames) {
        const cnorm = categoryName.toLowerCase();
        const found =
          categoryData.categories.find((c) => {
            const cn = (c.name || "").toLowerCase();
            return cn === cnorm;
          }) ??
          categoryData.categories.find((c) => {
            const cn = (c.name || "").toLowerCase();
            return cn.includes(cnorm);
          });
        if (found && !categoryIds.includes(found.id))
          categoryIds.push(found.id);
      }
    }

    const txn: Transaction = {
      user: user?.id || "",
      description: `(🎙️)${preview.description || preview.rawText}`.trim(),
      type: "expense",
      amount: preview.amount || 0,
      bank: bankId,
      categories: categoryIds,
      date: new Date().toISOString(),
    };

    return txn;
  }, [
    draftBody,
    bankData?.banks?.length,
    categoryData?.categories?.length,
    user?.id,
  ]);

  if (!queryParams.voiceDraft) return null;

  if (bankData?.loading || categoryData?.loading) return null;
  return (
    <MixedDialog
      isModalOpen={!!prefill}
      setIsModalOpen={(open) => {
        if (!open && queryParams.voiceDraft) {
          setQueryParams({ voiceDraft: undefined });
        }
      }}
      transaction={prefill}
    />
  );
}
