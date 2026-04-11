"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import pb from "@/lib/pocketbase/pocketbase";
import { queryKeys } from "./queryKeys";
import type { Bank, BankFormData } from "@/lib/types";

// ── Queries ──────────────────────────────────────────────────────────────────

/**
 * Fetches all banks for the currently authenticated user.
 * Uses a 5-minute stale time (inherited from QueryProvider defaults).
 */
export function useBanks() {
  const userId = pb.authStore.record?.id;

  return useQuery<Bank[]>({
    queryKey: queryKeys.banks.list(),
    queryFn: async () => {
      if (!userId) return [];
      return pb.collection("banks").getFullList<Bank>({
        filter: `user = "${userId}"`,
        sort: "-created",
      });
    },
    enabled: !!userId,
  });
}

// ── Mutations ────────────────────────────────────────────────────────────────

/**
 * Creates a new bank with optimistic cache update.
 */
export function useCreateBank() {
  const queryClient = useQueryClient();
  const listKey = queryKeys.banks.list();

  return useMutation({
    mutationFn: async (data: BankFormData) => {
      const userId = pb.authStore.record?.id;
      if (!userId) throw new Error("User not authenticated");
      return pb.collection("banks").create<Bank>({ ...data, user: userId, balance: 0 });
    },

    onMutate: async (newBank) => {
      await queryClient.cancelQueries({ queryKey: listKey });
      const previous = queryClient.getQueryData<Bank[]>(listKey);

      queryClient.setQueryData<Bank[]>(listKey, (old = []) => [
        {
          id: `temp-${Date.now()}`,
          user: pb.authStore.record?.id ?? "",
          balance: 0,
          name: newBank.name,
          primaryColor: newBank.primaryColor,
          secondaryColor: newBank.secondaryColor,
        },
        ...old,
      ]);

      return { previous };
    },

    onError: (_err, _newBank, context) => {
      if (context?.previous) {
        queryClient.setQueryData<Bank[]>(listKey, context.previous);
      }
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.banks.all });
    },
  });
}

/**
 * Updates an existing bank with optimistic cache update.
 */
export function useUpdateBank() {
  const queryClient = useQueryClient();
  const listKey = queryKeys.banks.list();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<BankFormData> }) => {
      return pb.collection("banks").update<Bank>(id, data);
    },

    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: listKey });
      const previous = queryClient.getQueryData<Bank[]>(listKey);

      queryClient.setQueryData<Bank[]>(listKey, (old = []) =>
        old.map((bank) => (bank.id === id ? { ...bank, ...data } : bank)),
      );

      return { previous };
    },

    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData<Bank[]>(listKey, context.previous);
      }
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.banks.all });
    },
  });
}

/**
 * Deletes a bank with optimistic cache update.
 * Also invalidates transactions since deleting a bank cascades to its transactions.
 */
export function useDeleteBank() {
  const queryClient = useQueryClient();
  const listKey = queryKeys.banks.list();

  return useMutation({
    mutationFn: async (id: string) => {
      return pb.collection("banks").delete(id);
    },

    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: listKey });
      const previous = queryClient.getQueryData<Bank[]>(listKey);

      queryClient.setQueryData<Bank[]>(listKey, (old = []) => old.filter((bank) => bank.id !== id));

      return { previous };
    },

    onError: (_err, _id, context) => {
      if (context?.previous) {
        queryClient.setQueryData<Bank[]>(listKey, context.previous);
      }
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.banks.all });
      // Cascade: deleting a bank removes its transactions too
      queryClient.invalidateQueries({ queryKey: queryKeys.transactions.all });
    },
  });
}
