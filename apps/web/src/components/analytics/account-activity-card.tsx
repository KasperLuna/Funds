"use client";

import { Star } from "lucide-react";
import { formatMoney } from "@/lib/money";
import { usePrivacyStore } from "@/lib/privacy/privacy-store";
import type { AccountActivity } from "@/lib/analytics/compute";
import type { AssetInfo } from "@/app/dashboard/analytics/analytics-screen";

interface AccountActivityCardProps {
  data: AccountActivity[];
  accountInfo: Record<string, AssetInfo>;
  /** Account receiving the most income this month, if any. */
  topInflowAccountId: string | null;
  monthLabel?: string;
}

export const AccountActivityCard = ({
  data,
  accountInfo,
  topInflowAccountId,
  monthLabel,
}: AccountActivityCardProps) => {
  const masked = usePrivacyStore((s) => s.masked);
  const maxCount = data.reduce((m, a) => Math.max(m, a.count), 0);

  return (
    <section
      aria-label="Transactions per account"
      className="rounded-(--radius-lg) border border-(--border) bg-(--surface-1) p-6"
    >
      <p className="label-micro">Per account{monthLabel ? ` · ${monthLabel}` : ""}</p>

      {data.length === 0 ? (
        <p className="mt-4 text-sm text-zinc-500">No transactions this month</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {data.map((a) => {
            const info = accountInfo[a.accountId];
            const decimals = info?.decimals ?? 2;
            const code = info?.code;
            return (
              <li key={a.accountId}>
                <div className="flex items-center justify-between gap-3">
                  <span className="flex min-w-0 items-center gap-1.5 truncate text-sm">
                    <span className="truncate">{a.name}</span>
                    {a.accountId === topInflowAccountId ? (
                      <Star
                        aria-label="Top income account"
                        className="h-3.5 w-3.5 shrink-0 fill-(--accent) text-(--accent)"
                      />
                    ) : null}
                  </span>
                  <span className="shrink-0 text-sm font-semibold tabular-nums">
                    {a.count} {a.count === 1 ? "txn" : "txns"}
                  </span>
                </div>
                <div
                  aria-hidden
                  className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-(--surface-3)"
                >
                  <div
                    className="h-full rounded-full bg-(--accent)"
                    style={{ width: maxCount > 0 ? `${(a.count / maxCount) * 100}%` : "0%" }}
                  />
                </div>
                <p className="mt-1 text-xs tabular-nums text-zinc-500">
                  {masked ? (
                    "••••"
                  ) : (
                    <>
                      <span className="text-(--accent)">
                        +{formatMoney(a.inflow, decimals, code)}
                      </span>{" "}
                      ·{" "}
                      <span className="text-(--danger)">
                        −{formatMoney(a.outflow, decimals, code)}
                      </span>
                    </>
                  )}
                </p>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
};
