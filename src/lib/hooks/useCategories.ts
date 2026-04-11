"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import pb from "@/lib/pocketbase/pocketbase";
import { queryKeys } from "./queryKeys";
import type { Category, CategoryFormData, Transaction } from "@/lib/types";

// ── Queries ──────────────────────────────────────────────────────────────────

/**
 * Fetches all categories for the currently authenticated user.
 * Uses a 2-minute stale time (overrides the default 5-min).
 */
export function useCategories() {
  const userId = pb.authStore.record?.id;

  return useQuery<Category[]>({
    queryKey: queryKeys.categories.list(),
    queryFn: async () => {
      if (!userId) return [];
      return pb.collection("categories").getFullList<Category>({
        filter: `user = "${userId}"`,
        sort: "-created",
      });
    },
    enabled: !!userId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

// ── Mutations ────────────────────────────────────────────────────────────────

/**
 * Creates a new category with optimistic cache update.
 */
export function useCreateCategory() {
  const queryClient = useQueryClient();
  const listKey = queryKeys.categories.list();

  return useMutation({
    mutationFn: async (data: CategoryFormData) => {
      const userId = pb.authStore.record?.id;
      if (!userId) throw new Error("User not authenticated");
      return pb.collection("categories").create<Category>({ ...data, user: userId });
    },

    onMutate: async (newCategory) => {
      await queryClient.cancelQueries({ queryKey: listKey });
      const previous = queryClient.getQueryData<Category[]>(listKey);

      queryClient.setQueryData<Category[]>(listKey, (old = []) => [
        {
          id: `temp-${Date.now()}`,
          user: pb.authStore.record?.id ?? "",
          name: newCategory.name,
          hideable: newCategory.hideable,
          monthly_budget: newCategory.monthly_budget,
          total_exempt: newCategory.total_exempt,
        },
        ...old,
      ]);

      return { previous };
    },

    onError: (_err, _newCategory, context) => {
      if (context?.previous) {
        queryClient.setQueryData<Category[]>(listKey, context.previous);
      }
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.categories.all });
    },
  });
}

/**
 * Updates an existing category with optimistic cache update.
 */
export function useUpdateCategory() {
  const queryClient = useQueryClient();
  const listKey = queryKeys.categories.list();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<CategoryFormData> }) => {
      return pb.collection("categories").update<Category>(id, data);
    },

    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: listKey });
      const previous = queryClient.getQueryData<Category[]>(listKey);

      queryClient.setQueryData<Category[]>(listKey, (old = []) =>
        old.map((cat) => (cat.id === id ? { ...cat, ...data } : cat)),
      );

      return { previous };
    },

    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData<Category[]>(listKey, context.previous);
      }
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.categories.all });
    },
  });
}

/**
 * Deletes a category with optimistic cache update.
 * Also removes the category from all associated transactions and
 * invalidates transaction queries since category references change.
 */
export function useDeleteCategory() {
  const queryClient = useQueryClient();
  const listKey = queryKeys.categories.list();

  return useMutation({
    mutationFn: async (id: string) => {
      const userId = pb.authStore.record?.id;
      if (!userId) throw new Error("User not authenticated");

      // Find all transactions that reference this category and remove it
      const transactions = await pb.collection("transactions").getFullList<Transaction>({
        filter: `user = "${userId}" && categories ~ "${id}"`,
      });

      // Update each transaction to remove the deleted category
      await Promise.all(
        transactions.map((tx) =>
          pb.collection("transactions").update(tx.id!, {
            categories: tx.categories.filter((catId) => catId !== id),
          }),
        ),
      );

      // Delete the category itself
      return pb.collection("categories").delete(id);
    },

    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: listKey });
      const previous = queryClient.getQueryData<Category[]>(listKey);

      queryClient.setQueryData<Category[]>(listKey, (old = []) =>
        old.filter((cat) => cat.id !== id),
      );

      return { previous };
    },

    onError: (_err, _id, context) => {
      if (context?.previous) {
        queryClient.setQueryData<Category[]>(listKey, context.previous);
      }
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.categories.all });
      // Cascade: deleting a category affects associated transactions
      queryClient.invalidateQueries({ queryKey: queryKeys.transactions.all });
    },
  });
}
