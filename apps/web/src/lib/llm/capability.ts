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
      warn: "slower-inference";
    }
  | {
      ok: false;
      reason:
        | "no-webgpu"
        | "no-cross-origin-isolation"
        | "no-opfs"
        | "no-storage"
        | "unsupported-environment";
    };

const MIN_STORAGE_BYTES = 1 * 1024 * 1024 * 1024; // 1 GB — below this we cannot host a model at all

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

function hasOpfs(nav: NavigatorWithGpu): boolean {
  return typeof nav.storage?.getDirectory === "function";
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
  // q4f32_1 uses less memory; q4f16_1 has better quality but needs more headroom.
  // Both models are ~700 MB. Prefer fp16 when storage is generous.
  if (availableBytes >= 2 * 1024 * 1024 * 1024) return "Llama-3.2-1B-Instruct-q4f16_1-MLC";
  return "Llama-3.2-1B-Instruct-q4f32_1-MLC";
}

export async function detectSupport(): Promise<LlmSupport> {
  if (typeof navigator === "undefined") {
    return { ok: false, reason: "unsupported-environment" };
  }
  const nav = navigator as NavigatorWithGpu;

  if (typeof crossOriginIsolated !== "undefined" && !crossOriginIsolated) {
    // SharedArrayBuffer is required for the WASM fallback path. Without it,
    // even the smaller model cannot load.
    return { ok: false, reason: "no-cross-origin-isolation" };
  }

  if (!hasOpfs(nav)) {
    return { ok: false, reason: "no-opfs" };
  }

  const storage = await hasStorage(nav);
  if (!storage) {
    return { ok: false, reason: "no-storage" };
  }
  if (storage.available < MIN_STORAGE_BYTES) {
    return { ok: false, reason: "no-storage" };
  }

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
    return { ok: false, reason: "no-webgpu" };
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
