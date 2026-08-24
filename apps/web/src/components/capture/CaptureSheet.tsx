import { useEffect, useMemo, useRef, useState } from "react";
import { Check } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogContentTitle,
  DialogContentDescription,
} from "@/components/ui/dialog";
import { SegmentedControl } from "@/components/ui/segmented";
import { Button } from "@/components/ui/button";
import { Keypad, type DigitKey } from "./Keypad";
import {
  emptyAmount,
  digit as applyDigit,
  backspace,
  clearAmount,
  amountToMinor,
  sanitizeAmountInput,
  presetDate,
  presetFromDate,
  buildTransactionRow,
  recentRepeats,
  type AmountState,
} from "@/lib/capture";
import type { RecentTxn } from "@/lib/capture";
import type { Template } from "@/lib/templates/templates-store";

export type AccountOption = { id: string; name: string; assetId: string; decimals: number; assetCode?: string };
export type CategoryOption = { id: string; name: string; color?: string };

export type VoicePrefill = {
  accountId: string | null;
  amountInput: string | null;
  categoryIds: string[];
  description: string;
  /** Edit prefill: preserve the original type/date instead of defaulting. */
  type?: "income" | "expense";
  date?: number;
};

export type CaptureSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  accounts: AccountOption[];
  categories: CategoryOption[];
  recentTxns: RecentTxn[];
  onSave: (row: Record<string, unknown>) => void;
  defaultAccountId?: string;
  voicePrefill?: VoicePrefill;
  editing?: boolean;
  templates?: Template[];
};

type FormSnapshot = {
  accountId: string;
  amount: AmountState;
  type: "expense" | "income";
  description: string;
  categoryIds: string[];
};

function formatReadout(state: AmountState): string {
  const major = Number(amountToMinor(state)) / 10 ** state.decimals;
  return major.toFixed(state.decimals);
}

