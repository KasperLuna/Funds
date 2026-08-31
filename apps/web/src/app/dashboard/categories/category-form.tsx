"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { DEFAULT_CATEGORY_COLORS, type Category } from "@/lib/categories/categories-store";
import { assetSymbol } from "@/lib/money";
import { cn } from "@/lib/utils";

interface CategoryFormProps {
  onOpenChange: (isOpen: boolean) => void;
  onSave: (c: Category) => void;
  editCategory: Category | null;
  assets: Array<{ id: string; code: string; decimals: number }>;
  defaultAssetId: string | null;
}

const categoryFormSchema = z.object({
  name: z.string().trim().min(1, "Name required"),
  color: z.string().min(1),
  hideable: z.boolean(),
  excludeFromAnalytics: z.boolean(),
  budget: z.string(),
  assetId: z.string(),
});

type CategoryFormValues = z.infer<typeof categoryFormSchema>;

export const CategoryForm = ({
  onOpenChange,
  onSave,
  editCategory,
  assets,
  defaultAssetId,
}: CategoryFormProps) => {
  const editDec = assets.find((a) => a.id === editCategory?.assetId)?.decimals ?? 2;
  const form = useForm<CategoryFormValues>({
    resolver: zodResolver(categoryFormSchema),
    mode: "onChange",
    defaultValues: {
      name: editCategory?.name ?? "",
      color: editCategory?.color ?? DEFAULT_CATEGORY_COLORS[0]!,
      hideable: editCategory?.hideable ?? false,
      excludeFromAnalytics: editCategory?.excludeFromAnalytics ?? false,
      budget:
        editCategory?.monthlyBudgetMinor != null
          ? (Number(editCategory.monthlyBudgetMinor) / 10 ** editDec).toFixed(2)
          : "",
      assetId: editCategory?.assetId ?? defaultAssetId ?? "",
    },
  });

  const { register, watch, setValue, handleSubmit, formState } = form;
  const name = watch("name");
  const color = watch("color");
  const budget = watch("budget") ?? "";
  const assetId = watch("assetId");

  const decimals = assets.find((a) => a.id === assetId)?.decimals ?? 2;

  const onSubmit = (values: CategoryFormValues) => {
    const now = Date.now();
    // cavetail: display-only formatting, not arithmetic
    // eslint-disable-next-line local/no-money-float
    const budgetMinor = values.budget.trim() ? BigInt(Math.round(Number(values.budget) * 10 ** decimals)) : null;
    if (editCategory) {
      onSave({
        ...editCategory,
        name: values.name.trim(),
        color: values.color,
        hideable: values.hideable,
        excludeFromAnalytics: values.excludeFromAnalytics,
        monthlyBudgetMinor: budgetMinor,
        assetId: budgetMinor ? values.assetId : null,
        updatedAt: now,
      });
    } else {
      onSave({
        id: `cat-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
        name: values.name.trim(),
        color: values.color,
        hideable: values.hideable,
        excludeFromAnalytics: values.excludeFromAnalytics,
        monthlyBudgetMinor: budgetMinor,
        assetId: budgetMinor ? values.assetId : null,
        createdAt: now,
        updatedAt: now,
      });
    }
    onOpenChange(false);
  };

  return (
    <Sheet open onOpenChange={onOpenChange}>
      <SheetContent className="flex flex-col gap-4 p-0">
        <div className="shrink-0 px-6 pt-6">
          <SheetTitle>
            {editCategory ? "Edit category" : "New category"}
          </SheetTitle>
          <SheetDescription>
            {editCategory ? "Update category details." : "Create a spending category."}
          </SheetDescription>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4 px-6 pb-6">
          <label className="flex flex-col gap-1.5">
            <span className="text-sm text-zinc-500">Name</span>
            <input
              type="text"
              {...register("name")}
              placeholder="e.g. Groceries"
              className="h-11 rounded-(--radius-md) border border-(--border) bg-(--surface-2) px-3 text-sm text-zinc-200 placeholder:text-zinc-500 focus-visible:ring-2 focus-visible:ring-(--accent) focus-visible:outline-none"
              autoFocus
            />
            {formState.errors.name && (
              <span className="text-xs text-(--danger)">{formState.errors.name.message}</span>
            )}
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-sm text-zinc-500">Color</span>
            <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Color">
              {DEFAULT_CATEGORY_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  role="radio"
                  aria-checked={color === c}
                  aria-label={c}
                  onClick={() => setValue("color", c, { shouldValidate: true })}
                  className={cn(
                    "h-8 w-8 rounded-full transition-transform",
                    color === c ? "scale-110 ring-2 ring-white" : "hover:scale-105",
                  )}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </label>

          <div className="flex gap-2">
            <label className="flex flex-col gap-1.5 flex-1">
              <span className="text-sm text-zinc-500">Monthly budget (optional)</span>
              <input
                type="text"
                inputMode="decimal"
                {...register("budget")}
                placeholder="0.00"
                className="h-11 rounded-(--radius-md) border border-(--border) bg-(--surface-2) px-3 text-sm text-zinc-200 placeholder:text-zinc-500 focus-visible:ring-2 focus-visible:ring-(--accent) focus-visible:outline-none"
              />
            </label>
            <label className="flex flex-col gap-1.5 w-32">
              <span className="text-sm text-zinc-500">Currency</span>
              <Select
                value={assetId}
                onValueChange={(v) => setValue("assetId", v, { shouldValidate: true })}
                disabled={!budget.trim()}
              >
                <SelectTrigger aria-label="Currency" className="h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {assets.map((a) => (
                    <SelectItem key={a.id} value={a.id}>{a.code} ({assetSymbol(a.code).trim()})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>
          </div>
          {budget.trim() && assetId && (
            <p className="-mt-2 text-xs text-zinc-500">
              Budget in {assets.find((a) => a.id === assetId)?.code ?? "USD"}; recorded per month.
            </p>
          )}

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              {...register("hideable")}
              className="h-4 w-4 rounded border-(--border)"
            />
            <div className="flex flex-col">
              <span className="text-sm font-medium">Hidden</span>
              <span className="text-xs text-zinc-500">In privacy mode, amounts for its transactions stay hidden</span>
            </div>
          </label>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              {...register("excludeFromAnalytics")}
              className="h-4 w-4 rounded border-(--border)"
            />
            <div className="flex flex-col">
              <span className="text-sm font-medium">Hide from Stats</span>
              <span className="text-xs text-zinc-500">Transactions tagged with this category are excluded from insights and budgets</span>
            </div>
          </label>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!name?.trim()}>
              {editCategory ? "Save" : "Create"}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
};
