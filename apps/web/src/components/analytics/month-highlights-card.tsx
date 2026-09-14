"use client";

import { formatMoney } from "@/lib/money";
import { usePrivacyStore } from "@/lib/privacy/privacy-store";
import { monthKey, type MonthHighlights } from "@/lib/analytics/compute";

interface MonthHighlightsCardProps {
  data: MonthHighlights;
  year: number;
  month: number;
  code?: string;
  decimals?: number;
}

function weekdayName(weekday: number): string {
  // 2026-01-04 was a Sunday; offset for short weekday names.
  return new Date(2026, 0, 4 + weekday).toLocaleDateString(undefined, {
    weekday: "short",
  });
}

export const MonthHighlightsCard = ({
  data,
  year,
  month,
  code,
  decimals = 2,
}: MonthHighlightsCardProps) => {
  const masked = usePrivacyStore((s) => s.masked);
  const label = monthKey(year, month);

  const stats: { title: string; value: string }[] = [
    {
      title: "Busiest day",
      value: data.busiestDay
        ? `${label.split(" ")[0]} ${data.busiestDay.day} · ${data.busiestDay.count} txns`
        : "—",
    },
    {
      title: "Biggest outflow",
      value:
        data.biggestDay != null
          ? masked
            ? `${label.split(" ")[0]} ${data.biggestDay.day} · ••••`
            : `${label.split(" ")[0]} ${data.biggestDay.day} · ${formatMoney(data.biggestDay.outflow, decimals, code)}`
          : "—",
    },
    {
      title: "Busiest weekday",
      value: data.busiestWeekday
        ? `${weekdayName(data.busiestWeekday.weekday)} · ${data.busiestWeekday.count} txns`
        : "—",
    },
    {
      title: "Longest streak",
      value:
        data.longestStreak > 0
          ? `${data.longestStreak} day${data.longestStreak === 1 ? "" : "s"}`
          : "—",
    },
  ];

  return (
    <section
      aria-label={`Monthly highlights for ${label}`}
      className="rounded-(--radius-lg) border border-(--border) bg-(--surface-1) p-6"
    >
      <p className="label-micro">Highlights · {label}</p>

      <dl className="mt-4 grid grid-cols-2 gap-3">
        {stats.map((s) => (
          <div
            key={s.title}
            className="rounded-(--radius-md) bg-(--surface-2) px-4 py-3"
          >
            <dt className="text-xs text-zinc-500">{s.title}</dt>
            <dd className="mt-0.5 truncate text-sm font-semibold tabular-nums">
              {s.value}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
};
