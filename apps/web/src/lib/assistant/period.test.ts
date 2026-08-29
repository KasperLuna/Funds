import { describe, expect, it } from "vitest";
import { resolvePeriod, rangeToYearMonth, previousRange, resolveCompareTo } from "./period";

// Anchor: 2026-08-29 12:00 UTC (Saturday). Local-time helpers in period.ts
// use the runtime TZ; assertions target boundaries, not absolute clock reads.
const NOW = new Date(2026, 7, 29, 12, 0, 0).getTime();

describe("resolvePeriod", () => {
  it("parses natural phrases", () => {
    expect(resolvePeriod("How much did I spend last month?", NOW).label).toBe("Last month");
    expect(resolvePeriod("this week summary", NOW).label).toBe("This week");
    expect(resolvePeriod("budget for last week", NOW).label).toBe("Last week");
    expect(resolvePeriod("spending last 30 days", NOW).label).toBe("Last 30 days");
    expect(resolvePeriod("how is this year going", NOW).label).toBe("This year");
  });

  it("parses snake_case tool argument ids", () => {
    expect(resolvePeriod("last_month", NOW).label).toBe("Last month");
    expect(resolvePeriod("this_week", NOW).label).toBe("This week");
    expect(resolvePeriod("30d", NOW).label).toBe("Last 30 days");
  });

  it("defaults to this_month when no temporal phrase is present", () => {
    expect(resolvePeriod("How much on food?", NOW).label).toBe("This month");
    expect(resolvePeriod(null, NOW).label).toBe("This month");
  });

  it("produces non-overlapping, ordered ranges", () => {
    const tm = resolvePeriod("this_month", NOW);
    const lm = resolvePeriod("last_month", NOW);
    expect(lm.to).toBeLessThanOrEqual(tm.from);
    expect(tm.from).toBeLessThan(tm.to);
    const lw = resolvePeriod("last_week", NOW);
    const tw = resolvePeriod("this_week", NOW);
    expect(lw.to).toBeLessThanOrEqual(tw.from);
  });

  it("rangeToYearMonth anchors on the range start", () => {
    const { year, month } = rangeToYearMonth(resolvePeriod("last_month", NOW));
    expect(year).toBe(2026);
    expect(month).toBe(6); // July
  });
});

describe("previousRange", () => {
  it("returns the prior equivalent month for this_month", () => {
    const tm = resolvePeriod("this_month", NOW);
    const prev = previousRange(tm);
    expect(prev.label).toBe("Last month");
    expect(prev.to).toBe(tm.from);
  });

  it("returns last_week for this_week", () => {
    const tw = resolvePeriod("this_week", NOW);
    const prev = previousRange(tw);
    expect(prev.id).toBe("last_week");
    expect(prev.to).toBe(tw.from);
  });

  it("returns the same calendar range one year earlier when kind=last_year", () => {
    const tm = resolvePeriod("this_month", NOW);
    const prev = previousRange(tm, "last_year");
    expect(prev.from).toBe(new Date(2025, 7, 1).getTime());
    expect(prev.label).toContain("last year");
  });
});

describe("resolveCompareTo", () => {
  it("defaults to previous", () => {
    expect(resolveCompareTo("this month vs last")).toBe("previous");
    expect(resolveCompareTo(null)).toBe("previous");
  });
  it("detects year-over-year intent", () => {
    expect(resolveCompareTo("year over year")).toBe("last_year");
    expect(resolveCompareTo("year-ago")).toBe("last_year");
    expect(resolveCompareTo("YoY")).toBe("last_year");
  });
});
