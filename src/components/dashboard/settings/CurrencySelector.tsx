"use client";

import React, { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Check, ChevronsUpDown } from "lucide-react";
import {
  Command,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import untypedCurrencies from "@/components/dashboard/settings/currencies.json";
import { Currency } from "@/lib/types";

const currencies = untypedCurrencies as Currency[];
type CurrencySelectorProps = {
  value?: Currency;
  onChange: (value?: Currency) => void;
};

export function CurrencySelector({ value, onChange }: CurrencySelectorProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  const trimmed = search.trim().toLowerCase();
  const filtered = trimmed
    ? currencies.filter(
        (c) =>
          c.code.toLowerCase().includes(trimmed) ||
          c.name.toLowerCase().includes(trimmed),
      )
    : currencies;

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div ref={containerRef} className="relative w-full">
      <Button
        type="button"
        variant="outline"
        role="combobox"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "w-full justify-between bg-transparent border-slate-700 hover:bg-slate-800 hover:text-white focus-visible:ring-offset-0 focus-visible:ring-0",
          value ? "text-white" : "text-slate-500",
        )}
      >
        <span className="truncate">
          {value ? `(${value.code}) ${value.name}` : "Select currency"}
        </span>
        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
      </Button>

      {open && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 rounded-md border border-slate-700 bg-slate-800 shadow-lg">
          <Command shouldFilter={false} className="bg-slate-800">
            <CommandInput
              placeholder="Search currency"
              value={search}
              onValueChange={setSearch}
              className="text-white placeholder:text-slate-500"
              autoFocus
            />
            <CommandList className="max-h-[200px] overflow-y-auto">
              <CommandGroup>
                {filtered.map((currency) => (
                  <CommandItem
                    key={currency.code}
                    value={currency.code}
                    onSelect={() => {
                      onChange(currency);
                      setSearch("");
                      setOpen(false);
                    }}
                    className="cursor-pointer text-slate-100 data-[selected=true]:bg-slate-700 data-[selected=true]:text-white"
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4 shrink-0",
                        value?.code === currency.code
                          ? "opacity-100"
                          : "opacity-0",
                      )}
                    />
                    {`(${currency.code}) ${currency.name}`}
                  </CommandItem>
                ))}
                {filtered.length === 0 && (
                  <p className="py-4 text-center text-sm text-slate-400">
                    No currencies match.
                  </p>
                )}
              </CommandGroup>
            </CommandList>
          </Command>
        </div>
      )}
    </div>
  );
}
