"use client";

import { cn } from "@/lib/utils";
import { AreaChart } from "@/components/charts";

type DataPoint = { month: string; rate: number };

export type RateWindow = 3 | 6 | 12;

const WINDOWS: { value: RateWindow; label: string }[] = [
  { value: 3, label: "3M" },
  { value: 6, label: "6M" },
  { value: 12, label: "12M" },
];

function rateColor(rate: number): string {
  if (rate > 20) return "#10b981";
  if (rate >= 10) return "#fbbf24";
  return "#ef4444";
}

interface SavingsRateCardProps {
  data: DataPoint[];
  window: RateWindow;
  onWindowChange: (w: RateWindow) => void;
}

export const SavingsRateCard = ({ data, window, onWindowChange }: SavingsRateCardProps) => {
  const current = data.at(-1)?.rate ?? 0;
  const color = rateColor(current);

  return (
    <section className="rounded-(--radius-lg) border border-(--border) bg-(--surface-1) p-6">
      <div className="flex items-center justify-between">
        <p className="label-micro">Savings rate</p>
        <div
          role="group"
          aria-label="Trend period"
          className="inline-flex items-center gap-0.5 rounded-(--radius-md) border border-(--border) bg-(--surface-2) p-0.5"
        >
          {WINDOWS.map((w) => (
            <button
              key={w.value}
              type="button"
              aria-pressed={window === w.value}
              onClick={() => onWindowChange(w.value)}
              className={cn(
                "min-h-7 rounded-(--radius-sm) px-2.5 text-xs transition-colors focus-visible:ring-2 focus-visible:ring-(--accent) focus-visible:outline-none",
                window === w.value
                  ? "bg-(--surface-3) font-semibold text-zinc-100"
                  : "font-medium text-zinc-500 hover:text-inherit",
              )}
            >
              {w.label}
            </button>
          ))}
        </div>
      </div>
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
};
