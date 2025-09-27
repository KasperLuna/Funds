import { useAuth } from "@/lib/hooks/useAuth";
import { pb } from "@/lib/pocketbase/pocketbase";
import { PlannedTransaction } from "@/lib/types";
import { useQueryClient, useQuery, useMutation } from "@tanstack/react-query";

function recordToPlannedTransaction(record: any): PlannedTransaction {
  return {
    id: record.id,
    created: record.created ? new Date(record.created) : undefined,
    updated: record.updated ? new Date(record.updated) : undefined,
    user: record.user,
    description: record.description,
    type: record.type,
    amount: record.amount,
    bank: record.bank,
    categories: record.categories,
    recurrence: record.recurrence,
    timezone: record.timezone,
    previousDate: record.previousDate ? new Date(record.previousDate) : null,
    invokeDate: new Date(record.invokeDate),
    lastNotifiedAt: record.lastNotifiedAt
      ? new Date(record.lastNotifiedAt)
      : undefined,
    active: record.active,
  };
}

export const usePlannedTransactions = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch planned transactions
  const {
    data: plannedTransactions = [],
    isLoading: loading,
    refetch,
  } = useQuery({
    queryKey: ["plannedTransactions", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const records = await pb.collection("planned_transactions")?.getFullList({
        filter: `user="${user.id}"`,
        sort: "invokeDate",
      });
      return records.map(recordToPlannedTransaction);
    },
    enabled: !!user?.id,
  });

  // Add planned transaction
  const addMutation = useMutation({
    mutationFn: async (pt: PlannedTransaction) => {
      if (!user?.id) return;
      const record = await pb.collection("planned_transactions").create({
        ...pt,
        user: user.id,
        previousDate: pt.previousDate ? pt.previousDate.toISOString() : null,
        invokeDate: pt.invokeDate.toISOString(),
      });
      return recordToPlannedTransaction(record);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["plannedTransactions", user?.id],
      });
    },
  });

  // Update planned transaction
  const updateMutation = useMutation({
    mutationFn: async (pt: PlannedTransaction) => {
      if (!pt.id) return;
      const record = await pb.collection("planned_transactions").update(pt.id, {
        ...pt,
        previousDate: pt.previousDate ? pt.previousDate.toISOString() : null,
        invokeDate: pt.invokeDate.toISOString(),
      });
      return recordToPlannedTransaction(record);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["plannedTransactions", user?.id],
      });
    },
  });

  // Delete planned transaction
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await pb.collection("planned_transactions").delete(id);
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["plannedTransactions", user?.id],
      });
    },
  });

  return {
    plannedTransactions,
    loading,
    fetchPlannedTransactions: async () => {
      await refetch();
    },
    addPlannedTransaction: async (pt: PlannedTransaction) => {
      await addMutation.mutateAsync(pt);
    },
    updatePlannedTransaction: async (pt: PlannedTransaction) => {
      await updateMutation.mutateAsync(pt);
    },
    deletePlannedTransaction: async (id: string) => {
      await deleteMutation.mutateAsync(id);
    },
  };
};
