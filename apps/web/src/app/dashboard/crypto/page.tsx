import { Bitcoin } from "lucide-react";

export default function CryptoPage() {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4 px-4">
      <h1 className="text-xl font-semibold">Crypto</h1>
      <section className="flex flex-col items-center gap-2 rounded-(--radius-lg) border border-(--border) bg-(--surface-1) p-10 text-center">
        <div className="text-(--accent)" aria-hidden>
          <Bitcoin className="h-8 w-8" />
        </div>
        <h2 className="text-base font-semibold">No holdings yet</h2>
        <p className="max-w-md text-sm text-slate-400">
          Trades and holdings land in Phase 8 (CoinGecko rates + cost-basis engine).
        </p>
      </section>
    </div>
  );
}