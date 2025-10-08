"use client";
import { useMemo, useState, memo, useCallback } from "react";
import { TrendingUp, Wallet, Coins } from "lucide-react";
import Image from "next/image";
import { useQueries, UseQueryResult } from "@tanstack/react-query";
import dayjs from "dayjs";
import { usePrivacy } from "@/hooks/usePrivacy";
import { useTokensContext } from "@/lib/hooks/useTokensContext";
import { Token } from "@/lib/types";
import dynamic from "next/dynamic";
import {
  CoinGeckoMarketData,
  CoinGeckoMarketChartData,
  CoinGeckoPriceDataPoint,
} from "@/lib/types/coingecko";
import { useUserQuery } from "@/lib/hooks/useUserQuery";

// Error response type for CoinGecko API
interface CoinGeckoErrorResponse {
  error_code?: number;
  error?: string;
  status?: { error_code?: number; error_message?: string };
}

// Helper function for better number formatting
function formatPrice(price: number, currency: string): string {
  if (price >= 1000000000) {
    return `${currency} ${(price / 1000000000).toLocaleString(undefined, {
      minimumFractionDigits: 1,
      maximumFractionDigits: 2,
    })}B`;
  } else if (price >= 1000000) {
    return `${currency} ${(price / 1000000).toLocaleString(undefined, {
      minimumFractionDigits: 1,
      maximumFractionDigits: 2,
    })}M`;
  } else if (price >= 1000) {
    return `${currency} ${(price / 1000).toLocaleString(undefined, {
      minimumFractionDigits: 1,
      maximumFractionDigits: 2,
    })}K`;
  } else if (price >= 1) {
    return `${currency} ${price.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  } else if (price >= 0.01) {
    return `${currency} ${price.toLocaleString(undefined, {
      minimumFractionDigits: 4,
      maximumFractionDigits: 4,
    })}`;
  } else if (price >= 0.0001) {
    return `${currency} ${price.toLocaleString(undefined, {
      minimumFractionDigits: 6,
      maximumFractionDigits: 6,
    })}`;
  } else if (price > 0) {
    return `${currency} ${price.toExponential(2)}`;
  } else {
    return `${currency} 0.00`;
  }
}

// Helper function for formatting token amounts
function formatTokenAmount(amount: number): string {
  if (amount >= 1000000) {
    return `${(amount / 1000000).toLocaleString(undefined, {
      minimumFractionDigits: 1,
      maximumFractionDigits: 2,
    })}M`;
  } else if (amount >= 1000) {
    return `${(amount / 1000).toLocaleString(undefined, {
      minimumFractionDigits: 1,
      maximumFractionDigits: 2,
    })}K`;
  } else if (amount >= 1) {
    return amount.toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 4,
    });
  } else if (amount >= 0.0001) {
    return amount.toLocaleString(undefined, {
      minimumFractionDigits: 4,
      maximumFractionDigits: 8,
    });
  } else {
    return amount.toExponential(2);
  }
}

// Component to show price with tooltip for exact value
function PriceDisplay({
  price,
  currency,
  className = "",
}: {
  price: number;
  currency: string;
  className?: string;
}) {
  const formattedPrice = formatPrice(price, currency);
  const exactPrice = `${currency} ${price.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 8,
  })}`;

  return (
    <span
      className={`${className} ${formattedPrice !== exactPrice ? "cursor-help" : ""}`}
      title={formattedPrice !== exactPrice ? exactPrice : undefined}
    >
      {formattedPrice}
    </span>
  );
}

// Component to show token amount with tooltip for exact value
function TokenAmountDisplay({
  amount,
  className = "",
}: {
  amount: number;
  className?: string;
}) {
  const formattedAmount = formatTokenAmount(amount);
  const exactAmount = amount.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 8,
  });

  return (
    <span
      className={`${className} ${formattedAmount !== exactAmount ? "cursor-help" : ""}`}
      title={formattedAmount !== exactAmount ? exactAmount : undefined}
    >
      {formattedAmount}
    </span>
  );
}

const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });

export const CryptoSummary = memo(function CryptoSummary({
  portfolio,
  totalValue,
  change24h,
  currency,
  privacyMode,
}: {
  portfolio: Token[];
  totalValue: number;
  change24h: number;
  currency: string;
  privacyMode: boolean;
}) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-zinc-800/50 bg-gradient-to-br from-zinc-900/80 via-zinc-900/60 to-zinc-800/40 p-6 shadow-2xl backdrop-blur-sm transition-all duration-300 hover:shadow-3xl hover:border-zinc-700/50 w-full min-w-0">
      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/5 via-transparent to-orange-500/5 pointer-events-none" />

      <div className="relative z-10">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-lg bg-gradient-to-br from-yellow-400/20 to-yellow-600/20 border border-yellow-500/20">
            <Wallet className="h-6 w-6 text-yellow-400" />
          </div>
          <h3 className="text-xl font-bold bg-gradient-to-r from-white to-zinc-300 bg-clip-text text-transparent">
            Crypto Portfolio
          </h3>
        </div>

        <div className="flex flex-col gap-3 mb-4">
          <div className="flex items-baseline gap-4 flex-wrap">
            <span className="text-4xl font-mono font-bold bg-gradient-to-r from-white via-zinc-100 to-zinc-300 bg-clip-text text-transparent min-w-[140px]">
              {privacyMode ? (
                <span className="select-none">{currency} ••••</span>
              ) : (
                <PriceDisplay price={totalValue} currency={currency} />
              )}
            </span>
            <div
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg font-semibold text-sm transition-colors ${
                change24h > 0
                  ? "bg-green-500/10 text-green-400 border border-green-500/20"
                  : change24h < 0
                    ? "bg-red-500/10 text-red-400 border border-red-500/20"
                    : "bg-zinc-500/10 text-zinc-400 border border-zinc-500/20"
              }`}
            >
              {change24h > 0 ? "↗" : change24h < 0 ? "↘" : "→"}
              {change24h > 0 ? "+" : ""}
              {change24h?.toFixed(2)}% 24h
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {portfolio?.map((coin: Token) => (
            <div
              key={coin.name + coin.symbol + coin.id}
              className="group bg-zinc-800/60 hover:bg-zinc-700/60 border border-zinc-700/50 hover:border-zinc-600/50 px-3 py-2 rounded-lg text-xs font-mono transition-all duration-200 hover:scale-105"
            >
              <span className="text-zinc-300 group-hover:text-zinc-200">
                {coin.name}:{" "}
              </span>
              <span className="text-zinc-100 font-semibold">
                {privacyMode ? (
                  <span className="select-none">••••</span>
                ) : (
                  coin.total
                )}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
});

export const MarketOverview = memo(function MarketOverview({
  coins,
  currency,
  privacyMode,
}: {
  coins: CoinGeckoMarketData[];
  currency: string;
  privacyMode: boolean;
}) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-zinc-800/50 bg-gradient-to-br from-zinc-900/80 via-zinc-900/60 to-zinc-800/40 p-5 shadow-2xl backdrop-blur-sm transition-all duration-300 hover:shadow-3xl hover:border-zinc-700/50 w-full min-w-0">
      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 via-transparent to-emerald-500/5 pointer-events-none" />

      <div className="relative z-10">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-1.5 rounded-lg bg-gradient-to-br from-green-400/20 to-green-600/20 border border-green-500/20">
            <TrendingUp className="h-5 w-5 text-green-400" />
          </div>
          <h3 className="text-lg font-bold bg-gradient-to-r from-white to-zinc-300 bg-clip-text text-transparent">
            Market Overview
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {coins.map((coin) => (
            <div
              key={coin.name}
              className="group relative overflow-hidden rounded-lg bg-gradient-to-br from-zinc-800/60 to-zinc-900/60 border border-zinc-700/50 p-3 shadow-lg transition-all duration-300 hover:scale-105 hover:shadow-xl hover:border-zinc-600/50 hover:from-zinc-700/60 hover:to-zinc-800/60"
            >
              <div className="flex items-center gap-2.5 mb-2">
                <div className="relative">
                  <Image
                    src={coin.image}
                    alt={coin.name}
                    width={32}
                    height={32}
                    className="w-8 h-8 rounded-full bg-zinc-900 ring-2 ring-zinc-700/50 group-hover:ring-zinc-600/50 transition-all duration-300"
                  />
                  <div className="absolute inset-0 rounded-full bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                </div>
                <div className="flex flex-col min-w-0 flex-1">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-bold text-zinc-100 truncate text-sm group-hover:text-white transition-colors">
                      {coin.name}
                    </span>
                    <span className="text-xs text-zinc-400 uppercase bg-zinc-800/50 px-1.5 py-0.5 rounded text-[10px]">
                      {coin.symbol}
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-baseline justify-between">
                  <span className="font-mono text-base font-bold text-zinc-100 group-hover:text-white transition-colors">
                    {privacyMode ? (
                      <span className="select-none">{currency} ••••</span>
                    ) : (
                      <PriceDisplay
                        price={coin.current_price}
                        currency={currency}
                      />
                    )}
                  </span>
                </div>

                <div
                  className={`flex items-center gap-1.5 px-2 py-1 rounded-md font-semibold text-xs transition-all duration-300 ${
                    coin.price_change_percentage_24h > 0
                      ? "bg-green-500/15 text-green-400 border border-green-500/25 group-hover:bg-green-500/20"
                      : coin.price_change_percentage_24h < 0
                        ? "bg-red-500/15 text-red-400 border border-red-500/25 group-hover:bg-red-500/20"
                        : "bg-zinc-500/15 text-zinc-400 border border-zinc-500/25 group-hover:bg-zinc-500/20"
                  }`}
                >
                  <span className="text-sm">
                    {coin.price_change_percentage_24h > 0
                      ? "↗"
                      : coin.price_change_percentage_24h < 0
                        ? "↘"
                        : "→"}
                  </span>
                  <span>
                    {coin.price_change_percentage_24h > 0 ? "+" : ""}
                    {coin.price_change_percentage_24h?.toFixed(2)}%
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
});

export const UserCoins = memo(function UserCoins({
  coins,
  market,
  currency,
  privacyMode,
}: {
  coins: Token[];
  market: CoinGeckoMarketData[];
  currency: string;
  privacyMode: boolean;
}) {
  // Calculate total portfolio value for percentage breakdown
  const totalValue = useMemo(() => {
    let value = 0;
    if (market && Array.isArray(market) && coins.length > 0) {
      for (const coin of coins) {
        const marketCoin = market.find((c) => c.id === coin.coingecko_id);
        if (marketCoin) {
          value += coin.total * marketCoin.current_price;
        }
      }
    }
    return value;
  }, [market, coins]);

  return (
    <div className="relative overflow-hidden rounded-xl border border-zinc-800/50 bg-gradient-to-br from-zinc-900/80 via-zinc-900/60 to-zinc-800/40 p-6 shadow-2xl backdrop-blur-sm transition-all duration-300 hover:shadow-3xl hover:border-zinc-700/50 w-full min-w-0">
      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-cyan-500/5 pointer-events-none" />

      <div className="relative z-10">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-lg bg-gradient-to-br from-blue-400/20 to-blue-600/20 border border-blue-500/20">
            <Coins className="h-6 w-6 text-blue-400" />
          </div>
          <h3 className="text-xl font-bold bg-gradient-to-r from-white to-zinc-300 bg-clip-text text-transparent">
            Your Coins
          </h3>
        </div>

        {/* Desktop Table Header */}
        <div className="hidden lg:grid grid-cols-5 gap-4 px-4 pb-3 mb-4 text-xs text-zinc-400 font-semibold uppercase tracking-wider border-b border-zinc-700/50">
          <span>Asset</span>
          <span>Symbol</span>
          <span>Holdings</span>
          <span>Value</span>
          <span>Portfolio %</span>
        </div>

        <div className="space-y-3">
          {coins.map((coin: Token, i: number) => {
            const marketCoin = market?.find((c) => c.id === coin.coingecko_id);
            const value = coins[i].total * (marketCoin?.current_price || 0);
            const percent = totalValue > 0 ? (value / totalValue) * 100 : 0;

            return (
              <div
                key={coin.name + coin.symbol + coin.id}
                className="group relative overflow-hidden rounded-lg bg-gradient-to-r from-zinc-800/60 to-zinc-900/40 border border-zinc-700/50 p-4 shadow-lg transition-all duration-300 hover:scale-[1.02] hover:shadow-xl hover:border-zinc-600/50 hover:from-zinc-700/60 hover:to-zinc-800/40"
              >
                {/* Mobile/Tablet Layout */}
                <div className="flex lg:hidden items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="flex flex-col">
                      <span className="font-bold text-zinc-100 group-hover:text-white transition-colors">
                        {coin.name}
                      </span>
                      <span className="text-zinc-400 uppercase text-sm bg-zinc-800/50 px-2 py-0.5 rounded w-fit">
                        {coin.symbol}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-zinc-100 font-semibold">
                        {privacyMode ? (
                          <span className="select-none">••••</span>
                        ) : (
                          <TokenAmountDisplay amount={coin.total} />
                        )}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {marketCoin ? (
                        <>
                          <span className="text-zinc-300 text-sm font-mono">
                            {privacyMode ? (
                              <span className="select-none">
                                {currency} ••••
                              </span>
                            ) : (
                              <PriceDisplay price={value} currency={currency} />
                            )}
                          </span>
                          <span className="text-xs text-zinc-400 bg-zinc-800/50 px-2 py-0.5 rounded">
                            {totalValue > 0 ? percent.toFixed(1) + "%" : "-"}
                          </span>
                        </>
                      ) : (
                        <span className="text-zinc-500 text-sm">
                          No market data
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Desktop Layout */}
                <div className="hidden lg:grid grid-cols-5 gap-4 items-center">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="font-bold text-zinc-100 group-hover:text-white transition-colors truncate">
                      {coin.name}
                    </span>
                  </div>

                  <div>
                    <span className="text-zinc-300 uppercase text-sm bg-zinc-800/50 px-2 py-1 rounded font-mono">
                      {coin.symbol}
                    </span>
                  </div>

                  <div>
                    <span className="font-mono text-zinc-100 font-semibold">
                      {privacyMode ? (
                        <span className="select-none">••••</span>
                      ) : (
                        <TokenAmountDisplay amount={coin.total} />
                      )}
                    </span>
                  </div>

                  <div>
                    {marketCoin ? (
                      <span className="text-zinc-300 font-mono">
                        {privacyMode ? (
                          <span className="select-none">{currency} ••••</span>
                        ) : (
                          <PriceDisplay price={value} currency={currency} />
                        )}
                      </span>
                    ) : (
                      <span className="text-zinc-500">-</span>
                    )}
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-zinc-300 font-mono text-sm">
                        {marketCoin && totalValue > 0
                          ? percent.toFixed(2) + "%"
                          : "-"}
                      </span>
                      {marketCoin && totalValue > 0 && (
                        <div className="flex-1 max-w-16 h-2 bg-zinc-700/50 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 transition-all duration-500"
                            style={{ width: `${Math.min(percent, 100)}%` }}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Progress bar for mobile */}
                <div className="lg:hidden mt-3">
                  {marketCoin && totalValue > 0 && (
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-zinc-700/50 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 transition-all duration-500"
                          style={{ width: `${Math.min(percent, 100)}%` }}
                        />
                      </div>
                      <span className="text-xs text-zinc-400 min-w-[3rem] text-right">
                        {percent.toFixed(1)}%
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
});

const TokenTrendsChart = memo(function TokenTrendsChart({
  coins,
  market,
  CURRENCY,
  selectedRange,
  setSelectedRange,
  historyQueries,
  tokenHistory,
  historyError,
}: {
  coins: Token[];
  market: CoinGeckoMarketData[];
  CURRENCY: string;
  selectedRange: "1mo" | "1yr";
  setSelectedRange: (range: "1mo" | "1yr") => void;
  historyQueries: UseQueryResult<CoinGeckoPriceDataPoint[], Error>[];
  tokenHistory: Record<string, CoinGeckoPriceDataPoint[]>;
  historyError: Error | undefined;
}) {
  function getChartData(): {
    series: { name: string; data: (number | null)[] }[];
    categories: string[];
    loadedIds: string[];
    erroredIds: string[];
  } {
    const loadedIds = coins
      .map((coin) => coin.coingecko_id)
      .filter(
        (id, idx) =>
          Array.isArray(historyQueries[idx]?.data) &&
          !historyQueries[idx]?.isError
      );
    const erroredIds = coins
      .map((coin) => coin.coingecko_id)
      .filter((id, idx) => historyQueries[idx]?.isError);
    const series = loadedIds.map((id) => {
      const coin = market.find((c) => c.id === id);
      const prices = tokenHistory[id] || [];
      let filtered = prices;
      if (selectedRange === "1mo" && prices.length > 0) {
        const seenDays = new Set();
        filtered = prices.filter((p) => {
          const day = dayjs(p[0]).format("YYYY-MM-DD");
          if (seenDays.has(day)) return false;
          seenDays.add(day);
          return true;
        });
      } else if (selectedRange === "1yr" && prices.length > 0) {
        const seenMonths = new Set();
        filtered = prices.filter((p) => {
          const month = dayjs(p[0]).format("YYYY-MM");
          if (seenMonths.has(month)) return false;
          seenMonths.add(month);
          return true;
        });
      }
      const first = filtered[0]?.[1] || 1;
      const normalized = filtered.map((p) =>
        first ? (p[1] / first) * 100 : null
      );
      return {
        name: coin ? coin.name : id,
        data: normalized,
      };
    });
    const firstId = loadedIds[0];
    let categories = tokenHistory[firstId] || [];
    if (selectedRange === "1mo" && categories.length > 0) {
      const seenDays = new Set();
      categories = categories.filter((p) => {
        const day = dayjs(p[0]).format("YYYY-MM-DD");
        if (seenDays.has(day)) return false;
        seenDays.add(day);
        return true;
      });
    } else if (selectedRange === "1yr" && categories.length > 0) {
      const seenMonths = new Set();
      categories = categories.filter((p) => {
        const month = dayjs(p[0]).format("YYYY-MM");
        if (seenMonths.has(month)) return false;
        seenMonths.add(month);
        return true;
      });
    }
    const catLabels = categories.map((p) =>
      dayjs(p[0]).format(selectedRange === "1mo" ? "MMM D" : "MMM YYYY")
    );
    return { series, categories: catLabels, loadedIds, erroredIds };
  }

  const chartData = getChartData();
  const isLoading = historyQueries.some((q) => q.isLoading);
  const hasErrors = chartData.erroredIds.length > 0;

  return (
    <div className="relative overflow-hidden rounded-xl border border-zinc-800/50 bg-gradient-to-br from-zinc-900/80 via-zinc-900/60 to-zinc-800/40 p-6 shadow-2xl backdrop-blur-sm transition-all duration-300 hover:shadow-3xl hover:border-zinc-700/50 w-full min-w-0">
      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-transparent to-pink-500/5 pointer-events-none" />

      <div className="relative z-10">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-4">
          <h3 className="text-xl font-bold bg-gradient-to-r from-white to-zinc-300 bg-clip-text text-transparent">
            Token Price Trends
          </h3>

          <div className="flex gap-2">
            <button
              className={`px-4 py-2 rounded-lg font-medium transition-all duration-300 text-sm ${
                selectedRange === "1mo"
                  ? "bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40"
                  : "bg-zinc-800/60 text-zinc-300 hover:bg-zinc-700/60 hover:text-zinc-200 border border-zinc-700/50"
              }`}
              onClick={() => setSelectedRange("1mo")}
              disabled={selectedRange === "1mo"}
            >
              1 Month
            </button>
            <button
              className={`px-4 py-2 rounded-lg font-medium transition-all duration-300 text-sm ${
                selectedRange === "1yr"
                  ? "bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40"
                  : "bg-zinc-800/60 text-zinc-300 hover:bg-zinc-700/60 hover:text-zinc-200 border border-zinc-700/50"
              }`}
              onClick={() => setSelectedRange("1yr")}
              disabled={selectedRange === "1yr"}
            >
              1 Year
            </button>
          </div>
        </div>

        {/* Status indicators */}
        {(isLoading || hasErrors) && (
          <div className="mb-6 p-4 rounded-lg bg-zinc-800/40 border border-zinc-700/50">
            <div className="flex flex-wrap gap-2 text-sm">
              {isLoading && (
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
                  <span className="text-zinc-300">Loading data for:</span>
                  <div className="flex flex-wrap gap-1">
                    {coins.map((coin, idx) =>
                      historyQueries[idx]?.isLoading ? (
                        <span
                          key={coin.name}
                          className="px-2 py-1 bg-blue-500/20 text-blue-300 rounded border border-blue-500/30 text-xs animate-pulse"
                        >
                          {coin.name}
                        </span>
                      ) : null
                    )}
                  </div>
                </div>
              )}

              {hasErrors && (
                <div className="flex items-center gap-2 mt-2">
                  <div className="w-2 h-2 bg-red-400 rounded-full" />
                  <span className="text-zinc-300">Failed to load:</span>
                  <div className="flex flex-wrap gap-1">
                    {chartData.erroredIds.map((id) => (
                      <span
                        key={id}
                        className="px-2 py-1 bg-red-500/20 text-red-300 rounded border border-red-500/30 text-xs"
                      >
                        {market.find((c) => c.id === id)?.name || id}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Chart container */}
        <div className="relative min-h-[300px] rounded-lg bg-zinc-900/40 border border-zinc-700/30 overflow-hidden">
          {chartData.series.length === 0 ? (
            <div className="flex items-center justify-center h-[300px]">
              {isLoading ? (
                <div className="flex flex-col items-center gap-3">
                  <div className="w-8 h-8 border-2 border-zinc-600 border-t-blue-400 rounded-full animate-spin" />
                  <span className="text-zinc-400">Loading chart data...</span>
                </div>
              ) : historyError && chartData.series.length === 0 ? (
                <div className="flex flex-col items-center gap-3 text-center max-w-md px-4">
                  <div className="w-12 h-12 rounded-full bg-red-500/20 border border-red-500/30 flex items-center justify-center">
                    <span className="text-red-400 text-xl">⚠</span>
                  </div>
                  <div>
                    <p className="text-red-400 font-medium mb-1">
                      Chart Data Unavailable
                    </p>
                    <p className="text-zinc-400 text-sm">
                      {historyError.message ||
                        "Unable to load price history. Please try again later."}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-zinc-700/50 border border-zinc-600/50 flex items-center justify-center">
                    <span className="text-zinc-400 text-xl">📊</span>
                  </div>
                  <span className="text-zinc-400">No chart data available</span>
                </div>
              )}
            </div>
          ) : (
            <div className="w-full p-4">
              <Chart
                options={{
                  chart: {
                    id: "token-trends",
                    background: "transparent",
                    toolbar: { show: false },
                    fontFamily: "inherit",
                    foreColor: "#cbd5e1",
                  },
                  theme: {
                    mode: "dark",
                    palette: "palette4",
                  },
                  xaxis: {
                    categories: chartData.categories,
                    labels: {
                      style: { colors: "#cbd5e1", fontSize: "12px" },
                      rotate: -45,
                    },
                    axisBorder: { color: "#4a5568" },
                    axisTicks: { color: "#4a5568" },
                  },
                  yaxis: {
                    labels: {
                      style: { colors: "#cbd5e1", fontSize: "12px" },
                      formatter: (val: number) => val.toFixed(1) + "%",
                    },
                    title: {
                      text: "Price Change (%)",
                      style: { color: "#cbd5e1", fontSize: "12px" },
                    },
                  },
                  stroke: {
                    curve: "smooth",
                    width: 3,
                  },
                  markers: {
                    size: 0,
                    hover: {
                      size: 6,
                    },
                  },
                  legend: {
                    labels: { colors: "#cbd5e1" },
                    position: "top",
                    horizontalAlign: "left",
                    fontSize: "12px",
                  },
                  tooltip: {
                    theme: "dark",
                    style: {
                      fontSize: "12px",
                    },
                    y: {
                      formatter: (val: number) => val.toFixed(2) + "%",
                    },
                  },
                  grid: {
                    borderColor: "#374151",
                    strokeDashArray: 3,
                  },
                  dataLabels: {
                    enabled: false,
                  },
                }}
                series={chartData.series}
                type="line"
                height={300}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

export function CryptoDashboard() {
  const [lastFetched, setLastFetched] = useState<Date | null>(null);
  const [selectedRange, setSelectedRange] = useState<"1mo" | "1yr">("1mo");
  const { isPrivate } = usePrivacy();
  const { baseCurrency } = useUserQuery();
  const { tokenData, marketData, marketLoading, marketError } =
    useTokensContext();

  // Memoize expensive calculations
  const coins = useMemo(() => tokenData?.tokens || [], [tokenData?.tokens]);
  const isTokensLoading = useMemo(
    () => tokenData?.loading,
    [tokenData?.loading]
  );
  const CURRENCY = useMemo(
    () => baseCurrency?.code || "USD",
    [baseCurrency?.code]
  );
  const market = useMemo(() => marketData || [], [marketData]);

  // Memoize portfolio calculations
  const { portfolioValue, portfolioChange } = useMemo(() => {
    let value = 0;
    let change = 0;
    if (market && Array.isArray(market) && coins.length > 0) {
      for (const coin of coins) {
        const marketCoin = market.find((c) => c.id === coin.coingecko_id);
        if (marketCoin) {
          value += coin.total * marketCoin.current_price;
          change +=
            ((marketCoin.price_change_percentage_24h || 0) *
              coin.total *
              marketCoin.current_price) /
            100;
        }
      }
    }
    return {
      portfolioValue: value,
      portfolioChange: value ? (change / value) * 100 : 0,
    };
  }, [market, coins]);

  // Memoize range value
  const range = useMemo(
    () => (selectedRange === "1mo" ? 30 : 365),
    [selectedRange]
  );

  // Callback for range selection
  const handleRangeChange = useCallback((newRange: "1mo" | "1yr") => {
    setSelectedRange(newRange);
  }, []);

  // Optimized API calls with better batching and error handling
  const historyQueries = useQueries({
    queries: coins.map((coin, idx) => ({
      queryKey: ["coingecko-market-chart", coin.coingecko_id, CURRENCY, range],
      queryFn: async () => {
        // Stagger requests more efficiently with shorter delays
        if (idx > 0) {
          await new Promise((resolve) =>
            setTimeout(resolve, Math.min(idx * 2000, 10000))
          );
        }

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout

        try {
          const res = await fetch(
            `https://api.coingecko.com/api/v3/coins/${coin.coingecko_id}/market_chart?vs_currency=${CURRENCY.toLowerCase()}&days=${range}&interval=${range > 30 ? "daily" : "hourly"}`,
            {
              signal: controller.signal,
              headers: {
                Accept: "application/json",
              },
            }
          );

          clearTimeout(timeoutId);

          if (!res.ok) {
            let msg = "Failed to fetch price history";
            try {
              const err = (await res.json()) as CoinGeckoErrorResponse;
              if (err?.error_code === 429 || err?.status?.error_code === 429) {
                msg = "Rate limit exceeded. Data will refresh automatically.";
              } else if (res.status === 404) {
                msg = `Token ${coin.name} not found`;
              } else if (res.status >= 500) {
                msg = "CoinGecko service temporarily unavailable";
              }
            } catch {}
            throw new Error(msg);
          }

          const data = (await res.json()) as CoinGeckoMarketChartData;
          return data.prices;
        } catch (error) {
          clearTimeout(timeoutId);
          if (error instanceof Error && error.name === "AbortError") {
            throw new Error("Request timeout - please try again");
          }
          throw error;
        }
      },
      staleTime: 1000 * 60 * 30, // 30 minutes
      gcTime: 1000 * 60 * 60 * 24, // 24 hours (renamed from cacheTime)
      retry: (failureCount: number, error: Error) => {
        if (
          error?.message?.includes("rate limit") ||
          error?.message?.includes("timeout") ||
          failureCount >= 3
        ) {
          return false;
        }
        return true;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      refetchOnWindowFocus: false,
      refetchOnReconnect: "always",
      enabled: !!coin.coingecko_id, // Only fetch if ID exists
    })),
  });

  // Memoize loading and error states
  const loadingStates = useMemo(
    () => ({
      isTokensLoading,
      marketLoading,
      loadingHistory: historyQueries.some((q) => q.isLoading),
    }),
    [isTokensLoading, marketLoading, historyQueries]
  );

  const errorStates = useMemo(
    () => ({
      marketError,
      historyError: historyQueries.find((q) => q.isError)?.error,
    }),
    [marketError, historyQueries]
  );

  // Memoize token history calculation
  const tokenHistory = useMemo(() => {
    const history: Record<string, CoinGeckoPriceDataPoint[]> = {};
    coins.forEach((coin, idx) => {
      history[coin.coingecko_id] = historyQueries[idx]?.data || [];
    });
    return history;
  }, [coins, historyQueries]);

  if (loadingStates.isTokensLoading) {
    return (
      <div className="flex items-center justify-center w-full h-48">
        <span className="text-slate-400">Loading tokens data...</span>
      </div>
    );
  }

  if (
    (!tokenData?.tokens || tokenData.tokens.length === 0) &&
    !isTokensLoading
  ) {
    return (
      <div className="flex flex-col items-center justify-center w-full h-48 gap-3">
        <span className="text-slate-400 text-lg font-semibold">
          🚧 Crypto Portfolio Coming Soon
        </span>
        <span className="text-slate-500 text-sm">
          This feature is under development. Stay tuned for updates!
        </span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 w-full">
      <div className="flex items-center gap-1 text-xs text-slate-400 select-none z-10">
        {lastFetched ? (
          <span>
            Data last fetched:{" "}
            {lastFetched.toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            })}
          </span>
        ) : null}
      </div>
      <div className="flex flex-col md:flex-row gap-4 w-full relative min-w-0">
        <CryptoSummary
          portfolio={coins}
          totalValue={portfolioValue}
          change24h={portfolioChange}
          currency={CURRENCY}
          privacyMode={isPrivate}
        />
        {loadingStates.marketLoading ? (
          <div className="flex flex-1 items-center justify-center min-h-[180px]">
            <span className="text-slate-400">Loading market data...</span>
          </div>
        ) : errorStates.marketError ? (
          <div className="flex flex-1 items-center justify-center min-h-[180px]">
            <span className="text-red-400">
              {errorStates.marketError?.message || "Error loading data"}
            </span>
          </div>
        ) : (
          <MarketOverview
            coins={market}
            currency={CURRENCY}
            privacyMode={isPrivate}
          />
        )}
      </div>
      <TokenTrendsChart
        coins={coins}
        market={market}
        CURRENCY={CURRENCY}
        selectedRange={selectedRange}
        setSelectedRange={handleRangeChange}
        historyQueries={historyQueries}
        tokenHistory={tokenHistory}
        historyError={errorStates.historyError || undefined}
      />
      <UserCoins
        coins={coins}
        market={market}
        currency={CURRENCY}
        privacyMode={isPrivate}
      />
    </div>
  );
}
