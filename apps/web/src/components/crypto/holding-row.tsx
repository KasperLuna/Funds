import { Bitcoin, TrendingUp, TrendingDown } from "lucide-react";
import type { Holding } from "@/lib/crypto/crypto-store";
import type { CoinPrice } from "@/lib/crypto/rates";

function formatUsd(cents: bigint): string {
  const sign = cents < 0n ? "-" : "";
  const abs = cents < 0n ? -cents : cents;
  const major = Number(abs) / 100;
  return `${sign}$${major.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatUsdFromNumber(value: number): string {
  return `$${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function HoldingRow({
  holding,
  price,
  allocationPct,
}: {
  holding: Holding;
  price?: CoinPrice;
  allocationPct?: number;
}) {
  const { token, qtyMinor, avgCostMinor } = holding;
  const qty = Number(qtyMinor) / 10 ** token.decimals;
  const decimals = token.decimals > 4 ? 4 : token.decimals;

  const currentPrice = price?.current_price ?? 0;
  const valueUsd = qty * currentPrice;
  const costBasis = Number(avgCostMinor) / 100;
  const costBasisTotal = costBasis * qty;
  const unrealizedPL = valueUsd - costBasisTotal;
  const plPct = costBasisTotal > 0 ? (unrealizedPL / costBasisTotal) * 100 : 0;

  const change24h = price?.price_change_percentage_24h ?? 0;
  const isUp = change24h >= 0;

  return (
    <div className="flex items-center justify-between px-4 py-3">
      <div className="flex items-center gap-3 min-w-0">
        {price?.image ? (
          <img
            src={price.image}
            alt={token.symbol}
            className="h-8 w-8 shrink-0 rounded-full"
          />
        ) : (
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-(--border) bg-(--surface-2)">
            <Bitcoin className="h-4 w-4 text-(--accent)" />
          </div>
        )}
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="truncate text-sm font-medium">{token.name}</p>
            {allocationPct != null && allocationPct > 0 && (
              <span className="shrink-0 rounded border border-(--border) bg-(--surface-2) px-1.5 py-0.5 text-[10px] tabular-nums text-zinc-500">
                {allocationPct.toFixed(1)}%
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            <p className="truncate text-xs text-zinc-500">{token.symbol}</p>
            {price && (
              <span
                className={`flex items-center gap-0.5 text-[10px] tabular-nums ${isUp ? "text-(--accent)" : "text-(--danger)"}`}
              >
                {isUp ? (
                  <TrendingUp className="h-2.5 w-2.5" />
                ) : (
                  <TrendingDown className="h-2.5 w-2.5" />
                )}
                {Math.abs(change24h).toFixed(1)}%
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="text-right shrink-0">
        <p className="text-sm tabular-nums">
          {qty.toFixed(decimals)}
        </p>
        {price && (
          <div className="flex flex-col items-end gap-0.5">
            <p className="text-sm font-semibold tabular-nums text-zinc-100">
              {formatUsdFromNumber(valueUsd)}
            </p>
            <p
              className={`text-[10px] font-medium tabular-nums ${unrealizedPL >= 0 ? "text-(--accent)" : "text-(--danger)"}`}
            >
              {unrealizedPL >= 0 ? "+" : ""}
              {formatUsdFromNumber(unrealizedPL)} ({plPct >= 0 ? "+" : ""}
              {plPct.toFixed(1)}%)
            </p>
          </div>
        )}
        {!price && (
          <p className="text-xs text-zinc-500">avg {formatUsd(avgCostMinor)}</p>
        )}
      </div>
    </div>
  );
}
