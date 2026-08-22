export function parseAmountToMinor(input: string, decimals: number): bigint {
  const trimmed = input.trim();
  let negative = false;
  let body = trimmed;
  if (body.startsWith("-")) {
    negative = true;
    body = body.slice(1).trim();
  } else if (body.startsWith("+")) {
    body = body.slice(1).trim();
  }

  let cleaned = "";
  for (const ch of body) {
    if ((ch >= "0" && ch <= "9") || ch === "." || ch === ",") {
      cleaned += ch;
    }
  }

  if (!cleaned) {
    throw new TypeError(`Invalid amount: "${input}"`);
  }

  const hasDot = cleaned.includes(".");
  const hasComma = cleaned.includes(",");
  if (hasDot && hasComma) {
    cleaned = cleaned.replace(/,/g, "");
  } else if (hasComma) {
    cleaned = cleaned.replace(/,/g, ".");
  }

  let intPart: string;
  let fracPart: string;
  if (cleaned.includes(".")) {
    const idx = cleaned.indexOf(".");
    intPart = cleaned.slice(0, idx) || "0";
    fracPart = cleaned.slice(idx + 1);
  } else {
    intPart = cleaned || "0";
    fracPart = "";
  }

  fracPart = fracPart.slice(0, decimals);
  const fracPadded = decimals === 0 ? "" : fracPart.padEnd(decimals, "0");

  const scale = 10n ** BigInt(decimals);
  const integerPart = BigInt(intPart);
  const fractionPart = fracPadded === "" ? 0n : BigInt(fracPadded);

  const minor = integerPart * scale + fractionPart;
  return negative ? -minor : minor;
}

export function formatMinor(
  minor: bigint,
  decimals: number,
  opts?: { locale?: string },
): string {
  const locale = opts?.locale ?? "en-US";
  const negative = minor < 0n;
  const absStr = (negative ? -minor : minor).toString();
  const padded = absStr.padStart(decimals + 1, "0");
  const intPart = padded.slice(0, padded.length - decimals);
  const fracPart = decimals === 0 ? "" : padded.slice(padded.length - decimals);
  const decimal = `${negative ? "-" : ""}${intPart}${fracPart ? "." + fracPart : ""}`;

  const nf = new Intl.NumberFormat(locale, {
    useGrouping: true,
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
  // cavetail: display-only conversion for Intl formatting
  return nf.format(Number(decimal));
}
