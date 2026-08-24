import { Pencil, Trash2, Archive, ArchiveRestore, Scale } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/money";

import type { Account } from "@/lib/accounts/accounts-store";

const KIND_LABEL: Record<Account["kind"], string> = {
  bank: "Bank",
  cash: "Cash",
  wallet: "Wallet",
  exchange: "Exchange",
};

export function AccountCard({
  account,
  balance,
  assetCode,
  assetDecimals,
  onRename,
  onDelete,
  onArchive,
  onAdjust,
}: {
  account: Account;
  balance: bigint;
  assetCode?: string;
  assetDecimals?: number;
  onRename: (account: Account) => void;
  onDelete: (account: Account) => void;
  onArchive?: (account: Account) => void;
  onAdjust?: (account: Account) => void;
}) {
  const isArchived = !!account.deletedAt;
  const colorStyle = account.primaryColor
    ? { backgroundColor: account.primaryColor }
    : undefined;

  return (
    <div
      className={`flex items-center justify-between rounded-(--radius-lg) border border-(--border) bg-(--surface-1) px-4 py-3 ${isArchived ? "opacity-60" : ""}`}
    >
      <div className="flex items-center gap-3 min-w-0">
        <span
          className="h-4 w-4 shrink-0 rounded-full"
          style={colorStyle}
          aria-hidden
        />
        <div className="flex flex-col min-w-0">
          <span className="truncate text-sm font-medium">{account.name}</span>
          <span className="text-xs text-zinc-500">
            {KIND_LABEL[account.kind]}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold tabular-nums">
          {formatMoney(balance, assetDecimals ?? 2, assetCode)}
        </span>
        {onAdjust && (
          <Button
            variant="ghost"
            size="sm"
            aria-label={`Adjust ${account.name} balance`}
            onClick={() => onAdjust(account)}
          >
            <Scale className="h-4 w-4" />
          </Button>
        )}
        <Button
          variant="ghost"
          size="sm"
          aria-label={`Rename ${account.name}`}
          onClick={() => onRename(account)}
        >
          <Pencil className="h-4 w-4" />
        </Button>
        {onArchive && (
          <Button
            variant="ghost"
            size="sm"
            aria-label={isArchived ? `Unarchive ${account.name}` : `Archive ${account.name}`}
            onClick={() => onArchive(account)}
          >
            {isArchived ? (
              <ArchiveRestore className="h-4 w-4" />
            ) : (
              <Archive className="h-4 w-4" />
            )}
          </Button>
        )}
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
