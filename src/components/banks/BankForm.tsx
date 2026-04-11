"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldLabel, FieldError } from "@/components/ui/field";
import { useCreateBank, useUpdateBank } from "@/lib/hooks/useBanks";
import { bankSchema } from "@/lib/validation/bankSchema";
import type { Bank, BankFormData } from "@/lib/types";

function getButtonLabel(isEditing: boolean, isBusy: boolean): string {
  if (isBusy) return isEditing ? "Updating…" : "Creating…";
  return isEditing ? "Update Bank" : "Create Bank";
}

interface BankFormProps {
  initialData?: Bank;
  onSuccess?: () => void;
}

export function BankForm({ initialData, onSuccess }: BankFormProps) {
  const isEditing = !!initialData?.id;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<BankFormData>({
    resolver: zodResolver(bankSchema),
    defaultValues: {
      name: initialData?.name ?? "",
      primaryColor: initialData?.primaryColor ?? "#3b82f6",
      secondaryColor: initialData?.secondaryColor ?? "#1e40af",
    },
  });

  const createMutation = useCreateBank();
  const updateMutation = useUpdateBank();

  const isPending = createMutation.isPending || updateMutation.isPending;

  const onSubmit = async (data: BankFormData) => {
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
      aria-label={isEditing ? "Edit bank" : "Create bank"}
    >
      <Field>
        <FieldLabel htmlFor="bank-name">Name</FieldLabel>
        <Input id="bank-name" placeholder="Bank name" {...register("name")} />
        {errors.name && <FieldError>{errors.name.message}</FieldError>}
      </Field>

      <Field>
        <FieldLabel htmlFor="bank-primary-color">Primary Color</FieldLabel>
        <Input id="bank-primary-color" type="color" {...register("primaryColor")} />
        {errors.primaryColor && <FieldError>{errors.primaryColor.message}</FieldError>}
      </Field>

      <Field>
        <FieldLabel htmlFor="bank-secondary-color">Secondary Color</FieldLabel>
        <Input id="bank-secondary-color" type="color" {...register("secondaryColor")} />
        {errors.secondaryColor && <FieldError>{errors.secondaryColor.message}</FieldError>}
      </Field>

      <Button type="submit" disabled={isSubmitting || isPending}>
        {getButtonLabel(isEditing, isSubmitting || isPending)}
      </Button>
    </form>
  );
}
