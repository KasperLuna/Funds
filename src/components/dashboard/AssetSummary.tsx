"use client";
import { useState, memo, useMemo, useCallback } from "react";
import { useBanksCategsContext } from "@/lib/hooks/useBanksCategsContext";
import { useTokensContext } from "@/lib/hooks/useTokensContext";
import { usePrivacyMode } from "@/lib/hooks/usePrivacyMode";
import { parseAmount, trimToTwoDecimals } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import clsx from "clsx";
import { RotateCw, PieChart, Wallet, Coins } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import Link from "next/link";

const colorsArray = [
  "#f59e42",
  "#ef4444",
  "#22c55e",
  "#3b82f6",
  "#14b8a6",
  "#a78bfa",
  "#6366f1",
  "#ec4899",
  "#eab308",
  "#84cc16",
  "#06b6d4",
  "#10b981",
  "#8b5cf6",
  "#f472b6",
  "#38bdf8",
];

const TABS = [
  {
    key: "Overall",
    label: "Overall",
    icon: PieChart,
    gradient: "from-purple-500/5 to-pink-500/5",
  },
  {
    key: "Banks",
    label: "Banks",
    icon: Wallet,
    gradient: "from-blue-500/5 to-cyan-500/5",
  },
  {
    key: "Crypto",
    label: "Crypto",
    icon: Coins,
    gradient: "from-orange-500/5 to-yellow-500/5",
  },
];

