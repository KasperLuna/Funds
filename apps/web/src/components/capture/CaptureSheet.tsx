import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogContentTitle,
  DialogContentDescription,
} from "@/components/ui/dialog";
import { SegmentedControl } from "@/components/ui/segmented";
import { Keypad, type DigitKey } from "./Keypad";
import {
  emptyAmount,
  digit as applyDigit,
  backspace,
  clearAmount,
  amountToMinor,
  presetDate,
  buildTransactionRow,
  type AmountState,
} from "@/lib/capture";
import type { RecentTxn } from "@/lib/capture";

export type AccountOption = { id: string; name: string; assetId: string; decimals: number };
export type CategoryOption = { id: string; name: string; color?: string };

export type CaptureSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  accounts: AccountOption[];
  categories: CategoryOption[];
  recentTxns: RecentTxn[];
  onSave: (row: Record<string, unknown>) => void;
  defaultAccountId?: string;
};

function formatReadout(state: AmountState): string {
  const major = Number(amountToMinor(state)) / 10 ** state.decimals;
  return major.toFixed(state.decimals);
}

export function CaptureSheet({
  open,
  onOpenChange,
  userId,
  accounts,
  categories,
  recentTxns,
  onSave,
  defaultAccountId,
}: CaptureSheetProps) {
  const first = accounts[0];
  const [accountId, setAccountId] = useState(defaultAccountId ?? first?.id ?? "");
  const selected = useMemo(
    () => accounts.find((a) => a.id === accountId) ?? first,
    [accounts, accountId, first],
  );
  const decimals = selected?.decimals ?? 2;

  const [amount, setAmount] = useState<AmountState>(() => emptyAmount(decimals));
  const [type, setType] = useState<"expense" | "income">("expense");
  const [description, setDescription] = useState("");
  const [categoryIds, setCategoryIds] = useState<string[]>([]);
  const [datePreset, setDatePreset] = useState<"today" | "yesterday">("today");

  const reset = () => {
    setAmount(emptyAmount(decimals));
    setType("expense");
    setDescription("");
    setCategoryIds([]);
    setDatePreset("today");
  };

  // Reset when the sheet opens
  useEffect(() => {
    if (open) {
      reset();
      setAccountId(defaultAccountId ?? accounts[0]?.id ?? "");
    }
  }, [open, accounts, defaultAccountId]);

  const handleAccountChange = (id: string) => {
    const next = accounts.find((a) => a.id === id);
    setAccountId(id);
    setAmount(emptyAmount(next?.decimals ?? 2));
  };

  const handleKey = (key: DigitKey) => setAmount((s) => applyDigit(s, key));
  const minor = amountToMinor(amount);
  const canSave = minor > 0n;

  const save = () => {
    if (!selected || !canSave) return;
    onSave(
      buildTransactionRow({
        type,
        amountMinor: minor,
        accountId,
        assetId: selected.assetId,
        userId,
        categoryIds,
        description,
        date: presetDate(datePreset),
      }),
    );
    reset();
  };

  const toggleCategory = (id: string) =>
    setCategoryIds((ids) =>
      ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id],
    );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogContentTitle>Log transaction</DialogContentTitle>
        <DialogContentDescription>
          {recentTxns.length > 0
            ? `${recentTxns.length} recent match${recentTxns.length === 1 ? "" : "es"} available`
            : "New entry"}
        </DialogContentDescription>

        <div className="mt-2 flex items-center gap-2">
          <select
            aria-label="Account"
            className="h-11 flex-1 rounded-(--radius-md) bg-(--surface-2) px-3 text-sm"
            value={accountId}
            onChange={(e) => handleAccountChange(e.target.value)}
          >
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
          <SegmentedControl
            options={[
              { value: "today", label: "Today" },
              { value: "yesterday", label: "Yesterday" },
            ]}
            value={datePreset}
            onChange={(v) => setDatePreset(v)}
          />
        </div>

        <div
          data-testid="amount-readout"
          aria-live="polite"
          className={`mt-4 text-right text-4xl tabular-nums ${
            type === "expense" ? "text-(--danger)" : "text-(--accent)"
          }`}
        >
          {formatReadout(amount)}
        </div>

        <input
          aria-label="Description"
          className="mt-2 h-11 w-full rounded-(--radius-md) bg-(--surface-2) px-3 text-sm"
          placeholder="Description (optional)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />

        {categories.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2" role="group" aria-label="Categories">
            {categories.map((c) => {
              const active = categoryIds.includes(c.id);
              const color = c.color;
              return (
                <button
                  key={c.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => toggleCategory(c.id)}
                  className={`min-h-11 rounded-(--radius-md) px-3 text-sm font-medium transition-colors ${
                    active ? "text-white" : "hover:opacity-80"
                  }`}
                  style={{
                    backgroundColor: active ? color : "var(--surface-2)",
                    color: active ? "#fff" : undefined,
                  }}
                >
                  {c.name}
                </button>
              );
            })}
          </div>
        )}

        <div className="mt-2 flex justify-center">
          <SegmentedControl
            options={[
              { value: "expense", label: "Expense" },
              { value: "income", label: "Income" },
            ]}
            value={type}
            onChange={(v) => setType(v)}
          />
        </div>

        <Keypad
          onKey={handleKey}
          onBackspace={() => setAmount(backspace)}
          onClear={() => setAmount(clearAmount)}
        />

        <Button size="lg" className="mt-3 w-full" disabled={!canSave} onClick={save}>
          {canSave ? "Save" : "Enter amount"}
        </Button>
      </DialogContent>
    </Dialog>
  );
}