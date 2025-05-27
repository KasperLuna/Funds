import { useEffect, useState } from "react";
import { useQueryParams } from "@/lib/hooks/useQueryParams";
import { usePlannedTransactions } from "@/store/PlannedTransactionsContext";
import { Transaction } from "@/lib/types";
import { MixedDialog } from "../banks/MixedDialog";
import { useBanksCategsContext } from "@/lib/hooks/useBanksCategsContext";

export function PlannedTransactionPrefillHandler() {
  const { queryParams, setQueryParams } = useQueryParams();
  const { plannedTransactions } = usePlannedTransactions();
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
    />
  );
}
