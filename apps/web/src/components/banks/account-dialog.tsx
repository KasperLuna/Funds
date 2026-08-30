import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
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

interface AccountDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (account: Account) => void;
  editAccount?: Account | null;
}

interface AccountFormProps {
  onOpenChange: (open: boolean) => void;
  onSave: (account: Account) => void;
  editAccount: Account | null;
}

const accountFormSchema = z.object({
  name: z.string().trim().min(1, "Name required"),
  kind: z.enum(["bank", "cash", "wallet", "exchange"]),
  assetId: z.string().min(1, "Select asset"),
  openingBalance: z
    .string()
    .refine((s) => s === "" || /^\d+(\.\d+)?$/.test(s), "Invalid number")
    .optional(),
  primaryColor: z.string().nullable(),
});

type AccountFormValues = z.infer<typeof accountFormSchema>;

const AccountForm = ({ onOpenChange, onSave, editAccount }: AccountFormProps) => {
  const { assets } = useAssets();
  const assetOptions = assets.map((a) => ({ id: a.id, label: a.code }));

  const form = useForm<AccountFormValues>({
    resolver: zodResolver(accountFormSchema),
    mode: "onChange",
    defaultValues: {
      name: editAccount?.name ?? "",
      kind: editAccount?.kind ?? "bank",
      assetId: editAccount?.assetId ?? assets[0]?.id ?? "",
      openingBalance:
        editAccount && editAccount.openingBalanceMinor !== 0n
          ? (Number(editAccount.openingBalanceMinor) / 100).toFixed(2)
          : "",
      primaryColor: editAccount?.primaryColor ?? null,
    },
  });

  const { register, handleSubmit, watch, setValue, formState } = form;
  const name = watch("name");
  const primaryColor = watch("primaryColor");

  const isEditing = !!editAccount;

  const onSubmit = (values: AccountFormValues) => {
    const now = Date.now();
    if (editAccount) {
      onSave({
        ...editAccount,
        name: values.name.trim(),
        kind: values.kind,
        assetId: values.assetId,
        primaryColor: values.primaryColor,
        updatedAt: now,
      });
    } else {
      onSave({
        id: `acc-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
        name: values.name.trim(),
        kind: values.kind,
        assetId: values.assetId,
        openingBalanceMinor: parseMajor(values.openingBalance ?? ""),
        primaryColor: values.primaryColor,
        createdAt: now,
        updatedAt: now,
      } as Account);
    }
    onOpenChange(false);
  };

  return (
    <Sheet open onOpenChange={onOpenChange}>
      <SheetContent className="flex flex-col gap-4 p-0">
        <div className="shrink-0 px-6 pt-6">
          <SheetTitle>
            {isEditing ? "Edit account" : "New account"}
          </SheetTitle>
          <SheetDescription>
            {isEditing
              ? "Update account details."
              : "Create a new account to track transactions."}
          </SheetDescription>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4 px-6 pb-6">
          <label className="flex flex-col gap-1.5">
            <span className="text-sm text-zinc-500">Name</span>
            <input
              type="text"
              {...register("name")}
              placeholder="e.g. Main Checking"
              className={inputCls}
              autoFocus
            />
            {formState.errors.name && (
              <span className="text-xs text-(--danger)">{formState.errors.name.message}</span>
            )}
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-sm text-zinc-500">Type</span>
            <select
              {...register("kind")}
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
              {...register("assetId")}
              className={inputCls}
            >
              {assetOptions.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.label}
                </option>
              ))}
            </select>
            {formState.errors.assetId && (
              <span className="text-xs text-(--danger)">{formState.errors.assetId.message}</span>
            )}
          </label>

          {!isEditing && (
            <label className="flex flex-col gap-1.5">
              <span className="text-sm text-zinc-500">Opening balance</span>
              <input
                type="text"
                inputMode="decimal"
                {...register("openingBalance")}
                placeholder="0.00"
                className={inputCls}
              />
              {formState.errors.openingBalance && (
                <span className="text-xs text-(--danger)">{formState.errors.openingBalance.message}</span>
              )}
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
                  onClick={() => setValue("primaryColor", c, { shouldValidate: true })}
                  className={cn(
                    "h-8 w-8 rounded-full transition-transform",
                    primaryColor === c
                      ? "scale-110 ring-2 ring-(--border-strong)"
                      : "hover:scale-105",
                  )}
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
            <Button type="submit" disabled={!name?.trim()}>
              {isEditing ? "Save" : "Create"}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
};

export const AccountDialog = (props: AccountDialogProps) => {
  const { isOpen, onOpenChange, onSave, editAccount } = props;
  if (!isOpen) return null;
  return <AccountForm onOpenChange={onOpenChange} onSave={onSave} editAccount={editAccount ?? null} />;
};
