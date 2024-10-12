"use client";

import * as React from "react";
import { addDays, format } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import clsx from "clsx";

export function DatePickerWithOptions({
  value: date,
  onChange: setDate,
}: {
  value: Date | undefined;
  onChange: (value: Date | undefined) => void;
}) {
  const [open, setOpen] = React.useState(false);

  const compareDates = (a: Date | undefined, b: Date) => {
    if (!a) return false;
    return (
      a.getDate() === b.getDate() &&
      a.getMonth() === b.getMonth() &&
      a.getFullYear() === b.getFullYear()
    );
  };

  const isToday = compareDates(date, new Date());
  const isYesterday = compareDates(date, addDays(new Date(), -1));

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant={"outline"}
          className={cn(
            "w-full justify-start text-left font-normal bg-transparent hover:bg-slate-800 border-slate-700 hover:text-slate-200",
            !date && "text-muted-foreground"
          )}
        >
          <CalendarIcon className="mr-1 h-4 w-4" />
          {date ? format(date, "PPP") : <span>Pick a date</span>}
          {isToday && (
            <span className="ml-2 text-xs text-slate-400">(Today)</span>
          )}
          {isYesterday && (
            <span className="ml-2 text-xs text-slate-400">(Yesterday)</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="flex w-auto flex-col p-1 bg-slate-800 border-2 border-slate-800 z-50">
        <div className="flex flex-row w-full gap-3 px-1">
          <Button
            className={clsx("w-full", {
              "border-2 border-slate-500": isYesterday,
            })}
            onClick={() => {
              setDate(addDays(new Date(), -1));
              setOpen(false);
            }}
          >
            Yesterday
          </Button>
          <Button
            className={clsx("w-full", {
              "border-2 border-slate-500": isToday,
            })}
            onClick={() => {
              setDate(new Date());
              setOpen(false);
            }}
          >
            Today
          </Button>
        </div>
        <div className="rounded-md">
          <Calendar
            mode="single"
            classNames={{
              button: "bg-transparent hover:bg-slate-600 hover:text-slate-200",
              cell: "bg-transparent",
              day_selected: "bg-blue-700",
              day_today: "bg-transparent border-2 border-slate-600",
            }}
            className="bg-slate-800 text-slate-100"
            selected={date}
            onSelect={(value) => {
              setDate(value);
              setOpen(false);
            }}
          />
        </div>
      </PopoverContent>
    </Popover>
  );
}
