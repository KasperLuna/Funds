import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useKeyboardShortcuts, type KeyboardShortcut } from "./useKeyboardShortcuts";

function fireKey(key: string, options: Partial<KeyboardEventInit> = {}, target?: HTMLElement) {
  const event = new KeyboardEvent("keydown", {
    key,
    bubbles: true,
    cancelable: true,
    ...options,
  });
  (target ?? window).dispatchEvent(event);
  return event;
}

describe("useKeyboardShortcuts", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("should call handler when matching key is pressed", () => {
    const handler = vi.fn();
    const shortcuts: KeyboardShortcut[] = [{ key: "Escape", handler }];

    renderHook(() => useKeyboardShortcuts(shortcuts));

    fireKey("Escape");
    expect(handler).toHaveBeenCalledOnce();
  });

  it("should support Ctrl/Cmd+K shortcut", () => {
    const handler = vi.fn();
    const shortcuts: KeyboardShortcut[] = [{ key: "k", ctrlOrCmd: true, handler }];

    renderHook(() => useKeyboardShortcuts(shortcuts));

    // Without modifier — should not fire
    fireKey("k");
    expect(handler).not.toHaveBeenCalled();

    // With Ctrl
    fireKey("k", { ctrlKey: true });
    expect(handler).toHaveBeenCalledOnce();
  });

  it("should support Cmd (metaKey) as modifier", () => {
    const handler = vi.fn();
    const shortcuts: KeyboardShortcut[] = [{ key: "n", ctrlOrCmd: true, handler }];

    renderHook(() => useKeyboardShortcuts(shortcuts));

    fireKey("n", { metaKey: true });
    expect(handler).toHaveBeenCalledOnce();
  });

  it("should ignore non-modifier shortcuts when typing in an input", () => {
    const handler = vi.fn();
    const shortcuts: KeyboardShortcut[] = [{ key: "Escape", handler }];

    renderHook(() => useKeyboardShortcuts(shortcuts));

    const input = document.createElement("input");
    document.body.appendChild(input);

    const event = new KeyboardEvent("keydown", {
      key: "Escape",
      bubbles: true,
      cancelable: true,
    });
    Object.defineProperty(event, "target", { value: input });
    window.dispatchEvent(event);

    expect(handler).not.toHaveBeenCalled();
    document.body.removeChild(input);
  });

  it("should still fire ctrlOrCmd shortcuts when typing in an input", () => {
    const handler = vi.fn();
    const shortcuts: KeyboardShortcut[] = [{ key: "k", ctrlOrCmd: true, handler }];

    renderHook(() => useKeyboardShortcuts(shortcuts));

    const input = document.createElement("input");
    document.body.appendChild(input);

    const event = new KeyboardEvent("keydown", {
      key: "k",
      ctrlKey: true,
      bubbles: true,
      cancelable: true,
    });
    Object.defineProperty(event, "target", { value: input });
    window.dispatchEvent(event);

    expect(handler).toHaveBeenCalledOnce();
    document.body.removeChild(input);
  });

  it("should not call handler when shortcut is disabled", () => {
    const handler = vi.fn();
    const shortcuts: KeyboardShortcut[] = [{ key: "Escape", handler, enabled: false }];

    renderHook(() => useKeyboardShortcuts(shortcuts));

    fireKey("Escape");
    expect(handler).not.toHaveBeenCalled();
  });

  it("should clean up event listener on unmount", () => {
    const handler = vi.fn();
    const shortcuts: KeyboardShortcut[] = [{ key: "Escape", handler }];

    const { unmount } = renderHook(() => useKeyboardShortcuts(shortcuts));
    unmount();

    fireKey("Escape");
    expect(handler).not.toHaveBeenCalled();
  });

  it("should handle multiple shortcuts", () => {
    const searchHandler = vi.fn();
    const newHandler = vi.fn();
    const escapeHandler = vi.fn();

    const shortcuts: KeyboardShortcut[] = [
      { key: "k", ctrlOrCmd: true, handler: searchHandler },
      { key: "n", ctrlOrCmd: true, handler: newHandler },
      { key: "Escape", handler: escapeHandler },
    ];

    renderHook(() => useKeyboardShortcuts(shortcuts));

    fireKey("k", { ctrlKey: true });
    expect(searchHandler).toHaveBeenCalledOnce();
    expect(newHandler).not.toHaveBeenCalled();

    fireKey("n", { metaKey: true });
    expect(newHandler).toHaveBeenCalledOnce();

    fireKey("Escape");
    expect(escapeHandler).toHaveBeenCalledOnce();
  });

  it("should be case-insensitive for key matching", () => {
    const handler = vi.fn();
    const shortcuts: KeyboardShortcut[] = [{ key: "k", ctrlOrCmd: true, handler }];

    renderHook(() => useKeyboardShortcuts(shortcuts));

    fireKey("K", { ctrlKey: true });
    expect(handler).toHaveBeenCalledOnce();
  });
});
