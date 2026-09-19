"use client";

import { Inbox, X } from "lucide-react";
import { assetSymbol } from "@/lib/money";
import { usePrivacyStore } from "@/lib/privacy/privacy-store";
import type { DraftItem } from "@/lib/voice/drafts";

export function formatDraftAmount(preview: DraftItem["preview"]): string | null {
  if (preview.amount === undefined || Number.isNaN(preview.amount)) return null;
  const abs = Math.abs(preview.amount).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 8,
  });
  return `-${assetSymbol(preview.currency)}${abs}`;
}

export function draftAge(createdAt: string, nowMs = Date.now()): string {
  const mins = Math.max(0, Math.floor((nowMs - new Date(createdAt).getTime()) / 60_000));
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export interface DraftInboxCardProps {
  drafts: DraftItem[];
  accounts: { id: string; name: string }[];
  onOpen: (draft: DraftItem) => void;
  onDiscard: (id: string) => void;
}

export const DraftInboxCard = ({ drafts, accounts, onOpen, onDiscard }: DraftInboxCardProps) => {
  const masked = usePrivacyStore((s) => s.masked);
  const nameById = new Map(accounts.map((a) => [a.id, a.name]));

  return (
    <section
      aria-label="Inbox"
      className="rounded-(--radius-lg) border border-(--accent)/40 bg-(--surface-1)"
    >
      <div className="flex items-center gap-2 px-4 pt-4 pb-2">
        <Inbox className="h-4 w-4 text-(--accent)" aria-hidden />
        <h2 className="font-display text-base font-bold tracking-tight">Inbox</h2>
        <span className="text-xs text-zinc-500">
          {drafts.length === 1 ? "1 draft to review" : `${drafts.length} drafts to review`}
        </span>
      </div>
      <div className="divide-y divide-(--border)">
        {drafts.map((draft) => {
          const amount = formatDraftAmount(draft.preview);
          const description =
            draft.preview.description?.trim() || draft.preview.rawText.trim();
          const accountName =
            (draft.accountId ? nameById.get(draft.accountId) : null) ??
            draft.preview.account ??
            "Pick account";
          return (
            <div key={draft.id} className="flex items-center gap-2 px-2 py-1">
              <button
                type="button"
                onClick={() => onOpen(draft)}
                className="flex min-w-0 flex-1 items-center justify-between gap-3 rounded-(--radius-md) px-2 py-2 text-left transition-colors hover:bg-(--surface-3)"
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium">
                    {amount && !masked ? `${amount} ` : masked ? "•••• " : ""}
                    {description}
                  </span>
                  <span className="block truncate text-xs text-zinc-500">
                    {accountName} · {draftAge(draft.createdAt)}
                  </span>
                </span>
              </button>
              <button
                type="button"
                onClick={() => onDiscard(draft.id)}
                aria-label={`Discard draft ${description}`}
                className="shrink-0 rounded-(--radius-md) p-2 text-zinc-500 transition-colors hover:bg-(--surface-3) hover:text-inherit"
              >
                <X className="h-4 w-4" aria-hidden />
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );
};
