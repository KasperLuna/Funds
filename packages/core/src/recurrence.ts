export type Frequency = "daily" | "weekly" | "monthly" | "yearly";

export interface Schedule {
  frequency: Frequency;
  interval?: number;
  invokeDate: Date | null;
  previousDate: Date | null;
  timezone?: number;
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

function addYears(date: Date, years: number): Date {
  const d = new Date(date);
  d.setFullYear(d.getFullYear() + years);
  return d;
}

function stepSize(freq: Frequency, interval: number): { fn: (d: Date, n: number) => Date; n: number } {
  switch (freq) {
    case "daily":
      return { fn: addDays, n: interval };
    case "weekly":
      return { fn: addDays, n: interval * 7 };
    case "monthly":
      return { fn: addMonths, n: interval };
    case "yearly":
      return { fn: addYears, n: interval };
  }
}

export function advanceRecurrence(
  schedule: Schedule,
  currentDate: Date,
): { previousDate: Date; invokeDate: Date } {
  if (!schedule.invokeDate) {
    throw new Error("Cannot advance schedule with no invokeDate");
  }
  const interval = schedule.interval ?? 1;
  const { fn, n } = stepSize(schedule.frequency, interval);
  return {
    previousDate: schedule.invokeDate,
    invokeDate: fn(schedule.invokeDate, n),
  };
}

export function advanceWaive(
  schedule: Schedule,
  currentDate: Date,
): { previousDate: Date; invokeDate: Date } {
  return advanceRecurrence(schedule, currentDate);
}

export function isDueToday(schedule: Schedule, now: Date): boolean {
  if (!schedule.invokeDate) return false;

  const tzOffset = schedule.timezone ?? 0;
  const localNow = new Date(now.getTime() + tzOffset * 3600_000);
  const localInvoke = new Date(schedule.invokeDate.getTime() + tzOffset * 3600_000);

  const todayStr = localNow.toISOString().slice(0, 10);
  const invokeStr = localInvoke.toISOString().slice(0, 10);

  if (invokeStr > todayStr) return false;
  if (schedule.previousDate) {
    const localPrev = new Date(schedule.previousDate.getTime() + tzOffset * 3600_000);
    const prevStr = localPrev.toISOString().slice(0, 10);
    if (prevStr >= todayStr) return false;
  }

  return true;
}
