import { Skeleton } from "@/components/ui/skeleton";

export const TransactionCardLoader = () => (
  <div className="flex flex-col justify-between transition-all flex-grow h-full text-slate-200 p-2 border-2 gap-2 border-slate-700  rounded-xl overflow-clip">
    <div className="flex flex-row w-full items-center justify-between py-3">
      <div className="gap-2 flex flex-col">
        <Skeleton className="h-4 w-[90px] bg-slate-800" />
        <Skeleton className="h-4 w-[50px] bg-slate-800" />
      </div>
      <div className="gap-2 flex flex-col items-end">
        <Skeleton className="h-4 w-[50px] bg-slate-800" />
        <Skeleton className="h-4 w-[90px] bg-slate-800" />
      </div>
    </div>
    <div className="space-y-2">
      <Skeleton className="h-4 w-full  bg-slate-900" />
    </div>
  </div>
);
