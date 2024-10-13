import { MonthPicker } from "@/components/MonthPicker";
import { useBanksCategsContext } from "@/lib/hooks/useBanksCategsContext";
import { getTransactionsOfAMonth } from "@/lib/pocketbase/queries";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import Decimal from "decimal.js";
import ReactApexChart from "react-apexcharts";
import { usePrivacyMode } from "@/lib/hooks/usePrivacyMode";

export const MonthlyBreakdown = () => {
  const { isPrivacyModeEnabled } = usePrivacyMode();
  const { categoryData } = useBanksCategsContext();
  const [selectedMonth, setSelectedMonth] = useState<Date | undefined>(
    new Date()
  );

  const { data } = useQuery({
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
        toolbar: {
          show: false, // Hide hamburger menu
        },
      },
      xaxis: {
        categories: sortedKeys,
        labels: {
          show: !isPrivacyModeEnabled, // Hide x-axis labels if privacy mode is enabled
          style: {
            colors: sortedKeys.map((_, index) => {
              // Generate colors for each x-axis label to match Tailwind's bg-slate-200
              return index % 2 === 0 ? "#E5E7EB" : "#D1D5DB"; // Alternating shades of slate-200
            }),
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
              // Generate colors for each y-axis label to match Tailwind's bg-slate-200
              return index % 2 === 0 ? "#E5E7EB" : "#D1D5DB"; // Alternating shades of slate-200
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
        },
      },
      dataLabels: {
        enabled: false,
      },
      fill: {
        colors: ["#3b82f6"], // Set your desired color
      },
      tooltip: {
        theme: "dark", // Use the dark theme
        style: {
          fontSize: "12px",
          fontFamily: "inherit",
        },
        y: {
          formatter: (val) => `${val}`,
        },
        background: "#1E293B", // Custom dark background, similar to Tailwind's bg-slate-800
        borderColor: "#475569", // Match border with slate-600 or similar
        textStyle: {
          color: "#F1F5F9", // Light text (similar to slate-200 in Tailwind)
        },
      },
    },
  };

  return (
    <div className="border rounded-xl border-slate-600/25 p-3 pb-0 mb-3">
      <div className="flex flex-row justify-between items-center">
        <h1 className="text-slate-100 text-xl font-semibold">
          Monthly Breakdown
        </h1>
        <MonthPicker date={selectedMonth} setDate={setSelectedMonth} />
      </div>
      <div className="mt-4">
        <ReactApexChart
          options={chartData.options}
          series={chartData.series}
          type="bar"
          height={350}
        />
      </div>
    </div>
  );
};
