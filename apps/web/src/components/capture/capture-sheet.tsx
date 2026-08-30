"use client";

import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { X } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { type DigitKey, Keypad } from "@/components/capture/keypad";
import { CaptureFormFields } from "@/components/capture/capture-form-fields";
import { CaptureAmountKeypad } from "@/components/capture/capture-amount-keypad";
import {
  emptyAmount,
  digit as applyDigit,
  backspace,
  clearAmount,
  amountToMinor,
  sanitizeAmountInput,
  presetDate,
  presetFromDate,
  buildTransactionRow,
  recentRepeats,
  type AmountState,
} from "@/lib/capture";
import type { RecentTxn } from "@/lib/capture";
import type { Template } from "@/lib/templates/templates-store";
import { DEFAULT_CATEGORY_COLORS, type Category } from "@/lib/categories/categories-store";
import { cn } from "@/lib/utils";

export type AccountOption = {
  id: string;
  name: string;
  assetId: string;
  decimals: number;
  assetCode?: string;
};
export type CategoryOption = {
  id: string;
  name: string;
  color?: string | null;
};

export type VoicePrefill = {
  accountId: string | null;
  amountInput: string | null;
  categoryIds: string[];
  description: string;
  /** Edit prefill: preserve the original type/date instead of defaulting. */
  type?: "income" | "expense";
  date?: number;
};

export interface CaptureSheetProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  userId: string;
  accounts: AccountOption[];
  categories: CategoryOption[];
  recentTxns: RecentTxn[];
  onSave: (row: Record<string, unknown>) => void;
  defaultAccountId?: string;
  voicePrefill?: VoicePrefill;
  editing?: boolean;
  templates?: Template[];
  onCreateCategory?: (c: Category) => void;
}

const captureFormSchema = z.object({
  accountId: z.string().min(1, "Select an account"),
  amountInput: z
    .string()
    .refine(
      (s) => s !== "" && !isNaN(Number(s)) && Number(s) > 0,
      "Enter a valid amount",
    ),
  type: z.enum(["expense", "income"]),
  description: z.string().max(500),
  categoryIds: z.array(z.string()),
  datePreset: z.enum(["today", "yesterday"]),
  dateOverride: z.number().nullable(),
});

type CaptureFormValues = z.infer<typeof captureFormSchema>;

const inlineCategorySchema = z.object({
  name: z.string().trim().min(1, "Name required"),
  color: z.string().min(1),
});
type InlineCategoryValues = z.infer<typeof inlineCategorySchema>;

type FormSnapshot = {
  accountId: string;
  amount: AmountState;
  type: "expense" | "income";
  description: string;
  categoryIds: string[];
};

function templateAmount(t: Template, dec: number): AmountState {
  // cavetail: display-only formatting, not arithmetic
  // eslint-disable-next-line local/no-money-float
  const major = Number(t.amountMinor) / 100;
  return { input: sanitizeAmountInput(major.toFixed(dec), dec), decimals: dec };
}

function formatCustomDate(ts: number): string {
  return new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(new Date(ts));
}

interface CaptureFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  accounts: AccountOption[];
  categories: CategoryOption[];
  recentTxns: RecentTxn[];
  onSave: (row: Record<string, unknown>) => void;
  defaultAccountId?: string;
  voicePrefill?: VoicePrefill;
  editing?: boolean;
  templates?: Template[];
  onCreateCategory?: (c: Category) => void;
}

