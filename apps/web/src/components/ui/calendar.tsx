"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  DayPicker,
  UI,
  DayFlag,
  SelectionState,
  type ClassNames,
  type ChevronProps,
} from "react-day-picker";
import { cn } from "@/lib/utils";

type CalendarChevronProps = ChevronProps;

const CalendarChevron = ({
  orientation,
  size = 16,
  disabled,
}: CalendarChevronProps) => {
  const cls = cn("text-zinc-400", disabled && "opacity-40");
  const Icon = orientation === "left" ? ChevronLeft : ChevronRight;
  return <Icon className={cls} size={size} strokeWidth={2} aria-hidden />;
};

const calendarClassNames: Partial<ClassNames> = {
  [UI.Root]: "p-2",
  [UI.Months]: "flex flex-col sm:flex-row",
  [UI.Month]: "flex flex-col gap-2",
  [UI.MonthCaption]: "flex items-center justify-center pt-1",
  [UI.CaptionLabel]: "label-micro text-zinc-300",
  [UI.Nav]: "absolute inset-x-1 top-1 flex items-center justify-between",
  [UI.PreviousMonthButton]: "grid h-9 w-9 place-items-center rounded-(--radius-sm) text-zinc-400 transition-colors hover:bg-(--surface-2) hover:text-inherit focus-visible:ring-2 focus-visible:ring-(--accent) focus-visible:outline-none disabled:opacity-40",
  [UI.NextMonthButton]: "grid h-9 w-9 place-items-center rounded-(--radius-sm) text-zinc-400 transition-colors hover:bg-(--surface-2) hover:text-inherit focus-visible:ring-2 focus-visible:ring-(--accent) focus-visible:outline-none disabled:opacity-40",
  [UI.Weekdays]: "flex",
  [UI.Weekday]: "w-10 text-center text-xs font-semibold text-zinc-500",
  [UI.Week]: "flex",
  [UI.Day]: "h-10 w-10 text-center text-sm",
  [UI.DayButton]: "h-9 w-9 rounded-(--radius-sm) text-zinc-300 transition-colors hover:bg-(--surface-2) hover:text-inherit focus-visible:ring-2 focus-visible:ring-(--accent) focus-visible:outline-none",
  [DayFlag.today]: "text-(--accent) font-semibold",
  [DayFlag.outside]: "text-zinc-600",
  [DayFlag.disabled]: "opacity-40 hover:bg-transparent",
  [SelectionState.selected]:
    "bg-(--accent) text-(--accent-foreground) font-semibold hover:bg-(--accent) hover:brightness-110",
};

type CalendarProps = React.ComponentProps<typeof DayPicker>;

const Calendar = (props: CalendarProps) => {
  return (
    <DayPicker
      classNames={calendarClassNames}
      components={{ Chevron: CalendarChevron }}
      {...props}
    />
  );
};

export { Calendar };
