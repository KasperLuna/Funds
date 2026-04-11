import { describe, it, expect } from "vitest";
import { calculateNextOccurrence } from "./recurrence";
import type { RecurrenceRule } from "@/lib/types";

describe("calculateNextOccurrence", () => {
  describe("daily frequency", () => {
    it("should advance by 1 day with default interval", () => {
      const rule: RecurrenceRule = { frequency: "daily" };
      const prev = new Date(2024, 0, 15); // Jan 15
      const next = calculateNextOccurrence(rule, prev);
      expect(next).toEqual(new Date(2024, 0, 16));
    });

    it("should advance by N days with interval", () => {
      const rule: RecurrenceRule = { frequency: "daily", interval: 3 };
      const prev = new Date(2024, 0, 15);
      const next = calculateNextOccurrence(rule, prev);
      expect(next).toEqual(new Date(2024, 0, 18));
    });

    it("should cross month boundaries", () => {
      const rule: RecurrenceRule = { frequency: "daily" };
      const prev = new Date(2024, 0, 31); // Jan 31
      const next = calculateNextOccurrence(rule, prev);
      expect(next).toEqual(new Date(2024, 1, 1)); // Feb 1
    });
  });

  describe("weekly frequency", () => {
    it("should advance by 1 week with default interval", () => {
      const rule: RecurrenceRule = { frequency: "weekly" };
      const prev = new Date(2024, 0, 15);
      const next = calculateNextOccurrence(rule, prev);
      expect(next).toEqual(new Date(2024, 0, 22));
    });

    it("should advance by N weeks with interval", () => {
      const rule: RecurrenceRule = { frequency: "weekly", interval: 2 };
      const prev = new Date(2024, 0, 15);
      const next = calculateNextOccurrence(rule, prev);
      expect(next).toEqual(new Date(2024, 0, 29));
    });
  });

  describe("monthly frequency", () => {
    it("should advance by 1 month with default interval", () => {
      const rule: RecurrenceRule = { frequency: "monthly" };
      const prev = new Date(2024, 0, 15); // Jan 15
      const next = calculateNextOccurrence(rule, prev);
      expect(next).toEqual(new Date(2024, 1, 15)); // Feb 15
    });

    it("should advance by N months with interval", () => {
      const rule: RecurrenceRule = { frequency: "monthly", interval: 3 };
      const prev = new Date(2024, 0, 15);
      const next = calculateNextOccurrence(rule, prev);
      expect(next).toEqual(new Date(2024, 3, 15)); // Apr 15
    });

    it("should handle month overflow: Jan 31 -> Feb 29 (leap year)", () => {
      const rule: RecurrenceRule = { frequency: "monthly" };
      const prev = new Date(2024, 0, 31); // Jan 31, 2024 (leap year)
      const next = calculateNextOccurrence(rule, prev);
      expect(next).toEqual(new Date(2024, 1, 29)); // Feb 29
    });

    it("should handle month overflow: Jan 31 -> Feb 28 (non-leap year)", () => {
      const rule: RecurrenceRule = { frequency: "monthly" };
      const prev = new Date(2023, 0, 31); // Jan 31, 2023
      const next = calculateNextOccurrence(rule, prev);
      expect(next).toEqual(new Date(2023, 1, 28)); // Feb 28
    });

    it("should handle month overflow: Mar 31 -> Apr 30", () => {
      const rule: RecurrenceRule = { frequency: "monthly" };
      const prev = new Date(2024, 2, 31); // Mar 31
      const next = calculateNextOccurrence(rule, prev);
      expect(next).toEqual(new Date(2024, 3, 30)); // Apr 30
    });
  });

  describe("yearly frequency", () => {
    it("should advance by 1 year with default interval", () => {
      const rule: RecurrenceRule = { frequency: "yearly" };
      const prev = new Date(2024, 5, 15); // Jun 15, 2024
      const next = calculateNextOccurrence(rule, prev);
      expect(next).toEqual(new Date(2025, 5, 15)); // Jun 15, 2025
    });

    it("should advance by N years with interval", () => {
      const rule: RecurrenceRule = { frequency: "yearly", interval: 2 };
      const prev = new Date(2024, 5, 15);
      const next = calculateNextOccurrence(rule, prev);
      expect(next).toEqual(new Date(2026, 5, 15));
    });

    it("should handle leap year: Feb 29 -> Feb 28 in non-leap year", () => {
      const rule: RecurrenceRule = { frequency: "yearly" };
      const prev = new Date(2024, 1, 29); // Feb 29, 2024 (leap year)
      const next = calculateNextOccurrence(rule, prev);
      expect(next).toEqual(new Date(2025, 1, 28)); // Feb 28, 2025
    });

    it("should handle leap year: Feb 29 -> Feb 29 (leap to leap)", () => {
      const rule: RecurrenceRule = { frequency: "yearly", interval: 4 };
      const prev = new Date(2024, 1, 29); // Feb 29, 2024
      const next = calculateNextOccurrence(rule, prev);
      expect(next).toEqual(new Date(2028, 1, 29)); // Feb 29, 2028
    });
  });

  describe("next occurrence is always after previous", () => {
    it("should return a date strictly after previousDate for daily", () => {
      const rule: RecurrenceRule = { frequency: "daily" };
      const prev = new Date(2024, 6, 1);
      const next = calculateNextOccurrence(rule, prev);
      expect(next.getTime()).toBeGreaterThan(prev.getTime());
    });

    it("should return a date strictly after previousDate for weekly", () => {
      const rule: RecurrenceRule = { frequency: "weekly" };
      const prev = new Date(2024, 6, 1);
      const next = calculateNextOccurrence(rule, prev);
      expect(next.getTime()).toBeGreaterThan(prev.getTime());
    });

    it("should return a date strictly after previousDate for monthly", () => {
      const rule: RecurrenceRule = { frequency: "monthly" };
      const prev = new Date(2024, 6, 1);
      const next = calculateNextOccurrence(rule, prev);
      expect(next.getTime()).toBeGreaterThan(prev.getTime());
    });

    it("should return a date strictly after previousDate for yearly", () => {
      const rule: RecurrenceRule = { frequency: "yearly" };
      const prev = new Date(2024, 6, 1);
      const next = calculateNextOccurrence(rule, prev);
      expect(next.getTime()).toBeGreaterThan(prev.getTime());
    });
  });

  describe("interval defaults to 1", () => {
    it("should treat undefined interval as 1", () => {
      const withInterval: RecurrenceRule = { frequency: "daily", interval: 1 };
      const withoutInterval: RecurrenceRule = { frequency: "daily" };
      const prev = new Date(2024, 0, 15);

      const next1 = calculateNextOccurrence(withInterval, prev);
      const next2 = calculateNextOccurrence(withoutInterval, prev);
      expect(next1).toEqual(next2);
    });
  });
});
