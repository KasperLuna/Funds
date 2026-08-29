"use client";

import { BarChart } from "@/components/charts";
import { formatMoney } from "@/lib/money";
import { usePrivacy } from "@/lib/privacy/privacy-context";
import { GenUiFooter } from "../GenUiFooter";
import type { SpendingBreakdownPayload } from "@/lib/assistant/types";

const PALETTE = ["#22c55e", "#3b82f6", "#a855f7", "#f97316", "#eab308", "#06b6d4", "#ec4899", "#71717a"];

export function CategoryBarChartCard({
  payload,
  onViewData,
}: {
  payload: SpendingBreakdownPayload;
  onViewData?: () => void;
}) {
  const { masked } = usePrivacy();
  const data = payload.slices.map((s, i) => ({
    name: s.category,
    amount: Number(BigInt(s.amountMinor)) / 10 ** payload.decimals,
    fill: PALETTE[i % PALETTE.length]!,
  }));
  const totalMajor = Number(BigInt(payload.totalMinor)) / 10 ** payload.decimals;

  return (
    <section
      aria-label="Spending breakdown"
      className="rounded-(--radius-lg) border border-(--border) bg-(--surface-1) p-4"
    >
      <div className="flex items-baseline justify-between">
        <h3 className="text-sm font-semibold text-zinc-300">Spending</h3>
        <span className="text-xs text-zinc-500">{payload.periodLabel}</span>
      </div>
      <p className="mt-1 font-display text-2xl font-bold tracking-tight">
        {masked ? "••••" : formatMoney(BigInt(payload.totalMinor), payload.decimals, payload.assetCode)}
      </p>
      <p className="text-[11px] text-zinc-500">
        {masked ? "across " : "across "}
        {payload.slices.length} {payload.slices.length === 1 ? "category" : "categories"}
        {!masked && totalMajor > 0 && ` · avg ${formatMoney(
          BigInt(payload.totalMinor) / BigInt(payload.slices.length),
          payload.decimals,
          payload.assetCode,
        )}`}
      </p>

      <div className="mt-3 h-56">
        <BarChart
          data={data}
          xKey="name"
          bars={[{ key: "amount" }]}
          xFormatter={(v) => String(v).slice(0, 10)}
          yFormatter={(v) => formatMoney(BigInt(Math.round(Number(v) * 10 ** payload.decimals)), payload.decimals, payload.assetCode)}
        />
      </div>

      <ul className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
        {payload.slices.map((s, i) => (
          <li key={s.category} className="flex items-center gap-2 truncate">
            <span
              aria-hidden
              className="inline-block h-2 w-2 shrink-0 rounded-full"
              style={{ backgroundColor: PALETTE[i % PALETTE.length] }}
            />
            <span className="truncate text-zinc-300">{s.category}</span>
            <span className="ml-auto shrink-0 text-zinc-500">{s.pct}%</span>
          </li>
        ))}
      </ul>

      <GenUiFooter updatedAt={Date.now()} onViewData={onViewData} />
    </section>
  );
}
