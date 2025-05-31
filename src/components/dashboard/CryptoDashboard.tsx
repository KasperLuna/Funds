"use client";
import { useMemo, useState } from "react";
import { TrendingUp, Wallet, Coins } from "lucide-react";
import Image from "next/image";
import { useQueries, UseQueryResult } from "@tanstack/react-query";
import dayjs from "dayjs";
import { usePrivacyMode } from "@/lib/hooks/usePrivacyMode";
import { useTokensContext } from "@/lib/hooks/useTokensContext";
import { Token } from "@/lib/types";
import { useBanksCategsContext } from "@/lib/hooks/useBanksCategsContext";
import dynamic from "next/dynamic";
import {
  CoinGeckoMarketData,
  CoinGeckoMarketChartData,
  CoinGeckoPriceDataPoint,
} from "@/lib/types/coingecko";

// Error response type for CoinGecko API
interface CoinGeckoErrorResponse {
  error_code?: number;
  error?: string;
  status?: { error_code?: number; error_message?: string };
}

const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });

export function CryptoSummary({
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
    <div className="flex flex-col gap-2 rounded-lg border border-zinc-800 p-4 sm:p-6 bg-zinc-900/50 w-full min-w-0">
      <div className="flex items-center gap-3">
        <Wallet className="h-7 w-7 text-yellow-400" />
        <h3 className="text-xl font-bold">Crypto Portfolio</h3>
      </div>
      <div className="flex flex-row gap-6 items-center mt-2 flex-wrap">
        <span className="text-3xl font-mono font-bold text-slate-100 min-w-[120px]">
          {privacyMode ? (
            <span className="select-none">{currency} ••••</span>
          ) : (
            <>
              {currency}{" "}
              {totalValue?.toLocaleString(undefined, {
                maximumFractionDigits: 2,
              })}
            </>
          )}
        </span>
        <span
          className={
            "text-sm font-semibold " +
            (change24h > 0
              ? "text-green-400"
              : change24h < 0
                ? "text-red-400"
                : "text-slate-400")
          }
        >
          {change24h > 0 ? "+" : ""}
          {change24h?.toFixed(2)}% 24h
        </span>
      </div>
      <div className="flex flex-row gap-2 mt-2 flex-wrap">
        {portfolio?.map((coin: Token) => (
          <span
            key={coin.name + coin.symbol + coin.id}
            className="bg-slate-800 px-3 py-1 rounded-full text-xs font-mono"
          >
            {coin.name}:{" "}
            {privacyMode ? (
              <span className="select-none">••••</span>
            ) : (
              coin.total
            )}
          </span>
        ))}
      </div>
    </div>
  );
}

