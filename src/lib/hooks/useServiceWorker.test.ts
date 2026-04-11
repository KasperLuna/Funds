import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useServiceWorker } from "./useServiceWorker";

describe("useServiceWorker", () => {
  const mockRegister = vi.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    Object.defineProperty(navigator, "serviceWorker", {
      value: { register: mockRegister },
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should register the service worker on mount", () => {
    renderHook(() => useServiceWorker());
    expect(mockRegister).toHaveBeenCalledWith("/sw.js");
  });

  it("should not register when serviceWorker is not supported", () => {
    // Remove the serviceWorker property entirely
    const descriptor = Object.getOwnPropertyDescriptor(navigator, "serviceWorker");
    // @ts-expect-error - deleting for test purposes
    delete navigator.serviceWorker;

    renderHook(() => useServiceWorker());
    expect(mockRegister).not.toHaveBeenCalled();

    // Restore
    if (descriptor) {
      Object.defineProperty(navigator, "serviceWorker", descriptor);
    }
  });

  it("should log error when registration fails", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const error = new Error("Registration failed");
    mockRegister.mockRejectedValueOnce(error);

    renderHook(() => useServiceWorker());

    // Wait for the promise rejection to be handled
    await vi.waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith("Service worker registration failed:", error);
    });

    consoleSpy.mockRestore();
  });
});
