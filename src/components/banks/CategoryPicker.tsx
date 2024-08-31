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

export const CategoryPicker = ({
  value,
  onChange,
}: {
  value: string[];
  onChange: (value: string[]) => void;
}) => {
  const { categoryData } = useBanksCategsContext();

  return (
    <div className="flex flex-row gap-0 w-full">
      <MultiSelector
        values={value}
        onValuesChange={onChange}
        loop
        className="text-base"
      >
        <MultiSelectorTrigger className="rounded-r-none bg-transparent border-slate-700 px-2">
          <MultiSelectorInput
            name="categories"
            placeholder={
              !value?.length
                ? "Select categories"
                : value?.length < 3
                  ? "Add more categories"
                  : undefined
            }
            className="text-slate-200 min-w-0"
          />
        </MultiSelectorTrigger>
        <MultiSelectorContent>
          <MultiSelectorList className="max-h-[200px] bg-slate-800 border-slate-700 text-slate-100">
            {categoryData?.categories.map((categ) => (
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
      <div>
        <Button className="flex border-slate-700 rounded-l-none border-[1px] border-l-[0px] w-[50px] h-full">
          <Plus />
        </Button>
      </div>
    </div>
  );
};
