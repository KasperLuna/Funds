"use client";

import {
  QueryClient,
  QueryClientProvider,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useEffect, useMemo, useRef, type ReactNode } from "react";
import { useSyncStore } from "./sync-store";
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

interface SyncQueryProviderProps {
  children: ReactNode;
}
/** Wraps the app with a QueryClient. Must sit above any useSyncQuery consumer. */
export const SyncQueryProvider = ({ children }: SyncQueryProviderProps) => {
  const ref = useRef<QueryClient | null>(null);
  if (!ref.current) ref.current = createQueryClient();
  return <QueryClientProvider client={ref.current}>{children}</QueryClientProvider>;
};

/**
 * Read one collection from the sync db as a TanStack Query.
 *
 * The cache stores RAW (normalized) rows under `[...key, scope]`. `select` is
 * passed through to useQuery's native per-render select, so each consumer can
 * derive its own view WITHOUT writing a different shape into the shared cache.
 *
 * cavetail: in a previous design every consumer's watcher re-seeded the cache
 * with its OWN mapped shape, so navigating between pages that share an entity
 * key (crypto's slim account options vs banks' full accounts) served one
 * page's rows to another's mapper — undefined money fields hit BigInt math and
 * crashed the app. Raw-in-cache + native select removes the class. Consumers
 * sharing a key but querying different row sets (e.g. archived vs active
 * accounts) MUST pass distinct `scope` values.
 */
export function useSyncQuery<T>({
  key,
  sql,
  params,
  scope,
  select,
}: {
  key: readonly unknown[];
  sql: string;
  params?: QueryParams;
  scope?: string;
  select?: (row: RowRecord) => T;
}) {
  const db = useSyncStore((s) => s.db);
  const isReady = useSyncStore((s) => s.isReady);
  const queryClient = useQueryClient();
  const keyRef = useRef(key);
  keyRef.current = key;
  const paramsRef = useRef(params);
  paramsRef.current = params;
  const selectRef = useRef(select);
  selectRef.current = select;
  const cacheKey = useMemo(() => [...key, scope ?? "default"], [key, scope]);
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
          queryClient.setQueryData(cacheKey, result.rows);
        }
      } catch {
        // watcher closed; ignore
      }
    })();
    return () => {
      cancelled = true;
      void watcher.return(undefined);
    };
  }, [db, isReady, sql, paramsKey, cacheKey, queryClient]);

  return useQuery({
    queryKey: cacheKey,
    enabled: isReady,
    queryFn: async () => {
      const res = await db.query(sql, paramsRef.current);
      return res.rows;
    },
    ...(select
      ? { select: (rows: RowRecord[]) => rows.map((r) => selectRef.current!(r)) }
      : {}),
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
