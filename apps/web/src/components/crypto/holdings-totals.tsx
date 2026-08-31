"use client";

import { cn } from "@/lib/utils";
import { usePrivacyStore } from "@/lib/privacy/privacy-store";

export interface HoldingsTotalsProps {
  totalValue: number;
  totalPL: number;
}

export const HoldingsTotals = ({ totalValue, totalPL }: HoldingsTotalsProps) => {
  const isMasked = usePrivacyStore((s) => s.masked);
  const totalPLClass = isMasked
    ? "text-zinc-500"
    : totalPL >= 0
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
          : `$${totalValue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
      </p>
      {totalPL !== 0 && (
        <p
          className={cn("text-xs tabular-nums", totalPLClass)}
          aria-label={isMasked ? "Profit or loss masked" : undefined}
        >
          {isMasked
            ? "••••"
            : `${totalPL >= 0 ? "+" : ""}$${totalPL.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
        </p>
      )}
    </div>
  );
};
