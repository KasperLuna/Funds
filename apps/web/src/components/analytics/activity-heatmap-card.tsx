"use client";

import { cn } from "@/lib/utils";
import { formatMoney } from "@/lib/money";
import { usePrivacyStore } from "@/lib/privacy/privacy-store";
import { monthKey, type MonthHeatmap } from "@/lib/analytics/compute";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

const WEEKDAY_LETTERS = ["S", "M", "T", "W", "T", "F", "S"];

interface ActivityHeatmapCardProps {
  months: MonthHeatmap[];
  code?: string;
  decimals?: number;
}

function intensity(outflow: bigint, max: bigint): number {
  if (outflow <= 0n || max <= 0n) return 0;
  // Quartiles of the month's own max: quiet months keep their shape
  // instead of washing out against a busier scale.
  const ratio = Number((outflow * 100n) / max);
  if (ratio >= 100) return 4;
  if (ratio > 66) return 3;
  if (ratio > 33) return 2;
  return 1;
}

const OPACITY = [0, 0.25, 0.45, 0.7, 1];

export const ActivityHeatmapCard = ({
  months,
  code,
  decimals = 2,
}: ActivityHeatmapCardProps) => {
  const masked = usePrivacyStore((s) => s.masked);
  const money = (v: bigint) =>
    masked ? "••••" : formatMoney(v, decimals, code);

  return (
    <section
      aria-label="Transaction calendar heatmap"
      className="rounded-(--radius-lg) border border-(--border) bg-(--surface-1) p-6"
    >
      <p className="label-micro">Activity calendar</p>

      <div className="mt-4 flex flex-col gap-6">
        {months.map((m) => (
          <div key={`${m.year}-${m.month}`}>
            <p className="mb-2 text-sm font-semibold">
              {monthKey(m.year, m.month)}
            </p>
            <div
              role="grid"
              aria-label={`Daily activity for ${monthKey(m.year, m.month)}`}
              className="grid grid-cols-7 gap-1"
            >
              {WEEKDAY_LETTERS.map((w, i) => (
                <span
                  key={i}
                  aria-hidden
                  className="pb-0.5 text-center text-[10px] font-medium text-zinc-600"
                >
                  {w}
                </span>
              ))}
              {Array.from({ length: m.leadingBlanks }, (_, i) => (
                <span key={`blank-${i}`} aria-hidden />
              ))}
              {m.days.map((d) => {
                const level = intensity(d.outflow, m.maxOutflow);
                const label =
                  `${monthKey(m.year, m.month)} ${d.day}: ${d.count} ` +
                  `transaction${d.count === 1 ? "" : "s"}` +
                  (d.outflow > 0n && !masked
                    ? `, ${formatMoney(d.outflow, decimals, code)} spent`
                    : "");
                const cellClass = cn(
                  "flex aspect-square items-center justify-center rounded-[4px] text-[10px] tabular-nums",
                  d.count > 0 ? "text-zinc-200" : "text-zinc-600",
                  level === 0 && "bg-(--surface-3)",
                );
                const cellStyle =
                  level > 0
                    ? { backgroundColor: `color-mix(in srgb, var(--accent) ${OPACITY[level]! * 100}%, var(--surface-3))` }
                    : undefined;
                if (d.count === 0) {
                  return (
                    <span
                      key={d.day}
                      role="gridcell"
                      aria-label={label}
                      className={cellClass}
                      style={cellStyle}
                    >
                      {d.day}
                    </span>
                  );
                }
                const income = d.income;
                const net = income - d.outflow;
                const fullDate = new Date(m.year, m.month, d.day).toLocaleDateString(
                  undefined,
                  { weekday: "short", month: "short", day: "numeric", year: "numeric" },
                );
                return (
                  <Popover key={d.day}>
                    <PopoverTrigger asChild>
                      <span
                        role="gridcell"
                        aria-label={label}
                        title={label}
                        className={cn(cellClass, "cursor-pointer")}
                        style={cellStyle}
                      >
                        {d.day}
                      </span>
                    </PopoverTrigger>
                    <PopoverContent
                      side="top"
                      className="w-60 border-(--border) bg-(--surface-2) p-4"
                    >
                      <p className="text-sm font-semibold">{fullDate}</p>
                      <dl className="mt-2 space-y-1 text-sm tabular-nums">
                        <div className="flex items-center justify-between">
                          <dt className="text-zinc-400">Transactions</dt>
                          <dd>{d.count}</dd>
                        </div>
                        <div className="flex items-center justify-between">
                          <dt className="text-zinc-400">Income</dt>
                          <dd>{money(income)}</dd>
                        </div>
                        <div className="flex items-center justify-between">
                          <dt className="text-zinc-400">Expense</dt>
                          <dd>{money(d.outflow)}</dd>
                        </div>
                        <div className="flex items-center justify-between border-t border-(--border) pt-1 font-medium">
                          <dt className="text-zinc-400">Net</dt>
                          <dd>{money(net)}</dd>
                        </div>
                      </dl>
                    </PopoverContent>
                  </Popover>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};
