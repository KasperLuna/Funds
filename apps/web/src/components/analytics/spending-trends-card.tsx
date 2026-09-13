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

  // cavetail: trend shape stays visible in privacy mode; only value labels
  // (axis ticks + tooltip amounts) are masked.
  const chartData = data.map((d) => ({
    month: d.month,
    income: Number(d.income),
    expense: Number(d.expense),
    net: Number(d.net),
  }));

  return (
    <section className="rounded-(--radius-lg) border border-(--border) bg-(--surface-1) p-6">
      <p className="label-micro">Spending trends</p>

      <div className="mt-4">
        <AreaChart
          data={chartData}
          xKey="month"
          series={[
            { key: "income", color: "#10b981", fill: "rgba(16,185,129,0.12)" },
            { key: "expense", color: "#71717a", fill: "rgba(113,113,122,0.12)" },
            { key: "net", color: "transparent", fill: "none", strokeWidth: 0 },
          ]}
          height={200}
          yFormatter={(v) =>
            masked ? MASKED : formatMoney(BigInt(Math.round(Number(v))), 2, code)
          }
          tooltipFormatter={(v, name) => {
            const label = name === "income" ? "Income" : name === "expense" ? "Expense" : "Total";
            if (masked) return label;
            return `${label}: ${formatMoney(BigInt(Math.round(Number(v))), 2, code)}`;
          }}
        />
      </div>
    </section>
  );
};
