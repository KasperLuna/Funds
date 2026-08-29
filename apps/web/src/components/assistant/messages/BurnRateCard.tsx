"use client";

import { TrendingDown, TrendingUp } from "lucide-react";
import { formatMoney } from "@/lib/money";
import { usePrivacy } from "@/lib/privacy/privacy-context";
import { GenUiFooter } from "../GenUiFooter";
import { DataScopeBadge } from "./DataScopeBadge";
import type { BurnRatePayload } from "@/lib/assistant/types";

/**
 * "Am I on track this month?" — current pace, projected end-of-period total,
 * and a verdict vs the equivalent prior period.
 */
export function BurnRateCard({
  payload,
  onViewData,
}: {
  payload: BurnRatePayload;
  onViewData?: () => void;
}) {
  const { masked } = usePrivacy();
  const current = BigInt(payload.currentMinor);
  const projected = BigInt(payload.projectedMinor);
  const prior = BigInt(payload.priorMonthMinor);
  const daily = BigInt(payload.dailyAverageMinor);
  const vsPrior = payload.vsPriorPct;
  const flat = vsPrior === null;

  const upPace = !flat && vsPrior > 0;
  const color = flat
    ? "text-zinc-400"
    : upPace
    ? "text-(--danger)"
    : "text-(--accent)";
  const Arrow = upPace ? TrendingUp : TrendingDown;

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

      <p className={`mt-2 inline-flex items-center gap-1 text-xs font-medium ${color}`}>
        {!flat && <Arrow className="h-3 w-3" aria-hidden />}
        {flat
          ? "No comparable spend last period"
          : upPace
          ? `On pace to spend ${Math.abs(vsPrior)}% more than last month`
          : `On pace to spend ${Math.abs(vsPrior)}% less than last month`}
        {!flat && !masked && (
          <span className="ml-1 text-zinc-500">
            (prior {formatMoney(prior, payload.decimals, payload.assetCode)})
          </span>
        )}
      </p>

      <GenUiFooter updatedAt={Date.now()} onViewData={onViewData} />
    </section>
  );
}
