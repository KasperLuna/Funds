import { useBanksCategsContext } from "@/lib/hooks/useBanksCategsContext";
import { useBanksTrendsQuery } from "@/lib/hooks/useBanksTrendsQuery";
import { usePrivacyMode } from "@/lib/hooks/usePrivacyMode";
import { parseAmount, trimToTwoDecimals } from "@/lib/utils";
import clsx from "clsx";
import dayjs from "dayjs";
import useEmblaCarousel from "embla-carousel-react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import React, { useCallback } from "react";
import Decimal from "decimal.js";
import { Skeleton } from "@/components/ui/skeleton";
import dynamic from "next/dynamic";

const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });

//TODO: MAJORLY clean up this component
export const BankTrends = () => {
  const { baseCurrency } = useBanksCategsContext();
  const { trends: baseTrends, loading: isBankTrendsLoading } =
    useBanksTrendsQuery();
  const { isPrivacyModeEnabled } = usePrivacyMode();
  const [emblaRef, emblaApi] = useEmblaCarousel({
    skipSnaps: true,
    startIndex: baseTrends?.length ? baseTrends.length - 1 : 0,
    align: "end",
    loop: true,
  });

  const handlePrevClick = useCallback(() => {
    emblaApi?.scrollPrev();
  }, [emblaApi]);

  const handleNextClick = useCallback(() => {
    emblaApi?.scrollNext();
  }, [emblaApi]);

  // TODO: fix percent changeifier
  const trends = baseTrends
    .sort((a, b) => {
      if (a.year > b.year) return -1;
      if (a.year < b.year) return 1;
      if (a.month > b.month) return -1;
      if (a.month < b.month) return 1;
      return 0;
    })
    ?.map((trend, index) => {
      const nextTrend = baseTrends[index + 1];
      const percentChange = nextTrend
        ? new Decimal(trend.overall_user_balance)
            .sub(nextTrend.overall_user_balance)
            .div(nextTrend.overall_user_balance)
            .mul(100)
            .toNumber()
        : new Decimal(trend.monthly_total)
            .div(trend.overall_user_balance)
            .mul(100)
            .toNumber();

      return {
        ...trend,
        // monthly total to 2 decimal places
        monthly_total: trimToTwoDecimals(trend.monthly_total),
        overall_user_balance: trimToTwoDecimals(trend.overall_user_balance),
        percentChange,
      };
    })
    .reverse();

  const averageChange =
    trends.reduce((acc, trend) => {
      return acc + trend.percentChange;
    }, 0) / trends?.length;

  const averageIncome =
    trends.reduce((acc, trend) => {
      return acc + trend.monthly_total;
    }, 0) / trends?.length;

  if (isBankTrendsLoading) {
    return (
      <div className="flex flex-col gap-3 w-full ">
        <Skeleton className="h-8 w-[145px] bg-slate-800" />
        <Skeleton className="h-72 w-full bg-slate-800" />
        <Skeleton className="h-8 w-full bg-slate-800" />
        <div className="flex flex-row gap-4 justify-between">
          <Skeleton className="h-24 w-full bg-slate-800" />
          <Skeleton className="h-24 w-full bg-slate-800" />
          <Skeleton className="h-24 w-full bg-slate-800" />
        </div>
        <Skeleton className="h-8 w-full bg-slate-800" />
      </div>
    );
  }

  // Calculate the minimum value in both datasets
  const minValue = Math.min(
    ...trends.map((trend) => trend.monthly_total),
    ...trends.map((trend) => trend.overall_user_balance)
  );

  // Chart options with custom y-axis min value
  const chartOptions = {
    chart: {
      id: "bank-trends",
      type: "line",
      toolbar: {
        show: false,
      },
    },
    xaxis: {
      categories: trends.map(
        (trend) => dayjs(`${trend.year}-${trend.month}-01`).format("MMM YYYY") // Format to "Aug 2024"
      ),
      labels: {
        style: {
          colors: trends.map((_, index) => {
            // Generate colors for each x-axis label to match Tailwind's bg-slate-200
            return index % 2 === 0 ? "#E5E7EB" : "#D1D5DB"; // Alternating shades of slate-200
          }),
          fontSize: "12px",
          fontFamily: "inherit",
          fontWeight: 600,
        },
      },
    },
    stroke: {
      curve: "smooth",
      // width: 2,
    },
    fill: {
      type: "solid",
      opacity: [0.35, 1],
    },
    markers: {
      size: 4,
    },
    yaxis: {
      min: minValue,
      labels: {
        formatter: function (value) {
          return isPrivacyModeEnabled ? "••••••" : value;
        },
        style: {
          colors: Array.from({ length: 5 }, (_, index) => {
            // Adjust the length based on your y-axis values
            return index % 2 === 0 ? "#E5E7EB" : "#D1D5DB"; // Alternating shades of slate-200
          }),
          fontSize: "12px",
          fontFamily: "inherit",
          fontWeight: 600,
        },
      },
    },
    tooltip: {
      theme: "dark", // Use the dark theme
      style: {
        fontSize: "12px",
        fontFamily: "inherit",
      },
      y: {
        formatter: function (value) {
          return isPrivacyModeEnabled ? "••••••" : value;
        },
      },
      background: "#1E293B", // Custom dark background, similar to Tailwind's bg-slate-800
      borderColor: "#475569", // Match border with slate-600 or similar
      textStyle: {
        color: "#F1F5F9", // Light text (similar to slate-200 in Tailwind)
      },
    },
    legend: {
      show: true,
      position: "top", // You can set the position as needed
      labels: {
        colors: trends.map((_, index) => {
          // Generate colors for each legend item to match Tailwind's bg-slate-200
          return index % 2 === 0 ? "#E5E7EB" : "#D1D5DB"; // Alternating shades of slate-200
        }),
        fontSize: "12px",
        fontFamily: "inherit",
        fontWeight: 600,
      },
    },
  } as ApexCharts.ApexOptions;

  const chartSeries = [
    {
      name: "Monthly Total",
      data: trends.map((trend) => trend.monthly_total),
    },
    {
      name: "Overall User Balance",
      data: trends.map((trend) => trend.overall_user_balance), // Reverse the data here
    },
  ];

  return (
    <div
      id="bank-trends-section"
      className="w-full flex-shrink overflow-hidden"
    >
      <div className="flex flex-col h-full gap-1">
        <h1 className="text-slate-100 text-xl font-semibold">Monthly Trend</h1>
        {trends.length === 0 ? (
          <p className="text-slate-400">
            No data, visit the banks page and add transactions.
          </p>
        ) : (
          <>
            <div className="w-full h-[300px] lg:h-[500px]">
              <Chart
                options={chartOptions}
                series={chartSeries}
                type="line"
                height={300}
              />
            </div>
            <div className="flex flex-row justify-between bg-slate-800 p-2 rounded-sm">
              <p>
                Avg. Income{" "}
                <span className="text-xs">(for {trends?.length} months)</span>
              </p>
              <div className="flex flex-row align-middle items-center gap-2">
                <p className="text-sm">{trimToTwoDecimals(averageChange)}%</p>
                <p>
                  {isPrivacyModeEnabled
                    ? `${baseCurrency?.symbol ?? "$"}••••••`
                    : parseAmount(averageIncome, baseCurrency?.code)}
                </p>
              </div>
            </div>
            <div className="relative h-full">
              <div className="overflow-hidden" ref={emblaRef}>
                <div className="flex">
                  {trends?.map((trend) => {
                    const isCurrentMonth =
                      dayjs().month() === parseInt(trend.month) - 1 &&
                      dayjs().year() === trend.year;
                    return (
                      <div
                        key={`${trend.year}-${trend.month}`}
                        className={
                          "flex-shrink-0 h-full min-h-full w-1/2 md:w-1/3 lg:w-1/2 xl:w-1/3"
                        }
                      >
                        <Link
                          href={`/dashboard/banks?month=${dayjs(
                            new Date(trend.year, parseInt(trend.month), 0)
                          ).format("YYYY-MM-DD")}`}
                          className={clsx(
                            "flex flex-col mr-2 my-2 transition-all flex-grow h-full p-2 border-2 gap-2 rounded-xl hover:bg-slate-700",
                            {
                              "border-2 border-slate-100": isCurrentMonth,
                              "border-slate-700": !isCurrentMonth,
                            }
                          )}
                        >
                          <p className="mx-auto">
                            {dayjs(`${trend.year}-${trend.month}-01`).format(
                              "MMM YYYY"
                            )}
                          </p>
                          <div className="flex flex-row justify-between text-end items-center flex-wrap">
                            <p className="text-slate-100 text-sm">
                              {trimToTwoDecimals(trend?.percentChange || 0)}%
                            </p>
                            <div className="flex flex-col">
                              <p className="text-xs">
                                Net{" "}
                                {trend.monthly_total > 0 ? "Income" : "Expense"}
                              </p>
                              <p
                                className={clsx("font-semibold", {
                                  "text-red-400": trend.monthly_total < 0,
                                  "text-green-400": trend.monthly_total > 0,
                                })}
                              >
                                {isPrivacyModeEnabled
                                  ? `${baseCurrency?.symbol ?? "$"}••••••`
                                  : parseAmount(
                                      trend.monthly_total,
                                      baseCurrency?.code
                                    )}
                              </p>
                            </div>
                          </div>
                        </Link>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="flex flex-row gap-3 place-content-center items-center">
                <div className="border-t-2 border-slate-700 w-full"></div>
                <button
                  className="bg-gray-800 text-white p-2 rounded-full z-10 self-end"
                  onClick={handlePrevClick}
                >
                  <ChevronLeft />
                </button>
                <button
                  className="bg-gray-800 text-white p-2 rounded-full z-10"
                  onClick={handleNextClick}
                >
                  <ChevronRight />
                </button>
                <div className="border-t-2 border-slate-700 w-full"></div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
