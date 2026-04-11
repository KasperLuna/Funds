/**
 * Integration tests for Responsive design (layout adaptation across breakpoints)
 * Validates: Requirement 28.8
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useResponsive } from "@/lib/hooks/useResponsive";

// ── Helpers ──────────────────────────────────────────────────────────────────

type MatchMediaListener = (event: { matches: boolean }) => void;

function mockMatchMedia(config: { mobile: boolean; tablet: boolean; desktop: boolean }) {
  const listeners: Record<string, MatchMediaListener[]> = {};

  const impl = (query: string) => {
    let matches = false;
    if (query.includes("max-width: 767px")) matches = config.mobile;
    else if (query.includes("min-width: 768px") && query.includes("max-width: 1024px"))
      matches = config.tablet;
    else if (query.includes("min-width: 1025px")) matches = config.desktop;

    if (!listeners[query]) listeners[query] = [];

    return {
      matches,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn((_event: string, handler: MatchMediaListener) => {
        listeners[query].push(handler);
      }),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    };
  };

  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockImplementation(impl),
  });

  return listeners;
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe("Responsive design integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Mobile breakpoint (< 768px)", () => {
    it("detects mobile viewport", () => {
      mockMatchMedia({ mobile: true, tablet: false, desktop: false });

      const { result } = renderHook(() => useResponsive());

      expect(result.current.isMobile).toBe(true);
      expect(result.current.isTablet).toBe(false);
      expect(result.current.isDesktop).toBe(false);
      expect(result.current.breakpoint).toBe("mobile");
    });
  });

  describe("Tablet breakpoint (768px - 1024px)", () => {
    it("detects tablet viewport", () => {
      mockMatchMedia({ mobile: false, tablet: true, desktop: false });

      const { result } = renderHook(() => useResponsive());

      expect(result.current.isMobile).toBe(false);
      expect(result.current.isTablet).toBe(true);
      expect(result.current.isDesktop).toBe(false);
      expect(result.current.breakpoint).toBe("tablet");
    });
  });

  describe("Desktop breakpoint (> 1024px)", () => {
    it("detects desktop viewport", () => {
      mockMatchMedia({ mobile: false, tablet: false, desktop: true });

      const { result } = renderHook(() => useResponsive());

      expect(result.current.isMobile).toBe(false);
      expect(result.current.isTablet).toBe(false);
      expect(result.current.isDesktop).toBe(true);
      expect(result.current.breakpoint).toBe("desktop");
    });
  });

  describe("Breakpoint transitions", () => {
    it("defaults to desktop when no media queries match", () => {
      mockMatchMedia({ mobile: false, tablet: false, desktop: false });

      const { result } = renderHook(() => useResponsive());

      expect(result.current.isDesktop).toBe(true);
      expect(result.current.breakpoint).toBe("desktop");
    });
  });

  describe("Breakpoint values", () => {
    it("mobile breakpoint is below 768px", () => {
      // The hook uses max-width: 767px for mobile
      mockMatchMedia({ mobile: true, tablet: false, desktop: false });

      const { result } = renderHook(() => useResponsive());
      expect(result.current.breakpoint).toBe("mobile");
    });

    it("tablet breakpoint is 768px to 1024px", () => {
      mockMatchMedia({ mobile: false, tablet: true, desktop: false });

      const { result } = renderHook(() => useResponsive());
      expect(result.current.breakpoint).toBe("tablet");
    });

    it("desktop breakpoint is above 1024px", () => {
      mockMatchMedia({ mobile: false, tablet: false, desktop: true });

      const { result } = renderHook(() => useResponsive());
      expect(result.current.breakpoint).toBe("desktop");
    });
  });

  describe("Mutual exclusivity", () => {
    it("only one breakpoint is active at a time (mobile)", () => {
      mockMatchMedia({ mobile: true, tablet: false, desktop: false });

      const { result } = renderHook(() => useResponsive());

      const activeCount = [
        result.current.isMobile,
        result.current.isTablet,
        result.current.isDesktop,
      ].filter(Boolean).length;

      expect(activeCount).toBe(1);
    });

    it("only one breakpoint is active at a time (tablet)", () => {
      mockMatchMedia({ mobile: false, tablet: true, desktop: false });

      const { result } = renderHook(() => useResponsive());

      const activeCount = [
        result.current.isMobile,
        result.current.isTablet,
        result.current.isDesktop,
      ].filter(Boolean).length;

      expect(activeCount).toBe(1);
    });

    it("only one breakpoint is active at a time (desktop)", () => {
      mockMatchMedia({ mobile: false, tablet: false, desktop: true });

      const { result } = renderHook(() => useResponsive());

      const activeCount = [
        result.current.isMobile,
        result.current.isTablet,
        result.current.isDesktop,
      ].filter(Boolean).length;

      expect(activeCount).toBe(1);
    });
  });
});
