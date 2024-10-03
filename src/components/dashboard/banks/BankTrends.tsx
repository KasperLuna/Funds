import { useBanksTrendsQuery } from "@/lib/hooks/useBanksTrendsQuery";
import { usePrivacyMode } from "@/lib/hooks/usePrivacyMode";
import { parseAmount, trimToTwoDecimals } from "@/lib/utils";
import clsx from "clsx";
import { isSameMonth } from "date-fns";
import dayjs from "dayjs";
import useEmblaCarousel from "embla-carousel-react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import React, { useCallback } from "react";

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

  //TODO: fix percent changeifier
  const trends = baseTrends
    .sort((a, b) => {
      if (a.year > b.year) return -1;
      if (a.year < b.year) return 1;
      if (a.month > b.month) return -1;
      if (a.month < b.month) return 1;
      return 0;
    })
    ?.map((trend, index) => {
      const percentChange = baseTrends[index + 1]
        ? ((trend.overall_user_balance -
            baseTrends[index + 1].overall_user_balance) /
            baseTrends[index + 1].overall_user_balance) *
          100
        : (trend.monthly_total / trend.overall_user_balance) * 100;

      return {
        ...trend,
        percentChange,
      };
    });
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
        <Skeleton className="h-60 w-full bg-slate-800" />
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

  return (
    <div
      id="bank-trends-section"
      className="w-full flex-shrink overflow-hidden "
    >
      <div className="flex flex-col h-full min-h-full gap-1">
        <h1 className="text-slate-100 text-xl font-semibold">Monthly Trend</h1>
        {trends.length === 0 ? (
          <p className="text-slate-400">
            No data, visit the banks page and add transactions.
          </p>
        ) : (
          <>
            {" "}
            <div className="w-full h-[300px] lg:h-[500px]">
              <LineChart data={trends} isLabelsHidden={isPrivacyModeEnabled} />
            </div>
            <div className="flex flex-row justify-between bg-slate-800 p-2 rounded-sm">
              <p>Avg. Income (for {trends?.length} months)</p>
              <div className="flex flex-row align-middle gap-2">
                <p>{trimToTwoDecimals(averageChange)}%</p>
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
                  {trends?.reverse().map((trend) => {
                    const isCurrentMonth = isSameMonth(
                      new Date(`${trend.year}-${trend.month}-01`),
                      new Date()
                    );
                    return (
                      <div
                        key={`${trend.year}-${trend.month}`}
                        className={
                          "flex-shrink-0 h-full min-h-full w-1/2 md:w-1/3 lg:w-1/2 xl:w-1/3 "
                        }
                      >
                        <Link
                          href={`/dashboard/banks?month=${dayjs(
                            //last day of month
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
                            <p className="text-slate-100">
                              {trimToTwoDecimals(trend?.percentChange || 0)}%
                            </p>
                            <div className="flex flex-col">
                              <p className="text-xs">
                                Net{" "}
                                {trend.monthly_total > 0 ? "Income" : "Expense"}
                              </p>
                              <p className="text-slate-300">
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

// utils/transformData.ts

// import { ChartDataItem } from '../types';

interface TransformedData {
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    borderColor: string;
    backgroundColor: string;
    borderWidth: number;
    fill: boolean;
  }[];
}

export const transformData = (data: any[]): any => {
  const labels = data.map((item) => `${item.month} ${item.year}`);
  const monthlyTotals = data.map((item) => item.monthly_total);
  const overallBalances = data.map((item) => item.overall_user_balance);

  return {
    labels,
    datasets: [
      {
        label: "Monthly Total",
        data: monthlyTotals,
        borderColor: "rgba(75, 192, 192, 1)",
        backgroundColor: "rgba(75, 192, 192, 0.2)",
        borderWidth: 1,
        fill: true,
      },
      {
        label: "Overall User Balance",
        data: overallBalances,
        borderColor: "rgba(153, 102, 255, 1)",
        backgroundColor: "rgba(153, 102, 255, 0.2)",
        borderWidth: 1,
        fill: false,
      },
    ],
  };
};

import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  Title,
  Tooltip,
  Legend,
  LineElement,
  PointElement,
  CategoryScale,
  LinearScale,
} from "chart.js";
import Link from "next/link";
import { useBanksCategsContext } from "@/lib/hooks/useBanksCategsContext";
import { Skeleton } from "@/components/ui/skeleton";

// Register the components required for the chart
ChartJS.register(
  Title,
  Tooltip,
  Legend,
  LineElement,
  PointElement,
  CategoryScale,
  LinearScale
);

interface LineChartProps {
  data: any[];
  isLabelsHidden?: boolean;
}

const LineChart: React.FC<LineChartProps> = ({ data, isLabelsHidden }) => {
  const chartData = transformData(data);

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "top" as const,
      },
      tooltip: {
        callbacks: {
          label: function (tooltipItem: any) {
            return `${tooltipItem.dataset.label}: ${tooltipItem.raw}`;
          },
        },
      },
    },
    ...(isLabelsHidden
      ? { scales: { y: { display: false } } }
      : { scales: { y: { display: true } } }),
  };

  return <Line data={chartData} options={options} />;
};
