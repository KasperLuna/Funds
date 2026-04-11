import { describe, it, expect } from "vitest";
import { formatCurrency, formatDate, formatPercentage } from "./formatting";
import type { Currency } from "@/lib/types";

// ============================================================
// formatCurrency
// ============================================================
describe("formatCurrency", () => {
  it("formats a positive amount in USD by default", () => {
    expect(formatCurrency(1234.56)).toBe("$1,234.56");
  });

  it("formats zero", () => {
    expect(formatCurrency(0)).toBe("$0.00");
  });

  it("formats a negative amount", () => {
    const result = formatCurrency(-500.5);
    // Intl may use a minus sign or parentheses depending on locale
    expect(result).toContain("500.50");
  });

  it("formats with a custom currency (EUR)", () => {
    const eur: Currency = { code: "EUR", name: "Euro", symbol: "€" };
    const result = formatCurrency(1000, eur);
    expect(result).toContain("1,000.00");
    expect(result).toContain("€");
  });

  it("formats with a custom currency (GBP)", () => {
    const gbp: Currency = { code: "GBP", name: "British Pound", symbol: "£" };
    const result = formatCurrency(99.9, gbp);
    expect(result).toContain("99.90");
    expect(result).toContain("£");
  });

  it("formats large amounts with thousands separators", () => {
    expect(formatCurrency(1000000)).toBe("$1,000,000.00");
  });

  it("rounds to two decimal places", () => {
    expect(formatCurrency(10.999)).toBe("$11.00");
  });
});

// ============================================================
// formatDate
// ============================================================
describe("formatDate", () => {
  it("formats a Date object", () => {
    const date = new Date("2024-06-15T12:00:00.000Z");
    const result = formatDate(date);
    expect(result).toBe("Jun 15, 2024");
  });

  it("formats an ISO date string", () => {
    const result = formatDate("2024-01-01T00:00:00.000Z");
    // Depending on timezone, the day might be Dec 31 or Jan 1
    expect(result).toMatch(/^(Dec 31, 2023|Jan 1, 2024)$/);
  });

  it("formats a date-only string", () => {
    const result = formatDate("2024-12-25");
    expect(result).toMatch(/Dec 2[45], 2024/);
  });

  it("formats dates in different months", () => {
    const result = formatDate(new Date(2024, 2, 10)); // March 10, 2024
    expect(result).toBe("Mar 10, 2024");
  });

  it("formats dates at year boundaries", () => {
    const result = formatDate(new Date(2023, 11, 31)); // Dec 31, 2023
    expect(result).toBe("Dec 31, 2023");
  });
});

// ============================================================
// formatPercentage
// ============================================================
describe("formatPercentage", () => {
  it("formats 0.5 as 50.00%", () => {
    expect(formatPercentage(0.5)).toBe("50.00%");
  });

  it("formats 1 as 100.00%", () => {
    expect(formatPercentage(1)).toBe("100.00%");
  });

  it("formats 0 as 0.00%", () => {
    expect(formatPercentage(0)).toBe("0.00%");
  });

  it("formats values over 100%", () => {
    expect(formatPercentage(1.5)).toBe("150.00%");
  });

  it("formats negative values", () => {
    expect(formatPercentage(-0.25)).toBe("-25.00%");
  });

  it("respects custom decimal places", () => {
    expect(formatPercentage(0.3333, 1)).toBe("33.3%");
    expect(formatPercentage(0.3333, 0)).toBe("33%");
    expect(formatPercentage(0.3333, 4)).toBe("33.3300%");
  });

  it("formats small fractional values", () => {
    expect(formatPercentage(0.001)).toBe("0.10%");
  });
});
