"use client";

import { memo, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Decimal from "decimal.js";
import dynamic from "next/dynamic";
import dayjs from "dayjs";

import { MonthPicker } from "@/components/MonthPicker";
import { Skeleton } from "@/components/ui/skeleton";
import {
  getBanksChartOptions,
  getBanksCountChartOptions,
} from "./chartOptions";
import { getTransactionsOfAMonth } from "@/lib/pocketbase/queries";
import { usePrivacy } from "@/hooks/usePrivacy";
import { useQueryParams } from "@/lib/hooks/useQueryParams";
import { useBanksQuery } from "@/lib/hooks/useBanksQuery";
import { Bank } from "@/lib/types";
import { cn } from "@/lib/utils";

const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });

export const BankBreakdown = memo(function BankBreakdown() {
  const { queryParams, setQueryParams } = useQueryParams();
  const { isPrivate } = usePrivacy();
  const bankData = useBanksQuery();

  const selectedMonth = queryParams["monthlyFilter"]
    ? new Date(queryParams["monthlyFilter"])
    : new Date();

  const { data, isLoading } = useQuery({
    queryKey: ["transactionsOfMonth", selectedMonth?.toDateString()],
    queryFn: () => getTransactionsOfAMonth(selectedMonth?.toISOString() || ""),
  });

  const [chartType, setChartType] = useState<"totals" | "counts">("totals");

  const banksMemoized = useMemo(() => {
    if (!data)
      return {
        sortedBanks: [],
        sortedTotals: [],
        sortedCounts: [],
        sortedBankNames: [],
      };
    const totals: Record<string, Decimal> = {};
    const counts: Record<string, Decimal> = {};
    data.forEach((txn) => {
      const bankId = txn.bank || "Unknown Bank";
      if (!totals[bankId]) totals[bankId] = new Decimal(0);
      if (!counts[bankId]) counts[bankId] = new Decimal(0);
      totals[bankId] = totals[bankId].add(new Decimal(txn.amount));
      counts[bankId] = counts[bankId].add(1);
    });
    const sortedBanks = Object.entries(totals).sort(
      ([, a], [, b]) => a.abs().cmp(b.abs()) * -1,
    );
    const sortedBankIds = sortedBanks.map(([key]) => key);
    const bankIdToName: Record<string, string> = (bankData?.banks || []).reduce(
      (acc: Record<string, string>, bank: Bank) => {
        acc[bank.id] = bank.name;
        return acc;
      },
      {},
    );
    return {
      sortedBanks: sortedBankIds,
      sortedTotals: sortedBanks.map(([, value]) => value.toNumber()),
      sortedCounts: sortedBankIds.map((bank) => counts[bank]?.toNumber() || 0),
      sortedBankNames: sortedBankIds.map((id) => bankIdToName[id] || id),
    };
  }, [data, bankData]);

  return (
    <div className="border rounded-xl border-slate-600/25 p-3 mb-3 flex flex-col gap-2">
      <div className="flex flex-row justify-between items-center">
        <h3 className="text-base font-semibold text-slate-200">
          Bank Breakdown
        </h3>
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
        View totals and transaction counts by bank for the selected month.
      </p>

      {/* Inline toggle for chart type — not tabs */}
      <div className="flex items-center gap-1 w-fit rounded-lg bg-slate-800/60 border border-slate-700/50 p-0.5">
        <button
          className={cn(
            "px-3 py-1 text-xs font-medium rounded-md transition-all duration-200",
            chartType === "totals"
              ? "bg-slate-700 text-slate-100 shadow-sm"
              : "text-slate-400 hover:text-slate-200",
          )}
          onClick={() => setChartType("totals")}
        >
          Totals
        </button>
        <button
          className={cn(
            "px-3 py-1 text-xs font-medium rounded-md transition-all duration-200",
            chartType === "counts"
              ? "bg-slate-700 text-slate-100 shadow-sm"
              : "text-slate-400 hover:text-slate-200",
          )}
          onClick={() => setChartType("counts")}
        >
          Counts
        </button>
      </div>

      <div className="bg-slate-900/60 rounded-lg p-3 min-h-[350px]">
        {isLoading && (
          <div className="flex flex-col gap-3 pb-3">
            {Array.from({ length: 6 }, (_, i) => (
              <Skeleton
                key={`skel-bank-${i}`}
                className="h-7 w-full bg-slate-800"
              />
            ))}
          </div>
        )}
        {!isLoading && !data?.length && (
          <div className="flex flex-col justify-center items-center text-center h-64">
            <span className="text-lg">No Data Yet.</span>
            <br />
            <span className="text-sm">
              Add transactions for the selected month to see breakdown.
            </span>
          </div>
        )}
        {!isLoading && !!data?.length && chartType === "totals" && (
          <Chart
            options={getBanksChartOptions({
              sortedBanks: banksMemoized.sortedBanks,
              sortedTotals: banksMemoized.sortedTotals,
              isPrivate,
              sortedBankNames: banksMemoized.sortedBankNames,
            })}
            series={[{ name: "Total", data: banksMemoized.sortedTotals }]}
            type="bar"
            height={350}
          />
        )}
        {!isLoading && !!data?.length && chartType === "counts" && (
          <Chart
            options={getBanksCountChartOptions({
              sortedBanks: banksMemoized.sortedBanks,
              sortedCounts: banksMemoized.sortedCounts,
              isPrivate,
              sortedBankNames: banksMemoized.sortedBankNames,
            })}
            series={[
              { name: "Transactions", data: banksMemoized.sortedCounts },
            ]}
            type="bar"
            height={350}
          />
        )}
      </div>
    </div>
  );
});
