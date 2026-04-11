"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import pb from "@/lib/pocketbase/pocketbase";
import { queryKeys } from "./queryKeys";
import type { PlannedTransaction, PlannedTransactionFormData } from "@/lib/types";

// ── Queries ──────────────────────────────────────────────────────────────────

/**
 * Fetches all planned transactions for the currently authenticated user.
 */
export function usePlannedTransactions() {
  const userId = pb.authStore.record?.id;

  return useQuery<PlannedTransaction[]>({
    queryKey: queryKeys.plannedTransactions.list(),
    queryFn: async () => {
      if (!userId) return [];
      return pb.collection("planned_transactions").getFullList<PlannedTransaction>({
        filter: `user = "${userId}"`,
        sort: "-created",
      });
    },
    enabled: !!userId,
  });
}

// ── Mutations ────────────────────────────────────────────────────────────────

/**
 * Creates a new planned transaction with optimistic cache update.
 */
export function useCreatePlannedTransaction() {
  const queryClient = useQueryClient();
  const listKey = queryKeys.plannedTransactions.list();

  return useMutation({
    mutationFn: async (data: PlannedTransactionFormData) => {
      const userId = pb.authStore.record?.id;
      if (!userId) throw new Error("User not authenticated");
      return pb.collection("planned_transactions").create<PlannedTransaction>({
        ...data,
        user: userId,
        active: true,
        previousDate: null,
        invokeDate: new Date(),
      });
    },

    onMutate: async (newPlanned) => {
      await queryClient.cancelQueries({ queryKey: listKey });
      const previous = queryClient.getQueryData<PlannedTransaction[]>(listKey);

      queryClient.setQueryData<PlannedTransaction[]>(listKey, (old = []) => [
        {
          id: `temp-${Date.now()}`,
          user: pb.authStore.record?.id ?? "",
          description: newPlanned.description,
          type: newPlanned.type,
          amount: newPlanned.amount,
          bank: newPlanned.bank,
          categories: newPlanned.categories,
          recurrence: newPlanned.recurrence,
          timezone: newPlanned.timezone,
          previousDate: null,
          invokeDate: new Date(),
          active: true,
        },
        ...old,
      ]);

      return { previous };
    },

    onError: (_err, _newPlanned, context) => {
      if (context?.previous) {
        queryClient.setQueryData<PlannedTransaction[]>(listKey, context.previous);
      }
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.plannedTransactions.all });
    },
  });
}

/**
 * Updates an existing planned transaction with optimistic cache update.
 */
export function useUpdatePlannedTransaction() {
  const queryClient = useQueryClient();
  const listKey = queryKeys.plannedTransactions.list();

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: Partial<PlannedTransactionFormData & { active: boolean }>;
    }) => {
      return pb.collection("planned_transactions").update<PlannedTransaction>(id, data);
    },

    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: listKey });
      const previous = queryClient.getQueryData<PlannedTransaction[]>(listKey);

      queryClient.setQueryData<PlannedTransaction[]>(listKey, (old = []) =>
        old.map((pt) => (pt.id === id ? { ...pt, ...data } : pt)),
      );

      return { previous };
    },

    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData<PlannedTransaction[]>(listKey, context.previous);
      }
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.plannedTransactions.all });
    },
  });
}

/**
 * Deletes a planned transaction with optimistic cache update.
 */
export function useDeletePlannedTransaction() {
  const queryClient = useQueryClient();
  const listKey = queryKeys.plannedTransactions.list();

  return useMutation({
    mutationFn: async (id: string) => {
      return pb.collection("planned_transactions").delete(id);
    },

    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: listKey });
      const previous = queryClient.getQueryData<PlannedTransaction[]>(listKey);

      queryClient.setQueryData<PlannedTransaction[]>(listKey, (old = []) =>
        old.filter((pt) => pt.id !== id),
      );

      return { previous };
    },

    onError: (_err, _id, context) => {
      if (context?.previous) {
        queryClient.setQueryData<PlannedTransaction[]>(listKey, context.previous);
      }
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.plannedTransactions.all });
    },
  });
}
