"use client";

import Link from "next/link";
import type { Txn } from "@/lib/accounts/accounts-store";
import { TransactionRowReadonly } from "@/components/banks/transaction-row-readonly";
import { ReceiptText } from "lucide-react";

type CategoryInfo = { id: string; name: string; color: string; hideable: boolean };

export type AccountDisplay = {
  name: string;
  code: string;
  decimals: number;
};

interface RecentActivityProps {
  txns: Txn[];
  categories: CategoryInfo[];
  accounts?: Record<string, AccountDisplay>;
}

export const RecentActivity = ({
  txns,
  categories,
  accounts,
}: RecentActivityProps) => {
  if (txns.length === 0) {
    return (
      <section
        aria-label="Recent activity"
        className="rounded-(--radius-lg) border border-(--border) bg-(--surface-1) p-6"
      >
        <div className="flex flex-col items-center gap-2 text-center">
          <div className="text-(--accent)" aria-hidden>
            <ReceiptText className="h-8 w-8" />
          </div>
          <h2 className="text-base font-semibold">No activity yet</h2>
          <p className="max-w-md text-sm text-zinc-500">
            Your recent transactions will appear here.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section
      aria-label="Recent activity"
      className="rounded-(--radius-lg) border border-(--border) bg-(--surface-1)"
    >
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <h2 className="font-display text-base font-bold tracking-tight">Recent activity</h2>
      </div>
      <div className="divide-y divide-(--border)">
        {txns.map((txn) => {
          const acc = accounts?.[txn.accountId];
          return (
            <Link
              key={txn.id}
              href={`/dashboard/assets?tab=banks&txn=${txn.id}`}
              className="block transition-colors hover:bg-(--surface-3)/40"
            >
              <TransactionRowReadonly
                txn={txn}
                categories={categories}
                accountName={acc?.name}
                assetCode={acc?.code}
                assetDecimals={acc?.decimals}
              />
            </Link>
          );
        })}
      </div>
    </section>
  );
};
