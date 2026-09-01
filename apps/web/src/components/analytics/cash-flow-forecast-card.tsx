"use client";

import { BarChart } from "@/components/charts";
import { monthKey } from "@/lib/analytics/compute";
import { formatMoney } from "@/lib/money";
import { usePrivacyStore } from "@/lib/privacy/privacy-store";

type CashFlowPoint = {
  month: string;
  income: bigint;
  expense: bigint;
  projected: boolean;
};

interface CashFlowForecastCardProps {
  data: CashFlowPoint[];
  code?: string;
}

export const CashFlowForecastCard = ({ data, code }: CashFlowForecastCardProps) => {
  const masked = usePrivacyStore((s) => s.masked);

  const chartData = data.map((d) => ({
    month: d.month,
    income: Number(d.income),
    expense: Number(d.expense),
    projected: d.projected,
  }));

  const now = new Date();
  const currentMonth = monthKey(now.getFullYear(), now.getMonth());

  const formatY = (v: string | number) =>
    masked ? "••••" : formatMoney(BigInt(Math.round(Number(v))), 2, code);

  const formatTooltip = (v: string | number | (string | number)[] | undefined) =>
    masked ? "••••" : formatMoney(BigInt(Math.round(Number(v))), 2, code);

  return (
    <section className="rounded-(--radius-lg) border border-(--border) bg-(--surface-1) p-6">
      <div className="flex items-baseline justify-between">
        <p className="label-micro">Cash flow</p>
        <p className="text-(--text-2xs) text-(--fg-3)">
          <span aria-hidden>—</span> Actual ·{" "}
          <span aria-hidden className="opacity-45">—</span> Projected
        </p>
      </div>

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
          verticalReferenceLine={{ value: currentMonth, label: "Now" }}
          cellOpacity={(row) => (row.projected ? 0.45 : 1)}
        />
      </div>
    </section>
  );
};