function templateAmount(t: Template, dec: number): AmountState {
  // cavetail: display-only formatting, not arithmetic
  // eslint-disable-next-line local/no-money-float
  const major = Number(t.amountMinor) / 100;
  return { input: sanitizeAmountInput(major.toFixed(dec), dec), decimals: dec };
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
  voicePrefill,
  editing,
  templates = [],
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
  const [dateOverride, setDateOverride] = useState<number | null>(null);
  const [activeTemplateId, setActiveTemplateId] = useState<string | null>(null);
  const templateFormRef = useRef<FormSnapshot | null>(null);

  const reset = () => {
    setAmount(emptyAmount(decimals));
    setType("expense");
    setDescription("");
    setCategoryIds([]);
    setDatePreset("today");
    setDateOverride(null);
  };

  // Reset when the sheet opens; apply voice/edit prefill if provided
  useEffect(() => {
    if (open) {
      setActiveTemplateId(null);
      templateFormRef.current = null;
      if (voicePrefill) {
        const prefillAccountId = voicePrefill.accountId ?? accounts[0]?.id ?? "";
        const acc = accounts.find((a) => a.id === prefillAccountId);
        const dec = acc?.decimals ?? 2;
        const preset = voicePrefill.date ? presetFromDate(voicePrefill.date) : "today";
        setAccountId(prefillAccountId);
        setAmount(
          voicePrefill.amountInput
            ? { input: voicePrefill.amountInput, decimals: dec }
            : emptyAmount(dec),
        );
        setType(voicePrefill.type ?? "expense");
        setDescription(voicePrefill.description);
        setCategoryIds(voicePrefill.categoryIds);
        setDatePreset(preset === "custom" ? "today" : preset);
        setDateOverride(voicePrefill.date ?? null);
      } else {
        reset();
        setAccountId(defaultAccountId ?? accounts[0]?.id ?? "");
      }
    }
  }, [open, accounts, defaultAccountId, voicePrefill]);

  const handleAccountChange = (id: string) => {
    const next = accounts.find((a) => a.id === id);
    setAccountId(id);
    setAmount(emptyAmount(next?.decimals ?? 2));
  };

  const handleKey = (key: DigitKey) => setAmount((s) => applyDigit(s, key));
  const minor = amountToMinor(amount);
  const canSave = minor > 0n && !!selected;

  const suggestions = useMemo(
    () => recentRepeats(recentTxns.filter((t) => t.amountMinor !== 0n), 3),
    [recentTxns],
  );

  const applySuggestion = (txn: RecentTxn) => {
    // cavetail: display-only formatting, not arithmetic
    // eslint-disable-next-line local/no-money-float
    const major = Number(txn.amountMinor) / 10 ** decimals;
    const input = major.toFixed(decimals);
    setAmount({ input, decimals });
    setDescription(txn.description);
    setCategoryIds(txn.categoryIds);
  };

  const applyTemplate = (t: Template) => {
    if (activeTemplateId === t.id) {
      const prev = templateFormRef.current;
      setActiveTemplateId(null);
      templateFormRef.current = null;
      if (prev) {
        setAccountId(prev.accountId);
        setAmount(prev.amount);
        setType(prev.type);
        setDescription(prev.description);
        setCategoryIds(prev.categoryIds);
      }
      return;
    }
    templateFormRef.current = { accountId, amount, type, description, categoryIds };
    setActiveTemplateId(t.id);
    const acc = accounts.find((a) => a.id === t.accountId);
    const dec = acc?.decimals ?? decimals;
    if (acc) setAccountId(acc.id);
    setAmount(templateAmount(t, dec));
    setType(t.type);
    setDescription(t.description);
    setCategoryIds(t.categoryIds);
  };

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
        date: dateOverride ? new Date(dateOverride) : presetDate(datePreset),
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
        <DialogContentTitle className="font-display text-lg font-bold tracking-tight">
          {editing ? "Edit transaction" : "Log transaction"}
        </DialogContentTitle>
        <DialogContentDescription>
          {recentTxns.length > 0
            ? `${recentTxns.length} recent match${recentTxns.length === 1 ? "" : "es"} available`
            : "New entry"}
        </DialogContentDescription>

        {templates.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1" role="group" aria-label="Templates">
            {templates.map((t) => {
              const active = activeTemplateId === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => applyTemplate(t)}
                  className={`inline-flex min-h-11 items-center gap-1.5 rounded-(--radius-sm) px-2.5 text-sm font-medium transition-colors duration-150 ease-out focus-visible:ring-2 focus-visible:ring-(--accent) focus-visible:outline-none ${
                    active ? "text-(--accent)" : "text-zinc-400 hover:text-inherit"
                  }`}
                >
                  {active && <Check className="h-4 w-4" strokeWidth={3} aria-hidden />}
                  {t.name}
                </button>
              );
            })}
          </div>
        )}

        <div className="mt-3 flex items-center gap-1.5">
          <select
            aria-label="Account"
            className="h-11 flex-1 rounded-(--radius-md) border border-(--border) bg-(--surface-2) px-3 text-sm text-zinc-200 transition-colors focus-visible:outline-2 focus-visible:outline-(--accent)"
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

        {suggestions.length > 0 && (
          <div className="mt-3 flex gap-1.5 overflow-x-auto" role="list" aria-label="Suggestions">
            {suggestions.map((s) => (
              <button
                key={s.id}
                type="button"
                role="listitem"
                onClick={() => applySuggestion(s)}
                className="flex-shrink-0 rounded-(--radius-sm) px-2.5 py-1.5 text-sm font-medium text-zinc-400 transition-colors duration-150 ease-out hover:text-inherit focus-visible:ring-2 focus-visible:ring-(--accent) focus-visible:outline-none"
              >
                {s.description}{" "}
                <span className="font-semibold tabular-nums text-zinc-200">
                  {/* cavetail: display-only formatting, not arithmetic */}
                  {/* eslint-disable-next-line local/no-money-float */}
                  {(Number(s.amountMinor) / 10 ** decimals).toFixed(decimals)}
                </span>
              </button>
            ))}
          </div>
        )}

        <div className="guilloche relative mt-4 rounded-(--radius-md) border border-(--border) px-4 py-4">
          <div className="flex items-baseline justify-end gap-2">
          {selected?.assetCode && (
            <span
              aria-hidden
              className={`font-display text-2xl font-semibold ${type === "expense" ? "text-(--danger)/70" : "text-(--accent)/70"}`}
            >
              {selected.assetCode === "USD" ? "$" : `${selected.assetCode} `}
            </span>
          )}
            <div
              data-testid="amount-readout"
              aria-live="polite"
              className={`text-display-sm [font-variant-numeric:tabular-nums] ${
                type === "expense" ? "text-(--danger)" : "text-(--accent)"
              }`}
            >
              <span className="sm:hidden">{formatReadout(amount)}</span>
              <input
                aria-label="Amount"
                inputMode="decimal"
                autoFocus
                value={amount.input}
                onChange={(e) =>
                  setAmount((s) => ({ ...s, input: sanitizeAmountInput(e.target.value, s.decimals) }))
                }
                placeholder="0"
                className="hidden w-full min-w-0 bg-transparent text-right font-display outline-none placeholder:text-(--accent)/40 sm:inline-block"
              />
            </div>
          </div>
        </div>

        <input
          aria-label="Description"
          className="mt-4 h-11 w-full rounded-(--radius-md) border border-(--border) bg-(--surface-2) px-3 text-sm text-zinc-200 placeholder:text-zinc-500 transition-colors focus-visible:outline-2 focus-visible:outline-(--accent)"
          placeholder="Description (optional)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />

        {categories.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1" role="group" aria-label="Categories">
            {categories.map((c) => {
              const active = categoryIds.includes(c.id);
              return (
                <button
                  key={c.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => toggleCategory(c.id)}
                  className={`inline-flex min-h-11 items-center gap-1.5 rounded-(--radius-sm) px-2.5 text-sm font-medium transition-colors duration-150 ease-out focus-visible:ring-2 focus-visible:ring-(--accent) focus-visible:outline-none ${
                    active ? "text-(--accent)" : "text-zinc-400 hover:text-inherit"
                  }`}
                >
                  {active && <Check className="h-4 w-4" strokeWidth={3} aria-hidden />}
                  {c.name}
                </button>
              );
            })}
          </div>
        )}

        <div className="mt-4 flex justify-center">
          <SegmentedControl
            options={[
              { value: "expense", label: "Expense" },
              { value: "income", label: "Income" },
            ]}
            value={type}
            onChange={(v) => setType(v)}
          />
        </div>

        <div className="mt-5 sm:hidden">
          <Keypad
            onKey={handleKey}
            onBackspace={() => setAmount(backspace)}
            onClear={() => setAmount(clearAmount)}
            onSave={save}
            canSave={canSave}
            currencySymbol={selected?.assetCode === "USD" ? "$" : undefined}
          />
        </div>

        <div className="hidden sm:block">
          <Button
            size="lg"
            className="mt-5 w-full"
            disabled={!canSave}
            onClick={save}
            aria-label="Save transaction"
          >
            {canSave ? "Save" : "Enter amount"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}