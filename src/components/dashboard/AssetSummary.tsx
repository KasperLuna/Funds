"use client";
import { useState } from "react";
import { useBanksCategsContext } from "@/lib/hooks/useBanksCategsContext";
import { useTokensContext } from "@/lib/hooks/useTokensContext";
import { usePrivacyMode } from "@/lib/hooks/usePrivacyMode";
import { parseAmount, trimToTwoDecimals } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import clsx from "clsx";
import { RotateCw } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

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

const TABS = ["Overall", "Banks", "Crypto"];

export const AssetSummary = () => {
  const [tab, setTab] = useState("Overall");
  const queryClient = useQueryClient();
  const { isPrivacyModeEnabled } = usePrivacyMode();
  const { bankData, baseCurrency } = useBanksCategsContext();
  const { tokenData, marketData } = useTokensContext();
  const banks = bankData?.banks || [];
  const coins = tokenData?.tokens || [];
  const market = marketData || [];
  const isLoading = bankData?.loading || tokenData?.loading;
  const currency = baseCurrency?.code || "USD";
  const currencySymbol = baseCurrency?.symbol || "$";

  // Calculate values
  const bankTotal = banks.reduce((acc, bank) => acc + bank.balance, 0);
  const cryptoTotal = coins.reduce((acc, coin) => {
    const marketCoin = market.find((c) => c.id === coin.coingecko_id);
    return acc + coin.total * (marketCoin?.current_price || 0);
  }, 0);
  const overallTotal = bankTotal + cryptoTotal;

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

  return (
    <div className="flex flex-col gap-3 w-full">
      {/* Tabs */}
      <div className="flex flex-row gap-2 mb-2">
        {TABS.map((t) => (
          <button
            key={t}
            className={clsx(
              "px-3 py-1 rounded-full text-sm font-semibold transition-colors",
              tab === t
                ? "bg-orange-500 text-white"
                : "bg-slate-800 text-slate-300 hover:bg-slate-700"
            )}
            onClick={() => setTab(t)}
          >
            {t}
          </button>
        ))}
        <Button
          className="rounded-full p-2 h-fit hover:bg-slate-700 group ml-auto"
          onClick={() => {
            queryClient.invalidateQueries({ queryKey: ["banks"] });
            queryClient.invalidateQueries({ queryKey: ["tokens"] });
          }}
        >
          <RotateCw className="size-4 group-hover:rotate-180 transition-all" />
        </Button>
      </div>
      {/* Total */}
      <div className="flex flex-col items-start mb-2">
        <span className="text-3xl font-bold text-slate-100">
          {isPrivacyModeEnabled
            ? `${currencySymbol}••••••`
            : parseAmount(total, currency)}
        </span>
        <span className="text-xs text-slate-400 mt-1">{tab} Total</span>
        {/* Show bank/crypto percentage breakdown on Overall tab */}
        {tab === "Overall" && overallTotal > 0 && (
          <span className="text-xs text-slate-400 mt-1">
            Banks: {trimToTwoDecimals((bankTotal / overallTotal) * 100)}% |
            Crypto: {trimToTwoDecimals((cryptoTotal / overallTotal) * 100)}%
          </span>
        )}
      </div>
      {/* Loading state */}
      {isLoading ? (
        <>
          <Skeleton className="h-9 w-full bg-slate-800" />
          <div className="grid xl:grid-cols-3 lg:grid-cols-2 md:grid-cols-3 sm:grid-cols-3 grid-cols-2 gap-2">
            {Array.from({ length: 9 }).map((_, index) => (
              <Skeleton
                key={`skeleton-placeholder-${index + 1}`}
                className="h-14 w-full bg-slate-800"
              />
            ))}
          </div>
        </>
      ) : items.length === 0 ? (
        <p className="text-slate-400">No assets found for this tab.</p>
      ) : (
        <>
          {/* Progress bar */}
          <div className="flex flex-row rounded-md overflow-hidden">
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
          {/* Breakdown grid */}
          <div className="grid xl:grid-cols-3 lg:grid-cols-2 md:grid-cols-3 sm:grid-cols-3 grid-cols-2 gap-2">
            {items.map((item, idx) => {
              const percent = total > 0 ? (item.value / total) * 100 : 0;
              return (
                <div
                  key={item.name}
                  className="flex flex-col gap-1.5 justify-between text-slate-100 bg-slate-800 rounded-md p-1 px-2 border-[2.5px] hover:bg-slate-700 transition-colors"
                  style={{
                    borderLeftColor: colorsArray[idx % colorsArray.length],
                    borderLeftWidth: "4px",
                    borderStyle: "solid",
                    borderTop: 0,
                    borderBottom: 0,
                    borderRight: 0,
                    boxShadow: `0 2px 8px 0 ${colorsArray[idx % colorsArray.length]}22`,
                  }}
                >
                  <p className="font-semibold text-ellipsis line-clamp-2">
                    {item.name}
                  </p>
                  <div className="flex flex-row gap-2 w-full justify-between items-end flex-wrap">
                    <p className="text-sm font-mono">
                      {isPrivacyModeEnabled
                        ? `${currencySymbol}••••••`
                        : parseAmount(item.value, currency)}
                    </p>
                    <p className="text-xs">{trimToTwoDecimals(percent)}%</p>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};

const ProgressSection = ({
  percentage,
  color,
}: {
  percentage: number;
  color?: string;
}) => {
  return (
    <div
      className="flex flex-row justify-center items-center h-10"
      style={{
        width: `${percentage}%`,
        backgroundColor: color,
      }}
    >
      <small
        className={clsx({ hidden: percentage < 10 }, "font-mono text-xs")}
        style={{
          textShadow: "0 1px 1px rgba(0,0,0,0.7), 0 0px 1px rgba(0,0,0,0.7)",
        }}
      >
        {trimToTwoDecimals(percentage)}%
      </small>
    </div>
  );
};
