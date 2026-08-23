// cavetail: display-only money formatting, never arithmetic.
// Scale by the asset's `decimals` (not a hardcoded 100) and prefix the
// asset's symbol, so a PHP account shows ₱ and a BTC account shows 8 dp.

const SYMBOLS: Record<string, string> = {
  USD: "$",
  CAD: "$",
  AUD: "$",
  PHP: "₱",
  EUR: "€",
  GBP: "£",
  JPY: "¥",
  KRW: "₩",
  CNY: "¥",
  INR: "₹",
  BTC: "₿",
  ETH: "Ξ",
};

export function assetSymbol(code?: string): string {
  if (!code) return "$";
  return SYMBOLS[code] ?? `${code} `;
}

export function formatMoney(
  minor: bigint,
  decimals = 2,
  code?: string,
): string {
  const sign = minor < 0n ? "-" : "";
  const abs = minor < 0n ? -minor : minor;
  const major = Number(abs) / 10 ** decimals;
  return `${sign}${assetSymbol(code)}${major.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`;
}
