import { describe, expect, it } from "vitest";
import { advanceRecurrence, advanceWaive, isDueToday } from "./recurrence";

describe("advanceRecurrence", () => {
  it("advances daily by 1", () => {
    const result = advanceRecurrence(
      { frequency: "daily", invokeDate: new Date("2026-01-01"), previousDate: null },
      new Date("2026-01-01"),
    );
    expect(result.previousDate).toEqual(new Date("2026-01-01"));
    expect(result.invokeDate).toEqual(new Date("2026-01-02"));
  });

  it("advances daily by 3 (interval=3)", () => {
    const result = advanceRecurrence(
      { frequency: "daily", interval: 3, invokeDate: new Date("2026-01-01"), previousDate: null },
      new Date("2026-01-01"),
    );
    expect(result.invokeDate).toEqual(new Date("2026-01-04"));
  });

  it("advances weekly by 1", () => {
    const result = advanceRecurrence(
      { frequency: "weekly", invokeDate: new Date("2026-01-01"), previousDate: null },
      new Date("2026-01-01"),
    );
    expect(result.invokeDate).toEqual(new Date("2026-01-08"));
  });

  it("advances monthly by 1", () => {
    const result = advanceRecurrence(
      { frequency: "monthly", invokeDate: new Date("2026-01-15"), previousDate: null },
      new Date("2026-01-15"),
    );
    expect(result.invokeDate).toEqual(new Date("2026-02-15"));
  });

  it("advances monthly by 2 (interval=2)", () => {
    const result = advanceRecurrence(
      { frequency: "monthly", interval: 2, invokeDate: new Date("2026-01-15"), previousDate: null },
      new Date("2026-01-15"),
    );
    expect(result.invokeDate).toEqual(new Date("2026-03-15"));
  });

  it("advances yearly by 1", () => {
    const result = advanceRecurrence(
      { frequency: "yearly", invokeDate: new Date("2026-03-10"), previousDate: null },
      new Date("2026-03-10"),
    );
    expect(result.invokeDate).toEqual(new Date("2027-03-10"));
  });

  it("throws when invokeDate is null", () => {
    expect(() =>
      advanceRecurrence(
        { frequency: "daily", invokeDate: null, previousDate: null },
        new Date(),
      ),
    ).toThrow("Cannot advance schedule with no invokeDate");
  });
});

describe("advanceWaive", () => {
  it("advances identically to advanceRecurrence", () => {
    const schedule = { frequency: "monthly" as const, invokeDate: new Date("2026-01-15"), previousDate: null };
    const now = new Date("2026-01-15");
    expect(advanceWaive(schedule, now)).toEqual(advanceRecurrence(schedule, now));
  });
});

describe("isDueToday", () => {
  it("returns true when invokeDate local date is today", () => {
    const invoke = new Date("2026-08-22T10:00:00Z");
    const now = new Date("2026-08-22T08:00:00Z");
    const schedule = { frequency: "daily" as const, invokeDate: invoke, previousDate: null, timezone: 0 };
    expect(isDueToday(schedule, now)).toBe(true);
  });

  it("returns false when invokeDate is in the future", () => {
    const invoke = new Date("2026-08-23T10:00:00Z");
    const now = new Date("2026-08-22T08:00:00Z");
    const schedule = { frequency: "daily" as const, invokeDate: invoke, previousDate: null, timezone: 0 };
    expect(isDueToday(schedule, now)).toBe(false);
  });

  it("returns false when already logged today", () => {
    const invoke = new Date("2026-08-22T10:00:00Z");
    const prev = new Date("2026-08-22T08:00:00Z");
    const now = new Date("2026-08-22T08:00:00Z");
    const schedule = { frequency: "daily" as const, invokeDate: invoke, previousDate: prev, timezone: 0 };
    expect(isDueToday(schedule, now)).toBe(false);
  });

  it("returns true when previous was before today", () => {
    const invoke = new Date("2026-08-22T10:00:00Z");
    const prev = new Date("2026-08-21T10:00:00Z");
    const now = new Date("2026-08-22T08:00:00Z");
    const schedule = { frequency: "daily" as const, invokeDate: invoke, previousDate: prev, timezone: 0 };
    expect(isDueToday(schedule, now)).toBe(true);
  });

  it("returns false when no invokeDate", () => {
    const schedule = { frequency: "daily" as const, invokeDate: null, previousDate: null, timezone: 0 };
    expect(isDueToday(schedule, new Date())).toBe(false);
  });
});
