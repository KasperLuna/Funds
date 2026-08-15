"use client";
import { memo, useMemo, useCallback, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { RotateCw, PieChart, Wallet, Coins } from "lucide-react";

import { useTokensContext } from "@/lib/hooks/useTokensContext";
import { usePrivacy } from "@/hooks/usePrivacy";
import { useUserQuery } from "@/lib/hooks/useUserQuery";
import { useQueryParams } from "@/lib/hooks/useQueryParams";
import { useBanksQuery } from "@/lib/hooks/useBanksQuery";
import { parseAmount, trimToTwoDecimals, cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { PrivacyPeek } from "@/components/PrivacyPeek";
import { Bank, Token } from "@/lib/types";
import { CoinGeckoMarketData } from "@/lib/types/coingecko";

// Constants
const COLORS = [
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
] as const;

// Types
type TabKey = (typeof TABS)[number]["key"];
type AssetItem = { name: string; value: number; type: "bank" | "crypto" };

// Custom hook for asset calculations
function useAssetCalculations(
  banks: Bank[],
  coins: Token[],
  market: CoinGeckoMarketData[],
) {
  return useMemo(() => {
    const bankTotal = banks.reduce((acc, bank) => acc + bank.balance, 0);
    const cryptoTotal = coins.reduce((acc, coin) => {
      const marketCoin = market.find((c) => c.id === coin.coingecko_id);
      return acc + coin.total * (marketCoin?.current_price || 0);
    }, 0);
    const hasCrypto = coins.length > 0 && cryptoTotal > 0;

    return {
      bankTotal,
      cryptoTotal,
      overallTotal: bankTotal + (hasCrypto ? cryptoTotal : 0),
      hasCrypto,
    };
  }, [banks, coins, market]);
}

// Custom hook for tab data preparation
function useTabData(
  tab: TabKey,
  banks: Bank[],
  coins: Token[],
  market: CoinGeckoMarketData[],
  hasCrypto: boolean,
) {
  return useMemo(() => {
    let items: AssetItem[] = [];

    switch (tab) {
      case "Overall": {
        const bankItems = banks.map((bank) => ({
          name: bank.name,
          value: bank.balance,
          type: "bank" as const,
        }));
        const cryptoItems = hasCrypto
          ? coins.map((coin) => {
              const marketCoin = market.find((c) => c.id === coin.coingecko_id);
              return {
                name: `${coin.name} (${coin.symbol})`,
                value: coin.total * (marketCoin?.current_price || 0),
                type: "crypto" as const,
              };
            })
          : [];
        items = [...bankItems, ...cryptoItems].sort(
          (a, b) => b.value - a.value,
        );
        break;
      }

      case "Banks":
        items = banks
          .map((bank) => ({
            name: bank.name,
            value: bank.balance,
            type: "bank" as const,
          }))
          .sort((a, b) => b.value - a.value);
        break;

      case "Crypto":
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
        break;
    }

    return items;
  }, [tab, banks, coins, market, hasCrypto]);
}

// Component for Tab Navigation
const TabNavigation = memo(function TabNavigation({
  currentTab,
  onTabChange,
  hasCrypto,
  onRefresh,
}: {
  currentTab: TabKey;
  onTabChange: (tab: TabKey) => void;
  hasCrypto: boolean;
  onRefresh: () => void;
}) {
  const availableTabs = TABS.filter((tab) => hasCrypto || tab.key === "Banks");

  return (
    <div className="flex flex-row flex-wrap justify-between items-start gap-2 mb-3">
      <div className="flex flex-row flex-wrap gap-1">
        {availableTabs.map((tabItem) => {
          const Icon = tabItem.icon;
          return (
            <button
              key={tabItem.key}
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-semibold transition-all duration-300",
                currentTab === tabItem.key
                  ? "bg-gradient-to-r from-emerald-500/20 to-blue-500/20 text-emerald-300 border border-emerald-500/30"
                  : "bg-slate-800/60 text-slate-300 hover:bg-slate-700/60 hover:text-slate-200 border border-slate-700/50",
              )}
              onClick={() => onTabChange(tabItem.key)}
            >
              <Icon className="h-4 w-4" />
              {tabItem.label}
            </button>
          );
        })}
      </div>

      <Button
        className="rounded-lg p-1.5 h-fit shrink-0 bg-slate-800/60 hover:bg-slate-700/60 border border-slate-700/50 group transition-all duration-300"
        onClick={onRefresh}
      >
        <RotateCw className="size-4 group-hover:rotate-180 transition-all duration-500 text-emerald-400" />
      </Button>
    </div>
  );
});

