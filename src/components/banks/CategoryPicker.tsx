import { useState } from "react";
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

export const CategoryPicker = () => {
  const { categoryData } = useBanksCategsContext();
  const [value, setValue] = useState<string[]>([]);

  return (
    <div className="flex flex-row gap-0">
      <MultiSelector
        values={value}
        onValuesChange={setValue}
        loop
        className="text-base"

        // className="bg-red-800"
      >
        <MultiSelectorTrigger className="rounded-r-none bg-transparent border-slate-700">
          <MultiSelectorInput
            name="categories"
            placeholder={
              value?.length ? "Add more categories" : "Select categories"
            }
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
      <Button className="border-slate-700 rounded-l-none border-[1px] border-l-[0px] h-full">
        <Plus />
      </Button>
    </div>
  );
};
