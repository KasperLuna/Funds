export type DatePreset = "today" | "yesterday" | "custom";

export function presetDate(preset: DatePreset, now: Date = new Date()): Date {
  const d = new Date(now);
  if (preset === "yesterday") d.setDate(d.getDate() - 1);
  return d;
}

export function presetFromDate(ts: number, now: Date = new Date()): DatePreset {
  const d = new Date(ts);
  const today = new Date(now);
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return "today";
  if (d.toDateString() === yesterday.toDateString()) return "yesterday";
  return "custom";
}