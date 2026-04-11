import type { QueryClient, QueryKey } from "@tanstack/react-query";

/**
 * Reusable optimistic update helpers for React Query mutations.
 *
 * Encapsulates the cancel → snapshot → update → rollback → invalidate pattern
 * used across all mutation hooks (banks, transactions, categories, tokens, planned transactions).
 */

/** Context returned by onMutate for rollback in onError */
export interface OptimisticContext<T> {
  previous: T[] | undefined;
}

/**
 * Creates onMutate/onError/onSettled handlers for optimistic create mutations.
 *
 * @param queryClient - The React Query client instance
 * @param queryKey - The query key for the list cache to update
 * @param tempItemFn - Function that builds a temporary item from the mutation input
 * @param invalidateKeys - Additional query keys to invalidate on settle (defaults to parent of queryKey)
 */
export function createOptimisticCreate<TItem, TInput>(
  queryClient: QueryClient,
  queryKey: QueryKey,
  tempItemFn: (input: TInput) => TItem,
  invalidateKeys?: QueryKey[],
) {
  return {
    onMutate: async (input: TInput): Promise<OptimisticContext<TItem>> => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<TItem[]>(queryKey);

      queryClient.setQueryData<TItem[]>(queryKey, (old = []) => [tempItemFn(input), ...old]);

      return { previous };
    },

    onError: (_err: unknown, _input: TInput, context: OptimisticContext<TItem> | undefined) => {
      if (context?.previous) {
        queryClient.setQueryData<TItem[]>(queryKey, context.previous);
      }
    },

    onSettled: () => {
      const keys = invalidateKeys ?? [queryKey.slice(0, 1)];
      keys.forEach((key) => {
        queryClient.invalidateQueries({ queryKey: key });
      });
    },
  };
}

/**
 * Creates onMutate/onError/onSettled handlers for optimistic update mutations.
 *
 * Expects mutation input shaped as `{ id: string; data: Partial<TItem> }`.
 *
 * @param queryClient - The React Query client instance
 * @param queryKey - The query key for the list cache to update
 * @param invalidateKeys - Additional query keys to invalidate on settle
 * @param getId - Function to extract the id from an item (defaults to `item.id`)
 */
export function createOptimisticUpdate<TItem extends { id?: string }>(
  queryClient: QueryClient,
  queryKey: QueryKey,
  invalidateKeys?: QueryKey[],
  getId?: (item: TItem) => string | undefined,
) {
  const extractId = getId ?? ((item: TItem) => item.id);

  return {
    onMutate: async ({
      id,
      data,
    }: {
      id: string;
      data: Partial<TItem>;
    }): Promise<OptimisticContext<TItem>> => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<TItem[]>(queryKey);

      queryClient.setQueryData<TItem[]>(queryKey, (old = []) =>
        old.map((item) => (extractId(item) === id ? { ...item, ...data } : item)),
      );

      return { previous };
    },

    onError: (
      _err: unknown,
      _vars: { id: string; data: Partial<TItem> },
      context: OptimisticContext<TItem> | undefined,
    ) => {
      if (context?.previous) {
        queryClient.setQueryData<TItem[]>(queryKey, context.previous);
      }
    },

    onSettled: () => {
      const keys = invalidateKeys ?? [queryKey.slice(0, 1)];
      keys.forEach((key) => {
        queryClient.invalidateQueries({ queryKey: key });
      });
    },
  };
}

/**
 * Creates onMutate/onError/onSettled handlers for optimistic delete mutations.
 *
 * Expects mutation input as the item id (string).
 *
 * @param queryClient - The React Query client instance
 * @param queryKey - The query key for the list cache to update
 * @param invalidateKeys - Additional query keys to invalidate on settle
 * @param getId - Function to extract the id from an item (defaults to `item.id`)
 */
export function createOptimisticDelete<TItem extends { id?: string }>(
  queryClient: QueryClient,
  queryKey: QueryKey,
  invalidateKeys?: QueryKey[],
  getId?: (item: TItem) => string | undefined,
) {
  const extractId = getId ?? ((item: TItem) => item.id);

  return {
    onMutate: async (id: string): Promise<OptimisticContext<TItem>> => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<TItem[]>(queryKey);

      queryClient.setQueryData<TItem[]>(queryKey, (old = []) =>
        old.filter((item) => extractId(item) !== id),
      );

      return { previous };
    },

    onError: (_err: unknown, _id: string, context: OptimisticContext<TItem> | undefined) => {
      if (context?.previous) {
        queryClient.setQueryData<TItem[]>(queryKey, context.previous);
      }
    },

    onSettled: () => {
      const keys = invalidateKeys ?? [queryKey.slice(0, 1)];
      keys.forEach((key) => {
        queryClient.invalidateQueries({ queryKey: key });
      });
    },
  };
}
