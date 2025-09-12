import React, { useState } from "react";
import { useBanksCategsContext } from "@/lib/hooks/useBanksCategsContext";
import clsx from "clsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Check, ChevronDown } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";

export const BankSelect = ({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) => {
  const { bankData } = useBanksCategsContext();
  const [isOpen, setIsOpen] = useState(false);

  // Find the selected bank name for display
  const selectedBankName =
    bankData?.banks?.find((bank) => bank.id === value)?.name || "Select Bank";

  // Using both Select (for desktop) and Popover (for mobile)
  // We'll show/hide based on screen size using CSS media queries
  return (
    <div className="relative w-full">
      {/* Traditional Select for larger screens */}
      <div className="hidden sm:block w-full">
        <Select value={value} onValueChange={onChange}>
          <SelectTrigger
            className={clsx(
              "bg-transparent border-slate-700 focus-visible:ring-offset-0 focus-visible:ring-0 ring-0 focus-within:border-slate-500 text-white",
              { "text-slate-600": !value, "text-white": value }
            )}
          >
            <SelectValue placeholder="Select Bank" />
          </SelectTrigger>
          <SelectContent className="max-h-[200px] bg-slate-800 border-slate-700 text-slate-100 z-50 overflow-auto">
            {bankData?.banks?.length === 0 && (
              <SelectItem value="0" disabled>
                No banks yet. Create one to get started!
              </SelectItem>
            )}
            {bankData?.banks?.map((bank) => (
              <SelectItem key={bank.id} value={bank.id}>
                {bank.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Custom Grid-based selector for mobile */}
      <div className="block sm:hidden w-full">
        <Popover open={isOpen} onOpenChange={setIsOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={isOpen}
              className={clsx(
                "w-full justify-between bg-transparent border-slate-700 focus-visible:ring-offset-0 focus-visible:ring-0 ring-0 hover:bg-transparent hover:text-inherit text-white",
                { "text-slate-600": !value, "text-white": value }
              )}
            >
              {selectedBankName}
              <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[94vw] max-w-screen-sm p-0 bg-slate-800 border-slate-700 text-slate-100">
            {bankData?.banks?.length === 0 ? (
              <div className="px-3 py-2 text-center text-sm text-slate-400">
                No banks yet. Create one to get started!
              </div>
            ) : (
              <div className="max-h-[50vh] overflow-y-auto overflow-x-hidden">
                <div className="grid grid-cols-2 p-1 gap-1">
                  {bankData?.banks?.map((bank) => (
                    <button
                      key={bank.id}
                      className={clsx(
                        "flex items-center justify-start w-full px-2 py-1.5 text-left text-sm text-white rounded-md border-0 bg-transparent cursor-pointer",
                        bank.id === value
                          ? "bg-slate-700"
                          : "hover:bg-slate-700 active:bg-slate-600"
                      )}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        console.log('Bank clicked:', bank.name); // Debug log
                        onChange(bank.id);
                        setIsOpen(false);
                      }}
                      onTouchEnd={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        console.log('Bank touched:', bank.name); // Debug log
                        onChange(bank.id);
                        setIsOpen(false);
                      }}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className="truncate max-w-[80%]">
                          {bank.name}
                        </span>
                        {bank.id === value && (
                          <Check className="h-4 w-4 ml-2 flex-shrink-0" />
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
};
