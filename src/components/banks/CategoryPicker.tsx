import {
  MultiSelector,
  MultiSelectorTrigger,
  MultiSelectorInput,
  MultiSelectorContent,
  MultiSelectorList,
  MultiSelectorItem,
} from "../ui/multi-select";
import { useBanksCategsContext } from "@/lib/hooks/useBanksCategsContext";
import { Button } from "../ui/button";
import { Plus } from "lucide-react";
import clsx from "clsx";

export const CategoryPicker = ({
  value,
  onChange,
  hasAddButton = false,
}: {
  value: string[];
  onChange: (value: string[]) => void;
  hasAddButton?: boolean;
}) => {
  const { categoryData } = useBanksCategsContext();

  return (
    <div className="flex flex-row gap-0 w-full h-full">
      <MultiSelector
        values={value}
        onValuesChange={onChange}
        loop
        className="text-base"
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
            {categoryData?.categories
              .sort((a, b) => a.name.localeCompare(b.name))
              .map((categ) => (
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
