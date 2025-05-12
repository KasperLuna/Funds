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
import { useMemo, useCallback } from "react";

const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });

const VOLATILITY_MIN = 5000;
const VOLATILITY_RATIO = 3;

// Subcomponent for volatile category info
type VolatileCategoryInfoProps = {
  categoryTotals: Record<string, Decimal>;
  categoryData:
    | {
        categories?: { id: string; name: string }[];
      }
    | undefined;
  categoryThroughput: Record<string, number>;
  data:
    | {
        categories: string[];
        amount: number;
      }[]
    | undefined;
  baseCurrency: { code?: string } | undefined;
  parseAmount: (amount: number, code?: string) => string;
};

const VolatileCategoryInfo = ({
  categoryTotals,
  categoryData,
  categoryThroughput,
  data,
  baseCurrency,
  parseAmount,
}: VolatileCategoryInfoProps) => {
  return (
    <div className="flex flex-col gap-1 mt-2">
      {Object.entries(categoryTotals || {}).map(([key, value]) => {
        const category = categoryData?.categories?.find((c) => c.id === key);
        const net = value.toNumber();
        const throughput = categoryThroughput[key] || 0;
        const isVolatile =
          Math.abs(net) > 0 &&
          throughput > VOLATILITY_MIN &&
          throughput / Math.abs(net) > VOLATILITY_RATIO;
        if (!isVolatile) return null;
        // Calculate inflow and outflow
        let inflow = 0,
          outflow = 0;
        if (data) {
          data.forEach((txn) => {
            if (
              (txn.categories.length === 0 && key === "no category") ||
              txn.categories.includes(key)
            ) {
              if (txn.amount > 0) inflow += txn.amount;
              if (txn.amount < 0) outflow += txn.amount;
            }
          });
        }
        const name = category
          ? category.name
          : key === "no category"
            ? "No Category"
            : key;
        return (
          <small key={key} className="text-xs text-slate-500">
            *<small className="italic text-xs">{name}</small>
            {"  "}
            volatile:&nbsp;
            <span className="text-green-600">
              +{parseAmount(inflow, baseCurrency?.code)}
            </span>
            &nbsp;-&nbsp;
            <span className="text-red-500">
              {parseAmount(Math.abs(outflow), baseCurrency?.code)}
            </span>
          </small>
        );
      })}
    </div>
  );
};

export const CategoryBreakdown: React.FC = () => {
  const { queryParams, setQueryParams } = useQueryParams();
  const router = useRouter();
  const { isPrivacyModeEnabled } = usePrivacyMode();
  const { categoryData, baseCurrency } = useBanksCategsContext();

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const selectedMonth = queryParams["monthlyFilter"]
    ? new Date(queryParams["monthlyFilter"])
    : new Date();

  const { data, isLoading } = useQuery({
    queryKey: ["transactionsOfMonth", selectedMonth?.toDateString()],
    queryFn: () => getTransactionsOfAMonth(selectedMonth?.toISOString() || ""),
  });

  type Transaction = {
    categories: string[];
    amount: number;
  };

  type Category = { id: string; name: string };
  type CategoryData = { categories?: Category[] } | undefined;
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

  // Chart options as a function for memoization
  const chartDataOptions = useCallback(
    ({
      sortedKeys,
      sortedValues,
      isPrivacyModeEnabled,
      handleBarClick,
    }: {
      sortedKeys: string[];
      sortedValues: number[];
      isPrivacyModeEnabled: boolean;
      handleBarClick: (dataPointIndex: number) => void;
    }): ApexCharts.ApexOptions => ({
      chart: {
        type: "bar",
        background: "transparent",
        // margin: 0,
        toolbar: { show: false },
        events: {
          dataPointSelection: (
            _event,
            _chartContext,
            { dataPointIndex }: { dataPointIndex: number }
          ) => handleBarClick(dataPointIndex),
        },
      },
      xaxis: {
        categories: sortedKeys,
        labels: {
          show: !isPrivacyModeEnabled,
          style: {
            colors: ["#FFFFFF", "#FFFFFF"],
            fontSize: "12px",
            fontFamily: "monospace",
            fontWeight: 600,
            // textShadow: "2px 2px 4px #000000, 0 0 2px #000000",
          },
        },
      },
      yaxis: {
        labels: {
          style: {
            colors: sortedValues.map((_, index) =>
              index % 2 === 0 ? "#FFFFFF" : "#D3D3D3"
            ),
            fontSize: "12px",
            fontWeight: 600,
            // textShadow: "2px 2px 4px #000000, 0 0 2px #000000",
          },
        },
      },
      grid: {
        show: true,
        borderColor: "#1e293b",
        strokeDashArray: 0,
        xaxis: { lines: { show: false } },
        yaxis: { lines: { show: true } },
        padding: { left: 0, right: 0, top: 10, bottom: 10 },
      },
      plotOptions: {
        bar: {
          horizontal: true,
          borderRadius: 5,
          dataLabels: { position: "center" },
          colors: {
            ranges: [
              { from: 0, to: Number.MAX_VALUE, color: "#90EE90" },
              { from: -Number.MAX_VALUE, to: -1, color: "#EF4444" },
            ],
          },
        },
      },
      dataLabels: {
        enabled: !isPrivacyModeEnabled,
        // position: "center",
        style: {
          colors: sortedValues.map((value: number) =>
            value > 0 ? "#FFFFFF" : "#D3D3D3"
          ),
          fontSize: "10px",
          fontWeight: 500,
          fontFamily: "monospace",
          // textShadow: "2.5px 2.5px 4px #000000, 0 0 2px #000000",
        },
        offsetX: 1000,
        formatter: (val: number) => `${val}`,
      },
      tooltip: {
        theme: "dark",
        style: {
          fontSize: "12px",
          fontFamily: "monospace",
          // textShadow: "2px 2px 4px #000000, 0 0 2px #000000",
        },
        y: { formatter: (val: number) => `${val}` },
        // background: "#1E293B",
        // borderColor: "#475569",
        // textStyle: { color: "#F1F5F9" },
      },
    }),
    []
  );

  const memoized: Memoized = useMemo(() => {
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
      if (curr.amount > 0 && curr.categories.length > 0) {
        return acc.add(new Decimal(curr.amount));
      }
      return acc;
    }, new Decimal(0));

    // reduce the total of the negative amounts, only for transactions with categories
    const totalNegative = data?.reduce((acc, curr) => {
      if (curr.amount < 0 && curr.categories.length > 0) {
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
        // ...existing chart options...
        ...chartDataOptions({
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
    chartDataOptions,
    isPrivacyModeEnabled,
    categoryData?.categories,
    router,
    selectedMonth,
  ]);

  return (
    <div className="border rounded-xl border-slate-600/25 p-3 mb-3 flex flex-col gap-2">
      <div className="flex flex-row justify-between items-center">
        <h1 className="text-slate-100 text-xl font-semibold">
          Category Breakdown
        </h1>
        <MonthPicker
          date={selectedMonth}
          setDate={(date) => {
            if (!date) return;
            setQueryParams({
              monthlyFilter: dayjs(
                //last day of month
                new Date(date.getFullYear(), date.getMonth() + 1, 0)
              ).format("YYYY-MM-DD"),
            });
          }}
        />
      </div>
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
              "text-green-500": (memoized.totalPositive?.toNumber() ?? 0) > 0,
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
          {Array.from({ length: 9 }).map((_, index) => {
            return <Skeleton key={index} className="h-7 w-full bg-slate-800" />;
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
            *Since transactions can have multiple/no categories, the category
            breakdown may not be equal to money flow.
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
    </div>
  );
};
