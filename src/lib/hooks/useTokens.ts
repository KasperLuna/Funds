"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import pb from "@/lib/pocketbase/pocketbase";
import { queryKeys } from "./queryKeys";
import type { Token, TokenFormData } from "@/lib/types";

// ── Queries ──────────────────────────────────────────────────────────────────

/**
 * Fetches all cryptocurrency tokens for the currently authenticated user.
 */
export function useTokens() {
  const userId = pb.authStore.record?.id;

  return useQuery<Token[]>({
    queryKey: queryKeys.crypto.tokens(),
    queryFn: async () => {
      if (!userId) return [];
      return pb.collection("tokens").getFullList<Token>({
        filter: `user = "${userId}"`,
        sort: "-created",
      });
    },
    enabled: !!userId,
  });
}

// ── Mutations ────────────────────────────────────────────────────────────────

/**
 * Creates a new cryptocurrency token with optimistic cache update.
 */
export function useCreateToken() {
  const queryClient = useQueryClient();
  const listKey = queryKeys.crypto.tokens();

  return useMutation({
    mutationFn: async (data: TokenFormData) => {
      const userId = pb.authStore.record?.id;
      if (!userId) throw new Error("User not authenticated");
      return pb.collection("tokens").create<Token>({ ...data, user: userId });
    },

    onMutate: async (newToken) => {
      await queryClient.cancelQueries({ queryKey: listKey });
      const previous = queryClient.getQueryData<Token[]>(listKey);

      queryClient.setQueryData<Token[]>(listKey, (old = []) => [
        {
          id: `temp-${Date.now()}`,
          user: pb.authStore.record?.id ?? "",
          name: newToken.name,
          symbol: newToken.symbol,
          coingecko_id: newToken.coingecko_id,
          total: newToken.total,
          costAvg: newToken.costAvg,
        },
        ...old,
      ]);

      return { previous };
    },

    onError: (_err, _newToken, context) => {
      if (context?.previous) {
        queryClient.setQueryData<Token[]>(listKey, context.previous);
      }
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.crypto.all });
    },
  });
}

/**
 * Updates an existing cryptocurrency token with optimistic cache update.
 */
export function useUpdateToken() {
  const queryClient = useQueryClient();
  const listKey = queryKeys.crypto.tokens();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<TokenFormData> }) => {
      return pb.collection("tokens").update<Token>(id, data);
    },

    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: listKey });
      const previous = queryClient.getQueryData<Token[]>(listKey);

      queryClient.setQueryData<Token[]>(listKey, (old = []) =>
        old.map((token) => (token.id === id ? { ...token, ...data } : token)),
      );

      return { previous };
    },

    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData<Token[]>(listKey, context.previous);
      }
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.crypto.all });
    },
  });
}

/**
 * Deletes a cryptocurrency token with optimistic cache update.
 */
export function useDeleteToken() {
  const queryClient = useQueryClient();
  const listKey = queryKeys.crypto.tokens();

  return useMutation({
    mutationFn: async (id: string) => {
      return pb.collection("tokens").delete(id);
    },

    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: listKey });
      const previous = queryClient.getQueryData<Token[]>(listKey);

      queryClient.setQueryData<Token[]>(listKey, (old = []) =>
        old.filter((token) => token.id !== id),
      );

      return { previous };
    },

    onError: (_err, _id, context) => {
      if (context?.previous) {
        queryClient.setQueryData<Token[]>(listKey, context.previous);
      }
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.crypto.all });
    },
  });
}
