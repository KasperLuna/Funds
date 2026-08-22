import Link from "next/link";
import { ArrowRight } from "lucide-react";

export default function LandingPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center gap-6 px-4 text-center">
      <div className="flex items-center gap-2">
        <span className="h-10 w-10 rounded-lg bg-(--accent)" aria-hidden />
        <span className="text-3xl font-semibold">Funds</span>
      </div>
      <p className="max-w-md text-slate-400">
        A multi-currency personal finance tracker that captures every transaction fast, works
        offline, and keeps your money private.
      </p>
      <Link
        href="/dashboard"
        className="inline-flex h-12 items-center gap-2 rounded-(--radius-md) bg-(--accent) px-6 text-sm font-medium text-(--accent-foreground) transition-opacity hover:opacity-90"
      >
        Open app <ArrowRight className="h-4 w-4" aria-hidden />
      </Link>
    </main>
  );
}