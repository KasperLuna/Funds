import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { SegmentedControl } from "@/components/ui/segmented";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import type { Template } from "@/lib/templates/templates-store";

type AccountOption = { id: string; name: string; decimals: number };
type CategoryOption = { id: string; name: string };

interface TemplateDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (t: Template) => void;
  editTemplate?: Template | null;
  accounts: AccountOption[];
  categories: CategoryOption[];
}

interface TemplateFormProps {
  onOpenChange: (open: boolean) => void;
  onSave: (t: Template) => void;
  editTemplate: Template | null;
  accounts: AccountOption[];
  categories: CategoryOption[];
}

const templateFormSchema = z.object({
  name: z.string().trim().min(1, "Name required"),
  description: z.string().max(500),
  type: z.enum(["income", "expense"]),
  accountId: z.string().min(1, "Select account"),
  categoryIds: z.array(z.string()),
  amount: z.string().refine((s) => s !== "" && !isNaN(Number(s)) && Number(s) > 0, "Enter a valid amount"),
});

type TemplateFormValues = z.infer<typeof templateFormSchema>;

const TemplateForm = ({ onOpenChange, onSave, editTemplate, accounts, categories }: TemplateFormProps) => {
  const initDec = accounts.find((a) => a.id === (editTemplate?.accountId ?? accounts[0]?.id))?.decimals ?? 2;
  const form = useForm<TemplateFormValues>({
    resolver: zodResolver(templateFormSchema),
    mode: "onChange",
    defaultValues: {
      name: editTemplate?.name ?? "",
      description: editTemplate?.description ?? "",
      type: editTemplate?.type ?? "expense",
      accountId: editTemplate?.accountId ?? accounts[0]?.id ?? "",
      categoryIds: editTemplate?.categoryIds ?? [],
      amount: editTemplate
        ? (() => {
            // cavetail: display-only formatting, not arithmetic
            // eslint-disable-next-line local/no-money-float
            return (Number(editTemplate.amountMinor) / 10 ** initDec).toFixed(initDec);
          })()
        : "",
    },
  });

  const { register, watch, setValue, handleSubmit, formState } = form;
  const name = watch("name");
  const type = watch("type");
  const accountId = watch("accountId");
  const categoryIds = watch("categoryIds");
  const amount = watch("amount");

  const decimals = accounts.find((a) => a.id === accountId)?.decimals ?? 2;

  const toggleCategory = (catId: string) => {
    const next = categoryIds.includes(catId)
      ? categoryIds.filter((c) => c !== catId)
      : [...categoryIds, catId];
    setValue("categoryIds", next, { shouldValidate: true });
  };

  const onSubmit = (values: TemplateFormValues) => {
    // cavetail: display-only formatting, not arithmetic
    // eslint-disable-next-line local/no-money-float
    const amountMinor = BigInt(Math.round(Number(values.amount) * 10 ** decimals));
    const now = Date.now();

    const item: Template = {
      id: editTemplate?.id ?? `tpl-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
      name: values.name.trim(),
      type: values.type,
      amountMinor,
      description: values.description.trim(),
      accountId: values.accountId,
      categoryIds: values.categoryIds,
      createdAt: editTemplate?.createdAt ?? now,
      updatedAt: now,
      deletedAt: null,
    };

    onSave(item);
    onOpenChange(false);
  };

  return (
    <Sheet open onOpenChange={onOpenChange}>
      <SheetContent className="flex flex-col gap-4 max-h-[96dvh] overflow-y-auto">
        <SheetTitle>
          {editTemplate ? "Edit template" : "New template"}
        </SheetTitle>
        <SheetDescription>
          {editTemplate
            ? "Update the template details."
            : "Save a reusable prefill for quick transaction entry."}
        </SheetDescription>
        <form onSubmit={handleSubmit(onSubmit)} className="mt-4 flex flex-col gap-4">
          <label className="flex flex-col gap-1.5">
            <span className="text-sm text-zinc-500">Name</span>
            <input
              type="text"
              {...register("name")}
              placeholder="e.g. Coffee"
              className="h-11 rounded-(--radius-md) border border-(--border) bg-(--surface-2) px-3 text-sm focus-visible:ring-2 focus-visible:ring-(--accent) focus-visible:outline-none"
              autoFocus
            />
            {formState.errors.name && (
              <span className="text-xs text-(--danger)">{formState.errors.name.message}</span>
            )}
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-sm text-zinc-500">Type</span>
            <SegmentedControl
              options={[
                { value: "expense", label: "Expense" },
                { value: "income", label: "Income" },
              ]}
              value={type}
              onChange={(v) => setValue("type", v, { shouldValidate: true })}
            />
          </label>

          <div className="flex gap-2">
            <label className="flex flex-col gap-1.5 flex-1">
              <span className="text-sm text-zinc-500">Amount</span>
              <input
                type="text"
                inputMode="decimal"
                {...register("amount")}
                placeholder="0.00"
                className="h-11 rounded-(--radius-md) border border-(--border) bg-(--surface-2) px-3 text-sm focus-visible:ring-2 focus-visible:ring-(--accent) focus-visible:outline-none"
              />
              {formState.errors.amount && (
                <span className="text-xs text-(--danger)">{formState.errors.amount.message}</span>
              )}
            </label>
          </div>

          <label className="flex flex-col gap-1.5">
            <span className="text-sm text-zinc-500">Account</span>
            <select
              {...register("accountId")}
              className="h-11 rounded-(--radius-md) border border-(--border) bg-(--surface-2) px-3 text-sm focus-visible:ring-2 focus-visible:ring-(--accent) focus-visible:outline-none"
            >
              {[...accounts].sort((a, b) => a.name.localeCompare(b.name)).map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
            {formState.errors.accountId && (
              <span className="text-xs text-(--danger)">{formState.errors.accountId.message}</span>
            )}
          </label>

          {categories.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <span className="text-sm text-zinc-500">Categories</span>
              <div className="flex flex-wrap gap-1.5">
                {[...categories].sort((a, b) => a.name.localeCompare(b.name)).map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => toggleCategory(c.id)}
                    className={cn(
                      "rounded-full px-2.5 py-1 text-xs font-medium transition-colors",
                      categoryIds.includes(c.id)
                        ? "bg-(--accent) text-(--accent-foreground)"
                        : "bg-(--surface-2) text-zinc-500 hover:text-inherit",
                    )}
                  >
                    {c.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          <label className="flex flex-col gap-1.5">
            <span className="text-sm text-zinc-500">Description</span>
            <input
              type="text"
              {...register("description")}
              placeholder="Optional note"
              className="h-11 rounded-(--radius-md) border border-(--border) bg-(--surface-2) px-3 text-sm focus-visible:ring-2 focus-visible:ring-(--accent) focus-visible:outline-none"
            />
          </label>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!name?.trim() || !accountId || !amount}
            >
              {editTemplate ? "Save" : "Create"}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
};

export const TemplateDialog = ({
  isOpen,
  onOpenChange,
  onSave,
  editTemplate,
  accounts,
  categories,
}: TemplateDialogProps) => {
  if (!isOpen) return null;
  return <TemplateForm onOpenChange={onOpenChange} onSave={onSave} editTemplate={editTemplate ?? null} accounts={accounts} categories={categories} />;
};
