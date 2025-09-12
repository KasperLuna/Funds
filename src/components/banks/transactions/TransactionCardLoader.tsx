import { Skeleton } from "@/components/ui/skeleton";

export const TransactionCardLoader = () => (
  <div className="relative flex flex-col justify-between transition-all flex-grow h-full text-slate-200 p-3 border-2 gap-2 border-slate-600/50 rounded-xl overflow-hidden bg-gradient-to-br from-slate-800/60 to-slate-700/40">
    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-slate-600/20 to-transparent -translate-x-full animate-shimmer pointer-events-none" />
    <div className="relative z-10 flex flex-row w-full items-center justify-between py-3">
      <div className="gap-2 flex flex-col">
        <Skeleton className="h-4 w-[90px] bg-slate-600/60" />
        <Skeleton className="h-4 w-[50px] bg-slate-600/60" />
      </div>
      <div className="gap-2 flex flex-col items-end">
        <Skeleton className="h-4 w-[50px] bg-slate-600/60" />
        <Skeleton className="h-4 w-[90px] bg-slate-600/60" />
      </div>
    </div>
    <div className="relative z-10 space-y-2">
      <Skeleton className="h-4 w-full bg-slate-600/60" />
    </div>
  </div>
);
