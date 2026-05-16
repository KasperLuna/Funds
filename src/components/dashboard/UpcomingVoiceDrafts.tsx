"use client";

import React, { memo, useState } from "react";
import { MixedDialog } from "../banks/MixedDialog";
import { Transaction } from "@/lib/types";
import { useBanksQuery } from "@/lib/hooks/useBanksQuery";
import { useCategoriesQuery } from "@/lib/hooks/useCategoriesQuery";
import {
  useVoiceDraftsQuery,
  VoiceDraft,
} from "@/lib/hooks/useVoiceDraftsQuery";
import { useAuth } from "@/lib/hooks/useAuth";
import { TransactionCardLoader } from "@/components/banks/transactions/TransactionCardLoader";
import { Mic, X } from "lucide-react";

function draftToPrefill(
  draft: VoiceDraft,
  banks: any[],
  categories: any[],
  userId: string,
): Transaction {
  const preview = draft.preview || {};

  const accountName: string | undefined = preview.account;
  let bankId = "";
  if (accountName && banks.length) {
    const anorm = accountName.toLowerCase();
    const found =
      banks.find((b) => (b.name || "").toLowerCase() === anorm) ??
      banks.find((b) => (b.name || "").toLowerCase().includes(anorm));
    bankId = found?.id || "";
  }

  const categoryNames: string[] = preview.categories?.length
    ? preview.categories
    : preview.category
      ? [preview.category]
      : [];
  const categoryIds: string[] = [];
  if (categoryNames.length && categories.length) {
    for (const name of categoryNames) {
      const cnorm = name.toLowerCase();
      const found =
        categories.find((c) => (c.name || "").toLowerCase() === cnorm) ??
        categories.find((c) => (c.name || "").toLowerCase().includes(cnorm));
      if (found && !categoryIds.includes(found.id)) categoryIds.push(found.id);
    }
  }

  return {
    user: userId,
    description: `(🎙️)${preview.description || preview.rawText || ""}`.trim(),
    type: "expense",
    amount: preview.amount || 0,
    bank: bankId,
    categories: categoryIds,
    date: new Date().toISOString(),
  };
}

function VoiceDraftCard({
  draft,
  prefill,
  onDismiss,
}: {
  draft: VoiceDraft;
  prefill: Transaction;
  onDismiss: () => void;
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="group relative flex-grow h-full text-slate-200 border-2 border-emerald-600/40 hover:border-emerald-500/60 rounded-xl bg-gradient-to-br from-slate-800/70 to-slate-700/50 hover:shadow-lg hover:shadow-slate-900/50 overflow-hidden transition-all duration-300">
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDismiss();
        }}
        className="absolute top-1.5 right-1.5 z-20 p-1 rounded-md bg-slate-700/80 hover:bg-red-800/60 border border-slate-600/50 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity duration-200"
        title="Dismiss draft"
        aria-label="Dismiss draft"
      >
        <X className="w-3.5 h-3.5 text-slate-300" />
      </button>

      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="relative z-10 flex flex-col gap-2 p-2 cursor-pointer w-full text-left"
      >
        <div className="flex flex-row w-full items-center justify-between gap-2 min-w-0">
          <div className="flex flex-col text-start min-w-0 flex-shrink">
            <div className="flex flex-row items-center gap-1.5">
              <Mic className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <p className="text-xs text-emerald-400 font-medium">
                {draft.source === "shortcut" ? "Shortcut" : "Voice"}
              </p>
            </div>
            <div className="h-px bg-slate-600/60 my-1" />
            <p className="text-xs text-slate-300 truncate max-w-[140px]">
              {prefill.description.replace(/^\(🎙️\)/, "").trim() ||
                "Voice draft"}
            </p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-sm font-semibold text-slate-100">
              {prefill.amount > 0 ? `-${prefill.amount}` : "—"}
            </p>
          </div>
        </div>
      </button>

      <MixedDialog
        isModalOpen={isOpen}
        setIsModalOpen={(open) => {
          setIsOpen(open);
          if (!open) onDismiss();
        }}
        transaction={prefill}
      />
    </div>
  );
}

export const UpcomingVoiceDrafts = memo(function UpcomingVoiceDrafts() {
  const {
    drafts,
    loading: draftsLoading,
    dismissDraft,
  } = useVoiceDraftsQuery();
  const bankData = useBanksQuery();
  const categoryData = useCategoriesQuery();
  const { user } = useAuth();

  const banks = bankData?.banks || [];
  const categories = categoryData?.categories || [];
  const userId = user?.id || "";

  if (!drafts.length) return null;

  return (
    <div className="relative mb-3 border-b border-slate-700/50 pb-3">
      <div className="flex items-center gap-1.5 mb-2">
        <Mic className="w-3.5 h-3.5 text-emerald-400" />
        <span className="text-xs font-medium text-slate-400">Voice drafts</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
        {drafts.map((draft) => {
          const prefill = draftToPrefill(draft, banks, categories, userId);
          return (
            <VoiceDraftCard
              key={draft.id}
              draft={draft}
              prefill={prefill}
              onDismiss={() => dismissDraft(draft.id)}
            />
          );
        })}
      </div>
    </div>
  );
});
