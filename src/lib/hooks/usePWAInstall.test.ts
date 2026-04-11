import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { usePWAInstall } from "./usePWAInstall";

describe("usePWAInstall", () => {
  let listeners: Record<string, EventListener>;

  beforeEach(() => {
    listeners = {};
    vi.spyOn(window, "addEventListener").mockImplementation((event, handler) => {
      listeners[event] = handler as EventListener;
    });
    vi.spyOn(window, "removeEventListener").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should initialize with canInstall false and isInstalled false", () => {
    const { result } = renderHook(() => usePWAInstall());

    expect(result.current.canInstall).toBe(false);
    expect(result.current.isInstalled).toBe(false);
    expect(typeof result.current.install).toBe("function");
  });

  it("should listen for beforeinstallprompt and appinstalled events", () => {
    renderHook(() => usePWAInstall());

    expect(window.addEventListener).toHaveBeenCalledWith(
      "beforeinstallprompt",
      expect.any(Function),
    );
    expect(window.addEventListener).toHaveBeenCalledWith("appinstalled", expect.any(Function));
  });

  it("should remove event listeners on unmount", () => {
    const { unmount } = renderHook(() => usePWAInstall());
    unmount();

    expect(window.removeEventListener).toHaveBeenCalledWith(
      "beforeinstallprompt",
      expect.any(Function),
    );
    expect(window.removeEventListener).toHaveBeenCalledWith("appinstalled", expect.any(Function));
  });

  it("should set canInstall to true when beforeinstallprompt fires", () => {
    const { result } = renderHook(() => usePWAInstall());

    const mockEvent = new Event("beforeinstallprompt");
    Object.assign(mockEvent, {
      prompt: vi.fn(),
      userChoice: Promise.resolve({ outcome: "accepted" }),
    });
    const preventDefaultSpy = vi.spyOn(mockEvent, "preventDefault");

    act(() => {
      listeners["beforeinstallprompt"](mockEvent);
    });

    expect(preventDefaultSpy).toHaveBeenCalled();
    expect(result.current.canInstall).toBe(true);
  });

  it("should set isInstalled to true when appinstalled fires", () => {
    const { result } = renderHook(() => usePWAInstall());

    act(() => {
      listeners["appinstalled"](new Event("appinstalled"));
    });

    expect(result.current.isInstalled).toBe(true);
    expect(result.current.canInstall).toBe(false);
  });

  it("should trigger the deferred prompt on install() and mark installed on accept", async () => {
    const { result } = renderHook(() => usePWAInstall());

    const mockPrompt = vi.fn().mockResolvedValue(undefined);
    const mockEvent = new Event("beforeinstallprompt");
    Object.assign(mockEvent, {
      prompt: mockPrompt,
      userChoice: Promise.resolve({ outcome: "accepted" as const }),
    });

    act(() => {
      listeners["beforeinstallprompt"](mockEvent);
    });

    expect(result.current.canInstall).toBe(true);

    await act(async () => {
      await result.current.install();
    });

    expect(mockPrompt).toHaveBeenCalled();
    expect(result.current.isInstalled).toBe(true);
    expect(result.current.canInstall).toBe(false);
  });

  it("should not mark installed when user dismisses the prompt", async () => {
    const { result } = renderHook(() => usePWAInstall());

    const mockPrompt = vi.fn().mockResolvedValue(undefined);
    const mockEvent = new Event("beforeinstallprompt");
    Object.assign(mockEvent, {
      prompt: mockPrompt,
      userChoice: Promise.resolve({ outcome: "dismissed" as const }),
    });

    act(() => {
      listeners["beforeinstallprompt"](mockEvent);
    });

    await act(async () => {
      await result.current.install();
    });

    expect(mockPrompt).toHaveBeenCalled();
    expect(result.current.isInstalled).toBe(false);
    expect(result.current.canInstall).toBe(false);
  });

  it("should do nothing when install() is called without a deferred prompt", async () => {
    const { result } = renderHook(() => usePWAInstall());

    await act(async () => {
      await result.current.install();
    });

    expect(result.current.canInstall).toBe(false);
    expect(result.current.isInstalled).toBe(false);
  });

  it("should detect standalone display mode as already installed", () => {
    // Override matchMedia to return matches: true for standalone
    vi.spyOn(window, "matchMedia").mockImplementation((query: string) => ({
      matches: query === "(display-mode: standalone)",
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    const { result } = renderHook(() => usePWAInstall());

    expect(result.current.isInstalled).toBe(true);
  });
});
