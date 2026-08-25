import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogContentTitle,
  DialogContentDescription,
} from "@/components/ui/dialog";
import type { Account } from "@/lib/accounts/accounts-store";

export type AccountConfirmAction = "archive" | "unarchive" | "delete";

const inputCls =
  "h-11 rounded-(--radius-md) border border-(--border) bg-(--surface-2) px-3 text-sm text-zinc-200 placeholder:text-zinc-500 focus-visible:ring-2 focus-visible:ring-(--accent) focus-visible:outline-none";

export function AccountConfirmDialog({
  account,
  action,
  onOpenChange,
  onConfirm,
}: {
  account: Account | null;
  action: AccountConfirmAction | null;
  onOpenChange: (open: boolean) => void;
  onConfirm: (account: Account) => void;
}) {
  const [typed, setTyped] = useState("");
  const open = account != null && action != null;

  useEffect(() => {
    if (!open) setTyped("");
  }, [open, account?.id]);

  if (!account || !action) return null;

  const isDelete = action === "delete";
  const isUnarchive = action === "unarchive";

  const title = isDelete
    ? "Delete account?"
    : isUnarchive
      ? "Unarchive account?"
      : "Archive account?";

  const description = isDelete
    ? "This permanently hides the account and its transactions. This cannot be undone."
    : isUnarchive
      ? "This restores the account and its transactions to your active views and net worth."
      : "This account and its transactions will be hidden from all views and excluded from your net worth. You can unarchive it later.";

  const confirmLabel = isDelete ? "Delete" : isUnarchive ? "Unarchive" : "Archive";
  const disabled = isDelete && typed.trim() !== account.name;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogContentTitle>{title}</DialogContentTitle>
        <DialogContentDescription>{description}</DialogContentDescription>
        {isDelete && (
          <label className="mt-4 flex flex-col gap-1.5">
            <span className="text-sm text-zinc-500">
              Type <span className="font-medium text-zinc-200">{account.name}</span> to confirm
            </span>
            <input
              type="text"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              placeholder={account.name}
              className={inputCls}
              autoFocus
            />
          </label>
        )}
        <div className="mt-4 flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            variant={isDelete ? "destructive" : "primary"}
            disabled={disabled}
            onClick={() => onConfirm(account)}
          >
            {confirmLabel}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
