import type { Txn } from "@/lib/accounts/accounts-store";
import { TransactionRow } from "@/components/banks/transaction-row";
import { ReceiptText } from "lucide-react";

type CategoryInfo = { id: string; name: string; color: string };

export type RecentActivityProps = {
  txns: Txn[];
  categories: CategoryInfo[];
};

export function RecentActivity({ txns, categories }: RecentActivityProps) {
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
          <p className="max-w-md text-sm text-slate-400">
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
      <div className="px-4 pt-4 pb-2">
        <h2 className="text-sm font-semibold">Recent activity</h2>
      </div>
      <div className="divide-y divide-(--border)">
        {txns.map((txn) => (
          <TransactionRow key={txn.id} txn={txn} categories={categories} />
        ))}
      </div>
    </section>
  );
}
