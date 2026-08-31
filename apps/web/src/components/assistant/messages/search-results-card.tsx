"use client";

import { Search } from "lucide-react";
import { formatMoney } from "@/lib/money";
import { usePrivacyStore } from "@/lib/privacy/privacy-store";
import { GenUiFooter } from "../gen-ui-footer";
import { DataScopeBadge } from "./data-scope-badge";
import type { SearchResultsPayload } from "@/lib/assistant/types";
import { cn } from "@/lib/utils";

interface SearchResultsCardProps {
  payload: SearchResultsPayload;
  onViewData?: () => void;
}

/**
 * Free-text search over transaction descriptions. Surfaces up to N hits
 * with date, amount, category and account. Used for intents the assets-page
 * filters cannot express — e.g. "what was my payroll this month" when the
 * matching key is the txn `description` ("Payroll Corp") not the category
 * ("Work"). The resolver decides the pattern; the executor runs the filter.
 */
export const SearchResultsCard = ({ payload, onViewData }: SearchResultsCardProps) => {
  const masked = usePrivacyStore((s) => s.masked);
  const total = BigInt(payload.totalMinor);

  return (
    <section
      aria-label="Transaction search"
      className="rounded-(--radius-lg) border border-(--border) bg-(--surface-1) p-4"
    >
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="inline-flex items-center gap-1.5 text-sm font-semibold text-zinc-300">
          <Search className="h-3.5 w-3.5" aria-hidden />
          “{payload.query}”
          {payload.category && (
            <span className="text-xs font-normal text-zinc-500">
              in {payload.category}
            </span>
          )}
        </h3>
        <DataScopeBadge scope={payload.scope} />
      </div>
      <p className="text-xs text-zinc-500">
        {payload.periodLabel} · {payload.count} match
        {payload.count === 1 ? "" : "es"}
      </p>
      <p className="mt-1 font-display text-2xl font-bold tracking-tight">
        {masked
          ? "••••"
          : formatMoney(total, payload.decimals, payload.assetCode)}
      </p>

      {payload.hits.length > 0 && (
        <ul className="mt-3 divide-y divide-(--border)">
          {payload.hits.map((h) => (
            <li key={h.txnId} className="flex items-baseline justify-between gap-2 py-1.5 text-xs">
              <div className="min-w-0">
                <div className="truncate text-zinc-200">{h.description}</div>
                <div className="text-[10px] text-zinc-500">
                  {h.dateLabel}
                  {h.categoryName && ` · ${h.categoryName}`}
                  {h.accountName && ` · ${h.accountName}`}
                </div>
              </div>
              <span
                className={cn(
                  "shrink-0 tabular-nums",
                  BigInt(h.amountMinor) < 0n ? "text-(--danger)" : "text-(--accent)",
                )}
              >
                {masked
                  ? "••••"
                  : formatMoney(BigInt(h.amountMinor), payload.decimals, payload.assetCode)}
              </span>
            </li>
          ))}
        </ul>
      )}

      <GenUiFooter updatedAt={Date.now()} onViewData={onViewData} />
    </section>
  );
};
