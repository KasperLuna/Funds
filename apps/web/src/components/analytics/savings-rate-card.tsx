"use client";

import { AreaChart } from "@/components/charts";

type DataPoint = { month: string; rate: number };

function rateColor(rate: number): string {
  if (rate > 20) return "#10b981";
  if (rate >= 10) return "#fbbf24";
  return "#ef4444";
}

export function SavingsRateCard({ data }: { data: DataPoint[] }) {
  const current = data.at(-1)?.rate ?? 0;
  const color = rateColor(current);

  return (
    <section className="rounded-(--radius-lg) border border-(--border) bg-(--surface-1) p-6">
      <p className="label-micro">Savings rate</p>
      <p
        className="mt-1 font-display text-2xl font-bold tabular-nums"
        style={{ color }}
      >
        {current}%
      </p>

      <div className="mt-4">
        <AreaChart
          data={data}
          xKey="month"
          series={[{ key: "rate", color, fill: `${color}1a` }]}
          height={180}
          yFormatter={(v) => `${v}%`}
          tooltipFormatter={(v) => `${v}%`}
        />
      </div>
    </section>
  );
}
