"use client";

import { Tag } from "lucide-react";
import type { Txn } from "@/lib/accounts/accounts-store";
import { formatMoney } from "@/lib/money";
import { usePrivacy } from "@/lib/privacy/privacy-context";
import { cn } from "@/lib/utils";

type CategoryInfo = { id: string; name: string; color: string; hideable?: boolean };

function formatTime(ts: number): string {
  return new Date(Number(ts)).toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
}

interface TransactionRowReadonlyProps {
  txn: Txn;
  categories: CategoryInfo[];
  accountName?: string;
  assetCode?: string;
  assetDecimals?: number;
}

export const TransactionRowReadonly = (props: TransactionRowReadonlyProps) => {
  const { txn, categories, accountName, assetCode, assetDecimals } = props;
  const cats = txn.categoryIds
    .map((id) => categories.find((c) => c.id === id))
    .filter(Boolean) as CategoryInfo[];

  const isExpense = txn.amountMinor < 0n;
  const decimals = assetDecimals ?? 2;
  const { masked } = usePrivacy();
  const maskedAmount = masked && cats.some((c) => c.hideable);

  return (
    <div className="flex items-center justify-between bg-(--surface-1) px-4 py-3">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">
          {txn.description || "No description"}
        </p>
        <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
          {accountName && (
            <span className="truncate text-[11px] text-zinc-400">{accountName}</span>
          )}
          {cats.length > 0 ? (
            cats.map((cat, i) => (
              <span
                key={`${cat.name}-${i}`}
                className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium"
                style={{ backgroundColor: cat.color, color: "#fff" }}
              >
                <Tag className="h-2.5 w-2.5" aria-hidden />
                {cat.name}
              </span>
            ))
          ) : (
            <span className="inline-flex items-center text-[11px] text-zinc-400">
              Uncategorized
            </span>
          )}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-3">
        <div className="text-right">
          <span className="text-[11px] tabular-nums text-zinc-400">{formatTime(txn.date)}</span>
          <span
            className={cn(
              "block text-sm font-semibold tabular-nums",
              maskedAmount
                ? "text-zinc-500"
                : isExpense
                  ? "text-(--danger)"
                  : "text-(--accent)",
            )}
            aria-label={maskedAmount ? "Amount hidden" : undefined}
          >
            {maskedAmount ? "••••" : formatMoney(txn.amountMinor, decimals, assetCode)}
          </span>
        </div>
      </div>
    </div>
  );
};
