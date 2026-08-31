// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import {
  useUrlString,
  useUrlBool,
  useUrlSet,
  useUrlDate,
  useUrlState,
} from "./use-url-state";

const { search, pathname, replace } = vi.hoisted(() => ({
  search: { current: "" } as { current: string },
  pathname: "/dashboard/assets",
  replace: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useSearchParams: () => {
    const sp = new URLSearchParams(search.current);
    return {
      get: (k: string) => sp.get(k),
      get size() {
        return [...sp.keys()].length;
      },
      has: (k: string) => sp.has(k),
      toString: () => sp.toString(),
      [Symbol.iterator]: () => sp[Symbol.iterator](),
      entries: () => sp.entries(),
      keys: () => sp.keys(),
      values: () => sp.values(),
      forEach: (cb: (v: string, k: string) => void) => sp.forEach(cb),
    };
  },
  usePathname: () => pathname,
  useRouter: () => ({ replace }),
}));

beforeEach(() => {
  search.current = "";
  replace.mockReset();
});

afterEach(() => {
  vi.restoreAllMocks();
});

function nextUrl() {
  const last = replace.mock.calls.at(-1)?.[0] as string | undefined;
  return last ?? null;
}

describe("useUrlString", () => {
  it("reads the current value, writes via the set callback, and strips the key on null", () => {
    search.current = "q=hello&other=stay";
    const { result, rerender } = renderHook(() => useUrlString("q"));
    expect(result.current[0]).toBe("hello");

    act(() => result.current[1]("world"));
    expect(replace).toHaveBeenCalledWith(
      "/dashboard/assets?q=world&other=stay",
      { scroll: false },
    );
    search.current = nextUrl()!.split("?")[1] ?? "";
    rerender();
    expect(result.current[0]).toBe("world");

    act(() => result.current[1](null));
    search.current = nextUrl()!.split("?")[1] ?? "";
    rerender();
    expect(result.current[0]).toBeNull();
  });
});

describe("useUrlBool", () => {
  it("falls back to the default when the key is absent", () => {
    search.current = "";
    const { result } = renderHook(() => useUrlBool("archived", false));
    expect(result.current[0]).toBe(false);
  });

  it("reads ?archived=1 as true and clears the key on false", () => {
    search.current = "archived=1";
    const { result, rerender } = renderHook(() => useUrlBool("archived", false));
    expect(result.current[0]).toBe(true);

    act(() => result.current[1](false));
    expect(nextUrl()).toBe("/dashboard/assets");
    search.current = nextUrl()!.split("?")[1] ?? "";
    rerender();
    expect(result.current[0]).toBe(false);
  });
});

describe("useUrlSet", () => {
  it("returns an empty set when the key is absent", () => {
    search.current = "";
    const { result } = renderHook(() => useUrlSet("cat"));
    expect(result.current[0].size).toBe(0);
  });

  it("round-trips a comma-separated set", () => {
    search.current = "cat=a,b,c";
    const { result, rerender } = renderHook(() => useUrlSet("cat"));
    expect([...result.current[0]]).toEqual(["a", "b", "c"]);

    act(() => {
      const next = new Set(result.current[0]);
      next.delete("b");
      result.current[1](next);
    });
    expect(nextUrl()).toBe("/dashboard/assets?cat=a%2Cc");
    search.current = nextUrl()!.split("?")[1] ?? "";
    rerender();
    expect([...result.current[0]]).toEqual(["a", "c"]);
  });

  it("drops the key entirely when the set becomes empty", () => {
    search.current = "cat=a&other=stay";
    const { result } = renderHook(() => useUrlSet("cat"));
    act(() => result.current[1](new Set()));
    expect(nextUrl()).toBe("/dashboard/assets?other=stay");
  });
});

describe("useUrlDate", () => {
  it("returns null for absent or malformed values", () => {
    search.current = "";
    const { result: r1 } = renderHook(() => useUrlDate("month"));
    expect(r1.current[0]).toBeNull();

    search.current = "month=2025-13";
    const { result: r2 } = renderHook(() => useUrlDate("month"));
    expect(r2.current[0]).toBeNull();
  });

  it("parses YYYY-MM and serializes back", () => {
    search.current = "month=2025-04";
    const { result, rerender } = renderHook(() => useUrlDate("month"));
    expect(result.current[0]).toEqual({ year: 2025, month: 3 });

    act(() => result.current[1]({ year: 2026, month: 0 }));
    expect(nextUrl()).toBe("/dashboard/assets?month=2026-01");
    search.current = nextUrl()!.split("?")[1] ?? "";
    rerender();
    expect(result.current[0]).toEqual({ year: 2026, month: 0 });
  });
});

describe("useUrlState (generic primitive)", () => {
  it("supports custom parse/serialize", () => {
    search.current = "n=42";
    const { result, rerender } = renderHook(() =>
      useUrlState<number>(
        "n",
        (raw) => (raw == null ? null : Number(raw)),
        (v) => (v == null ? null : String(v)),
      ),
    );
    expect(result.current[0]).toBe(42);

    act(() => result.current[1](7));
    search.current = nextUrl()!.split("?")[1] ?? "";
    rerender();
    expect(result.current[0]).toBe(7);
  });
});
