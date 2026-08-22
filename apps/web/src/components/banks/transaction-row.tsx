import type { Txn } from "@/lib/accounts/accounts-store";

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
  categoryNames,
}: {
  txn: Txn;
  categoryNames: Map<string, string>;
}) {
  const cats = txn.categoryIds
    .map((id) => categoryNames.get(id))
    .filter(Boolean)
    .join(", ");

  const isExpense = txn.amountMinor < 0n;

  return (
    <div className="flex items-center justify-between px-4 py-3">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">
          {txn.description || "No description"}
        </p>
        {cats && (
          <p className="truncate text-xs text-slate-400">{cats}</p>
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
