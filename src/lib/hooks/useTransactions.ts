"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import pb from "@/lib/pocketbase/pocketbase";
import { queryKeys } from "./queryKeys";
import type { Transaction, TransactionFilters } from "@/lib/types";

// ── Filter Builder ───────────────────────────────────────────────────────────

/**
 * Builds a PocketBase filter string from a TransactionFilters object.
 * All conditions are ANDed together. The user filter is always applied.
 */
export function buildFilterString(
  userId: string,
  bankId?: string,
  filters?: TransactionFilters,
): string {
  const parts: string[] = [`user = "${userId}"`];

  if (bankId) {
    parts.push(`bank = "${bankId}"`);
  }

  if (filters?.bank) {
    parts.push(`bank = "${filters.bank}"`);
  }

  if (filters?.type) {
    parts.push(`type = "${filters.type}"`);
  }

  if (filters?.categories?.length) {
    const categoryConditions = filters.categories.map((c) => `categories ~ "${c}"`);
    parts.push(`(${categoryConditions.join(" || ")})`);
  }

  if (filters?.dateRange?.start) {
    parts.push(`date >= "${filters.dateRange.start.toISOString()}"`);
  }

  if (filters?.dateRange?.end) {
    parts.push(`date <= "${filters.dateRange.end.toISOString()}"`);
  }

  if (filters?.searchText) {
    parts.push(`description ~ "${filters.searchText}"`);
  }

  return parts.join(" && ");
}

// ── Queries ──────────────────────────────────────────────────────────────────

/**
 * Fetches transactions for the currently authenticated user.
 * Supports optional bankId scoping and rich filtering (date range, category, search, type).
 */
export function useTransactions(bankId?: string, filters?: TransactionFilters) {
  const userId = pb.authStore.record?.id;

  // Build a stable key that includes the bankId and filters
  const filterKey = { bankId, ...filters };

  return useQuery<Transaction[]>({
    queryKey: queryKeys.transactions.list(filterKey),
    queryFn: async () => {
      if (!userId) return [];
      const filterStr = buildFilterString(userId, bankId, filters);
      return pb.collection("transactions").getFullList<Transaction>({
        filter: filterStr,
        sort: "-date,-created",
      });
    },
    enabled: !!userId,
  });
}

// ── Mutations ────────────────────────────────────────────────────────────────

/**
 * Creates a new transaction with optimistic cache update and rollback.
 * Invalidates both transaction and bank queries on settle (bank balance depends on transactions).
 */
export function useCreateTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Omit<Transaction, "id" | "user" | "created" | "updated">) => {
      const userId = pb.authStore.record?.id;
      if (!userId) throw new Error("User not authenticated");
      return pb.collection("transactions").create<Transaction>({ ...data, user: userId });
    },

    onMutate: async (newTx) => {
      // Cancel any outgoing refetches so they don't overwrite our optimistic update
      await queryClient.cancelQueries({ queryKey: queryKeys.transactions.all });

      // Snapshot all transaction query data for rollback
      const previousQueries = queryClient.getQueriesData<Transaction[]>({
        queryKey: queryKeys.transactions.all,
      });

      // Optimistically prepend the new transaction to every matching list cache
      queryClient.setQueriesData<Transaction[]>(
        { queryKey: queryKeys.transactions.all },
        (old = []) => [
          {
            id: `temp-${Date.now()}`,
            user: pb.authStore.record?.id ?? "",
            ...newTx,
          } as Transaction,
          ...old,
        ],
      );

      return { previousQueries };
    },

    onError: (_err, _newTx, context) => {
      // Rollback all transaction caches to their previous state
      context?.previousQueries.forEach(([key, data]) => {
        queryClient.setQueryData(key, data);
      });
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.transactions.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.banks.all });
    },
  });
}

/**
 * Updates an existing transaction with optimistic cache update.
 * Invalidates bank queries on settle since balance may change.
 */
export function useUpdateTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: Partial<Omit<Transaction, "id" | "user" | "created" | "updated">>;
    }) => {
      return pb.collection("transactions").update<Transaction>(id, data);
    },

    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.transactions.all });

      const previousQueries = queryClient.getQueriesData<Transaction[]>({
        queryKey: queryKeys.transactions.all,
      });

      queryClient.setQueriesData<Transaction[]>(
        { queryKey: queryKeys.transactions.all },
        (old = []) => old.map((tx) => (tx.id === id ? { ...tx, ...data } : tx)),
      );

      return { previousQueries };
    },

    onError: (_err, _vars, context) => {
      context?.previousQueries.forEach(([key, data]) => {
        queryClient.setQueryData(key, data);
      });
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.transactions.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.banks.all });
    },
  });
}

/**
 * Deletes a transaction with optimistic removal and cache invalidation.
 * Invalidates bank queries on settle since balance may change.
 */
export function useDeleteTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      return pb.collection("transactions").delete(id);
    },

    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.transactions.all });

      const previousQueries = queryClient.getQueriesData<Transaction[]>({
        queryKey: queryKeys.transactions.all,
      });

      queryClient.setQueriesData<Transaction[]>(
        { queryKey: queryKeys.transactions.all },
        (old = []) => old.filter((tx) => tx.id !== id),
      );

      return { previousQueries };
    },

    onError: (_err, _id, context) => {
      context?.previousQueries.forEach(([key, data]) => {
        queryClient.setQueryData(key, data);
      });
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.transactions.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.banks.all });
    },
  });
}
