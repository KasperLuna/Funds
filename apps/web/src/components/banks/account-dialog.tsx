import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogContentTitle,
  DialogContentDescription,
} from "@/components/ui/dialog";
import type { Account } from "@/lib/accounts/accounts-store";

type Kind = Account["kind"];

const KIND_OPTIONS: { value: Kind; label: string }[] = [
  { value: "bank", label: "Bank" },
  { value: "cash", label: "Cash" },
  { value: "wallet", label: "Wallet" },
  { value: "exchange", label: "Exchange" },
];

export function AccountDialog({
  open,
  onOpenChange,
  onSave,
  editAccount,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (account: Account) => void;
  editAccount?: Account | null;
}) {
  const [name, setName] = useState("");
  const [kind, setKind] = useState<Kind>("bank");

  useEffect(() => {
    if (open) {
      if (editAccount) {
        setName(editAccount.name);
        setKind(editAccount.kind);
      } else {
        setName("");
        setKind("bank");
      }
    }
  }, [open, editAccount]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    const now = Date.now();
    if (editAccount) {
      onSave({ ...editAccount, name: trimmed, kind, updatedAt: now });
    } else {
      onSave({
        id: crypto.randomUUID(),
        name: trimmed,
        kind,
        assetId: "ast-1",
        openingBalanceMinor: 0n,
        createdAt: now,
        updatedAt: now,
      } as Account);
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogContentTitle>
          {editAccount ? "Rename account" : "New account"}
        </DialogContentTitle>
        <DialogContentDescription>
          {editAccount
            ? "Update the account name and type."
            : "Create a new account to track transactions."}
        </DialogContentDescription>
        <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-4">
          <label className="flex flex-col gap-1.5">
            <span className="text-sm text-slate-400">Name</span>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Main Checking"
              className="h-11 rounded-(--radius-md) border border-(--border) bg-(--surface-2) px-3 text-sm focus-visible:ring-2 focus-visible:ring-(--accent) focus-visible:outline-none"
              autoFocus
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-sm text-slate-400">Type</span>
            <select
              value={kind}
              onChange={(e) => setKind(e.target.value as Kind)}
              className="h-11 rounded-(--radius-md) border border-(--border) bg-(--surface-2) px-3 text-sm focus-visible:ring-2 focus-visible:ring-(--accent) focus-visible:outline-none"
            >
              {KIND_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!name.trim()}>
              {editAccount ? "Save" : "Create"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
