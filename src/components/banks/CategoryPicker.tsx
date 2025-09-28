import {
  MultiSelector,
  MultiSelectorTrigger,
  MultiSelectorInput,
  MultiSelectorContent,
  MultiSelectorList,
  MultiSelectorItem,
} from "../ui/multi-select";
import { Button } from "../ui/button";
import { Plus, Check, ChevronDown, X } from "lucide-react";
import { useState } from "react";
import clsx from "clsx";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { useCategoriesQuery } from "@/lib/hooks/useCategoriesQuery";

export const CategoryPicker = ({
  value,
  onChange,
  hasAddButton = false,
}: {
  value: string[];
  onChange: (value: string[]) => void;
  hasAddButton?: boolean;
}) => {
  const categoryData = useCategoriesQuery();
  const [isOpen, setIsOpen] = useState(false);

  const sortedCategories =
    categoryData?.categories.sort((a, b) => a.name.localeCompare(b.name)) || [];

  // Format selected categories for display
  const renderSelectedCategories = () => {
    if (!value || value.length === 0) {
      return <span className="text-slate-500">Select categories</span>;
    }

    // Show the actual categories in a truncated format
    return (
      <div className="flex flex-wrap items-center gap-1 max-w-full">
        {value.length <= 2 ? (
          // If only 1 or 2 categories, show them directly
          <span className="truncate">{value.join(", ")}</span>
        ) : (
          // If more than 2 categories, show the first one and a count
          <>
            <span className="truncate">{value[0]}</span>
            <span className="text-slate-400">+{value.length - 1} more</span>
          </>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-row gap-0 w-full h-full">
      {/* Traditional MultiSelector for desktop */}
      <div className="hidden sm:flex flex-1">
        <MultiSelector
          values={value}
          onValuesChange={onChange}
          loop
          className="text-base w-full"
        >
          <MultiSelectorTrigger
            className={clsx(
              "bg-transparent flex border-slate-700 rounded-md h-full text-sm text-inherit py-[9px] focus-within:border-slate-500",
              {
                "rounded-r-none": hasAddButton,
                "px-2": value,
                "px-1": !value,
              }
            )}
          >
            <MultiSelectorInput
              name="categories"
              className="text-slate-200 min-w-0"
              placeholder={
                !value?.length
                  ? "Select categories"
                  : value?.length < 2
                    ? "Add more categories"
                    : undefined
              }
            />
          </MultiSelectorTrigger>
          <MultiSelectorContent>
            <MultiSelectorList className="max-h-[200px] bg-slate-800 border-slate-700 text-slate-100">
              {sortedCategories.map((categ) => (
                <MultiSelectorItem
                  key={categ.name}
                  value={categ.name}
                  className="cursor-pointer"
                >
                  {categ.name}
                </MultiSelectorItem>
              ))}
            </MultiSelectorList>
          </MultiSelectorContent>
        </MultiSelector>
      </div>

      {/* Custom Grid-based selector for mobile */}
      <div className="block sm:hidden flex-1">
        <Popover open={isOpen} onOpenChange={setIsOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={isOpen}
              className={clsx(
                "w-full justify-between bg-transparent border-slate-700 focus-visible:ring-offset-0 focus-visible:ring-0 ring-0 hover:bg-transparent hover:text-inherit",
                hasAddButton ? "rounded-r-none" : "",
                { "text-slate-500": !value?.length }
              )}
            >
              <div className="flex flex-wrap items-center gap-2 text-left overflow-hidden max-w-[85%]">
                {!value?.length ? (
                  <span className="text-slate-500">Select categories</span>
                ) : value.length <= 2 ? (
                  // Show up to 2 categories as inline badges
                  value.map((category, idx) => (
                    <Badge
                      key={category}
                      variant="secondary"
                      className="px-2 py-0.5 text-xs bg-slate-700 text-slate-100"
                    >
                      {category}
                    </Badge>
                  ))
                ) : (
                  // If more than 2, show first one and a count badge
                  <>
                    <Badge
                      variant="secondary"
                      className="px-2 py-0.5 text-xs bg-slate-700 text-slate-100"
                    >
                      {value[0]}
                    </Badge>
                    <Badge
                      variant="secondary"
                      className="px-2 py-0.5 text-xs bg-slate-700 text-slate-100"
                    >
                      +{value.length - 1}
                    </Badge>
                  </>
                )}
              </div>
              <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[94vw] max-w-md p-3 bg-slate-800 border-slate-700 text-slate-100">
            {sortedCategories.length === 0 ? (
              <div className="px-3 py-2 text-center text-sm text-slate-400">
                No categories available
              </div>
            ) : (
              <>
                {/* Show selected categories as badges */}
                {value && value.length > 0 && (
                  <div className="mb-3 flex flex-wrap gap-2">
                    {value.map((category) => (
                      <Badge
                        key={category}
                        variant="secondary"
                        className="px-2 py-1 flex items-center gap-1 bg-slate-700 text-slate-200"
                      >
                        <span>{category}</span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            onChange(value.filter((v) => v !== category));
                          }}
                          className="ml-1"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}

                {/* Category grid */}
                <div className="grid grid-cols-2 gap-2 max-h-[50vh] overflow-auto">
                  {sortedCategories.map((category) => {
                    const isSelected = value?.includes(category.name);
                    return (
                      <Button
                        key={category.name}
                        variant={isSelected ? "secondary" : "ghost"}
                        className={clsx(
                          "flex items-center justify-start w-full px-3 py-2 text-left text-sm text-white",
                          isSelected ? "bg-slate-700" : "hover:bg-slate-700"
                        )}
                        onClick={(e) => {
                          e.preventDefault();
                          if (isSelected) {
                            onChange(value.filter((v) => v !== category.name));
                          } else {
                            onChange([...value, category.name]);
                          }
                        }}
                      >
                        <div className="flex items-center justify-between w-full">
                          <span className="truncate max-w-[80%]">
                            {category.name}
                          </span>
                          {isSelected && (
                            <Check className="h-4 w-4 ml-2 flex-shrink-0" />
                          )}
                        </div>
                      </Button>
                    );
                  })}
                </div>
              </>
            )}
          </PopoverContent>
        </Popover>
      </div>

      {hasAddButton && (
        <div>
          <Button className="flex border-slate-700 rounded-l-none border-[1px] border-l-[0px] w-[50px] h-full py-0">
            <Plus className="my-auto" />
          </Button>
        </div>
      )}
    </div>
  );
};
