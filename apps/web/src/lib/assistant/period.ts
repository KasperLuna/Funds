/**
 * Resolve a temporal phrase (from the user's question or a tool argument)
 * into a concrete [from, to] millis range plus a display label. This is the
 * single source of truth for period semantics, replacing the hardcoded
 * "This month" / "This week" literals that used to live in handlers.ts.
 */
export type PeriodId =
  | "this_month"
  | "last_month"
  | "this_week"
  | "last_week"
  | "30d"
  | "this_year"
  | "last_year";

export type PeriodRange = {
  from: number;
  to: number;
  label: string;
  id: PeriodId;
};

const PERIOD_ALIASES: Array<{ id: PeriodId; label: string; match: RegExp }> = [
  { id: "this_week", label: "This week", match: /\bthis week\b|\blast 7 days\b|\bpast week\b/i },
  { id: "last_week", label: "Last week", match: /\blast week\b|\bprevious week\b/i },
  { id: "this_month", label: "This month", match: /\bthis month\b|\bcurrent month\b|\bmonth to date\b|\bmtd\b/i },
  { id: "last_month", label: "Last month", match: /\blast month\b|\bprevious month\b/i },
  { id: "30d", label: "Last 30 days", match: /\blast 30 days\b|\b30 days\b|\bpast 30\b|\bthis 30 days\b|\b30d\b/i },
  { id: "this_year", label: "This year", match: /\bthis year\b|\byear to date\b|\bytd\b/i },
  { id: "last_year", label: "Last year", match: /\blast year\b|\bprevious year\b/i },
];

function startOfWeek(d: Date): Date {
  const out = new Date(d);
  out.setHours(0, 0, 0, 0);
  const day = out.getDay();
  const offset = (day + 6) % 7; // Monday = start of week (ISO)
  out.setDate(out.getDate() - offset);
  return out;
}

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function startOfYear(d: Date): Date {
  return new Date(d.getFullYear(), 0, 1);
}

export function resolvePeriod(
  text: string | null | undefined,
  now: number,
): PeriodRange {
  // Tool arguments use snake_case ids ("last_month"); free text uses spaces.
  // Normalize so one alias list serves both.
  const t = typeof text === "string" ? text.replace(/[_-]+/g, " ") : "";
  const nowDate = new Date(now);

  for (const alias of PERIOD_ALIASES) {
    if (alias.match.test(t)) {
      return buildRange(alias.id, nowDate);
    }
  }
  // Default: the current month (matches prior behavior when nothing is named).
  return buildRange("this_month", nowDate);
}

export type CompareToId = "previous" | "last_year";

export function resolveCompareTo(
  text: string | null | undefined,
): CompareToId {
  const t = typeof text === "string" ? text.replace(/[_-]+/g, " ") : "";
  if (/\b(last year|year ago|year over year|yoy|year on year)\b/i.test(t)) return "last_year";
  return "previous";
}

/** Range of the equivalent prior period for a given PeriodRange. */
export function previousRange(range: PeriodRange, kind: CompareToId = "previous"): PeriodRange {
  if (kind === "last_year") {
    const from = new Date(range.from);
    const to = new Date(range.to);
    from.setFullYear(from.getFullYear() - 1);
    to.setFullYear(to.getFullYear() - 1);
    return { id: range.id, label: `${range.label} (last year)`, from: from.getTime(), to: to.getTime() };
  }
  switch (range.id) {
    case "this_week":
      return buildRange("last_week", new Date(range.to));
    case "last_week":
      return {
        id: "this_week",
        label: "2 weeks ago",
        from: range.from - 7 * 24 * 60 * 60 * 1000,
        to: range.from,
      };
    case "this_month":
      return buildRange("last_month", new Date(range.to));
    case "last_month": {
      const from = new Date(range.from);
      const to = new Date(range.to);
      from.setMonth(from.getMonth() - 1);
      to.setMonth(to.getMonth() - 1);
      return { id: range.id, label: "2 months ago", from: from.getTime(), to: to.getTime() };
    }
    case "30d":
      return {
        id: "30d",
        label: "Previous 30 days",
        from: range.from - 30 * 24 * 60 * 60 * 1000,
        to: range.from,
      };
    case "this_year":
      return buildRange("last_year", new Date(range.to));
    case "last_year": {
      const from = new Date(range.from);
      const to = new Date(range.to);
      from.setFullYear(from.getFullYear() - 1);
      to.setFullYear(to.getFullYear() - 1);
      return { id: range.id, label: "2 years ago", from: from.getTime(), to: to.getTime() };
    }
  }
}

function buildRange(id: PeriodId, now: Date): PeriodRange {
  switch (id) {
    case "this_week": {
      const from = startOfWeek(now).getTime();
      return { id, label: "This week", from, to: now.getTime() };
    }
    case "last_week": {
      const thisStart = startOfWeek(now);
      const from = new Date(thisStart);
      from.setDate(from.getDate() - 7);
      return { id, label: "Last week", from: from.getTime(), to: thisStart.getTime() };
    }
    case "this_month": {
      const from = startOfMonth(now).getTime();
      return { id, label: "This month", from, to: now.getTime() };
    }
    case "last_month": {
      const thisStart = startOfMonth(now);
      const from = new Date(now.getFullYear(), now.getMonth() - 1, 1).getTime();
      return { id, label: "Last month", from, to: thisStart.getTime() };
    }
    case "30d": {
      const from = now.getTime() - 30 * 24 * 60 * 60 * 1000;
      return { id, label: "Last 30 days", from, to: now.getTime() };
    }
    case "this_year": {
      const from = startOfYear(now).getTime();
      return { id, label: "This year", from, to: now.getTime() };
    }
    case "last_year": {
      const thisStart = startOfYear(now).getTime();
      const from = new Date(now.getFullYear() - 1, 0, 1).getTime();
      return { id, label: "Last year", from, to: thisStart };
    }
  }
}

/** Constrain a range so its whole of months/weeks span is preserved when the
 * caller needs year+month integer keys (analytics functions bucket by month). */
export function rangeToYearMonth(range: PeriodRange): { year: number; month: number } {
  const d = new Date(range.from);
  return { year: d.getFullYear(), month: d.getMonth() };
}