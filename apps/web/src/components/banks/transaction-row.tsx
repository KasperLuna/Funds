import type { Txn } from "@/lib/accounts/accounts-store";

type CategoryInfo = { id: string; name: string; color: string };

function formatMinor(cents: bigint): string {
  const sign = cents < 0n ? "-" : "";
  const abs = cents < 0n ? -cents : cents;
  const major = Number(abs) / 100;
  return `${sign}$${major.toFixed(2)}`;
}

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function TransactionRow({
  txn,
  categories,
}: {
  txn: Txn;
  categories: CategoryInfo[];
}) {
  const cats = txn.categoryIds
    .map((id) => categories.find((c) => c.id === id))
    .filter(Boolean) as CategoryInfo[];

  const isExpense = txn.amountMinor < 0n;

  return (
    <div className="flex items-center justify-between px-4 py-3">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">
          {txn.description || "No description"}
        </p>
        {cats.length > 0 && (
          <div className="mt-1 flex flex-wrap gap-1">
            {cats.map((cat, i) => (
              <span
                key={`${cat.name}-${i}`}
                className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
                style={{
                  backgroundColor: cat.color,
                  color: "#fff",
                }}
              >
                {cat.name}
              </span>
            ))}
          </div>
        )}
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <span className="text-xs text-slate-500">{formatTime(txn.date)}</span>
        <span
          className={`text-sm tabular-nums font-medium ${isExpense ? "text-red-500" : "text-green-500"}`}
        >
          {formatMinor(txn.amountMinor)}
        </span>
      </div>
    </div>
  );
}
