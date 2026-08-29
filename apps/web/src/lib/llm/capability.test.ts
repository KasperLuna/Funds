import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import { detectSupport, isIosStorageStale } from "./capability";

type NavStub = {
  gpu?: { requestAdapter?: () => Promise<unknown> };
  storage?: {
    estimate?: () => Promise<{ quota: number; usage: number }>;
    getDirectory?: () => unknown;
    persist?: () => Promise<boolean>;
  };
};

function stubNav(overrides: NavStub) {
  Object.defineProperty(globalThis, "navigator", {
    value: { ...(navigator as object), ...overrides },
    configurable: true,
    writable: true,
  });
}

describe("detectSupport", () => {
  const originalNavigator = (globalThis as { navigator?: unknown }).navigator;
  const originalCOI = (globalThis as { crossOriginIsolated?: boolean }).crossOriginIsolated;

  beforeEach(() => {
    (globalThis as { crossOriginIsolated?: boolean }).crossOriginIsolated = true;
  });

  afterEach(() => {
    Object.defineProperty(globalThis, "navigator", { value: originalNavigator, configurable: true });
    if (originalCOI !== undefined) {
      (globalThis as { crossOriginIsolated?: boolean }).crossOriginIsolated = originalCOI;
    }
    vi.restoreAllMocks();
  });

  it("returns no-cross-origin-isolation when not isolated", async () => {
    (globalThis as { crossOriginIsolated?: boolean }).crossOriginIsolated = false;
    stubNav({});
    const out = await detectSupport();
    expect(out.ok).toBe(false);
    if (!out.ok) expect(out.reason).toBe("no-cross-origin-isolation");
  });

  it("returns no-opfs when getDirectory is missing", async () => {
    stubNav({});
    const out = await detectSupport();
    expect(out.ok).toBe(false);
    if (!out.ok) expect(out.reason).toBe("no-opfs");
  });

  it("returns no-storage when estimate is missing or below threshold", async () => {
    stubNav({ storage: { getDirectory: () => ({}) } });
    const out = await detectSupport();
    expect(out.ok).toBe(false);
    if (!out.ok) expect(out.reason).toBe("no-storage");
  });

  it("returns webgpu support when adapter is granted", async () => {
    stubNav({
      gpu: { requestAdapter: () => Promise.resolve({}) },
      storage: {
        getDirectory: () => ({}),
        estimate: () => Promise.resolve({ quota: 4 * 1024 ** 3, usage: 0 }),
      },
    });
    const out = await detectSupport();
    expect(out.ok).toBe(true);
    if (out.ok && out.engine === "webgpu") {
      expect(out.recommendedModel).toBe("Llama-3.2-1B-Instruct-q4f16_1-MLC");
    }
  });

  it("falls back to llama-3.2-1b when storage is in the 1-1.5 GB range", async () => {
    stubNav({
      gpu: { requestAdapter: () => Promise.resolve({}) },
      storage: {
        getDirectory: () => ({}),
        estimate: () => Promise.resolve({ quota: 1.3 * 1024 ** 3, usage: 0 }),
      },
    });
    const out = await detectSupport();
    expect(out.ok).toBe(true);
    if (out.ok) expect(out.recommendedModel).toBe("Llama-3.2-1B-Instruct-q4f32_1-MLC");
  });

  it("returns no-storage when below the 1 GB floor", async () => {
    stubNav({
      gpu: { requestAdapter: () => Promise.resolve({}) },
      storage: {
        getDirectory: () => ({}),
        estimate: () => Promise.resolve({ quota: 0.8 * 1024 ** 3, usage: 0 }),
      },
    });
    const out = await detectSupport();
    expect(out.ok).toBe(false);
    if (!out.ok) expect(out.reason).toBe("no-storage");
  });

  it("returns wasm support when WebGPU is absent", async () => {
    stubNav({
      storage: {
        getDirectory: () => ({}),
        estimate: () => Promise.resolve({ quota: 4 * 1024 ** 3, usage: 0 }),
      },
    });
    const out = await detectSupport();
    expect(out.ok).toBe(true);
    if (out.ok && out.engine === "wasm") {
      expect(out.warn).toBe("slower-inference");
    }
  });
});

describe("isIosStorageStale", () => {
  it("is false when no load recorded", () => {
    expect(isIosStorageStale(null)).toBe(false);
  });
  it("is false when load is recent", () => {
    expect(isIosStorageStale(Date.now() - 1000)).toBe(false);
  });
  it("is true when load is older than 5 days", () => {
    const SIX_DAYS = 6 * 24 * 60 * 60 * 1000;
    expect(isIosStorageStale(Date.now() - SIX_DAYS)).toBe(true);
  });
});
