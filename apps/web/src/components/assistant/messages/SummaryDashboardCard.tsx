"use client";

import Link from "next/link";
import { ArrowRight, TrendingDown, TrendingUp } from "lucide-react";
import { PieChart } from "@/components/charts";
import { formatMoney } from "@/lib/money";
import { usePrivacy } from "@/lib/privacy/privacy-context";
import { GenUiFooter } from "../GenUiFooter";
import { DataScopeBadge } from "./DataScopeBadge";
import type { SummaryDashboardPayload } from "@/lib/assistant/types";

const PALETTE = [
  "#22c55e",
  "#3b82f6",
  "#a855f7",
  "#f97316",
  "#eab308",
  "#06b6d4",
  "#ec4899",
  "#71717a",
];

/**
 * Period summary. Six planes were crammed in here before; this refinement
 * keeps only the three that earn their place:
 *   1. KPI grid: Income / Expense / Net (unchanged).
 *   2. Donut: top 5 categories — better than the bar chart for "where the
 *      money went" with a small slice set.
 *   3. Inline budget row: the four budgets the user is closest to their
 *      limit on, as one continuous inline progress list, not four separate
 *      progress bars.
 *
 * The savings rate is a single percentage next to Net. When income is 0
 * (or no savingsRatePct is computable) the line is omitted.
 */
export function SummaryDashboardCard({
  payload,
  onViewData,
}: {
  payload: SummaryDashboardPayload;
  onViewData?: () => void;
}) {
  const { masked } = usePrivacy();
  const netNegative = BigInt(payload.netMinor) < 0n;
  const income = BigInt(payload.incomeMinor);
  const expense = BigInt(payload.expenseMinor);

  const donutData = payload.topCategories.map((c, i) => ({
    name: c.category,
    value: Number(BigInt(c.amountMinor)) / 10 ** payload.decimals,
    color: PALETTE[i % PALETTE.length]!,
  }));

  return (
    <section
      aria-label="Summary"
      className="rounded-(--radius-lg) border border-(--border) bg-(--surface-1) p-4"
    >
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="text-sm font-semibold text-zinc-300">Summary</h3>
        <div className="flex items-baseline gap-2">
          <DataScopeBadge scope={payload.scope} />
          <span className="text-xs text-zinc-500">{payload.periodLabel}</span>
        </div>
      </div>

      <div className="mt-2 grid grid-cols-3 gap-2">
        <div className="rounded-(--radius-md) bg-(--surface-2) p-2">
          <p className="text-[10px] uppercase tracking-wide text-zinc-500">Income</p>
          <p className="mt-0.5 text-sm font-semibold text-(--accent) tabular-nums">
            {masked ? "••••" : formatMoney(income, payload.decimals, payload.assetCode)}
          </p>
        </div>
        <div className="rounded-(--radius-md) bg-(--surface-2) p-2">
          <p className="text-[10px] uppercase tracking-wide text-zinc-500">Expense</p>
          <p className="mt-0.5 text-sm font-semibold text-(--danger) tabular-nums">
            {masked ? "••••" : formatMoney(expense, payload.decimals, payload.assetCode)}
          </p>
        </div>
        <div className="rounded-(--radius-md) bg-(--surface-2) p-2">
          <p className="text-[10px] uppercase tracking-wide text-zinc-500">Net</p>
          <p
            className={`mt-0.5 inline-flex items-center gap-1 text-sm font-semibold tabular-nums ${
              netNegative ? "text-(--danger)" : "text-(--accent)"
            }`}
          >
            {netNegative ? (
              <TrendingDown className="h-3.5 w-3.5" aria-hidden />
            ) : (
              <TrendingUp className="h-3.5 w-3.5" aria-hidden />
            )}
            {masked ? "••••" : formatMoney(BigInt(payload.netMinor), payload.decimals, payload.assetCode)}
          </p>
          {payload.savingsRatePct !== null && !masked && (
            <p
              className={`text-[10px] ${
                payload.savingsRatePct < 0
                  ? "text-(--danger)"
                  : payload.savingsRatePct >= 20
                  ? "text-(--accent)"
                  : "text-zinc-500"
              }`}
            >
              {payload.savingsRatePct}% saved
            </p>
          )}
        </div>
      </div>

      {donutData.length > 0 && (
        <div className="mt-3 flex items-center gap-3">
          <div className="h-32 w-32 shrink-0">
            <PieChart
              data={donutData}
              height={128}
              innerRadius={38}
              outerRadius={56}
              tooltipFormatter={(v) =>
                formatMoney(
                  BigInt(Math.round(Number(v) * 10 ** payload.decimals)),
                  payload.decimals,
                  payload.assetCode,
                )
              }
            />
          </div>
          <ul className="min-w-0 flex-1 space-y-1 text-xs">
            {donutData.map((d) => (
              <li key={d.name} className="flex items-center gap-2 truncate">
                <span
                  aria-hidden
                  className="inline-block h-2 w-2 shrink-0 rounded-full"
                  style={{ backgroundColor: d.color }}
                />
                <span className="truncate text-zinc-300">{d.name}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {payload.budgets.length > 0 && (
        <div className="mt-3">
          <p className="text-[11px] uppercase tracking-wide text-zinc-500">Budgets near their limit</p>
          <ul className="mt-1.5 space-y-1">
            {payload.budgets.map((b) => {
              const color =
                b.pctUsed > 90
                  ? "bg-(--danger)"
                  : b.pctUsed >= 70
                  ? "bg-(--warning)"
                  : "bg-(--accent)";
              const clamped = Math.min(100, Math.max(0, Math.round(b.pctUsed)));
              return (
                <li key={b.category} className="flex items-center gap-2 text-[11px]">
                  <span className="w-20 truncate text-zinc-300">{b.category}</span>
                  <div
                    role="progressbar"
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={clamped}
                    className="h-1 flex-1 overflow-hidden rounded-full bg-(--surface-3)"
                  >
                    <div className={`h-full rounded-full ${color}`} style={{ width: `${clamped}%` }} />
                  </div>
                  <span className="w-9 shrink-0 text-right tabular-nums text-zinc-500">{clamped}%</span>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <Link
        href="/dashboard/analytics"
        className="mt-3 inline-flex items-center gap-1 text-[11px] font-medium text-(--accent) hover:underline focus-visible:underline focus-visible:outline-none"
      >
        Open Insights
        <ArrowRight className="h-3 w-3" aria-hidden />
      </Link>

      <GenUiFooter updatedAt={Date.now()} onViewData={onViewData} />
    </section>
  );
}
