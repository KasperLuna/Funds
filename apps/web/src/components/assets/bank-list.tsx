"use client";

import { Plus } from "lucide-react";
import type { Account } from "@/lib/accounts/accounts-store";
import { cn } from "@/lib/utils";

export interface BankListProps {
  accounts: Account[];
  archivedAccounts: Account[];
  selectedAccountId: string | null;
  showArchived: boolean;
  onSelectAll: () => void;
  onSelectAccount: (id: string) => void;
  onNewAccount: () => void;
  onToggleArchived: () => void;
}

export const BankList = ({
  accounts,
  archivedAccounts,
  selectedAccountId,
  showArchived,
  onSelectAll,
  onSelectAccount,
  onNewAccount,
  onToggleArchived,
}: BankListProps) => {
  return (
    <div className="flex flex-wrap items-center gap-2 pb-1">
      <button
        onClick={onSelectAll}
        className={cn(
          "shrink-0 min-h-11 rounded-md border px-3 py-1.5 text-sm font-medium transition-colors",
          selectedAccountId === null
            ? "border-(--accent) bg-(--accent) text-(--accent-foreground)"
            : "border-(--border) bg-(--surface-2) text-zinc-500 hover:text-inherit",
        )}
      >
        All
      </button>
      {[...accounts]
        .filter((a) => !a.deletedAt)
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((a) => (
          <button
            key={a.id}
            onClick={() => onSelectAccount(a.id)}
            className={cn(
              "shrink-0 min-h-11 rounded-md border px-3 py-1.5 text-sm font-medium transition-colors",
              selectedAccountId === a.id
                ? "border-(--accent) bg-(--accent) text-(--accent-foreground)"
                : "border-(--border) bg-(--surface-2) text-zinc-500 hover:text-inherit",
            )}
          >
            {a.name}
          </button>
        ))}
      <button
        onClick={onNewAccount}
        aria-label="New account"
        className="inline-flex min-h-11 shrink-0 items-center gap-1 rounded-md border border-dashed border-(--border-strong) px-3 py-1.5 text-sm font-medium text-zinc-400 transition-colors hover:text-inherit"
      >
        <Plus className="h-4 w-4" aria-hidden />
        New
      </button>
      {archivedAccounts.length > 0 && (
        <button
          onClick={onToggleArchived}
          aria-label={showArchived ? "Hide archived accounts" : "Show archived accounts"}
          aria-pressed={showArchived}
          className={cn(
            "shrink-0 min-h-11 rounded-md border px-3 py-1.5 text-sm font-medium transition-colors",
            showArchived
              ? "border-(--accent) bg-(--accent) text-(--accent-foreground)"
              : "border-(--border) bg-(--surface-2) text-zinc-500 hover:text-inherit",
          )}
        >
          Archived ({archivedAccounts.length})
        </button>
      )}
    </div>
  );
};
