"use client";

import {
  QueryClient,
  QueryClientProvider,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useRef, type ReactNode } from "react";
import { useSync } from "./sync-context";
import type { QueryParams, RowRecord } from "./types";

/**
 * Entity query-key roots. Mutations invalidate by prefix, so each key here is
 * matched regardless of the `lastSyncedAt` version suffix appended by
 * {@link useSyncQuery}.
 */
export const queryKeys = {
  accounts: ["accounts"] as const,
  transactions: ["transactions"] as const,
  categories: ["categories"] as const,
  categoryBudgets: ["category_budgets"] as const,
  tokens: ["tokens"] as const,
  tokenTransactions: ["token_transactions"] as const,
  templates: ["templates"] as const,
  scheduledTransactions: ["scheduled_transactions"] as const,
  transfers: ["transfers"] as const,
  assets: ["assets"] as const,
};

/**
 * QueryClient mounted once per SyncQueryProvider. Local-first reads are cheap
 * and refresh on every sync checkpoint, so keep staleness short and disable
 * window-focus refetch (data freshness is driven by `lastSyncedAt` in the key).
 */
function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5_000,
        refetchOnWindowFocus: false,
        retry: false,
      },
    },
  });
}

/** Wraps the app with a QueryClient. Must sit above any useSyncQuery consumer. */
export function SyncQueryProvider({ children }: { children: ReactNode }) {
  const ref = useRef<QueryClient | null>(null);
  if (!ref.current) ref.current = createQueryClient();
  return <QueryClientProvider client={ref.current}>{children}</QueryClientProvider>;
}

/**
 * Read one collection from the sync db as a TanStack Query.
 *
 * The query is disabled until sync is ready (so it never runs against the empty
 * memory db before PowerSync swaps in) and its key carries `lastSyncedAt`, so
 * it re-runs against freshly-downloaded data on every checkpoint. Both effects
 * together remove the "0 state → flicker to populated" flash.
 */
export function useSyncQuery<T>({
  key,
  sql,
  params,
  select,
}: {
  key: readonly unknown[];
  sql: string;
  params?: QueryParams;
  select: (row: RowRecord) => T;
}) {
  const { db, isReady, lastSyncedAt } = useSync();
  return useQuery({
    queryKey: [...key, lastSyncedAt],
    enabled: isReady,
    queryFn: async () => {
      const res = await db.query(sql, params);
      return res.rows.map(select);
    },
  });
}

/**
 * Write to the sync db and invalidate the affected entity queries on success.
 * Invalidation matches by key prefix, so the `lastSyncedAt`-suffixed queries
 * are refreshed automatically.
 */
export function useSyncMutation<TVariables>({
  keys,
  mutationFn,
  onError,
}: {
  keys: readonly (readonly unknown[])[];
  mutationFn: (variables: TVariables) => Promise<void>;
  onError?: (error: unknown) => void;
}) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn,
    onError,
    onSuccess: () => {
      for (const k of keys) void qc.invalidateQueries({ queryKey: [...k] });
    },
  });
}
