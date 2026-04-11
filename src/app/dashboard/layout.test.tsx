import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import DashboardLayout from "./layout";

// Must use class syntax for IntersectionObserver mock (Next.js Link requires it)
class MockIntersectionObserver {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}
global.IntersectionObserver = MockIntersectionObserver as unknown as typeof IntersectionObserver;

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    replace: vi.fn(),
    push: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => "/dashboard",
}));

vi.mock("@/lib/hooks/useAuth", () => ({
  useAuth: () => ({ isAuthenticated: true, isLoading: false }),
}));

const mockUseResponsive = vi.fn();
vi.mock("@/lib/hooks/useResponsive", () => ({
  useResponsive: () => mockUseResponsive(),
}));

const mockTogglePrivacyMode = vi.fn();
vi.mock("@/lib/stores/useUIStore", () => ({
  useUIStore: () => ({
    privacyMode: false,
    togglePrivacyMode: mockTogglePrivacyMode,
    sidebarOpen: true,
    toggleSidebar: vi.fn(),
  }),
}));

describe("DashboardLayout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Desktop layout", () => {
    beforeEach(() => {
      mockUseResponsive.mockReturnValue({
        isMobile: false,
        isTablet: false,
        isDesktop: true,
        breakpoint: "desktop",
      });
    });

    it("renders sidebar with 240px width", () => {
      render(
        <DashboardLayout>
          <div>Content</div>
        </DashboardLayout>,
      );

      const sidebar = screen.getByLabelText("Main navigation");
      expect(sidebar).toBeInTheDocument();
      expect(sidebar).toHaveClass("w-[240px]");
    });

    it("renders all nav links in sidebar", () => {
      render(
        <DashboardLayout>
          <div>Content</div>
        </DashboardLayout>,
      );

      expect(screen.getByRole("link", { name: /dashboard/i })).toBeInTheDocument();
      expect(screen.getByRole("link", { name: /banks/i })).toBeInTheDocument();
      expect(screen.getByRole("link", { name: /crypto/i })).toBeInTheDocument();
      expect(screen.getByRole("link", { name: /settings/i })).toBeInTheDocument();
    });

    it("offsets main content for sidebar", () => {
      render(
        <DashboardLayout>
          <div>Content</div>
        </DashboardLayout>,
      );

      const main = screen.getByRole("main");
      expect(main).toHaveClass("ml-[240px]");
    });

    it("does not render mobile header or bottom nav", () => {
      render(
        <DashboardLayout>
          <div>Content</div>
        </DashboardLayout>,
      );

      expect(screen.queryByRole("banner")).not.toBeInTheDocument();
      expect(screen.queryByLabelText("Bottom navigation")).not.toBeInTheDocument();
    });
  });

  describe("Tablet layout", () => {
    beforeEach(() => {
      mockUseResponsive.mockReturnValue({
        isMobile: false,
        isTablet: true,
        isDesktop: false,
        breakpoint: "tablet",
      });
    });

    it("renders sidebar collapsed to 176px", () => {
      render(
        <DashboardLayout>
          <div>Content</div>
        </DashboardLayout>,
      );

      const sidebar = screen.getByLabelText("Main navigation");
      expect(sidebar).toHaveClass("w-[176px]");
    });

    it("offsets main content for collapsed sidebar", () => {
      render(
        <DashboardLayout>
          <div>Content</div>
        </DashboardLayout>,
      );

      const main = screen.getByRole("main");
      expect(main).toHaveClass("ml-[176px]");
    });
  });

  describe("Mobile layout", () => {
    beforeEach(() => {
      mockUseResponsive.mockReturnValue({
        isMobile: true,
        isTablet: false,
        isDesktop: false,
        breakpoint: "mobile",
      });
    });

    it("renders mobile header with logo", () => {
      render(
        <DashboardLayout>
          <div>Content</div>
        </DashboardLayout>,
      );

      const header = screen.getByRole("banner");
      expect(header).toBeInTheDocument();
      expect(header).toHaveClass("h-[60px]");
    });

    it("renders bottom nav with 4 tabs", () => {
      render(
        <DashboardLayout>
          <div>Content</div>
        </DashboardLayout>,
      );

      const bottomNav = screen.getByLabelText("Bottom navigation");
      expect(bottomNav).toBeInTheDocument();
      expect(bottomNav).toHaveClass("h-[60px]");

      const links = bottomNav.querySelectorAll("a");
      expect(links).toHaveLength(4);
    });

    it("renders privacy toggle in header", async () => {
      const user = userEvent.setup();
      render(
        <DashboardLayout>
          <div>Content</div>
        </DashboardLayout>,
      );

      const privacyBtn = screen.getByLabelText("Hide amounts");
      expect(privacyBtn).toBeInTheDocument();

      await user.click(privacyBtn);
      expect(mockTogglePrivacyMode).toHaveBeenCalledOnce();
    });

    it("toggles mobile menu on menu button click", async () => {
      const user = userEvent.setup();
      render(
        <DashboardLayout>
          <div>Content</div>
        </DashboardLayout>,
      );

      expect(screen.queryByLabelText("Mobile menu")).not.toBeInTheDocument();

      await user.click(screen.getByLabelText("Open menu"));
      expect(screen.getByLabelText("Mobile menu")).toBeInTheDocument();

      await user.click(screen.getByLabelText("Close menu"));
      expect(screen.queryByLabelText("Mobile menu")).not.toBeInTheDocument();
    });

    it("offsets main content for header and bottom nav", () => {
      render(
        <DashboardLayout>
          <div>Content</div>
        </DashboardLayout>,
      );

      const main = screen.getByRole("main");
      expect(main).toHaveClass("pt-[60px]");
      expect(main).toHaveClass("pb-[60px]");
    });

    it("does not render desktop sidebar", () => {
      render(
        <DashboardLayout>
          <div>Content</div>
        </DashboardLayout>,
      );

      expect(screen.queryByLabelText("Main navigation")).not.toBeInTheDocument();
    });

    it("ensures touch targets are at least 44px", () => {
      render(
        <DashboardLayout>
          <div>Content</div>
        </DashboardLayout>,
      );

      const bottomNav = screen.getByLabelText("Bottom navigation");
      const links = bottomNav.querySelectorAll("a");
      links.forEach((link) => {
        expect(link).toHaveClass("min-h-[44px]");
        expect(link).toHaveClass("min-w-[44px]");
      });
    });
  });

  it("wraps children with ProtectedRoute", () => {
    mockUseResponsive.mockReturnValue({
      isMobile: false,
      isTablet: false,
      isDesktop: true,
      breakpoint: "desktop",
    });

    render(
      <DashboardLayout>
        <div>Protected content</div>
      </DashboardLayout>,
    );
    expect(screen.getByText("Protected content")).toBeInTheDocument();
  });
});
