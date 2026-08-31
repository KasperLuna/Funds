"use client";

import { ArrowRight, Wallet } from "lucide-react";
import { formatMoney } from "@/lib/money";
import { usePrivacyStore } from "@/lib/privacy/privacy-store";
import { GenUiFooter } from "../gen-ui-footer";
import type { VoiceTxnPrefillPayload } from "@/lib/assistant/types";
import { useVoicePrefillStore } from "@/lib/voice/voice-store";
import { useOptimisticNavigate } from "@/components/app-shell/optimistic-nav";

interface VoiceTxnPrefillCardProps {
  payload: VoiceTxnPrefillPayload;
  onViewData?: () => void;
}

/**
 * Voice-to-transaction prefill card. The "Open capture" button writes the
 * prefill into the existing VoicePrefill context and routes to the capture
 * sheet — same path the deterministic parser uses, so the sheet itself does
 * not know whether the prefill came from the model or the keyword parser.
 */
export const VoiceTxnPrefillCard = ({ payload, onViewData }: VoiceTxnPrefillCardProps) => {
  const navigate = useOptimisticNavigate();
  const masked = usePrivacyStore((s) => s.masked);
  const setPrefill = useVoicePrefillStore((s) => s.setPrefill);
  const amountMinor = payload.amountMinor ? BigInt(payload.amountMinor) : null;
  const conf = Math.round(payload.confidence * 100);

  const amountDisplay =
    amountMinor == null
      ? "—"
      : masked
        ? "••••"
        : formatMoney(amountMinor, 2, payload.currency ?? undefined);

  return (
    <section
      aria-label="Voice transaction prefill"
      className="rounded-(--radius-lg) border border-(--border) bg-(--surface-1) p-4"
    >
      <div className="flex items-baseline justify-between">
        <h3 className="text-sm font-semibold text-zinc-300">New transaction</h3>
        <span className="text-xs text-zinc-500">{conf}% confidence</span>
      </div>
      <p className="mt-1 text-xs text-zinc-500">From your message</p>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <div className="rounded-(--radius-md) bg-(--surface-2) p-2">
          <p className="text-[10px] uppercase tracking-wide text-zinc-500">Amount</p>
          <p className="mt-0.5 text-sm font-semibold">{amountDisplay}</p>
        </div>
        <div className="rounded-(--radius-md) bg-(--surface-2) p-2">
          <p className="text-[10px] uppercase tracking-wide text-zinc-500">Account</p>
          <p className="mt-0.5 inline-flex items-center gap-1 text-sm font-semibold">
            <Wallet className="h-3.5 w-3.5" aria-hidden />
            {payload.accountName ?? "Default"}
          </p>
        </div>
      </div>

      <p className="mt-3 line-clamp-2 text-sm text-zinc-300">{payload.description}</p>

      <button
        type="button"
        onClick={() => {
          setPrefill({
            accountId: payload.accountId,
            amountInput: payload.amountInput,
            categoryIds: payload.categoryIds,
            description: payload.description,
          });
          navigate("/dashboard?capture=1");
        }}
        className="mt-3 inline-flex items-center gap-1 rounded-(--radius-md) bg-(--accent) px-3 py-1.5 text-xs font-semibold text-(--accent-foreground) hover:brightness-110 focus-visible:ring-2 focus-visible:ring-(--accent) focus-visible:outline-none"
      >
        Open capture
        <ArrowRight className="h-3 w-3" aria-hidden />
      </button>

      <GenUiFooter updatedAt={Date.now()} onViewData={onViewData} />
    </section>
  );
};
