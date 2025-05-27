"use client";
import React from "react";
import { usePlannedTransactions } from "../../store/PlannedTransactionsContext";
import { useBanksCategsContext } from "@/lib/hooks/useBanksCategsContext";
import { MixedDialogTrigger } from "../banks/MixedDialog";
import { Transaction } from "@/lib/types";

const UpcomingPlannedTransactions: React.FC = () => {
  const { plannedTransactions } = usePlannedTransactions();
  const { bankData, categoryData } = useBanksCategsContext() || {};
  const banks = bankData?.banks || [];
  const categories = categoryData?.categories || [];
  const today = new Date();
  // Show only active and upcoming (startDate >= today)
  const upcoming =
    plannedTransactions?.filter(
      (pt) => pt?.active && pt?.startDate && new Date(pt.startDate) >= today
    ) || [];

  // Helper to map bank id to name
  const getBankName = (id: string) =>
    banks.find((b) => b.id === id)?.name || id || "-";
  // Helper to map category ids to names
  const getCategoryNames = (ids: any) => {
    if (!ids || (Array.isArray(ids) && ids.length === 0)) return "-";
    // If it's a string (single category), convert to array
    const idArr = Array.isArray(ids) ? ids : [ids];
    // Some planned transactions may store categories as names or ids, so check both
    const names = idArr
      .map((id) => {
        if (!id) return null;
        // Try to find by id
        const byId = categories.find((c) => c.id === id);
        if (byId) return byId.name;
        // Fallback: try to find by name (for legacy or mixed data)
        const byName = categories.find((c) => c.name === id);
        if (byName) return byName.name;
        // Fallback: show raw value
        return id;
      })
      .filter(Boolean);
    return names.length > 0 ? names.join(", ") : "-";
  };

  if (!upcoming || upcoming.length === 0) return null;

  return (
    <div className="mb-4 p-3 bg-slate-900 rounded border border-slate-700">
      <div className="font-bold mb-2 text-lg flex items-center gap-2">
        <span role="img" aria-label="calendar">
          📅
        </span>{" "}
        Upcoming Planned Transactions
      </div>
      <div className="flex flex-col gap-3">
        {upcoming?.map((pt) => {
          const transaction: Transaction = {
            ...pt,
            date: new Date().toISOString(),
          };
          return (
            <MixedDialogTrigger
              key={pt?.id || Math.random()}
              transaction={transaction}
            >
              <div className="border border-slate-700 rounded-lg p-4 flex flex-col md:flex-row md:items-center md:justify-between bg-slate-800 hover:bg-slate-700 transition-colors shadow-sm cursor-pointer">
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-slate-100 text-base truncate">
                    {pt?.description || (
                      <span className="italic text-slate-400">
                        (No description)
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-x-6 gap-y-1 mt-1 text-sm text-slate-300">
                    <span className="font-medium text-green-400">
                      {pt?.amount ? `Amount: $${pt.amount}` : "Amount: -"}
                    </span>
                    <span>Type: {pt?.type ?? "-"}</span>
                    <span>Bank: {getBankName(pt?.bank)}</span>
                    <span>Categories: {getCategoryNames(pt?.categories)}</span>
                    <span>
                      Start:{" "}
                      {pt?.startDate
                        ? new Date(pt.startDate).toLocaleDateString()
                        : "-"}
                    </span>
                    <span>Recurrence: {pt?.recurrence?.frequency ?? "-"}</span>
                    <span>
                      Reminder:{" "}
                      {pt?.reminderMinutesBefore
                        ? `${pt.reminderMinutesBefore} min before`
                        : "None"}
                    </span>
                  </div>
                </div>
                <div className="mt-3 md:mt-0 md:ml-6 flex-shrink-0 flex flex-col items-end gap-2">
                  {pt?.recurrence?.frequency && (
                    <span className="px-2 py-1 rounded bg-blue-900 text-blue-300 text-xs font-semibold">
                      {pt.recurrence.frequency}
                    </span>
                  )}
                  {pt?.reminderMinutesBefore && (
                    <span className="px-2 py-1 rounded bg-yellow-900 text-yellow-300 text-xs font-semibold">
                      Reminder: {pt.reminderMinutesBefore} min
                    </span>
                  )}
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
