"use client";

import { useState } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SegmentedControl } from "@/components/ui/segmented";
import { AmountInput } from "@/components/capture/amount-input";
import { CategoryChipSelect } from "./category-chip-select";
import { Keypad, type DigitKey } from "./keypad";
import { InlineCategoryForm } from "./inline-category-form";
import type { AccountOption, CategoryOption } from "./capture-sheet";
import type { Category } from "@/lib/categories/categories-store";
import { useSyncStore } from "@/lib/sync/sync-store";
import {
  emptyAmount,
  digit as applyDigit,
  backspace,
  clearAmount,
  amountToMinor,
  sanitizeAmountInput,
  presetDate,
  buildTransferRows,
  validateTransfer,
  type AmountState,
  type TransferForm as TransferFormData,
  type TransferRows,
} from "@/lib/capture";

function parseFeeToMinor(input: string, decimals: number): bigint {
  const trimmed = input.trim();
  if (!trimmed) return 0n;
  const value = Number(trimmed);
  if (!Number.isFinite(value) || value < 0) return 0n;
  return BigInt(Math.round(value * 10 ** decimals));
}

function formatMinor(minor: bigint, decimals: number): string {
  // cavetail: display-only formatting, not arithmetic
  // eslint-disable-next-line local/no-money-float
  return `${(Number(minor) / 10 ** decimals).toFixed(decimals)}`;
}

const transferFormSchema = z
  .object({
    fromId: z.string().min(1, "Select origin account"),
    toId: z.string().min(1, "Select destination account"),
    amountInput: z
      .string()
      .refine(
        (s) => s !== "" && !isNaN(Number(s)) && Number(s) > 0,
        "Enter a valid amount",
      ),
    description: z.string().max(500),
    datePreset: z.enum(["today", "yesterday"]),
    categoryIds: z.array(z.string()),
    feeInput: z.string(),
  })
  .refine((d) => d.fromId !== d.toId, {
    message: "Origin and destination must differ",
    path: ["toId"],
  });

type TransferFormValues = z.infer<typeof transferFormSchema>;

export interface TransferFormProps {
  onOpenChange: (isOpen: boolean) => void;
  accounts: AccountOption[];
  categories: CategoryOption[];
  onSave: (rows: TransferRows) => void;
  onCreateCategory?: (c: Category) => void;
  defaultFromAccountId?: string;
}

