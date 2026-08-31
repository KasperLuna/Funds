"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { CategoryChipSelect } from "@/components/capture/category-chip-select";
import { advanceRecurrence, type Frequency, type Schedule } from "@funds/core";
import type { ScheduledTxn } from "@/lib/scheduled/compute";

type AccountOption = { id: string; name: string };
type CategoryOption = { id: string; name: string; color?: string | null };

const FREQUENCY_OPTIONS: { value: Frequency; label: string }[] = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "yearly", label: "Yearly" },
];

const TIMEZONE_OFFSETS = Array.from({ length: 25 }, (_, i) => i - 12);

function previewNextDate(
  frequency: Frequency,
  interval: number,
  from: Date,
): Date | null {
  try {
    const schedule: Schedule = {
      frequency,
      interval,
      invokeDate: from,
      previousDate: null,
    };
    return advanceRecurrence(schedule).invokeDate;
  } catch {
    return null;
  }
}

export interface ScheduledDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSave: (item: ScheduledTxn) => void;
  onDelete?: (item: ScheduledTxn) => void;
  editItem?: ScheduledTxn | null;
  accounts: AccountOption[];
  categories: CategoryOption[];
}

interface ScheduledFormProps {
  onOpenChange: (isOpen: boolean) => void;
  onSave: (item: ScheduledTxn) => void;
  onDelete?: (item: ScheduledTxn) => void;
  editItem: ScheduledTxn | null;
  accounts: AccountOption[];
  categories: CategoryOption[];
}

const scheduledFormSchema = z.object({
  name: z.string().trim().min(1, "Name required"),
  description: z.string().max(500),
  type: z.enum(["income", "expense"]),
  amount: z
    .string()
    .refine((s) => s !== "" && !isNaN(Number(s)) && Number(s) > 0, "Enter a valid amount"),
  accountId: z.string().min(1, "Select account"),
  categoryIds: z.array(z.string()),
  frequency: z.enum(["daily", "weekly", "monthly", "yearly"]),
  interval: z.number().int().min(1, "Must be at least 1"),
  timezoneOffset: z.number().int().min(-12).max(12),
  startDate: z.string().min(1, "Pick a start date"),
});

type ScheduledFormValues = z.infer<typeof scheduledFormSchema>;

