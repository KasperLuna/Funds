import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useResponsive } from "./useResponsive";

type ChangeHandler = (e: { matches: boolean }) => void;

function createMockMediaQueryList(matches: boolean) {
  const listeners: ChangeHandler[] = [];
  return {
    matches,
    media: "",
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn((_event: string, handler: ChangeHandler) => {
      listeners.push(handler);
    }),
    removeEventListener: vi.fn((_event: string, handler: ChangeHandler) => {
      const idx = listeners.indexOf(handler);
      if (idx >= 0) listeners.splice(idx, 1);
    }),
    dispatchEvent: vi.fn(),
    _listeners: listeners,
    _setMatches(val: boolean) {
      this.matches = val;
    },
  };
}

describe("useResponsive", () => {
  let mobileMql: ReturnType<typeof createMockMediaQueryList>;
  let tabletMql: ReturnType<typeof createMockMediaQueryList>;
  let desktopMql: ReturnType<typeof createMockMediaQueryList>;

  function setupMatchMedia(breakpoint: "mobile" | "tablet" | "desktop") {
    mobileMql = createMockMediaQueryList(breakpoint === "mobile");
    tabletMql = createMockMediaQueryList(breakpoint === "tablet");
    desktopMql = createMockMediaQueryList(breakpoint === "desktop");

    vi.spyOn(window, "matchMedia").mockImplementation((query: string) => {
      if (query === "(max-width: 767px)") return mobileMql as unknown as MediaQueryList;
      if (query === "(min-width: 768px) and (max-width: 1024px)")
        return tabletMql as unknown as MediaQueryList;
      if (query === "(min-width: 1025px)") return desktopMql as unknown as MediaQueryList;
      return createMockMediaQueryList(false) as unknown as MediaQueryList;
    });
  }

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("should detect mobile breakpoint", () => {
    setupMatchMedia("mobile");
    const { result } = renderHook(() => useResponsive());

    expect(result.current.isMobile).toBe(true);
    expect(result.current.isTablet).toBe(false);
    expect(result.current.isDesktop).toBe(false);
    expect(result.current.breakpoint).toBe("mobile");
  });

  it("should detect tablet breakpoint", () => {
    setupMatchMedia("tablet");
    const { result } = renderHook(() => useResponsive());

    expect(result.current.isMobile).toBe(false);
    expect(result.current.isTablet).toBe(true);
    expect(result.current.isDesktop).toBe(false);
    expect(result.current.breakpoint).toBe("tablet");
  });

  it("should detect desktop breakpoint", () => {
    setupMatchMedia("desktop");
    const { result } = renderHook(() => useResponsive());

    expect(result.current.isMobile).toBe(false);
    expect(result.current.isTablet).toBe(false);
    expect(result.current.isDesktop).toBe(true);
    expect(result.current.breakpoint).toBe("desktop");
  });

  it("should update when breakpoint changes from desktop to mobile", () => {
    setupMatchMedia("desktop");
    const { result } = renderHook(() => useResponsive());

    expect(result.current.breakpoint).toBe("desktop");

    // Simulate resize to mobile
    mobileMql._setMatches(true);
    tabletMql._setMatches(false);
    desktopMql._setMatches(false);

    act(() => {
      mobileMql._listeners.forEach((fn) => fn({ matches: true }));
    });

    expect(result.current.isMobile).toBe(true);
    expect(result.current.isDesktop).toBe(false);
    expect(result.current.breakpoint).toBe("mobile");
  });

  it("should clean up event listeners on unmount", () => {
    setupMatchMedia("desktop");
    const { unmount } = renderHook(() => useResponsive());

    unmount();

    expect(mobileMql.removeEventListener).toHaveBeenCalledWith("change", expect.any(Function));
    expect(tabletMql.removeEventListener).toHaveBeenCalledWith("change", expect.any(Function));
    expect(desktopMql.removeEventListener).toHaveBeenCalledWith("change", expect.any(Function));
  });
});
