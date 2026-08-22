import { Bitcoin } from "lucide-react";
import type { Holding } from "@/lib/crypto/crypto-store";

function formatMinor(cents: bigint): string {
  const sign = cents < 0n ? "-" : "";
  const abs = cents < 0n ? -cents : cents;
  const major = Number(abs) / 100;
  return `${sign}$${major.toFixed(2)}`;
}

export function HoldingRow({ holding }: { holding: Holding }) {
  const { token, qtyMinor, avgCostMinor } = holding;
  const qty = Number(qtyMinor) / 10 ** token.decimals;
  return (
    <div className="flex items-center justify-between px-4 py-3">
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-(--surface-2)">
          <Bitcoin className="h-4 w-4 text-(--accent)" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{token.name}</p>
          <p className="truncate text-xs text-slate-400">{token.symbol}</p>
        </div>
      </div>
      <div className="text-right shrink-0">
        <p className="text-sm tabular-nums">{qty.toFixed(token.decimals > 4 ? 4 : token.decimals)}</p>
        <p className="text-xs text-slate-400">avg {formatMinor(avgCostMinor)}</p>
      </div>
    </div>
  );
}
