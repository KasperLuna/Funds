import { Skeleton } from "@/components/ui/skeleton";

export const BankStatCardLoader = () => (
  <div className="flex border-slate-600/25 gap-3 py-3 items-center  md:mx-0 border-2 flex-col text-center text-slate-200 bg-slate-900 flex-grow p-2 rounded-md min-w-[155px] hover:bg-slate-700 transition-all">
    <div className="gap-2 flex flex-row w-full justify-between">
      <Skeleton className="h-4 w-[70px] bg-slate-800" />
      <Skeleton className="h-4 w-[50px] bg-slate-800" />
    </div>

    <Skeleton className="h-4 w-[90px] bg-slate-700" />
  </div>
);
