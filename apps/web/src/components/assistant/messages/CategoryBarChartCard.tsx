"use client";

import { AreaChart, BarChart } from "@/components/charts";
import { formatMoney } from "@/lib/money";
import { usePrivacy } from "@/lib/privacy/privacy-context";
import { GenUiFooter } from "../GenUiFooter";
import { DataScopeBadge } from "./DataScopeBadge";
import type { SpendingBreakdownPayload } from "@/lib/assistant/types";

/**
 * Spending breakdown. Two stacked charts in one view:
 *  - top: a 24px daily-trend area chart (when "when" the spend happened)
 *  - bottom: the bar chart of where the money went by category
 * Below the charts: the period total and a one-line "biggest single charge"
 * so the user has the headline number, the daily cadence, the distribution,
 * and the largest single transaction — all on a single screen.
 *
 * The previous 2-column legend was removed (the bar chart already labels the
 * x-axis; the legend was duplication, not information). The "avg per
 * category" subline was removed too — most users do not think in averages
 * of categories.
 */
export function CategoryBarChartCard({
  payload,
  onViewData,
}: {
  payload: SpendingBreakdownPayload;
  onViewData?: () => void;
}) {
  const { masked } = usePrivacy();
  const data = payload.slices.map((s) => ({
    name: s.category,
    amount: Number(BigInt(s.amountMinor)) / 10 ** payload.decimals,
  }));

  const trendData = (payload.dailyTrend ?? []).map((d) => ({
    day: d.day.slice(5), // "MM-DD"
    amount: Number(BigInt(d.amountMinor)) / 10 ** payload.decimals,
  }));

  return (
    <section
      aria-label="Spending breakdown"
      className="rounded-(--radius-lg) border border-(--border) bg-(--surface-1) p-4"
    >
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="text-sm font-semibold text-zinc-300">Spending</h3>
        <div className="flex items-baseline gap-2">
          <DataScopeBadge scope={payload.scope} />
          <span className="text-xs text-zinc-500">{payload.periodLabel}</span>
        </div>
      </div>
      <p className="mt-1 font-display text-2xl font-bold tracking-tight">
        {masked ? "••••" : formatMoney(BigInt(payload.totalMinor), payload.decimals, payload.assetCode)}
      </p>
      <p className="text-[11px] text-zinc-500">
        across {payload.slices.length}{" "}
        {payload.slices.length === 1 ? "category" : "categories"}
      </p>

      {trendData.length > 1 && (
        <div className="mt-3 h-16">
          <AreaChart
            data={trendData}
            xKey="day"
            series={[{ key: "amount" }]}
            height={64}
            yFormatter={() => ""}
            xFormatter={(v) => String(v)}
          />
        </div>
      )}

      <div className="mt-3 h-44">
        <BarChart
          data={data}
          xKey="name"
          bars={[{ key: "amount" }]}
          height={176}
          xFormatter={(v) => String(v).slice(0, 10)}
          yFormatter={(v) =>
            formatMoney(
              BigInt(Math.round(Number(v) * 10 ** payload.decimals)),
              payload.decimals,
              payload.assetCode,
            )
          }
        />
      </div>

      {payload.topTxn && (
        <p className="mt-3 rounded-(--radius-md) bg-(--surface-2) px-2 py-1.5 text-[11px] text-zinc-400">
          <span className="text-zinc-300">{payload.topTxn.description}</span>
          <span className="mx-1.5 text-zinc-500">·</span>
          {masked
            ? "••••"
            : formatMoney(
                BigInt(payload.topTxn.amountMinor),
                payload.decimals,
                payload.assetCode,
              )}{" "}
          on {payload.topTxn.dateLabel}
        </p>
      )}

      <GenUiFooter updatedAt={Date.now()} onViewData={onViewData} />
    </section>
  );
}
