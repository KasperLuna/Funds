import { MonthPicker } from "@/components/MonthPicker";
import { useBanksCategsContext } from "@/lib/hooks/useBanksCategsContext";
import { getTransactionsOfAMonth } from "@/lib/pocketbase/queries";
import { useQuery } from "@tanstack/react-query";
import Decimal from "decimal.js";
import { usePrivacyMode } from "@/lib/hooks/usePrivacyMode";
import dynamic from "next/dynamic";
import { parseAmount } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import clsx from "clsx";
import { useRouter } from "next/navigation";
import { useQueryParams } from "@/lib/hooks/useQueryParams";
import dayjs from "dayjs";
import { useMemo, useState } from "react";
import { VolatileCategoryInfo } from "./VolatileCategoryInfo";
import {
  getCategoryChartOptions,
  getBanksChartOptions,
  getBanksCountChartOptions,
} from "./chartOptions";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Bank } from "@/lib/types";

const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });

const VOLATILITY_MIN = 5000;
const VOLATILITY_RATIO = 3;

export const MonthlyBreakdown: React.FC = () => {
  const { queryParams, setQueryParams } = useQueryParams();
  const router = useRouter();
  const { isPrivacyModeEnabled } = usePrivacyMode();
  const { categoryData, bankData, baseCurrency } = useBanksCategsContext();

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const selectedMonth = queryParams["monthlyFilter"]
    ? new Date(queryParams["monthlyFilter"])
    : new Date();

  const { data, isLoading } = useQuery({
    queryKey: ["transactionsOfMonth", selectedMonth?.toDateString()],
    queryFn: () => getTransactionsOfAMonth(selectedMonth?.toISOString() || ""),
  });

  // Tab state: 0 = Categories, 1 = Banks
  const [tab, setTab] = useState("categories");

  type Memoized = {
    categoryTotals: Record<string, Decimal>;
    totalPositive: Decimal | undefined;
    totalNegative: Decimal | undefined;
    overallBalance: Decimal | undefined;
    uncategorizedTotal: Decimal;
    categoryThroughput: Record<string, number>;
    categoryTotalsWithNames: Record<string, number>;
    sortedCategories: [string, number][];
    sortedKeys: string[];
    sortedValues: number[];
    chartData: {
      series: { name: string; data: number[] }[];
      options: ApexCharts.ApexOptions;
    };
  };

  // Memoize all expensive calculations

  const memoized: Memoized = useMemo(() => {
    // Helper to check if a category is exempt
    const isCategoryExempt = (categoryId: string) => {
      return categoryData?.categories?.some(
        (c) => c.id === categoryId && (c as any).total_exempt === true
      );
    };

    // Aggregate by category (proportional split)
    const categoryTotals =
      data?.reduce(
        (acc, curr) => {
          if (curr.categories.length === 0) {
            if (!acc["no category"]) {
              acc["no category"] = new Decimal(0);
            }
            acc["no category"] = acc["no category"].add(
              new Decimal(curr.amount).toNumber()
            );
          } else {
            const splitAmount = new Decimal(curr.amount).div(
              curr.categories.length
            );
            curr.categories.forEach((categ) => {
              if (!acc[categ]) {
                acc[categ] = new Decimal(0);
              }
              acc[categ] = acc[categ].add(splitAmount);
            });
          }
          return acc;
        },
        {} as Record<string, Decimal>
      ) || {};

    // get the total of the positive amounts, only for transactions with categories
    const totalPositive = data?.reduce((acc, curr) => {
      if (
        curr.amount > 0 &&
        curr.categories.length > 0 &&
        !curr.categories.some(isCategoryExempt)
      ) {
        return acc.add(new Decimal(curr.amount));
      }
      return acc;
    }, new Decimal(0));

    // reduce the total of the negative amounts, only for transactions with categories
    const totalNegative = data?.reduce((acc, curr) => {
      if (
        curr.amount < 0 &&
        curr.categories.length > 0 &&
        !curr.categories.some(isCategoryExempt)
      ) {
        return acc.add(new Decimal(curr.amount));
      }
      return acc;
    }, new Decimal(0));

    // overall balance, only for transactions with categories
    const overallBalance = data?.reduce((acc, curr) => {
      if (curr.categories.length > 0) {
        return acc.add(new Decimal(curr.amount));
      }
      return acc;
    }, new Decimal(0));

    const uncategorizedTotal =
      data?.reduce((acc, curr) => {
        if (curr.categories.length === 0) {
          return acc.add(new Decimal(curr.amount));
        }
        return acc;
      }, new Decimal(0)) || new Decimal(0);

    // Calculate throughput (sum of absolute values) for each category
    const categoryThroughput: Record<string, number> = {};
    if (data) {
      data.forEach((curr) => {
        if (curr.categories.length === 0) {
          if (!categoryThroughput["no category"])
            categoryThroughput["no category"] = 0;
          categoryThroughput["no category"] += Math.abs(curr.amount);
        } else {
          curr.categories.forEach((categ) => {
            if (!categoryThroughput[categ]) categoryThroughput[categ] = 0;
            categoryThroughput[categ] += Math.abs(curr.amount);
          });
        }
      });
    }

    // Rename the categoryTotals keys to their names from categoryData, and append * if volatile
    const categoryTotalsWithNames = Object.entries(categoryTotals).reduce(
      (acc, [key, value]) => {
        const category = categoryData?.categories?.find(
          (categ) => categ.id === key
        );
        const net = value.toNumber();
        const throughput = categoryThroughput[key] || 0;
        const isVolatile =
          Math.abs(net) > 0 &&
          throughput > VOLATILITY_MIN &&
          throughput / Math.abs(net) > VOLATILITY_RATIO;
        if (category) {
          acc[category.name + (isVolatile ? " *" : "")] = net;
        } else if (key === "no category") {
          acc["No Category" + (isVolatile ? " *" : "")] = net;
        }
        return acc;
      },
      {} as Record<string, number>
    );

    // Sort categories by descending absolute value
    const sortedCategories = Object.entries(categoryTotalsWithNames).sort(
      ([, a], [, b]) => Math.abs(b) - Math.abs(a)
    );
    const sortedKeys = sortedCategories.map(([key]) => key);
    const sortedValues = sortedCategories.map(([, value]) => value);

    // Chart data
    const chartData = {
      series: [
        {
          name: "Amount",
          data: sortedValues,
        },
      ],
      options: {
        ...getCategoryChartOptions({
          sortedKeys,
          sortedValues,
          isPrivacyModeEnabled,
          handleBarClick: (dataPointIndex: number) => {
            const category: string = sortedKeys[dataPointIndex];
            router.push(
              `/dashboard/banks?month=${selectedMonth?.toISOString().split("T")[0]}&categories=${category}`
            );
          },
        }),
      },
    };

    return {
      categoryTotals,
      totalPositive,
      totalNegative,
      overallBalance,
      uncategorizedTotal,
      categoryThroughput,
      categoryTotalsWithNames,
      sortedCategories,
      sortedKeys,
      sortedValues,
      chartData,
    };
  }, [
    data,
    isPrivacyModeEnabled,
    categoryData?.categories,
    router,
    selectedMonth,
  ]);

  // --- Banks breakdown logic ---
  // Compute totals and transaction counts per bank
  const banksMemoized = useMemo(() => {
    if (!data)
      return {
        totals: {},
        counts: {},
        sortedBanks: [],
        sortedTotals: [],
        sortedCounts: [],
        sortedBankNames: [],
      };
    const totals: Record<string, Decimal> = {};
    const counts: Record<string, Decimal> = {};
    data.forEach((txn) => {
      // Assume txn has a 'bank' property (string, bank id)
      const bankId = (txn as any).bank || "Unknown Bank";
      if (!totals[bankId]) totals[bankId] = new Decimal(0);
      if (!counts[bankId]) counts[bankId] = new Decimal(0);
      totals[bankId] = totals[bankId].add(new Decimal(txn.amount));
      counts[bankId] = counts[bankId].add(1);
    });
    // Sort by absolute value of totals
    const sortedBanks = Object.entries(totals).sort(
      ([, a], [, b]) => a.abs().cmp(b.abs()) * -1
    );
    const sortedBankIds = sortedBanks.map(([key]) => key);
    // Map bank IDs to names using bankData
    const bankIdToName: Record<string, string> = (bankData?.banks || []).reduce(
      (acc: Record<string, string>, bank: Bank) => {
        acc[bank.id] = bank.name;
        return acc;
      },
      {}
    );
    const sortedBankNames = sortedBankIds.map((id) => bankIdToName[id] || id);
    const sortedTotals = sortedBanks.map(([, value]) => value.toNumber());
    // For counts, sort by same bank order
    const sortedCounts = sortedBankIds.map(
      (bank) => counts[bank]?.toNumber() || 0
    );
    return {
      totals,
      counts,
      sortedBanks: sortedBankIds,
      sortedTotals,
      sortedCounts,
      sortedBankNames,
    };
  }, [data, bankData]);

  // Toggle for bank chart type (totals vs counts)
  const [bankChartType, setBankChartType] = useState<string>("totals");

  // --- History breakdown logic ---
  // Compute transaction counts and totals per day for the selected month
  const historyMemoized = useMemo(() => {
    if (!data || !selectedMonth) return { days: [], counts: [], totals: [] };
    const daysInMonth = dayjs(selectedMonth).daysInMonth();
    // Create an array for each day of the month
    const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
    const counts = Array(daysInMonth).fill(0);
    const totals = Array(daysInMonth).fill(0);
    data.forEach((txn) => {
      const created = dayjs(txn.date);
      if (
        created.year() === selectedMonth.getFullYear() &&
        created.month() === selectedMonth.getMonth()
      ) {
        const day = created.date();
        counts[day - 1] += 1;
        totals[day - 1] += txn.amount;
      }
    });
    return { days, counts, totals };
  }, [data, selectedMonth]);

  // Add state for history sub-tab
  const [historyChartType, setHistoryChartType] = useState<string>("total");

  return (
    <div className="border rounded-xl border-slate-600/25 p-3 mb-3 flex flex-col gap-2">
      <Tabs value={tab} onValueChange={setTab} className="w-full ">
        <div className="flex flex-row justify-between items-center">
          {/* This item is duplicated below */}
          <TabsList className="my-2 bg-transparent fill-slate-200 hidden sm:flex">
            <TabsTrigger value="categories">Categories</TabsTrigger>
            <TabsTrigger value="banks">Banks</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
          </TabsList>
          <div></div>
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
        {/* This item is duplicated above */}
        <TabsList className="my-2 bg-transparent fill-slate-200 visible sm:invisible">
          <TabsTrigger value="categories">Categories</TabsTrigger>
          <TabsTrigger value="banks">Banks</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>
        <TabsContent value="categories">
          {/* Categories tab (existing view) */}
          <div className="flex flex-row items-center justify-center gap-5 px-3 mt-2 w-fit mx-auto">
            <p className="text-sm font-semibold">Total:</p>
            <div className="flex flex-col sm:flex-row gap-2">
              <p className="text-green-500">
                {isPrivacyModeEnabled || isLoading
                  ? `${baseCurrency?.symbol ?? ""}••••••`
                  : parseAmount(
                      memoized.totalPositive?.toNumber(),
                      baseCurrency?.code
                    )}
              </p>
              <p className="text-red-500">
                {isPrivacyModeEnabled || isLoading
                  ? `${baseCurrency?.symbol ?? ""}••••••`
                  : parseAmount(
                      memoized.totalNegative?.toNumber(),
                      baseCurrency?.code
                    )}
              </p>
              <p
                className={clsx({
                  "text-green-500":
                    (memoized.totalPositive?.toNumber() ?? 0) > 0,
                  "text-red-500": (memoized.totalPositive?.toNumber() ?? 0) < 0,
                })}
              >
                <span className="text-slate-200">=</span>{" "}
                {isPrivacyModeEnabled || isLoading
                  ? `${baseCurrency?.symbol ?? ""}••••••`
                  : parseAmount(
                      memoized.overallBalance?.toNumber(),
                      baseCurrency?.code
                    )}
              </p>
            </div>
          </div>
          {/* Uncategorized total */}
          <div className="flex flex-row items-center justify-center gap-2 px-3 mt-1 w-fit mx-auto">
            <span className="text-xs text-slate-400">No category:</span>
            <span
              className={clsx("text-xs font-mono", {
                "text-green-400":
                  !isPrivacyModeEnabled &&
                  !isLoading &&
                  memoized.uncategorizedTotal.gt(0),
                "text-red-400":
                  !isPrivacyModeEnabled &&
                  !isLoading &&
                  memoized.uncategorizedTotal.lt(0),
                "text-slate-300":
                  isPrivacyModeEnabled ||
                  isLoading ||
                  memoized.uncategorizedTotal.eq(0),
              })}
            >
              {isPrivacyModeEnabled || isLoading
                ? `${baseCurrency?.symbol ?? ""}••••••`
                : parseAmount(
                    memoized.uncategorizedTotal.toNumber(),
                    baseCurrency?.code
                  )}
            </span>
          </div>
          {isLoading ? (
            <div className="flex flex-col gap-3 pb-3">
              {[
                "skel-cat-1",
                "skel-cat-2",
                "skel-cat-3",
                "skel-cat-4",
                "skel-cat-5",
                "skel-cat-6",
                "skel-cat-7",
                "skel-cat-8",
                "skel-cat-9",
              ].map((key) => {
                return (
                  <Skeleton key={key} className="h-7 w-full bg-slate-800" />
                );
              })}
            </div>
          ) : !data?.length ? (
            <div className="flex flex-col justify-center items-center text-center h-64">
              <span className="text-lg">No Data Yet. </span> <br />
              <span className="text-sm">
                Add transactions for the selected month to see breakdown.
              </span>
            </div>
          ) : (
            <div className="rounded-md mt-[-20px]">
              <div className="h-[350px]">
                <Chart
                  options={memoized.chartData.options}
                  series={memoized.chartData.series}
                  type="bar"
                  height={350}
                />
              </div>
              <p className="text-slate-500 text-xs self-end">
                *Since transactions can have multiple/no categories, the amount
                for each category is a proportional split of the transaction
                amount.
              </p>
              {/* Volatile categories info */}
              <VolatileCategoryInfo
                categoryTotals={memoized.categoryTotals}
                categoryData={categoryData}
                categoryThroughput={memoized.categoryThroughput}
                data={data}
                baseCurrency={baseCurrency}
                parseAmount={parseAmount}
              />
            </div>
          )}
        </TabsContent>
        <TabsContent value="banks">
          {/* Banks tab */}
          <div className="mt-4 mb-2 border-b border-slate-700 pb-2">
            <h3 className="text-base font-semibold text-slate-200 mb-1">
              Bank Breakdown
            </h3>
            <p className="text-xs text-slate-400 mb-2">
              View totals and transaction counts by bank for the selected month.
            </p>
          </div>
          <div className="bg-slate-900/60 rounded-lg p-3">
            <Tabs
              value={bankChartType}
              onValueChange={setBankChartType}
              className="w-full min-h-[350px]"
            >
              <TabsList className="bg-transparent fill-slate-200 py-0">
                <TabsTrigger value="totals">Bank Totals</TabsTrigger>
                <TabsTrigger value="counts">Transaction Counts</TabsTrigger>
              </TabsList>
              <TabsContent value="totals" className="py-0">
                {isLoading ? (
                  <div className="flex flex-col gap-3 pb-3">
                    {[
                      "skel-bank-1",
                      "skel-bank-2",
                      "skel-bank-3",
                      "skel-bank-4",
                      "skel-bank-5",
                      "skel-bank-6",
                    ].map((key) => (
                      <Skeleton key={key} className="h-7 w-full bg-slate-800" />
                    ))}
                  </div>
                ) : !data?.length ? (
                  <div className="flex flex-col justify-center items-center text-center h-64">
                    <span className="text-lg">No Data Yet. </span> <br />
                    <span className="text-sm">
                      Add transactions for the selected month to see breakdown.
                    </span>
                  </div>
                ) : (
                  <Chart
                    options={getBanksChartOptions({
                      sortedBanks: banksMemoized.sortedBanks,
                      sortedTotals: banksMemoized.sortedTotals,
                      isPrivacyModeEnabled,
                      sortedBankNames: banksMemoized.sortedBankNames,
                    })}
                    series={[
                      { name: "Total", data: banksMemoized.sortedTotals },
                    ]}
                    type="bar"
                    height={350}
                  />
                )}
              </TabsContent>
              <TabsContent value="counts" className="py-0">
                {isLoading ? (
                  <div className="flex flex-col gap-3 pb-3">
                    {[
                      "skel-bank-1",
                      "skel-bank-2",
                      "skel-bank-3",
                      "skel-bank-4",
                      "skel-bank-5",
                      "skel-bank-6",
                    ].map((key) => (
                      <Skeleton key={key} className="h-7 w-full bg-slate-800" />
                    ))}
                  </div>
                ) : !data?.length ? (
                  <div className="flex flex-col justify-center items-center text-center h-64">
                    <span className="text-lg">No Data Yet. </span> <br />
                    <span className="text-sm">
                      Add transactions for the selected month to see breakdown.
                    </span>
                  </div>
                ) : (
                  <Chart
                    options={getBanksCountChartOptions({
                      sortedBanks: banksMemoized.sortedBanks,
                      sortedCounts: banksMemoized.sortedCounts,
                      isPrivacyModeEnabled,
                      sortedBankNames: banksMemoized.sortedBankNames,
                    })}
                    series={[
                      {
                        name: "Transactions",
                        data: banksMemoized.sortedCounts,
                      },
                    ]}
                    type="bar"
                    height={350}
                  />
                )}
              </TabsContent>
            </Tabs>
          </div>
        </TabsContent>
        <TabsContent value="history">
          {/* History tab: Custom calendar heatmap of transactions per day in the month */}
          <div className="mt-4 mb-2 border-b border-slate-700 pb-2">
            <h3 className="text-base font-semibold text-slate-200 mb-1">
              History Breakdown
            </h3>
            <p className="text-xs text-slate-400 mb-2">
              See your daily totals and transaction activity for the selected
              month.
            </p>
          </div>
          <div className="bg-slate-900/60 rounded-lg p-3">
            <Tabs
              value={historyChartType}
              onValueChange={setHistoryChartType}
              className="w-full min-h-[350px]"
            >
              <TabsList className="bg-transparent fill-slate-200 py-0 mb-2">
                <TabsTrigger value="total">Total</TabsTrigger>
                <TabsTrigger value="transactions">Transactions</TabsTrigger>
              </TabsList>
              <TabsContent value="transactions" className="py-0">
                {isLoading ? (
                  <div className="flex flex-col gap-3 pb-3">
                    {[...Array(6)].map((_, i) => (
                      <Skeleton
                        key={`skel-hist-${String(i)}`}
                        className="h-7 w-full bg-slate-800"
                      />
                    ))}
                  </div>
                ) : !data?.length ? (
                  <div className="flex flex-col justify-center items-center text-center h-64">
                    <span className="text-lg">No Data Yet. </span> <br />
                    <span className="text-sm">
                      Add transactions for the selected month to see breakdown.
                    </span>
                  </div>
                ) : (
                  <div className="rounded-md flex flex-col items-center w-full">
                    {/* Weekday labels */}
                    <div className="flex flex-row w-full justify-center mb-1 gap-1">
                      {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(
                        (d) => (
                          <div
                            key={d}
                            className="flex-1 min-w-0 text-center text-xs text-slate-300 font-semibold"
                          >
                            {d}
                          </div>
                        )
                      )}
                    </div>
                    {/* Calendar grid for transaction counts */}
                    <div className="flex flex-col gap-1 w-full">
                      {(() => {
                        const year = selectedMonth.getFullYear();
                        const month = selectedMonth.getMonth();
                        const daysInMonth = dayjs(selectedMonth).daysInMonth();
                        const firstDayOfWeek = new Date(
                          year,
                          month,
                          1
                        ).getDay();
                        const weeks: Array<
                          Array<{ day: number | null; count: number }>
                        > = [];
                        let week: Array<{ day: number | null; count: number }> =
                          [];
                        // Fill initial empty days
                        for (let i = 0; i < firstDayOfWeek; i++) {
                          week.push({ day: null, count: 0 });
                        }
                        for (let day = 1; day <= daysInMonth; day++) {
                          const count = historyMemoized.counts[day - 1] || 0;
                          week.push({ day, count });
                          if (week.length === 7) {
                            weeks.push(week);
                            week = [];
                          }
                        }
                        // Fill trailing empty days
                        if (week.length > 0) {
                          while (week.length < 7)
                            week.push({ day: null, count: 0 });
                          weeks.push(week);
                        }
                        return weeks.map((week, i) => (
                          <div
                            key={JSON.stringify(week)}
                            className="flex flex-row gap-1 w-full"
                          >
                            {week.map((cell, j) => {
                              let color = "bg-slate-800";
                              let textColor = "text-white";
                              if (cell.day !== null) {
                                if (cell.count > 0 && cell.count < 2) {
                                  color = "bg-green-400";
                                } else if (cell.count >= 2 && cell.count < 5) {
                                  color = "bg-yellow-500";
                                } else if (cell.count >= 5 && cell.count < 8) {
                                  color = "bg-orange-600";
                                } else if (cell.count >= 8) {
                                  color = "bg-red-700";
                                }
                              }
                              return (
                                <div
                                  key={`${cell.day}-${i}-${j}`}
                                  className={`flex-1 min-w-0 max-h-[30px] aspect-square flex items-center justify-center rounded transition-colors duration-200 cursor-pointer relative group ${color}`}
                                  title={
                                    cell.day !== null
                                      ? `${year}-${String(month + 1).padStart(2, "0")}-${String(cell.day).padStart(2, "0")}: ${cell.count} transaction${cell.count === 1 ? "" : "s"}`
                                      : undefined
                                  }
                                >
                                  <span
                                    className={`text-lg font-mono select-none ${textColor}`}
                                  >
                                    {cell.day ? cell.day : ""}
                                  </span>
                                  {/* Tooltip on hover */}
                                  {cell.day && (
                                    <span className="absolute z-10 left-1/2 -translate-x-1/2 top-10 scale-0 group-hover:scale-100 transition-transform bg-slate-900 text-slate-100 text-xs px-2 py-1 rounded shadow-lg pointer-events-none whitespace-nowrap">
                                      {`${year}-${String(month + 1).padStart(2, "0")}-${String(cell.day).padStart(2, "0")}: ${cell.count} transaction${cell.count === 1 ? "" : "s"}`}
                                    </span>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        ));
                      })()}
                    </div>
                  </div>
                )}
              </TabsContent>
              <TabsContent value="total" className="py-0">
                {isLoading ? (
                  <div className="flex flex-col gap-3 pb-3">
                    {[...Array(6)].map((_, i) => (
                      <Skeleton
                        key={`skel-hist-total-${String(i)}`}
                        className="h-7 w-full bg-slate-800"
                      />
                    ))}
                  </div>
                ) : !data?.length ? (
                  <div className="flex flex-col justify-center items-center text-center h-64">
                    <span className="text-lg">No Data Yet. </span> <br />
                    <span className="text-sm">
                      Add transactions for the selected month to see breakdown.
                    </span>
                  </div>
                ) : (
                  <div className="rounded-md flex flex-col items-center w-full">
                    {/* Weekday labels */}
                    <div className="flex flex-row w-full justify-center mb-1 gap-1">
                      {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(
                        (d) => (
                          <div
                            key={d}
                            className="flex-1 min-w-0 text-center text-xs text-slate-300 font-semibold"
                          >
                            {d}
                          </div>
                        )
                      )}
                    </div>
                    {/* Calendar grid for daily totals */}
                    <div className="flex flex-col gap-1 w-full">
                      {(() => {
                        const year = selectedMonth.getFullYear();
                        const month = selectedMonth.getMonth();
                        const daysInMonth = dayjs(selectedMonth).daysInMonth();
                        const firstDayOfWeek = new Date(
                          year,
                          month,
                          1
                        ).getDay();
                        const weeks: Array<
                          Array<{ day: number | null; total: number }>
                        > = [];
                        let week: Array<{ day: number | null; total: number }> =
                          [];
                        // Fill initial empty days
                        for (let i = 0; i < firstDayOfWeek; i++) {
                          week.push({ day: null, total: 0 });
                        }
                        for (let day = 1; day <= daysInMonth; day++) {
                          const total = historyMemoized.totals[day - 1] || 0;
                          week.push({ day, total });
                          if (week.length === 7) {
                            weeks.push(week);
                            week = [];
                          }
                        }
                        // Fill trailing empty days
                        if (week.length > 0) {
                          while (week.length < 7)
                            week.push({ day: null, total: 0 });
                          weeks.push(week);
                        }
                        // Compute monthly max/min for scaling
                        const maxAbs = Math.max(
                          1,
                          ...historyMemoized.totals.map((v) => Math.abs(v))
                        );
                        const monthlyTotal =
                          memoized.overallBalance?.toNumber() || 1;
                        return weeks.map((week, i) => (
                          <div
                            key={JSON.stringify(week)}
                            className="flex flex-row gap-1 w-full"
                          >
                            {week.map((cell, j) => {
                              let color = "bg-slate-800";
                              let textColor = "text-white";
                              if (cell.day !== null) {
                                const rel = cell.total / monthlyTotal;
                                if (cell.total > 0) {
                                  color = `bg-green-500`;
                                  if (rel > 0.5) {
                                    color = `bg-green-600`;
                                  } else if (rel > 0.25) {
                                    color = `bg-green-700`;
                                  } else if (rel > 0.1) {
                                    color = `bg-green-800`;
                                  }
                                } else if (cell.total < 0) {
                                  color = `bg-red-500`;
                                  if (rel < -0.5) {
                                    color = `bg-red-600`;
                                  } else if (rel < -0.25) {
                                    color = `bg-red-700`;
                                  } else if (rel < -0.1) {
                                    color = `bg-red-800`;
                                  }
                                }
                              }
                              return (
                                <div
                                  key={`${cell.day}-${i}-${j}`}
                                  className={`flex-1 min-w-0 max-h-[30px] aspect-square flex items-center justify-center rounded transition-colors duration-200 cursor-pointer relative group ${color}`}
                                  title={
                                    cell.day !== null
                                      ? `${year}-${String(month + 1).padStart(2, "0")}-${String(cell.day).padStart(2, "0")}: ${parseAmount(cell.total, baseCurrency?.code)}`
                                      : undefined
                                  }
                                >
                                  <span
                                    className={`text-lg font-mono select-none ${textColor}`}
                                  >
                                    {cell.day ? cell.day : ""}
                                  </span>
                                  {/* Tooltip on hover */}
                                  {cell.day && (
                                    <span className="absolute z-10 left-1/2 -translate-x-1/2 top-10 scale-0 group-hover:scale-100 transition-transform bg-slate-900 text-slate-100 text-xs px-2 py-1 rounded shadow-lg pointer-events-none whitespace-nowrap">
                                      {`${year}-${String(month + 1).padStart(2, "0")}-${String(cell.day).padStart(2, "0")}: ${parseAmount(cell.total, baseCurrency?.code)}`}
                                    </span>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        ));
                      })()}
                    </div>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};
