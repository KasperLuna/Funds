import { useBanksCategsContext } from "@/lib/hooks/useBanksCategsContext";
import { usePrivacy } from "@/hooks/usePrivacy";
import { useQueryParams } from "@/lib/hooks/useQueryParams";
import { Bank } from "@/lib/types";
import { parseAmount } from "@/lib/utils";
import clsx from "clsx";
import { memo } from "react";
import { Wallet } from "lucide-react";

export const StatCard = memo(function StatCard({
  name,
  balance,
  percentage,
}: Bank & {
  percentage?: string;
}) {
  const { baseCurrency } = useBanksCategsContext();
  const { isPrivate } = usePrivacy();
  const { queryParams, setQueryParams } = useQueryParams();

  const isSelected = queryParams["bank"] === name;

  // Format and determine responsive sizing for balance
  const formattedBalance = isPrivate
    ? `${baseCurrency?.symbol ?? "$"}••••••`
    : parseAmount(balance, baseCurrency?.code);

  // Determine text size based on formatted balance length
  const getBalanceTextSize = () => {
    const length = formattedBalance.length;
    if (length > 12) return "text-sm";
    if (length > 8) return "text-base";
    return "text-lg";
  };

  // Determine if we need compact layout for long names
  const isLongName = name.length > 12;

  return (
    <div
      tabIndex={0}
      role="button"
      onClick={() => setQueryParams({ bank: !isSelected ? name : undefined })}
      className={clsx(
        "group relative overflow-hidden rounded-lg bg-gradient-to-br from-zinc-800/60 to-zinc-900/60 border p-3 shadow-lg transition-all duration-300 hover:scale-105 hover:shadow-xl w-full",
        isSelected
          ? "border-blue-500/50 bg-gradient-to-br from-blue-900/20 to-zinc-900/60 shadow-blue-500/25"
          : "border-zinc-700/50 hover:border-zinc-600/50 hover:from-zinc-700/60 hover:to-zinc-800/60"
      )}
    >
      {/* Gradient overlay */}
      <div
        className={`absolute inset-0 ${isSelected ? "bg-gradient-to-br from-blue-500/5 to-transparent" : "bg-gradient-to-br from-zinc-500/5 to-transparent"} pointer-events-none`}
      />

      <div className="relative z-10 flex flex-col gap-2 text-center">
        {/* Header section with bank name and percentage */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <div
              className={`p-1.5 rounded-md ${isSelected ? "bg-blue-500/20 border border-blue-500/30" : "bg-zinc-700/50 border border-zinc-600/50"} transition-all duration-300 flex-shrink-0`}
            >
              <Wallet
                className={`h-3 w-3 ${isSelected ? "text-blue-400" : "text-zinc-400"}`}
              />
            </div>
            <span
              className={clsx(
                "font-semibold transition-colors min-w-0 truncate",
                "text-sm",
                isSelected
                  ? "text-blue-100"
                  : "text-zinc-200 group-hover:text-zinc-100"
              )}
              title={name} // Show full name on hover
            >
              {name}
            </span>
          </div>
          {percentage && (
            <span className="text-xs text-zinc-400 bg-zinc-800/50 px-1.5 py-0.5 rounded flex-shrink-0">
              {percentage}
            </span>
          )}
        </div>

        {/* Balance section with adaptive sizing */}
        <div className="flex flex-col gap-1.5 min-w-0">
          <p
            className={clsx(
              "font-mono font-bold transition-colors break-all",
              getBalanceTextSize(),
              isSelected
                ? "text-blue-100"
                : "text-zinc-100 group-hover:text-white"
            )}
            title={formattedBalance} // Show full amount on hover
          >
            {formattedBalance}
          </p>

          {/* Balance indicator */}
          <div
            className={`h-1 rounded-full transition-all duration-300 ${
              balance > 0
                ? "bg-gradient-to-r from-green-500 to-emerald-500"
                : balance < 0
                  ? "bg-gradient-to-r from-red-500 to-rose-500"
                  : "bg-zinc-600"
            }`}
          />
        </div>
      </div>
    </div>
  );
});
