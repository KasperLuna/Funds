import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { SegmentedControl } from "@/components/ui/segmented";
import {
  Dialog,
  DialogContent,
  DialogContentTitle,
  DialogContentDescription,
} from "@/components/ui/dialog";
import type { Template } from "@/lib/templates/templates-store";

type AccountOption = { id: string; name: string; decimals: number };
type CategoryOption = { id: string; name: string };

export function TemplateDialog({
  open,
  onOpenChange,
  onSave,
  editTemplate,
  accounts,
  categories,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (t: Template) => void;
  editTemplate?: Template | null;
  accounts: AccountOption[];
  categories: CategoryOption[];
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<"income" | "expense">("expense");
  const [amount, setAmount] = useState("");
  const [accountId, setAccountId] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

  const decimals = accounts.find((a) => a.id === accountId)?.decimals ?? 2;

  useEffect(() => {
    if (open) {
      if (editTemplate) {
        setName(editTemplate.name);
        setDescription(editTemplate.description);
        setType(editTemplate.type);
        const dec = accounts.find((a) => a.id === editTemplate.accountId)?.decimals ?? 2;
        // cavetail: display-only formatting, not arithmetic
        // eslint-disable-next-line local/no-money-float
        setAmount((Number(editTemplate.amountMinor) / 10 ** dec).toFixed(dec));
        setAccountId(editTemplate.accountId);
        setSelectedCategories(editTemplate.categoryIds);
      } else {
        setName("");
        setDescription("");
        setType("expense");
        setAmount("");
        setAccountId(accounts[0]?.id ?? "");
        setSelectedCategories([]);
      }
    }
  }, [open, editTemplate, accounts]);

  const toggleCategory = (catId: string) => {
    setSelectedCategories((prev) =>
      prev.includes(catId)
        ? prev.filter((c) => c !== catId)
        : [...prev, catId],
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed || !accountId || !amount) return;

    // cavetail: display-only formatting, not arithmetic
    // eslint-disable-next-line local/no-money-float
    const amountMinor = BigInt(Math.round(Number(amount) * 10 ** decimals));
    const now = Date.now();

    const item: Template = {
      id: editTemplate?.id ?? `tpl-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
      name: trimmed,
      type,
      amountMinor,
      description: description.trim(),
      accountId,
      categoryIds: selectedCategories,
      createdAt: editTemplate?.createdAt ?? now,
      updatedAt: now,
      deletedAt: null,
    };

    onSave(item);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogContentTitle>
          {editTemplate ? "Edit template" : "New template"}
        </DialogContentTitle>
        <DialogContentDescription>
          {editTemplate
            ? "Update the template details."
            : "Save a reusable prefill for quick transaction entry."}
        </DialogContentDescription>
        <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-4">
          <label className="flex flex-col gap-1.5">
            <span className="text-sm text-zinc-500">Name</span>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Coffee"
              className="h-11 rounded-(--radius-md) border border-(--border) bg-(--surface-2) px-3 text-sm focus-visible:ring-2 focus-visible:ring-(--accent) focus-visible:outline-none"
              autoFocus
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-sm text-zinc-500">Type</span>
            <SegmentedControl
              options={[
                { value: "expense", label: "Expense" },
                { value: "income", label: "Income" },
              ]}
              value={type}
              onChange={(v) => setType(v)}
            />
          </label>

          <div className="flex gap-2">
            <label className="flex flex-col gap-1.5 flex-1">
              <span className="text-sm text-zinc-500">Amount</span>
              <input
                type="text"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="h-11 rounded-(--radius-md) border border-(--border) bg-(--surface-2) px-3 text-sm focus-visible:ring-2 focus-visible:ring-(--accent) focus-visible:outline-none"
              />
            </label>
          </div>

          <label className="flex flex-col gap-1.5">
            <span className="text-sm text-zinc-500">Account</span>
            <select
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              className="h-11 rounded-(--radius-md) border border-(--border) bg-(--surface-2) px-3 text-sm focus-visible:ring-2 focus-visible:ring-(--accent) focus-visible:outline-none"
            >
              {[...accounts].sort((a, b) => a.name.localeCompare(b.name)).map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
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
                    className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                      selectedCategories.includes(c.id)
                        ? "bg-(--accent) text-(--accent-foreground)"
                        : "bg-(--surface-2) text-zinc-500 hover:text-inherit"
                    }`}
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
              value={description}
              onChange={(e) => setDescription(e.target.value)}
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
              disabled={!name.trim() || !accountId || !amount}
            >
              {editTemplate ? "Save" : "Create"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}