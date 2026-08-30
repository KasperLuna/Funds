import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Account } from "@/lib/accounts/accounts-store";

export type AccountConfirmAction = "archive" | "unarchive" | "delete";

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
    <AlertDialog open onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        {isDelete && (
          <div className="flex flex-col gap-1.5">
            <Label className="text-zinc-500">
              Type <span className="font-medium text-zinc-200">{account.name}</span> to confirm
            </Label>
            <Input
              type="text"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              placeholder={account.name}
              autoFocus
            />
          </div>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel asChild>
            <Button type="button" variant="ghost">
              Cancel
            </Button>
          </AlertDialogCancel>
          <AlertDialogAction
            asChild
            disabled={disabled}
            onClick={(e) => {
              e.preventDefault();
              if (!disabled) onConfirm(account);
            }}
          >
            <Button
              type="button"
              variant={isDelete ? "destructive" : "default"}
              disabled={disabled}
            >
              {confirmLabel}
            </Button>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export const AccountConfirmDialog = (props: AccountConfirmDialogProps) => {
  const { account, action, onOpenChange, onConfirm } = props;
  if (!account || !action) return null;
  return <AccountConfirmForm account={account} action={action} onOpenChange={onOpenChange} onConfirm={onConfirm} />;
};
