/**
 * Integration tests for Planned transactions (recurrence, timezone)
 * Validates: Requirement 28.5
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { createElement, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { calculateNextOccurrence } from "@/lib/utils/recurrence";
import { usePlannedTransactions } from "@/lib/hooks/usePlannedTransactions";
import { createMockPlannedTransaction } from "@/test/factories";
import type { PlannedTransaction, RecurrenceRule } from "@/lib/types";

// ── Mocks ────────────────────────────────────────────────────────────────────

const mockPlanned: PlannedTransaction[] = [
  createMockPlannedTransaction({
    id: "p1",
    description: "Monthly rent",
    recurrence: { frequency: "monthly", interval: 1 },
    timezone: 0,
  }),
];

const mockCollection = {
  getFullList: vi.fn().mockResolvedValue(mockPlanned),
  create: vi
    .fn()
    .mockImplementation((data: Record<string, unknown>) =>
      Promise.resolve({ id: "p-new", ...data }),
    ),
  update: vi.fn().mockResolvedValue({}),
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

describe("Planned transactions integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCollection.getFullList.mockResolvedValue(mockPlanned);
  });

  describe("Fetching planned transactions", () => {
    it("fetches planned transactions for authenticated user", async () => {
      const { result } = renderHook(() => usePlannedTransactions(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toHaveLength(1);
      expect(result.current.data![0].description).toBe("Monthly rent");
    });
  });

  describe("Recurrence calculation - daily", () => {
    it("calculates next daily occurrence", () => {
      const rule: RecurrenceRule = { frequency: "daily", interval: 1 };
      const prev = new Date("2024-06-15T10:00:00Z");
      const next = calculateNextOccurrence(rule, prev);

      expect(next.getTime()).toBeGreaterThan(prev.getTime());
      expect(next.getDate()).toBe(16);
    });

    it("calculates next occurrence with interval > 1", () => {
      const rule: RecurrenceRule = { frequency: "daily", interval: 3 };
      const prev = new Date("2024-06-15T10:00:00Z");
      const next = calculateNextOccurrence(rule, prev);

      expect(next.getDate()).toBe(18);
    });
  });

  describe("Recurrence calculation - weekly", () => {
    it("calculates next weekly occurrence", () => {
      const rule: RecurrenceRule = { frequency: "weekly", interval: 1 };
      const prev = new Date("2024-06-15T10:00:00Z");
      const next = calculateNextOccurrence(rule, prev);

      const diffDays = (next.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24);
      expect(diffDays).toBe(7);
    });

    it("calculates bi-weekly occurrence", () => {
      const rule: RecurrenceRule = { frequency: "weekly", interval: 2 };
      const prev = new Date("2024-06-15T10:00:00Z");
      const next = calculateNextOccurrence(rule, prev);

      const diffDays = (next.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24);
      expect(diffDays).toBe(14);
    });
  });

  describe("Recurrence calculation - monthly", () => {
    it("calculates next monthly occurrence", () => {
      const rule: RecurrenceRule = { frequency: "monthly", interval: 1 };
      const prev = new Date("2024-06-15T10:00:00Z");
      const next = calculateNextOccurrence(rule, prev);

      expect(next.getMonth()).toBe(6); // July
      expect(next.getDate()).toBe(15);
    });

    it("handles month overflow (Jan 31 -> Feb 28/29)", () => {
      const rule: RecurrenceRule = { frequency: "monthly", interval: 1 };
      const prev = new Date("2024-01-31T10:00:00Z");
      const next = calculateNextOccurrence(rule, prev);

      // 2024 is a leap year, so Feb has 29 days
      expect(next.getMonth()).toBe(1); // February
      expect(next.getDate()).toBe(29);
    });

    it("handles month overflow in non-leap year", () => {
      const rule: RecurrenceRule = { frequency: "monthly", interval: 1 };
      const prev = new Date("2023-01-31T10:00:00Z");
      const next = calculateNextOccurrence(rule, prev);

      expect(next.getMonth()).toBe(1); // February
      expect(next.getDate()).toBe(28);
    });
  });

  describe("Recurrence calculation - yearly", () => {
    it("calculates next yearly occurrence", () => {
      const rule: RecurrenceRule = { frequency: "yearly", interval: 1 };
      const prev = new Date("2024-06-15T10:00:00Z");
      const next = calculateNextOccurrence(rule, prev);

      expect(next.getFullYear()).toBe(2025);
      expect(next.getMonth()).toBe(5); // June
      expect(next.getDate()).toBe(15);
    });

    it("handles leap year edge case (Feb 29 -> Feb 28)", () => {
      const rule: RecurrenceRule = { frequency: "yearly", interval: 1 };
      const prev = new Date("2024-02-29T10:00:00Z");
      const next = calculateNextOccurrence(rule, prev);

      expect(next.getFullYear()).toBe(2025);
      expect(next.getMonth()).toBe(1); // February
      expect(next.getDate()).toBe(28);
    });
  });

  describe("Next occurrence is always after previous", () => {
    it("daily: next > previous", () => {
      const rule: RecurrenceRule = { frequency: "daily", interval: 1 };
      const prev = new Date("2024-06-15T10:00:00Z");
      const next = calculateNextOccurrence(rule, prev);
      expect(next.getTime()).toBeGreaterThan(prev.getTime());
    });

    it("weekly: next > previous", () => {
      const rule: RecurrenceRule = { frequency: "weekly", interval: 1 };
      const prev = new Date("2024-06-15T10:00:00Z");
      const next = calculateNextOccurrence(rule, prev);
      expect(next.getTime()).toBeGreaterThan(prev.getTime());
    });

    it("monthly: next > previous", () => {
      const rule: RecurrenceRule = { frequency: "monthly", interval: 1 };
      const prev = new Date("2024-06-15T10:00:00Z");
      const next = calculateNextOccurrence(rule, prev);
      expect(next.getTime()).toBeGreaterThan(prev.getTime());
    });

    it("yearly: next > previous", () => {
      const rule: RecurrenceRule = { frequency: "yearly", interval: 1 };
      const prev = new Date("2024-06-15T10:00:00Z");
      const next = calculateNextOccurrence(rule, prev);
      expect(next.getTime()).toBeGreaterThan(prev.getTime());
    });
  });

  describe("Default interval", () => {
    it("uses interval of 1 when not specified", () => {
      const rule: RecurrenceRule = { frequency: "daily" };
      const prev = new Date("2024-06-15T10:00:00Z");
      const next = calculateNextOccurrence(rule, prev);

      expect(next.getDate()).toBe(16);
    });
  });
});
