import { Eye, EyeOff } from "lucide-react";
import { formatMoney } from "@/lib/money";

function freshnessLabel(ts: number | null): string {
  if (!ts) return "Never synced";
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export interface NetWorthHeroProps {
  totalBalance: bigint;
  bankBalance: bigint;
  cryptoBalance: bigint;
  isPrivate: boolean;
  onTogglePrivacy: () => void;
  lastSyncedAt: number | null;
  currencyCode?: string;
}

export const NetWorthHero = ({
  totalBalance,
  bankBalance,
  cryptoBalance,
  isPrivate,
  onTogglePrivacy,
  lastSyncedAt,
  currencyCode = "USD",
}: NetWorthHeroProps) => {
  const bankAbs = bankBalance < 0n ? -bankBalance : bankBalance;
  const cryptoAbs = cryptoBalance < 0n ? -cryptoBalance : cryptoBalance;
  const totalAbs = bankAbs + cryptoAbs;
  const bankPct = totalAbs > 0n ? Number((bankAbs * 100n) / totalAbs) : 50;
  const cryptoPct = 100 - bankPct;

  return (
    <section
      aria-label="Net worth"
      className="relative overflow-hidden rounded-(--radius-lg) border border-(--border) bg-(--surface-1) px-5 pb-5 pt-6"
    >
      <div className="guilloche absolute inset-0 opacity-70" aria-hidden />

      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="label-micro">Net worth</p>
          <p
            className="text-display mt-1 text-zinc-50 [font-variant-numeric:tabular-nums]"
            aria-label={isPrivate ? "Net worth masked" : `Net worth ${formatMoney(totalBalance, 2, currencyCode)}`}
          >
            {isPrivate ? "••••••" : formatMoney(totalBalance, 2, currencyCode)}
          </p>
        </div>
        <button
          type="button"
          onClick={onTogglePrivacy}
          aria-label={isPrivate ? "Reveal balances" : "Hide balances"}
          className="mt-1 shrink-0 rounded-(--radius-md) border border-(--border) p-1.5 text-zinc-500 transition-colors hover:bg-(--surface-3) hover:text-inherit"
        >
          {isPrivate ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>

      <p className="relative mt-2 text-[11px] font-medium tabular-nums text-zinc-500">
        {isPrivate ? "Masked" : freshnessLabel(lastSyncedAt)}
      </p>

      <div className="relative mt-5 flex items-center gap-6 border-t border-(--border) pt-4">
        <span className="flex items-center gap-2 text-xs text-zinc-500">
          <span className="h-1.5 w-1.5 rounded-full bg-(--accent)" aria-hidden />
          <span className="label-micro !tracking-[0.08em]">Banks</span>
          <span className="font-semibold tabular-nums text-zinc-200">
            {isPrivate ? "••••" : formatMoney(bankBalance, 2, currencyCode)}
          </span>
        </span>
        <span className="flex items-center gap-2 text-xs text-zinc-500">
          <span className="h-1.5 w-1.5 rounded-full bg-violet-400" aria-hidden />
          <span className="label-micro !tracking-[0.08em]">Crypto</span>
          <span className="font-semibold tabular-nums text-zinc-200">
            {isPrivate ? "••••" : formatMoney(cryptoBalance, 2, currencyCode)}
          </span>
        </span>
      </div>

      <div
        className="relative mt-2.5 flex h-1 overflow-hidden rounded-full bg-(--surface-3)"
        aria-label="Balance split"
      >
        <div
          className="bg-(--accent)"
          style={{ width: `${bankPct}%` }}
          aria-hidden
        />
        <div
          className="bg-violet-400"
          style={{ width: `${cryptoPct}%` }}
          aria-hidden
        />
      </div>
    </section>
  );
};
