"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldLabel, FieldError } from "@/components/ui/field";
import { useCreateToken, useUpdateToken } from "@/lib/hooks/useTokens";
import { tokenSchema } from "@/lib/validation/tokenSchema";
import type { Token, TokenFormData } from "@/lib/types";

function getButtonLabel(isEditing: boolean, isBusy: boolean): string {
  if (isBusy) return isEditing ? "Updating…" : "Creating…";
  return isEditing ? "Update Token" : "Create Token";
}

interface TokenFormProps {
  initialData?: Token;
  onSuccess?: () => void;
}

export function TokenForm({ initialData, onSuccess }: Readonly<TokenFormProps>) {
  const isEditing = !!initialData?.id;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<TokenFormData>({
    resolver: zodResolver(tokenSchema),
    defaultValues: {
      name: initialData?.name ?? "",
      symbol: initialData?.symbol ?? "",
      coingecko_id: initialData?.coingecko_id ?? "",
      total: initialData?.total ?? 0,
      costAvg: initialData?.costAvg ?? 0,
    },
  });

  const createMutation = useCreateToken();
  const updateMutation = useUpdateToken();

  const isPending = createMutation.isPending || updateMutation.isPending;

  const onSubmit = async (data: TokenFormData) => {
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
      aria-label={isEditing ? "Edit token" : "Create token"}
    >
      <Field>
        <FieldLabel htmlFor="token-name">Name</FieldLabel>
        <Input id="token-name" placeholder="Token name" {...register("name")} />
        {errors.name && <FieldError>{errors.name.message}</FieldError>}
      </Field>

      <Field>
        <FieldLabel htmlFor="token-symbol">Symbol</FieldLabel>
        <Input id="token-symbol" placeholder="e.g. BTC" {...register("symbol")} />
        {errors.symbol && <FieldError>{errors.symbol.message}</FieldError>}
      </Field>

      <Field>
        <FieldLabel htmlFor="token-coingecko-id">CoinGecko ID</FieldLabel>
        <Input id="token-coingecko-id" placeholder="e.g. bitcoin" {...register("coingecko_id")} />
        {errors.coingecko_id && <FieldError>{errors.coingecko_id.message}</FieldError>}
      </Field>

      <Field>
        <FieldLabel htmlFor="token-quantity">Quantity</FieldLabel>
        <Input
          id="token-quantity"
          type="number"
          step="any"
          placeholder="0"
          {...register("total")}
        />
        {errors.total && <FieldError>{errors.total.message}</FieldError>}
      </Field>

      <Field>
        <FieldLabel htmlFor="token-cost-avg">Cost Average</FieldLabel>
        <Input
          id="token-cost-avg"
          type="number"
          step="any"
          placeholder="0"
          {...register("costAvg")}
        />
        {errors.costAvg && <FieldError>{errors.costAvg.message}</FieldError>}
      </Field>

      <Button type="submit" disabled={isSubmitting || isPending}>
        {getButtonLabel(isEditing, isSubmitting || isPending)}
      </Button>
    </form>
  );
}
