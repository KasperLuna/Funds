import Link from "next/link";
import { Plus, Landmark, Bitcoin, ShieldCheck } from "lucide-react";
import { SyncPill } from "@/components/app-shell/shell-nav";

function Empty({ icon, title, body, action }: { icon: React.ReactNode; title: string; body: string; action?: React.ReactNode }) {
  return (
    <section className="rounded-(--radius-lg) border border-(--border) bg-(--surface-1) p-6">
      <div className="flex flex-col items-center gap-2 text-center">
        <div className="text-(--accent)" aria-hidden>
          {icon}
        </div>
        <h2 className="text-base font-semibold">{title}</h2>
        <p className="max-w-md text-sm text-slate-400">{body}</p>
        {action}
      </div>
    </section>
  );
}

export default function DashboardPage() {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4 px-4">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Home</h1>
        <SyncPill />
      </header>

      <section aria-label="Net worth" className="rounded-(--radius-lg) border border-(--border) bg-(--surface-1) p-6">
        <p className="text-sm text-slate-400">Net worth</p>
        <p className="mt-1 text-3xl tabular-nums" aria-label="Net worth masked">
          ••••
        </p>
        <p className="mt-1 text-xs text-slate-500">Privacy mode on — reveal to see values</p>
      </section>

      <Empty
        icon={<Landmark className="h-8 w-8" />}
        title="No accounts yet"
        body="Create your first bank account to start tracking money. Accounts are the home for every transaction."
        action={
          <Link
            href="/dashboard/banks"
            className="inline-flex h-11 items-center gap-1 rounded-(--radius-md) bg-(--surface-2) px-4 text-sm hover:bg-(--surface-3)"
          >
            <Plus className="h-4 w-4" aria-hidden /> Go to Banks
          </Link>
        }
      />

      <Empty
        icon={<Bitcoin className="h-8 w-8" />}
        title="Crypto portfolio"
        body="Track trades and holdings with live market prices."
        action={
          <Link href="/dashboard/crypto" className="text-sm text-(--accent) underline">
            Open Crypto
          </Link>
        }
      />

      <Empty
        icon={<ShieldCheck className="h-8 w-8" />}
        title="Privacy by default"
        body="All monetary values stay masked each session until you reveal them."
        action={
          <Link href="/dashboard/privacy" className="text-sm text-(--accent) underline">
            Privacy settings
          </Link>
        }
      />
    </div>
  );
}