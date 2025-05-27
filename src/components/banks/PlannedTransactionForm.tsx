import React from "react";
import { Controller, useForm } from "react-hook-form";
import { PlannedTransaction, RecurrenceRule } from "../../lib/types";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { BankSelect } from "@/components/banks/BankSelect";
import { CategoryPicker } from "@/components/banks/CategoryPicker";

interface PlannedTransactionFormProps {
  plannedTransaction?: PlannedTransaction;
  onSubmit: (pt: PlannedTransaction) => void;
  onCancel?: () => void;
}

const defaultRecurrence: RecurrenceRule = {
  frequency: "monthly",
  interval: 1,
};

export const PlannedTransactionForm: React.FC<PlannedTransactionFormProps> = ({
  plannedTransaction,
  onSubmit,
  onCancel,
}) => {
  const { control, handleSubmit, register, watch } =
    useForm<PlannedTransaction>({
      defaultValues: plannedTransaction || {
        user: "",
        description: "",
        type: "expense",
        amount: 0,
        bank: "",
        categories: [],
        startDate: new Date().toISOString().slice(0, 10),
        recurrence: defaultRecurrence,
        reminderMinutesBefore: 60,
        active: true,
      },
    });
  const form = watch();

  return (
    <form
      onSubmit={handleSubmit((data) => onSubmit(data))}
      className="flex flex-col gap-4"
    >
      <div className="flex flex-col gap-1">
        <Label htmlFor="description">Description</Label>
        <Input
          {...register("description", { required: true })}
          placeholder="Description"
          className="bg-slate-900 border-slate-700 text-slate-100 placeholder:text-slate-500"
        />
      </div>
      <div className="flex flex-col gap-1">
        <Label htmlFor="type">Type</Label>
        <select
          {...register("type", { required: true })}
          className="bg-slate-900 border border-slate-700 rounded-md px-3 py-2 text-slate-100 focus:border-blue-700 focus:outline-none"
        >
          <option value="income">Income</option>
          <option value="expense">Expense</option>
          <option value="deposit">Deposit</option>
          <option value="withdrawal">Withdrawal</option>
        </select>
      </div>
      <div className="flex flex-col gap-1">
        <Label htmlFor="amount">Amount</Label>
        <Input
          {...register("amount", {
            required: true,
            valueAsNumber: true,
            min: 0,
          })}
          type="number"
          placeholder="Amount"
          className="bg-slate-900 border-slate-700 text-slate-100 placeholder:text-slate-500"
        />
      </div>
      <div className="flex flex-col gap-1">
        <Label htmlFor="bank">Bank</Label>
        <Controller
          control={control}
          name="bank"
          render={({ field }) => (
            <BankSelect value={field.value} onChange={field.onChange} />
          )}
        />
      </div>
      <div className="flex flex-col gap-1">
        <Label htmlFor="categories">Categories</Label>
        <Controller
          control={control}
          name="categories"
          render={({ field }) => (
            <CategoryPicker value={field.value} onChange={field.onChange} />
          )}
        />
      </div>
      <div className="flex flex-col gap-1">
        <Label htmlFor="startDate">Start Date</Label>
        <Input
          {...register("startDate", { required: true })}
          type="date"
          className="bg-slate-900 border-slate-700 text-slate-100"
        />
      </div>
      <div className="flex flex-col gap-1">
        <Label>Recurrence</Label>
        <div className="flex gap-2 items-center">
          <select
            {...register("recurrence.frequency", { required: true })}
            className="bg-slate-900 border border-slate-700 rounded-md px-3 py-2 text-slate-100 focus:border-blue-700 focus:outline-none"
          >
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
            <option value="yearly">Yearly</option>
          </select>
          <Input
            {...register("recurrence.interval", {
              valueAsNumber: true,
              min: 1,
            })}
            type="number"
            className="w-20 bg-slate-900 border-slate-700 text-slate-100"
            min={1}
          />
        </div>
      </div>
      <div className="flex flex-col gap-1">
        <Label htmlFor="reminderMinutesBefore">Reminder (minutes before)</Label>
        <Input
          {...register("reminderMinutesBefore", {
            valueAsNumber: true,
            min: 0,
          })}
          type="number"
          className="bg-slate-900 border-slate-700 text-slate-100"
        />
      </div>
      <div className="flex items-center gap-2">
        <input
          {...register("active")}
          type="checkbox"
          id="active"
          className="accent-blue-700 bg-slate-900 border-slate-700"
        />
        <Label htmlFor="active">Active</Label>
      </div>
      <div className="flex gap-2 mt-2">
        <Button type="submit" variant="default">
          {plannedTransaction ? "Update" : "Create"}
        </Button>
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
};
