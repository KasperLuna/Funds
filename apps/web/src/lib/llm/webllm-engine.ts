"use client";

import type {
  CompleteOptions,
  DownloadProgress,
  EngineStatus,
  LlmEngine,
  ModelId,
} from "./types";
import {
  isModelCached,
  readMeta,
  readStamp,
  writeMeta,
  writeStamp,
  clearModel,
} from "./opfs-cache";
import { isIosLikeDevice, requestPersistentStorage } from "./capability";

/**
 * Real LLM engine. Lazy-imports `@mlc-ai/web-llm` so the dependency is only
 * pulled in the browser bundle, never on the server. All inference stays in a
 * Web Worker that WebLLM manages internally — we just hold a reference to the
 * engine and stream completions.
 *
 * The first version of this file intentionally keeps the surface minimal: it
 * exposes the contract the assistant needs (load, complete, lastLoadedAt,
 * cancel) and nothing more. Once we wire a real model list the MLC CDN URLs
 * get plugged into `prebuiltAppConfig`; the orchestrator never sees them.
 */
export class WebLlmEngine implements LlmEngine {
  private statusValue: EngineStatus = "not-loaded";
  private currentModel: ModelId | null = null;
  private engine: unknown = null;
  private cancelRef: { cancelled: boolean } = { cancelled: false };
  private loadPromise: Promise<void> | null = null;

  status(): EngineStatus {
    return this.statusValue;
  }

  currentModelId(): ModelId | null {
    return this.currentModel;
  }

  async load(modelId: ModelId, onProgress: (p: DownloadProgress) => void): Promise<void> {
    if (this.statusValue === "ready" && this.currentModel === modelId) return;
    if (this.loadPromise) return this.loadPromise;
    this.loadPromise = this.doLoad(modelId, onProgress).finally(() => {
      this.loadPromise = null;
    });
    return this.loadPromise;
  }

  private async doLoad(
    modelId: ModelId,
    onProgress: (p: DownloadProgress) => void,
  ): Promise<void> {
    this.statusValue = "downloading";
    this.currentModel = modelId;

    try {
      // Request persistent storage before download — prevents iOS from
      // evicting cached model weights after ~7 days of no engagement.
      await requestPersistentStorage();

      const { CreateMLCEngine, prebuiltAppConfig } = await import("@mlc-ai/web-llm");

      // Safari's OPFS has known issues with large binary writes. Fall back to
      // WebLLM's default (IndexedDB) on Safari to avoid silent cache failures.
      const isSafari =
        typeof navigator !== "undefined" &&
        /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

      // cavetail: WebLLM streams progress via a callback. We forward it
      // verbatim; the AssistantPanel renders the bar from these bytes.
      this.engine = await CreateMLCEngine(modelId, {
        appConfig: {
          model_list: prebuiltAppConfig.model_list,
          ...(isSafari ? {} : { cacheBackend: "opfs" }),
        },
        initProgressCallback: (report) => {
          onProgress({ loaded: report.progress, total: 1 });
        },
      });

      // OPFS sidecar writes are non-fatal — don't let them crash the load.
      try {
        await writeStamp(modelId, { lastLoadedAt: Date.now() });
        if (!(await isModelCached(modelId))) {
          await writeMeta(modelId, {
            modelId,
            contentHash: "",
            totalBytes: 0,
            cachedAt: Date.now(),
          });
        }
      } catch {
        // OPFS write failed — model is still loaded and usable.
        return;
      }

      this.statusValue = "ready";
    } catch (e) {
      this.statusValue = "error";
      throw e;
    }
  }

  async complete(opts: CompleteOptions): Promise<string> {
    if (this.statusValue !== "ready" || !this.engine) {
      throw new Error("LLM not ready");
    }
    this.cancelRef = { cancelled: false };

    // iOS Safari can kill the tab during long-running WebGPU inference due to
    // memory pressure. A per-token timeout detects this early and surfaces a
    // recoverable error instead of a white-screen crash.
    const isIos = isIosLikeDevice();
    const TOKEN_TIMEOUT_MS = isIos ? 30_000 : 60_000;
    let lastTokenAt = Date.now();

    type MlcChat = { completions: { create: (args: unknown) => Promise<{ stream: () => AsyncIterable<{ choices?: Array<{ text?: string }> }> }> } };
    const mlc = this.engine as MlcChat;
    const completion = await mlc.completions.create({
      messages: [
        { role: "system", content: opts.system },
        { role: "user", content: opts.user },
      ],
      temperature: opts.temperature,
      max_tokens: opts.maxTokens,
      response_format: opts.jsonMode ? { type: "json_object" } : undefined,
    });

    let out = "";
    try {
      for await (const chunk of completion.stream()) {
        if (this.cancelRef.cancelled) {
          throw new DOMException("Aborted", "AbortError");
        }
        if (Date.now() - lastTokenAt > TOKEN_TIMEOUT_MS) {
          this.cancel();
          throw new Error(
            isIos
              ? "Inference timed out — iOS may have reclaimed GPU memory. Try a shorter question or restart the page."
              : "Inference timed out — the model took too long to respond.",
          );
        }
        const delta = chunk.choices?.[0]?.text;
        if (delta) {
          lastTokenAt = Date.now();
          out += delta;
          opts.onToken?.(delta);
        }
      }
    } catch (err) {
      // If the engine itself crashed (WebGPU context loss, OOM), mark it
      // failed so the next send() triggers a fresh load instead of retrying
      // a dead engine.
      if (
        !(err instanceof DOMException && err.name === "AbortError") &&
        this.statusValue === "ready"
      ) {
        this.statusValue = "error";
      }
      throw err;
    }
    return out;
  }

  async unload(): Promise<void> {
    if (this.engine && typeof (this.engine as { unload?: () => Promise<void> }).unload === "function") {
      await (this.engine as { unload: () => Promise<void> }).unload();
    }
    this.engine = null;
    this.statusValue = "not-loaded";
  }

  async lastLoadedAt(): Promise<number | null> {
    if (!this.currentModel) return null;
    const stamp = await readStamp(this.currentModel);
    return stamp?.lastLoadedAt ?? null;
  }

  cancel(): void {
    this.cancelRef.cancelled = true;
  }

  async deleteModel(modelId: ModelId): Promise<void> {
    if (this.currentModel === modelId) {
      await this.unload();
    }
    await clearModel(modelId);
  }

  // Expose for tests: read cached meta without a live engine.
  static async readMeta(modelId: ModelId) {
    return readMeta(modelId);
  }
}
