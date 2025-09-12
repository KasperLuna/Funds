"use client";

import { useEffect, useState } from "react";
import { Check, ChevronsUpDown, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import untypedCurrencies from "@/components/dashboard/settings/currencies.json";
import { Currency } from "@/lib/types";

const currencies = untypedCurrencies as Currency[];

export function CurrencySelector({
  value: _value,
  onChange: _onChange,
}: {
  value?: Currency;
  onChange: (value?: Currency) => void;
}) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(_value?.code);
  const parsedValue = value?.split("(")?.[0].split(" ")?.[0];
  const selectedCurrency = currencies.find((c) => c.code === parsedValue);

  useEffect(() => {
    setValue(_value?.code);
  }, [_value?.code]);

  useEffect(() => {
    _onChange(selectedCurrency);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="bg-transparent text-white w-full focus-visible:ring-offset-0 border-slate-700 transition-none focus-visible:ring-0 justify-between hover:bg-slate-700 hover:text-white"
        >
          {value
            ? `(${selectedCurrency?.code}) ${selectedCurrency?.name}`
            : "Select Currency..."}
          <div className="flex flex-row items-center">
            {!!value && (
              <div
                tabIndex={0}
                role="button"
                className="flex h-4 w-4 p-0 hover:bg-slate-500 items-center rounded-full"
                onClick={(event) => {
                  event.preventDefault();
                  setValue("");
                }}
              >
                <X />
              </div>
            )}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0">
        <Command className="bg-slate-800 text-white">
          <CommandInput
            placeholder="Search Currencies..."
            className="text-white"
          />
          <CommandList>
            <CommandEmpty>No currency found.</CommandEmpty>
            <CommandGroup>
              {currencies.map((currency) => (
                <CommandItem
                  key={currency.code}
                  value={`${currency.code} ${currency.name}`}
                  className="text-white hover:bg-slate-700"
                  onSelect={(currentValue) => {
                    setValue(currentValue === value ? "" : currentValue);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === currency.code ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {`(${currency.code}) ${currency.name}`}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
