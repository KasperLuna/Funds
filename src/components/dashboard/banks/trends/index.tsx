import { useBanksCategsContext } from "@/lib/hooks/useBanksCategsContext";
import { useBanksTrendsQuery } from "@/lib/hooks/useBanksTrendsQuery";
import { usePrivacyMode } from "@/lib/hooks/usePrivacyMode";
import { parseAmount, trimToTwoDecimals } from "@/lib/utils";
import dayjs from "dayjs";
import useEmblaCarousel from "embla-carousel-react";
import React, { useCallback } from "react";
import Decimal from "decimal.js";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendsChart } from "./TrendsChart";
import { TrendsCarousel } from "./TrendsCarousel";

// Subcomponent: Average Summary
type BankTrendsSummaryProps = {
  trendsLength: number;
  averageChange: number;
  averageIncome: number;
  isPrivacyModeEnabled: boolean;
  baseCurrency?: { symbol?: string; code?: string } | null;
  parseAmount: (amount: number, currencyCode?: string) => string;
  trimToTwoDecimals: (value: number) => number | string;
};

const BankTrendsSummary = ({
  trendsLength,
  averageChange,
  averageIncome,
  isPrivacyModeEnabled,
  baseCurrency,
  parseAmount,
  trimToTwoDecimals,
}: BankTrendsSummaryProps) => (
  <div className="flex flex-row justify-between bg-slate-900 p-2 rounded-sm">
    <p>
      Avg. Income{" "}
      <span className="text-xs text-gray-400">(for {trendsLength} months)</span>
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
);

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
      categories: trends.map((trend) =>
        dayjs(`${trend.year}-${trend.month}-01`).format("MMM YYYY")
      ),
      labels: {
        style: {
          colors: trends.map((_, index) => {
            return index % 2 === 0 ? "#E5E7EB" : "#D1D5DB";
          }),
          fontSize: "12px",
          fontFamily: "inherit",
          fontWeight: 600,
        },
      },
    },
    stroke: {
      curve: "smooth",
    },
    fill: {
      type: "solid",
      opacity: [0.35, 1],
    },
    markers: {
      size: 2,
    },
    yaxis: {
      min: (min) => min,
      max: (max) => max,
      labels: {
        formatter: function (value) {
          return isPrivacyModeEnabled ? "••••••" : value;
        },
        style: {
          colors: Array.from({ length: 5 }, (_, index) => {
            return index % 2 === 0 ? "#E5E7EB" : "#D1D5DB";
          }),
          fontSize: "12px",
          fontFamily: "inherit",
          fontWeight: 600,
        },
      },
    },
    grid: {
      show: true,
      borderColor: "#1E293B", // Tailwind slate-800
      strokeDashArray: 0,
      xaxis: {
        lines: {
          show: false,
        },
      },
      yaxis: {
        lines: {
          show: true,
        },
      },
    },
    tooltip: {
      theme: "dark",
      style: {
        fontSize: "12px",
        fontFamily: "inherit",
      },
      y: {
        formatter: function (value) {
          return isPrivacyModeEnabled ? "••••••" : value;
        },
      },
      background: "#1E293B",
      borderColor: "#475569",
      textStyle: {
        color: "#F1F5F9",
      },
    },
    legend: {
      show: true,
      position: "top",
      labels: {
        colors: trends.map((_, index) => {
          return index % 2 === 0 ? "#E5E7EB" : "#D1D5DB";
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
            <div className="h-[300px] w-full overflow-hidden">
              <TrendsChart options={chartOptions} series={chartSeries} />
            </div>

            <BankTrendsSummary
              trendsLength={trends.length}
              averageChange={averageChange}
              averageIncome={averageIncome}
              isPrivacyModeEnabled={isPrivacyModeEnabled}
              baseCurrency={baseCurrency}
              parseAmount={parseAmount}
              trimToTwoDecimals={trimToTwoDecimals}
            />
            <TrendsCarousel
              trends={trends}
              emblaRef={emblaRef as unknown as React.RefObject<HTMLDivElement>}
              isPrivacyModeEnabled={isPrivacyModeEnabled}
              baseCurrency={baseCurrency}
              parseAmount={parseAmount}
              trimToTwoDecimals={trimToTwoDecimals}
              handlePrevClick={handlePrevClick}
              handleNextClick={handleNextClick}
            />
          </>
        )}
      </div>
    </div>
  );
};
