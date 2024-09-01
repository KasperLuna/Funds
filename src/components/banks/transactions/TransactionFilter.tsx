import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import useDebounce from "@/lib/hooks/useDebounce";
import { PopoverArrow } from "@radix-ui/react-popover";
import { Filter, Search } from "lucide-react";
import { useEffect, useState } from "react";
import { CategoryPicker } from "../CategoryPicker";
import { useQueryParams } from "@/lib/hooks/useQueryParams";

export const TransactionFilter = () => {
  const { setQueryParams } = useQueryParams();
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const [query, setQuery] = useState<string>("");
  const debouncedQuery = useDebounce(query, 300);

  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

  useEffect(() => {
    if (debouncedQuery) setQueryParams({ query: debouncedQuery });
    else setQueryParams({ query: undefined });
  }, [debouncedQuery]);

  useEffect(() => {
    if (selectedCategories.length > 0)
      setQueryParams({ categories: selectedCategories.join(",") });
    else setQueryParams({ categories: undefined });
  }, [selectedCategories]);

  return (
    <>
      <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
        <PopoverTrigger asChild>
          <Button
            variant={selectedCategories.length > 0 ? "outline" : "default"}
            className="px-2  border-2 border-slate-800"
          >
            <Filter />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          side="bottom"
          align="start"
          className="p-1 w-fit bg-slate-800 border-0 flex flex-col gap-2 max-w-[300px]"
        >
          <PopoverArrow className="fill-slate-800" />
          <CategoryPicker
            value={selectedCategories}
            onChange={setSelectedCategories}
            hasAddButton={false}
          />
        </PopoverContent>
      </Popover>
      <div className="flex flex-row gap-0 group">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={`Search descriptions...`}
          className="bg-transparent text-slate-100 rounded-r-none focus-visible:ring-offset-0 group-focus-visible:ring-offset-0 group-focus-within:border-slate-500 border-slate-700 transition-none focus-visible:ring-0 group-focus-visible:ring-0 border-r-0"
        />
        <Button className="px-2 border-[1px] border-slate-700 rounded-l-none bg-transparent group-focus-within:border-slate-500 transition-none border-l-0">
          <Search className="stroke-slate-500 group-focus-within:stroke-slate-300" />
        </Button>
      </div>
    </>
  );
};
