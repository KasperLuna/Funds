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

export const BudgetsSummary = () => {
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
    <div className="border rounded-xl border-slate-700 bg-slate-900/80 p-3 mb-3 flex flex-col gap-4 shadow-sm">
      <div className="flex justify-between items-start mb-1">
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
        {budgetedRows.length > 0 && (
          <div className="flex flex-col items-end">
            <span className="text-xs text-slate-300 font-mono">
              {isPrivacyModeEnabled
                ? `${baseCurrency?.symbol}••••• / ${baseCurrency?.symbol}•••••`
                : `${parseAmount(totalSpent, baseCurrency?.code)} / ${parseAmount(totalBudget, baseCurrency?.code)}`}
            </span>
            <span className={`text-[11px] font-mono ${totalBarColor}`}>
              {`${Math.round((totalSpent / (totalBudget || 1)) * 100)}% used`}
            </span>
          </div>
        )}
      </div>
      {isLoading ? (
        <div className="flex flex-col gap-2">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="flex flex-col gap-1 p-2 rounded-lg bg-slate-800/60 border border-slate-700 animate-pulse"
            >
              <div className="flex justify-between items-center mb-1">
                <div className="h-4 w-24 bg-slate-700 rounded" />
                <div className="h-3 w-16 bg-slate-700 rounded" />
              </div>
              <div className="h-4 bg-slate-700 rounded w-full" />
              <div className="flex justify-between mt-1">
                <div className="h-3 w-12 bg-slate-700 rounded" />
                <div className="h-3 w-14 bg-slate-700 rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <>
          {/* Budgeted categories */}
          <section className="flex flex-col gap-2">
            {budgetedRows.length === 0 && (
              <div className="text-slate-500 text-xs">
                No categories with budgets set.
              </div>
            )}
            {budgetedRows.map((row) => {
              // budget is negative, spent is positive
              const percent =
                row.budget! < 0
                  ? Math.min((row.spent / Math.abs(row.budget!)) * 100, 100)
                  : 0;
              let barColor = "bg-green-600";
              if (row.spent > Math.abs(row.budget!)) barColor = "bg-red-700";
              else if (row.spent / Math.abs(row.budget!) >= 0.8)
                barColor = "bg-orange-500";
              return (
                <div
                  key={row.name}
                  className="flex flex-col gap-0.5 p-2 rounded-lg bg-slate-800/60 border border-slate-700 hover:shadow transition-shadow cursor-pointer hover:bg-slate-700/80 hover:border-slate-500"
                  onClick={() => {
                    router.push(
                      `/dashboard/banks?month=${selectedMonth.toISOString().split("T")[0]}&categories=${row.name}`
                    );
                  }}
                  title="View in Banks breakdown"
                >
                  <div className="flex justify-between items-center mb-0.5 text-xs">
                    <span className="font-medium text-slate-100 text-sm">
                      {row.name}
                    </span>
                    <span
                      className={
                        (row.remaining! > 0
                          ? "text-red-400"
                          : row.remaining! < Math.abs(row.budget!) * 0.2
                            ? "text-orange-300"
                            : "text-green-400") + " font-mono"
                      }
                    >
                      {isPrivacyModeEnabled
                        ? ""
                        : `${parseAmount(Math.abs(row.remaining ?? 0), baseCurrency?.code)}`}
                      {row.remaining != null && row.remaining > 0
                        ? " over"
                        : " left"}
                    </span>
                  </div>
                  <div className="relative h-4 bg-slate-700 rounded overflow-hidden">
                    <div
                      className={`absolute left-0 top-0 h-full ${barColor}`}
                      style={{ width: `${percent}%`, transition: "width 0.3s" }}
                    />
                    <div
                      className="absolute left-0 right-0 text-[10px] text-center text-slate-200/90"
                      style={{
                        lineHeight: "1.1rem",
                        textShadow:
                          "0 1px 1px rgba(0,0,0,0.7), 0 0px 1px rgba(0,0,0,0.7)",
                      }}
                    >
                      {`${Math.round((row.spent / Math.abs(row.budget || 1)) * 100)}%`}
                    </div>
                  </div>
                  <div className="flex justify-between mt-0.5 text-xs">
                    <span className="text-slate-400">Spent</span>
                    <span className="text-slate-300 font-mono">
                      {isPrivacyModeEnabled
                        ? ``
                        : `${parseAmount(row.spent, baseCurrency?.code)} / ${parseAmount(Math.abs(row.budget ?? 0), baseCurrency?.code)}`}
                    </span>
                  </div>
                </div>
              );
            })}
          </section>

          {/* Unbudgeted categories */}
          {unbudgetedRows.length > 0 && (
            <section className="mt-2">
              <h3 className="text-sm font-semibold mb-1 text-slate-200">
                Other Categories
              </h3>
              <div className="flex flex-col gap-1">
                {unbudgetedRows.map((row) => (
                  <div
                    key={row.name}
                    className="flex justify-between items-center p-2 rounded bg-slate-800/40 border border-slate-700"
                  >
                    <span className="text-slate-100 text-sm">{row.name}</span>
                    <span className="font-mono text-slate-300 text-xs">
                      {isPrivacyModeEnabled
                        ? `${baseCurrency?.symbol}•••••`
                        : parseAmount(
                            categoryTotals[
                              categoryData?.categories.find(
                                (c) => c.name === row.name
                              )?.id ?? ""
                            ]?.toNumber() || 0,
                            baseCurrency?.code
                          )}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
};
