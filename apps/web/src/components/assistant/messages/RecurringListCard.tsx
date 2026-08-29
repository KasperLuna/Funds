"use client";

import { formatMoney } from "@/lib/money";
import { usePrivacy } from "@/lib/privacy/privacy-context";
import { GenUiFooter } from "../GenUiFooter";
import { DataScopeBadge } from "./DataScopeBadge";
import type { RecurringListPayload } from "@/lib/assistant/types";

const CADENCE_COPY: Record<RecurringListPayload["items"][number]["cadence"], string> = {
  weekly: "Weekly",
  biweekly: "Every 2 weeks",
  monthly: "Monthly",
  irregular: "Irregular",
};

/**
 * "Any subscriptions?" — repeat charges with average amount, cadence, and
 * a normalized monthly cost so the user can see the total drain.
 */
export function RecurringListCard({
  payload,
  onViewData,
}: {
  payload: RecurringListPayload;
  onViewData?: () => void;
}) {
  const { masked } = usePrivacy();
  const total = BigInt(payload.totalMonthlyMinor);

  return (
    <section
      aria-label="Recurring charges"
      className="rounded-(--radius-lg) border border-(--border) bg-(--surface-1) p-4"
    >
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="text-sm font-semibold text-zinc-300">Recurring</h3>
        <DataScopeBadge scope={payload.scope} />
      </div>
      <p className="text-xs text-zinc-500">{payload.periodLabel}</p>
      <p className="mt-1 font-display text-2xl font-bold tracking-tight">
        {masked ? "••••" : formatMoney(total, payload.decimals, payload.assetCode)}
        <span className="ml-1 text-xs font-normal text-zinc-500">/ month</span>
      </p>

      <table className="mt-3 w-full text-xs">
        <thead>
          <tr className="text-left text-[10px] uppercase tracking-wide text-zinc-500">
            <th className="pb-1 font-medium">Merchant</th>
            <th className="pb-1 text-right font-medium">Avg</th>
            <th className="pb-1 text-right font-medium">Cadence</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-(--border)">
          {payload.items.map((item, i) => (
            <tr key={`${item.description}-${i}`}>
              <td className="py-1.5 pr-2">
                <div className="truncate text-zinc-300">{item.description}</div>
                <div className="text-[10px] text-zinc-500">
                  {item.occurrences}× · last {item.lastDateLabel}
                </div>
              </td>
              <td className="py-1.5 text-right tabular-nums">
                {masked
                  ? "••••"
                  : formatMoney(BigInt(item.avgMinor), payload.decimals, payload.assetCode)}
              </td>
              <td className="py-1.5 text-right text-zinc-500">
                {CADENCE_COPY[item.cadence]}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <GenUiFooter updatedAt={Date.now()} onViewData={onViewData} />
    </section>
  );
}
