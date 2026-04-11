/**
 * Integration tests for React Query (caching, invalidation, optimistic updates)
 * Validates: Requirement 28.6
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { createElement, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { useBanks, useCreateBank, useDeleteBank } from "@/lib/hooks/useBanks";
import { useCategories } from "@/lib/hooks/useCategories";
import type { Bank, Category } from "@/lib/types";

// ── Mocks ────────────────────────────────────────────────────────────────────

const mockBanks: Bank[] = [
  { id: "b1", user: "u1", name: "Checking", balance: 1000 },
  { id: "b2", user: "u1", name: "Savings", balance: 5000 },
];

const mockCategories: Category[] = [
  { id: "c1", user: "u1", name: "Food", hideable: false, monthly_budget: 500 },
];

let bankCollection: ReturnType<typeof createMockCollection>;
let categoryCollection: ReturnType<typeof createMockCollection>;

function createMockCollection(defaultData: unknown[] = []) {
  return {
    getFullList: vi.fn().mockResolvedValue(defaultData),
    create: vi
      .fn()
      .mockImplementation((data: Record<string, unknown>) =>
        Promise.resolve({ id: `new-${Date.now()}`, ...data }),
      ),
    update: vi.fn().mockResolvedValue({}),
    delete: vi.fn().mockResolvedValue(true),
  };
}

vi.mock("@/lib/pocketbase/pocketbase", () => ({
  default: {
    collection: vi.fn((name: string) => {
      if (name === "banks") return bankCollection;
      if (name === "categories") return categoryCollection;
      return createMockCollection();
    }),
    authStore: { record: { id: "u1" } },
  },
}));

// ── Helpers ──────────────────────────────────────────────────────────────────

function createWrapper(queryClient?: QueryClient) {
  const client =
    queryClient ??
    new QueryClient({
      defaultOptions: {
        queries: { retry: false, gcTime: Infinity, staleTime: Infinity },
        mutations: { retry: false },
      },
    });
  return {
    queryClient: client,
    wrapper: function Wrapper({ children }: { children: ReactNode }) {
      return createElement(QueryClientProvider, { client }, children);
    },
  };
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe("React Query integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    bankCollection = createMockCollection(mockBanks);
    categoryCollection = createMockCollection(mockCategories);
  });

  describe("Caching", () => {
    it("caches bank data after initial fetch", async () => {
      const { queryClient, wrapper } = createWrapper();

      const { result } = renderHook(() => useBanks(), { wrapper });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      const cachedData = queryClient.getQueryData(["banks", "list"]);
      expect(cachedData).toEqual(mockBanks);
    });

    it("caches category data after initial fetch", async () => {
      const { queryClient, wrapper } = createWrapper();

      const { result } = renderHook(() => useCategories(), { wrapper });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      const cachedData = queryClient.getQueryData(["categories", "list"]);
      expect(cachedData).toEqual(mockCategories);
    });

    it("uses cached data on subsequent renders without refetching", async () => {
      const { wrapper } = createWrapper();

      // First render fetches data
      const { result: result1 } = renderHook(() => useBanks(), { wrapper });
      await waitFor(() => expect(result1.current.isSuccess).toBe(true));

      const callCountAfterFirst = bankCollection.getFullList.mock.calls.length;

      // Second render should use cache (staleTime is Infinity)
      const { result: result2 } = renderHook(() => useBanks(), { wrapper });
      await waitFor(() => expect(result2.current.data).toBeDefined());

      // No additional fetch calls since data is still fresh
      expect(bankCollection.getFullList).toHaveBeenCalledTimes(callCountAfterFirst);
    });
  });

  describe("Optimistic updates", () => {
    it("optimistically removes a bank from cache on delete", async () => {
      const { queryClient, wrapper } = createWrapper();

      // Pre-populate cache
      queryClient.setQueryData(["banks", "list"], [...mockBanks]);

      const { result } = renderHook(() => useDeleteBank(), { wrapper });

      act(() => {
        result.current.mutate("b1");
      });

      // Check optimistic removal
      await waitFor(() => {
        const cached = queryClient.getQueryData<Bank[]>(["banks", "list"]);
        expect(cached?.find((b) => b.id === "b1")).toBeUndefined();
      });
    });

    it("rolls back optimistic update on mutation error", async () => {
      const { queryClient, wrapper } = createWrapper();

      const originalBanks = [...mockBanks];
      queryClient.setQueryData(["banks", "list"], originalBanks);

      // Make delete fail
      bankCollection.delete.mockRejectedValueOnce(new Error("Server error"));
      // Prevent refetch from clearing the rollback
      bankCollection.getFullList.mockResolvedValue(originalBanks);

      const { result } = renderHook(() => useDeleteBank(), { wrapper });

      act(() => {
        result.current.mutate("b1");
      });

      await waitFor(() => expect(result.current.isError).toBe(true));

      // After error, the onError handler should have rolled back
      // and onSettled will invalidate, causing a refetch with original data
      await waitFor(() => {
        const cached = queryClient.getQueryData<Bank[]>(["banks", "list"]);
        expect(cached?.find((b) => b.id === "b1")).toBeDefined();
      });
    });
  });

  describe("Cache invalidation", () => {
    it("invalidates bank cache after successful create mutation", async () => {
      const { wrapper } = createWrapper(
        new QueryClient({
          defaultOptions: {
            queries: { retry: false, gcTime: 0, staleTime: 0 },
            mutations: { retry: false },
          },
        }),
      );

      // Fetch initial data
      const { result: banksResult } = renderHook(() => useBanks(), { wrapper });
      await waitFor(() => expect(banksResult.current.isSuccess).toBe(true));

      const initialCallCount = bankCollection.getFullList.mock.calls.length;

      // Perform mutation
      const { result: createResult } = renderHook(() => useCreateBank(), { wrapper });

      await act(async () => {
        createResult.current.mutate({ name: "Another Bank" });
      });

      await waitFor(() => expect(createResult.current.isSuccess).toBe(true));

      // getFullList should be called again due to invalidation
      await waitFor(() => {
        expect(bankCollection.getFullList.mock.calls.length).toBeGreaterThan(initialCallCount);
      });
    });
  });
});
