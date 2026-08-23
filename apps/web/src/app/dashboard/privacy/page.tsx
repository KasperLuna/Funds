import { ShieldCheck } from "lucide-react";

export default function PrivacyPage() {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4 px-4">
      <h1 className="font-display text-2xl font-bold tracking-tight">Privacy</h1>
      <section className="rounded-(--radius-lg) border border-(--border) bg-(--surface-1) p-6">
        <div className="flex items-center gap-3">
          <ShieldCheck className="h-6 w-6 text-(--accent)" aria-hidden />
          <div>
            <h2 className="text-base font-semibold">Privacy mode: on</h2>
            <p className="text-sm text-zinc-500">
              Default per session. All monetary values stay masked until you reveal them.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
