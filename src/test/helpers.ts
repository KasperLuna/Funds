import { vi } from "vitest";

// ── Financial Assertion Helpers ──────────────────────────────────────────────

/**
 * Assert two currency amounts are equal within floating-point tolerance.
 * Uses 2-decimal precision (cents).
 */
export function expectCurrencyEqual(actual: number, expected: number): void {
  const rounded = Math.round(actual * 100) / 100;
  const expectedRounded = Math.round(expected * 100) / 100;
  expect(rounded).toBe(expectedRounded);
}

/**
 * Assert a value is a non-negative number (valid for balances, amounts).
 */
export function expectNonNegative(value: number): void {
  expect(value).toBeGreaterThanOrEqual(0);
}

/**
 * Assert a percentage is within 0–100+ range (budget usage).
 */
export function expectValidPercentage(value: number): void {
  expect(value).toBeGreaterThanOrEqual(0);
  expect(Number.isFinite(value)).toBe(true);
}

// ── PocketBase Mock Helpers ──────────────────────────────────────────────────

export interface MockPocketBaseCollection {
  getFullList: ReturnType<typeof vi.fn>;
  getList: ReturnType<typeof vi.fn>;
  getOne: ReturnType<typeof vi.fn>;
  create: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
  subscribe: ReturnType<typeof vi.fn>;
  unsubscribe: ReturnType<typeof vi.fn>;
}

/**
 * Create a mock PocketBase collection with all common methods stubbed.
 * Pass optional overrides to pre-configure return values.
 */
export function createMockPBCollection(
  overrides?: Partial<Record<keyof MockPocketBaseCollection, unknown>>,
): MockPocketBaseCollection {
  return {
    getFullList: vi.fn().mockResolvedValue([]),
    getList: vi.fn().mockResolvedValue({ items: [], totalItems: 0, totalPages: 0 }),
    getOne: vi.fn().mockResolvedValue({}),
    create: vi.fn().mockResolvedValue({ id: "new-id" }),
    update: vi.fn().mockResolvedValue({}),
    delete: vi.fn().mockResolvedValue(true),
    subscribe: vi.fn().mockResolvedValue(undefined),
    unsubscribe: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

/**
 * Create a full mock PocketBase instance with `collection()` routing.
 * Provide a map of collection name → mock collection.
 */
export function createMockPB(collections: Record<string, Partial<MockPocketBaseCollection>> = {}): {
  collection: ReturnType<typeof vi.fn>;
  authStore: { record: { id: string }; isValid: boolean; clear: ReturnType<typeof vi.fn> };
} {
  const collectionMap: Record<string, MockPocketBaseCollection> = {};
  for (const [name, overrides] of Object.entries(collections)) {
    collectionMap[name] = createMockPBCollection(overrides);
  }

  return {
    collection: vi.fn((name: string) => {
      if (!collectionMap[name]) {
        collectionMap[name] = createMockPBCollection();
      }
      return collectionMap[name];
    }),
    authStore: {
      record: { id: "test-user" },
      isValid: true,
      clear: vi.fn(),
    },
  };
}

// ── Async Helpers ────────────────────────────────────────────────────────────

/**
 * Wait for a condition to become true, polling at short intervals.
 * Useful for waiting on React Query cache updates outside of RTL.
 */
export async function waitForCondition(
  condition: () => boolean,
  { timeout = 3000, interval = 50 } = {},
): Promise<void> {
  const start = Date.now();
  while (!condition()) {
    if (Date.now() - start > timeout) {
      throw new Error(`waitForCondition timed out after ${timeout}ms`);
    }
    await new Promise((r) => setTimeout(r, interval));
  }
}

/**
 * Flush all pending promises (useful after triggering mutations).
 */
export function flushPromises(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}
