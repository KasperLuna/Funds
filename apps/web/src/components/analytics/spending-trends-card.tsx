"use client";

import { AreaChart } from "@/components/charts";
import { formatMoney } from "@/lib/money";
import { usePrivacyStore } from "@/lib/privacy/privacy-store";

type DataPoint = { month: string; income: bigint; expense: bigint; net: bigint };

const MASKED = "••••";

interface SpendingTrendsCardProps {
  data: DataPoint[];
  code?: string;
}

export const SpendingTrendsCard = ({ data, code }: SpendingTrendsCardProps) => {
  const masked = usePrivacyStore((s) => s.masked);

  const chartData = data.map((d) => ({
    month: d.month,
    income: masked ? 0 : Number(d.income),
    expense: masked ? 0 : Number(d.expense),
    net: masked ? 0 : Number(d.net),
  }));

  return (
    <section className="rounded-(--radius-lg) border border-(--border) bg-(--surface-1) p-6">
      <p className="label-micro">Spending trends</p>

      <div className="mt-4">
        {masked ? (
          <p className="py-12 text-center text-sm text-zinc-500">{MASKED}</p>
        ) : (
          <AreaChart
            data={chartData}
            xKey="month"
            series={[
              { key: "income", color: "#10b981", fill: "rgba(16,185,129,0.12)" },
              { key: "expense", color: "#71717a", fill: "rgba(113,113,122,0.12)" },
              { key: "net", color: "transparent", fill: "none", strokeWidth: 0 },
            ]}
            height={200}
            yFormatter={(v) => formatMoney(BigInt(Math.round(Number(v))), 2, code)}
            tooltipFormatter={(v, name) => {
              const label = name === "income" ? "Income" : name === "expense" ? "Expense" : "Total";
              return `${label}: ${formatMoney(BigInt(Math.round(Number(v))), 2, code)}`;
            }}
          />
        )}
      </div>
    </section>
  );
};
