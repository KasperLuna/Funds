// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render } from "@testing-library/react";
import { MemorySyncDatabase } from "@/lib/sync";
import { SyncContext } from "@/lib/sync/sync-context";
import type { ReactNode } from "react";

/** Fresh client per call so tests don't share cache state. */
export function createTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
}

/**
 * Wraps a component with the providers TanStack-query consumers need:
 * a QueryClientProvider and a ready sync context backed by an in-memory db.
 * `isReady: true` so useSyncQuery queries actually fire against the db.
 */
export function TestProviders({
  children,
  db,
}: {
  children: ReactNode;
  db?: MemorySyncDatabase;
}) {
  const syncDb = db ?? new MemorySyncDatabase();
  return (
    <QueryClientProvider client={createTestQueryClient()}>
      <SyncContext.Provider
        value={{
          db: syncDb,
          syncStatus: {
            online: true,
            syncing: false,
            lastSyncedAt: null,
            failedCount: 0,
          },
          isReady: true,
          userId: null,
        }}
      >
        {children}
      </SyncContext.Provider>
    </QueryClientProvider>
  );
}

/** render() wrapped in TestProviders for querying components. */
export function renderWithProviders(
  ui: ReactNode,
  options?: { db?: MemorySyncDatabase },
) {
  return render(<TestProviders db={options?.db}>{ui}</TestProviders>);
}
