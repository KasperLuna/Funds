import { PiggyBank } from "lucide-react";

export function BudgetPulse() {
  return (
    <section
      aria-label="Budget pulse"
      className="rounded-(--radius-lg) border border-(--border) bg-(--surface-1) p-6"
    >
      <div className="flex flex-col items-center gap-2 text-center">
        <div className="text-(--accent)" aria-hidden>
          <PiggyBank className="h-8 w-8" />
        </div>
        <h2 className="text-base font-semibold">Budgets</h2>
        <p className="max-w-md text-sm text-slate-400">
          Set category budgets to track spending pulse.
        </p>
      </div>
    </section>
  );
}
