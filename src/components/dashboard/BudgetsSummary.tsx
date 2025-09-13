"use client";

import { useBanksCategsContext } from "@/lib/hooks/useBanksCategsContext";
import { usePrivacyMode } from "@/lib/hooks/usePrivacyMode";
import { useQueryParams } from "@/lib/hooks/useQueryParams";
import { getTransactionsOfAMonth } from "@/lib/pocketbase/queries";
import { useQuery } from "@tanstack/react-query";
import Decimal from "decimal.js";
import { parseAmount } from "@/lib/utils";
import { MonthPicker } from "../MonthPicker";
import dayjs from "dayjs";
import { useRouter } from "next/navigation";
import { memo, useMemo } from "react";
import {
  PieChart,
  Target,
  TrendingUp,
  AlertCircle,
  CheckCircle,
} from "lucide-react";

export const BudgetsSummary = memo(function BudgetsSummary() {
  const { queryParams, setQueryParams } = useQueryParams();
  const { isPrivacyModeEnabled } = usePrivacyMode();
  const { categoryData, baseCurrency } = useBanksCategsContext();
  const router = useRouter();

  const selectedMonth = queryParams["monthlyFilter"]
    ? new Date(queryParams["monthlyFilter"])
    : new Date();

  const { data, isLoading } = useQuery({
    queryKey: ["transactionsOfMonth", selectedMonth?.toDateString()],
    queryFn: () => getTransactionsOfAMonth(selectedMonth?.toISOString() || ""),
  });

  // Aggregate spent per category (proportional split)
  const categoryTotals = (data || []).reduce(
    (acc, txn) => {
      if (txn.categories.length === 0) return acc;
      const splitAmount = new Decimal(txn.amount).div(txn.categories.length);
      txn.categories.forEach((catId) => {
        if (!acc[catId]) acc[catId] = new Decimal(0);
        acc[catId] = acc[catId].add(splitAmount);
      });
      return acc;
    },
    {} as Record<string, Decimal>
  );

  // Prepare display data
  const sortedCategories = (categoryData?.categories || [])
    .slice()
    .sort((a, b) => {
      if (a.monthly_budget == null && b.monthly_budget == null) return 0;
      if (a.monthly_budget == null) return 1;
      if (b.monthly_budget == null) return -1;
      return b.monthly_budget - a.monthly_budget;
    });

  const rows = sortedCategories.map((cat) => {
    const spent = Math.abs(categoryTotals[cat.id]?.toNumber() || 0); // spent is always positive
    const budget =
      cat.monthly_budget != null ? -Math.abs(cat.monthly_budget) : undefined; // treat budget as negative
    return {
      name: cat.name,
      spent,
      budget,
      remaining: budget != null ? budget + spent : undefined, // remaining is negative budget + spent
      hasBudget: !!budget,
    };
  });

  // Split categories into those with and without budgets
  const budgetedRows = rows.filter((row) => row.hasBudget);
  const unbudgetedRows = rows
    .filter((row) => !row.hasBudget)
    .sort((a, b) => {
      // Sort by the actual value shown in the row (categoryTotals), which can be negative or positive
      const aValue =
        categoryTotals[
          categoryData?.categories.find((c) => c.name === a.name)?.id ?? ""
        ]?.toNumber() || 0;
      const bValue =
        categoryTotals[
          categoryData?.categories.find((c) => c.name === b.name)?.id ?? ""
        ]?.toNumber() || 0;
      return aValue - bValue;
    });

  // Calculate total budget and total spent for budgeted categories
  const totalBudget = budgetedRows.reduce(
    (sum, row) => sum + Math.abs(row.budget ?? 0),
    0
  );
  const totalSpent = budgetedRows.reduce((sum, row) => sum + row.spent, 0);
  let totalBarColor = "text-green-400";
  if (totalSpent > totalBudget) totalBarColor = "text-red-400";
  else if (totalSpent / (totalBudget || 1) >= 0.8)
    totalBarColor = "text-orange-300";

  return (
    <div className="relative border rounded-xl border-slate-700/50 bg-gradient-to-br from-slate-900/90 via-slate-800/85 to-slate-900/90 backdrop-blur-sm p-2 mb-2 flex flex-col gap-2 shadow-lg hover:shadow-xl transition-all duration-300 group">
      <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-blue-500/5 rounded-xl pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      <div className="relative z-10 flex justify-between items-start mb-1">
        <div className="flex items-center gap-2">
          <PieChart className="w-4 h-4 text-emerald-400" />
          <MonthPicker
            date={selectedMonth}
            setDate={(date) => {
              if (!date) return;
              setQueryParams({
                monthlyFilter: dayjs(
                  new Date(date.getFullYear(), date.getMonth() + 1, 0)
                ).format("YYYY-MM-DD"),
              });
            }}
          />
        </div>
        {budgetedRows.length > 0 && (
          <div className="flex flex-col items-end bg-slate-800/30 backdrop-blur-sm rounded-lg px-2 py-1 border border-slate-700/50">
            <div className="flex items-center gap-1 mb-0.5">
              <Target className="w-3 h-3 text-emerald-400" />
              <span className="text-xs text-slate-300 font-medium">
                Total Budget
              </span>
            </div>
            <span className="text-xs text-slate-300 font-mono">
              {isPrivacyModeEnabled
                ? `${baseCurrency?.symbol}••••• / ${baseCurrency?.symbol}•••••`
                : `${parseAmount(totalSpent, baseCurrency?.code)} / ${parseAmount(totalBudget, baseCurrency?.code)}`}
            </span>
            <span
              className={`text-[11px] font-mono ${totalBarColor} flex items-center gap-1`}
            >
              {totalSpent > totalBudget ? (
                <AlertCircle className="w-3 h-3" />
              ) : totalSpent / (totalBudget || 1) >= 0.8 ? (
                <TrendingUp className="w-3 h-3" />
              ) : (
                <CheckCircle className="w-3 h-3" />
              )}
              {`${Math.round((totalSpent / (totalBudget || 1)) * 100)}% used`}
            </span>
          </div>
        )}
      </div>
      {isLoading ? (
        <div className="relative z-10 flex flex-col gap-2">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="relative flex flex-col gap-1 p-2 rounded-lg bg-gradient-to-r from-slate-800/60 to-slate-700/40 border border-slate-600/50 overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-slate-600/20 to-transparent -translate-x-full animate-[shimmer_2s_infinite] pointer-events-none" />
              <div className="flex justify-between items-center mb-1">
                <div className="h-3 w-20 bg-slate-600/60 rounded animate-pulse" />
                <div className="h-3 w-12 bg-slate-600/60 rounded animate-pulse" />
              </div>
              <div className="h-3 bg-slate-600/60 rounded w-full animate-pulse" />
              <div className="flex justify-between mt-1">
                <div className="h-2 w-10 bg-slate-600/60 rounded animate-pulse" />
                <div className="h-2 w-12 bg-slate-600/60 rounded animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <>
          {/* Budgeted categories */}
          <section className="relative z-10 flex flex-col gap-2">
            {budgetedRows.length === 0 && (
              <div className="text-slate-400 text-sm flex items-center gap-2 p-2 rounded-lg bg-slate-800/30 border border-slate-700/50">
                <Target className="w-4 h-4 text-slate-500" />
                No categories with budgets set.
              </div>
            )}
            {budgetedRows.map((row) => {
              // budget is negative, spent is positive
              const percent =
                row.budget! < 0
                  ? Math.min((row.spent / Math.abs(row.budget!)) * 100, 100)
                  : 0;

              const isOverBudget = row.spent > Math.abs(row.budget!);
              const isNearLimit = row.spent / Math.abs(row.budget!) >= 0.8;

              let barColor = "bg-gradient-to-r from-emerald-500 to-emerald-600";
              let glowColor = "shadow-emerald-500/20";

              if (isOverBudget) {
                barColor = "bg-gradient-to-r from-red-500 to-red-600";
                glowColor = "shadow-red-500/30";
              } else if (isNearLimit) {
                barColor = "bg-gradient-to-r from-orange-400 to-orange-500";
                glowColor = "shadow-orange-500/25";
              }

              return (
                <button
                  key={row.name}
                  className="group relative flex flex-col gap-1 p-2 rounded-lg bg-gradient-to-br from-slate-800/70 to-slate-700/50 border border-slate-600/50 hover:shadow-lg hover:shadow-slate-900/50 transition-all duration-300 hover:bg-gradient-to-br hover:from-slate-700/80 hover:to-slate-600/60 hover:border-slate-500/70 text-left w-full hover:scale-[1.01]"
                  onClick={() => {
                    router.push(
                      `/dashboard/banks?month=${selectedMonth.toISOString().split("T")[0]}&categories=${row.name}`
                    );
                  }}
                  title="View in Banks breakdown"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-blue-500/5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                  <div className="relative flex justify-between items-center mb-1 text-xs w-full">
                    <span className="font-medium text-slate-100 text-sm flex items-center gap-2 truncate">
                      <Target className="w-3 h-3 text-emerald-400 flex-shrink-0" />
                      <span className="truncate">{row.name}</span>
                    </span>
                    <span
                      className={
                        (row.remaining! > 0
                          ? "text-red-400"
                          : row.remaining! < Math.abs(row.budget!) * 0.2
                            ? "text-orange-300"
                            : "text-emerald-400") +
                        " font-mono text-xs flex items-center gap-1 flex-shrink-0"
                      }
                    >
                      {row.remaining! > 0 ? (
                        <AlertCircle className="w-3 h-3" />
                      ) : row.remaining! < Math.abs(row.budget!) * 0.2 ? (
                        <TrendingUp className="w-3 h-3" />
                      ) : (
                        <CheckCircle className="w-3 h-3" />
                      )}
                      <span className="truncate">
                        {isPrivacyModeEnabled
                          ? "••••"
                          : `${parseAmount(Math.abs(row.remaining ?? 0), baseCurrency?.code)}`}
                        {row.remaining != null && row.remaining > 0
                          ? " over"
                          : " left"}
                      </span>
                    </span>
                  </div>
                  <div className="relative h-4 bg-slate-700/80 rounded-full overflow-hidden shadow-inner bg-red-500 w-full">
                    <div
                      className={`absolute left-0 top-0 h-full ${barColor} shadow-lg ${glowColor} transition-all duration-500 ease-out`}
                      style={{ width: `${percent}%` }}
                    />
                    <div
                      className="absolute inset-0 flex items-center justify-center text-[10px] text-slate-100 font-medium"
                      style={{
                        textShadow:
                          "0 1px 2px rgba(0,0,0,0.8), 0 0px 4px rgba(0,0,0,0.6)",
                      }}
                    >
                      {`${Math.round((row.spent / Math.abs(row.budget || 1)) * 100)}%`}
                    </div>
                  </div>
                  <div className="relative flex justify-between mt-1 text-xs w-full">
                    <span className="text-slate-400 flex items-center gap-1">
                      <TrendingUp className="w-3 h-3" />
                      Spent
                    </span>
                    <span className="text-slate-300 font-mono truncate max-w-[220px]">
                      {isPrivacyModeEnabled
                        ? `${baseCurrency?.symbol}••••• / ${baseCurrency?.symbol}•••••`
                        : `${parseAmount(row.spent, baseCurrency?.code)} / ${parseAmount(Math.abs(row.budget ?? 0), baseCurrency?.code)}`}
                    </span>
                  </div>
                </button>
              );
            })}
          </section>

          {/* Unbudgeted categories */}
          {unbudgetedRows.length > 0 && (
            <section className="relative z-10 mt-1">
              <h3 className="text-sm font-semibold mb-2 text-slate-200 flex items-center gap-2">
                <PieChart className="w-4 h-4 text-slate-400" />
                Other Categories
              </h3>
              <div className="flex flex-col gap-1">
                {unbudgetedRows.map((row) => {
                  const amount =
                    categoryTotals[
                      categoryData?.categories.find((c) => c.name === row.name)
                        ?.id ?? ""
                    ]?.toNumber() || 0;

                  const isNegative = amount < 0;
                  const isPositive = amount > 0;

                  return (
                    <button
                      key={row.name}
                      className="group relative flex justify-between items-center p-2 rounded-lg bg-gradient-to-r from-slate-800/50 to-slate-700/30 border border-slate-600/40 hover:shadow-lg hover:shadow-slate-900/30 transition-all duration-300 hover:bg-gradient-to-r hover:from-slate-700/60 hover:to-slate-600/40 hover:border-slate-500/60 text-left w-full hover:scale-[1.005]"
                      onClick={() => {
                        router.push(
                          `/dashboard/banks?month=${selectedMonth.toISOString().split("T")[0]}&categories=${row.name}`
                        );
                      }}
                      title="View in Banks breakdown"
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-purple-500/3 to-blue-500/3 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                      <span className="relative text-slate-100 text-sm flex items-center gap-2 truncate flex-1">
                        <div
                          className={`w-2 h-2 rounded-full flex-shrink-0 ${isNegative ? "bg-red-400" : isPositive ? "bg-emerald-400" : "bg-slate-500"}`}
                        />
                        <span className="truncate">{row.name}</span>
                      </span>
                      <span
                        className={`relative font-mono text-xs flex items-center gap-1 flex-shrink-0 ${
                          isNegative
                            ? "text-red-400"
                            : isPositive
                              ? "text-emerald-400"
                              : "text-slate-400"
                        }`}
                      >
                        {isNegative ? (
                          <AlertCircle className="w-3 h-3" />
                        ) : isPositive ? (
                          <TrendingUp className="w-3 h-3" />
                        ) : null}
                        <span className="truncate max-w-[80px]">
                          {isPrivacyModeEnabled
                            ? `${baseCurrency?.symbol}•••••`
                            : parseAmount(amount, baseCurrency?.code)}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
});
