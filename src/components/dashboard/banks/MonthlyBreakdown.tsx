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

    // Aggregate by category
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
            curr.categories.forEach((categ) => {
              if (!acc[categ]) {
                acc[categ] = new Decimal(0);
              }
              acc[categ] = acc[categ].add(new Decimal(curr.amount));
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

  return (
    <div className="border rounded-xl border-slate-600/25 p-3 mb-3 flex flex-col gap-2">
      {/* Header row */}
      <div className="flex flex-row justify-between items-center">
        <h1 className="text-slate-100 text-xl font-semibold">
          Monthly Breakdown
        </h1>
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
      {/* Tabs row and content using shadcn Tabs */}
      <Tabs value={tab} onValueChange={setTab} className="w-full">
        <TabsList className="mb-2 bg-transparent fill-slate-200">
          <TabsTrigger value="categories">Categories</TabsTrigger>
          <TabsTrigger value="banks">Banks</TabsTrigger>
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
                *Since transactions can have multiple/no categories, the
                category breakdown may not be equal to money flow.
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
                  series={[{ name: "Total", data: banksMemoized.sortedTotals }]}
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
        </TabsContent>
      </Tabs>
    </div>
  );
};
