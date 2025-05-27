import { useEffect, useState } from "react";
import { useQueryParams } from "@/lib/hooks/useQueryParams";
import { usePlannedTransactions } from "@/store/PlannedTransactionsContext";
import { Transaction } from "@/lib/types";
import { MixedDialog } from "../banks/MixedDialog";

export function PlannedTransactionPrefillHandler() {
  const { queryParams, setQueryParams } = useQueryParams();
  const { plannedTransactions } = usePlannedTransactions();
  const [openDialog, setOpenDialog] = useState(false);
  const [prefill, setPrefill] = useState<Transaction | undefined>(undefined);

  useEffect(() => {
    if (queryParams.plannedId) {
      const planned = plannedTransactions.find(
        (pt) => pt.id === queryParams.plannedId
      );
      if (planned) {
        setPrefill({
          ...planned,
          date: new Date().toISOString(),
        });
        setOpenDialog(true);
      }
    }
  }, [queryParams.plannedId, plannedTransactions]);

  return (
    <MixedDialog
      isModalOpen={openDialog}
      setIsModalOpen={(open) => {
        setOpenDialog(open);
        if (!open && queryParams.plannedId) {
          setQueryParams({ plannedId: undefined });
        }
      }}
      transaction={prefill}
    />
  );
}
