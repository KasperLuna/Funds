"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { SegmentedControl } from "@/components/ui/segmented";
import { AmountInput } from "@/components/capture/amount-input";
import { Keypad, type DigitKey } from "@/components/capture/keypad";
import {
  emptyAmount,
  amountToMinor,
  presetDate,
  sanitizeAmountInput,
  backspace,
  clearAmount,
  digit as applyDigit,
  type AmountState,
} from "@/lib/capture";
import type { Token } from "@/lib/crypto/crypto-store";
import type { CoinPrice } from "@/lib/crypto/rates";
import { cn } from "@/lib/utils";

export type AccountOption = {
  id: string;
  name: string;
  assetId: string;
  decimals: number;
  kind: string;
};

type TradeSide = "buy" | "sell";

export interface TradeCaptureProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  userId: string;
  accounts: AccountOption[];
  tokens: Token[];
  prices: Map<string, CoinPrice>;
  onSave: (trade: TradePayload) => void;
}

export type TradePayload = {
  side: TradeSide;
  sellAccountId: string;
  sellAssetId: string;
  sellAmountMinor: bigint;
  sellTokenId: string;
  buyAccountId: string;
  buyAssetId: string;
  buyAmountMinor: bigint;
  buyTokenId: string;
  rate: number;
  feeMinor: bigint;
  feeAssetId: string;
  description: string;
  date: Date;
  userId: string;
};

interface TradeFormProps {
  onOpenChange: (isOpen: boolean) => void;
  userId: string;
  accounts: AccountOption[];
  tokens: Token[];
  prices: Map<string, CoinPrice>;
  onSave: (trade: TradePayload) => void;
}

function parseFeeInput(input: string, decimals: number): bigint {
  const trimmed = input.trim();
  if (!trimmed) return 0n;
  const value = Number(trimmed);
  if (!Number.isFinite(value) || value < 0) return 0n;
  return BigInt(Math.round(value * 10 ** decimals));
}

function formatMinor(minor: bigint, decimals: number): string {
  // cavetail: display-only formatting, not arithmetic
  // eslint-disable-next-line local/no-money-float
  return (Number(minor) / 10 ** decimals).toFixed(decimals);
}

const tradeFormSchema = z.object({
  side: z.enum(["buy", "sell"]),
  sellAccountId: z.string(),
  sellTokenId: z.string(),
  buyAccountId: z.string(),
  buyTokenId: z.string(),
  rateInput: z.string(),
  feeInput: z.string(),
  feeAccountId: z.string(),
  description: z.string().max(500),
  datePreset: z.enum(["today", "yesterday"]),
});

type TradeFormValues = z.infer<typeof tradeFormSchema>;

type UseFormSetValue = ReturnType<typeof useForm<TradeFormValues>>["setValue"];

interface BuySideControlsProps {
  fiatAccounts: AccountOption[];
  cryptoTokens: Token[];
  sellAccountId: string;
  buyTokenId: string;
  setValue: UseFormSetValue;
}

const BuySideControls = ({ fiatAccounts, cryptoTokens, sellAccountId, buyTokenId, setValue }: BuySideControlsProps) => (
  <div className="flex items-center gap-2">
    <Select
      value={sellAccountId || "__placeholder__"}
      onValueChange={(v) => setValue("sellAccountId", v === "__placeholder__" ? "" : v, { shouldValidate: true })}
    >
      <SelectTrigger aria-label="Spend from" className="h-11 flex-1">
        <SelectValue placeholder="Spend from…" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="__placeholder__">Spend from…</SelectItem>
        {[...fiatAccounts].sort((a, b) => a.name.localeCompare(b.name)).map((a) => (
          <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
        ))}
      </SelectContent>
    </Select>
    <span aria-hidden className="text-zinc-500">→</span>
    <Select
      value={buyTokenId || "__placeholder__"}
      onValueChange={(v) => setValue("buyTokenId", v === "__placeholder__" ? "" : v, { shouldValidate: true })}
    >
      <SelectTrigger aria-label="Buy token" className="h-11 flex-1">
        <SelectValue placeholder="Select token…" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="__placeholder__">Select token…</SelectItem>
        {cryptoTokens.map((t) => (
          <SelectItem key={t.id} value={t.id}>{t.name} ({t.symbol})</SelectItem>
        ))}
      </SelectContent>
    </Select>
  </div>
);

