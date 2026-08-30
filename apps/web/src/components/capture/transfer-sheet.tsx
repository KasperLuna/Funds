import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { SegmentedControl } from "@/components/ui/segmented";
import { AmountInput } from "@/components/capture/amount-input";
import { CategoryChipSelect } from "./category-chip-select";
import { Keypad, type DigitKey } from "./keypad";
import type { AccountOption, CategoryOption } from "./capture-sheet";
import type { Category } from "@/lib/categories/categories-store";
import { DEFAULT_CATEGORY_COLORS } from "@/lib/categories/categories-store";
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
  type TransferForm,
  type TransferRows,
} from "@/lib/capture";
import { cn } from "@/lib/utils";

export interface TransferSheetProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  userId: string;
  accounts: AccountOption[];
  categories?: CategoryOption[];
  onSave: (rows: TransferRows) => void;
  onCreateCategory?: (c: Category) => void;
  defaultFromAccountId?: string;
}

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
    amountInput: z.string().refine((s) => s !== "" && !isNaN(Number(s)) && Number(s) > 0, "Enter a valid amount"),
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

interface TransferFormProps {
  onOpenChange: (isOpen: boolean) => void;
  userId: string;
  accounts: AccountOption[];
  categories: CategoryOption[];
  onSave: (rows: TransferRows) => void;
  onCreateCategory?: (c: Category) => void;
  defaultFromAccountId?: string;
}

const inlineCategorySchema = z.object({
  name: z.string().trim().min(1, "Name required"),
  color: z.string().min(1),
});
type InlineCategoryValues = z.infer<typeof inlineCategorySchema>;

