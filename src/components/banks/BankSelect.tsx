import React from "react";
import { useBanksCategsContext } from "@/lib/hooks/useBanksCategsContext";
import clsx from "clsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";

export const BankSelect = ({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) => {
  const { bankData } = useBanksCategsContext();

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger
        className={clsx(
          "bg-transparent border-slate-700 focus:border-slate-600 focus:border-0 focus:outline-0 focus:ring-0",
          { "text-slate-600": !value }
        )}
      >
        <SelectValue placeholder="Select Bank" />
      </SelectTrigger>
      <SelectContent className="max-h-[200px] bg-slate-800 border-slate-700 text-slate-100 z-[2000] overflow-auto">
        {bankData?.banks?.map((bank) => (
          <SelectItem
            key={bank.id}
            value={bank.id}
            onClick={() => onChange(bank.id)}
          >
            {bank.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};