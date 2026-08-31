// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, act } from "@testing-library/react";
import type { ReactNode } from "react";

const pushMock = vi.fn();
const replaceMock = vi.fn();
const refreshMock = vi.fn();

vi.mock("next/navigation", () => ({
  usePathname: vi.fn(() => "/dashboard"),
  useRouter: vi.fn(() => ({ push: pushMock, replace: replaceMock, refresh: refreshMock })),
}));

vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: { children: ReactNode; href: string; [key: string]: unknown }) => (
    <a href={href} {...props}>{children}</a>
  ),
  useLinkStatus: vi.fn(() => ({ pending: false })),
}));

import { NavProvider, useLinkActive, useOptimisticNavigate } from "./optimistic-nav";
import { usePathname } from "next/navigation";
import { useLinkStatus } from "next/link";

function Wrapper({ children }: { children: ReactNode }) {
  return <NavProvider>{children}</NavProvider>;
}

describe("optimistic-nav", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(usePathname).mockReturnValue("/dashboard");
    vi.mocked(useLinkStatus).mockReturnValue({ pending: false });
  });

  describe("useLinkActive", () => {
    it("returns true when pathname matches exactly", () => {
      let active = false;
      function Test() {
        active = useLinkActive("/dashboard/assets");
        return null;
      }
      vi.mocked(usePathname).mockReturnValue("/dashboard/assets");
      render(<Test />, { wrapper: Wrapper });
      expect(active).toBe(true);
    });

    it("returns false when pathname does not match", () => {
      let active = true;
      function Test() {
        active = useLinkActive("/dashboard/assets");
        return null;
      }
      vi.mocked(usePathname).mockReturnValue("/dashboard/categories");
      render(<Test />, { wrapper: Wrapper });
      expect(active).toBe(false);
    });

    it("returns true for /dashboard only on exact match", () => {
      let active = false;
      function Test() {
        active = useLinkActive("/dashboard");
        return null;
      }
      vi.mocked(usePathname).mockReturnValue("/dashboard/assets");
      render(<Test />, { wrapper: Wrapper });
      expect(active).toBe(false);
    });

    it("returns true for /dashboard when pathname is /dashboard", () => {
      let active = false;
      function Test() {
        active = useLinkActive("/dashboard");
        return null;
      }
      vi.mocked(usePathname).mockReturnValue("/dashboard");
      render(<Test />, { wrapper: Wrapper });
      expect(active).toBe(true);
    });
  });

  describe("useOptimisticNavigate", () => {
    it("calls router.push with the target href", () => {
      let navigateFn: ReturnType<typeof useOptimisticNavigate> | null = null;
      function Test() {
        navigateFn = useOptimisticNavigate();
        return null;
      }
      render(<Test />, { wrapper: Wrapper });
      act(() => navigateFn!("/dashboard/assets"));
      expect(pushMock).toHaveBeenCalledWith("/dashboard/assets", { scroll: false });
    });

    it("calls router.replace when replace option is set", () => {
      let navigateFn: ReturnType<typeof useOptimisticNavigate> | null = null;
      function Test() {
        navigateFn = useOptimisticNavigate();
        return null;
      }
      render(<Test />, { wrapper: Wrapper });
      act(() => navigateFn!("/dashboard/assets?tab=crypto", { replace: true }));
      expect(replaceMock).toHaveBeenCalledWith("/dashboard/assets?tab=crypto", { scroll: false });
    });
  });
});