export const AssetSummary = memo(function AssetSummary() {
  const [tab, setTab] = useState("Overall");
  const queryClient = useQueryClient();
  const router = useRouter();
  const { isPrivacyModeEnabled } = usePrivacyMode();
  const { bankData, baseCurrency, categoryData } = useBanksCategsContext();
  const { tokenData, marketData } = useTokensContext();

  // Memoize data extraction
  const { banks, coins, market, isLoading, currency, currencySymbol } = useMemo(
    () => ({
      banks: bankData?.banks || [],
      coins: tokenData?.tokens || [],
      market: marketData || [],
      isLoading: bankData?.loading || tokenData?.loading,
      currency: baseCurrency?.code || "USD",
      currencySymbol: baseCurrency?.symbol || "$",
    }),
    [bankData, tokenData, marketData, baseCurrency]
  );

  // Memoize calculations
  const { bankTotal, cryptoTotal, overallTotal } = useMemo(() => {
    const bankTotal = banks.reduce((acc, bank) => acc + bank.balance, 0);
    const cryptoTotal = coins.reduce((acc, coin) => {
      const marketCoin = market.find((c) => c.id === coin.coingecko_id);
      return acc + coin.total * (marketCoin?.current_price || 0);
    }, 0);
    return {
      bankTotal,
      cryptoTotal,
      overallTotal: bankTotal + cryptoTotal,
    };
  }, [banks, coins, market]);

  // Callback for refresh
  const handleRefresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["banks"] });
    queryClient.invalidateQueries({ queryKey: ["tokens"] });
  }, [queryClient]);

  // Prepare breakdowns for each tab
  type AssetItem = { name: string; value: number; type: "bank" | "crypto" };
  let items: AssetItem[] = [];
  if (tab === "Overall") {
    items = [
      ...banks.map((bank) => ({
        name: bank.name,
        value: bank.balance,
        type: "bank" as const,
      })),
      ...coins.map((coin) => {
        const marketCoin = market.find((c) => c.id === coin.coingecko_id);
        return {
          name: `${coin.name} (${coin.symbol})`,
          value: coin.total * (marketCoin?.current_price || 0),
          type: "crypto" as const,
        };
      }),
    ].sort((a, b) => b.value - a.value);
  } else if (tab === "Banks") {
    items = banks
      .map((bank) => ({
        name: bank.name,
        value: bank.balance,
        type: "bank" as const,
      }))
      .sort((a, b) => b.value - a.value);
  } else if (tab === "Crypto") {
    items = coins
      .map((coin) => {
        const marketCoin = market.find((c) => c.id === coin.coingecko_id);
        return {
          name: `${coin.name} (${coin.symbol})`,
          value: coin.total * (marketCoin?.current_price || 0),
          type: "crypto" as const,
        };
      })
      .sort((a, b) => b.value - a.value);
  }

  const total =
    tab === "Overall"
      ? overallTotal
      : tab === "Banks"
        ? bankTotal
        : cryptoTotal;

  // Check for empty categories
  const hasNoCategories =
    !categoryData?.categories || categoryData.categories.length === 0;

  return (
    <div className="relative overflow-hidden rounded-xl border border-slate-700/50 bg-gradient-to-br from-slate-900/90 via-slate-800/85 to-slate-900/90 backdrop-blur-sm p-3 shadow-lg hover:shadow-xl transition-all duration-300 group w-full">
      {/* Find current tab for gradient */}
      {(() => {
        const currentTab = TABS.find((t) => t.key === tab);
        return (
          <div
            className={`absolute inset-0 bg-gradient-to-br ${currentTab?.gradient || "from-purple-500/5 to-pink-500/5"} pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300`}
          />
        );
      })()}

      <div className="relative z-10">
        {/* Header with tabs and refresh */}
        <div className="flex flex-row justify-between items-start mb-3">
          <div className="flex flex-row gap-1">
            {TABS.map((tabItem) => {
              const Icon = tabItem.icon;
              return (
                <button
                  key={tabItem.key}
                  className={clsx(
                    "flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-semibold transition-all duration-300",
                    tab === tabItem.key
                      ? "bg-gradient-to-r from-emerald-500/20 to-blue-500/20 text-emerald-300 border border-emerald-500/30"
                      : "bg-slate-800/60 text-slate-300 hover:bg-slate-700/60 hover:text-slate-200 border border-slate-700/50"
                  )}
                  onClick={() => setTab(tabItem.key)}
                >
                  <Icon className="h-4 w-4" />
                  {tabItem.label}
                </button>
              );
            })}
          </div>

          <Button
            className="rounded-lg p-1.5 h-fit bg-slate-800/60 hover:bg-slate-700/60 border border-slate-700/50 group transition-all duration-300"
            onClick={handleRefresh}
          >
            <RotateCw className="size-4 group-hover:rotate-180 transition-all duration-500 text-emerald-400" />
          </Button>
        </div>
        {/* Total display */}
        <div className="flex flex-col gap-2 mb-3">
          <span className="text-3xl font-mono font-bold bg-gradient-to-r from-white via-slate-100 to-slate-300 bg-clip-text text-transparent">
            {isPrivacyModeEnabled
              ? `${currencySymbol}••••••`
              : parseAmount(total, currency)}
          </span>
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-sm text-slate-400 font-medium">
              {tab} Total
            </span>
            {/* Show bank/crypto percentage breakdown on Overall tab */}
            {tab === "Overall" && overallTotal > 0 && (
              <div className="flex items-center gap-3 text-xs text-slate-400">
                <span className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-blue-400" />
                  Banks: {trimToTwoDecimals((bankTotal / overallTotal) * 100)}%
                </span>
                <span className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-orange-400" />
                  Crypto:{" "}
                  {trimToTwoDecimals((cryptoTotal / overallTotal) * 100)}%
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Loading state */}
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-6 w-full bg-slate-800/60" />
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-3 gap-2">
              {Array.from({ length: 6 }).map((_, index) => (
                <Skeleton
                  key={`skeleton-placeholder-${index + 1}`}
                  className="h-16 w-full bg-slate-800/60"
                />
              ))}
            </div>
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="w-12 h-12 rounded-full bg-slate-800/60 border border-slate-700/50 flex items-center justify-center mb-3">
              <PieChart className="w-6 h-6 text-slate-400" />
            </div>
            <p className="text-slate-400 text-base font-medium">
              No banks found
            </p>
            <p className="text-slate-500 text-sm mb-2">
              You need at least one bank to start tracking your finances.
            </p>
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <Link
              href="/dashboard?settings=banks"
              className="inline-block px-4 py-2 mt-2 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white font-semibold transition"
            >
              Go to Settings to Add Banks
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Enhanced progress bar */}
            <div className="relative">
              <div className="flex flex-row rounded-lg overflow-hidden shadow-lg border border-slate-700/50">
                {items.map((item, idx) => {
                  const percent = total > 0 ? (item.value / total) * 100 : 0;
                  return (
                    <ProgressSection
                      key={item.name}
                      percentage={percent}
                      color={colorsArray[idx % colorsArray.length]}
                    />
                  );
                })}
              </div>
            </div>

            {/* Enhanced breakdown grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-3 gap-2">
              {items.map((item, idx) => {
                const percent = total > 0 ? (item.value / total) * 100 : 0;
                const isBank = item.type === "bank";
                const accentColor = colorsArray[idx % colorsArray.length];

                return (
                  <div
                    key={item.name}
                    className={clsx(
                      "group relative overflow-hidden rounded-lg bg-gradient-to-br from-slate-800/70 to-slate-700/50 border border-slate-600/50 p-2 shadow-lg transition-all duration-300 hover:scale-[1.02] hover:shadow-xl hover:border-slate-500/70 cursor-pointer",
                      isBank && "hover:from-slate-700/80 hover:to-slate-600/60"
                    )}
                    style={{
                      boxShadow: `0 4px 12px 0 ${accentColor}15, inset 0 1px 0 ${accentColor}25`,
                    }}
                    onClick={
                      isBank
                        ? () =>
                            router.push(
                              `/dashboard/banks?bank=${encodeURIComponent(item.name)}`
                            )
                        : undefined
                    }
                  >
                    {/* Accent border */}
                    <div
                      className="absolute left-0 top-0 bottom-0 w-1 rounded-l-lg"
                      style={{ backgroundColor: accentColor }}
                    />

                    <div className="relative z-10 flex flex-col gap-2">
                      <div className="flex items-start justify-between">
                        <p className="font-semibold text-slate-100 group-hover:text-white transition-colors text-sm line-clamp-2 pr-1 min-w-0 flex-1">
                          {item.name.length > 20
                            ? item.name.slice(0, 20) + "..."
                            : item.name}
                        </p>
                        <div
                          className="w-3 h-3 rounded-full flex-shrink-0 mt-0.5"
                          style={{ backgroundColor: accentColor }}
                        />
                      </div>

                      <div className="flex flex-col gap-1">
                        <p className="text-base font-mono font-bold text-slate-100 group-hover:text-white transition-colors truncate">
                          {isPrivacyModeEnabled
                            ? `${currencySymbol}••••••`
                            : parseAmount(item.value, currency)}
                        </p>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-400 font-medium truncate">
                            {trimToTwoDecimals(percent)}%
                          </span>
                          {isBank && (
                            <span className="text-blue-400 font-medium flex-shrink-0">
                              Bank
                            </span>
                          )}
                          {item.type === "crypto" && (
                            <span className="text-orange-400 font-medium flex-shrink-0">
                              Crypto
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
});

const ProgressSection = memo(function ProgressSection({
  percentage,
  color,
}: {
  percentage: number;
  color?: string;
}) {
  return (
    <div
      className="flex flex-row justify-center items-center h-8 relative group transition-all duration-300 hover:brightness-110"
      style={{
        width: `${percentage}%`,
        backgroundColor: color,
      }}
    >
      <small
        className={clsx(
          { hidden: percentage < 10 },
          "font-mono text-xs font-semibold text-white drop-shadow-lg"
        )}
      >
        {trimToTwoDecimals(percentage)}%
      </small>
      {/* Tooltip for small sections */}
      {/* {percentage < 10 && (
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center z-10">
          <span className="bg-slate-900 text-white text-xs px-2 py-1 rounded shadow-lg whitespace-nowrap border border-slate-700">
            {trimToTwoDecimals(percentage)}%
          </span>
        </div>
      )} */}
    </div>
  );
});
