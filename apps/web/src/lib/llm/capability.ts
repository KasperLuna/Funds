import type { ModelId } from "./types";

/**
 * Detect whether this device can run an on-device LLM at all, and which
 * engine (WebGPU / WASM) the real implementation should attempt.
 *
 * cavetail: this function MUST be safe to call on every render. It is a pure
 * capability probe with no side effects; nothing here touches OPFS, the
 * network, or long-lived workers. The probe failures are also the user-facing
 * messaging in the EmptyState component, so each branch is named for the
 * surfaced reason, not the internal error.
 */
export type LlmSupport =
  | {
      ok: true;
      engine: "webgpu";
      availableBytes: number;
      recommendedModel: ModelId;
    }
  | {
      ok: true;
      engine: "wasm";
      availableBytes: number;
      recommendedModel: ModelId;
      warn: "slower-inference" | "no-cross-origin-isolation";
    }
  | {
      ok: false;
      reason:
        | "no-webgpu"
        | "no-cross-origin-isolation"
        | "no-storage"
        | "unsupported-environment";
    };

// Below this we cannot host even the smallest model (~200 MB + headroom).
const MIN_STORAGE_BYTES = 256 * 1024 * 1024;

type NavigatorWithGpu = Navigator & {
  gpu?: { requestAdapter?: () => Promise<unknown> };
  storage?: {
    estimate?: () => Promise<{ quota: number; usage: number }>;
    getDirectory?: () => unknown;
    persist?: () => Promise<boolean>;
  };
};

function hasWebGpu(nav: NavigatorWithGpu): boolean {
  return typeof nav.gpu?.requestAdapter === "function";
}

async function hasStorage(
  nav: NavigatorWithGpu,
): Promise<{ available: number; raw: number } | null> {
  if (typeof nav.storage?.estimate !== "function") return null;
  try {
    const est = await nav.storage.estimate();
    const available = Math.max(0, (est.quota ?? 0) - (est.usage ?? 0));
    return { available, raw: available };
  } catch {
    return null;
  }
}

/**
 * iOS Safari's IndexedDB/OPFS storage is evicted after ~7 days of no user
 * engagement. The engine stamps a `lastLoadedAt` sidecar; callers check it
 * with `isIosStorageStale` to decide whether to nudge the user.
 */
export function isIosLikeDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  return /iPhone|iPad|iPod/.test(ua) || (/Mac/.test(ua) && navigator.maxTouchPoints > 1);
}

export function isIosStorageStale(lastLoadedAt: number | null, now = Date.now()): boolean {
  if (lastLoadedAt == null) return false;
  const FIVE_DAYS = 5 * 24 * 60 * 60 * 1000;
  return now - lastLoadedAt > FIVE_DAYS;
}

function pickModel(availableBytes: number): ModelId {
  // Tier by available storage — smallest models for constrained devices.
  // q4f32_1 uses less VRAM headroom; q4f16_1 has better quality.
  if (availableBytes < 500 * 1024 * 1024) return "SmolLM2-360M-Instruct-q4f16_1-MLC";
  if (availableBytes < 1024 * 1024 * 1024) return "Qwen3-0.6B-q4f16_1-MLC";
  if (availableBytes < 1536 * 1024 * 1024) return "Llama-3.2-1B-Instruct-q4f32_1-MLC";
  return "Llama-3.2-1B-Instruct-q4f16_1-MLC";
}

export async function detectSupport(): Promise<LlmSupport> {
  if (typeof navigator === "undefined") {
    return { ok: false, reason: "unsupported-environment" };
  }
  const nav = navigator as NavigatorWithGpu;

  // Probe storage first — without it nothing works.
  const storage = await hasStorage(nav);
  if (!storage) {
    return { ok: false, reason: "no-storage" };
  }
  if (storage.available < MIN_STORAGE_BYTES) {
    return { ok: false, reason: "no-storage" };
  }

  const hasCoi = typeof crossOriginIsolated !== "undefined" && crossOriginIsolated;

  // Try WebGPU first — the fast path. If it works, we don't need COI or OPFS.
  if (hasWebGpu(nav)) {
    let adapter: unknown = null;
    try {
      adapter = await nav.gpu!.requestAdapter!();
    } catch {
      adapter = null;
    }
    if (adapter) {
      return {
        ok: true,
        engine: "webgpu",
        availableBytes: storage.available,
        recommendedModel: pickModel(storage.available),
      };
    }
  }

  // No WebGPU — fall back to WASM. WASM needs SharedArrayBuffer → cross-origin isolation.
  if (!hasCoi) {
    return { ok: false, reason: "no-cross-origin-isolation" };
  }

  return {
    ok: true,
    engine: "wasm",
    availableBytes: storage.available,
    recommendedModel: pickModel(storage.available),
    warn: "slower-inference",
  };
}

/** Best-effort: ask the browser to mark storage as persistent. */
export async function requestPersistentStorage(): Promise<boolean> {
  if (typeof navigator === "undefined") return false;
  const persist = (navigator as NavigatorWithGpu).storage?.persist;
  if (typeof persist !== "function") return false;
  try {
    return await persist.call(navigator.storage);
  } catch {
    return false;
  }
}
