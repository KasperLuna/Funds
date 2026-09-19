// cavetail: single valuation source — the dashboard net-worth crypto row and
// the assets crypto total both reduce through here, so equal inputs price the
// same by construction instead of drifting across duplicated float loops.
import type { Holding } from "./crypto-store";
import type { CoinPrice } from "./rates";

// cavetail: ids derive from non-zero holdings only (computeHoldings already
// filters zero-qty), sorted — both screens share the ["prices", key, code]
// TanStack slot instead of timing out into different 429/empty-map states.
export function coingeckoKeyForHoldings(holdings: Holding[]): string {
  return [
    ...new Set(
      holdings
        .map((h) => h.token.coingeckoId)
        .filter((id): id is string => !!id),
    ),
  ]
    .sort()
    .join(",");
}

export function cryptoPriceQueryKey(
  coingeckoKey: string,
  code: string,
): [string, string, string] {
  return ["prices", coingeckoKey, code];
}

// cavetail: display valuation only — CoinGecko ships a float rate, so the
// float read (qty × rate → fiat minor) is quarantined here; everything
// downstream stays BigInt minor rendered via formatMoney.
export function computeHoldingValueMinor(
  holding: Holding,
  prices: Map<string, CoinPrice>,
  fiatDecimals: number,
): bigint {
  const dec = Number(holding.token.decimals) || 0;
  const qty = Number(holding.qtyMinor) / 10 ** dec;
  const price = holding.token.coingeckoId
    ? (prices.get(holding.token.coingeckoId)?.current_price ?? 0)
    : 0;
  return BigInt(Math.round(qty * price * 10 ** fiatDecimals));
}

export function computeTokenValueMinor(
  holdings: Holding[],
  prices: Map<string, CoinPrice>,
  fiatDecimals: number,
): bigint {
  return holdings.reduce(
    (sum, h) => sum + computeHoldingValueMinor(h, prices, fiatDecimals),
    0n,
  );
}

// cavetail: totalCostMinor is qty_base × rate_base (rate scaled to token
// decimals), so fiat minor is an exact BigInt rescale — no float round-trip.
function rescaleCostMinor(costMinor: bigint, tokenDec: number, fiatDecimals: number): bigint {
  const divisor = 10n ** BigInt(2 * tokenDec);
  const scaled = costMinor * 10n ** BigInt(fiatDecimals);
  const negative = scaled < 0n;
  const magnitude = negative ? -scaled : scaled;
  const rounded = (magnitude + divisor / 2n) / divisor;
  return negative ? -rounded : rounded;
}

export function computeHoldingCostMinor(
  holding: Holding,
  fiatDecimals: number,
): bigint {
  const dec = Number(holding.token.decimals) || 0;
  return rescaleCostMinor(holding.totalCostMinor, dec, fiatDecimals);
}

export function computeTokenCostMinor(
  holdings: Holding[],
  fiatDecimals: number,
): bigint {
  return holdings.reduce(
    (sum, h) => sum + computeHoldingCostMinor(h, fiatDecimals),
    0n,
  );
}

// cavetail: avgCostMinor is the per-unit rate scaled to token decimals, so
// the fiat-minor unit cost is an exact single-decimal rescale like above.
export function computeHoldingUnitCostMinor(
  holding: Holding,
  fiatDecimals: number,
): bigint {
  const dec = Number(holding.token.decimals) || 0;
  const divisor = 10n ** BigInt(dec);
  const scaled = holding.avgCostMinor * 10n ** BigInt(fiatDecimals);
  const negative = scaled < 0n;
  const magnitude = negative ? -scaled : scaled;
  const rounded = (magnitude + divisor / 2n) / divisor;
  return negative ? -rounded : rounded;
}
