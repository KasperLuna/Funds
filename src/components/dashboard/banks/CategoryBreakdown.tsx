"use client";

import { memo, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import Decimal from "decimal.js";
import dynamic from "next/dynamic";
import dayjs from "dayjs";
import { cn, parseAmount } from "@/lib/utils";

import { MonthPicker } from "@/components/MonthPicker";
import { Skeleton } from "@/components/ui/skeleton";
import { PrivacyPeek } from "@/components/PrivacyPeek";
import { VolatileCategoryInfo } from "./VolatileCategoryInfo";
import { getCategoryChartOptions } from "./chartOptions";
import { getTransactionsOfAMonth } from "@/lib/pocketbase/queries";
import { usePrivacy } from "@/hooks/usePrivacy";
import { useQueryParams } from "@/lib/hooks/useQueryParams";
import { useCategoriesQuery } from "@/lib/hooks/useCategoriesQuery";
import { useUserQuery } from "@/lib/hooks/useUserQuery";

const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });

const VOLATILITY_MIN = 5000;
const VOLATILITY_RATIO = 3;

export const CategoryBreakdown = memo(function CategoryBreakdown() {
  const { queryParams, setQueryParams } = useQueryParams();
  const router = useRouter();
  const { isPrivate } = usePrivacy();
  const categoryData = useCategoriesQuery();
  const { baseCurrency } = useUserQuery();

  const selectedMonth = queryParams["monthlyFilter"]
    ? new Date(queryParams["monthlyFilter"])
    : new Date();

  const { data, isLoading } = useQuery({
    queryKey: ["transactionsOfMonth", selectedMonth?.toDateString()],
    queryFn: () => getTransactionsOfAMonth(selectedMonth?.toISOString() || ""),
  });

  const memoized = useMemo(() => {
    const isCategoryExempt = (categoryId: string) => {
      return categoryData?.categories?.some(
        (c) => c.id === categoryId && c.total_exempt === true,
      );
    };

    const categoryTotals =
      data?.reduce(
        (acc, curr) => {
          if (curr.categories.length === 0) {
            if (!acc["no category"]) acc["no category"] = new Decimal(0);
            acc["no category"] = acc["no category"].add(
              new Decimal(curr.amount).toDecimalPlaces(2),
            );
          } else {
            const splitAmount = new Decimal(curr.amount)
              .div(curr.categories.length)
              .toDecimalPlaces(2); // Apply precision here
            curr.categories.forEach((categ) => {
              if (!acc[categ]) acc[categ] = new Decimal(0);
              acc[categ] = acc[categ].add(splitAmount);
            });
          }
          return acc;
        },
        {} as Record<string, Decimal>,
      ) || {};

    const totalPositive = data?.reduce((acc, curr) => {
      if (
        curr.amount > 0 &&
        curr.categories.length > 0 &&
        !curr.categories.some(isCategoryExempt)
      )
        return acc.add(new Decimal(curr.amount));
      return acc;
    }, new Decimal(0));

    const totalNegative = data?.reduce((acc, curr) => {
      if (
        curr.amount < 0 &&
        curr.categories.length > 0 &&
        !curr.categories.some(isCategoryExempt)
      )
        return acc.add(new Decimal(curr.amount));
      return acc;
    }, new Decimal(0));

    const overallBalance = data?.reduce((acc, curr) => {
      if (curr.categories.length > 0) return acc.add(new Decimal(curr.amount));
      return acc;
    }, new Decimal(0));

    const uncategorizedTotal =
      data?.reduce((acc, curr) => {
        if (curr.categories.length === 0)
          return acc.add(new Decimal(curr.amount));
        return acc;
      }, new Decimal(0)) || new Decimal(0);

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

    const categoryTotalsWithNames = Object.entries(categoryTotals).reduce(
      (acc, [key, value]) => {
        const category = categoryData?.categories?.find(
          (categ) => categ.id === key,
        );
        const net = value; // Keep as Decimal
        const throughput = new Decimal(categoryThroughput[key] || 0); // Keep as Decimal
        const isVolatile =
          net.abs().gt(0) &&
          throughput.gt(VOLATILITY_MIN) &&
          throughput.div(net.abs()).gt(VOLATILITY_RATIO);
        if (category) {
          acc[category.name + (isVolatile ? " *" : "")] = net;
        } else if (key === "no category") {
          acc["No Category" + (isVolatile ? " *" : "")] = net;
        }
        return acc;
      },
      {} as Record<string, Decimal>,
    );

    const sortedCategories = Object.entries(categoryTotalsWithNames).sort(
      ([, a], [, b]) => b.abs().minus(a.abs()).toNumber(),
    );
    const sortedKeys = sortedCategories.map(([key]) => key);
    const sortedValues = sortedCategories.map(([, value]) => value.toNumber()); // Convert to number only for display

    const chartData = {
      series: [{ name: "Amount", data: sortedValues }],
      options: {
        ...getCategoryChartOptions({
          sortedKeys,
          sortedValues,
          isPrivate,
          handleBarClick: (dataPointIndex: number) => {
            const category: string = sortedKeys[dataPointIndex];
            router.push(
              `/dashboard/banks?month=${selectedMonth?.toISOString().split("T")[0]}&categories=${category}`,
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
      sortedKeys,
      chartData,
    };
  }, [data, isPrivate, categoryData?.categories, router, selectedMonth]);

  return (
    <div className="border rounded-xl border-slate-600/25 p-3 mb-3 flex flex-col gap-2">
      <div className="flex flex-row justify-between items-center">
        <h3 className="text-base font-semibold text-slate-200">Categories</h3>
        <MonthPicker
          date={selectedMonth}
          setDate={(date) => {
            if (!date) return;
            setQueryParams({
              monthlyFilter: dayjs(
                new Date(date.getFullYear(), date.getMonth() + 1, 0),
              ).format("YYYY-MM-DD"),
            });
          }}
        />
      </div>

      <div className="flex flex-row items-center justify-center gap-5 px-3 mt-2 w-fit mx-auto">
        <p className="text-sm font-semibold">Total:</p>
        <div className="flex flex-col sm:flex-row gap-2">
          <p className="text-green-500">
            <PrivacyPeek
              isPrivate={isPrivate || isLoading}
              revealedContent={parseAmount(
                memoized.totalPositive?.toNumber(),
                baseCurrency?.code,
              )}
              maskedContent={`${baseCurrency?.symbol ?? ""}••••••`}
            />
          </p>
          <p className="text-red-500">
            <PrivacyPeek
              isPrivate={isPrivate || isLoading}
              revealedContent={parseAmount(
                memoized.totalNegative?.toNumber(),
                baseCurrency?.code,
              )}
              maskedContent={`${baseCurrency?.symbol ?? ""}••••••`}
            />
          </p>
          <p
            className={cn({
              "text-green-500": (memoized.totalPositive?.toNumber() ?? 0) > 0,
              "text-red-500": (memoized.totalPositive?.toNumber() ?? 0) < 0,
            })}
          >
            <span className="text-slate-200">=</span>{" "}
            <PrivacyPeek
              isPrivate={isPrivate || isLoading}
              revealedContent={parseAmount(
                memoized.overallBalance?.toNumber(),
                baseCurrency?.code,
              )}
              maskedContent={`${baseCurrency?.symbol ?? ""}••••••`}
            />
          </p>
        </div>
      </div>

      <div className="flex flex-row items-center justify-center gap-2 px-3 mt-1 w-fit mx-auto">
        <span className="text-xs text-slate-400">No category:</span>
        <span
          className={cn("text-xs font-mono", {
            "text-green-400":
              !isPrivate && !isLoading && memoized.uncategorizedTotal.gt(0),
            "text-red-400":
              !isPrivate && !isLoading && memoized.uncategorizedTotal.lt(0),
            "text-slate-300":
              isPrivate || isLoading || memoized.uncategorizedTotal.eq(0),
          })}
        >
          <PrivacyPeek
            isPrivate={isPrivate || isLoading}
            revealedContent={parseAmount(
              memoized.uncategorizedTotal.toNumber(),
              baseCurrency?.code,
            )}
            maskedContent={`${baseCurrency?.symbol ?? ""}••••••`}
          />
        </span>
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-3 pb-3">
          {Array.from({ length: 9 }, (_, i) => (
            <Skeleton
              key={`skel-cat-${i}`}
              className="h-7 w-full bg-slate-800"
            />
          ))}
        </div>
      ) : !data?.length ? (
        <div className="flex flex-col justify-center items-center text-center h-64">
          <span className="text-lg">No Data Yet.</span>
          <br />
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
            *Since transactions can have multiple/no categories, the amount for
            each category is a proportional split of the transaction amount.
          </p>
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
});
