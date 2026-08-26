"use client";

import { BarChart } from "@/components/charts";
import { formatMoney } from "@/lib/money";
import { usePrivacy } from "@/lib/privacy/privacy-context";

type CashFlowPoint = {
  month: string;
  income: bigint;
  expense: bigint;
  projected: boolean;
};

type Props = {
  data: CashFlowPoint[];
  code?: string;
};

export function CashFlowForecastCard({ data, code }: Props) {
  const { masked } = usePrivacy();

  const chartData = data.map((d) => ({
    month: d.month,
    income: Number(d.income),
    expense: Number(d.expense),
    projected: d.projected,
  }));

  const formatY = (v: string | number) =>
    masked ? "••••" : formatMoney(BigInt(Math.round(Number(v))), 2, code);

  const formatTooltip = (v: string | number | (string | number)[] | undefined) =>
    masked ? "••••" : formatMoney(BigInt(Math.round(Number(v))), 2, code);

  return (
    <section className="rounded-(--radius-lg) border border-(--border) bg-(--surface-1) p-6">
      <p className="label-micro">Cash flow</p>

      <div className="mt-4">
        <BarChart
          data={chartData}
          xKey="month"
          bars={[
            { key: "income", color: "#10b981", radius: [3, 3, 0, 0] },
            { key: "expense", color: "#71717a", radius: [3, 3, 0, 0] },
          ]}
          height={220}
          yFormatter={formatY}
          tooltipFormatter={formatTooltip}
        />
      </div>
    </section>
  );
}
