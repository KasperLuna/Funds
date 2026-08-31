// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useSyncQuery, queryKeys } from "./sync-query";
import type { QueryResult, SyncDatabase } from "./types";

// cavetail: regression harness for the shared-cache poisoning bug — pages that
// share an entity query key used to re-seed the cache with their OWN mapped
// shape, so navigating crypto -> banks fed slim rows to banks' mapper and
// undefined money fields crashed BigInt math. The cache must hold RAW rows;
// selects apply per-render only.

const rowsBySql = new Map<string, Record<string, unknown>[]>();

const fakeDb = {
  query: vi.fn(async (sql: string) => ({
    rows: rowsBySql.get(norm(sql)) ?? [],
  })),
  watch: vi.fn(async function* (sql: string) {
    yield { rows: rowsBySql.get(norm(sql)) ?? [] } as unknown as QueryResult;
  }),
} as unknown as SyncDatabase;

vi.mock("./sync-store", () => ({
  useSyncStore: (selector: (s: typeof fakeSyncState) => unknown) => selector(fakeSyncState),
}));

const fakeSyncState = {
  db: fakeDb,
  syncStatus: { online: true, syncing: false, lastSyncedAt: null, failedCount: 0 },
  isReady: true,
  userId: "u1",
};

function norm(sql: string): string {
  return sql.replace(/\s+/g, " ").trim();
}

function makeQc(): QueryClient {
  return new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0, staleTime: 0 } },
  });
}

beforeEach(() => {
  rowsBySql.clear();
  vi.clearAllMocks();
});

describe("useSyncQuery shared-cache contract", () => {
  it("consumers with different selects sharing one key both see their own shape", async () => {
    rowsBySql.set(
      norm("SELECT * FROM accounts WHERE deleted_at IS NULL AND archived = 0"),
      [
        { id: "a1", name: "Checking", opening_balance_minor: "150000", kind: "bank" },
        { id: "a2", name: "Crypto", opening_balance_minor: "0", kind: "exchange" },
      ],
    );

    function SlimView() {
      const { data } = useSyncQuery({
        key: queryKeys.accounts,
        sql: "SELECT * FROM accounts WHERE deleted_at IS NULL AND archived = 0",
        select: (r) => `${String(r.id)}:${String(r.kind)}`,
      });
      return <div data-testid="slim">{(data ?? []).join(",")}</div>;
    }

    function FullView() {
      const { data } = useSyncQuery({
        key: queryKeys.accounts,
        sql: "SELECT * FROM accounts WHERE deleted_at IS NULL AND archived = 0",
        select: (r) => ({
          id: String(r.id),
          obm: BigInt(r.opening_balance_minor as string),
        }),
      });
      const total = (data ?? []).reduce((s, a) => s + a.obm, 0n);
      return <div data-testid="full">{String(total)}</div>;
    }

    render(
      <QueryClientProvider client={makeQc()}>
        <SlimView />
        <FullView />
      </QueryClientProvider>,
    );

    await waitFor(() => expect(screen.getByTestId("full").textContent).toBe("150000"));
    expect(screen.getByTestId("slim").textContent).toBe("a1:bank,a2:exchange");
  });

  it("same key with different scopes never cross-contaminates row sets", async () => {
    rowsBySql.set(norm("SELECT * FROM accounts WHERE archived = 0"), [
      { id: "active1" },
    ]);
    rowsBySql.set(norm("SELECT * FROM accounts WHERE archived = 1"), [
      { id: "archived1" },
    ]);

    function Probe({ scope, sql }: { scope?: string; sql: string }) {
      const { data } = useSyncQuery({
        key: queryKeys.accounts,
        scope,
        sql,
        select: (r) => String(r.id),
      });
      return <div data-testid={scope ?? "default"}>{(data ?? []).join(",")}</div>;
    }

    render(
      <QueryClientProvider client={makeQc()}>
        <>
          <Probe sql="SELECT * FROM accounts WHERE archived = 0" />
          <Probe scope="archived" sql="SELECT * FROM accounts WHERE archived = 1" />
        </>
      </QueryClientProvider>,
    );

    await waitFor(() =>
      expect(screen.getByTestId("default").textContent).toBe("active1"),
    );
    expect(screen.getByTestId("archived").textContent).toBe("archived1");
  });
});
