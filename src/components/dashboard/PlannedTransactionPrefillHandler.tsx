"use client";
import { useEffect, useState } from "react";
import { useQueryParams } from "@/lib/hooks/useQueryParams";
import { Transaction } from "@/lib/types";
import { MixedDialog } from "../banks/MixedDialog";
import { useBanksCategsContext } from "@/lib/hooks/useBanksCategsContext";
import { usePlannedTransactions } from "@/hooks/usePlannedTransactions";

export function PlannedTransactionPrefillHandler() {
  const { queryParams, setQueryParams } = useQueryParams();
  const { plannedTransactions, updatePlannedTransaction } =
    usePlannedTransactions();
  const { bankData, categoryData } = useBanksCategsContext();
  const [prefill, setPrefill] = useState<Transaction | undefined>(undefined);

  useEffect(() => {
    if (queryParams.plannedId) {
      const planned = plannedTransactions.find(
        (pt) => pt.id === queryParams.plannedId
      );
      if (planned) {
        setPrefill({
          ...planned,
          id: undefined, // Clear the ID to create a new transaction
          date: new Date().toISOString(),
        });
        return;
      }
    }
    setPrefill(undefined);
  }, [queryParams.plannedId, plannedTransactions]);

  if (bankData?.loading || categoryData?.loading) {
    return null;
  }

  return (
    <MixedDialog
      isModalOpen={!!prefill}
      setIsModalOpen={(open) => {
        if (!open) {
          setPrefill(undefined);
          if (queryParams.plannedId) {
            setQueryParams({ plannedId: undefined });
          }
        }
      }}
      transaction={prefill}
      onPlannedSubmit={async () => {
        const planned = plannedTransactions.find(
          (pt) => pt.id === queryParams.plannedId
        );
        if (!planned) return;
        // Move previousDate to current invokeDate, and calculate new invokeDate
        const prev = planned.invokeDate;
        let nextInvoke = new Date(prev);
        const interval = planned.recurrence.interval || 1;
        switch (planned.recurrence.frequency) {
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
          ...planned,
          previousDate: prev,
          invokeDate: nextInvoke,
        });
      }}
    />
  );
}
