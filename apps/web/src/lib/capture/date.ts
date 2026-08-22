export type DatePreset = "today" | "yesterday" | "custom";

export function presetDate(preset: DatePreset, now: Date = new Date()): Date {
  const d = new Date(now);
  if (preset === "yesterday") d.setDate(d.getDate() - 1);
  return d;
}