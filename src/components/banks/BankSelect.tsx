"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Bank } from "@/lib/types";

const ALL_BANKS = "__all__";

interface BankSelectProps {
  banks: Bank[];
  value?: string;
  onValueChange: (bankId: string | undefined) => void;
  showAll?: boolean;
}

export function BankSelect({ banks, value, onValueChange, showAll = true }: BankSelectProps) {
  const handleChange = (val: string) => {
    onValueChange(val === ALL_BANKS ? undefined : val);
  };

  return (
    <Select value={value ?? ALL_BANKS} onValueChange={handleChange}>
      <SelectTrigger id="bank-select" className="w-full" aria-label="Select bank">
        <SelectValue placeholder="Select a bank" />
      </SelectTrigger>
      <SelectContent>
        {showAll && <SelectItem value={ALL_BANKS}>All Banks</SelectItem>}
        {banks.map((bank) => (
          <SelectItem key={bank.id} value={bank.id}>
            <span className="flex items-center gap-2">
              {bank.primaryColor && (
                <span
                  className="inline-block size-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: bank.primaryColor }}
                />
              )}
              {bank.name}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
