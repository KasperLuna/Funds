import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogContentTitle,
  DialogContentDescription,
} from "@/components/ui/dialog";
import type { Account } from "@/lib/accounts/accounts-store";
import { useAssets } from "@/lib/assets";

type Kind = Account["kind"];

const KIND_OPTIONS: { value: Kind; label: string }[] = [
  { value: "bank", label: "Bank" },
  { value: "cash", label: "Cash" },
  { value: "wallet", label: "Wallet" },
  { value: "exchange", label: "Exchange" },
];

const COLOR_PRESETS = [
  "#6366f1",
  "#8b5cf6",
  "#ec4899",
  "#ef4444",
  "#f97316",
  "#eab308",
  "#22c55e",
  "#14b8a6",
  "#06b6d4",
  "#3b82f6",
  "#64748b",
  "#a855f7",
];

function parseMajor(val: string): bigint {
  const n = Number(val);
  if (!Number.isFinite(n)) return 0n;
  return BigInt(Math.round(n * 100));
}

const inputCls =
  "h-11 rounded-(--radius-md) border border-(--border) bg-(--surface-2) px-3 text-sm text-zinc-200 placeholder:text-zinc-500 focus-visible:ring-2 focus-visible:ring-(--accent) focus-visible:outline-none";

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
  const { assets } = useAssets();
  const assetOptions = assets.map((a) => ({ id: a.id, label: a.code }));
  const [name, setName] = useState("");
  const [kind, setKind] = useState<Kind>("bank");
  const [assetId, setAssetId] = useState("");
  const [openingBalance, setOpeningBalance] = useState("");
  const [primaryColor, setPrimaryColor] = useState<string | null>(null);

  useEffect(() => {
    if (open) {

      if (editAccount) {
        setName(editAccount.name);
        setKind(editAccount.kind);
        setAssetId(editAccount.assetId);
        setOpeningBalance(
          editAccount.openingBalanceMinor !== 0n
            ? (Number(editAccount.openingBalanceMinor) / 100).toFixed(2)
            : "",
        );
        setPrimaryColor(editAccount.primaryColor ?? null);
      } else {
        setName("");
        setKind("bank");
        setAssetId(assets[0]?.id ?? "");
        setOpeningBalance("");
        setPrimaryColor(null);
      }
    }
  }, [open, editAccount, assets]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    const now = Date.now();
    if (editAccount) {
      onSave({
        ...editAccount,
        name: trimmed,
        kind,
        assetId,
        primaryColor,
        updatedAt: now,
      });
    } else {
      onSave({
        id: `acc-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
        name: trimmed,
        kind,
        assetId,
        openingBalanceMinor: parseMajor(openingBalance),
        primaryColor,
        createdAt: now,
        updatedAt: now,
      } as Account);
    }
    onOpenChange(false);
  };

  const isEditing = !!editAccount;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogContentTitle>
          {isEditing ? "Edit account" : "New account"}
        </DialogContentTitle>
        <DialogContentDescription>
          {isEditing
            ? "Update account details."
            : "Create a new account to track transactions."}
        </DialogContentDescription>
        <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-4">
          <label className="flex flex-col gap-1.5">
            <span className="text-sm text-zinc-500">Name</span>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Main Checking"
              className={inputCls}
              autoFocus
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-sm text-zinc-500">Type</span>
            <select
              value={kind}
              onChange={(e) => setKind(e.target.value as Kind)}
              className={inputCls}
            >
              {KIND_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-sm text-zinc-500">Asset</span>
            <select
              value={assetId}
              onChange={(e) => setAssetId(e.target.value)}
              className={inputCls}
            >
              {assetOptions.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>

          {!isEditing && (
            <label className="flex flex-col gap-1.5">
              <span className="text-sm text-zinc-500">Opening balance</span>
              <input
                type="text"
                inputMode="decimal"
                value={openingBalance}
                onChange={(e) => setOpeningBalance(e.target.value)}
                placeholder="0.00"
                className={inputCls}
              />
            </label>
          )}

          <label className="flex flex-col gap-1.5">
            <span className="text-sm text-zinc-500">Color</span>
            <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Account color">
              {COLOR_PRESETS.map((c) => (
                <button
                  key={c}
                  type="button"
                  role="radio"
                  aria-checked={primaryColor === c}
                  aria-label={c}
                  onClick={() => setPrimaryColor(c)}
                  className={`h-8 w-8 rounded-full transition-transform ${
                    primaryColor === c
                      ? "scale-110 ring-2 ring-(--border-strong)"
                      : "hover:scale-105"
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
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
              {isEditing ? "Save" : "Create"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
