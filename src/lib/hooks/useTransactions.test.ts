import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { createElement, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import {
  useTransactions,
  useCreateTransaction,
  useUpdateTransaction,
  useDeleteTransaction,
  buildFilterString,
} from "./useTransactions";
import type { Transaction } from "@/lib/types";

// ── Mocks ────────────────────────────────────────────────────────────────────

const mockTransactions: Transaction[] = [
  {
    id: "t1",
    user: "u1",
    description: "Groceries",
    type: "expense",
    amount: 50,
    bank: "b1",
    categories: ["cat1"],
    date: "2024-06-15T00:00:00.000Z",
  },
  {
    id: "t2",
    user: "u1",
    description: "Salary",
    type: "income",
    amount: 3000,
    bank: "b1",
    categories: ["cat2"],
    date: "2024-06-01T00:00:00.000Z",
  },
];

const mockCollection = {
  getFullList: vi.fn().mockResolvedValue(mockTransactions),
  create: vi
    .fn()
    .mockImplementation((data: Record<string, unknown>) =>
      Promise.resolve({ id: "t-new", ...data }),
    ),
  update: vi
    .fn()
    .mockImplementation((id: string, data: Record<string, unknown>) =>
      Promise.resolve({ id, ...data }),
    ),
  delete: vi.fn().mockResolvedValue(true),
};

vi.mock("@/lib/pocketbase/pocketbase", () => ({
  default: {
    collection: vi.fn(() => mockCollection),
    authStore: { record: { id: "u1" } },
  },
}));

// ── Helpers ──────────────────────────────────────────────────────────────────

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });
  return function Wrapper({ children }: { children: ReactNode }) {
    return createElement(QueryClientProvider, { client: queryClient }, children);
  };
}

// ── buildFilterString ────────────────────────────────────────────────────────

describe("buildFilterString", () => {
  it("returns user-only filter when no extra filters provided", () => {
    expect(buildFilterString("u1")).toBe('user = "u1"');
  });

  it("includes bankId when provided", () => {
    const result = buildFilterString("u1", "b1");
    expect(result).toContain('bank = "b1"');
    expect(result).toContain('user = "u1"');
  });

  it("includes type filter", () => {
    const result = buildFilterString("u1", undefined, { type: "expense" });
    expect(result).toContain('type = "expense"');
  });

  it("includes date range filters", () => {
    const start = new Date("2024-01-01");
    const end = new Date("2024-01-31");
    const result = buildFilterString("u1", undefined, { dateRange: { start, end } });
    expect(result).toContain(`date >= "${start.toISOString()}"`);
    expect(result).toContain(`date <= "${end.toISOString()}"`);
  });

  it("includes search text filter (case-insensitive via PocketBase ~)", () => {
    const result = buildFilterString("u1", undefined, { searchText: "grocery" });
    expect(result).toContain('description ~ "grocery"');
  });

  it("includes category filter with OR conditions", () => {
    const result = buildFilterString("u1", undefined, { categories: ["c1", "c2"] });
    expect(result).toContain('categories ~ "c1"');
    expect(result).toContain('categories ~ "c2"');
    expect(result).toContain("||");
  });

  it("combines multiple filters with &&", () => {
    const result = buildFilterString("u1", "b1", {
      type: "income",
      searchText: "sal",
    });
    expect(result).toBe('user = "u1" && bank = "b1" && type = "income" && description ~ "sal"');
  });
});

// ── useTransactions ──────────────────────────────────────────────────────────

describe("useTransactions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCollection.getFullList.mockResolvedValue(mockTransactions);
  });

  it("fetches transactions for the authenticated user", async () => {
    const { result } = renderHook(() => useTransactions(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(mockTransactions);
    expect(mockCollection.getFullList).toHaveBeenCalledWith(
      expect.objectContaining({
        filter: 'user = "u1"',
        sort: "-date,-created",
      }),
    );
  });

  it("scopes to a specific bank when bankId is provided", async () => {
    const { result } = renderHook(() => useTransactions("b1"), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockCollection.getFullList).toHaveBeenCalledWith(
      expect.objectContaining({
        filter: expect.stringContaining('bank = "b1"'),
      }),
    );
  });

  it("returns empty when no user is authenticated", async () => {
    const pb = await import("@/lib/pocketbase/pocketbase");
    const original = pb.default.authStore.record;
    // @ts-expect-error - testing unauthenticated state
    pb.default.authStore.record = null;

    const { result } = renderHook(() => useTransactions(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.fetchStatus).toBe("idle"));
    expect(result.current.data).toBeUndefined();

    pb.default.authStore.record = original;
  });
});

// ── useCreateTransaction ─────────────────────────────────────────────────────

describe("useCreateTransaction", () => {
  beforeEach(() => vi.clearAllMocks());

  it("creates a transaction via PocketBase", async () => {
    const { result } = renderHook(() => useCreateTransaction(), { wrapper: createWrapper() });

    const newTx = {
      description: "Coffee",
      type: "expense" as const,
      amount: 5,
      bank: "b1",
      categories: ["cat1"],
      date: "2024-06-20",
    };

    result.current.mutate(newTx);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockCollection.create).toHaveBeenCalledWith({
      ...newTx,
      user: "u1",
    });
  });
});

// ── useUpdateTransaction ─────────────────────────────────────────────────────

describe("useUpdateTransaction", () => {
  beforeEach(() => vi.clearAllMocks());

  it("updates a transaction via PocketBase", async () => {
    const { result } = renderHook(() => useUpdateTransaction(), { wrapper: createWrapper() });

    result.current.mutate({ id: "t1", data: { description: "Updated Groceries" } });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockCollection.update).toHaveBeenCalledWith("t1", { description: "Updated Groceries" });
  });
});

// ── useDeleteTransaction ─────────────────────────────────────────────────────

describe("useDeleteTransaction", () => {
  beforeEach(() => vi.clearAllMocks());

  it("deletes a transaction via PocketBase", async () => {
    const { result } = renderHook(() => useDeleteTransaction(), { wrapper: createWrapper() });

    result.current.mutate("t1");

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockCollection.delete).toHaveBeenCalledWith("t1");
  });
});
