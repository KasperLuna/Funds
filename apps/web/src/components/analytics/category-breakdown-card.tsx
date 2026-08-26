"use client";

import { PieChart } from "@/components/charts";
import { formatMoney } from "@/lib/money";
import { usePrivacy } from "@/lib/privacy/privacy-context";
import type { AssetInfo } from "@/app/dashboard/analytics/page";

type CategorySlice = {
  name: string;
  color: string;
  total: bigint;
  pct: number;
};

type Props = {
  data: CategorySlice[];
  accountInfo?: Record<string, AssetInfo>;
};

export function CategoryBreakdownCard({ data, accountInfo }: Props) {
  const { masked } = usePrivacy();

  const code = accountInfo ? Object.values(accountInfo)[0]?.code : undefined;
  const decimals = accountInfo ? Object.values(accountInfo)[0]?.decimals : 2;

  const chartData = data.map((d) => ({
    name: d.name,
    // eslint-disable-next-line local/no-money-float
    value: Number(d.total),
    color: d.color,
  }));

  return (
    <section className="rounded-(--radius-lg) border border-(--border) bg-(--surface-1) p-6">
      <p className="label-micro">Category breakdown</p>

      <div className="mt-4 flex flex-col gap-6 lg:flex-row">
        <div className="shrink-0 lg:w-1/2">
          <PieChart
            data={chartData}
            height={200}
            innerRadius={50}
            outerRadius={75}
            tooltipFormatter={(v) =>
              masked ? "••••" : formatMoney(BigInt(Math.round(Number(v))), decimals, code)
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
                  {masked
                    ? "••••"
                    : formatMoney(d.total, decimals, code)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
