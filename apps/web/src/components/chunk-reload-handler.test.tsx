// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, act } from "@testing-library/react";
import { ChunkReloadHandler, isChunkLoadError } from "./chunk-reload-handler";

describe("isChunkLoadError", () => {
  it("matches webpack chunk failures", () => {
    expect(isChunkLoadError("Uncaught ChunkLoadError: Loading chunk 11 failed.")).toBe(true);
  });

  it("rejects unrelated errors", () => {
    expect(isChunkLoadError("TypeError: Cannot read properties of undefined")).toBe(false);
  });
});

describe("ChunkReloadHandler", () => {
  const reload = vi.fn();

  beforeEach(() => {
    reload.mockClear();
    sessionStorage.clear();
    vi.spyOn(window, "location", "get").mockReturnValue({ reload } as unknown as Location);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  function reject(reason: unknown) {
    // cavetail: jsdom has no PromiseRejectionEvent constructor.
    const event = new Event("unhandledrejection", { cancelable: true }) as Event & { reason?: unknown };
    event.reason = reason;
    return event;
  }

  it("reloads once on a chunk rejection, then cools down", () => {
    render(<ChunkReloadHandler />);
    const reason = new Error("Loading chunk 11 failed.");
    reason.name = "ChunkLoadError";

    act(() => {
      window.dispatchEvent(reject(reason));
    });
    expect(reload).toHaveBeenCalledTimes(1);

    act(() => {
      window.dispatchEvent(reject(reason));
    });
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it("ignores non-chunk errors", () => {
    render(<ChunkReloadHandler />);

    act(() => {
      window.dispatchEvent(reject(new Error("boom")));
    });
    expect(reload).not.toHaveBeenCalled();
  });
});
