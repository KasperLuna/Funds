import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { createElement, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import {
  usePlannedTransactions,
  useCreatePlannedTransaction,
  useUpdatePlannedTransaction,
  useDeletePlannedTransaction,
} from "./usePlannedTransactions";
import type { PlannedTransaction } from "@/lib/types";

// ── Mocks ────────────────────────────────────────────────────────────────────

const mockPlanned: PlannedTransaction[] = [
  {
    id: "pt1",
    user: "u1",
    description: "Monthly Rent",
    type: "expense",
    amount: 1200,
    bank: "b1",
    categories: ["c1"],
    recurrence: { frequency: "monthly", interval: 1 },
    timezone: -5,
    previousDate: null,
    invokeDate: new Date("2024-02-01"),
    active: true,
  },
  {
    id: "pt2",
    user: "u1",
    description: "Weekly Salary",
    type: "income",
    amount: 2000,
    bank: "b1",
    categories: ["c2"],
    recurrence: { frequency: "weekly" },
    timezone: -5,
    previousDate: new Date("2024-01-25"),
    invokeDate: new Date("2024-02-01"),
    active: true,
  },
];

const mockCollection = {
  getFullList: vi.fn().mockResolvedValue(mockPlanned),
  create: vi
    .fn()
    .mockImplementation((data: Record<string, unknown>) =>
      Promise.resolve({ id: "pt-new", ...data }),
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

describe("usePlannedTransactions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCollection.getFullList.mockResolvedValue(mockPlanned);
  });

  it("fetches planned transactions for the authenticated user", async () => {
    const { result } = renderHook(() => usePlannedTransactions(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(mockPlanned);
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

    const { result } = renderHook(() => usePlannedTransactions(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.fetchStatus).toBe("idle"));
    expect(result.current.data).toBeUndefined();

    pb.default.authStore.record = original;
  });
});

describe("useCreatePlannedTransaction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates a planned transaction and calls PocketBase create", async () => {
    const { result } = renderHook(() => useCreatePlannedTransaction(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({
      description: "New Subscription",
      type: "expense",
      amount: 15,
      bank: "b1",
      categories: ["c1"],
      recurrence: { frequency: "monthly", interval: 1 },
      timezone: -5,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockCollection.create).toHaveBeenCalledWith(
      expect.objectContaining({
        description: "New Subscription",
        type: "expense",
        amount: 15,
        bank: "b1",
        categories: ["c1"],
        recurrence: { frequency: "monthly", interval: 1 },
        timezone: -5,
        user: "u1",
        active: true,
        previousDate: null,
      }),
    );
  });
});

describe("useUpdatePlannedTransaction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("updates a planned transaction and calls PocketBase update", async () => {
    const { result } = renderHook(() => useUpdatePlannedTransaction(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ id: "pt1", data: { description: "Updated Rent", active: false } });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockCollection.update).toHaveBeenCalledWith("pt1", {
      description: "Updated Rent",
      active: false,
    });
  });
});

describe("useDeletePlannedTransaction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("deletes a planned transaction and calls PocketBase delete", async () => {
    const { result } = renderHook(() => useDeletePlannedTransaction(), {
      wrapper: createWrapper(),
    });

    result.current.mutate("pt1");

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockCollection.delete).toHaveBeenCalledWith("pt1");
  });
});
