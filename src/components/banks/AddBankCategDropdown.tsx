import { PopoverArrow } from "@radix-ui/react-popover";
import { ChevronDown, Landmark, ChartColumnStacked } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { useState } from "react";
import { Button } from "../ui/button";

export const AddBankCategDropdown = () => {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button className="rounded-l-none px-2 border-2 border-l-0 border-slate-800">
          <ChevronDown />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        side="bottom"
        align="end"
        className="p-1 w-fit bg-slate-800 border-0 flex flex-col gap-2"
      >
        <PopoverArrow className="fill-slate-800" />
        <Button
          className="hover:bg-slate-700 bg-slate-800 justify-start flex gap-2"
          onClick={() => {
            setOpen(false);
          }}
        >
          <Landmark />
          Add Bank
        </Button>
        <Button
          className="hover:bg-slate-700 bg-slate-800 justify-start flex gap-2"
          onClick={() => {
            setOpen(false);
          }}
        >
          <ChartColumnStacked /> Add Category
        </Button>
      </PopoverContent>
    </Popover>
  );
};
