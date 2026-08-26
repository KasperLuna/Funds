"use client";

import { AreaChart } from "@/components/charts";
import { formatMoney } from "@/lib/money";
import { usePrivacy } from "@/lib/privacy/privacy-context";

type DataPoint = { month: string; income: bigint; expense: bigint };

const MASKED = "••••";

export function SpendingTrendsCard({ data, code }: { data: DataPoint[]; code?: string }) {
  const { masked } = usePrivacy();

  const chartData = data.map((d) => ({
    month: d.month,
    income: masked ? 0 : Number(d.income),
    expense: masked ? 0 : Number(d.expense),
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
            ]}
            height={200}
            yFormatter={(v) => formatMoney(BigInt(Math.round(Number(v))), 2, code)}
            tooltipFormatter={(v, name) =>
              `${name === "income" ? "Income" : "Expense"}: ${formatMoney(BigInt(Math.round(Number(v))), 2, code)}`
            }
          />
        )}
      </div>
    </section>
  );
}
