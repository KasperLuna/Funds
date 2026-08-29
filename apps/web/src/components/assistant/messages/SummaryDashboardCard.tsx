"use client";

import Link from "next/link";
import { ArrowRight, TrendingUp, TrendingDown } from "lucide-react";
import { BarChart } from "@/components/charts";
import { formatMoney } from "@/lib/money";
import { usePrivacy } from "@/lib/privacy/privacy-context";
import { GenUiFooter } from "../GenUiFooter";
import type { SummaryDashboardPayload } from "@/lib/assistant/types";

function minorStringToNumber(s: string, decimals: number): number {
  return Number(BigInt(s)) / 10 ** decimals;
}

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

  return (
    <section
      aria-label="Summary"
      className="rounded-(--radius-lg) border border-(--border) bg-(--surface-1) p-4"
    >
      <div className="flex items-baseline justify-between">
        <h3 className="text-sm font-semibold text-zinc-300">Summary</h3>
        <span className="text-xs text-zinc-500">{payload.periodLabel}</span>
      </div>

      <div className="mt-2 grid grid-cols-3 gap-2">
        <div className="rounded-(--radius-md) bg-(--surface-2) p-2">
          <p className="text-[10px] uppercase tracking-wide text-zinc-500">Income</p>
          <p className="mt-0.5 text-sm font-semibold text-(--accent)">
            {masked ? "••••" : formatMoney(income, payload.decimals, payload.assetCode)}
          </p>
        </div>
        <div className="rounded-(--radius-md) bg-(--surface-2) p-2">
          <p className="text-[10px] uppercase tracking-wide text-zinc-500">Expense</p>
          <p className="mt-0.5 text-sm font-semibold text-(--danger)">
            {masked ? "••••" : formatMoney(expense, payload.decimals, payload.assetCode)}
          </p>
        </div>
        <div className="rounded-(--radius-md) bg-(--surface-2) p-2">
          <p className="text-[10px] uppercase tracking-wide text-zinc-500">Net</p>
          <p
            className={`mt-0.5 inline-flex items-center gap-1 text-sm font-semibold ${
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
        </div>
      </div>

      {payload.topCategories.length > 0 && (
        <>
          <p className="mt-3 text-[11px] uppercase tracking-wide text-zinc-500">Top categories</p>
          <div className="mt-2 h-32">
            <BarChart
              data={payload.topCategories.map((c) => ({
                name: c.category,
                amount: minorStringToNumber(c.amountMinor, payload.decimals),
              }))}
              xKey="name"
              bars={[{ key: "amount" }]}
              xFormatter={(v) => String(v).slice(0, 8)}
              yFormatter={(v) =>
                formatMoney(
                  BigInt(Math.round(Number(v) * 10 ** payload.decimals)),
                  payload.decimals,
                  payload.assetCode,
                )
              }
            />
          </div>
        </>
      )}

      {payload.budgets.length > 0 && (
        <ul className="mt-3 space-y-1.5">
          {payload.budgets.map((b) => {
            const color = b.pctUsed > 90 ? "bg-(--danger)" : b.pctUsed >= 70 ? "bg-(--warning)" : "bg-(--accent)";
            const clamped = Math.min(100, Math.max(0, Math.round(b.pctUsed)));
            return (
              <li key={b.category} className="flex items-center gap-2 text-xs">
                <span className="w-24 truncate text-zinc-300">{b.category}</span>
                <div
                  role="progressbar"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={clamped}
                  className="h-1.5 flex-1 overflow-hidden rounded-full bg-(--surface-3)"
                >
                  <div className={`h-full rounded-full ${color}`} style={{ width: `${clamped}%` }} />
                </div>
                <span className="w-10 shrink-0 text-right text-zinc-500">{clamped}%</span>
              </li>
            );
          })}
        </ul>
      )}

      <Link
        href="/dashboard/analytics"
        className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-(--accent) hover:underline focus-visible:underline focus-visible:outline-none"
      >
        Open Insights
        <ArrowRight className="h-3 w-3" aria-hidden />
      </Link>

      <GenUiFooter updatedAt={Date.now()} onViewData={onViewData} />
    </section>
  );
}