// Component for Total Display
const TotalDisplay = memo(function TotalDisplay({
  total,
  tab,
  isPrivate,
  currency,
  currencySymbol,
  bankTotal,
  cryptoTotal,
  overallTotal,
  hasCrypto,
}: {
  total: number;
  tab: TabKey;
  isPrivate: boolean;
  currency: string;
  currencySymbol: string;
  bankTotal: number;
  cryptoTotal: number;
  overallTotal: number;
  hasCrypto: boolean;
}) {
  return (
    <div className="flex flex-col gap-2 mb-3">
      <span className="text-3xl font-mono font-bold bg-gradient-to-r from-white via-slate-100 to-slate-300 bg-clip-text text-transparent">
        <PrivacyPeek
          isPrivate={isPrivate}
          revealedContent={parseAmount(total, currency)}
          maskedContent={`${currencySymbol}••••••`}
        />
      </span>
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-sm text-slate-400 font-medium">{tab} Total</span>
        {tab === "Overall" && overallTotal > 0 && hasCrypto && (
          <div className="flex items-center gap-3 text-xs text-slate-400">
            <span className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-blue-400" />
              Banks: {trimToTwoDecimals((bankTotal / overallTotal) * 100)}%
            </span>
            <span className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-orange-400" />
              Crypto: {trimToTwoDecimals((cryptoTotal / overallTotal) * 100)}%
            </span>
          </div>
        )}
      </div>
    </div>
  );
});

// Component for Loading State
const LoadingSkeleton = memo(function LoadingSkeleton() {
  return (
    <div className="space-y-1">
      <div className="h-8 w-full bg-slate-800/60 rounded animate-pulse" />
      {Array.from({ length: 4 }, (_, index) => (
        <div
          key={`skeleton-${index + 1}`}
          className="h-9 w-full bg-slate-800/60 rounded animate-pulse"
        />
      ))}
    </div>
  );
});

// Component for Empty State
const EmptyState = memo(function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <div className="w-12 h-12 rounded-full bg-slate-800/60 border border-slate-700/50 flex items-center justify-center mb-3">
        <PieChart className="w-6 h-6 text-slate-400" />
      </div>
      <p className="text-slate-400 text-base font-medium">No banks found</p>
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
  );
});

// Component for Asset Breakdown
const AssetBreakdown = memo(function AssetBreakdown({
  items,
  total,
  currency,
  currencySymbol,
  isPrivate,
  onBankClick,
}: {
  items: AssetItem[];
  total: number;
  currency: string;
  currencySymbol: string;
  isPrivate: boolean;
  onBankClick: (bankName: string) => void;
}) {
  return (
    <div className="space-y-3">
      {/* Progress bar */}
      <div className="relative">
        <div className="flex flex-row rounded-lg overflow-hidden shadow-lg border border-slate-700/50">
          {items.map((item, idx) => {
            const percent = total > 0 ? (item.value / total) * 100 : 0;
            return (
              <ProgressSection
                key={item.name}
                percentage={percent}
                color={COLORS[idx % COLORS.length]}
              />
            );
          })}
        </div>
      </div>

      {/* Compact asset list */}
      <div className="flex flex-col divide-y divide-slate-700/40">
        {items.map((item, idx) => {
          const percent = total > 0 ? (item.value / total) * 100 : 0;
          const isBank = item.type === "bank";
          const accentColor = COLORS[idx % COLORS.length];

          return (
            <AssetRow
              key={item.name}
              item={item}
              percent={percent}
              accentColor={accentColor}
              currency={currency}
              currencySymbol={currencySymbol}
              isPrivate={isPrivate}
              onClick={isBank ? () => onBankClick(item.name) : undefined}
            />
          );
        })}
      </div>
    </div>
  );
});

