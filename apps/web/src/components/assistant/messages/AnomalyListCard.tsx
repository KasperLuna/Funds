"use client";

import { AlertTriangle } from "lucide-react";
import { formatMoney } from "@/lib/money";
import { usePrivacy } from "@/lib/privacy/privacy-context";
import { GenUiFooter } from "../GenUiFooter";
import { DataScopeBadge } from "./DataScopeBadge";
import type { AnomalyListPayload } from "@/lib/assistant/types";

/**
 * "Any weird big purchases lately" — transactions that are well above the
 * user's own median for the same merchant. Up to 5 cards with a multiple
 * badge so the user can decide whether each is a one-off or a leak.
 */
export function AnomalyListCard({
  payload,
  onViewData,
}: {
  payload: AnomalyListPayload;
  onViewData?: () => void;
}) {
  const { masked } = usePrivacy();

  return (
    <section
      aria-label="Unusual transactions"
      className="rounded-(--radius-lg) border border-(--border) bg-(--surface-1) p-4"
    >
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="text-sm font-semibold text-zinc-300">Unusual purchases</h3>
        <DataScopeBadge scope={payload.scope} />
      </div>
      <p className="text-xs text-zinc-500">{payload.periodLabel}</p>

      {payload.items.length === 0 ? (
        <p className="mt-3 text-sm text-zinc-400">No outliers in this period.</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {payload.items.map((item, i) => (
            <li
              key={`${item.description}-${item.dateLabel}-${i}`}
              className="flex items-start gap-2 rounded-(--radius-md) bg-(--surface-2) p-2"
            >
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-(--warning)" aria-hidden />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="truncate text-sm text-zinc-200">{item.description}</span>
                  <span className="shrink-0 text-sm font-semibold tabular-nums">
                    {masked
                      ? "••••"
                      : formatMoney(BigInt(item.amountMinor), payload.decimals, payload.assetCode)}
                  </span>
                </div>
                <p className="text-[11px] text-zinc-500">
                  {item.dateLabel} ·{" "}
                  <span className="text-(--warning)">
                    {item.multipleOfMedian.toFixed(1)}× the usual{" "}
                    {masked
                      ? "••••"
                      : formatMoney(BigInt(item.medianMinor), payload.decimals, payload.assetCode)}
                  </span>
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}

      <GenUiFooter updatedAt={Date.now()} onViewData={onViewData} />
    </section>
  );
}
