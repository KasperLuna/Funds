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
import { useCreateTransaction, useUpdateTransaction } from "@/lib/hooks/useTransactions";
import { transactionSchema, type TransactionFormData } from "@/lib/validation/transactionSchema";
import type { Transaction, Bank, Category } from "@/lib/types";

const TRANSACTION_TYPES = [
  { value: "income", label: "Income" },
  { value: "expense", label: "Expense" },
  { value: "deposit", label: "Deposit" },
  { value: "withdrawal", label: "Withdrawal" },
] as const;

function formatDateForInput(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toISOString().split("T")[0] ?? "";
}

function getButtonLabel(isEditing: boolean, isBusy: boolean): string {
  if (isBusy) return isEditing ? "Updating…" : "Creating…";
  return isEditing ? "Update Transaction" : "Create Transaction";
}

interface TransactionFormProps {
  initialData?: Transaction;
  banks: Bank[];
  categories: Category[];
  onSuccess?: () => void;
}

export function TransactionForm({
  initialData,
  banks,
  categories,
  onSuccess,
}: TransactionFormProps) {
  const isEditing = !!initialData?.id;

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<TransactionFormData>({
    resolver: zodResolver(transactionSchema),
    defaultValues: {
      description: initialData?.description ?? "",
      type: initialData?.type ?? "expense",
      amount: initialData?.amount ?? (undefined as unknown as number),
      bank: initialData?.bank ?? "",
      categories: initialData?.categories ?? [],
      date: initialData?.date ? new Date(initialData.date) : new Date(),
    },
  });

  const createMutation = useCreateTransaction();
  const updateMutation = useUpdateTransaction();

  const isPending = createMutation.isPending || updateMutation.isPending;

  const onSubmit = async (data: TransactionFormData) => {
    const payload = {
      ...data,
      date: data.date instanceof Date ? data.date.toISOString() : data.date,
    };

    if (isEditing) {
      await updateMutation.mutateAsync({ id: initialData.id!, data: payload });
    } else {
      await createMutation.mutateAsync(
        payload as Omit<Transaction, "id" | "user" | "created" | "updated">,
      );
    }
    reset();
    onSuccess?.();
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="flex flex-col gap-4"
      aria-label={isEditing ? "Edit transaction" : "Create transaction"}
    >
      {/* Description */}
      <Field>
        <FieldLabel htmlFor="tx-description">Description</FieldLabel>
        <Input
          id="tx-description"
          placeholder="Transaction description"
          {...register("description")}
        />
        {errors.description && <FieldError>{errors.description.message}</FieldError>}
      </Field>

      {/* Type */}
      <Field>
        <FieldLabel htmlFor="tx-type">Type</FieldLabel>
        <Controller
          name="type"
          control={control}
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger id="tx-type" className="w-full">
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
        <FieldLabel htmlFor="tx-amount">Amount</FieldLabel>
        <Input
          id="tx-amount"
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
        <FieldLabel htmlFor="tx-bank">Bank</FieldLabel>
        <Controller
          name="bank"
          control={control}
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger id="tx-bank" className="w-full">
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

      {/* Categories (multi-select via checkboxes) */}
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

      {/* Date */}
      <Field>
        <FieldLabel htmlFor="tx-date">Date</FieldLabel>
        <Controller
          name="date"
          control={control}
          render={({ field }) => (
            <Input
              id="tx-date"
              type="date"
              value={field.value ? formatDateForInput(field.value) : ""}
              onChange={(e) => {
                const val = e.target.value;
                field.onChange(val ? new Date(val) : undefined);
              }}
            />
          )}
        />
        {errors.date && <FieldError>{errors.date.message}</FieldError>}
      </Field>

      <Button type="submit" disabled={isSubmitting || isPending}>
        {getButtonLabel(isEditing, isSubmitting || isPending)}
      </Button>
    </form>
  );
}
