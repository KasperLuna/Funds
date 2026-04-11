import { useAuth } from "@/lib/hooks/useAuth";
import { pb } from "@/lib/pocketbase/pocketbase";
import { PlannedTransaction } from "@/lib/types";
import { useQueryClient, useQuery, useMutation } from "@tanstack/react-query";

import { RecordModel } from "pocketbase";

function recordToPlannedTransaction(record: RecordModel): PlannedTransaction {
  return {
    id: record.id,
    created: record.created ? new Date(record.created) : undefined,
    updated: record.updated ? new Date(record.updated) : undefined,
    user: record.user,
    name: record.name || undefined,
    description: record.description,
    type: record.type,
    amount: record.amount,
    bank: record.bank,
    categories: record.categories,
    recurrence: record.recurrence || null,
    timezone: record.timezone ?? null,
    previousDate: record.previousDate ? new Date(record.previousDate) : null,
    invokeDate: record.invokeDate ? new Date(record.invokeDate) : null,
    lastNotifiedAt: record.lastNotifiedAt
      ? new Date(record.lastNotifiedAt)
      : undefined,
    active: record.active ?? true,
    isTemplate: record.isTemplate ?? false,
  };
}

function serializeForPocketBase(pt: PlannedTransaction) {
  return {
    ...pt,
    previousDate: pt.previousDate ? pt.previousDate.toISOString() : null,
    invokeDate: pt.invokeDate ? pt.invokeDate.toISOString() : null,
    recurrence: pt.recurrence || null,
    timezone: pt.timezone ?? null,
  };
}

export const usePlannedTransactions = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch planned transactions (non-templates)
  const {
    data: plannedTransactions = [],
    isLoading: loading,
    refetch,
  } = useQuery({
    queryKey: ["plannedTransactions", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const records = await pb.collection("planned_transactions").getFullList({
        filter: `user="${user.id}" && isTemplate!=true`,
        sort: "invokeDate",
      });
      return records.map(recordToPlannedTransaction);
    },
    enabled: !!user?.id,
  });

  // Fetch templates only
  const {
    data: templates = [],
    isLoading: templatesLoading,
    refetch: refetchTemplates,
  } = useQuery({
    queryKey: ["transactionTemplates", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const records = await pb.collection("planned_transactions").getFullList({
        filter: `user="${user.id}" && isTemplate=true`,
        sort: "name",
      });
      return records.map(recordToPlannedTransaction);
    },
    enabled: !!user?.id,
  });

  const invalidateAll = () => {
    queryClient.invalidateQueries({
      queryKey: ["plannedTransactions", user?.id],
    });
    queryClient.invalidateQueries({
      queryKey: ["transactionTemplates", user?.id],
    });
  };

  // Add planned transaction or template
  const addMutation = useMutation({
    mutationFn: async (pt: PlannedTransaction) => {
      if (!user?.id) return;
      const record = await pb
        .collection("planned_transactions")
        .create(serializeForPocketBase({ ...pt, user: user.id }));
      return recordToPlannedTransaction(record);
    },
    onSuccess: invalidateAll,
  });

  // Update planned transaction or template
  const updateMutation = useMutation({
    mutationFn: async (pt: PlannedTransaction) => {
      if (!pt.id) return;
      const record = await pb
        .collection("planned_transactions")
        .update(pt.id, serializeForPocketBase(pt));
      return recordToPlannedTransaction(record);
    },
    onSuccess: invalidateAll,
  });

  // Delete planned transaction or template
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await pb.collection("planned_transactions").delete(id);
      return id;
    },
    onSuccess: invalidateAll,
  });

  return {
    plannedTransactions,
    loading,
    templates,
    templatesLoading,
    fetchPlannedTransactions: () => refetch(),
    fetchTemplates: () => refetchTemplates(),
    addPlannedTransaction: (pt: PlannedTransaction) =>
      addMutation.mutateAsync(pt),
    updatePlannedTransaction: (pt: PlannedTransaction) =>
      updateMutation.mutateAsync(pt),
    deletePlannedTransaction: (id: string) => deleteMutation.mutateAsync(id),
  };
};
