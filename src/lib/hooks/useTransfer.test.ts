import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { createElement, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { useTransfer } from "./useTransfer";
import type { Transfer } from "@/lib/types";

// ── Mocks ────────────────────────────────────────────────────────────────────

const mockCollection = {
  create: vi
    .fn()
    .mockImplementation((data: Record<string, unknown>) =>
      Promise.resolve({ id: `tx-${Date.now()}`, ...data }),
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

const baseTransfer: Transfer = {
  description: "Savings transfer",
  originAmount: 500,
  destinationAmount: 500,
  originBank: "bank-checking",
  destinationBank: "bank-savings",
  date: new Date("2024-06-15T00:00:00.000Z"),
  category: ["cat-transfer"],
};

// ── Tests ────────────────────────────────────────────────────────────────────

describe("useTransfer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCollection.create.mockImplementation((data: Record<string, unknown>) =>
      Promise.resolve({ id: `tx-${Math.random()}`, ...data }),
    );
  });

  it("creates a withdrawal and deposit transaction", async () => {
    const { result } = renderHook(() => useTransfer(), { wrapper: createWrapper() });

    result.current.mutate(baseTransfer);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockCollection.create).toHaveBeenCalledTimes(2);

    // First call: withdrawal from origin
    expect(mockCollection.create).toHaveBeenNthCalledWith(1, {
      user: "u1",
      description: "Savings transfer",
      type: "withdrawal",
      amount: 500,
      bank: "bank-checking",
      categories: ["cat-transfer"],
      date: "2024-06-15T00:00:00.000Z",
    });

    // Second call: deposit to destination
    expect(mockCollection.create).toHaveBeenNthCalledWith(2, {
      user: "u1",
      description: "Savings transfer",
      type: "deposit",
      amount: 500,
      bank: "bank-savings",
      categories: ["cat-transfer"],
      date: "2024-06-15T00:00:00.000Z",
    });
  });

  it("returns both withdrawal and deposit transactions on success", async () => {
    mockCollection.create
      .mockResolvedValueOnce({ id: "w1", type: "withdrawal" })
      .mockResolvedValueOnce({ id: "d1", type: "deposit" });

    const { result } = renderHook(() => useTransfer(), { wrapper: createWrapper() });

    result.current.mutate(baseTransfer);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual({
      withdrawal: { id: "w1", type: "withdrawal" },
      deposit: { id: "d1", type: "deposit" },
    });
  });

  it("rolls back withdrawal if deposit creation fails", async () => {
    mockCollection.create
      .mockResolvedValueOnce({ id: "w1", type: "withdrawal" })
      .mockRejectedValueOnce(new Error("Deposit failed"));

    const { result } = renderHook(() => useTransfer(), { wrapper: createWrapper() });

    result.current.mutate(baseTransfer);

    await waitFor(() => expect(result.current.isError).toBe(true));

    // Should have attempted to delete the withdrawal
    expect(mockCollection.delete).toHaveBeenCalledWith("w1");
    expect(result.current.error?.message).toBe("Deposit failed");
  });

  it("still throws original error if rollback also fails", async () => {
    mockCollection.create
      .mockResolvedValueOnce({ id: "w1", type: "withdrawal" })
      .mockRejectedValueOnce(new Error("Deposit failed"));
    mockCollection.delete.mockRejectedValueOnce(new Error("Delete failed"));

    const { result } = renderHook(() => useTransfer(), { wrapper: createWrapper() });

    result.current.mutate(baseTransfer);

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error?.message).toBe("Deposit failed");
  });

  it("uses empty categories when category is undefined", async () => {
    const transferNoCategory: Transfer = {
      ...baseTransfer,
      category: undefined,
    };

    const { result } = renderHook(() => useTransfer(), { wrapper: createWrapper() });

    result.current.mutate(transferNoCategory);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockCollection.create).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ categories: [] }),
    );
    expect(mockCollection.create).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ categories: [] }),
    );
  });

  it("uses the same description and date for both transactions", async () => {
    const { result } = renderHook(() => useTransfer(), { wrapper: createWrapper() });

    result.current.mutate(baseTransfer);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const [call1, call2] = mockCollection.create.mock.calls;
    expect(call1[0].description).toBe(call2[0].description);
    expect(call1[0].date).toBe(call2[0].date);
  });

  it("throws when user is not authenticated", async () => {
    const pb = await import("@/lib/pocketbase/pocketbase");
    const original = pb.default.authStore.record;
    // @ts-expect-error - testing unauthenticated state
    pb.default.authStore.record = null;

    const { result } = renderHook(() => useTransfer(), { wrapper: createWrapper() });

    result.current.mutate(baseTransfer);

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe("User not authenticated");

    pb.default.authStore.record = original;
  });
});
