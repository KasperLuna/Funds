import { Eye, EyeOff } from "lucide-react";

function formatMinor(cents: bigint): string {
  const sign = cents < 0n ? "-" : "";
  const abs = cents < 0n ? -cents : cents;
  const major = Number(abs) / 100;
  return `${sign}$${major.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

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

export type NetWorthHeroProps = {
  totalBalance: bigint;
  bankBalance: bigint;
  cryptoBalance: bigint;
  privacy: boolean;
  onTogglePrivacy: () => void;
  lastSyncedAt: number | null;
};

export function NetWorthHero({
  totalBalance,
  bankBalance,
  cryptoBalance,
  privacy,
  onTogglePrivacy,
  lastSyncedAt,
}: NetWorthHeroProps) {
  const bankAbs = bankBalance < 0n ? -bankBalance : bankBalance;
  const cryptoAbs = cryptoBalance < 0n ? -cryptoBalance : cryptoBalance;
  const totalAbs = bankAbs + cryptoAbs;
  const bankPct = totalAbs > 0n ? Number((bankAbs * 100n) / totalAbs) : 50;
  const cryptoPct = 100 - bankPct;

  return (
    <section
      aria-label="Net worth"
      className="rounded-(--radius-lg) border border-(--border) bg-(--surface-1) p-6"
    >
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-400">Net worth</p>
        <button
          type="button"
          onClick={onTogglePrivacy}
          aria-label={privacy ? "Reveal balances" : "Hide balances"}
          className="rounded-(--radius-md) p-1 text-slate-400 transition-colors hover:bg-(--surface-2) hover:text-inherit"
        >
          {privacy ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>

      <p
        className="mt-1 text-3xl tabular-nums"
        aria-label={privacy ? "Net worth masked" : `Net worth ${formatMinor(totalBalance)}`}
      >
        {privacy ? "••••" : formatMinor(totalBalance)}
      </p>

      <div className="mt-3 flex gap-4 text-xs text-slate-400">
        <span>
          Banks: {privacy ? "••••" : formatMinor(bankBalance)}
        </span>
        <span>
          Crypto: {privacy ? "••••" : formatMinor(cryptoBalance)}
        </span>
      </div>

      <div
        className="mt-3 flex h-1.5 overflow-hidden rounded-full bg-(--surface-2)"
        aria-label="Balance split"
      >
        <div
          className="bg-(--accent)"
          style={{ width: `${bankPct}%` }}
          aria-hidden
        />
        <div
          className="bg-purple-500"
          style={{ width: `${cryptoPct}%` }}
          aria-hidden
        />
      </div>

      <p className="mt-2 text-xs text-slate-500">
        {privacy ? "Privacy mode on" : freshnessLabel(lastSyncedAt)}
      </p>
    </section>
  );
}