const TransferForm = ({ onOpenChange, userId, accounts, categories, onSave, onCreateCategory, defaultFromAccountId }: TransferFormProps) => {
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

  const [amount, setAmount] = useState<AmountState>(() => emptyAmount(first?.decimals ?? 2));
  const [error, setError] = useState<string | null>(null);
  const [creatingCategory, setCreatingCategory] = useState(false);
  const inlineForm = useForm<InlineCategoryValues>({
    resolver: zodResolver(inlineCategorySchema),
    mode: "onChange",
    defaultValues: {
      name: "",
      color: DEFAULT_CATEGORY_COLORS[0]!,
    },
  });
  const newName = inlineForm.watch("name") ?? "";
  const newColor = inlineForm.watch("color") ?? DEFAULT_CATEGORY_COLORS[0]!;

  const startCreating = () => {
    inlineForm.reset({ name: "", color: DEFAULT_CATEGORY_COLORS[0]! });
    setCreatingCategory(true);
  };
  const cancelCreating = () => setCreatingCategory(false);
  const submitInlineCategory = (values: InlineCategoryValues) => {
    if (!onCreateCategory) return;
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
      setValue("categoryIds", [...categoryIds, created.id], { shouldValidate: true });
    }
    setCreatingCategory(false);
  };

  const from = accounts.find((a) => a.id === fromId);
  const to = accounts.find((a) => a.id === toId);
  const decimals = from?.decimals ?? 2;

  useEffect(() => {
    form.setValue("amountInput", amount.input, { shouldValidate: true });
  }, [amount, form]);

  const handleKey = (key: DigitKey) => setAmount((s) => applyDigit(s, key));
  const minor = amountToMinor(amount);
  const feeMinor = parseFeeToMinor(feeInput, decimals);

  const transferForm: TransferForm = {
    fromAccountId: fromId,
    fromAssetId: from?.assetId ?? "",
    toAccountId: toId,
    toAssetId: to?.assetId ?? "",
    amountMinor: minor,
    feeMinor,
    userId,
    description,
    date: presetDate(datePreset),
    categoryIds,
  };
  const validation = validateTransfer(transferForm);
  const canSave = minor > 0n && validation === null;

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

  const accountSelect = (
    label: string,
    value: string,
    onChange: (id: string) => void,
  ) => (
    <select
      aria-label={label}
      className="h-11 min-w-0 flex-1 rounded-(--radius-md) border border-(--border) bg-(--surface-2) px-3 text-sm text-zinc-200"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      {[...accounts].sort((a, b) => a.name.localeCompare(b.name)).map((a) => (
        <option key={a.id} value={a.id}>
          {a.name}
        </option>
      ))}
    </select>
  );

  return (
    <Sheet open onOpenChange={onOpenChange}>
      <SheetContent className="flex flex-col p-0">
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 pt-6">
          <SheetTitle>Transfer</SheetTitle>
          <SheetDescription>
            Moves money between two accounts
          </SheetDescription>

          <div className="mt-3 flex items-center gap-1.5">
            {accountSelect("From account", fromId, (id) => {
              setValue("fromId", id, { shouldValidate: true });
              setAmount(emptyAmount(accounts.find((a) => a.id === id)?.decimals ?? 2));
            })}
            <span aria-hidden className="text-zinc-500">
              →
            </span>
            {accountSelect("To account", toId, (id) => setValue("toId", id, { shouldValidate: true }))}
          </div>

          <SegmentedControl
            className="mt-3"
            options={[
              { value: "today", label: "Today" },
              { value: "yesterday", label: "Yesterday" },
            ]}
            value={datePreset}
            onChange={(v) => setValue("datePreset", v, { shouldValidate: true })}
          />

          <input
            aria-label="Description"
            className="mt-3 h-11 w-full rounded-(--radius-md) border border-(--border) bg-(--surface-2) px-3 text-sm text-zinc-200 placeholder:text-zinc-500"
            placeholder="Description (optional)"
            value={description}
            onChange={(e) => setValue("description", e.target.value, { shouldValidate: true })}
          />

          {(categories.length > 0 || onCreateCategory) && (
            <div className="mt-3 flex flex-col gap-2">
              <CategoryChipSelect
                categories={categories}
                value={categoryIds}
                onChange={(next) => setValue("categoryIds", next, { shouldValidate: true })}
                onCreateCategory={onCreateCategory && !creatingCategory ? startCreating : undefined}
              />
              {creatingCategory && (
                <form
                  onSubmit={inlineForm.handleSubmit(submitInlineCategory)}
                  className="flex flex-col gap-2 rounded-(--radius-md) border border-(--border) bg-(--surface-2) p-3"
                >
                  <div className="flex items-center gap-2">
                    <input
                      aria-label="New category name"
                      type="text"
                      {...inlineForm.register("name")}
                      placeholder="Category name"
                      autoFocus
                      className="h-10 flex-1 rounded-(--radius-sm) border border-(--border) bg-(--bg) px-3 text-sm text-zinc-200 placeholder:text-zinc-500 focus-visible:ring-2 focus-visible:ring-(--accent) focus-visible:outline-none"
                    />
                    <button
                      type="button"
                      aria-label="Cancel new category"
                      onClick={cancelCreating}
                      className="inline-flex h-10 w-10 items-center justify-center rounded-(--radius-sm) text-zinc-500 hover:text-inherit focus-visible:ring-2 focus-visible:ring-(--accent) focus-visible:outline-none"
                    >
                      <X className="h-4 w-4" aria-hidden />
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Color">
                    {DEFAULT_CATEGORY_COLORS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        role="radio"
                        aria-checked={newColor === c}
                        aria-label={c}
                        onClick={() => inlineForm.setValue("color", c, { shouldValidate: true })}
                        className={cn(
                          "h-7 w-7 rounded-full transition-transform focus-visible:ring-2 focus-visible:ring-(--accent) focus-visible:outline-none",
                          newColor === c ? "scale-110 ring-2 ring-white" : "hover:scale-105",
                        )}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                  <Button type="submit" size="sm" disabled={!newName.trim()}>
                    Create
                  </Button>
                </form>
              )}
            </div>
          )}

          <AmountInput
            className="mt-3"
            assetCode={from?.assetCode ?? from?.assetId?.slice(0, 3).toUpperCase()}
            tone="foreground"
            value={amount.input}
            // cavetail: display-only formatting, not arithmetic
            display={formatMinor(minor, decimals)}
            onChange={(v) => setAmount((s) => ({ ...s, input: sanitizeAmountInput(v, s.decimals) }))}
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
            onChange={(e) => setValue("feeInput", e.target.value, { shouldValidate: true })}
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

        <div className="hidden shrink-0 border-t border-(--border) bg-(--plate-1) px-6 py-4 sm:block">
          <Button size="lg" className="w-full" disabled={!canSave} onClick={handleSubmit(onSubmit)}>
            {canSave ? "Transfer" : fromId === toId ? validation : "Enter amount"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export const TransferSheet = (props: TransferSheetProps) => {
  const {
    isOpen: open,
    onOpenChange,
    userId,
    accounts,
    categories = [],
    onSave,
    onCreateCategory,
    defaultFromAccountId,
  } = props;
  if (!open) return null;
  return (
    <TransferForm
      onOpenChange={onOpenChange}
      userId={userId}
      accounts={accounts}
      categories={categories}
      onSave={onSave}
      onCreateCategory={onCreateCategory}
      defaultFromAccountId={defaultFromAccountId}
    />
  );
};
