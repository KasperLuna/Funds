/**
 * Integration tests for Transaction management (CRUD, optimistic updates)
 * Validates: Requirement 28.2
 */
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
} from "@/lib/hooks/useTransactions";
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
    date: "2024-06-15",
  },
  {
    id: "t2",
    user: "u1",
    description: "Salary",
    type: "income",
    amount: 3000,
    bank: "b1",
    categories: ["cat2"],
    date: "2024-06-01",
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
      Promise.resolve({ id, ...mockTransactions[0], ...data }),
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

describe("Transaction management integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCollection.getFullList.mockResolvedValue(mockTransactions);
  });

  describe("Read transactions", () => {
    it("fetches transactions for the authenticated user", async () => {
      const { result } = renderHook(() => useTransactions(), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toEqual(mockTransactions);
      expect(result.current.data).toHaveLength(2);
    });

    it("fetches transactions filtered by bank", async () => {
      const { result } = renderHook(() => useTransactions("b1"), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(mockCollection.getFullList).toHaveBeenCalledWith(
        expect.objectContaining({
          filter: expect.stringContaining('bank = "b1"'),
        }),
      );
    });
  });

  describe("Create transaction", () => {
    it("creates a transaction via PocketBase", async () => {
      const { result } = renderHook(() => useCreateTransaction(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({
        description: "New expense",
        type: "expense",
        amount: 25,
        bank: "b1",
        categories: ["cat1"],
        date: "2024-06-20",
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(mockCollection.create).toHaveBeenCalledWith(
        expect.objectContaining({
          description: "New expense",
          type: "expense",
          amount: 25,
          bank: "b1",
          user: "u1",
        }),
      );
    });
  });

  describe("Update transaction", () => {
    it("updates a transaction via PocketBase", async () => {
      const { result } = renderHook(() => useUpdateTransaction(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({ id: "t1", data: { description: "Updated groceries", amount: 60 } });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(mockCollection.update).toHaveBeenCalledWith("t1", {
        description: "Updated groceries",
        amount: 60,
      });
    });
  });

  describe("Delete transaction", () => {
    it("deletes a transaction via PocketBase", async () => {
      const { result } = renderHook(() => useDeleteTransaction(), {
        wrapper: createWrapper(),
      });

      result.current.mutate("t1");

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(mockCollection.delete).toHaveBeenCalledWith("t1");
    });
  });

  describe("Filter string builder", () => {
    it("builds filter with user only", () => {
      const filter = buildFilterString("u1");
      expect(filter).toBe('user = "u1"');
    });

    it("builds filter with bank", () => {
      const filter = buildFilterString("u1", "b1");
      expect(filter).toContain('bank = "b1"');
    });

    it("builds filter with search text", () => {
      const filter = buildFilterString("u1", undefined, { searchText: "grocery" });
      expect(filter).toContain('description ~ "grocery"');
    });

    it("builds filter with date range", () => {
      const start = new Date("2024-01-01");
      const end = new Date("2024-12-31");
      const filter = buildFilterString("u1", undefined, { dateRange: { start, end } });
      expect(filter).toContain("date >=");
      expect(filter).toContain("date <=");
    });

    it("builds filter with categories", () => {
      const filter = buildFilterString("u1", undefined, { categories: ["cat1", "cat2"] });
      expect(filter).toContain('categories ~ "cat1"');
      expect(filter).toContain('categories ~ "cat2"');
    });
  });
});
