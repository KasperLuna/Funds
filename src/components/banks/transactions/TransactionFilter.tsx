import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import useDebounce from "@/lib/hooks/useDebounce";
import { Filter, Search } from "lucide-react";
import { usePathname, useSearchParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

export const TransactionFilter = () => {
  const [query, setQuery] = useState<string>("");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const debouncedQuery = useDebounce(query, 300);

  useEffect(() => {
    if (debouncedQuery)
      router.push(pathname + "?" + createQueryString("query", debouncedQuery));
    else router.push(pathname);
  }, [debouncedQuery]);

  // const { handleSubmit, register } = useForm();
  // const onSubmit = (data: any) => {
  //   console.log(data);
  //   router.push(pathname + "?" + createQueryString("query", data.query));
  // };

  const createQueryString = useCallback(
    (name: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set(name, value);

      return params.toString();
    },
    [searchParams]
  );

  return (
    <>
      {" "}
      <Button
        className="px-2  border-2 border-slate-800"
        onClick={() => alert("TODO")}
      >
        <Filter />
      </Button>
      {/* <form onSubmit={handleSubmit(onSubmit)}> */}
      <div className="flex flex-row gap-0 group">
        <Input
          // {...register("query")}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={`Search descriptions...`}
          className="bg-transparent text-slate-100 rounded-r-none focus-visible:ring-offset-0 group-focus-visible:ring-offset-0 group-focus-within:border-slate-500 border-slate-700 transition-none focus-visible:ring-0 group-focus-visible:ring-0 border-r-0"
        />
        <Button className="px-2 border-[1px] border-slate-700 rounded-l-none bg-transparent group-focus-within:border-slate-500 transition-none border-l-0">
          <Search className="stroke-slate-500 group-focus-within:stroke-slate-300" />
        </Button>
      </div>
      {/* </form> */}
    </>
  );
};
