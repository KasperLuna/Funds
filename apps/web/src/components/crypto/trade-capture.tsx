import { useEffect, useMemo, useState } from "react";
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

export type TradeCaptureProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  accounts: AccountOption[];
  tokens: Token[];
  prices: Map<string, CoinPrice>;
  onSave: (trade: TradePayload) => void;
};

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

export function TradeCapture({
  open,
  onOpenChange,
  userId,
  accounts,
  tokens,
  prices,
  onSave,
}: TradeCaptureProps) {
  const [side, setSide] = useState<TradeSide>("buy");

  const fiatAccounts = accounts.filter((a) => a.kind !== "exchange" && a.kind !== "wallet");
  const cryptoTokens = tokens.filter((t) => !t.deletedAt);

  const [sellAccountId, setSellAccountId] = useState("");
  const [sellTokenId, setSellTokenId] = useState("");
  const [buyAccountId, setBuyAccountId] = useState("");
  const [buyTokenId, setBuyTokenId] = useState("");

  const [amount, setAmount] = useState<AmountState>(() => emptyAmount(8));
  const [rateInput, setRateInput] = useState("");
  const [feeInput, setFeeInput] = useState("");
  const [feeAccountId, setFeeAccountId] = useState("");
  const [description, setDescription] = useState("");
  const [datePreset, setDatePreset] = useState<"today" | "yesterday">("today");

  const reset = () => {
    setSide("buy");
    setSellAccountId(fiatAccounts[0]?.id ?? "");
    setSellTokenId("");
    setBuyAccountId("");
    setBuyTokenId(cryptoTokens[0]?.id ?? "");
    setAmount(emptyAmount(8));
    setRateInput("");
    setFeeInput("");
    setFeeAccountId(fiatAccounts[0]?.id ?? "");
    setDescription("");
    setDatePreset("today");
  };

  useEffect(() => {
    if (open) reset();
  }, [open]);

  const sellAccount = useMemo(
    () => accounts.find((a) => a.id === sellAccountId),
    [accounts, sellAccountId],
  );
  const buyToken = useMemo(
    () => cryptoTokens.find((t) => t.id === buyTokenId),
    [cryptoTokens, buyTokenId],
  );
  const sellToken = useMemo(
    () => cryptoTokens.find((t) => t.id === sellTokenId),
    [cryptoTokens, sellTokenId],
  );

  const autoRate = useMemo(() => {
    if (side === "buy" && buyToken?.coingeckoId) {
      const p = prices.get(buyToken.coingeckoId);
      return p?.current_price ?? 0;
    }
    if (side === "sell" && sellToken?.coingeckoId) {
      const p = prices.get(sellToken.coingeckoId);
      return p?.current_price ?? 0;
    }
    return 0;
  }, [side, buyToken, sellToken, prices]);

  const effectiveRate = rateInput ? Number(rateInput) : autoRate;

  const minor = amountToMinor(amount);
  const feeMinor = parseFeeInput(feeInput, sellAccount?.decimals ?? 2);

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
    reset();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
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
            onChange={(v) => setSide(v as TradeSide)}
          />
        </div>

        {fiatAccounts.length === 0 && (
          <p className="mt-3 rounded-(--radius-md) border border-(--border-strong) bg-(--surface-2) px-3 py-2 text-xs text-zinc-500">
            No spendable fiat account yet — add one on the Banks page to log a trade.
          </p>
        )}

        {side === "buy" ? (
          <>
            <div className="mt-2 flex items-center gap-2">
              <select
                aria-label="Spend from"
                className="h-11 flex-1 rounded-(--radius-md) border border-(--border) bg-(--surface-2) px-3 text-sm text-zinc-200"
                value={sellAccountId}
                onChange={(e) => setSellAccountId(e.target.value)}
              >
                <option value="">Spend from…</option>
                {fiatAccounts.map((a) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
              <span aria-hidden className="text-zinc-500">→</span>
              <select
                aria-label="Buy token"
                className="h-11 flex-1 rounded-(--radius-md) border border-(--border) bg-(--surface-2) px-3 text-sm text-zinc-200"
                value={buyTokenId}
                onChange={(e) => setBuyTokenId(e.target.value)}
              >
                <option value="">Select token…</option>
                {cryptoTokens.map((t) => (
                  <option key={t.id} value={t.id}>{t.name} ({t.symbol})</option>
                ))}
              </select>
            </div>
          </>
        ) : (
          <>
            <div className="mt-2 flex items-center gap-2">
              <select
                aria-label="Sell token"
                className="h-11 flex-1 rounded-(--radius-md) border border-(--border) bg-(--surface-2) px-3 text-sm text-zinc-200"
                value={sellTokenId}
                onChange={(e) => setSellTokenId(e.target.value)}
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
                onChange={(e) => setBuyAccountId(e.target.value)}
              >
                <option value="">Receive to…</option>
                {fiatAccounts.map((a) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            </div>
          </>
        )}

        <input
          aria-label="Description"
          className="mt-2 h-11 w-full rounded-(--radius-md) border border-(--border) bg-(--surface-2) px-3 text-sm text-zinc-200 placeholder:text-zinc-500"
          placeholder="Description (optional)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />

        <div className="mt-2 flex items-center gap-2">
          <SegmentedControl
            options={[
              { value: "today", label: "Today" },
              { value: "yesterday", label: "Yesterday" },
            ]}
            value={datePreset}
            onChange={(v) => setDatePreset(v)}
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
          value={rateInput}
          onChange={(e) => setRateInput(e.target.value)}
        />

        <input
          aria-label="Fee"
          inputMode="decimal"
          className="mt-2 h-11 w-full rounded-(--radius-md) border border-(--border) bg-(--surface-2) px-3 text-sm text-zinc-200 placeholder:text-zinc-500"
          placeholder="Fee (optional)"
          value={feeInput}
          onChange={(e) => setFeeInput(e.target.value)}
        />
        {feeMinor > 0n && (
          <select
            aria-label="Fee asset"
            className="mt-1 h-9 w-full rounded-(--radius-md) border border-(--border) bg-(--surface-2) px-3 text-xs text-zinc-200"
            value={feeAccountId}
            onChange={(e) => setFeeAccountId(e.target.value)}
          >
            {accounts.map((a) => (
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
}
