"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldLabel, FieldError } from "@/components/ui/field";
import { useCreateCategory, useUpdateCategory } from "@/lib/hooks/useCategories";
import { categorySchema } from "@/lib/validation/categorySchema";
import type { Category, CategoryFormData } from "@/lib/types";

function getButtonLabel(isEditing: boolean, isBusy: boolean): string {
  if (isBusy) return isEditing ? "Updating…" : "Creating…";
  return isEditing ? "Update Category" : "Create Category";
}

interface CategoryFormProps {
  initialData?: Category;
  onSuccess?: () => void;
}

export function CategoryForm({ initialData, onSuccess }: CategoryFormProps) {
  const isEditing = !!initialData?.id;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CategoryFormData>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      name: initialData?.name ?? "",
      monthly_budget: initialData?.monthly_budget ?? undefined,
      hideable: initialData?.hideable ?? false,
      total_exempt: initialData?.total_exempt ?? false,
    },
  });

  const createMutation = useCreateCategory();
  const updateMutation = useUpdateCategory();

  const isPending = createMutation.isPending || updateMutation.isPending;

  const onSubmit = async (data: CategoryFormData) => {
    if (isEditing) {
      await updateMutation.mutateAsync({ id: initialData.id, data });
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
      aria-label={isEditing ? "Edit category" : "Create category"}
    >
      <Field>
        <FieldLabel htmlFor="category-name">Name</FieldLabel>
        <Input id="category-name" placeholder="Category name" {...register("name")} />
        {errors.name && <FieldError>{errors.name.message}</FieldError>}
      </Field>

      <Field>
        <FieldLabel htmlFor="category-budget">Monthly Budget</FieldLabel>
        <Input
          id="category-budget"
          type="number"
          step="0.01"
          placeholder="Optional budget"
          {...register("monthly_budget", { valueAsNumber: true })}
        />
        {errors.monthly_budget && <FieldError>{errors.monthly_budget.message}</FieldError>}
      </Field>

      <Field orientation="horizontal">
        <input
          id="category-hideable"
          type="checkbox"
          {...register("hideable")}
          className="size-4 accent-primary"
        />
        <FieldLabel htmlFor="category-hideable">Hideable</FieldLabel>
      </Field>

      <Field orientation="horizontal">
        <input
          id="category-total-exempt"
          type="checkbox"
          {...register("total_exempt")}
          className="size-4 accent-primary"
        />
        <FieldLabel htmlFor="category-total-exempt">Total Exempt</FieldLabel>
      </Field>

      <Button type="submit" disabled={isSubmitting || isPending}>
        {getButtonLabel(isEditing, isSubmitting || isPending)}
      </Button>
    </form>
  );
}
