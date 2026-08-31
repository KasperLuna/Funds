import type { Token } from "@/lib/crypto/crypto-store";
import type { CoinPrice } from "@/lib/crypto/rates";

export type TradeSide = "buy" | "sell";

export interface TradeQuote {
  autoRate: number;
  computedBuyMinor: bigint;
}

/**
 * Compute the auto-rate (live USD price for the active token) and the
 * complementary minor-unit amount the other leg of the trade posts.
 * side = "buy":   `minor` is fiat → `computedBuyMinor` is crypto (8 dp).
 * side = "sell":  `minor` is crypto (8 dp) → `computedBuyMinor` is fiat.
 * Returns zero when the amount or rate is non-positive.
 */
export function computeTradeQuote(
  side: TradeSide,
  minor: bigint,
  rateInput: string,
  sellToken: Token | undefined,
  buyToken: Token | undefined,
  prices: Map<string, CoinPrice>,
  fiatDecimals: number,
): TradeQuote {
  const autoRate =
    side === "buy" && buyToken?.coingeckoId
      ? (prices.get(buyToken.coingeckoId)?.current_price ?? 0)
      : side === "sell" && sellToken?.coingeckoId
        ? (prices.get(sellToken.coingeckoId)?.current_price ?? 0)
        : 0;
  const effectiveRate = rateInput ? Number(rateInput) : autoRate;
  if (minor <= 0n || effectiveRate <= 0) {
    return { autoRate, computedBuyMinor: 0n };
  }
  if (side === "buy") {
    // cavetail: display-only formatting, not arithmetic
    // eslint-disable-next-line local/no-money-float
    const usdValue = Number(minor) / 10 ** fiatDecimals;
    const cryptoQty = usdValue / effectiveRate;
    return { autoRate, computedBuyMinor: BigInt(Math.round(cryptoQty * 10 ** 8)) };
  }
  // cavetail: display-only formatting, not arithmetic
  // eslint-disable-next-line local/no-money-float
  const cryptoQty = Number(minor) / 10 ** 8;
  const usdValue = cryptoQty * effectiveRate;
  return { autoRate, computedBuyMinor: BigInt(Math.round(usdValue * 10 ** fiatDecimals)) };
}
