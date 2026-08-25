"use client";

import {
  QueryClient,
  QueryClientProvider,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useEffect, useRef, type ReactNode } from "react";
import { useSync } from "./sync-context";
import type { QueryParams, QueryResult, RowRecord } from "./types";

/**
 * Entity query-key roots. Mutations invalidate by prefix.
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
 * and refresh reactively via {@link useSyncQuery}'s watcher, so keep staleness
 * short and disable window-focus refetch (the watcher drives freshness).
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
 * Reactivity comes from a mounted {@link SyncDatabase.watch} watcher that
 * re-seeds the query cache on every local write and sync pull — so the query key
 * no longer needs a `lastSyncedAt` version suffix. The watcher yields the current
 * result immediately and again on change; writes land in the cache via
 * {@link QueryClient.setQueryData}, making the UI react to local writes AND pulls.
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
  const { db, isReady } = useSync();
  const queryClient = useQueryClient();
  const keyRef = useRef(key);
  keyRef.current = key;
  const paramsRef = useRef(params);
  paramsRef.current = params;
  const selectRef = useRef(select);
  selectRef.current = select;
  const paramsKey = params ? JSON.stringify(params) : "";

  useEffect(() => {
    if (!isReady) return;
    let cancelled = false;
    // cavetail: db.watch is typed AsyncIterable but both impls are async
    // generators; cast so we can .return() to tear down the watcher on cleanup.
    const watcher = db.watch(sql, paramsRef.current) as AsyncGenerator<QueryResult>;
    (async () => {
      try {
        for await (const result of watcher) {
          if (cancelled) return;
          queryClient.setQueryData([...keyRef.current], result.rows.map(selectRef.current));
        }
      } catch {
        // watcher closed; ignore
      }
    })();
    return () => {
      cancelled = true;
      void watcher.return(undefined);
    };
  }, [db, isReady, sql, paramsKey, queryClient]);

  return useQuery({
    queryKey: key,
    enabled: isReady,
    queryFn: async () => {
      const res = await db.query(sql, paramsRef.current);
      return res.rows.map(selectRef.current);
    },
  });
}

/**
 * Write to the sync db and invalidate the affected entity queries on success.
 * Invalidation matches by key prefix, so the affected queries refresh.
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
