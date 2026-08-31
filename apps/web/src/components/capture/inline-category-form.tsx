"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DEFAULT_CATEGORY_COLORS } from "@/lib/categories/categories-store";
import { cn } from "@/lib/utils";

const inlineCategorySchema = z.object({
  name: z.string().trim().min(1, "Name required"),
  color: z.string().min(1),
});

type InlineCategoryValues = z.infer<typeof inlineCategorySchema>;

interface InlineCategoryFormProps {
  onSubmit: (values: InlineCategoryValues) => void;
  onCancel: () => void;
}

export const InlineCategoryForm = ({ onSubmit, onCancel }: InlineCategoryFormProps) => {
  const form = useForm<InlineCategoryValues>({
    resolver: zodResolver(inlineCategorySchema),
    mode: "onChange",
    defaultValues: {
      name: "",
      color: DEFAULT_CATEGORY_COLORS[0]!,
    },
  });
  const name = form.watch("name") ?? "";
  const color = form.watch("color") ?? DEFAULT_CATEGORY_COLORS[0]!;

  return (
    <form
      onSubmit={form.handleSubmit(onSubmit)}
      className="mt-3 flex flex-col gap-4 rounded-(--radius-md) border border-(--border) bg-(--surface-2) p-3"
    >
      <div className="flex items-center gap-2">
        <input
          aria-label="New category name"
          type="text"
          {...form.register("name")}
          placeholder="Category name"
          autoFocus
          className="h-10 flex-1 rounded-(--radius-sm) border border-(--border) bg-(--bg) px-3 text-sm text-zinc-200 placeholder:text-zinc-500 focus-visible:ring-2 focus-visible:ring-(--accent) focus-visible:outline-none"
        />
        <button
          type="button"
          aria-label="Cancel new category"
          onClick={onCancel}
          className="inline-flex h-10 w-10 items-center justify-center rounded-(--radius-sm) text-zinc-500 hover:text-inherit focus-visible:ring-2 focus-visible:ring-(--accent) focus-visible:outline-none"
        >
          <X className="h-4 w-4" aria-hidden />
        </button>
      </div>
      <div
        className="flex flex-wrap gap-1.5 px-4"
        role="radiogroup"
        aria-label="Color"
      >
        {DEFAULT_CATEGORY_COLORS.map((c) => (
          <button
            key={c}
            type="button"
            role="radio"
            aria-checked={color === c}
            aria-label={c}
            onClick={() => form.setValue("color", c, { shouldValidate: true })}
            className={cn(
              "h-7 w-7 rounded-full transition-transform focus-visible:ring-2 focus-visible:ring-(--accent) focus-visible:outline-none",
              color === c
                ? "scale-110 ring-2 ring-white"
                : "hover:scale-105",
            )}
            style={{ backgroundColor: c }}
          />
        ))}
      </div>
      <Button type="submit" size="sm" disabled={!name.trim()}>
        Create
      </Button>
    </form>
  );
};
