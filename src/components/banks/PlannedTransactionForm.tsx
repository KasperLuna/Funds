"use client";

import React from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldLabel, FieldError } from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useCreatePlannedTransaction,
  useUpdatePlannedTransaction,
} from "@/lib/hooks/usePlannedTransactions";
import {
  plannedTransactionSchema,
  type PlannedTransactionFormValues,
} from "@/lib/validation/plannedTransactionSchema";
import type { PlannedTransaction, Bank, Category } from "@/lib/types";

const TRANSACTION_TYPES = [
  { value: "income", label: "Income" },
  { value: "expense", label: "Expense" },
  { value: "deposit", label: "Deposit" },
  { value: "withdrawal", label: "Withdrawal" },
] as const;

const FREQUENCY_OPTIONS = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "yearly", label: "Yearly" },
] as const;

function getButtonLabel(isEditing: boolean, isBusy: boolean): string {
  if (isBusy) return isEditing ? "Updating…" : "Creating…";
  return isEditing ? "Update Planned Transaction" : "Create Planned Transaction";
}

interface PlannedTransactionFormProps {
  initialData?: PlannedTransaction;
  banks: Bank[];
  categories: Category[];
  onSuccess?: () => void;
}

export function PlannedTransactionForm({
  initialData,
  banks,
  categories,
  onSuccess,
}: PlannedTransactionFormProps) {
  const isEditing = !!initialData?.id;

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<PlannedTransactionFormValues>({
    resolver: zodResolver(plannedTransactionSchema),
    defaultValues: {
      description: initialData?.description ?? "",
      type: initialData?.type ?? "expense",
      amount: initialData?.amount ?? (undefined as unknown as number),
      bank: initialData?.bank ?? "",
      categories: initialData?.categories ?? [],
      recurrence: {
        frequency: initialData?.recurrence?.frequency ?? "monthly",
        interval: initialData?.recurrence?.interval ?? 1,
      },
      timezone: initialData?.timezone ?? 0,
    },
  });

  const createMutation = useCreatePlannedTransaction();
  const updateMutation = useUpdatePlannedTransaction();

  const isPending = createMutation.isPending || updateMutation.isPending;

  const onSubmit = async (data: PlannedTransactionFormValues) => {
    if (isEditing) {
      await updateMutation.mutateAsync({ id: initialData.id!, data });
    } else {
      await createMutation.mutateAsync(data);
    }
    reset();
    onSuccess?.();
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="flex flex-col gap-4"
      aria-label={isEditing ? "Edit planned transaction" : "Create planned transaction"}
    >
      {/* Description */}
      <Field>
        <FieldLabel htmlFor="pt-description">Description</FieldLabel>
        <Input
          id="pt-description"
          placeholder="Planned transaction description"
          {...register("description")}
        />
        {errors.description && <FieldError>{errors.description.message}</FieldError>}
      </Field>

      {/* Type */}
      <Field>
        <FieldLabel htmlFor="pt-type">Type</FieldLabel>
        <Controller
          name="type"
          control={control}
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger id="pt-type" className="w-full">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                {TRANSACTION_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
        {errors.type && <FieldError>{errors.type.message}</FieldError>}
      </Field>

      {/* Amount */}
      <Field>
        <FieldLabel htmlFor="pt-amount">Amount</FieldLabel>
        <Input
          id="pt-amount"
          type="number"
          step="0.01"
          min="0.01"
          placeholder="0.00"
          {...register("amount", { valueAsNumber: true })}
        />
        {errors.amount && <FieldError>{errors.amount.message}</FieldError>}
      </Field>

      {/* Bank */}
      <Field>
        <FieldLabel htmlFor="pt-bank">Bank</FieldLabel>
        <Controller
          name="bank"
          control={control}
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger id="pt-bank" className="w-full">
                <SelectValue placeholder="Select bank" />
              </SelectTrigger>
              <SelectContent>
                {banks.map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
        {errors.bank && <FieldError>{errors.bank.message}</FieldError>}
      </Field>

      {/* Categories */}
      <Field>
        <FieldLabel>Categories</FieldLabel>
        <Controller
          name="categories"
          control={control}
          render={({ field }) => (
            <fieldset className="flex flex-col gap-2" aria-label="Categories">
              {categories.map((cat) => (
                <label key={cat.id} className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    value={cat.id}
                    checked={field.value.includes(cat.id)}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                      const updated = e.target.checked
                        ? [...field.value, cat.id]
                        : field.value.filter((id) => id !== cat.id);
                      field.onChange(updated);
                    }}
                    className="size-4 rounded border-input"
                  />
                  {cat.name}
                </label>
              ))}
            </fieldset>
          )}
        />
        {errors.categories && <FieldError>{errors.categories.message}</FieldError>}
      </Field>

      {/* Frequency */}
      <Field>
        <FieldLabel htmlFor="pt-frequency">Frequency</FieldLabel>
        <Controller
          name="recurrence.frequency"
          control={control}
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger id="pt-frequency" className="w-full">
                <SelectValue placeholder="Select frequency" />
              </SelectTrigger>
              <SelectContent>
                {FREQUENCY_OPTIONS.map((f) => (
                  <SelectItem key={f.value} value={f.value}>
                    {f.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
        {errors.recurrence?.frequency && (
          <FieldError>{errors.recurrence.frequency.message}</FieldError>
        )}
      </Field>

      {/* Interval */}
      <Field>
        <FieldLabel htmlFor="pt-interval">Interval</FieldLabel>
        <Input
          id="pt-interval"
          type="number"
          min="1"
          step="1"
          placeholder="1"
          {...register("recurrence.interval", { valueAsNumber: true })}
        />
        {errors.recurrence?.interval && (
          <FieldError>{errors.recurrence.interval.message}</FieldError>
        )}
      </Field>

      {/* Timezone */}
      <Field>
        <FieldLabel htmlFor="pt-timezone">Timezone (UTC offset)</FieldLabel>
        <Input
          id="pt-timezone"
          type="number"
          min="-12"
          max="14"
          step="1"
          placeholder="0"
          {...register("timezone", { valueAsNumber: true })}
        />
        {errors.timezone && <FieldError>{errors.timezone.message}</FieldError>}
      </Field>

      <Button type="submit" disabled={isSubmitting || isPending}>
        {getButtonLabel(isEditing, isSubmitting || isPending)}
      </Button>
    </form>
  );
}
