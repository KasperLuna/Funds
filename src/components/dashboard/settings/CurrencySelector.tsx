"use client";

import React, { useEffect, useState } from "react";
import clsx from "clsx";
import { Check, ChevronDown } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import untypedCurrencies from "@/components/dashboard/settings/currencies.json";
import { Currency } from "@/lib/types";

const currencies = untypedCurrencies as Currency[];
type CurrencySelectorProps = {
  value?: Currency;
  onChange: (value?: Currency) => void;
};

export function CurrencySelector({ value, onChange }: CurrencySelectorProps) {
  const [selected, setSelected] = useState<string>(value?.code || "");
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    setSelected(value?.code || "");
  }, [value?.code]);

  const selectedCurrency = currencies.find((c) => c.code === selected);

  return (
    <div className="relative w-full">
      {/* Desktop Select */}
      <div className="hidden sm:block w-full">
        <Select
          value={selected}
          onValueChange={(code) => {
            setSelected(code);
            const found = currencies.find((c) => c.code === code);
            onChange(found);
          }}
        >
          <SelectTrigger
            className={clsx(
              "bg-transparent border-slate-700 focus-visible:ring-offset-0 focus-visible:ring-0 ring-0 focus-within:border-slate-500 text-white w-full",
              { "text-slate-600": !selected, "text-white": selected }
            )}
          >
            <SelectValue placeholder="Select Currency" />
          </SelectTrigger>
          <SelectContent className="max-h-[200px] bg-slate-800 border-slate-700 text-slate-100 z-50 overflow-auto">
            {currencies.length === 0 && (
              <SelectItem value="" disabled>
                No currencies found.
              </SelectItem>
            )}
            {currencies.map((currency) => (
              <SelectItem key={currency.code} value={currency.code}>
                {`(${currency.code}) ${currency.name}`}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Mobile Popover grid */}
      <div className="block sm:hidden w-full">
        <Popover open={isOpen} onOpenChange={setIsOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={isOpen}
              className={clsx(
                "w-full justify-between bg-transparent border-slate-700 focus-visible:ring-offset-0 focus-visible:ring-0 ring-0 hover:bg-transparent hover:text-inherit text-white",
                { "text-slate-600": !selected, "text-white": selected }
              )}
            >
              {selectedCurrency
                ? `(${selectedCurrency.code}) ${selectedCurrency.name}`
                : "Select Currency"}
              <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[94vw] max-w-screen-sm p-0 bg-slate-800 border-slate-700 text-slate-100">
            {currencies.length === 0 ? (
              <div className="px-3 py-2 text-center text-sm text-slate-400">
                No currencies found.
              </div>
            ) : (
              <div className="max-h-[50vh] overflow-y-auto overflow-x-hidden">
                <div className="grid grid-cols-2 p-1 gap-1">
                  {currencies.map((currency) => (
                    <button
                      key={currency.code}
                      className={clsx(
                        "flex items-center justify-start w-full px-2 py-1.5 text-left text-sm text-white rounded-md border-0 bg-transparent cursor-pointer",
                        currency.code === selected
                          ? "bg-slate-700"
                          : "hover:bg-slate-700 active:bg-slate-600"
                      )}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onChange(currency);
                        setSelected(currency.code);
                        setIsOpen(false);
                      }}
                      onTouchEnd={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onChange(currency);
                        setSelected(currency.code);
                        setIsOpen(false);
                      }}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className="truncate max-w-[80%]">
                          {`(${currency.code}) ${currency.name}`}
                        </span>
                        {currency.code === selected && (
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
}
