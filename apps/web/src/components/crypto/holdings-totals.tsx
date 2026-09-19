"use client";

import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";
import { usePrivacyStore } from "@/lib/privacy/privacy-store";

export interface HoldingsTotalsProps {
  totalValueMinor: bigint;
  totalPLMinor: bigint;
  code: string;
  fiatDecimals: number;
}

export const HoldingsTotals = ({ totalValueMinor, totalPLMinor, code, fiatDecimals }: HoldingsTotalsProps) => {
  const isMasked = usePrivacyStore((s) => s.masked);
  const totalPLClass = isMasked
    ? "text-zinc-500"
    : totalPLMinor >= 0n
      ? "text-emerald-400"
      : "text-rose-400";

  return (
    <div>
      <p className="text-sm text-zinc-500">Total value</p>
      <p
        className="text-2xl font-semibold tabular-nums"
        aria-label={isMasked ? "Total value masked" : undefined}
      >
        {isMasked
          ? "••••••"
          : formatMoney(totalValueMinor, fiatDecimals, code)}
      </p>
      {totalPLMinor !== 0n && (
        <p
          className={cn("text-xs tabular-nums", totalPLClass)}
          aria-label={isMasked ? "Profit or loss masked" : undefined}
        >
          {isMasked
            ? "••••"
            : `${totalPLMinor >= 0n ? "+" : ""}${formatMoney(totalPLMinor, fiatDecimals, code)}`}
        </p>
      )}
    </div>
  );
};
