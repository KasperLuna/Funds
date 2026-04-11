import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ClientResponseError } from "pocketbase";
import { handleApiError, retryWithBackoff, calculateBackoffDelay } from "./error";

// Mock PocketBase client
vi.mock("@/lib/pocketbase/pocketbase", () => ({
  default: {
    authStore: { clear: vi.fn() },
  },
}));

// Mock auth store
const mockClearAuth = vi.fn();
vi.mock("@/lib/stores/useAuthStore", () => ({
  useAuthStore: {
    getState: () => ({ clearAuth: mockClearAuth }),
  },
}));

// Helper to create a ClientResponseError with a given status
function makePBError(
  status: number,
  message = "error",
  responseData?: Record<string, unknown>,
): ClientResponseError {
  const err = new ClientResponseError({
    status,
    message,
    data: responseData ?? {},
  });
  return err;
}

describe("handleApiError", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    mockClearAuth.mockClear();
  });

  // --- 401 Unauthorized ---
  it("handles 401 by clearing auth and flagging as auth error", () => {
    const error = makePBError(401, "Unauthorized");
    const result = handleApiError(error);

    expect(result.isAuthError).toBe(true);
    expect(result.isValidationError).toBe(false);
    expect(result.isNetworkError).toBe(false);
    expect(result.message).toContain("Session expired");
    expect(mockClearAuth).toHaveBeenCalledOnce();
  });

  // --- 422 Validation ---
  it("handles 422 by extracting validation errors", () => {
    const fieldErrors = {
      name: { code: "validation_required", message: "Name is required." },
    };
    const error = makePBError(422, "Validation failed", fieldErrors);
    const result = handleApiError(error);

    expect(result.isValidationError).toBe(true);
    expect(result.isAuthError).toBe(false);
    expect(result.isNetworkError).toBe(false);
    expect(result.validationErrors).toBeDefined();
    expect(result.message).toContain("fix the highlighted errors");
  });

  // --- Network error (status 0) ---
  it("handles PocketBase network error (status 0)", () => {
    const error = makePBError(0, "Failed to fetch");
    const result = handleApiError(error);

    expect(result.isNetworkError).toBe(true);
    expect(result.isAuthError).toBe(false);
    expect(result.isValidationError).toBe(false);
    expect(result.message).toContain("Network error");
  });

  // --- Other PocketBase errors ---
  it("handles other PocketBase errors generically", () => {
    const error = makePBError(500, "Internal Server Error");
    const result = handleApiError(error);

    expect(result.isAuthError).toBe(false);
    expect(result.isValidationError).toBe(false);
    expect(result.isNetworkError).toBe(false);
    expect(result.message).toBeTruthy();
    expect(result.message.length).toBeGreaterThan(0);
  });

  // --- Standard JS network error ---
  it("handles TypeError (failed to fetch) as network error", () => {
    const error = new TypeError("Failed to fetch");
    const result = handleApiError(error);

    expect(result.isNetworkError).toBe(true);
    expect(result.message).toContain("Network error");
  });

  // --- Generic JS Error ---
  it("handles generic Error with its message", () => {
    const error = new Error("Something broke");
    // Override name so it's not TypeError
    error.name = "Error";
    const result = handleApiError(error);

    expect(result.isNetworkError).toBe(false);
    expect(result.message).toBe("Something broke");
  });

  // --- Unknown error shape ---
  it("handles completely unknown error types", () => {
    const result = handleApiError("string error");

    expect(result.isAuthError).toBe(false);
    expect(result.isValidationError).toBe(false);
    expect(result.isNetworkError).toBe(false);
    expect(result.message).toContain("unexpected error");
  });

  it("handles null/undefined errors", () => {
    const result = handleApiError(null);
    expect(result.message).toContain("unexpected error");
  });
});

describe("calculateBackoffDelay", () => {
  it("increases delay exponentially with attempt number", () => {
    // With no jitter randomness, base pattern is baseDelay * 2^attempt
    const base = 1000;
    const max = 30000;

    // Attempt 0: ~1000, Attempt 1: ~2000, Attempt 2: ~4000
    const d0 = calculateBackoffDelay(0, base, max);
    const d1 = calculateBackoffDelay(1, base, max);

    // Due to jitter, we can only assert ranges
    expect(d0).toBeGreaterThanOrEqual(base);
    expect(d0).toBeLessThanOrEqual(base * 2); // 1000 + up to 1000 jitter
    expect(d1).toBeGreaterThanOrEqual(base * 2);
    expect(d1).toBeLessThanOrEqual(base * 3); // 2000 + up to 1000 jitter
  });

  it("caps delay at maxDelayMs", () => {
    const delay = calculateBackoffDelay(20, 1000, 5000);
    expect(delay).toBeLessThanOrEqual(5000);
  });
});

describe("retryWithBackoff", () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("returns result on first success", async () => {
    const fn = vi.fn().mockResolvedValue("ok");
    const result = await retryWithBackoff(fn, {
      maxRetries: 3,
      baseDelayMs: 10,
    });

    expect(result).toBe("ok");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("retries on transient failure then succeeds", async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(makePBError(500, "Server Error"))
      .mockResolvedValue("recovered");

    const result = await retryWithBackoff(fn, {
      maxRetries: 3,
      baseDelayMs: 10,
      maxDelayMs: 100,
    });

    expect(result).toBe("recovered");
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("does NOT retry 401 errors", async () => {
    const fn = vi.fn().mockRejectedValue(makePBError(401, "Unauthorized"));

    await expect(retryWithBackoff(fn, { maxRetries: 3, baseDelayMs: 10 })).rejects.toThrow();

    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("does NOT retry 422 errors", async () => {
    const fn = vi.fn().mockRejectedValue(makePBError(422, "Validation"));

    await expect(retryWithBackoff(fn, { maxRetries: 3, baseDelayMs: 10 })).rejects.toThrow();

    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("throws after exhausting all retries", async () => {
    const fn = vi.fn().mockRejectedValue(makePBError(500, "Server Error"));

    await expect(
      retryWithBackoff(fn, { maxRetries: 2, baseDelayMs: 10, maxDelayMs: 50 }),
    ).rejects.toThrow();

    // 1 initial + 2 retries = 3 calls
    expect(fn).toHaveBeenCalledTimes(3);
  });
});
