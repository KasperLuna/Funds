import React, { useState } from "react";
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
import { useCategoriesQuery } from "@/lib/hooks/useCategoriesQuery";

export const CategorySelect = ({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) => {
  const categoryData = useCategoriesQuery();
  const [isOpen, setIsOpen] = useState(false);

  // Find the selected category name for display
  const selectedCategoryName =
    categoryData?.categories?.find((category) => category.id === value)?.name ||
    "Select Category";

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
            <SelectValue placeholder="Select Category" />
          </SelectTrigger>
          <SelectContent className="max-h-[200px] bg-slate-800 border-slate-700 text-slate-100 z-50 overflow-auto">
            {categoryData?.categories?.length === 0 && (
              <SelectItem value="0" disabled>
                No Categories yet. Create one to get started!
              </SelectItem>
            )}
            {categoryData?.categories?.map((category) => (
              <SelectItem key={category.id} value={category.id}>
                {category.name}
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
              {selectedCategoryName}
              <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[94vw] max-w-screen-sm p-0 bg-slate-800 border-slate-700 text-slate-100">
            {categoryData?.categories?.length === 0 ? (
              <div className="px-3 py-2 text-center text-sm text-slate-400">
                No Categories yet. Create one to get started!
              </div>
            ) : (
              <div className="max-h-[50vh] overflow-y-auto overflow-x-hidden">
                <div className="grid grid-cols-2 p-1 gap-1">
                  {categoryData?.categories?.map((category) => (
                    <button
                      key={category.id}
                      className={clsx(
                        "flex items-center justify-start w-full px-2 py-1.5 text-left text-sm text-white rounded-md border-0 bg-transparent cursor-pointer",
                        category.id === value
                          ? "bg-slate-700"
                          : "hover:bg-slate-700 active:bg-slate-600"
                      )}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        console.log("Category clicked:", category.name); // Debug log
                        onChange(category.id);
                        setIsOpen(false);
                      }}
                      onTouchEnd={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        console.log("Category touched:", category.name); // Debug log
                        onChange(category.id);
                        setIsOpen(false);
                      }}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className="truncate max-w-[80%]">
                          {category.name}
                        </span>
                        {category.id === value && (
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
