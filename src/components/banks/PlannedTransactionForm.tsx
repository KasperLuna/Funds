import React from "react";
import { Controller, useForm } from "react-hook-form";
import { PlannedTransaction, RecurrenceRule } from "../../lib/types";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { BankSelect } from "@/components/banks/BankSelect";
import { CategoryPicker } from "@/components/banks/CategoryPicker";
import { DatePickerWithOptions } from "@/components/DatePickerWithOptions";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface PlannedTransactionFormProps {
  plannedTransaction?: PlannedTransaction;
  onSubmit: (pt: PlannedTransaction) => void;
}

const defaultRecurrence: RecurrenceRule = {
  frequency: "monthly",
  interval: 1,
};

export const PlannedTransactionForm: React.FC<PlannedTransactionFormProps> = ({
  plannedTransaction,
  onSubmit,
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
        recurrence: defaultRecurrence,
        active: true,
        timezone: new Date().getTimezoneOffset() / -60, // Convert to hours
        previousDate: null,
        invokeDate: new Date(),
      },
    });

  return (
    <form
      onSubmit={handleSubmit((data) => onSubmit(data))}
      className="flex flex-col gap-2 py-2"
    >
      <div className="flex flex-col gap-2">
        <Label htmlFor="invokeDate">Next Occurrence (Invoke Date)</Label>
        <div className="flex flex-row gap-2 items-center">
          <Controller
            control={control}
            name="invokeDate"
            render={({ field }) => {
              const dateValue = field.value
                ? new Date(field.value.getFullYear(), field.value.getMonth(), field.value.getDate())
                : undefined;
              const timeValue = field.value
                ? `${field.value.getHours().toString().padStart(2, "0")}:${field.value
                    .getMinutes()
                    .toString()
                    .padStart(2, "0")}`
                : "";
              const handleDateChange = (date: Date | undefined) => {
                if (!date) return;
                let newDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
                if (field.value && !isNaN(field.value.getTime())) {
                  newDate.setHours(
                    field.value.getHours(),
                    field.value.getMinutes(),
                    0,
                    0
                  );
                }
                field.onChange(newDate);
              };
              const handleTimeChange = (
                e: React.ChangeEvent<HTMLInputElement>
              ) => {
                let [hours, minutes] = e.target.value.split(":").map(Number);
                let newDate = field.value ? new Date(field.value) : new Date();
                newDate.setHours(hours || 0, minutes || 0, 0, 0);
                field.onChange(newDate);
              };
              return (
                <>
                  <DatePickerWithOptions
                    value={dateValue ? new Date(dateValue) : undefined}
                    onChange={handleDateChange}
                  />
                  <Input
                    type="time"
                    value={timeValue}
                    onChange={handleTimeChange}
                    className="w-28 bg-slate-900 border-slate-700 text-slate-100 ml-2"
                    aria-label="Invoke time"
                  />
                </>
              );
            }}
          />
        </div>
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

      <div className="flex flex-col gap-2">
        <Label htmlFor="type">Type</Label>
        <div className="flex flex-row gap-2 items-center">
          <Controller
            name="type"
            control={control}
            render={({ field }) => (
              <Tabs
                value={field.value}
                onValueChange={field.onChange}
                className="w-full"
              >
                <TabsList className="bg-slate-800 w-full">
                  <TabsTrigger
                    className="w-full data-[state=active]:bg-red-800 data-[state=active]:text-slate-200"
                    value="expense"
                  >
                    Deduct (-)
                  </TabsTrigger>
                  <TabsTrigger
                    className="w-full data-[state=active]:bg-green-800 data-[state=active]:text-slate-200"
                    value="income"
                  >
                    Add (+)
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            )}
          />
          <div className="w-full">
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
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="description">Description</Label>
        <Input
          {...register("description", { required: true })}
          placeholder="Description"
          className="bg-slate-900 border-slate-700 text-slate-100 placeholder:text-slate-500"
        />
      </div>
      <div className="flex flex-col gap-2">
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
        <label
          className="text-sm text-slate-300 mb-1"
          htmlFor="recurrence-interval"
        >
          Repeat every:
        </label>
        <div className="flex flex-row gap-2 items-center border border-slate-700 rounded-md px-3 py-2 bg-slate-900">
          <Input
            id="recurrence-interval"
            {...register("recurrence.interval", {
              valueAsNumber: true,
              min: 1,
            })}
            type="number"
            className="w-16 bg-slate-800 border-slate-700 text-slate-100 text-center"
            min={1}
            aria-label="Recurrence interval"
          />
          <Controller
            control={control}
            name="recurrence.frequency"
            render={({ field }) => (
              <select
                {...field}
                className="bg-slate-800 border border-slate-700 rounded-md px-3 py-2 text-slate-100 focus:border-blue-700 focus:outline-none"
                aria-label="Recurrence frequency"
              >
                <option value="daily">day(s)</option>
                <option value="weekly">week(s)</option>
                <option value="monthly">month(s)</option>
                <option value="yearly">year(s)</option>
              </select>
            )}
          />
          <div className="flex items-center gap-2 ml-4">
            <input
              {...register("active")}
              type="checkbox"
              id="active"
              className="accent-blue-700 bg-slate-900 border-slate-700"
            />
            <Label htmlFor="active">Active</Label>
          </div>
        </div>
        <span className="text-xs text-slate-500 mt-1">
          E.g. every 2 weeks for biweekly, every 3 months for quarterly
        </span>
      </div>
      <div className="flex gap-2 mt-2">
        <Button type="submit" variant="secondary" className="w-full">
          {plannedTransaction ? "Update" : "Create"}
        </Button>
      </div>
    </form>
  );
};
