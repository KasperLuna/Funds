"use client";

import { ArrowDown, ArrowUp } from "lucide-react";
import { formatMoney } from "@/lib/money";
import { usePrivacy } from "@/lib/privacy/privacy-context";
import { GenUiFooter } from "../gen-ui-footer";
import { DataScopeBadge } from "./data-scope-badge";
import type { PeriodComparePayload } from "@/lib/assistant/types";
import { cn } from "@/lib/utils";

interface PeriodCompareCardProps {
  payload: PeriodComparePayload;
  onViewData?: () => void;
}

type Delta = "flat" | "up" | "down";

function deltaFor(deltaPct: number | null): Delta {
  if (deltaPct === null) return "flat";
  return deltaPct > 0 ? "up" : "down";
}

function deltaText(delta: Delta, pct: number | null): string {
  if (delta === "flat") return "No comparable spend last period";
  return delta === "up"
    ? `Up ${Math.abs(pct!)}% vs prior`
    : `Down ${Math.abs(pct!)}% vs prior`;
}

function deltaColor(delta: Delta): string {
  if (delta === "flat") return "text-zinc-400";
  if (delta === "up") return "text-(--danger)";
  return "text-(--accent)";
}

/**
 * "Did I spend more or less than last period?" Side-by-side totals with a
 * delta verdict. Color-coded arrow for instant read.
 */
export const PeriodCompareCard = ({ payload, onViewData }: PeriodCompareCardProps) => {
  const { masked } = usePrivacy();
  const current = BigInt(payload.currentMinor);
  const prior = BigInt(payload.priorMinor);
  const delta = deltaFor(payload.deltaPct);
  const Arrow = delta === "up" ? ArrowUp : ArrowDown;

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

      <p className={cn("mt-3 inline-flex items-center gap-1 text-sm font-semibold", deltaColor(delta))}>
        {delta !== "flat" && <Arrow className="h-3.5 w-3.5" aria-hidden />}
        {deltaText(delta, payload.deltaPct)}
      </p>

      <GenUiFooter updatedAt={Date.now()} onViewData={onViewData} />
    </section>
  );
};
