import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogContentTitle,
  DialogContentDescription,
} from "@/components/ui/dialog";
import { SegmentedControl } from "@/components/ui/segmented";
import {
  emptyAmount,
  amountToMinor,
  presetDate,
  type AmountState,
} from "@/lib/capture";
import type { Token } from "@/lib/crypto/crypto-store";
import type { CoinPrice } from "@/lib/crypto/rates";

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

  const [amount] = useState<AmountState>(() => emptyAmount(8));

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
    ((side === "buy" && sellAccountId && buyTokenId) ||
      (side === "sell" && sellTokenId && buyAccountId));

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
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogContentTitle>Log trade</DialogContentTitle>
        <DialogContentDescription>
          Record a crypto buy or sell
        </DialogContentDescription>

        <div className="mt-2 flex justify-center">
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
          <p className="mt-3 rounded-(--radius-md) border border-(--border-strong) bg-(--surface-2) px-3 py-2 text-xs text-zinc-500">
            No spendable fiat account yet — add one on the Banks page to log a trade.
          </p>
        )}

        {side === "buy" ? (
          <div className="mt-2 flex items-center gap-2">
            <select
              aria-label="Spend from"
              className="h-11 flex-1 rounded-(--radius-md) border border-(--border) bg-(--surface-2) px-3 text-sm text-zinc-200"
              value={sellAccountId}
              onChange={(e) => setValue("sellAccountId", e.target.value, { shouldValidate: true })}
            >
              <option value="">Spend from…</option>
              {[...fiatAccounts].sort((a, b) => a.name.localeCompare(b.name)).map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
            <span aria-hidden className="text-zinc-500">→</span>
            <select
              aria-label="Buy token"
              className="h-11 flex-1 rounded-(--radius-md) border border-(--border) bg-(--surface-2) px-3 text-sm text-zinc-200"
              value={buyTokenId}
              onChange={(e) => setValue("buyTokenId", e.target.value, { shouldValidate: true })}
            >
              <option value="">Select token…</option>
              {cryptoTokens.map((t) => (
                <option key={t.id} value={t.id}>{t.name} ({t.symbol})</option>
              ))}
            </select>
          </div>
        ) : (
          <div className="mt-2 flex items-center gap-2">
            <select
              aria-label="Sell token"
              className="h-11 flex-1 rounded-(--radius-md) border border-(--border) bg-(--surface-2) px-3 text-sm text-zinc-200"
              value={sellTokenId}
              onChange={(e) => setValue("sellTokenId", e.target.value, { shouldValidate: true })}
            >
              <option value="">Select token…</option>
              {cryptoTokens.map((t) => (
                <option key={t.id} value={t.id}>{t.name} ({t.symbol})</option>
              ))}
            </select>
            <span aria-hidden className="text-zinc-500">→</span>
            <select
              aria-label="Receive to"
              className="h-11 flex-1 rounded-(--radius-md) border border-(--border) bg-(--surface-2) px-3 text-sm text-zinc-200"
              value={buyAccountId}
              onChange={(e) => setValue("buyAccountId", e.target.value, { shouldValidate: true })}
            >
              <option value="">Receive to…</option>
              {[...fiatAccounts].sort((a, b) => a.name.localeCompare(b.name)).map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          </div>
        )}

        <input
          aria-label="Description"
          className="mt-2 h-11 w-full rounded-(--radius-md) border border-(--border) bg-(--surface-2) px-3 text-sm text-zinc-200 placeholder:text-zinc-500"
          placeholder="Description (optional)"
          {...register("description")}
        />

        <div className="mt-2 flex items-center gap-2">
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

        <div className="guilloche relative mt-4 rounded-(--radius-md) border border-(--border) px-3 py-3">
          <div
            data-testid="amount-readout"
            aria-live="polite"
            className="text-right text-4xl font-semibold tabular-nums text-zinc-50"
          >
            {formatMinor(minor, 8)}
            <span className="ml-1 text-lg text-zinc-500">
              {side === "buy" ? (sellAccount?.assetId?.slice(0, 3).toUpperCase() ?? "USD") : (buyToken?.symbol ?? "CRYPTO")}
            </span>
          </div>
        </div>

        {minor > 0n && effectiveRate > 0 && (
          <p className="mt-1 text-center text-xs text-zinc-500">
            ≈ {side === "buy"
              ? `${(Number(computedBuyAmount) / 10 ** 8).toFixed(8)} ${buyToken?.symbol ?? ""}`
              : `${formatMinor(computedBuyAmount, sellAccount?.decimals ?? 2)} ${sellAccount?.assetId?.slice(0, 3).toUpperCase() ?? "USD"}`
            }
          </p>
        )}

        <input
          aria-label="Rate"
          inputMode="decimal"
          className="mt-2 h-11 w-full rounded-(--radius-md) border border-(--border) bg-(--surface-2) px-3 text-sm text-zinc-200 placeholder:text-zinc-500"
          placeholder={`Rate (auto: $${autoRate.toLocaleString()})`}
          {...register("rateInput")}
        />

        <input
          aria-label="Fee"
          inputMode="decimal"
          className="mt-2 h-11 w-full rounded-(--radius-md) border border-(--border) bg-(--surface-2) px-3 text-sm text-zinc-200 placeholder:text-zinc-500"
          placeholder="Fee (optional)"
          {...register("feeInput")}
        />
        {feeMinor > 0n && (
          <select
            aria-label="Fee asset"
            className="mt-1 h-9 w-full rounded-(--radius-md) border border-(--border) bg-(--surface-2) px-3 text-xs text-zinc-200"
            value={feeAccountId}
            onChange={(e) => setValue("feeAccountId", e.target.value, { shouldValidate: true })}
          >
            {[...accounts].sort((a, b) => a.name.localeCompare(b.name)).map((a) => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>
        )}

        <Button size="lg" className="mt-3 w-full" disabled={!canSave} onClick={save}>
          {canSave ? `Log ${side}` : "Enter amount"}
        </Button>
      </DialogContent>
    </Dialog>
  );
};

export const TradeCapture = (props: TradeCaptureProps) => {
  const { isOpen: open, onOpenChange, userId, accounts, tokens, prices, onSave } = props;
  if (!open) return null;
  return <TradeForm onOpenChange={onOpenChange} userId={userId} accounts={accounts} tokens={tokens} prices={prices} onSave={onSave} />;
};
