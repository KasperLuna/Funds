"use client";
import React from "react";
import { usePlannedTransactions } from "../../store/PlannedTransactionsContext";
import { useBanksCategsContext } from "@/lib/hooks/useBanksCategsContext";
import { MixedDialogTrigger } from "../banks/MixedDialog";
import { Transaction } from "@/lib/types";
import { usePrivacyMode } from "@/lib/hooks/usePrivacyMode";
import { parseAmount, getLocalDateFromUTC } from "@/lib/utils";

const UpcomingPlannedTransactions: React.FC = () => {
  const { isPrivacyModeEnabled } = usePrivacyMode();
  const { plannedTransactions, updatePlannedTransaction } =
    usePlannedTransactions();
  const { bankData, categoryData, baseCurrency } =
    useBanksCategsContext() || {};
  const banks = bankData?.banks || [];
  const categories = categoryData?.categories || [];
  const upcoming =
    plannedTransactions?.filter((pt) => {
      const localDateTime = new Date();
      return (
        pt.active &&
        pt.invokeDate <= new Date(localDateTime.setHours(23, 59, 59, 999)) &&
        (!pt.previousDate || new Date(pt.previousDate) < localDateTime)
      );
    }) || [];

  // Helper to map bank id to name
  const getBankName = (id: string) =>
    banks.find((b) => b.id === id)?.name || id || "-";
  // Helper to map category ids to names

  if (!upcoming || upcoming.length === 0) return null;

  return (
    <div className="mb-4 border-b border-slate-700 pb-4">
      <div className="font-bold mb-2 text-lg flex items-center gap-2">
        Upcoming Planned Transactions
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {upcoming?.map((pt) => {
          const transaction: Transaction = {
            ...pt,
            id: undefined,
            date: new Date().toISOString(),
          };
          // Handler to update lastLoggedAt on planned transaction after submit
          return (
            <MixedDialogTrigger
              key={pt?.id || Math.random()}
              transaction={transaction}
              onPlannedSubmit={async () => {
                // On submit, move previousDate to current invokeDate, and calculate new invokeDate
                const prev = pt.invokeDate;
                let nextInvoke = new Date(prev);
                const interval = pt.recurrence.interval || 1;
                switch (pt.recurrence.frequency) {
                  case "daily":
                    nextInvoke.setDate(nextInvoke.getDate() + interval);
                    break;
                  case "weekly":
                    nextInvoke.setDate(nextInvoke.getDate() + 7 * interval);
                    break;
                  case "monthly":
                    nextInvoke.setMonth(nextInvoke.getMonth() + interval);
                    break;
                  case "yearly":
                    nextInvoke.setFullYear(nextInvoke.getFullYear() + interval);
                    break;
                  default:
                    nextInvoke.setMonth(nextInvoke.getMonth() + interval);
                }
                await updatePlannedTransaction({
                  ...pt,
                  previousDate: prev,
                  invokeDate: nextInvoke,
                });
              }}
            >
              <div
                role="button"
                className="flex flex-col justify-between transition-all flex-grow h-full text-slate-200 p-2 border-2 gap-2 border-slate-700 hover:border-slate-600 rounded-xl hover:bg-slate-800 hover:cursor-pointer overflow-clip"
              >
                <div className="flex flex-row w-full items-center justify-between gap-2">
                  <div className="flex flex-col text-start">
                    <div className="flex flex-row items-center gap-2">
                      <p className="text-nowrap">
                        {pt?.invokeDate
                          ? getLocalDateFromUTC(
                              pt.invokeDate,
                              pt.timezone
                            ).toLocaleDateString(undefined, {
                              month: "short",
                              day: "numeric",
                            })
                          : "-"}
                      </p>
                    </div>
                    <div className="h-[1px] w-8 bg-slate-700 my-1" />
                    <small>{getBankName(pt?.bank)}</small>
                  </div>
                  <div className="flex flex-col text-right">
                    <p
                      className={
                        pt.amount < 0
                          ? "text-lg font-semibold font-mono text-red-400"
                          : "text-lg font-semibold font-mono text-green-400"
                      }
                    >
                      {isPrivacyModeEnabled
                        ? `${baseCurrency?.symbol ?? "$"}••••••`
                        : parseAmount(pt.amount, baseCurrency?.code)}
                    </p>
                    <small className="text-balance">
                      {pt?.description?.length > 50
                        ? pt.description.slice(0, 50) + "..."
                        : pt?.description || (
                            <span className="italic text-slate-400">
                              (No description)
                            </span>
                          )}
                    </small>
                  </div>
                </div>
                <div className="flex flex-row flex-wrap w-full bg-slate-900 rounded-md p-1 gap-2 border-2 border-slate-700 min-h-8">
                  {(Array.isArray(pt.categories)
                    ? pt.categories
                    : [pt.categories]
                  )
                    .filter(Boolean)
                    .map((catId) => {
                      const cat = categories.find(
                        (c) => c.id === catId || c.name === catId
                      );
                      return (
                        <small
                          key={catId}
                          className="bg-slate-600 rounded-full whitespace-nowrap px-2"
                        >
                          {cat ? cat.name : catId}
                        </small>
                      );
                    })}
                </div>
              </div>
            </MixedDialogTrigger>
          );
        })}
      </div>
    </div>
  );
};

export default UpcomingPlannedTransactions;
