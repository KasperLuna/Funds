import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { createElement, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { useBanks, useCreateBank, useUpdateBank, useDeleteBank } from "./useBanks";
import type { Bank } from "@/lib/types";

// ── Mocks ────────────────────────────────────────────────────────────────────

const mockBanks: Bank[] = [
  {
    id: "b1",
    user: "u1",
    name: "Checking",
    balance: 1000,
    primaryColor: "#0000ff",
    secondaryColor: "#ffffff",
  },
  {
    id: "b2",
    user: "u1",
    name: "Savings",
    balance: 5000,
  },
];

const mockCollection = {
  getFullList: vi.fn().mockResolvedValue(mockBanks),
  create: vi
    .fn()
    .mockImplementation((data: Record<string, unknown>) =>
      Promise.resolve({ id: "b-new", ...data }),
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

describe("useBanks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCollection.getFullList.mockResolvedValue(mockBanks);
  });

  it("fetches banks for the authenticated user", async () => {
    const { result } = renderHook(() => useBanks(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(mockBanks);
    expect(mockCollection.getFullList).toHaveBeenCalledWith({
      filter: 'user = "u1"',
      sort: "-created",
    });
  });

  it("returns empty array when no user is authenticated", async () => {
    const pb = await import("@/lib/pocketbase/pocketbase");
    const original = pb.default.authStore.record;
    // @ts-expect-error - testing unauthenticated state
    pb.default.authStore.record = null;

    const { result } = renderHook(() => useBanks(), { wrapper: createWrapper() });

    // Query should be disabled, so data stays undefined
    await waitFor(() => expect(result.current.fetchStatus).toBe("idle"));
    expect(result.current.data).toBeUndefined();

    pb.default.authStore.record = original;
  });
});

describe("useCreateBank", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates a bank and calls PocketBase create", async () => {
    const { result } = renderHook(() => useCreateBank(), { wrapper: createWrapper() });

    result.current.mutate({ name: "New Bank", primaryColor: "#ff0000" });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockCollection.create).toHaveBeenCalledWith({
      name: "New Bank",
      primaryColor: "#ff0000",
      user: "u1",
      balance: 0,
    });
  });
});

describe("useUpdateBank", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("updates a bank and calls PocketBase update", async () => {
    const { result } = renderHook(() => useUpdateBank(), { wrapper: createWrapper() });

    result.current.mutate({ id: "b1", data: { name: "Updated Checking" } });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockCollection.update).toHaveBeenCalledWith("b1", { name: "Updated Checking" });
  });
});

describe("useDeleteBank", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("deletes a bank and calls PocketBase delete", async () => {
    const { result } = renderHook(() => useDeleteBank(), { wrapper: createWrapper() });

    result.current.mutate("b1");

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockCollection.delete).toHaveBeenCalledWith("b1");
  });
});
