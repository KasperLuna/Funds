import clsx from "clsx";
import dayjs from "dayjs";
import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";

// Subcomponent: Trend Card
export const TrendCard = ({
  trend,
  isCurrentMonth,
  isPrivate,
  baseCurrency,
  parseAmount,
  trimToTwoDecimals,
}: {
  trend: {
    monthly_total: number;
    overall_user_balance: number;
    percentChange: number;
    year: number;
    month: string;
  };
  isCurrentMonth: boolean;
  isPrivate: boolean;
  baseCurrency?: { symbol?: string; code?: string } | null;
  parseAmount: (amount: number, currencyCode?: string) => string;
  trimToTwoDecimals: (value: number) => number | string;
}) => (
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
      prefetch={false}
      className={clsx(
        "flex flex-col mr-2 my-2 transition-all flex-grow h-full p-2 gap-2 rounded-xl bg-slate-900 hover:bg-slate-700",
        {
          "border-2 border-slate-600": isCurrentMonth,
          "border-slate-700 opacity-70": !isCurrentMonth,
        }
      )}
    >
      <p className="mx-auto">
        {dayjs(`${trend.year}-${trend.month}-01`).format("MMM YYYY")}
      </p>
      <div className="flex flex-row justify-between text-end items-center flex-wrap">
        <p className="text-slate-100 text-sm">
          {trimToTwoDecimals(trend?.percentChange || 0)}%
        </p>
        <div className="flex flex-col">
          <p className="text-xs">
            Net {trend.monthly_total > 0 ? "Income" : "Expense"}
          </p>
          <p
            className={clsx("font-semibold", {
              "text-red-400": trend.monthly_total < 0,
              "text-green-400": trend.monthly_total > 0,
            })}
          >
            {isPrivate
              ? `${baseCurrency?.symbol ?? "$"}••••••`
              : parseAmount(trend.monthly_total, baseCurrency?.code)}
          </p>
        </div>
      </div>
    </Link>
  </div>
);

// Subcomponent: Carousel
export const TrendsCarousel = ({
  trends,
  emblaRef,
  isPrivate,
  baseCurrency,
  parseAmount,
  trimToTwoDecimals,
  handlePrevClick,
  handleNextClick,
}: {
  trends: {
    monthly_total: number;
    overall_user_balance: number;
    percentChange: number;
    year: number;
    month: string;
  }[];
  emblaRef: React.RefObject<HTMLDivElement>;
  isPrivate: boolean;
  baseCurrency?: { symbol?: string; code?: string } | null;
  parseAmount: (amount: number, currencyCode?: string) => string;
  trimToTwoDecimals: (value: number) => number | string;
  handlePrevClick: () => void;
  handleNextClick: () => void;
}) => (
  <div className="relative h-full">
    <div className="overflow-hidden" ref={emblaRef}>
      <div className="flex">
        {trends?.map((trend) => {
          const isCurrentMonth =
            dayjs().month() === parseInt(trend.month) - 1 &&
            dayjs().year() === trend.year;
          return (
            <TrendCard
              key={`${trend.year}-${trend.month}`}
              trend={trend}
              isCurrentMonth={isCurrentMonth}
              isPrivate={isPrivate}
              baseCurrency={baseCurrency}
              parseAmount={parseAmount}
              trimToTwoDecimals={trimToTwoDecimals}
            />
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
);
