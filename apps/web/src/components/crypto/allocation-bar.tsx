import { cn } from "@/lib/utils";

const COLORS = [
  "bg-(--accent)",
  "bg-sky-500",
  "bg-amber-400",
  "bg-purple-400",
  "bg-rose-400",
];

export function AllocationBar({
  allocation,
}: {
  allocation: Array<{ symbol: string; pct: number }>;
}) {
  if (allocation.length === 0) return null;
  return (
    <div className="flex flex-col gap-2">
      <div className="flex h-1 overflow-hidden rounded-full bg-(--surface-3)">
        {allocation.map((a, i) => (
          <div
            key={a.symbol}
            className={cn(COLORS[i % COLORS.length])}
            style={{ width: `${a.pct}%` }}
            aria-label={`${a.symbol}: ${a.pct.toFixed(1)}%`}
          />
        ))}
      </div>
      <div className="flex flex-wrap gap-3">
        {allocation.map((a, i) => (
          <span key={a.symbol} className="flex items-center gap-1.5 text-xs text-zinc-500">
            <span className={cn("h-2 w-2 rounded-full", COLORS[i % COLORS.length])} />
            {a.symbol} {a.pct.toFixed(1)}%
          </span>
        ))}
      </div>
    </div>
  );
}
