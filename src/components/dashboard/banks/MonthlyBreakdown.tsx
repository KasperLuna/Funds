import { MonthPicker } from "@/components/MonthPicker";
import { useBanksCategsContext } from "@/lib/hooks/useBanksCategsContext";
import { getTransactionsOfAMonth } from "@/lib/pocketbase/queries";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import Decimal from "decimal.js";
import { usePrivacyMode } from "@/lib/hooks/usePrivacyMode";
import dynamic from "next/dynamic";
import { parseAmount } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import clsx from "clsx";
import { useRouter } from "next/navigation";

const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });

export const MonthlyBreakdown = () => {
  const router = useRouter();
  const { isPrivacyModeEnabled } = usePrivacyMode();
  const { categoryData, baseCurrency } = useBanksCategsContext();
  const [selectedMonth, setSelectedMonth] = useState<Date | undefined>(
    new Date()
  );

  const { data, isLoading } = useQuery({
    queryKey: ["transactionsOfMonth", selectedMonth],
    queryFn: () => getTransactionsOfAMonth(selectedMonth?.toISOString() || ""),
  });

  // Aggregate by category
  const categoryTotals = data?.reduce(
    (acc, curr) => {
      if (curr.categories.length === 0) {
        if (!acc["uncategorized"]) {
          acc["uncategorized"] = new Decimal(0);
        }
        acc["uncategorized"] = acc["uncategorized"].add(
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
  );

  // get the total of the positive amounts
  const totalPositive = data?.reduce((acc, curr) => {
    if (curr.amount > 0) {
      return acc.add(new Decimal(curr.amount));
    }
    return acc;
  }, new Decimal(0));

  // reduce the total of the negative amounts regardless of category
  const totalNegative = data?.reduce((acc, curr) => {
    if (curr.amount < 0) {
      return acc.add(new Decimal(curr.amount));
    }
    return acc;
  }, new Decimal(0));

  const overallBalance = data?.reduce((acc, curr) => {
    return acc.add(new Decimal(curr.amount));
  }, new Decimal(0));

  // Rename the categoryTotals keys to their names from categoryData
  const categoryTotalsWithNames = Object.entries(categoryTotals || {}).reduce(
    (acc, [key, value]) => {
      const category = categoryData?.categories?.find(
        (categ) => categ.id === key
      );
      if (category) {
        acc[category.name] = value.toNumber();
      } else if (key === "uncategorized") {
        acc["Uncategorized"] = value.toNumber();
      }
      return acc;
    },
    {} as Record<string, number>
  );

  // Sort categories by descending absolute value
  const sortedCategories = Object.entries(categoryTotalsWithNames).sort(
    ([, a], [, b]) => Math.abs(b) - Math.abs(a)
  ); // Sort by absolute values in descending order

  const sortedKeys = sortedCategories.map(([key]) => key);
  const sortedValues = sortedCategories.map(([, value]) => value);

  const chartData = {
    series: [
      {
        name: "Amount",
        data: sortedValues,
      },
    ],
    options: {
      chart: {
        type: "bar",
        background: "transparent",
        // remove padding around
        margin: 0,
        toolbar: {
          show: false, // Hide hamburger menu
        },
        events: {
          dataPointSelection: (
            event: any,
            chartContext: any,
            {
              dataPointIndex,
              seriesIndex,
            }: { dataPointIndex: number; seriesIndex: number }
          ) => {
            const category: string = sortedKeys[dataPointIndex];

            router.push(
              `/dashboard/banks?month=${selectedMonth?.toISOString().split("T")[0]}&categories=${category}`
            );
          },
        },
      },
      xaxis: {
        categories: sortedKeys,
        labels: {
          show: !isPrivacyModeEnabled, // Hide x-axis labels if privacy mode is enabled
          style: {
            colors: ["#FFFFFF", "#FFFFFF"],
            fontSize: "12px",
            fontFamily: "inherit",
            fontWeight: 600,
          },
        },
      },
      yaxis: {
        labels: {
          style: {
            colors: sortedValues.map((_, index) => {
              return index % 2 === 0 ? "#FFFFFF" : "#D3D3D3"; // Alternating colors
            }),
            fontSize: "12px",
            fontFamily: "inherit",
            fontWeight: 600,
          },
        },
      },
      plotOptions: {
        bar: {
          horizontal: true,
          dataLabels: {
            position: "center", // Position data labels in the center
          },
          colors: {
            ranges: [
              {
                from: 0,
                to: Number.MAX_VALUE, // Positive range
                color: "#90EE90", // Color for positive values
              },
              {
                from: -Number.MAX_VALUE,
                to: -1,
                color: "#EF4444", // Color for negative values
              },
            ],
          },
        },
      },
      dataLabels: {
        enabled: !isPrivacyModeEnabled, // Enable data labels
        position: "center", // Position data labels in the center of the bars
        style: {
          // Set color dynamically based on value
          colors: sortedValues.map((value) =>
            value > 0 ? "#FFFFFF" : "#D3D3D3"
          ), // Use colors for positive and negative values
          fontSize: "12px",
          fontWeight: 500,
        },
        // offsetY: 0, // Adjust the offset of the data labels
        offsetX: 1000, // Adjust the offset of the data labels
        formatter: (val: number) => `${val}`, // Format the data label
      },
      tooltip: {
        theme: "dark", // Use the dark theme
        style: {
          fontSize: "12px",
          fontFamily: "inherit",
        },
        y: {
          formatter: (val: number) => `${val}`,
        },
        background: "#1E293B",
        borderColor: "#475569",
        textStyle: {
          color: "#F1F5F9", // Light text
        },
      },
    },
  } as any;

  return (
    <div className="border rounded-xl border-slate-600/25 p-3 mb-3 flex flex-col gap-2">
      <div className="flex flex-row justify-between items-center">
        <h1 className="text-slate-100 text-xl font-semibold">
          Monthly Breakdown
        </h1>
        <MonthPicker date={selectedMonth} setDate={setSelectedMonth} />
      </div>
      <div className="flex flex-row items-center  justify-center gap-5 px-3 mt-2  w-fit mx-auto">
        <p className="text-sm font-semibold">Money Flow:</p>
        <div className="flex flex-col sm:flex-row gap-2">
          <p className="text-green-500">
            {isPrivacyModeEnabled || isLoading
              ? `${baseCurrency?.symbol ?? ""}••••••`
              : parseAmount(totalPositive?.toNumber(), baseCurrency?.code)}
          </p>
          <p className="text-red-500">
            {isPrivacyModeEnabled || isLoading
              ? `${baseCurrency?.symbol ?? ""}••••••`
              : parseAmount(totalNegative?.toNumber(), baseCurrency?.code)}
          </p>

          <p
            className={clsx({
              "text-green-500": (totalPositive?.toNumber() ?? 0) > 0,
              "text-red-500": (totalPositive?.toNumber() ?? 0) < 0,
            })}
          >
            <span className="text-slate-200">=</span>{" "}
            {isPrivacyModeEnabled || isLoading
              ? `${baseCurrency?.symbol ?? ""}••••••`
              : parseAmount(overallBalance?.toNumber(), baseCurrency?.code)}
          </p>
        </div>
      </div>
      {isLoading ? (
        <div className="flex flex-col gap-1 pb-3">
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
        <div className="rounded-md mt-[-20px] min-h-64">
          <Chart
            options={chartData.options}
            series={chartData.series}
            type="bar"
            height={350}
          />
          <p className="text-slate-500 text-xs">
            *Since transactions can have multiple/no categories, the category
            breakdown may not be equal to money flow.
          </p>
        </div>
      )}
    </div>
  );
};
