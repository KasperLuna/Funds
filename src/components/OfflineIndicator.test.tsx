import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { OfflineIndicator } from "./OfflineIndicator";

let mockQueueLength = 0;

vi.mock("@/lib/utils/offlineQueue", () => ({
  getQueueLength: () => mockQueueLength,
}));

describe("OfflineIndicator", () => {
  let originalOnLine: boolean;

  beforeEach(() => {
    vi.useFakeTimers();
    originalOnLine = navigator.onLine;
    mockQueueLength = 0;
  });

  afterEach(() => {
    vi.useRealTimers();
    Object.defineProperty(navigator, "onLine", {
      value: originalOnLine,
      writable: true,
      configurable: true,
    });
  });

  function setOnlineStatus(online: boolean) {
    Object.defineProperty(navigator, "onLine", {
      value: online,
      writable: true,
      configurable: true,
    });
  }

  it("renders nothing when online", () => {
    setOnlineStatus(true);
    const { container } = render(<OfflineIndicator />);
    expect(container.querySelector("[role='status']")).toBeNull();
  });

  it("shows offline banner when browser is offline", () => {
    setOnlineStatus(false);
    render(<OfflineIndicator />);
    expect(screen.getByText(/You're offline/)).toBeInTheDocument();
  });

  it("shows queued transaction count when offline with pending items", () => {
    setOnlineStatus(false);
    mockQueueLength = 3;
    render(<OfflineIndicator />);
    expect(screen.getByText(/3 transactions pending sync/)).toBeInTheDocument();
  });

  it("uses singular form for 1 queued transaction", () => {
    setOnlineStatus(false);
    mockQueueLength = 1;
    render(<OfflineIndicator />);
    expect(screen.getByText(/1 transaction pending sync/)).toBeInTheDocument();
  });

  it("shows 'Back online' when going from offline to online", () => {
    setOnlineStatus(false);
    render(<OfflineIndicator />);
    expect(screen.getByText(/You're offline/)).toBeInTheDocument();

    act(() => {
      setOnlineStatus(true);
      window.dispatchEvent(new Event("online"));
    });

    expect(screen.getByText("Back online")).toBeInTheDocument();
  });

  it("hides 'Back online' message after 3 seconds", () => {
    setOnlineStatus(false);
    const { container } = render(<OfflineIndicator />);

    act(() => {
      setOnlineStatus(true);
      window.dispatchEvent(new Event("online"));
    });

    expect(screen.getByText("Back online")).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(3000);
    });

    expect(container.querySelector("[role='status']")).toBeNull();
  });

  it("shows offline banner when online event fires as offline", () => {
    setOnlineStatus(true);
    render(<OfflineIndicator />);

    act(() => {
      setOnlineStatus(false);
      window.dispatchEvent(new Event("offline"));
    });

    expect(screen.getByText(/You're offline/)).toBeInTheDocument();
  });

  it("has role=status and aria-live=polite for accessibility", () => {
    setOnlineStatus(false);
    render(<OfflineIndicator />);
    const banner = screen.getByRole("status");
    expect(banner).toHaveAttribute("aria-live", "polite");
  });
});
