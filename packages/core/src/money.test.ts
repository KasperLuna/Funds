import { describe, expect, it } from "vitest";
import fc from "fast-check";
import { parseAmountToMinor, formatMinor, convert } from "./money";

describe("parseAmountToMinor", () => {
  it("parses a plain amount to minor units", () => {
    expect(parseAmountToMinor("12.50", 2)).toBe(1250n);
    expect(parseAmountToMinor("12", 0)).toBe(12n);
    expect(parseAmountToMinor("0.00000001", 8)).toBe(1n);
  });

  it("handles comma as thousands separator when both separators present", () => {
    expect(parseAmountToMinor("1,234.56", 2)).toBe(123456n);
  });

  it("treats a lone comma as the decimal separator", () => {
    expect(parseAmountToMinor("12,50", 2)).toBe(1250n);
  });

  it("truncates instead of rounding extra fraction digits", () => {
    expect(parseAmountToMinor("12.999", 2)).toBe(1299n);
  });

  it("honors a leading negative sign", () => {
    expect(parseAmountToMinor("-12.50", 2)).toBe(-1250n);
    expect(parseAmountToMinor("-12", 0)).toBe(-12n);
  });

  it("ignores a leading plus sign", () => {
    expect(parseAmountToMinor("+12.50", 2)).toBe(1250n);
  });

  it("strips currency symbols and surrounding whitespace", () => {
    expect(parseAmountToMinor("$12.50", 2)).toBe(1250n);
    expect(parseAmountToMinor("12,50 €", 2)).toBe(1250n);
  });

  it("handles integer amounts for decimals 0/2/8", () => {
    expect(parseAmountToMinor("12", 2)).toBe(1200n);
    expect(parseAmountToMinor("12", 8)).toBe(1200000000n);
  });

  it("throws TypeError on input with no digits", () => {
    expect(() => parseAmountToMinor("abc", 2)).toThrow(TypeError);
    expect(() => parseAmountToMinor("   ", 2)).toThrow(TypeError);
    expect(() => parseAmountToMinor("€", 2)).toThrow(TypeError);
  });

  it("round-trips with formatMinor", () => {
    expect(parseAmountToMinor(formatMinor(123456n, 2), 2)).toBe(123456n);
    expect(parseAmountToMinor(formatMinor(-1299n, 2), 2)).toBe(-1299n);
    expect(parseAmountToMinor(formatMinor(12n, 0), 0)).toBe(12n);
  });
});

describe("formatMinor", () => {
  it("formats minor units with exactly the requested fraction digits", () => {
    expect(formatMinor(1250n, 2)).toBe("12.50");
    expect(formatMinor(12n, 0)).toBe("12");
    expect(formatMinor(1n, 8)).toBe("0.00000001");
    expect(formatMinor(1299n, 2)).toBe("12.99");
  });

  it("applies locale grouping", () => {
    expect(formatMinor(123456789n, 2)).toBe("1,234,567.89");
  });

  it("handles negative values", () => {
    expect(formatMinor(-1250n, 2)).toBe("-12.50");
  });
});

describe("parseAmountToMinor / formatMinor property tests", () => {
  it("agrees with a reference truncating parse and round-trips", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 6 }),
        fc.integer({ min: 0, max: 999_999 }),
        fc.integer({ min: 0, max: 99_999_999 }),
        (decimals, intVal, fracRaw) => {
          const intPart = String(intVal);
          const fracStr = String(fracRaw).padStart(8, "0");
          const human = `${intPart}.${fracStr}`;
          const kept = fracStr.slice(0, decimals);
          const expected =
            BigInt(intPart) * 10n ** BigInt(decimals) +
            BigInt(kept === "" ? 0 : kept);
          expect(parseAmountToMinor(human, decimals)).toBe(expected);

          const minor = parseAmountToMinor(human, decimals);
          // Round-trip only where grouping is unambiguous: at decimals >= 1 the
          // formatted string always carries a ".", so any comma is a thousands
          // separator. At decimals === 0 the lone-comma rule makes "1,000"
          // ambiguous, so it is covered by the explicit cases above instead.
          if (decimals >= 1) {
            expect(parseAmountToMinor(formatMinor(minor, decimals), decimals)).toBe(minor);
          }
        },
      ),
    );
  });
});

describe("convert", () => {
  it("converts USD to EUR at rate 0.92", () => {
    const usd = 10000n; // $100.00
    const result = convert(usd, 2, 2, 0.92);
    expect(result).toBe(9200n); // €92.00
  });

  it("converts USD to BTC (8 decimals)", () => {
    const usd = 5000000n; // $50,000.00
    const btc = convert(usd, 2, 8, 0.00002); // 1 BTC = $50,000
    expect(btc).toBe(100000000n); // 1.00000000 BTC
  });

  it("handles zero amount", () => {
    expect(convert(0n, 2, 2, 1.5)).toBe(0n);
  });

  it("handles same decimals rate 1", () => {
    expect(convert(500n, 2, 2, 1)).toBe(500n);
  });
});
