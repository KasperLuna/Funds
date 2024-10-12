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

export const CategorySelect = ({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) => {
  const { categoryData } = useBanksCategsContext();

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger
        className={clsx(
          "bg-transparent border-slate-700 focus-visible:ring-offset-0 focus-visible:ring-0 ring-0 focus-within:border-slate-500",
          { "text-slate-600": !value }
        )}
      >
        <SelectValue placeholder="Select Category" />
      </SelectTrigger>
      <SelectContent className="max-h-[200px] bg-slate-800 border-slate-700 text-slate-100 z-50 overflow-auto">
        {categoryData?.categories?.length === 0 && (
          <SelectItem value="0" disabled>
            No Categories yet. Create one to get started!
          </SelectItem>
        )}
        {categoryData?.categories?.map((category) => (
          <SelectItem
            key={category.id}
            value={category.id}
            onClick={() => onChange(category.id)}
          >
            {category.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};
