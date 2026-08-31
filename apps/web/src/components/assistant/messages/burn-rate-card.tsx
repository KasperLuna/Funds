"use client";

import { TrendingDown, TrendingUp } from "lucide-react";
import { formatMoney } from "@/lib/money";
import { usePrivacyStore } from "@/lib/privacy/privacy-store";
import { GenUiFooter } from "../gen-ui-footer";
import { DataScopeBadge } from "./data-scope-badge";
import type { BurnRatePayload } from "@/lib/assistant/types";
import { cn } from "@/lib/utils";

interface BurnRateCardProps {
  payload: BurnRatePayload;
  onViewData?: () => void;
}

type Verdict = "flat" | "up" | "down";

function verdictFor(vsPrior: number | null): Verdict {
  if (vsPrior === null) return "flat";
  return vsPrior > 0 ? "up" : "down";
}

function verdictText(verdict: Verdict, vsPrior: number | null): string {
  if (verdict === "flat") return "No comparable spend last period";
  const abs = Math.abs(vsPrior ?? 0);
  return verdict === "up"
    ? `On pace to spend ${abs}% more than last month`
    : `On pace to spend ${abs}% less than last month`;
}

function verdictColor(verdict: Verdict): string {
  if (verdict === "flat") return "text-zinc-400";
  if (verdict === "up") return "text-(--danger)";
  return "text-(--accent)";
}

/**
 * "Am I on track this month?" — current pace, projected end-of-period total,
 * and a verdict vs the equivalent prior period.
 */
export const BurnRateCard = ({ payload, onViewData }: BurnRateCardProps) => {
  const masked = usePrivacyStore((s) => s.masked);
  const current = BigInt(payload.currentMinor);
  const projected = BigInt(payload.projectedMinor);
  const prior = BigInt(payload.priorMonthMinor);
  const daily = BigInt(payload.dailyAverageMinor);
  const verdict = verdictFor(payload.vsPriorPct);
  const Arrow = verdict === "up" ? TrendingUp : TrendingDown;

  const daysLeft = Math.max(0, payload.daysInPeriod - payload.daysElapsed);
  const pctElapsed = Math.min(
    100,
    Math.round((payload.daysElapsed / Math.max(1, payload.daysInPeriod)) * 100),
  );

  return (
    <section
      aria-label="Burn rate"
      className="rounded-(--radius-lg) border border-(--border) bg-(--surface-1) p-4"
    >
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="text-sm font-semibold text-zinc-300">Burn rate</h3>
        <DataScopeBadge scope={payload.scope} />
      </div>
      <p className="text-xs text-zinc-500">{payload.periodLabel}</p>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <div className="rounded-(--radius-md) bg-(--surface-2) p-2">
          <p className="text-[10px] uppercase tracking-wide text-zinc-500">Spent so far</p>
          <p className="mt-0.5 text-sm font-semibold tabular-nums">
            {masked ? "••••" : formatMoney(current, payload.decimals, payload.assetCode)}
          </p>
          <p className="text-[10px] text-zinc-500">day {payload.daysElapsed} of {payload.daysInPeriod}</p>
        </div>
        <div className="rounded-(--radius-md) bg-(--surface-2) p-2">
          <p className="text-[10px] uppercase tracking-wide text-zinc-500">Projected</p>
          <p className="mt-0.5 text-sm font-semibold tabular-nums">
            {masked ? "••••" : formatMoney(projected, payload.decimals, payload.assetCode)}
          </p>
          <p className="text-[10px] text-zinc-500">
            {masked
              ? "••••"
              : `${formatMoney(daily, payload.decimals, payload.assetCode)} / day`}
          </p>
        </div>
      </div>

      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pctElapsed}
        aria-label="Period elapsed"
        className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-(--surface-3)"
      >
        <div
          className="h-full rounded-full bg-(--accent)"
          style={{ width: `${pctElapsed}%` }}
        />
      </div>
      <p className="mt-1 text-[10px] text-zinc-500">{daysLeft} days left in period</p>

      <p className={cn("mt-2 inline-flex items-center gap-1 text-xs font-medium", verdictColor(verdict))}>
        {verdict !== "flat" && <Arrow className="h-3 w-3" aria-hidden />}
        {verdictText(verdict, payload.vsPriorPct)}
        {verdict !== "flat" && !masked && (
          <span className="ml-1 text-zinc-500">
            (prior {formatMoney(prior, payload.decimals, payload.assetCode)})
          </span>
        )}
      </p>

      <GenUiFooter updatedAt={Date.now()} onViewData={onViewData} />
    </section>
  );
};
