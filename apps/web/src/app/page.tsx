import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { FundsLogo } from "@/components/brand/funds-logo";

const FACTS = [
  { label: "Multi-currency" },
  { label: "Fast capture" },
  { label: "Works offline" },
  { label: "Private by design" },
];

export default function LandingPage() {
  return (
    <main className="relative mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center gap-8 overflow-hidden px-4 text-center">
      <div className="guilloche absolute inset-0 opacity-40" aria-hidden />
      <div className="relative flex flex-col items-center gap-5">
        <FundsLogo className="h-14 w-auto text-zinc-50" />
        <h1 className="sr-only">Funds</h1>
      </div>
      <p className="relative max-w-md text-base leading-relaxed text-zinc-400">
        A multi-currency personal finance tracker that captures every transaction fast,
        works offline, and keeps your money private.
      </p>
      <ul className="relative flex flex-wrap items-center justify-center gap-2" aria-label="Highlights">
        {FACTS.map((f) => (
          <li
            key={f.label}
            className="rounded-md border border-(--border) bg-(--surface-2) px-3 py-1 text-xs font-medium text-zinc-300"
          >
            {f.label}
          </li>
        ))}
      </ul>
      <Link
        href="/dashboard"
        className="relative inline-flex h-12 items-center gap-2 rounded-(--radius-md) bg-(--accent) px-8 font-display text-sm font-bold text-(--accent-foreground) transition-[filter,transform] duration-150 ease-out hover:brightness-110 active:scale-[0.98]"
      >
        Open app <ArrowRight className="h-4 w-4" strokeWidth={2.5} aria-hidden />
      </Link>
    </main>
  );
}
