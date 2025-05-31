"use client";
import React from "react";
import { usePlannedTransactions } from "../../store/PlannedTransactionsContext";
import { useBanksCategsContext } from "@/lib/hooks/useBanksCategsContext";
import { MixedDialogTrigger } from "../banks/MixedDialog";
import { Transaction } from "@/lib/types";
import { usePrivacyMode } from "@/lib/hooks/usePrivacyMode";
import { parseAmount } from "@/lib/utils";
import { TransactionCardLoader } from "@/components/banks/transactions/TransactionCardLoader";
import UpcomingPlannedTransactionCard from "./UpcomingPlannedTransactionCard";

const UpcomingPlannedTransactions: React.FC = () => {
  const { isPrivacyModeEnabled } = usePrivacyMode();
  const { plannedTransactions, updatePlannedTransaction, loading } =
    usePlannedTransactions();
  const { bankData, categoryData, baseCurrency } =
    useBanksCategsContext() || {};
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

  // Loading state
  if (loading || bankData?.loading || categoryData?.loading) {
    return (
      <div className="mb-4 border-b border-slate-700 pb-4">
        <div className="font-bold mb-2 text-lg flex items-center gap-2">
          Upcoming Planned Transactions
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[...Array(4)].map((_, index) => (
            <TransactionCardLoader key={index} />
          ))}
        </div>
      </div>
    );
  }

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
          return (
            <div key={pt?.id || Math.random()} className="relative group">
              <MixedDialogTrigger
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
                      nextInvoke.setFullYear(
                        nextInvoke.getFullYear() + interval
                      );
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
                <div className="relative">
                  <UpcomingPlannedTransactionCard
                    pt={pt}
                    categories={categories}
                    baseCurrency={baseCurrency}
                    isPrivacyModeEnabled={isPrivacyModeEnabled}
                    parseAmount={parseAmount}
                  />
                </div>
              </MixedDialogTrigger>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default UpcomingPlannedTransactions;
