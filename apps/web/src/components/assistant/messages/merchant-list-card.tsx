"use client";

import { formatMoney } from "@/lib/money";
import { usePrivacyStore } from "@/lib/privacy/privacy-store";
import { GenUiFooter } from "../gen-ui-footer";
import { DataScopeBadge } from "./data-scope-badge";
import type { MerchantBreakdownPayload } from "@/lib/assistant/types";

interface MerchantListCardProps {
  payload: MerchantBreakdownPayload;
  onViewData?: () => void;
}

/**
 * "Where does my Food money go?" — top description strings within an
 * optional category. Horizontal bar list with a count subtitle so the user
 * can spot both big tickets and high-frequency small charges.
 */
export const MerchantListCard = ({ payload, onViewData }: MerchantListCardProps) => {
  const masked = usePrivacyStore((s) => s.masked);
  const total = BigInt(payload.totalMinor);
  const max = payload.merchants.reduce(
    (m, x) => (BigInt(x.amountMinor) > m ? BigInt(x.amountMinor) : m),
    0n,
  );

  return (
    <section
      aria-label="Top merchants"
      className="rounded-(--radius-lg) border border-(--border) bg-(--surface-1) p-4"
    >
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="text-sm font-semibold text-zinc-300">
          {payload.category ? `Where ${payload.category} goes` : "Top merchants"}
        </h3>
        <DataScopeBadge scope={payload.scope} />
      </div>
      <p className="text-xs text-zinc-500">{payload.periodLabel}</p>
      <p className="mt-1 font-display text-2xl font-bold tracking-tight">
        {masked ? "••••" : formatMoney(total, payload.decimals, payload.assetCode)}
      </p>

      <ul className="mt-3 space-y-1.5">
        {payload.merchants.map((m) => {
          const amt = BigInt(m.amountMinor);
          const pct = max > 0n ? Number((amt * 1000n) / max) / 10 : 0;
          return (
            <li key={m.key} className="space-y-0.5">
              <div className="flex items-baseline justify-between gap-2 text-xs">
                <span className="truncate text-zinc-300">{m.description}</span>
                <span className="shrink-0 tabular-nums text-zinc-500">
                  {masked
                    ? "••••"
                    : formatMoney(amt, payload.decimals, payload.assetCode)}{" "}
                  · {m.count}×
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-(--surface-3)">
                <div
                  className="h-full rounded-full bg-(--accent)"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </li>
          );
        })}
      </ul>

      <GenUiFooter updatedAt={Date.now()} onViewData={onViewData} />
    </section>
  );
};