const CaptureForm = (props: CaptureFormProps) => {
  const {
    open,
    onOpenChange,
    userId,
    accounts,
    categories,
    recentTxns,
    onSave,
    defaultAccountId,
    voicePrefill,
    templates = [],
    onCreateCategory,
  } = props;
  const first = accounts[0];

  const form = useForm<CaptureFormValues>({
    resolver: zodResolver(captureFormSchema),
    mode: "onChange",
    defaultValues: {
      accountId: defaultAccountId ?? first?.id ?? "",
      amountInput: "",
      type: "expense",
      description: "",
      categoryIds: [],
      datePreset: "today",
      dateOverride: null,
    },
  });

  const [amount, setAmount] = useState<AmountState>(() =>
    emptyAmount(first?.decimals ?? 2),
  );
  const [activeTemplateId, setActiveTemplateId] = useState<string | null>(null);
  const templateFormRef = useRef<FormSnapshot | null>(null);
  const [templateSnapshot, setTemplateSnapshot] = useState<{
    templateId: string;
    accountId: string;
    amountInput: string;
    type: "income" | "expense";
    description: string;
    categoryIds: string[];
  } | null>(null);
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
      deletedAt: null,
    };
    onCreateCategory(created);
    if (!categoryIds.includes(created.id)) {
      form.setValue("categoryIds", [...categoryIds, created.id], {
        shouldValidate: true,
      });
    }
    setCreatingCategory(false);
  };

  const accountId = form.watch("accountId");
  const type = form.watch("type");
  const description = form.watch("description");
  const categoryIds = form.watch("categoryIds");
  const datePreset = form.watch("datePreset");
  const dateOverride = form.watch("dateOverride");

  const selected = accounts.find((a) => a.id === accountId) ?? first;
  const decimals = selected?.decimals ?? 2;

  // cavetail: when a template is active and any of the form values drift
  // from the snapshot the template applied, drop the template selection so
  // the user is editing a fresh entry — not a silently-mutated template.
  useEffect(() => {
    if (!activeTemplateId || !templateSnapshot) return;
    if (templateSnapshot.templateId !== activeTemplateId) return;
    const drift =
      templateSnapshot.accountId !== accountId ||
      templateSnapshot.amountInput !== amount.input ||
      templateSnapshot.type !== type ||
      templateSnapshot.description !== description ||
      templateSnapshot.categoryIds.length !== categoryIds.length ||
      templateSnapshot.categoryIds.some((id, i) => categoryIds[i] !== id);
    if (drift) {
      setActiveTemplateId(null);
      setTemplateSnapshot(null);
    }
  }, [
    activeTemplateId,
    templateSnapshot,
    accountId,
    amount.input,
    type,
    description,
    categoryIds,
  ]);

  useEffect(() => {
    form.setValue("amountInput", amount.input, { shouldValidate: true });
  }, [amount, form]);

  const resetFormValues = () => {
    form.reset({
      accountId: defaultAccountId ?? first?.id ?? "",
      amountInput: "",
      type: "expense",
      description: "",
      categoryIds: [],
      datePreset: "today",
      dateOverride: null,
    });
  };

  // Reset when the sheet opens; apply voice/edit prefill if provided.
  // cavetail: accounts/defaultAccountId are read inside the callback but must
  // NOT be dependencies — the parent re-renders on sync ticks and a new array
  // reference would re-trigger this effect, overwriting the user's in-progress
  // selections (e.g. a manually chosen account) back to the default.
  useEffect(() => {
    if (open) {
      setActiveTemplateId(null);
      setTemplateSnapshot(null);
      templateFormRef.current = null;
      setCreatingCategory(false);
      if (voicePrefill) {
        const prefillAccountId =
          voicePrefill.accountId ?? accounts[0]?.id ?? "";
        const acc = accounts.find((a) => a.id === prefillAccountId);
        const dec = acc?.decimals ?? 2;
        const preset = voicePrefill.date
          ? presetFromDate(voicePrefill.date)
          : "today";
        const prefillAmount: AmountState = voicePrefill.amountInput
          ? { input: voicePrefill.amountInput, decimals: dec }
          : emptyAmount(dec);
        form.reset({
          accountId: prefillAccountId,
          amountInput: prefillAmount.input,
          type: voicePrefill.type ?? "expense",
          description: voicePrefill.description,
          categoryIds: voicePrefill.categoryIds,
          datePreset: preset === "custom" ? "today" : preset,
          dateOverride: voicePrefill.date ?? null,
        });
        setAmount(prefillAmount);
      } else {
        resetFormValues();
        setAmount(
          emptyAmount(
            accounts.find((a) => a.id === (defaultAccountId ?? first?.id ?? ""))
              ?.decimals ?? 2,
          ),
        );
      }
    }
  }, [open, voicePrefill]);

  const handleAccountChange = (id: string) => {
    const next = accounts.find((a) => a.id === id);
    const nextDec = next?.decimals ?? 2;
    form.setValue("accountId", id, { shouldValidate: true });
    if (nextDec !== decimals) {
      setAmount(emptyAmount(nextDec));
    }
  };

  const handleTypeChange = (next: "income" | "expense") => {
    form.setValue("type", next, { shouldValidate: true });
  };

  const handleKey = (key: DigitKey) => setAmount((s) => applyDigit(s, key));
  const minor = amountToMinor(amount);
  const canSave = minor > 0n && !!selected;

  const suggestions = recentRepeats(
    recentTxns.filter((t) => t.amountMinor !== 0n),
    3,
  );

  const applySuggestion = (txn: RecentTxn) => {
    // Suggestions carry signed minor units (expenses negative, income positive).
    // The keypad input is always unsigned; the sign selects the type.
    const isExpense = txn.amountMinor < 0n;
    const absMinor = isExpense ? -txn.amountMinor : txn.amountMinor;
    // cavetail: display-only formatting, not arithmetic
    const major = Number(absMinor) / 10 ** decimals;
    const input = major.toFixed(decimals);
    const nextAmount: AmountState = { input, decimals };
    setAmount(nextAmount);
    form.setValue("amountInput", nextAmount.input, { shouldValidate: true });
    const nextType = isExpense ? "expense" : "income";
    form.setValue("type", nextType, { shouldValidate: true });
    form.setValue("description", txn.description, { shouldValidate: true });
    form.setValue("categoryIds", txn.categoryIds, { shouldValidate: true });
  };

  const applyTemplate = (t: Template) => {
    if (activeTemplateId === t.id) {
      const prev = templateFormRef.current;
      setActiveTemplateId(null);
      setTemplateSnapshot(null);
      templateFormRef.current = null;
      if (prev) {
        form.setValue("accountId", prev.accountId, { shouldValidate: true });
        setAmount(prev.amount);
        form.setValue("amountInput", prev.amount.input, {
          shouldValidate: true,
        });
        form.setValue("type", prev.type, { shouldValidate: true });
        form.setValue("description", prev.description, {
          shouldValidate: true,
        });
        form.setValue("categoryIds", prev.categoryIds, {
          shouldValidate: true,
        });
      }
      return;
    }
    const snapshot: FormSnapshot = {
      accountId,
      amount,
      type,
      description,
      categoryIds,
    };
    templateFormRef.current = snapshot;
    setActiveTemplateId(t.id);
    const acc = accounts.find((a) => a.id === t.accountId);
    const dec = acc?.decimals ?? decimals;
    const newAmount = templateAmount(t, dec);
    if (acc) form.setValue("accountId", acc.id, { shouldValidate: true });
    setAmount(newAmount);
    form.setValue("amountInput", newAmount.input, { shouldValidate: true });
    form.setValue("type", t.type, { shouldValidate: true });
    form.setValue("description", t.description, { shouldValidate: true });
    form.setValue("categoryIds", t.categoryIds, { shouldValidate: true });
    setTemplateSnapshot({
      templateId: t.id,
      accountId: acc?.id ?? t.accountId,
      amountInput: newAmount.input,
      type: t.type,
      description: t.description,
      categoryIds: t.categoryIds,
    });
  };

  const save = () => {
    if (!selected || !canSave) return;
    onSave(
      buildTransactionRow({
        type,
        amountMinor: minor,
        accountId,
        assetId: selected.assetId,
        userId,
        categoryIds,
        description,
        date: dateOverride ? new Date(dateOverride) : presetDate(datePreset),
      }),
    );
    resetFormValues();
    setAmount(emptyAmount(selected.decimals));
    onOpenChange(false);
  };

  const activeTemplate = templates.find((t) => t.id === activeTemplateId);
  const dateLabel = dateOverride
    ? formatCustomDate(dateOverride)
    : datePreset === "yesterday"
      ? "Yesterday"
      : "Today";

  const applyDatePreset = (preset: "today" | "yesterday") => {
    form.setValue("datePreset", preset, { shouldValidate: true });
    form.setValue("dateOverride", null, { shouldValidate: true });
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 pt-6">
        <SheetTitle className="font-display text-lg font-bold tracking-tight">
          {props.editing ? "Edit transaction" : "Log transaction"}
        </SheetTitle>
        <SheetDescription>
          {recentTxns.length > 0
            ? `${recentTxns.length} recent match${recentTxns.length === 1 ? "" : "es"} available`
            : "New entry"}
        </SheetDescription>
        <CaptureFormFields
          accounts={accounts}
          categories={categories}
          templates={templates}
          accountId={accountId}
          onAccountChange={handleAccountChange}
          description={description}
          onDescriptionChange={(v) =>
            form.setValue("description", v, { shouldValidate: true })
          }
          categoryIds={categoryIds}
          onCategoryChange={(next) =>
            form.setValue("categoryIds", next, { shouldValidate: true })
          }
          datePreset={datePreset}
          dateOverride={dateOverride}
          onDatePreset={applyDatePreset}
          onDateOverride={(ts) =>
            form.setValue("dateOverride", ts, { shouldValidate: true })
          }
          activeTemplateId={activeTemplateId}
          onApplyTemplate={applyTemplate}
          activeTemplate={activeTemplate}
          dateLabel={dateLabel}
          onCreateCategory={
            onCreateCategory && !creatingCategory ? startCreating : undefined
          }
        />
        {creatingCategory && (
          <form
            onSubmit={inlineForm.handleSubmit(submitInlineCategory)}
            className="mt-3 flex flex-col gap-4 rounded-(--radius-md) border border-(--border) bg-(--surface-2) p-3"
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
            <div
              className="flex flex-wrap gap-1.5 px-4"
              role="radiogroup"
              aria-label="Color"
            >
              {DEFAULT_CATEGORY_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  role="radio"
                  aria-checked={newColor === c}
                  aria-label={c}
                  onClick={() =>
                    inlineForm.setValue("color", c, { shouldValidate: true })
                  }
                  className={cn(
                    "h-7 w-7 rounded-full transition-transform focus-visible:ring-2 focus-visible:ring-(--accent) focus-visible:outline-none",
                    newColor === c
                      ? "scale-110 ring-2 ring-white"
                      : "hover:scale-105",
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
      <div className="shrink-0 px-6 pb-1 pt-3">
        <CaptureAmountKeypad
          amount={amount}
          onAmountInputChange={setAmount}
          onKey={handleKey}
          onBackspace={() => setAmount(backspace)}
          onClear={() => setAmount(clearAmount)}
          onSave={save}
          canSave={canSave}
          selected={selected}
          type={type}
          onTypeChange={handleTypeChange}
          suggestions={suggestions}
          onApplySuggestion={applySuggestion}
          decimals={decimals}
          compact
        />
      </div>
      <div className="shrink-0 border-t border-(--border) bg-(--plate-1) px-6 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 sm:hidden">
        <Keypad
          onKey={handleKey}
          onBackspace={() => setAmount(backspace)}
          onClear={() => setAmount(clearAmount)}
          onSave={save}
          canSave={canSave}
          currencySymbol={selected?.assetCode === "USD" ? "$" : undefined}
        />
      </div>
      <div className="hidden shrink-0 border-t border-(--border) bg-(--plate-1) px-6 py-4 sm:block rounded-b-xl">
        <Button
          size="lg"
          className="w-full"
          disabled={!canSave}
          onClick={save}
          aria-label="Save transaction"
        >
          {canSave ? "Save" : "Enter amount"}
        </Button>
      </div>
    </div>
  );
};

export const CaptureSheet = (props: CaptureSheetProps) => {
  const { isOpen: open, onOpenChange } = props;
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex flex-col p-0">
        <CaptureForm {...props} open={open} />
      </SheetContent>
    </Sheet>
  );
};
