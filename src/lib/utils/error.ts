import { ClientResponseError } from "pocketbase";
import pb from "@/lib/pocketbase/pocketbase";
import { useAuthStore } from "@/lib/stores/useAuthStore";

// --- Types ---

export interface ValidationErrors {
  [field: string]: { code: string; message: string };
}

export interface ApiErrorResult {
  message: string;
  validationErrors?: ValidationErrors;
  isAuthError: boolean;
  isValidationError: boolean;
  isNetworkError: boolean;
}

// --- Retry with exponential backoff ---

export interface RetryOptions {
  maxRetries?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
}

const DEFAULT_RETRY_OPTIONS: Required<RetryOptions> = {
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 30000,
};

/**
 * Calculate delay for a given attempt using exponential backoff with jitter.
 */
export function calculateBackoffDelay(
  attempt: number,
  baseDelayMs: number,
  maxDelayMs: number,
): number {
  const exponentialDelay = baseDelayMs * Math.pow(2, attempt);
  const jitter = Math.random() * baseDelayMs;
  return Math.min(exponentialDelay + jitter, maxDelayMs);
}

/**
 * Retry an async operation with exponential backoff.
 * Does NOT retry 401 or 422 errors (auth/validation are not transient).
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options?: RetryOptions,
): Promise<T> {
  const { maxRetries, baseDelayMs, maxDelayMs } = {
    ...DEFAULT_RETRY_OPTIONS,
    ...options,
  };

  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // Don't retry auth or validation errors — they won't resolve on retry
      if (error instanceof ClientResponseError) {
        if (error.status === 401 || error.status === 422) {
          throw error;
        }
      }

      if (attempt < maxRetries) {
        const delay = calculateBackoffDelay(attempt, baseDelayMs, maxDelayMs);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
}

// --- Main error handler ---

/**
 * Handle API errors from PocketBase or network failures.
 *
 * - 401: clears auth state and redirects to login
 * - 422: extracts field-level validation errors
 * - Network errors: returns a user-friendly network message
 * - Other errors: returns a generic error message
 */
export function handleApiError(error: unknown): ApiErrorResult {
  // PocketBase ClientResponseError
  if (error instanceof ClientResponseError) {
    // 401 Unauthorized — clear auth and redirect
    if (error.status === 401) {
      useAuthStore.getState().clearAuth();
      pb.authStore.clear();

      if (typeof window !== "undefined") {
        window.location.href = "/";
      }

      console.error("Authentication error: session expired or invalid.");
      return {
        message: "Session expired. Redirecting to login…",
        isAuthError: true,
        isValidationError: false,
        isNetworkError: false,
      };
    }

    // 422 Validation — extract field errors
    if (error.status === 422) {
      const validationErrors: ValidationErrors = (error.response?.data as ValidationErrors) ?? {};

      console.error("Validation error:", validationErrors);
      return {
        message: "Please fix the highlighted errors and try again.",
        validationErrors,
        isAuthError: false,
        isValidationError: true,
        isNetworkError: false,
      };
    }

    // Network / connection error (status 0 in PocketBase)
    if (error.status === 0) {
      console.error("Network error:", error.message);
      return {
        message: "Network error. Please check your connection and try again.",
        isAuthError: false,
        isValidationError: false,
        isNetworkError: true,
      };
    }

    // Other PocketBase errors
    console.error(`API error (${error.status}):`, error.message);
    return {
      message: error.message || "An unexpected error occurred. Please try again.",
      isAuthError: false,
      isValidationError: false,
      isNetworkError: false,
    };
  }

  // Standard JS Error (e.g. TypeError: Failed to fetch)
  if (error instanceof Error) {
    const isNetwork =
      error.message.toLowerCase().includes("failed to fetch") ||
      error.message.toLowerCase().includes("network") ||
      error.name === "TypeError";

    if (isNetwork) {
      console.error("Network error:", error.message);
      return {
        message: "Network error. Please check your connection and try again.",
        isAuthError: false,
        isValidationError: false,
        isNetworkError: true,
      };
    }

    console.error("Unexpected error:", error.message);
    return {
      message: error.message || "An unexpected error occurred. Please try again.",
      isAuthError: false,
      isValidationError: false,
      isNetworkError: false,
    };
  }

  // Completely unknown error shape
  console.error("Unknown error:", error);
  return {
    message: "An unexpected error occurred. Please try again.",
    isAuthError: false,
    isValidationError: false,
    isNetworkError: false,
  };
}
