"use client";

import { memo, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import Decimal from "decimal.js";
import dayjs from "dayjs";

import { MonthPicker } from "@/components/MonthPicker";
import { Skeleton } from "@/components/ui/skeleton";
import { getTransactionsOfAMonth } from "@/lib/pocketbase/queries";
import { useQueryParams } from "@/lib/hooks/useQueryParams";
import { useUserQuery } from "@/lib/hooks/useUserQuery";
import { cn, parseAmount } from "@/lib/utils";

type CellData = { day: number | null; value: number };

function getTransactionColor(count: number): string {
  if (count >= 8) return "bg-red-700";
  if (count >= 5) return "bg-orange-600";
  if (count >= 2) return "bg-yellow-500";
  if (count > 0) return "bg-green-400";
  return "bg-slate-800";
}

function getPositiveTotalColor(rel: number): string {
  if (rel > 0.5) return "bg-green-600";
  if (rel > 0.25) return "bg-green-700";
  if (rel > 0.1) return "bg-green-800";
  return "bg-green-500";
}

function getNegativeTotalColor(rel: number): string {
  if (rel < -0.5) return "bg-red-600";
  if (rel < -0.25) return "bg-red-700";
  if (rel < -0.1) return "bg-red-800";
  return "bg-red-500";
}

function getCellColor(
  cell: CellData,
  mode: "total" | "transactions",
  monthlyTotal: number,
): string {
  if (cell.day === null) return "bg-slate-800";
  if (mode === "transactions") return getTransactionColor(cell.value);
  const rel = cell.value / monthlyTotal;
  if (cell.value > 0) return getPositiveTotalColor(rel);
  if (cell.value < 0) return getNegativeTotalColor(rel);
  return "bg-slate-800";
}

function buildWeeks(selectedMonth: Date, values: number[]): CellData[][] {
  const daysInMonth = dayjs(selectedMonth).daysInMonth();
  const firstDayOfWeek = new Date(
    selectedMonth.getFullYear(),
    selectedMonth.getMonth(),
    1,
  ).getDay();

  const weeks: CellData[][] = [];
  let week: CellData[] = [];

  for (let i = 0; i < firstDayOfWeek; i++) {
    week.push({ day: null, value: 0 });
  }
  for (let day = 1; day <= daysInMonth; day++) {
    week.push({ day, value: values[day - 1] || 0 });
    if (week.length === 7) {
      weeks.push(week);
      week = [];
    }
  }
  if (week.length > 0) {
    while (week.length < 7) week.push({ day: null, value: 0 });
    weeks.push(week);
  }
  return weeks;
}

function formatTooltip(
  cell: CellData,
  mode: "total" | "transactions",
  selectedMonth: Date,
  currencyCode?: string,
): string | undefined {
  if (cell.day === null) return undefined;
  const year = selectedMonth.getFullYear();
  const month = selectedMonth.getMonth();
  const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(cell.day).padStart(2, "0")}`;
  if (mode === "transactions")
    return `${dateStr}: ${cell.value} transaction${cell.value === 1 ? "" : "s"}`;
  return `${dateStr}: ${parseAmount(cell.value, currencyCode)}`;
}

const CalendarGrid = memo(function CalendarGrid({
  weeks,
  mode,
  monthlyTotal,
  selectedMonth,
  currencyCode,
}: {
  weeks: CellData[][];
  mode: "total" | "transactions";
  monthlyTotal: number;
  selectedMonth: Date;
  currencyCode?: string;
}) {
  return (
    <div className="rounded-md flex flex-col items-center w-full">
      <div className="flex flex-row w-full justify-center mb-1 gap-1">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
          <div
            key={d}
            className="flex-1 min-w-0 text-center text-xs text-slate-300 font-semibold"
          >
            {d}
          </div>
        ))}
      </div>
      <div className="flex flex-col gap-1 w-full">
        {weeks.map((weekRow, i) => (
          <div
            key={JSON.stringify(weekRow)}
            className="flex flex-row gap-1 w-full"
          >
            {weekRow.map((cell, j) => {
              const tooltip = formatTooltip(
                cell,
                mode,
                selectedMonth,
                currencyCode,
              );
              return (
                <div
                  key={`${cell.day}-${i}-${j}`}
                  className={`flex-1 min-w-0 max-h-[30px] aspect-square flex items-center justify-center rounded transition-colors duration-200 relative group ${getCellColor(cell, mode, monthlyTotal)}`}
                  title={tooltip}
                >
                  <span className="text-lg font-mono select-none text-white">
                    {cell.day ? cell.day : ""}
                  </span>
                  {cell.day && (
                    <span className="absolute z-10 left-1/2 -translate-x-1/2 top-10 scale-0 group-hover:scale-100 transition-transform bg-slate-900 text-slate-100 text-xs px-2 py-1 rounded shadow-lg pointer-events-none whitespace-nowrap">
                      {tooltip}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
});

export const HistoryBreakdown = memo(function HistoryBreakdown() {
  const { queryParams, setQueryParams } = useQueryParams();
  const { baseCurrency } = useUserQuery();

  const selectedMonth = queryParams["monthlyFilter"]
    ? new Date(queryParams["monthlyFilter"])
    : new Date();

  const { data, isLoading } = useQuery({
    queryKey: ["transactionsOfMonth", selectedMonth?.toDateString()],
    queryFn: () => getTransactionsOfAMonth(selectedMonth?.toISOString() || ""),
  });

  const viewType = (queryParams["historyView"] ?? "total") as
    | "total"
    | "transactions";

  const overallBalance = useMemo(
    () =>
      data?.reduce((acc, curr) => {
        if (curr.categories.length > 0)
          return acc.add(new Decimal(curr.amount));
        return acc;
      }, new Decimal(0)),
    [data],
  );

  const historyMemoized = useMemo(() => {
    if (!data || !selectedMonth)
      return { counts: [] as number[], totals: [] as number[] };
    const daysInMonth = dayjs(selectedMonth).daysInMonth();
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
    return { counts, totals };
  }, [data, selectedMonth]);

  const monthlyTotal = overallBalance?.toNumber() || 1;
  const values =
    viewType === "transactions"
      ? historyMemoized.counts
      : historyMemoized.totals;
  const weeks = buildWeeks(selectedMonth, values);

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex flex-col gap-3 pb-3">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton
              key={`skel-hist-${i}`}
              className="h-7 w-full bg-slate-800"
            />
          ))}
        </div>
      );
    }

    if (!data?.length) {
      return (
        <div className="flex flex-col justify-center items-center text-center h-64">
          <span className="text-lg">No Data Yet.</span>
          <br />
          <span className="text-sm">
            Add transactions for the selected month to see breakdown.
          </span>
        </div>
      );
    }

    return (
      <CalendarGrid
        weeks={weeks}
        mode={viewType}
        monthlyTotal={monthlyTotal}
        selectedMonth={selectedMonth}
        currencyCode={baseCurrency?.code}
      />
    );
  };

  return (
    <div className="border rounded-xl border-slate-600/25 p-3 mb-3 flex flex-col gap-2">
      <div className="flex flex-row justify-between items-center">
        <h3 className="text-base font-semibold text-slate-200">History</h3>
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

      <p className="text-xs text-slate-400">
        See your daily totals and transaction activity for the selected month.
      </p>

      {/* Inline toggle — not tabs */}
      <div className="flex items-center gap-1 w-fit rounded-lg bg-slate-800/60 border border-slate-700/50 p-0.5">
        <button
          className={cn(
            "px-3 py-1 text-xs font-medium rounded-md transition-all duration-200",
            viewType === "total"
              ? "bg-slate-700 text-slate-100 shadow-sm"
              : "text-slate-400 hover:text-slate-200",
          )}
          onClick={() => setQueryParams({ historyView: "total" })}
        >
          Total
        </button>
        <button
          className={cn(
            "px-3 py-1 text-xs font-medium rounded-md transition-all duration-200",
            viewType === "transactions"
              ? "bg-slate-700 text-slate-100 shadow-sm"
              : "text-slate-400 hover:text-slate-200",
          )}
          onClick={() => setQueryParams({ historyView: "transactions" })}
        >
          Transactions
        </button>
      </div>

      <div className="bg-slate-900/60 rounded-lg p-3 min-h-[350px]">
        {renderContent()}
      </div>
    </div>
  );
});
