"use client";

import { PieChart } from "@/components/charts";
import { formatMoney } from "@/lib/money";
import { usePrivacyStore } from "@/lib/privacy/privacy-store";

const FALLBACK_COLORS = [
  "#10b981", "#38bdf8", "#a78bfa", "#f472b6",
  "#fbbf24", "#fb923c", "#34d399", "#60a5fa",
];

type AccountSlice = {
  name: string;
  color: string;
  balance: bigint;
  pct: number;
};

interface BankProportionCardProps {
  data: AccountSlice[];
  code?: string;
}

export const BankProportionCard = ({ data, code = "USD" }: BankProportionCardProps) => {
  const masked = usePrivacyStore((s) => s.masked);

  if (data.length === 0) return null;

  const chartData = data.map((d) => ({
    name: d.name,
    value: Number(d.balance < 0n ? -d.balance : d.balance),
    color: d.color,
  }));

  return (
    <section className="rounded-(--radius-lg) border border-(--border) bg-(--surface-1) p-6">
      <p className="label-micro">Bank balances</p>

      <div className="mt-4 flex flex-col gap-6 lg:flex-row">
        <div className="shrink-0 lg:w-1/2">
          <PieChart
            data={chartData}
            height={200}
            innerRadius={50}
            outerRadius={75}
            tooltipFormatter={(v) =>
              masked ? "••••" : formatMoney(BigInt(Math.round(Number(v))), 2, code)
            }
          />
        </div>

        <div className="flex-1 space-y-2">
          {data.map((d) => (
            <div
              key={d.name}
              className="flex items-center justify-between gap-3"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: d.color }}
                />
                <span className="truncate text-sm">{d.name}</span>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <span className="text-xs tabular-nums text-zinc-500">
                  {Math.round(d.pct)}%
                </span>
                <span className="text-sm tabular-nums font-medium">
                  {masked ? "••••" : formatMoney(d.balance, 2, code)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export { FALLBACK_COLORS };