const ScheduledForm = ({ onOpenChange, onSave, onDelete, editItem, accounts, categories }: ScheduledFormProps) => {
  const form = useForm<ScheduledFormValues>({
    resolver: zodResolver(scheduledFormSchema),
    mode: "onChange",
    defaultValues: {
      name: editItem?.name ?? "",
      description: editItem?.description ?? "",
      type: editItem?.type ?? "expense",
      amount: editItem
        ? String(Number(editItem.amountMinor < 0n ? -editItem.amountMinor : editItem.amountMinor) / 100)
        : "",
      accountId: editItem?.accountId ?? accounts[0]?.id ?? "",
      categoryIds: editItem?.categoryIds ?? [],
      frequency: editItem?.recurrence?.frequency ?? "monthly",
      interval: editItem?.recurrence?.interval ?? 1,
      timezoneOffset: 0,
      startDate: editItem?.invokeDate
        ? new Date(editItem.invokeDate).toISOString().slice(0, 10)
        : new Date().toISOString().slice(0, 10),
    },
  });

  const { register, watch, setValue, handleSubmit, formState } = form;
  const name = watch("name");
  const amount = watch("amount");
  const type = watch("type");
  const accountId = watch("accountId");
  const categoryIds = watch("categoryIds");
  const frequency = watch("frequency");
  const interval = watch("interval");
  const timezoneOffset = watch("timezoneOffset");
  const startDate = watch("startDate");

  const [y, m, d] = startDate.split("-").map(Number);
  const from = new Date(y!, m! - 1, d);
  const nextPreview = previewNextDate(frequency, interval, from);

  const onSubmit = (values: ScheduledFormValues) => {
    // cavetail: display-only formatting, not arithmetic
    // eslint-disable-next-line local/no-money-float
    const amountCents = Math.round(parseFloat(values.amount) * 100);
    const signedAmount = values.type === "expense" ? -Math.abs(amountCents) : Math.abs(amountCents);

    const [sy, sm, sd] = values.startDate.split("-").map(Number);
    const computedInvokeDate = new Date(sy!, sm! - 1, sd).getTime();
    const now = Date.now();

    const startDateChanged =
      editItem?.invokeDate != null && computedInvokeDate !== editItem.invokeDate;

    const item: ScheduledTxn = {
      id: editItem?.id ?? `sch-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
      userId: editItem?.userId ?? "dev-user",
      name: values.name.trim(),
      description: values.description.trim(),
      type: values.type,
      amountMinor: BigInt(signedAmount),
      accountId: values.accountId,
      categoryIds: values.categoryIds,
      recurrence: { frequency: values.frequency, interval: values.interval },
      timezone: String(values.timezoneOffset),
      invokeDate: startDateChanged ? computedInvokeDate : (editItem?.invokeDate ?? computedInvokeDate),
      previousDate: startDateChanged ? null : (editItem?.previousDate ?? null),
      lastNotifiedAt: editItem?.lastNotifiedAt ?? null,
      active: editItem?.active ?? true,
      createdAt: editItem?.createdAt ?? now,
      updatedAt: now,
      deletedAt: null,
    };

    onSave(item);
    onOpenChange(false);
  };

  return (
    <Sheet open onOpenChange={onOpenChange}>
      <SheetContent className="flex flex-col gap-4 p-0">
        <div className="shrink-0 px-6 pt-6">
          <SheetTitle>
            {editItem ? "Edit scheduled transaction" : "New scheduled transaction"}
          </SheetTitle>
          <SheetDescription>
            {editItem
              ? "Update the recurrence schedule and details."
              : "Set up a recurring transaction entry."}
          </SheetDescription>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4 px-6 pb-6">
          <label className="flex flex-col gap-1.5">
            <span className="text-sm text-zinc-500">Name</span>
            <input
              type="text"
              {...register("name")}
              placeholder="e.g. Rent payment"
              className="h-11 rounded-(--radius-md) border border-(--border) bg-(--surface-2) px-3 text-sm focus-visible:ring-2 focus-visible:ring-(--accent) focus-visible:outline-none"
              autoFocus
            />
            {formState.errors.name && (
              <span className="text-xs text-(--danger)">{formState.errors.name.message}</span>
            )}
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-sm text-zinc-500">Description</span>
            <input
              type="text"
              {...register("description")}
              placeholder="Optional note"
              className="h-11 rounded-(--radius-md) border border-(--border) bg-(--surface-2) px-3 text-sm focus-visible:ring-2 focus-visible:ring-(--accent) focus-visible:outline-none"
            />
          </label>

          <div className="flex gap-2">
            <label className="flex flex-col gap-1.5 flex-1">
              <span className="text-sm text-zinc-500">Type</span>
              <Select
                value={type}
                onValueChange={(v) => setValue("type", v as "income" | "expense", { shouldValidate: true })}
              >
                <SelectTrigger aria-label="Type" className="h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="expense">Expense</SelectItem>
                  <SelectItem value="income">Income</SelectItem>
                </SelectContent>
              </Select>
            </label>
            <label className="flex flex-col gap-1.5 flex-1">
              <span className="text-sm text-zinc-500">Amount</span>
              <input
                type="number"
                step="0.01"
                min="0"
                {...register("amount")}
                placeholder="0.00"
                className="h-11 rounded-(--radius-md) border border-(--border) bg-(--surface-2) px-3 text-sm focus-visible:ring-2 focus-visible:ring-(--accent) focus-visible:outline-none"
              />
              {formState.errors.amount && (
                <span className="text-xs text-(--danger)">{formState.errors.amount.message}</span>
              )}
            </label>
          </div>

          <label className="flex flex-col gap-1.5">
            <span className="text-sm text-zinc-500">Account</span>
            <Select
              value={accountId}
              onValueChange={(v) => setValue("accountId", v, { shouldValidate: true })}
            >
              <SelectTrigger aria-label="Account" className="h-11">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[...accounts].sort((a, b) => a.name.localeCompare(b.name)).map((a) => (
                  <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {formState.errors.accountId && (
              <span className="text-xs text-(--danger)">{formState.errors.accountId.message}</span>
            )}
          </label>

          <CategoryChipSelect
            categories={categories}
            value={categoryIds}
            onChange={(next) => setValue("categoryIds", next, { shouldValidate: true })}
          />

          <div className="flex gap-2">
            <label className="flex flex-col gap-1.5 flex-1">
              <span className="text-sm text-zinc-500">Frequency</span>
              <Select
                value={frequency}
                onValueChange={(v) => setValue("frequency", v as Frequency, { shouldValidate: true })}
              >
                <SelectTrigger aria-label="Frequency" className="h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FREQUENCY_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>
            <label className="flex flex-col gap-1.5 w-24">
              <span className="text-sm text-zinc-500">Every</span>
              <input
                type="number"
                min="1"
                {...register("interval", {
                  valueAsNumber: true,
                  onChange: (e) => {
                    const v = Math.max(1, parseInt(e.target.value) || 1);
                    setValue("interval", v, { shouldValidate: true });
                  },
                })}
                className="h-11 rounded-(--radius-md) border border-(--border) bg-(--surface-2) px-3 text-sm focus-visible:ring-2 focus-visible:ring-(--accent) focus-visible:outline-none"
              />
              {formState.errors.interval && (
                <span className="text-xs text-(--danger)">{formState.errors.interval.message}</span>
              )}
            </label>
          </div>

          <div className="flex gap-2">
            <label className="flex flex-col gap-1.5 flex-1">
              <span className="text-sm text-zinc-500">Start date</span>
              <input
                type="date"
                {...register("startDate")}
                className="h-11 rounded-(--radius-md) border border-(--border) bg-(--surface-2) px-3 text-sm focus-visible:ring-2 focus-visible:ring-(--accent) focus-visible:outline-none"
              />
            </label>
            <label className="flex flex-col gap-1.5 w-32">
              <span className="text-sm text-zinc-500">Timezone (UTC)</span>
              <Select
                value={String(timezoneOffset)}
                onValueChange={(v) => setValue("timezoneOffset", Number(v), { shouldValidate: true })}
              >
                <SelectTrigger aria-label="Timezone (UTC)" className="h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIMEZONE_OFFSETS.map((offset) => (
                    <SelectItem key={offset} value={String(offset)}>
                      UTC{offset >= 0 ? "+" : ""}{offset}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>
          </div>

          {nextPreview && (
            <p className="text-xs text-zinc-500">
              Next occurrence:{" "}
              {nextPreview.toLocaleDateString(undefined, {
                weekday: "short",
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </p>
          )}

          <div className="flex justify-end gap-2">
            {editItem && onDelete && (
              <Button
                type="button"
                variant="destructive"
                onClick={() => {
                  onDelete(editItem);
                  onOpenChange(false);
                }}
              >
                Delete
              </Button>
            )}
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!name?.trim() || !accountId || !amount}
            >
              {editItem ? "Save" : "Create"}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
};

export const ScheduledDialog = (props: ScheduledDialogProps) => {
  const { isOpen: open, onOpenChange, onSave, onDelete, editItem, accounts, categories } = props;
  if (!open) return null;
  return <ScheduledForm onOpenChange={onOpenChange} onSave={onSave} onDelete={onDelete} editItem={editItem ?? null} accounts={accounts} categories={categories} />;
};