export const TransferForm = ({
  onOpenChange,
  accounts,
  categories,
  onSave,
  onCreateCategory,
  defaultFromAccountId,
}: TransferFormProps) => {
  const userId = useSyncStore((s) => s.userId);
  const uid = userId ?? "dev-user";
  const first = accounts[0];
  const second = accounts[1] ?? accounts[0];

  const form = useForm<TransferFormValues>({
    resolver: zodResolver(transferFormSchema),
    mode: "onChange",
    defaultValues: {
      fromId: defaultFromAccountId ?? first?.id ?? "",
      toId: second?.id ?? "",
      amountInput: "",
      description: "",
      datePreset: "today",
      categoryIds: [],
      feeInput: "",
    },
  });

  const { watch, setValue, handleSubmit } = form;
  const fromId = watch("fromId");
  const toId = watch("toId");
  const description = watch("description");
  const datePreset = watch("datePreset");
  const categoryIds = watch("categoryIds");
  const feeInput = watch("feeInput") ?? "";

  const [amount, setAmountRaw] = useState<AmountState>(() =>
    emptyAmount(first?.decimals ?? 2),
  );
  const setAmount = (updater: AmountState | ((s: AmountState) => AmountState)) => {
    setAmountRaw((prev) => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      setValue("amountInput", next.input, { shouldValidate: true });
      return next;
    });
  };
  const [error, setError] = useState<string | null>(null);
  const [creatingCategory, setCreatingCategory] = useState(false);

  const from = accounts.find((a) => a.id === fromId);
  const to = accounts.find((a) => a.id === toId);
  const decimals = from?.decimals ?? 2;

  const handleKey = (key: DigitKey) => setAmount((s) => applyDigit(s, key));
  const minor = amountToMinor(amount);
  const feeMinor = parseFeeToMinor(feeInput, decimals);

  const transferForm: TransferFormData = {
    fromAccountId: fromId,
    fromAssetId: from?.assetId ?? "",
    toAccountId: toId,
    toAssetId: to?.assetId ?? "",
    amountMinor: minor,
    feeMinor,
    userId: uid,
    description,
    date: presetDate(datePreset),
    categoryIds,
  };
  const validation = validateTransfer(transferForm);
  const canSave = minor > 0n && validation === null;

  const ctaLabel = canSave
    ? "Transfer"
    : fromId === toId
      ? (validation ?? "")
      : "Enter amount";

  const save = () => {
    if (!canSave) {
      setError(validation);
      return;
    }
    onSave(buildTransferRows(transferForm));
    onOpenChange(false);
  };

  const onSubmit = () => {
    save();
  };

  const sortedAccounts = [...accounts].sort((a, b) =>
    a.name.localeCompare(b.name),
  );

  return (
    <Sheet open onOpenChange={onOpenChange}>
      <SheetContent className="flex flex-col p-0">
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 pt-6 pb-3">
          <SheetTitle>Transfer</SheetTitle>
          <SheetDescription>Moves money between two accounts</SheetDescription>

          <div className="mt-3 flex items-center gap-1.5">
            <Select
              value={fromId || "__placeholder__"}
              onValueChange={(v) => {
                const next = v === "__placeholder__" ? "" : v;
                setValue("fromId", next, { shouldValidate: true });
                setAmount(
                  emptyAmount(
                    accounts.find((a) => a.id === next)?.decimals ?? 2,
                  ),
                );
              }}
            >
              <SelectTrigger
                aria-label="From account"
                className="h-11 min-w-0 flex-1"
              >
                <SelectValue placeholder="From account" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__placeholder__" disabled>
                  From account
                </SelectItem>
                {sortedAccounts.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span aria-hidden className="text-zinc-500">
              →
            </span>
            <Select
              value={toId || "__placeholder__"}
              onValueChange={(v) =>
                setValue("toId", v === "__placeholder__" ? "" : v, {
                  shouldValidate: true,
                })
              }
            >
              <SelectTrigger
                aria-label="To account"
                className="h-11 min-w-0 flex-1"
              >
                <SelectValue placeholder="To account" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__placeholder__" disabled>
                  To account
                </SelectItem>
                {sortedAccounts.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <SegmentedControl
            className="mt-3"
            options={[
              { value: "today", label: "Today" },
              { value: "yesterday", label: "Yesterday" },
            ]}
            value={datePreset}
            onChange={(v) =>
              setValue("datePreset", v, { shouldValidate: true })
            }
          />

          <input
            aria-label="Description"
            className="mt-3 h-11 w-full rounded-(--radius-md) border border-(--border) bg-(--surface-2) px-3 text-sm text-zinc-200 placeholder:text-zinc-500"
            placeholder="Description (optional)"
            value={description}
            onChange={(e) =>
              setValue("description", e.target.value, { shouldValidate: true })
            }
          />

          {(categories.length > 0 || onCreateCategory) && (
            <div className="mt-3 flex flex-col gap-2">
              <CategoryChipSelect
                categories={categories}
                value={categoryIds}
                onChange={(next) =>
                  setValue("categoryIds", next, { shouldValidate: true })
                }
                onCreateCategory={
                  onCreateCategory && !creatingCategory
                    ? () => setCreatingCategory(true)
                    : undefined
                }
              />
              {creatingCategory && onCreateCategory && (
                <InlineCategoryForm
                  onSubmit={(values) => {
                    const now = Date.now();
                    const created: Category = {
                      id: `cat-${now.toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
                      name: values.name.trim(),
                      color: values.color,
                      hideable: false,
                      excludeFromAnalytics: false,
                      monthlyBudgetMinor: null,
                      assetId: null,
                      createdAt: now,
                      updatedAt: now,
                    };
                    onCreateCategory(created);
                    if (!categoryIds.includes(created.id)) {
                      setValue("categoryIds", [...categoryIds, created.id], {
                        shouldValidate: true,
                      });
                    }
                    setCreatingCategory(false);
                  }}
                  onCancel={() => setCreatingCategory(false)}
                />
              )}
            </div>
          )}

          <AmountInput
            className="mt-3"
            assetCode={
              from?.assetCode ?? from?.assetId?.slice(0, 3).toUpperCase()
            }
            tone="foreground"
            value={amount.input}
            // cavetail: display-only formatting, not arithmetic
            display={formatMinor(minor, decimals)}
            onChange={(v) =>
              setAmount((s) => ({
                ...s,
                input: sanitizeAmountInput(v, s.decimals),
              }))
            }
            sanitize={(v) => v}
            decimals={decimals}
            aria-label="Amount"
          />

          <input
            aria-label="Fee"
            inputMode="decimal"
            className="mt-3 h-11 w-full rounded-(--radius-md) border border-(--border) bg-(--surface-2) px-3 text-sm text-zinc-200 placeholder:text-zinc-500"
            placeholder="Fee (optional)"
            value={feeInput}
            onChange={(e) =>
              setValue("feeInput", e.target.value, { shouldValidate: true })
            }
          />
          <p aria-live="polite" className="mt-2 text-xs text-zinc-500">
            {feeMinor > 0n
              ? `Fee ${formatMinor(feeMinor, decimals)} is deducted from ${from?.name ?? "origin"} in addition to the transferred amount.`
              : "No fee. Both legs post the same amount."}
          </p>

          {error && (
            <p role="alert" className="mt-2 text-xs text-(--danger)">
              {error}
            </p>
          )}
        </div>

        <div className="shrink-0 border-t border-(--border) bg-(--plate-1) px-6 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 sm:hidden">
          <Keypad
            onKey={handleKey}
            onBackspace={() => setAmount(backspace)}
            onClear={() => setAmount(clearAmount)}
            onSave={save}
            canSave={canSave}
          />
        </div>

        <div className="hidden shrink-0 border-t border-(--border) bg-(--plate-1) px-6 py-4 sm:block rounded-b-lg">
          <Button
            size="lg"
            className="w-full"
            disabled={!canSave}
            onClick={handleSubmit(onSubmit)}
          >
            {ctaLabel}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};
