"use client";
import * as React from "react";
import { addMonths, format } from "date-fns";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { MonthPicker as BaseMonthPicker } from "@/components/ui/month-picker";

export function MonthPicker({
  date,
  setDate,
}: {
  date: Date;
  setDate: React.Dispatch<React.SetStateAction<Date>>;
}) {
  const [isOpen, setIsOpen] = React.useState<boolean>(false);

  return (
    <div className="flex flex-row">
      <Button
        className="rounded-r-none px-1 bg-slate-800"
        onClick={() =>
          setDate((date) => {
            // previous month
            return addMonths(date, -1);
          })
        }
      >
        <ChevronLeft />
      </Button>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant={"outline"}
            className={
              "border-slate-700 border-opacity-50 hover:bg-slate-700 hover:text-slate-200 rounded-none w-[120px] justify-start text-left font-normal bg-slate-800 text-slate-100"
            }
          >
            <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
            {format(date, "MMM yyyy")}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0 bg-slate-800 border-0 text-slate-100 border-opacity-10">
          <BaseMonthPicker
            currentMonth={date}
            onMonthChange={(newMonth) => {
              setDate(newMonth);
              setIsOpen(false);
            }}
          />
        </PopoverContent>
      </Popover>
      <Button
        className="rounded-l-none px-1 bg-slate-800"
        onClick={() =>
          setDate((date) => {
            return addMonths(date, 1);
          })
        }
      >
        <ChevronRight />
      </Button>
    </div>
  );
}
