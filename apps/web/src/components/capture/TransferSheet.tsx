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
import type { AccountOption } from "./CaptureSheet";
import {
  emptyAmount,
  digit as applyDigit,
  backspace,
  clearAmount,
  amountToMinor,
  sanitizeAmountInput,
  presetDate,
  buildTransferRows,
  validateTransfer,
  type AmountState,
  type TransferRows,
} from "@/lib/capture";

export type TransferSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  accounts: AccountOption[];
  onSave: (rows: TransferRows) => void;
  defaultFromAccountId?: string;
};

function parseFeeToMinor(input: string, decimals: number): bigint {
  const trimmed = input.trim();
  if (!trimmed) return 0n;
  const value = Number(trimmed);
  if (!Number.isFinite(value) || value < 0) return 0n;
  return BigInt(Math.round(value * 10 ** decimals));
}

function formatMinor(minor: bigint, decimals: number): string {
  // cavetail: display-only formatting, not arithmetic
  // eslint-disable-next-line local/no-money-float
  return `${(Number(minor) / 10 ** decimals).toFixed(decimals)}`;
}

export function TransferSheet({
  open,
  onOpenChange,
  userId,
  accounts,
  onSave,
  defaultFromAccountId,
}: TransferSheetProps) {
  const first = accounts[0];
  const second = accounts[1] ?? accounts[0];
  const [fromId, setFromId] = useState(defaultFromAccountId ?? first?.id ?? "");
  const [toId, setToId] = useState(second?.id ?? "");
  const from = useMemo(() => accounts.find((a) => a.id === fromId), [accounts, fromId]);
  const to = useMemo(() => accounts.find((a) => a.id === toId), [accounts, toId]);
  const decimals = from?.decimals ?? 2;

  const [amount, setAmount] = useState<AmountState>(() => emptyAmount(decimals));
  const [feeInput, setFeeInput] = useState("");
  const [description, setDescription] = useState("");
  const [datePreset, setDatePreset] = useState<"today" | "yesterday">("today");
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setAmount(emptyAmount(decimals));
    setFeeInput("");
    setDescription("");
    setDatePreset("today");
    setError(null);
  };

  useEffect(() => {
    if (open) {
      reset();
      setFromId(defaultFromAccountId ?? accounts[0]?.id ?? "");
      setToId((accounts[1] ?? accounts[0])?.id ?? "");
    }
  }, [open, accounts, defaultFromAccountId]);

  const handleKey = (key: DigitKey) => setAmount((s) => applyDigit(s, key));
  const minor = amountToMinor(amount);
  const feeMinor = parseFeeToMinor(feeInput, decimals);

  const form = {
    fromAccountId: fromId,
    fromAssetId: from?.assetId ?? "",
    toAccountId: toId,
    toAssetId: to?.assetId ?? "",
    amountMinor: minor,
    feeMinor,
    userId,
    description,
    date: presetDate(datePreset),
  };
  const validation = validateTransfer(form);
  const canSave = minor > 0n && validation === null;

  const save = () => {
    if (!canSave) {
      setError(validation);
      return;
    }
    onSave(buildTransferRows(form));
    reset();
  };

  const accountSelect = (
    label: string,
    value: string,
    onChange: (id: string) => void,
  ) => (
    <select
      aria-label={label}
      className="h-11 flex-1 rounded-(--radius-md) border border-(--border) bg-(--surface-2) px-3 text-sm text-zinc-200"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      {accounts.map((a) => (
        <option key={a.id} value={a.id}>
          {a.name}
        </option>
      ))}
    </select>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogContentTitle>Transfer</DialogContentTitle>
        <DialogContentDescription>
          Moves money between two accounts
        </DialogContentDescription>

        <div className="mt-3 flex items-center gap-1.5">
          {accountSelect("From account", fromId, (id) => {
            setFromId(id);
            setAmount(emptyAmount(accounts.find((a) => a.id === id)?.decimals ?? 2));
          })}
          <span aria-hidden className="text-zinc-500">
            →
          </span>
          {accountSelect("To account", toId, setToId)}
        </div>

        <div className="mt-4 flex items-center gap-1.5">
          <input
            aria-label="Description"
            className="h-11 flex-1 rounded-(--radius-md) border border-(--border) bg-(--surface-2) px-3 text-sm text-zinc-200 placeholder:text-zinc-500"
            placeholder="Description (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
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
          className="guilloche relative mt-4 rounded-(--radius-md) border border-(--border) px-3 py-3"
        >
          <div
            data-testid="amount-readout"
            aria-live="polite"
            className="text-right text-4xl font-semibold tabular-nums text-zinc-50"
          >
            {/* cavetail: display-only formatting, not arithmetic */}
            {/* eslint-disable-next-line local/no-money-float */}
            <span className="sm:hidden">{(Number(minor) / 10 ** decimals).toFixed(decimals)}</span>
            <input
              aria-label="Amount"
              inputMode="decimal"
              value={amount.input}
              onChange={(e) =>
                setAmount((s) => ({ ...s, input: sanitizeAmountInput(e.target.value, s.decimals) }))
              }
              placeholder="0"
              className="hidden w-full min-w-0 bg-transparent text-right font-display outline-none placeholder:text-zinc-600 sm:inline-block"
            />
          </div>
        </div>

        <input
          aria-label="Fee"
          inputMode="decimal"
          className="mt-4 h-11 w-full rounded-(--radius-md) border border-(--border) bg-(--surface-2) px-3 text-sm text-zinc-200 placeholder:text-zinc-500"
          placeholder="Fee (optional)"
          value={feeInput}
          onChange={(e) => setFeeInput(e.target.value)}
        />
        <p aria-live="polite" className="mt-1 text-xs text-zinc-500">
          {feeMinor > 0n
            ? `Fee ${formatMinor(feeMinor, decimals)} is deducted from ${from?.name ?? "origin"} in addition to the transferred amount.`
            : "No fee. Both legs post the same amount."}
        </p>

        {error && (
          <p role="alert" className="mt-1 text-xs text-(--danger)">
            {error}
          </p>
        )}

        <div className="mt-5 sm:hidden">
          <Keypad
            onKey={handleKey}
            onBackspace={() => setAmount(backspace)}
            onClear={() => setAmount(clearAmount)}
            onSave={save}
            canSave={canSave}
          />
        </div>

        <Button size="lg" className="mt-5 w-full" disabled={!canSave} onClick={save}>
          {canSave ? "Transfer" : fromId === toId ? validation : "Enter amount"}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
