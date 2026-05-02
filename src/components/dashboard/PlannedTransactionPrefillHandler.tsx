"use client";
import { useQueryParams } from "@/lib/hooks/useQueryParams";
import { Transaction } from "@/lib/types";
import { MixedDialog } from "../banks/MixedDialog";
import { usePlannedTransactions } from "@/hooks/usePlannedTransactions";
import { useBanksQuery } from "@/lib/hooks/useBanksQuery";
import { useCategoriesQuery } from "@/lib/hooks/useCategoriesQuery";

export function PlannedTransactionPrefillHandler() {
  const { queryParams, setQueryParams } = useQueryParams();
  const { plannedTransactions, updatePlannedTransaction } =
    usePlannedTransactions();
  const bankData = useBanksQuery();
  const categoryData = useCategoriesQuery();

  const foundPlanned = queryParams.plannedId
    ? plannedTransactions.find((pt) => pt.id === queryParams.plannedId)
    : undefined;

  const prefill: Transaction | undefined = foundPlanned
    ? { ...foundPlanned, id: undefined, date: new Date().toISOString() }
    : undefined;

  if (bankData?.loading || categoryData?.loading) {
    return null;
  }

  return (
    <MixedDialog
      isModalOpen={!!prefill}
      setIsModalOpen={(open) => {
        if (!open && queryParams.plannedId) {
          setQueryParams({ plannedId: undefined });
        }
      }}
      transaction={prefill}
      onPlannedSubmit={async () => {
        const planned = plannedTransactions.find(
          (pt) => pt.id === queryParams.plannedId,
        );
        if (!planned || !planned.invokeDate || !planned.recurrence) return;
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
