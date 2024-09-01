import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import useDebounce from "@/lib/hooks/useDebounce";
import { Filter, Search, Table } from "lucide-react";
import { useEffect, useState } from "react";
import { CategoryPicker } from "../CategoryPicker";
import { useQueryParams } from "@/lib/hooks/useQueryParams";
import { MonthPicker } from "@/components/MonthPicker";
import dayjs from "dayjs";
import { useAutoAnimate } from "@formkit/auto-animate/react";

export const TransactionFilter = () => {
  const { queryParams, setQueryParams } = useQueryParams();

  const selectedCategories = queryParams["categories"]?.split(",") || [];
  const selectedMonth = queryParams["month"]
    ? new Date(queryParams["month"])
    : undefined;

  // Search bar
  const [query, setQuery] = useState<string>(() => {
    return queryParams["query"] || undefined;
  });
  const debouncedQuery = useDebounce(query, 300);
  useEffect(() => {
    if (queryParams["query"] === debouncedQuery) return;
    if (debouncedQuery || queryParams["query"]) {
      setQueryParams({ query: debouncedQuery });
    }
  }, [debouncedQuery]);

  const [ref] = useAutoAnimate({ duration: 100 });
  const isTriggered = !!(selectedCategories.length > 0 || selectedMonth);
  const [isOpen, setIsOpen] = useState<boolean>(isTriggered);

  return (
    <div id="layout-filter-group" className="flex flex-row gap-2 flex-wrap">
      <div id="layout-search-group" className="flex flex-row gap-2">
        <Button
          className="px-2 border-2 border-slate-800"
          onClick={() => alert("TODO")}
        >
          <Table />
        </Button>
        <div id="search-group" className="flex flex-row gap-0 group">
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
      </div>

      <div
        id="layout-filter-group"
        ref={ref}
        className="flex flex-row gap-2 flex-wrap sm:flex-nowrap flex-shrink"
      >
        <Button
          variant={isTriggered ? "outline" : "default"}
          className="px-2  border-2 border-slate-800"
          onClick={() => setIsOpen(!isOpen)}
        >
          <Filter />
        </Button>
        {isOpen && (
          <>
            <MonthPicker
              date={selectedMonth}
              setDate={(date) => {
                if (!date) return;
                setQueryParams({
                  month: dayjs(
                    //last day of month
                    new Date(date.getFullYear(), date.getMonth() + 1, 0)
                  ).format("YYYY-MM-DD"),
                });
              }}
            />
            {selectedMonth && (
              <Button
                className="hover:bg-slate-700"
                onClick={() => setQueryParams({ month: undefined })}
              >
                Clear
              </Button>
            )}
            <div className="flex flex-grow flex-shrink">
              <CategoryPicker
                value={selectedCategories}
                onChange={(value) => {
                  if (value.length === 0) {
                    setQueryParams({ categories: undefined });
                  } else {
                    setQueryParams({ categories: value.join(",") });
                  }
                }}
                hasAddButton={false}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
};
