"use client";

import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { type DigitKey, Keypad } from "@/components/capture/keypad";
import { Button } from "@/components/ui/button";
import { CaptureFormFields } from "@/components/capture/capture-form-fields";
import { CaptureAmountKeypad } from "@/components/capture/capture-amount-keypad";
import { CaptureDictate } from "@/components/capture/capture-dictate";
import { dictateToPrefill } from "@/lib/voice/dictate";
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
import type { Category } from "@/lib/categories/categories-store";
import {
  type AccountOption,
  type CategoryOption,
  type VoicePrefill,
} from "./capture-sheet-types";
import { InlineCategoryForm } from "./inline-category-form";
import { useSyncStore } from "@/lib/sync/sync-store";

export type { AccountOption, CategoryOption, VoicePrefill } from "./capture-sheet-types";

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
  const date = new Date(ts);
  return new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: date.getFullYear() === new Date().getFullYear() ? undefined : "numeric",
  }).format(date);
}

export interface CaptureFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
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

export const CaptureForm = (props: CaptureFormProps) => {
  const {
    open,
    onOpenChange,
    accounts,
    categories,
    recentTxns,
    onSave,
    defaultAccountId,
    voicePrefill,
    templates = [],
    onCreateCategory,
  } = props;
  const userId = useSyncStore((s) => s.userId);
  const uid = userId ?? "dev-user";
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
  const [replaceAmountOnNextKey, setReplaceAmountOnNextKey] = useState(false);
  // cavetail: dictate mode swaps the hero readout for a real text input so
  // the iOS keyboard (and its mic key) appears; the utterance parses fully
  // on-device via dictate.ts. Missing-amount derives from the buffer so no
  // flag state can go stale: it shows only while the buffer is still empty.
  const [dictating, setDictating] = useState(false);
  const [utterance, setUtterance] = useState("");
  const [dictateAmountMissing, setDictateAmountMissing] = useState(false);
  const showAmountMissing =
    dictateAmountMissing && amountToMinor(amount) === 0n;
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
      setDictating(false);
      setUtterance("");
      setDictateAmountMissing(false);
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
        setReplaceAmountOnNextKey(Boolean(voicePrefill.amountInput));
      } else {
        resetFormValues();
        setReplaceAmountOnNextKey(false);
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
      setReplaceAmountOnNextKey(false);
      setAmount(emptyAmount(nextDec));
    }
  };

  const handleTypeChange = (next: "income" | "expense") => {
    form.setValue("type", next, { shouldValidate: true });
  };

  const handleKey = (key: DigitKey) => {
    setAmount((s) =>
      replaceAmountOnNextKey ? applyDigit(emptyAmount(s.decimals), key) : applyDigit(s, key),
    );
    setReplaceAmountOnNextKey(false);
  };

  const startDictation = () => {
    setUtterance("");
    setDictateAmountMissing(false);
    setDictating(true);
  };
  const cancelDictation = () => {
    setDictating(false);
    setUtterance("");
  };
  const commitDictation = () => {
    const res = dictateToPrefill(
      utterance,
      accounts.map((a) => ({ id: a.id, name: a.name, decimals: a.decimals })),
      categories.map((c) => ({ id: c.id, name: c.name })),
    );
    // Blank utterance: stay listening.
    if (!res) return;
    const p = res.prefill;
    // cavetail: resolve the target account first — a decimals change
    // re-buffers the amount, so the account must land before the amount.
    // Type is deliberately untouched: the parser emits no income/expense
    // signal, and the toggle stays one tap away.
    const target = (p.accountId ? accounts.find((a) => a.id === p.accountId) : undefined) ?? selected;
    const dec = target?.decimals ?? decimals;
    if (target && target.id !== accountId) {
      form.setValue("accountId", target.id, { shouldValidate: true });
    }
    if (p.amountInput) {
      const next = { input: sanitizeAmountInput(p.amountInput, dec), decimals: dec };
      setAmount(next);
      form.setValue("amountInput", next.input, { shouldValidate: true });
    } else {
      setAmount(emptyAmount(dec));
      form.setValue("amountInput", "", { shouldValidate: true });
    }
    form.setValue("description", p.description, { shouldValidate: true });
    form.setValue("categoryIds", p.categoryIds, { shouldValidate: true });
    setReplaceAmountOnNextKey(false);
    setDictateAmountMissing(res.missingAmount);
    setDictating(false);
    setUtterance("");
  };
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
    setReplaceAmountOnNextKey(false);
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
    setReplaceAmountOnNextKey(false);
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
        userId: uid,
        categoryIds,
        description,
        date: dateOverride ? new Date(dateOverride) : presetDate(datePreset),
      }),
    );
    resetFormValues();
    setReplaceAmountOnNextKey(false);
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
            onCreateCategory && !creatingCategory ? () => setCreatingCategory(true) : undefined
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
                deletedAt: null,
              };
              onCreateCategory(created);
              if (!categoryIds.includes(created.id)) {
                form.setValue("categoryIds", [...categoryIds, created.id], {
                  shouldValidate: true,
                });
              }
              setCreatingCategory(false);
            }}
            onCancel={() => setCreatingCategory(false)}
          />
        )}
      </div>
      <div className="shrink-0 px-6 pb-1 pt-3">
        <CaptureAmountKeypad
          amount={amount}
          onAmountInputChange={(next) => {
            setReplaceAmountOnNextKey(false);
            setAmount(next);
          }}
          onKey={handleKey}
          onBackspace={() => {
            setReplaceAmountOnNextKey(false);
            setAmount(backspace);
          }}
          onClear={() => {
            setReplaceAmountOnNextKey(false);
            setAmount(clearAmount);
          }}
          onSave={save}
          canSave={canSave}
          selected={selected}
          type={type}
          onTypeChange={handleTypeChange}
          suggestions={dictating ? [] : suggestions}
          onApplySuggestion={applySuggestion}
          decimals={decimals}
          compact
          onMicClick={startDictation}
          dictateContent={
            dictating ? (
              <CaptureDictate
                value={utterance}
                onChange={setUtterance}
                onCommit={commitDictation}
                onCancel={cancelDictation}
              />
            ) : undefined
          }
          amountHint={showAmountMissing ? "Couldn't hear an amount — type it" : null}
        />
      </div>
      {!dictating ? (
        <div className="shrink-0 border-t border-(--border) bg-(--plate-1) px-6 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 sm:hidden">
          <Keypad
            onKey={handleKey}
            onBackspace={() => {
              setReplaceAmountOnNextKey(false);
              setAmount(backspace);
            }}
            onClear={() => {
              setReplaceAmountOnNextKey(false);
              setAmount(clearAmount);
            }}
            onSave={save}
            canSave={canSave}
            currencySymbol={selected?.assetCode === "USD" ? "$" : undefined}
          />
        </div>
      ) : null}
      <div className="hidden shrink-0 border-t border-(--border) bg-(--plate-1) px-6 py-4 sm:block rounded-b-xl">
        <Button onClick={save} disabled={!canSave} aria-label="Save transaction" className="w-full" size="lg">
          {canSave ? "Save" : "Enter amount"}
        </Button>
      </div>
    </div>
  );
};
