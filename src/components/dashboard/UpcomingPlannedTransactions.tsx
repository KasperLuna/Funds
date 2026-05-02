"use client";
import React, { memo, useState, useMemo } from "react";
import { MixedDialogTrigger } from "../banks/MixedDialog";
import { AddPlannedDialog, AddTemplateDialog } from "../banks/EntityDialogs";
import { PlannedTransaction, Transaction } from "@/lib/types";
import { usePrivacy } from "@/hooks/usePrivacy";
import { parseAmount } from "@/lib/utils";
import { TransactionCardLoader } from "@/components/banks/transactions/TransactionCardLoader";
import { UpcomingPlannedTransactionCard } from "./UpcomingPlannedTransactionCard";
import { EditPlannedTransactionDialog } from "./EditPlannedTransactionDialog";
import { Calendar, Clock, ChevronDown, ChevronUp } from "lucide-react";
import { usePlannedTransactions } from "@/hooks/usePlannedTransactions";
import { useBanksQuery } from "@/lib/hooks/useBanksQuery";
import { useCategoriesQuery } from "@/lib/hooks/useCategoriesQuery";
import { useUserQuery } from "@/lib/hooks/useUserQuery";

const UpcomingPlannedTransactions = memo(
  function UpcomingPlannedTransactions() {
    const [showAll, setShowAll] = useState(false);
    const [editingPt, setEditingPt] = useState<PlannedTransaction | null>(null);
    const { isPrivate } = usePrivacy();
    const { plannedTransactions, updatePlannedTransaction, loading } =
      usePlannedTransactions();
    const bankData = useBanksQuery();
    const categoryData = useCategoriesQuery();
    const { baseCurrency } = useUserQuery();
    const categories = categoryData?.categories || [];

    const upcoming = useMemo(() => {
      if (!plannedTransactions) return [];
      const localDateTime = new Date();

      if (showAll) {
        // Show all active planned transactions sorted by invokeDate
        return plannedTransactions
          .filter((pt) => pt.active)
          .sort(
            (a, b) =>
              (a.invokeDate?.getTime() ?? 0) - (b.invokeDate?.getTime() ?? 0),
          );
      }

      const twoDaysFromNow = new Date(localDateTime);
      twoDaysFromNow.setDate(twoDaysFromNow.getDate() + 2);
      twoDaysFromNow.setHours(23, 59, 59, 999);

      return plannedTransactions.filter(
        (pt) =>
          pt.active &&
          pt.invokeDate &&
          pt.invokeDate <= twoDaysFromNow &&
          (!pt.previousDate || new Date(pt.previousDate) < localDateTime),
      );
    }, [plannedTransactions, showAll]);

    const totalActive =
      plannedTransactions?.filter((pt) => pt.active).length ?? 0;

    // Loading state
    if (loading || bankData?.loading || categoryData?.loading) {
      return (
        <div className="relative mb-3 border-b border-slate-700/50 pb-3">
          <div className="absolute inset-0 bg-gradient-to-r from-purple-500/5 to-blue-500/5 rounded-xl pointer-events-none" />
          <div className="relative z-10 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
            {[...Array(4)].map((_, index) => (
              <div key={index} className="relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-slate-600/20 to-transparent -translate-x-full animate-shimmer pointer-events-none" />
                <TransactionCardLoader />
              </div>
            ))}
          </div>
        </div>
      );
    }

    if (!upcoming || (upcoming.length === 0 && !showAll)) {
      if (totalActive > 0) {
        // There are active planned transactions but none due soon — show a toggle
        return (
          <div className="relative mb-3 border-b border-slate-700/50 pb-3">
            <div className="flex items-center gap-3 p-1 flex-wrap">
              <div className="flex items-center gap-2 px-2 py-1 rounded-lg bg-slate-800/60 backdrop-blur-sm border border-slate-700/50">
                <Calendar className="w-4 h-4 text-emerald-400" />
                <span className="font-bold text-base text-slate-100">
                  Planned Transactions
                </span>
              </div>
              <button
                onClick={() => setShowAll(true)}
                className="flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-medium bg-slate-800/60 hover:bg-slate-700/60 border border-slate-700/50 text-slate-300 hover:text-slate-100 transition-all duration-200"
              >
                View All ({totalActive})
                <ChevronDown className="w-3 h-3" />
              </button>
              <AddPlannedDialog>
                <button className="flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-medium bg-slate-800/60 hover:bg-slate-700/60 border border-slate-700/50 text-slate-300 hover:text-slate-100 transition-all duration-200">
                  + Planned
                </button>
              </AddPlannedDialog>
              <AddTemplateDialog>
                <button className="flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-medium bg-slate-800/60 hover:bg-slate-700/60 border border-slate-700/50 text-slate-300 hover:text-slate-100 transition-all duration-200">
                  + Template
                </button>
              </AddTemplateDialog>
            </div>
          </div>
        );
      }
      return null;
    }

    return (
      <div className="relative mb-3 border-b border-slate-700/50 pb-3">
        <div className="absolute inset-0 bg-gradient-to-r from-purple-500/5 to-blue-500/5 rounded-xl pointer-events-none" />
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2 p-1 flex-wrap">
            <div className="flex items-center gap-2 px-2 py-1 rounded-lg bg-slate-800/60 backdrop-blur-sm border border-slate-700/50">
              <Calendar className="w-4 h-4 text-emerald-400" />
              <span className="font-bold text-base text-slate-100">
                {showAll
                  ? "All Planned Transactions"
                  : "Upcoming Planned Transactions"}
              </span>
              <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/30">
                <Clock className="w-3 h-3 text-emerald-400" />
                <span className="text-xs text-emerald-300 font-medium">
                  {upcoming.length}
                </span>
              </div>
            </div>
            <button
              onClick={() => setShowAll((prev) => !prev)}
              className="flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-medium bg-slate-800/60 hover:bg-slate-700/60 border border-slate-700/50 text-slate-300 hover:text-slate-100 transition-all duration-200"
            >
              {showAll ? (
                <>
                  Due Soon
                  <ChevronUp className="w-3 h-3" />
                </>
              ) : (
                <>
                  View All ({totalActive})
                  <ChevronDown className="w-3 h-3" />
                </>
              )}
            </button>
            <AddPlannedDialog>
              <button className="flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-medium bg-slate-800/60 hover:bg-slate-700/60 border border-slate-700/50 text-slate-300 hover:text-slate-100 transition-all duration-200">
                + Planned
              </button>
            </AddPlannedDialog>
            <AddTemplateDialog>
              <button className="flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-medium bg-slate-800/60 hover:bg-slate-700/60 border border-slate-700/50 text-slate-300 hover:text-slate-100 transition-all duration-200">
                + Template
              </button>
            </AddTemplateDialog>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
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
                      if (!pt.invokeDate || !pt.recurrence) return;
                      // On submit, move previousDate to current invokeDate, and calculate new invokeDate
                      const prev = pt.invokeDate;
                      let nextInvoke = new Date(prev);
                      const interval = pt.recurrence!.interval || 1;
                      switch (pt.recurrence!.frequency) {
                        case "daily":
                          nextInvoke.setDate(nextInvoke.getDate() + interval);
                          break;
                        case "weekly":
                          nextInvoke.setDate(
                            nextInvoke.getDate() + 7 * interval,
                          );
                          break;
                        case "monthly":
                          nextInvoke.setMonth(nextInvoke.getMonth() + interval);
                          break;
                        case "yearly":
                          nextInvoke.setFullYear(
                            nextInvoke.getFullYear() + interval,
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
                        isPrivate={isPrivate}
                        parseAmount={parseAmount}
                        onEdit={setEditingPt}
                      />
                    </div>
                  </MixedDialogTrigger>
                </div>
              );
            })}
          </div>
        </div>
        <EditPlannedTransactionDialog
          plannedTransaction={editingPt}
          open={!!editingPt}
          onOpenChange={(open) => {
            if (!open) setEditingPt(null);
          }}
        />
      </div>
    );
  },
);

export { UpcomingPlannedTransactions };
