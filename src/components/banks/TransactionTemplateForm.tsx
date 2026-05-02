import React from "react";
import { Controller, useForm } from "react-hook-form";
import { PlannedTransaction } from "@/lib/types";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { BankSelect } from "@/components/banks/BankSelect";
import { CategoryPicker } from "@/components/banks/CategoryPicker";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface TransactionTemplateFormProps {
  template?: PlannedTransaction;
  onSubmit: (template: PlannedTransaction) => void;
}

export const TransactionTemplateForm: React.FC<
  TransactionTemplateFormProps
> = ({ template, onSubmit }) => {
  const {
    control,
    handleSubmit,
    register,
    formState: { errors },
  } = useForm<PlannedTransaction>({
    defaultValues: template || {
      user: "",
      name: "",
      description: "",
      type: "expense",
      amount: 0,
      bank: "",
      categories: [],
      isTemplate: true,
    },
  });

  return (
    <form
      onSubmit={handleSubmit((data) => onSubmit({ ...data, isTemplate: true }))}
      className="flex flex-col gap-2 py-2"
    >
      <div className="flex flex-col gap-1">
        <Label htmlFor="name">Template Name</Label>
        <Input
          {...register("name", { required: true })}
          placeholder="e.g. Monthly Rent"
          className="bg-slate-900 border-slate-700 text-slate-100 placeholder:text-slate-500"
        />
        {errors.name && (
          <p className="text-red-400 text-xs">
            {errors.name.message || "Name is required"}
          </p>
        )}
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
              inputMode="decimal"
              step={0.01}
              placeholder="Amount"
              className="bg-slate-900 border-slate-700 text-slate-100 placeholder:text-slate-500"
            />
            {errors.amount && (
              <p className="text-red-400 text-xs mt-1">
                {errors.amount.message || "Amount is required"}
              </p>
            )}
          </div>
        </div>
      </div>
      <div className="flex flex-col gap-1">
        <Label htmlFor="description">Description</Label>
        <Input
          {...register("description")}
          placeholder="Description"
          className="bg-slate-900 border-slate-700 text-slate-100 placeholder:text-slate-500"
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
      <Button type="submit" variant="secondary" className="w-full mt-2">
        {template ? "Update" : "Create"} Template
      </Button>
    </form>
  );
};
