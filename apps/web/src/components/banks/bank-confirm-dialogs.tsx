import { useState } from "react";
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

interface AccountConfirmDialogProps {
  account: Account | null;
  action: AccountConfirmAction | null;
  onOpenChange: (open: boolean) => void;
  onConfirm: (account: Account) => void;
}

interface AccountConfirmFormProps {
  account: Account;
  action: AccountConfirmAction;
  onOpenChange: (open: boolean) => void;
  onConfirm: (account: Account) => void;
}

interface ActionCopy {
  title: string;
  description: string;
  confirmLabel: string;
}

function getActionCopy(action: AccountConfirmAction): ActionCopy {
  if (action === "delete") {
    return {
      title: "Delete account?",
      description: "This permanently hides the account and its transactions. This cannot be undone.",
      confirmLabel: "Delete",
    };
  }
  if (action === "unarchive") {
    return {
      title: "Unarchive account?",
      description: "This restores the account and its transactions to your active views and net worth.",
      confirmLabel: "Unarchive",
    };
  }
  return {
    title: "Archive account?",
    description: "This account and its transactions will be hidden from all views and excluded from your net worth. You can unarchive it later.",
    confirmLabel: "Archive",
  };
}

const AccountConfirmForm = ({
  account,
  action,
  onOpenChange,
  onConfirm,
}: AccountConfirmFormProps) => {
  const [typed, setTyped] = useState("");
  const isDelete = action === "delete";
  const { title, description, confirmLabel } = getActionCopy(action);
  const disabled = isDelete && typed.trim() !== account.name;

  return (
    <Dialog open onOpenChange={onOpenChange}>
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
};

export const AccountConfirmDialog = (props: AccountConfirmDialogProps) => {
  const { account, action, onOpenChange, onConfirm } = props;
  if (!account || !action) return null;
  return <AccountConfirmForm account={account} action={action} onOpenChange={onOpenChange} onConfirm={onConfirm} />;
};