// Component for Individual Asset Row
const AssetRow = memo(function AssetRow({
  item,
  percent,
  accentColor,
  currency,
  currencySymbol,
  isPrivate,
  onClick,
}: {
  item: AssetItem;
  percent: number;
  accentColor: string;
  currency: string;
  currencySymbol: string;
  isPrivate: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      className={cn(
        "flex items-center gap-3 py-2 px-1 rounded-md transition-colors duration-200 w-full text-left",
        onClick
          ? "cursor-pointer hover:bg-slate-800/50"
          : "hover:bg-slate-800/30",
      )}
      onClick={onClick}
    >
      {/* Color swatch */}
      <div
        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
        style={{ backgroundColor: accentColor }}
      />

      {/* Name + type */}
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <span className="text-sm text-slate-200 font-medium truncate">
          {item.name}
        </span>
        {item.type === "crypto" && (
          <span className="text-[10px] font-semibold text-orange-400/80 bg-orange-400/10 px-1.5 py-0.5 rounded flex-shrink-0">
            Crypto
          </span>
        )}
      </div>

      {/* Percentage */}
      <span className="text-xs text-slate-400 font-mono tabular-nums flex-shrink-0 w-12 text-right">
        {trimToTwoDecimals(percent)}%
      </span>

      {/* Amount */}
      <span className="text-sm font-mono font-semibold text-slate-100 tabular-nums flex-shrink-0 text-right min-w-[5rem]">
        <PrivacyPeek
          isPrivate={isPrivate}
          revealedContent={parseAmount(item.value, currency)}
          maskedContent={`${currencySymbol}••••`}
        />
      </span>
    </button>
  );
});

export const AssetSummary = memo(function AssetSummary() {
  const { queryParams, setQueryParams } = useQueryParams({
    defaultValues: { assetTab: "Overall" },
  });
  const tab = (queryParams.assetTab as TabKey) ?? "Overall";
  const setTab = (key: TabKey) => setQueryParams({ assetTab: key });
  const queryClient = useQueryClient();
  const router = useRouter();
  const { isPrivate } = usePrivacy();
  const bankData = useBanksQuery();
  const { baseCurrency } = useUserQuery();
  const { tokenData, marketData } = useTokensContext();

  // Extract data
  const { banks, coins, market, isLoading, currency, currencySymbol } = useMemo(
    () => ({
      banks: bankData?.banks || [],
      coins: tokenData?.tokens || [],
      market: marketData || [],
      isLoading: bankData?.loading || tokenData?.loading,
      currency: baseCurrency?.code || "USD",
      currencySymbol: baseCurrency?.symbol || "$",
    }),
    [bankData, tokenData, marketData, baseCurrency],
  );

  // Calculate totals
  const { bankTotal, cryptoTotal, overallTotal, hasCrypto } =
    useAssetCalculations(banks, coins, market);

  // Get tab data
  const items = useTabData(tab, banks, coins, market, hasCrypto);

  // Calculate total for current tab
  const total =
    tab === "Overall"
      ? overallTotal
      : tab === "Banks"
        ? bankTotal
        : cryptoTotal;

  // Callbacks
  const handleRefresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["banks"] });
    queryClient.invalidateQueries({ queryKey: ["tokens"] });
  }, [queryClient]);

  // Auto-switch tabs when crypto becomes unavailable
  useEffect(() => {
    if (!hasCrypto && (tab === "Crypto" || tab === "Overall")) {
      setTab("Banks");
    }
  }, [tab, hasCrypto]);

  const currentTab = TABS.find((t) => t.key === tab);

  return (
    <div className="relative overflow-hidden rounded-xl border border-slate-700/50 bg-gradient-to-br from-slate-900/90 via-slate-800/85 to-slate-900/90 backdrop-blur-sm p-3 shadow-lg hover:shadow-xl transition-all duration-300 group w-full">
      {/* Background gradient */}
      <div
        className={`absolute inset-0 bg-gradient-to-br ${currentTab?.gradient || "from-purple-500/5 to-pink-500/5"} pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300`}
      />

      <div className="relative z-10">
        <TabNavigation
          currentTab={tab}
          onTabChange={setTab}
          hasCrypto={hasCrypto}
          onRefresh={handleRefresh}
        />

        <TotalDisplay
          total={total}
          tab={tab}
          isPrivate={isPrivate}
          currency={currency}
          currencySymbol={currencySymbol}
          bankTotal={bankTotal}
          cryptoTotal={cryptoTotal}
          overallTotal={overallTotal}
          hasCrypto={hasCrypto}
        />

        {isLoading ? (
          <LoadingSkeleton />
        ) : items.length === 0 ? (
          <EmptyState />
        ) : (
          <AssetBreakdown
            items={items}
            total={total}
            currency={currency}
            currencySymbol={currencySymbol}
            isPrivate={isPrivate}
            onBankClick={(bankName) =>
              router.push(
                `/dashboard/banks?bank=${encodeURIComponent(bankName)}`,
              )
            }
          />
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
        className={cn(
          { hidden: percentage < 10 },
          "font-mono text-xs font-semibold text-white drop-shadow-lg",
        )}
      >
        {trimToTwoDecimals(percentage)}%
      </small>
    </div>
  );
});
