// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import {
  QUERY_MIRROR_MS,
  consumeCategoryDeepLink,
  useBanksFilters,
  useMirroredQuery,
} from "./use-banks-filters";

const { search, pathname, replace } = vi.hoisted(() => ({
  search: { current: "" } as { current: string },
  pathname: "/dashboard/assets",
  replace: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(search.current),
  usePathname: () => pathname,
  useRouter: () => ({ replace }),
}));

beforeEach(() => {
  search.current = "";
  replace.mockReset();
});

describe("useBanksFilters.setFilters", () => {
  it("writes all four keys in a single replace", () => {
    search.current = "tab=banks";
    const { result } = renderHook(() => useBanksFilters());
    act(() => {
      result.current.setFilters({
        query: "cofee",
        categoryIds: ["a", "b"],
        date: { from: 1, to: 2 },
      });
    });
    expect(replace).toHaveBeenCalledTimes(1);
    expect(replace).toHaveBeenCalledWith(
      "/dashboard/assets?tab=banks&q=cofee&cat=a%2Cb&from=1&to=2",
      { scroll: false },
    );
  });

  it("strips empty keys", () => {
    search.current = "q=x&cat=a&from=1&to=2&tab=banks";
    const { result } = renderHook(() => useBanksFilters());
    act(() => {
      result.current.setFilters({ query: "", categoryIds: [], date: null });
    });
    expect(replace).toHaveBeenCalledTimes(1);
    expect(replace).toHaveBeenCalledWith("/dashboard/assets?tab=banks", {
      scroll: false,
    });
  });

  it("keeps q across rapid writes from a stale snapshot", () => {
    search.current = "cat=a";
    const { result } = renderHook(() => useBanksFilters());
    act(() => {
      result.current.setFilters({ query: "cof", categoryIds: ["a"], date: null });
      result.current.setFilters({ query: "cofe", categoryIds: ["a"], date: null });
    });
    expect(replace).toHaveBeenCalledTimes(2);
    expect(replace.mock.calls.at(-1)?.[0]).toBe(
      "/dashboard/assets?cat=a&q=cofe",
    );
  });
});

describe("consumeCategoryDeepLink", () => {
  it("returns null without a category key", () => {
    expect(consumeCategoryDeepLink("tab=banks&q=cof")).toBeNull();
    expect(consumeCategoryDeepLink("")).toBeNull();
  });

  it("swaps category for cat and preserves everything else", () => {
    expect(
      consumeCategoryDeepLink("tab=banks&category=cat-1&q=cof&from=1&to=2"),
    ).toBe("tab=banks&q=cof&from=1&to=2&cat=cat-1");
  });
});

describe("useMirroredQuery", () => {
  it("applies instantly and mirrors once after the pause", () => {
    vi.useFakeTimers();
    try {
      const write = vi.fn();
      const { result } = renderHook(
        ({ q }: { q: string }) => useMirroredQuery(q, write),
        { initialProps: { q: "" } },
      );
      act(() => {
        result.current[1]("c");
        result.current[1]("co");
        result.current[1]("cof");
      });
      expect(result.current[0]).toBe("cof");
      expect(write).not.toHaveBeenCalled();
      act(() => {
        vi.advanceTimersByTime(QUERY_MIRROR_MS);
      });
      expect(write).toHaveBeenCalledTimes(1);
      expect(write).toHaveBeenCalledWith("cof");
    } finally {
      vi.useRealTimers();
    }
  });

  it("ignores its own URL echo", () => {
    vi.useFakeTimers();
    try {
      const write = vi.fn();
      const { result, rerender } = renderHook(
        ({ q }: { q: string }) => useMirroredQuery(q, write),
        { initialProps: { q: "" } },
      );
      act(() => result.current[1]("cof"));
      act(() => {
        vi.advanceTimersByTime(QUERY_MIRROR_MS);
      });
      expect(write).toHaveBeenCalledTimes(1);
      rerender({ q: "cof" });
      expect(result.current[0]).toBe("cof");
      act(() => {
        vi.advanceTimersByTime(QUERY_MIRROR_MS * 2);
      });
      expect(write).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it("adopts outside URL moves without writing back", () => {
    vi.useFakeTimers();
    try {
      const write = vi.fn();
      const { result, rerender } = renderHook(
        ({ q }: { q: string }) => useMirroredQuery(q, write),
        { initialProps: { q: "" } },
      );
      rerender({ q: "other" });
      expect(result.current[0]).toBe("other");
      act(() => {
        vi.advanceTimersByTime(QUERY_MIRROR_MS * 2);
      });
      expect(write).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });
});
