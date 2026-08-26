"use client";

import { AlertTriangle } from "lucide-react";
import { usePrivacy } from "@/lib/privacy/privacy-context";
import { formatMoney } from "@/lib/money";

type Anomaly = {
  description: string;
  amount: bigint;
  categoryName: string;
  zScore: number;
  date: number;
};

type Props = {
  data: Anomaly[];
  code?: string;
};

function relativeDate(ms: number): string {
  const days = Math.floor((Date.now() - ms) / 86_400_000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

function zBadgeClass(z: number): string {
  const abs = Math.abs(z);
  if (abs > 3) return "bg-red-500/20 text-red-400";
  if (abs > 2) return "bg-amber-500/20 text-amber-400";
  return "bg-(--surface-3) text-zinc-400";
}

export function AnomalyAlertsCard({ data, code }: Props) {
  const { masked } = usePrivacy();

  if (data.length === 0) return null;

  return (
    <section className="rounded-(--radius-lg) border border-(--border) bg-(--surface-1) p-6">
      <p className="label-micro">Anomaly alerts</p>

      <ul className="mt-4 space-y-3">
        {data.map((a, i) => (
          <li key={i} className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">
                {a.description}
                <span className="ml-1.5 text-zinc-500">· {a.categoryName}</span>
              </p>
              <div className="mt-0.5 flex items-center gap-2">
                <span className="text-sm font-semibold tabular-nums">
                  {masked ? "••••" : formatMoney(a.amount, 2, code)}
                </span>
                <span
                  className={`rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums ${zBadgeClass(a.zScore)}`}
                >
                  z {a.zScore.toFixed(1)}
                </span>
                <span className="text-xs text-zinc-500">
                  {relativeDate(a.date)}
                </span>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
