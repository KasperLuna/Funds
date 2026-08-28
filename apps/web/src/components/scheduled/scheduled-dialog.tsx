import { useEffect, useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogContentTitle,
  DialogContentDescription,
} from "@/components/ui/dialog";
import { advanceRecurrence, type Frequency, type Schedule } from "@funds/core";
import type { ScheduledTxn } from "@/lib/scheduled/compute";

type AccountOption = { id: string; name: string };
type CategoryOption = { id: string; name: string };

const FREQUENCY_OPTIONS: { value: Frequency; label: string }[] = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "yearly", label: "Yearly" },
];

const TIMEZONE_OFFSETS = Array.from({ length: 25 }, (_, i) => i - 12);

function previewNextDate(
  frequency: Frequency,
  interval: number,
  from: Date,
): Date | null {
  try {
    const schedule: Schedule = {
      frequency,
      interval,
      invokeDate: from,
      previousDate: null,
    };
    return advanceRecurrence(schedule).invokeDate;
  } catch {
    return null;
  }
}

export function ScheduledDialog({
  open,
  onOpenChange,
  onSave,
  onDelete,
  editItem,
  accounts,
  categories,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (item: ScheduledTxn) => void;
  onDelete?: (item: ScheduledTxn) => void;
  editItem?: ScheduledTxn | null;
  accounts: AccountOption[];
  categories: CategoryOption[];
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<"income" | "expense">("expense");
  const [amount, setAmount] = useState("");
  const [accountId, setAccountId] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [frequency, setFrequency] = useState<Frequency>("monthly");
  const [interval, setInterval] = useState(1);
  const [timezoneOffset, setTimezoneOffset] = useState(0);
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    return d.toISOString().slice(0, 10);
  });

  useEffect(() => {
    if (open) {
      if (editItem) {
        setName(editItem.name);
        setDescription(editItem.description);
        setType(editItem.type);
        setAmount(String(Number(editItem.amountMinor < 0n ? -editItem.amountMinor : editItem.amountMinor) / 100));
        setAccountId(editItem.accountId);
        setSelectedCategories(editItem.categoryIds);
        setFrequency(editItem.recurrence?.frequency ?? "monthly");
        setInterval(editItem.recurrence?.interval ?? 1);
        setTimezoneOffset(0);
        if (editItem.invokeDate) {
          const d = new Date(editItem.invokeDate);
          setStartDate(d.toISOString().slice(0, 10));
        }
      } else {
        setName("");
        setDescription("");
        setType("expense");
        setAmount("");
        setAccountId(accounts[0]?.id ?? "");
        setSelectedCategories([]);
        setFrequency("monthly");
        setInterval(1);
        setTimezoneOffset(0);
        setStartDate(new Date().toISOString().slice(0, 10));
      }
    }
  }, [open, editItem, accounts]);

  const toggleCategory = (catId: string) => {
    setSelectedCategories((prev) =>
      prev.includes(catId)
        ? prev.filter((c) => c !== catId)
        : [...prev, catId],
    );
  };

  const nextPreview = useMemo(() => {
    const [y, m, d] = startDate.split("-").map(Number);
    const from = new Date(y!, m! - 1, d);
    return previewNextDate(frequency, interval, from);
  }, [frequency, interval, startDate]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed || !accountId || !amount) return;

    // cavetail: display-only formatting, not arithmetic
    // eslint-disable-next-line local/no-money-float
    const amountCents = Math.round(parseFloat(amount) * 100);
    const signedAmount = type === "expense" ? -Math.abs(amountCents) : Math.abs(amountCents);

    const [sy, sm, sd] = startDate.split("-").map(Number);
    const computedInvokeDate = new Date(sy!, sm! - 1, sd).getTime();
    const now = Date.now();

    const startDateChanged =
      editItem?.invokeDate != null && computedInvokeDate !== editItem.invokeDate;

    const item: ScheduledTxn = {
      id: editItem?.id ?? `sch-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
      userId: editItem?.userId ?? "dev-user",
      name: trimmed,
      description: description.trim(),
      type,
      amountMinor: BigInt(signedAmount),
      accountId,
      categoryIds: selectedCategories,
      recurrence: { frequency, interval },
      timezone: String(timezoneOffset),
      invokeDate: startDateChanged ? computedInvokeDate : (editItem?.invokeDate ?? computedInvokeDate),
      previousDate: startDateChanged ? null : (editItem?.previousDate ?? null),
      lastNotifiedAt: editItem?.lastNotifiedAt ?? null,
      active: editItem?.active ?? true,
      createdAt: editItem?.createdAt ?? now,
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
          {editItem ? "Edit scheduled transaction" : "New scheduled transaction"}
        </DialogContentTitle>
        <DialogContentDescription>
          {editItem
            ? "Update the recurrence schedule and details."
            : "Set up a recurring transaction entry."}
        </DialogContentDescription>
        <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-4">
          <label className="flex flex-col gap-1.5">
            <span className="text-sm text-zinc-500">Name</span>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Rent payment"
              className="h-11 rounded-(--radius-md) border border-(--border) bg-(--surface-2) px-3 text-sm focus-visible:ring-2 focus-visible:ring-(--accent) focus-visible:outline-none"
              autoFocus
            />
          </label>

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

          <div className="flex gap-2">
            <label className="flex flex-col gap-1.5 flex-1">
              <span className="text-sm text-zinc-500">Type</span>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as "income" | "expense")}
                className="h-11 rounded-(--radius-md) border border-(--border) bg-(--surface-2) px-3 text-sm focus-visible:ring-2 focus-visible:ring-(--accent) focus-visible:outline-none"
              >
                <option value="expense">Expense</option>
                <option value="income">Income</option>
              </select>
            </label>
            <label className="flex flex-col gap-1.5 flex-1">
              <span className="text-sm text-zinc-500">Amount</span>
              <input
                type="number"
                step="0.01"
                min="0"
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
              {accounts.map((a) => (
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
                {categories.map((c) => (
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

          <div className="flex gap-2">
            <label className="flex flex-col gap-1.5 flex-1">
              <span className="text-sm text-zinc-500">Frequency</span>
              <select
                value={frequency}
                onChange={(e) => setFrequency(e.target.value as Frequency)}
                className="h-11 rounded-(--radius-md) border border-(--border) bg-(--surface-2) px-3 text-sm focus-visible:ring-2 focus-visible:ring-(--accent) focus-visible:outline-none"
              >
                {FREQUENCY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1.5 w-24">
              <span className="text-sm text-zinc-500">Every</span>
              <input
                type="number"
                min="1"
                value={interval}
                onChange={(e) => setInterval(Math.max(1, parseInt(e.target.value) || 1))}
                className="h-11 rounded-(--radius-md) border border-(--border) bg-(--surface-2) px-3 text-sm focus-visible:ring-2 focus-visible:ring-(--accent) focus-visible:outline-none"
              />
            </label>
          </div>

          <div className="flex gap-2">
            <label className="flex flex-col gap-1.5 flex-1">
              <span className="text-sm text-zinc-500">Start date</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="h-11 rounded-(--radius-md) border border-(--border) bg-(--surface-2) px-3 text-sm focus-visible:ring-2 focus-visible:ring-(--accent) focus-visible:outline-none"
              />
            </label>
            <label className="flex flex-col gap-1.5 w-32">
              <span className="text-sm text-zinc-500">Timezone (UTC)</span>
              <select
                value={timezoneOffset}
                onChange={(e) => setTimezoneOffset(parseInt(e.target.value))}
                className="h-11 rounded-(--radius-md) border border-(--border) bg-(--surface-2) px-3 text-sm focus-visible:ring-2 focus-visible:ring-(--accent) focus-visible:outline-none"
              >
                {TIMEZONE_OFFSETS.map((offset) => (
                  <option key={offset} value={offset}>
                    UTC{offset >= 0 ? "+" : ""}{offset}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {nextPreview && (
            <p className="text-xs text-zinc-500">
              Next occurrence:{" "}
              {nextPreview.toLocaleDateString(undefined, {
                weekday: "short",
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </p>
          )}

          <div className="flex justify-end gap-2">
            {editItem && onDelete && (
              <Button
                type="button"
                variant="destructive"
                onClick={() => {
                  onDelete(editItem);
                  onOpenChange(false);
                }}
              >
                Delete
              </Button>
            )}
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
              {editItem ? "Save" : "Create"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