interface SellSideControlsProps {
  fiatAccounts: AccountOption[];
  cryptoTokens: Token[];
  sellTokenId: string;
  buyAccountId: string;
  setValue: UseFormSetValue;
}

const SellSideControls = ({ fiatAccounts, cryptoTokens, sellTokenId, buyAccountId, setValue }: SellSideControlsProps) => (
  <div className="flex items-center gap-2">
    <Select
      value={sellTokenId || "__placeholder__"}
      onValueChange={(v) => setValue("sellTokenId", v === "__placeholder__" ? "" : v, { shouldValidate: true })}
    >
      <SelectTrigger aria-label="Sell token" className="h-11 flex-1">
        <SelectValue placeholder="Select token…" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="__placeholder__">Select token…</SelectItem>
        {cryptoTokens.map((t) => (
          <SelectItem key={t.id} value={t.id}>{t.name} ({t.symbol})</SelectItem>
        ))}
      </SelectContent>
    </Select>
    <span aria-hidden className="text-zinc-500">→</span>
    <Select
      value={buyAccountId || "__placeholder__"}
      onValueChange={(v) => setValue("buyAccountId", v === "__placeholder__" ? "" : v, { shouldValidate: true })}
    >
      <SelectTrigger aria-label="Receive to" className="h-11 flex-1">
        <SelectValue placeholder="Receive to…" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="__placeholder__">Receive to…</SelectItem>
        {[...fiatAccounts].sort((a, b) => a.name.localeCompare(b.name)).map((a) => (
          <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  </div>
);

const TradeForm = ({ onOpenChange, userId, accounts, tokens, prices, onSave }: TradeFormProps) => {
  const fiatAccounts = accounts.filter((a) => a.kind !== "exchange" && a.kind !== "wallet");
  const cryptoTokens = tokens.filter((t) => !t.deletedAt);

  const form = useForm<TradeFormValues>({
    resolver: zodResolver(tradeFormSchema),
    mode: "onChange",
    defaultValues: {
      side: "buy",
      sellAccountId: fiatAccounts[0]?.id ?? "",
      sellTokenId: "",
      buyAccountId: "",
      buyTokenId: cryptoTokens[0]?.id ?? "",
      rateInput: "",
      feeInput: "",
      feeAccountId: fiatAccounts[0]?.id ?? "",
      description: "",
      datePreset: "today",
    },
  });

  const { watch, setValue, register } = form;
  const side = watch("side");
  const sellAccountId = watch("sellAccountId");
  const sellTokenId = watch("sellTokenId");
  const buyAccountId = watch("buyAccountId");
  const buyTokenId = watch("buyTokenId");
  const rateInput = watch("rateInput") ?? "";
  const feeInput = watch("feeInput") ?? "";
  const feeAccountId = watch("feeAccountId");
  const description = watch("description");
  const datePreset = watch("datePreset");

  const [amount, setAmount] = useState<AmountState>(() => emptyAmount(8));
  const [focusedField, setFocusedField] = useState<HTMLElement | null>(null);

  const sellAccount = accounts.find((a) => a.id === sellAccountId);
  const buyToken = cryptoTokens.find((t) => t.id === buyTokenId);
  const sellToken = cryptoTokens.find((t) => t.id === sellTokenId);

  const autoRate =
    side === "buy" && buyToken?.coingeckoId
      ? (prices.get(buyToken.coingeckoId)?.current_price ?? 0)
      : side === "sell" && sellToken?.coingeckoId
        ? (prices.get(sellToken.coingeckoId)?.current_price ?? 0)
        : 0;

  const effectiveRate = rateInput ? Number(rateInput) : autoRate;

  const minor = amountToMinor(amount);
  const feeMinor = parseFeeInput(feeInput, sellAccount?.decimals ?? 2);

  // cavetail: BigInt materialization + Math.round on every keystroke; keep
  // memoization to avoid re-computing when only unrelated state changes.
  const computedBuyAmount = useMemo(() => {
    if (minor <= 0n || effectiveRate <= 0) return 0n;
    if (side === "buy") {
      // cavetail: display-only formatting, not arithmetic
      // eslint-disable-next-line local/no-money-float
      const usdValue = Number(minor) / 10 ** (sellAccount?.decimals ?? 2);
      const cryptoQty = usdValue / effectiveRate;
      return BigInt(Math.round(cryptoQty * 10 ** 8));
    }
    // cavetail: display-only formatting, not arithmetic
    // eslint-disable-next-line local/no-money-float
    const cryptoQty = Number(minor) / 10 ** 8;
    const usdValue = cryptoQty * effectiveRate;
    return BigInt(Math.round(usdValue * 10 ** (sellAccount?.decimals ?? 2)));
  }, [side, minor, effectiveRate, sellAccount?.decimals]);

  const canSave =
    minor > 0n &&
    effectiveRate > 0 &&
    Boolean(
      (side === "buy" && sellAccountId && buyTokenId) ||
        (side === "sell" && sellTokenId && buyAccountId),
    );

  // On mobile, focusing a text input (description, rate, fee) brings up the
  // soft keyboard and shrinks the viewport. The mobile Keypad below would
  // otherwise cover the focused field, so the `max-h-0` transition on the
  // keypad wrapper hides it. After the 220ms collapse animation, scroll the
  // focused field into the visible area of the sheet — iOS does not do this
  // automatically inside a `position: fixed` drawer.
  useEffect(() => {
    if (!focusedField) return;
    const el = focusedField;
    const id = window.setTimeout(() => {
      el.scrollIntoView({ block: "center", behavior: "smooth" });
    }, 220);
    return () => window.clearTimeout(id);
  }, [focusedField]);

  const save = () => {
    if (!canSave) return;
    const payload: TradePayload = {
      side,
      sellAccountId: side === "buy" ? sellAccountId : "",
      sellAssetId: side === "buy" ? (sellAccount?.assetId ?? "") : "",
      sellAmountMinor: side === "buy" ? minor : 0n,
      sellTokenId: side === "sell" ? sellTokenId : "",
      buyAccountId: side === "sell" ? buyAccountId : "",
      buyAssetId: side === "sell" ? (accounts.find((a) => a.id === buyAccountId)?.assetId ?? "") : "",
      buyAmountMinor: side === "sell" ? computedBuyAmount : 0n,
      buyTokenId: side === "buy" ? buyTokenId : "",
      rate: effectiveRate,
      feeMinor,
      feeAssetId: feeAccountId,
      description,
      date: presetDate(datePreset),
      userId,
    };
    onSave(payload);
    onOpenChange(false);
  };

  return (
    <Sheet open onOpenChange={onOpenChange}>
      <SheetContent className="flex flex-col gap-4 p-0">
        <div className="shrink-0 px-6 pt-6">
          <SheetTitle>Log trade</SheetTitle>
          <SheetDescription>
            Record a crypto buy or sell
          </SheetDescription>
        </div>
        <div className="flex flex-col gap-4 px-6 pb-6">
          <div className="flex justify-center">
          <SegmentedControl
            options={[
              { value: "buy", label: "Buy" },
              { value: "sell", label: "Sell" },
            ]}
            value={side}
            onChange={(v) => setValue("side", v as TradeSide, { shouldValidate: true })}
          />
        </div>

        {fiatAccounts.length === 0 && (
          <p className="rounded-(--radius-md) border border-(--border-strong) bg-(--surface-2) px-3 py-2 text-xs text-zinc-500">
            No spendable fiat account yet — add one on the Banks page to log a trade.
          </p>
        )}

        {side === "buy" ? (
          <BuySideControls
            fiatAccounts={fiatAccounts}
            cryptoTokens={cryptoTokens}
            sellAccountId={sellAccountId}
            buyTokenId={buyTokenId}
            setValue={setValue}
          />
        ) : (
          <SellSideControls
            fiatAccounts={fiatAccounts}
            cryptoTokens={cryptoTokens}
            sellTokenId={sellTokenId}
            buyAccountId={buyAccountId}
            setValue={setValue}
          />
        )}

        <Input
          aria-label="Description"
          className="h-11"
          placeholder="Description (optional)"
          {...register("description")}
          onFocus={(e) => setFocusedField(e.currentTarget)}
          onBlur={() => setFocusedField(null)}
        />

        <div className="flex items-center gap-2">
          <SegmentedControl
            options={[
              { value: "today", label: "Today" },
              { value: "yesterday", label: "Yesterday" },
            ]}
            value={datePreset}
            onChange={(v) => setValue("datePreset", v, { shouldValidate: true })}
          />
          {autoRate > 0 && !rateInput && (
            <span className="text-[10px] text-emerald-400">
              Rate: ${autoRate.toLocaleString()}
            </span>
          )}
        </div>

        <AmountInput
          className="mt-2"
          assetCode={side === "buy" ? (sellAccount?.assetId?.slice(0, 3).toUpperCase() ?? "USD") : (buyToken?.symbol ?? "CRYPTO")}
          tone="foreground"
          value={amount.input}
          // cavetail: display-only formatting, not arithmetic. `value` is the
          // partial keystroke buffer (e.g. "1" or "1.5") from the keypad;
          // mobile shows the canonical formatted version (e.g. "1.00000000").
          // eslint-disable-next-line local/no-money-float
          display={minor > 0n ? (Number(minor) / 10 ** 8).toFixed(8) : "0"}
          onChange={(next) => setAmount({ ...amount, input: sanitizeAmountInput(next, amount.decimals) })}
          sanitize={(v) => v}
          decimals={8}
          aria-label="Amount"
          testId="amount-readout"
        />

        {minor > 0n && effectiveRate > 0 && (
          <p className="text-center text-xs text-zinc-500">
            ≈ {side === "buy"
              ? `${(Number(computedBuyAmount) / 10 ** 8).toFixed(8)} ${buyToken?.symbol ?? ""}`
              : `${formatMinor(computedBuyAmount, sellAccount?.decimals ?? 2)} ${sellAccount?.assetId?.slice(0, 3).toUpperCase() ?? "USD"}`
            }
          </p>
        )}

        <Input
          aria-label="Rate"
          inputMode="decimal"
          className="h-11"
          placeholder={`Rate (auto: $${autoRate.toLocaleString()})`}
          {...register("rateInput")}
          onFocus={(e) => setFocusedField(e.currentTarget)}
          onBlur={() => setFocusedField(null)}
        />

        <Input
          aria-label="Fee"
          inputMode="decimal"
          className="h-11"
          placeholder="Fee (optional)"
          {...register("feeInput")}
          onFocus={(e) => setFocusedField(e.currentTarget)}
          onBlur={() => setFocusedField(null)}
        />
        {feeMinor > 0n && (
          <Select
            value={feeAccountId}
            onValueChange={(v) => setValue("feeAccountId", v, { shouldValidate: true })}
          >
            <SelectTrigger aria-label="Fee asset" className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[...accounts].sort((a, b) => a.name.localeCompare(b.name)).map((a) => (
                <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {/* Mobile: keypad drives the amount. Desktop: single Save button. */}
        <div
          className={cn(
            "mt-2 overflow-hidden transition-[max-height,opacity] duration-200 ease-out sm:hidden",
            focusedField ? "max-h-0 opacity-0" : "max-h-96 opacity-100",
          )}
          aria-hidden={Boolean(focusedField)}
        >
          <Keypad
            onKey={(k: DigitKey) => setAmount((s) => applyDigit(s, k))}
            onBackspace={() => setAmount(backspace)}
            onClear={() => setAmount(clearAmount)}
            onSave={save}
            canSave={canSave}
            currencySymbol={side === "buy" && sellAccount?.assetId === "USD" ? "$" : undefined}
          />
        </div>

        <div className="mt-2 hidden sm:block">
          <Button size="lg" className="w-full" disabled={!canSave} onClick={save}>
            {canSave ? `Log ${side}` : "Enter amount"}
          </Button>
        </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export const TradeCapture = (props: TradeCaptureProps) => {
  const { isOpen: open, onOpenChange, userId, accounts, tokens, prices, onSave } = props;
  if (!open) return null;
  return <TradeForm onOpenChange={onOpenChange} userId={userId} accounts={accounts} tokens={tokens} prices={prices} onSave={onSave} />;
};
