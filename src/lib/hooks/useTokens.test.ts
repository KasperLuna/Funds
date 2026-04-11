import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { createElement, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { useTokens, useCreateToken, useUpdateToken, useDeleteToken } from "./useTokens";
import type { Token } from "@/lib/types";

// ── Mocks ────────────────────────────────────────────────────────────────────

const mockTokens: Token[] = [
  {
    id: "t1",
    user: "u1",
    name: "Bitcoin",
    symbol: "BTC",
    coingecko_id: "bitcoin",
    total: 0.5,
    costAvg: 30000,
  },
  {
    id: "t2",
    user: "u1",
    name: "Ethereum",
    symbol: "ETH",
    coingecko_id: "ethereum",
    total: 10,
    costAvg: 1800,
  },
];

const mockCollection = {
  getFullList: vi.fn().mockResolvedValue(mockTokens),
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

// ── Tests ────────────────────────────────────────────────────────────────────

describe("useTokens", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCollection.getFullList.mockResolvedValue(mockTokens);
  });

  it("fetches tokens for the authenticated user", async () => {
    const { result } = renderHook(() => useTokens(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(mockTokens);
    expect(mockCollection.getFullList).toHaveBeenCalledWith({
      filter: 'user = "u1"',
      sort: "-created",
    });
  });

  it("returns undefined when no user is authenticated", async () => {
    const pb = await import("@/lib/pocketbase/pocketbase");
    const original = pb.default.authStore.record;
    // @ts-expect-error - testing unauthenticated state
    pb.default.authStore.record = null;

    const { result } = renderHook(() => useTokens(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.fetchStatus).toBe("idle"));
    expect(result.current.data).toBeUndefined();

    pb.default.authStore.record = original;
  });
});

describe("useCreateToken", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates a token and calls PocketBase create", async () => {
    const { result } = renderHook(() => useCreateToken(), { wrapper: createWrapper() });

    result.current.mutate({
      name: "Solana",
      symbol: "SOL",
      coingecko_id: "solana",
      total: 100,
      costAvg: 25,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockCollection.create).toHaveBeenCalledWith({
      name: "Solana",
      symbol: "SOL",
      coingecko_id: "solana",
      total: 100,
      costAvg: 25,
      user: "u1",
    });
  });
});

describe("useUpdateToken", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("updates a token and calls PocketBase update", async () => {
    const { result } = renderHook(() => useUpdateToken(), { wrapper: createWrapper() });

    result.current.mutate({ id: "t1", data: { total: 1.0, costAvg: 35000 } });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockCollection.update).toHaveBeenCalledWith("t1", { total: 1.0, costAvg: 35000 });
  });
});

describe("useDeleteToken", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("deletes a token and calls PocketBase delete", async () => {
    const { result } = renderHook(() => useDeleteToken(), { wrapper: createWrapper() });

    result.current.mutate("t1");

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockCollection.delete).toHaveBeenCalledWith("t1");
  });
});
