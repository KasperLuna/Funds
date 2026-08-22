import { Plus } from "lucide-react";

export default function BanksPage() {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4 px-4">
      <h1 className="text-xl font-semibold">Banks</h1>
      <section className="rounded-(--radius-lg) border border-(--border) bg-(--surface-1) p-6">
        <p className="text-sm text-slate-400">Total balance</p>
        <p className="mt-1 text-3xl tabular-nums" aria-label="Total balance masked">
          ••••
        </p>
      </section>
      <section className="flex flex-col items-center gap-2 rounded-(--radius-lg) border border-(--border) bg-(--surface-1) p-10 text-center">
        <div className="text-(--accent)" aria-hidden>
          <Plus className="h-8 w-8" />
        </div>
        <h2 className="text-base font-semibold">No accounts yet</h2>
        <p className="max-w-md text-sm text-slate-400">
          Accounts come in Phase 7 (account CRUD + transfers). For now this page lists your
          accounts and their transactions.
        </p>
      </section>
    </div>
  );
}