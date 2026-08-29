"use client";

import { ArrowDown, ArrowUp } from "lucide-react";
import { formatMoney } from "@/lib/money";
import { usePrivacy } from "@/lib/privacy/privacy-context";
import { GenUiFooter } from "../GenUiFooter";
import { DataScopeBadge } from "./DataScopeBadge";
import type { PeriodComparePayload } from "@/lib/assistant/types";

/**
 * "Did I spend more or less than last period?" Side-by-side totals with a
 * delta verdict. Color-coded arrow for instant read.
 */
export function PeriodCompareCard({
  payload,
  onViewData,
}: {
  payload: PeriodComparePayload;
  onViewData?: () => void;
}) {
  const { masked } = usePrivacy();
  const current = BigInt(payload.currentMinor);
  const prior = BigInt(payload.priorMinor);
  const delta = payload.deltaPct;
  const flat = delta === null;
  const up = !flat && delta > 0;
  const color = flat
    ? "text-zinc-400"
    : up
    ? "text-(--danger)"
    : "text-(--accent)";
  const Arrow = up ? ArrowUp : ArrowDown;

  return (
    <section
      aria-label="Period comparison"
      className="rounded-(--radius-lg) border border-(--border) bg-(--surface-1) p-4"
    >
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="text-sm font-semibold text-zinc-300">
          {payload.category ? `${payload.category} spending` : "Spending"}
        </h3>
        <DataScopeBadge scope={payload.scope} />
      </div>
      <p className="text-xs text-zinc-500">
        {payload.currentLabel} vs {payload.priorLabel}
      </p>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <div className="rounded-(--radius-md) bg-(--surface-2) p-2">
          <p className="text-[10px] uppercase tracking-wide text-zinc-500">{payload.currentLabel}</p>
          <p className="mt-0.5 text-sm font-semibold tabular-nums">
            {masked ? "••••" : formatMoney(current, payload.decimals, payload.assetCode)}
          </p>
        </div>
        <div className="rounded-(--radius-md) bg-(--surface-2) p-2">
          <p className="text-[10px] uppercase tracking-wide text-zinc-500">{payload.priorLabel}</p>
          <p className="mt-0.5 text-sm font-semibold tabular-nums text-zinc-400">
            {masked ? "••••" : formatMoney(prior, payload.decimals, payload.assetCode)}
          </p>
        </div>
      </div>

      <p className={`mt-3 inline-flex items-center gap-1 text-sm font-semibold ${color}`}>
        {!flat && <Arrow className="h-3.5 w-3.5" aria-hidden />}
        {flat
          ? "No comparable spend last period"
          : up
          ? `Up ${Math.abs(delta!)}% vs prior`
          : `Down ${Math.abs(delta!)}% vs prior`}
      </p>

      <GenUiFooter updatedAt={Date.now()} onViewData={onViewData} />
    </section>
  );
}