export function MarketOverview({
  coins,
  currency,
  privacyMode,
}: {
  coins: CoinGeckoMarketData[];
  currency: string;
  privacyMode: boolean;
}) {
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-zinc-800 p-4 sm:p-6 bg-zinc-900/50 w-full min-w-0">
      <div className="flex items-center gap-3 mb-1">
        <TrendingUp className="h-7 w-7 text-green-400" />
        <h3 className="text-xl font-bold">Market Overview</h3>
      </div>
      <div className="flex flex-wrap gap-3">
        {coins.map((coin) => (
          <div
            key={coin.name}
            className="flex flex-row items-center bg-slate-800 rounded-lg px-3 py-2 min-w-0 gap-3 shadow-sm border border-slate-700"
          >
            <Image
              src={coin.image}
              alt={coin.name}
              width={32}
              height={32}
              className="w-8 h-8 mr-1 rounded-full bg-slate-900"
            />
            <div className="flex flex-col flex-1 min-w-0">
              <div className="flex items-center gap-2 min-w-0">
                <span className="font-bold text-slate-100 truncate text-sm">
                  {coin.name}
                </span>
                <span className="text-xs text-slate-400 uppercase">
                  {coin.symbol}
                </span>
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="font-mono text-base text-slate-100">
                  {privacyMode ? (
                    <span className="select-none">{currency} ••••</span>
                  ) : (
                    <>
                      {currency} {coin.current_price.toLocaleString()}
                    </>
                  )}
                </span>
                <span
                  className={
                    "text-xs font-semibold " +
                    (coin.price_change_percentage_24h > 0
                      ? "text-green-400"
                      : coin.price_change_percentage_24h < 0
                        ? "text-red-400"
                        : "text-slate-400")
                  }
                >
                  {coin.price_change_percentage_24h > 0 ? "+" : ""}
                  {coin.price_change_percentage_24h?.toFixed(2)}%
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function UserCoins({
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
    <div className="flex flex-col gap-2 rounded-lg border border-zinc-800 p-4 sm:p-6 bg-slate-900/50 w-full min-w-0">
      <div className="flex items-center gap-3 mb-1">
        <Coins className="h-7 w-7 text-blue-400" />
        <h3 className="text-xl font-bold">Your Coins</h3>
      </div>
      {/* Table header for desktop */}
      <div className="hidden md:grid grid-cols-5 gap-2 px-2 pb-1 text-xs text-slate-400 font-semibold">
        <span>Name</span>
        <span>Symbol</span>
        <span>Amount</span>
        <span>Value</span>
        <span>% of Holdings</span>
      </div>
      <div className="flex flex-col gap-2 mt-2">
        {coins.map((coin: Token, i: number) => {
          const marketCoin = market?.find((c) => c.id === coin.coingecko_id);
          const value = coins[i].total * (marketCoin?.current_price || 0);
          const percent = totalValue > 0 ? (value / totalValue) * 100 : 0;
          return (
            <div
              key={coin.name + coin.symbol + coin.id}
              className="grid grid-cols-2 md:grid-cols-5 gap-2 items-center bg-slate-800 rounded-md px-3 py-2 min-w-0"
            >
              <span className="font-mono text-slate-100 break-words">
                {coin.name}
              </span>
              <span className="text-slate-300 uppercase">{coin.symbol}</span>
              <span className="font-mono text-slate-100">
                {privacyMode ? (
                  <span className="select-none">••••</span>
                ) : (
                  coin.total
                )}
              </span>
              <span className="text-slate-400 text-xs">
                {marketCoin ? (
                  privacyMode ? (
                    <span className="select-none">{currency} ••••</span>
                  ) : (
                    <>
                      {currency}{" "}
                      {value.toLocaleString(undefined, {
                        maximumFractionDigits: 2,
                      })}
                    </>
                  )
                ) : (
                  <span className="text-slate-500">-</span>
                )}
              </span>
              <span className="text-xs text-slate-300 font-mono">
                {marketCoin && totalValue > 0 ? percent.toFixed(2) + "%" : "-"}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TokenTrendsChart({
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

  return (
    <div className="flex flex-col gap-2 w-full bg-slate-900/50 border border-zinc-800 rounded-lg p-3 sm:p-4 min-w-0">
      <div className="flex flex-row items-center justify-between mb-2 flex-wrap gap-2">
        <h3 className="text-lg font-bold text-slate-100">Token Price Trends</h3>
        <div className="flex gap-2">
          <button
            className={`px-3 py-1 rounded ${selectedRange === "1mo" ? "bg-orange-500 text-white" : "bg-slate-800 text-slate-300"}`}
            onClick={() => setSelectedRange("1mo")}
            disabled={selectedRange === "1mo"}
          >
            1mo
          </button>
          <button
            className={`px-3 py-1 rounded ${selectedRange === "1yr" ? "bg-orange-500 text-white" : "bg-slate-800 text-slate-300"}`}
            onClick={() => setSelectedRange("1yr")}
            disabled={selectedRange === "1yr"}
          >
            1yr
          </button>
        </div>
      </div>
      {(historyQueries.some((q) => q.isLoading) ||
        getChartData().erroredIds.length > 0) && (
        <div className="flex items-center gap-2 text-xs text-slate-400 mb-2 flex-wrap">
          {historyQueries.some((q) => q.isLoading) && (
            <span>Loading data for:</span>
          )}
          {coins.map((coin, idx) =>
            historyQueries[idx]?.isLoading ? (
              <span
                key={coin.name}
                className="px-2 py-1 bg-slate-800 rounded-full animate-pulse"
              >
                {coin.name}
              </span>
            ) : null
          )}
          {getChartData().erroredIds.length > 0 && <span>Errored:</span>}
          {getChartData().erroredIds.map((id) => (
            <span
              key={id}
              className="px-2 py-1 bg-red-900/70 text-red-300 rounded-full"
            >
              {market.find((c) => c.id === id)?.name || id}
            </span>
          ))}
        </div>
      )}
      <div className="flex">
        {getChartData().series.length === 0 ? (
          <div className="flex items-center justify-center w-full text-slate-400">
            Loading chart...
          </div>
        ) : historyError && getChartData().series.length === 0 ? (
          <div className="flex items-center justify-center w-full text-red-400">
            {historyError.message ||
              "Error loading chart data. If you see a rate limit message, please wait a few minutes before retrying."}
          </div>
        ) : (
          <div className="w-full">
            <Chart
              options={{
                chart: {
                  id: "token-trends",
                  background: "transparent",
                  toolbar: { show: false },
                },
                xaxis: {
                  categories: getChartData().categories,
                  labels: { style: { colors: "#cbd5e1" } },
                },
                yaxis: {
                  labels: {
                    style: { colors: "#cbd5e1" },
                    formatter: (val: number) => val.toFixed(1),
                  },
                },
                stroke: { curve: "smooth" },
                legend: { labels: { colors: "#cbd5e1" } },
                tooltip: { theme: "dark" },
              }}
              series={getChartData().series}
              height={300}
            />
          </div>
        )}
      </div>
    </div>
  );
}

export function CryptoDashboard() {
  const [lastFetched, setLastFetched] = useState<Date | null>(null);
  const [selectedRange, setSelectedRange] = useState<"1mo" | "1yr">("1mo");
  const { isPrivacyModeEnabled } = usePrivacyMode();
  const { baseCurrency } = useBanksCategsContext();
  const { tokenData, marketData, marketLoading, marketError } =
    useTokensContext();
  const coins = useMemo(() => tokenData?.tokens || [], [tokenData?.tokens]);
  const isTokensLoading = tokenData?.loading;
  const CURRENCY = baseCurrency?.code || "USD";

  const market = marketData || [];

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

  const range = selectedRange === "1mo" ? 30 : 365;
  function delay(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  const historyQueries = useQueries({
    queries: coins.map((coin, idx) => ({
      queryKey: ["coingecko-market-chart", coin.coingecko_id, CURRENCY, range],
      queryFn: async () => {
        if (idx > 0) await delay(idx * 6000);
        const res = await fetch(
          `https://api.coingecko.com/api/v3/coins/${coin.coingecko_id}/market_chart?vs_currency=${CURRENCY.toLowerCase()}&days=${range}`
        );
        if (!res.ok) {
          let msg = "Failed to fetch price history";
          try {
            const err = (await res.json()) as CoinGeckoErrorResponse;
            if (err?.error_code === 429 || err?.status?.error_code === 429) {
              msg =
                "CoinGecko API rate limit exceeded. Please try again in a few minutes.";
            }
          } catch {}
          throw new Error(msg);
        }
        const data = (await res.json()) as CoinGeckoMarketChartData;
        return data.prices;
      },
      staleTime: 1000 * 60 * 60 * 24,
      cacheTime: 1000 * 60 * 60 * 24 * 7,
      retry: (failureCount: number, error: Error) => {
        if (error?.message?.includes("rate limit")) return false;
        return failureCount < 2;
      },
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
    })),
  });

  const loadingHistory = historyQueries.some((q) => q.isLoading);
  const historyError = historyQueries.find((q) => q.isError)?.error;

  const tokenHistory: Record<string, CoinGeckoPriceDataPoint[]> = {};
  coins.forEach((coin, idx) => {
    tokenHistory[coin.coingecko_id] = historyQueries[idx]?.data || [];
  });

  if (isTokensLoading) {
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
        <span className="text-slate-400">
          No tokens found in your portfolio.
        </span>
        <span className="text-slate-500 text-sm">
          Visit the tokens page to add crypto tokens to your portfolio.
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
          privacyMode={isPrivacyModeEnabled}
        />
        {marketLoading ? (
          <div className="flex flex-1 items-center justify-center min-h-[180px]">
            <span className="text-slate-400">Loading market data...</span>
          </div>
        ) : marketError ? (
          <div className="flex flex-1 items-center justify-center min-h-[180px]">
            <span className="text-red-400">
              {marketError?.message || "Error loading data"}
            </span>
          </div>
        ) : (
          <MarketOverview
            coins={market}
            currency={CURRENCY}
            privacyMode={isPrivacyModeEnabled}
          />
        )}
      </div>
      <TokenTrendsChart
        coins={coins}
        market={market}
        CURRENCY={CURRENCY}
        selectedRange={selectedRange}
        setSelectedRange={setSelectedRange}
        historyQueries={historyQueries}
        tokenHistory={tokenHistory}
        historyError={historyError}
      />
      <UserCoins
        coins={coins}
        market={market}
        currency={CURRENCY}
        privacyMode={isPrivacyModeEnabled}
      />
    </div>
  );
}
