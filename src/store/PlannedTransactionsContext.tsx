import React, { createContext, useContext, ReactNode } from "react";
import { PlannedTransaction } from "../lib/types";
import { pb } from "../lib/pocketbase/pocketbase";
import { useAuth } from "../lib/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

interface PlannedTransactionsContextProps {
  plannedTransactions: PlannedTransaction[];
  loading: boolean;
  fetchPlannedTransactions: () => Promise<void>;
  addPlannedTransaction: (pt: PlannedTransaction) => Promise<void>;
  updatePlannedTransaction: (pt: PlannedTransaction) => Promise<void>;
  deletePlannedTransaction: (id: string) => Promise<void>;
}

const PlannedTransactionsContext = createContext<
  PlannedTransactionsContextProps | undefined
>(undefined);

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

export const PlannedTransactionsProvider = ({
  children,
}: {
  children: ReactNode;
}) => {
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

  return (
    <PlannedTransactionsContext.Provider
      value={{
        plannedTransactions,
        loading,
        fetchPlannedTransactions: async () => {
          await refetch();
        },
        addPlannedTransaction: async (pt) => {
          await addMutation.mutateAsync(pt);
        },
        updatePlannedTransaction: async (pt) => {
          await updateMutation.mutateAsync(pt);
        },
        deletePlannedTransaction: async (id) => {
          await deleteMutation.mutateAsync(id);
        },
      }}
    >
      {children}
    </PlannedTransactionsContext.Provider>
  );
};

export const usePlannedTransactions = () => {
  const context = useContext(PlannedTransactionsContext);
  if (!context)
    throw new Error(
      "usePlannedTransactions must be used within PlannedTransactionsProvider"
    );
  return context;
};
