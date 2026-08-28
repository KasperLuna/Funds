import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, ChevronRight, LayoutTemplate } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogContentTitle,
  DialogContentDescription,
} from "@/components/ui/dialog";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
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
import { cn } from "@/lib/utils";

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

function formatCustomDate(ts: number): string {
  return new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(new Date(ts));
}

/** Quiet hairline chip used for account/date/templates context triggers. */
function ContextChip({
  active,
  children,
  className,
  ...props
}: React.ComponentProps<"button"> & { active?: boolean }) {
  return (
    <button
      type="button"
      className={cn(
        "inline-flex min-h-11 items-center gap-1.5 rounded-(--radius-md) border border-(--border) bg-(--surface-2) px-3 text-sm font-medium transition-colors duration-150 ease-out hover:bg-(--surface-3) focus-visible:ring-2 focus-visible:ring-(--accent) focus-visible:outline-none",
        active ? "text-inherit" : "text-zinc-400 hover:text-inherit",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

function Caret({ open }: { open: boolean }) {
  return (
    <ChevronDown
      className={cn("h-4 w-4 text-zinc-500 transition-transform duration-150 ease-out", open && "rotate-180")}
      aria-hidden
    />
  );
}

/** Controlled popover whose open state is exposed to the trigger/caret. */
function ContextPopover({
  children,
}: {
  children: (controls: { open: boolean; setOpen: (open: boolean) => void }) => React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return <Popover open={open} onOpenChange={setOpen}>{children({ open, setOpen })}</Popover>;
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

  // Reset when the sheet opens; apply voice/edit prefill if provided.
  // cavetail: accounts/defaultAccountId are read inside the callback but must
  // NOT be dependencies — the parent re-renders on sync ticks and a new array
  // reference would re-trigger this effect, overwriting the user's in-progress
  // selections (e.g. a manually chosen account) back to the default.
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
  }, [open, voicePrefill]);

  const handleAccountChange = (id: string) => {
    const next = accounts.find((a) => a.id === id);
    const nextDec = next?.decimals ?? 2;
    setAccountId(id);
    if (nextDec !== decimals) {
      setAmount(emptyAmount(nextDec));
    }
  };

  const handleKey = (key: DigitKey) => setAmount((s) => applyDigit(s, key));
  const minor = amountToMinor(amount);
  const canSave = minor > 0n && !!selected;

  const suggestions = useMemo(
    () => recentRepeats(recentTxns.filter((t) => t.amountMinor !== 0n), 3),
    [recentTxns],
  );

  const applySuggestion = (txn: RecentTxn) => {
    // Suggestions carry signed minor units (expenses negative, income positive).
    // The keypad input is always unsigned; the sign selects the type.
    const isExpense = txn.amountMinor < 0n;
    const absMinor = isExpense ? -txn.amountMinor : txn.amountMinor;
    // cavetail: display-only formatting, not arithmetic
    const major = Number(absMinor) / 10 ** decimals;
    const input = major.toFixed(decimals);
    setAmount({ input, decimals });
    setType(isExpense ? "expense" : "income");
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
    onOpenChange(false);
  };

  const toggleCategory = (id: string) =>
    setCategoryIds((ids) =>
      ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id],
    );

  const activeTemplate = templates.find((t) => t.id === activeTemplateId);
  const dateLabel = dateOverride
    ? formatCustomDate(dateOverride)
    : datePreset === "yesterday"
      ? "Yesterday"
      : "Today";

  const applyDatePreset = (preset: "today" | "yesterday") => {
    setDatePreset(preset);
    setDateOverride(null);
  };

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

        {/* Context strip — quiet chips: account · date · templates (nested). */}
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <ContextPopover>
            {({ open: accountOpen, setOpen: setAccountOpen }) => (
              <>
                <PopoverTrigger asChild>
                  <ContextChip active={accountOpen} aria-label="Account">
                    <span className="max-w-40 truncate">{selected?.name ?? "Account"}</span>
                    <Caret open={accountOpen} />
                  </ContextChip>
                </PopoverTrigger>
                <PopoverContent align="start">
                  <div role="listbox" aria-label="Account" className="flex flex-col gap-0.5">
                    {accounts.map((a) => (
                      <button
                        key={a.id}
                        type="button"
                        role="option"
                        aria-selected={a.id === accountId}
                        onClick={() => {
                          handleAccountChange(a.id);
                          setAccountOpen(false);
                        }}
                        className={cn(
                          "flex min-h-11 items-center justify-between gap-3 rounded-(--radius-sm) px-3 text-sm transition-colors hover:bg-(--surface-2) focus-visible:ring-2 focus-visible:ring-(--accent) focus-visible:outline-none",
                          a.id === accountId ? "font-semibold text-inherit" : "text-zinc-400",
                        )}
                      >
                        <span className="truncate">{a.name}</span>
                        {a.id === accountId && (
                          <Check className="h-4 w-4 shrink-0 text-(--accent)" strokeWidth={3} aria-hidden />
                        )}
                      </button>
                    ))}
                  </div>
                </PopoverContent>
              </>
            )}
          </ContextPopover>

          <ContextPopover>
            {({ open: dateOpen, setOpen: setDateOpen }) => (
              <>
                <PopoverTrigger asChild>
                  <ContextChip active={dateOpen} aria-label="Date">
                    <span className="tabular-nums">{dateLabel}</span>
                    <Caret open={dateOpen} />
                  </ContextChip>
                </PopoverTrigger>
                <PopoverContent align="start" className="w-auto min-w-64">
                  <div className="flex gap-1.5 p-1">
                    {(["today", "yesterday"] as const).map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        aria-pressed={!dateOverride && datePreset === preset}
                        onClick={() => applyDatePreset(preset)}
                        className={cn(
                          "min-h-11 flex-1 rounded-(--radius-sm) px-3 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-(--accent) focus-visible:outline-none",
                          !dateOverride && datePreset === preset
                            ? "bg-(--surface-2) text-inherit"
                            : "text-zinc-400 hover:bg-(--surface-2) hover:text-inherit",
                        )}
                      >
                        {preset === "today" ? "Today" : "Yesterday"}
                      </button>
                    ))}
                  </div>
                  <div className="mt-1 border-t border-(--border) pt-1.5">
                    <Calendar
                      mode="single"
                      selected={dateOverride ? new Date(dateOverride) : undefined}
                      defaultMonth={new Date()}
                      onSelect={(day) => {
                        if (!day) return;
                        setDateOverride(day.getTime());
                        setDateOpen(false);
                      }}
                    />
                  </div>
                </PopoverContent>
              </>
            )}
          </ContextPopover>

          {templates.length > 0 && (
            <ContextPopover>
              {({ open: templatesOpen, setOpen: setTemplatesOpen }) => (
                <>
                  <PopoverTrigger asChild>
                    <ContextChip active={templatesOpen || !!activeTemplate} aria-label="Templates">
                      {activeTemplate ? (
                        <>
                          <Check className="h-4 w-4 text-(--accent)" strokeWidth={3} aria-hidden />
                          <span className="max-w-40 truncate">{activeTemplate.name}</span>
                        </>
                      ) : (
                        <>
                          <LayoutTemplate className="h-4 w-4" aria-hidden />
                          <span>Templates</span>
                        </>
                      )}
                      <Caret open={templatesOpen} />
                    </ContextChip>
                  </PopoverTrigger>
                  <PopoverContent align="start" className="w-64">
                    <p className="label-micro px-3 pb-1 pt-1.5">Apply a template</p>
                    <div className="flex max-h-64 flex-col gap-0.5 overflow-y-auto">
                      {templates.map((t) => {
                        const isActive = activeTemplateId === t.id;
                        return (
                          <button
                            key={t.id}
                            type="button"
                            aria-pressed={isActive}
                            onClick={() => {
                              applyTemplate(t);
                              setTemplatesOpen(false);
                            }}
                            className={cn(
                              "flex min-h-11 items-center justify-between gap-3 rounded-(--radius-sm) px-3 text-sm transition-colors hover:bg-(--surface-2) focus-visible:ring-2 focus-visible:ring-(--accent) focus-visible:outline-none",
                              isActive ? "font-semibold text-inherit" : "text-zinc-400",
                            )}
                          >
                            <span className="truncate">{t.name}</span>
                            <ChevronRight className="h-4 w-4 shrink-0 text-zinc-600" aria-hidden />
                          </button>
                        );
                      })}
                    </div>
                  </PopoverContent>
                </>
              )}
            </ContextPopover>
          )}
        </div>

        {/* Hero — the amount readout, the one dominant plate. */}
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

        {/* Quick-fill zone — suggestions (recent repeats) below the hero. */}
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