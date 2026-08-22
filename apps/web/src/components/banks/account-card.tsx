import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

import type { Account } from "@/lib/accounts/accounts-store";

const KIND_LABEL: Record<Account["kind"], string> = {
  bank: "Bank",
  cash: "Cash",
  wallet: "Wallet",
  exchange: "Exchange",
};

function formatMinor(cents: bigint): string {
  const sign = cents < 0n ? "-" : "";
  const abs = cents < 0n ? -cents : cents;
  const major = Number(abs) / 100;
  return `${sign}$${major.toFixed(2)}`;
}

export function AccountCard({
  account,
  balance,
  onRename,
  onDelete,
}: {
  account: Account;
  balance: bigint;
  onRename: (account: Account) => void;
  onDelete: (account: Account) => void;
}) {
  return (
    <div className="flex items-center justify-between rounded-(--radius-lg) border border-(--border) bg-(--surface-1) px-4 py-3">
      <div className="flex items-center gap-3 min-w-0">
        <span className="truncate text-sm font-medium">{account.name}</span>
        <span className="shrink-0 rounded-full bg-(--surface-2) px-2 py-0.5 text-xs text-slate-400">
          {KIND_LABEL[account.kind]}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-sm tabular-nums">{formatMinor(balance)}</span>
        <Button
          variant="ghost"
          size="sm"
          aria-label={`Rename ${account.name}`}
          onClick={() => onRename(account)}
        >
          <Pencil className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          aria-label={`Delete ${account.name}`}
          onClick={() => onDelete(account)}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
