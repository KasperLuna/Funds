import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useSessionTimeout } from "./useSessionTimeout";

describe("useSessionTimeout", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("should call onTimeout after the specified inactivity period", () => {
    const onTimeout = vi.fn();
    renderHook(() => useSessionTimeout(onTimeout, 5000));

    expect(onTimeout).not.toHaveBeenCalled();

    vi.advanceTimersByTime(5000);

    expect(onTimeout).toHaveBeenCalledTimes(1);
  });

  it("should reset the timer on user activity events", () => {
    const onTimeout = vi.fn();
    renderHook(() => useSessionTimeout(onTimeout, 5000));

    // Advance 3 seconds, then simulate activity
    vi.advanceTimersByTime(3000);
    window.dispatchEvent(new Event("mousedown"));

    // Advance another 3 seconds — should NOT have timed out yet
    vi.advanceTimersByTime(3000);
    expect(onTimeout).not.toHaveBeenCalled();

    // Advance remaining 2 seconds to complete the new 5s window
    vi.advanceTimersByTime(2000);
    expect(onTimeout).toHaveBeenCalledTimes(1);
  });

  it("should reset the timer on keydown events", () => {
    const onTimeout = vi.fn();
    renderHook(() => useSessionTimeout(onTimeout, 5000));

    vi.advanceTimersByTime(4000);
    window.dispatchEvent(new Event("keydown"));

    vi.advanceTimersByTime(4000);
    expect(onTimeout).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1000);
    expect(onTimeout).toHaveBeenCalledTimes(1);
  });

  it("should reset the timer on touchstart events", () => {
    const onTimeout = vi.fn();
    renderHook(() => useSessionTimeout(onTimeout, 5000));

    vi.advanceTimersByTime(4000);
    window.dispatchEvent(new Event("touchstart"));

    vi.advanceTimersByTime(4000);
    expect(onTimeout).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1000);
    expect(onTimeout).toHaveBeenCalledTimes(1);
  });

  it("should reset the timer on scroll events", () => {
    const onTimeout = vi.fn();
    renderHook(() => useSessionTimeout(onTimeout, 5000));

    vi.advanceTimersByTime(4000);
    window.dispatchEvent(new Event("scroll"));

    vi.advanceTimersByTime(4000);
    expect(onTimeout).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1000);
    expect(onTimeout).toHaveBeenCalledTimes(1);
  });

  it("should default to 30 minutes timeout", () => {
    const onTimeout = vi.fn();
    renderHook(() => useSessionTimeout(onTimeout));

    const thirtyMinutes = 30 * 60 * 1000;

    vi.advanceTimersByTime(thirtyMinutes - 1);
    expect(onTimeout).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(onTimeout).toHaveBeenCalledTimes(1);
  });

  it("should clean up event listeners and timer on unmount", () => {
    const onTimeout = vi.fn();
    const { unmount } = renderHook(() => useSessionTimeout(onTimeout, 5000));

    unmount();

    // Timer should be cleared — callback should never fire
    vi.advanceTimersByTime(10000);
    expect(onTimeout).not.toHaveBeenCalled();
  });
});
