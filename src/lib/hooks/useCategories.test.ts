import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { createElement, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import {
  useCategories,
  useCreateCategory,
  useUpdateCategory,
  useDeleteCategory,
} from "./useCategories";
import type { Category } from "@/lib/types";

// ── Mocks ────────────────────────────────────────────────────────────────────

const mockCategories: Category[] = [
  {
    id: "c1",
    user: "u1",
    name: "Food",
    hideable: false,
    monthly_budget: 500,
  },
  {
    id: "c2",
    user: "u1",
    name: "Transport",
    hideable: true,
    total_exempt: true,
  },
];

const mockTransactionsCollection = {
  getFullList: vi.fn().mockResolvedValue([{ id: "t1", categories: ["c1", "c2"], user: "u1" }]),
  update: vi.fn().mockResolvedValue({}),
};

const mockCategoriesCollection = {
  getFullList: vi.fn().mockResolvedValue(mockCategories),
  create: vi
    .fn()
    .mockImplementation((data: Record<string, unknown>) =>
      Promise.resolve({ id: "c-new", ...data }),
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
    collection: vi.fn((name: string) => {
      if (name === "transactions") return mockTransactionsCollection;
      return mockCategoriesCollection;
    }),
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

describe("useCategories", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCategoriesCollection.getFullList.mockResolvedValue(mockCategories);
  });

  it("fetches categories for the authenticated user", async () => {
    const { result } = renderHook(() => useCategories(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(mockCategories);
    expect(mockCategoriesCollection.getFullList).toHaveBeenCalledWith({
      filter: 'user = "u1"',
      sort: "-created",
    });
  });

  it("returns empty array when no user is authenticated", async () => {
    const pb = await import("@/lib/pocketbase/pocketbase");
    const original = pb.default.authStore.record;
    // @ts-expect-error - testing unauthenticated state
    pb.default.authStore.record = null;

    const { result } = renderHook(() => useCategories(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.fetchStatus).toBe("idle"));
    expect(result.current.data).toBeUndefined();

    pb.default.authStore.record = original;
  });
});

describe("useCreateCategory", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates a category and calls PocketBase create", async () => {
    const { result } = renderHook(() => useCreateCategory(), { wrapper: createWrapper() });

    result.current.mutate({ name: "Entertainment", hideable: false, monthly_budget: 200 });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockCategoriesCollection.create).toHaveBeenCalledWith({
      name: "Entertainment",
      hideable: false,
      monthly_budget: 200,
      user: "u1",
    });
  });
});

describe("useUpdateCategory", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("updates a category and calls PocketBase update", async () => {
    const { result } = renderHook(() => useUpdateCategory(), { wrapper: createWrapper() });

    result.current.mutate({ id: "c1", data: { name: "Groceries", monthly_budget: 600 } });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockCategoriesCollection.update).toHaveBeenCalledWith("c1", {
      name: "Groceries",
      monthly_budget: 600,
    });
  });
});

describe("useDeleteCategory", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTransactionsCollection.getFullList.mockResolvedValue([
      { id: "t1", categories: ["c1", "c2"], user: "u1" },
    ]);
    mockTransactionsCollection.update.mockResolvedValue({});
    mockCategoriesCollection.delete.mockResolvedValue(true);
  });

  it("deletes a category and calls PocketBase delete", async () => {
    const { result } = renderHook(() => useDeleteCategory(), { wrapper: createWrapper() });

    result.current.mutate("c1");

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockCategoriesCollection.delete).toHaveBeenCalledWith("c1");
  });

  it("removes the category from associated transactions on delete", async () => {
    const { result } = renderHook(() => useDeleteCategory(), { wrapper: createWrapper() });

    result.current.mutate("c1");

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // Should have fetched transactions referencing the category
    expect(mockTransactionsCollection.getFullList).toHaveBeenCalledWith({
      filter: 'user = "u1" && categories ~ "c1"',
    });

    // Should have updated the transaction to remove the deleted category
    expect(mockTransactionsCollection.update).toHaveBeenCalledWith("t1", {
      categories: ["c2"],
    });
  });
});
