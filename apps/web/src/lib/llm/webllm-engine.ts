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
} from "./opfs-cache";

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

    const { CreateMLCEngine, prebuiltAppConfig } = await import("@mlc-ai/web-llm");

    // cavetail: WebLLM streams progress via a callback. We forward it
    // verbatim; the AssistantPanel renders the bar from these bytes.
    this.engine = await CreateMLCEngine(modelId, {
      appConfig: { model_list: prebuiltAppConfig.model_list, cacheBackend: "opfs" },
      initProgressCallback: (report) => {
        onProgress({ loaded: report.progress, total: 1 });
      },
    });

    await writeStamp(modelId, { lastLoadedAt: Date.now() });

    // If we previously cached weights, write a meta record so the next launch
    // can fast-path integrity checks. The hash field is filled in by the
    // downloader once MLC exposes a per-file digest (currently it does not);
    // we mark the cache as present regardless so `isModelCached` is truthful.
    if (!(await isModelCached(modelId))) {
      await writeMeta(modelId, {
        modelId,
        contentHash: "",
        totalBytes: 0,
        cachedAt: Date.now(),
      });
    }

    this.statusValue = "ready";
  }

  async complete(opts: CompleteOptions): Promise<string> {
    if (this.statusValue !== "ready" || !this.engine) {
      throw new Error("LLM not ready");
    }
    this.cancelRef = { cancelled: false };
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

    // Stream the response and accumulate. We choose streaming because the
    // spec's first-token target is <2s; if the request is long we surface
    // progress via the engine status, not via this return value.
    let out = "";
    for await (const chunk of completion.stream()) {
      if (this.cancelRef.cancelled) {
        throw new DOMException("Aborted", "AbortError");
      }
      const delta = chunk.choices?.[0]?.text;
      if (delta) out += delta;
    }
    return out;
  }

  async unload(): Promise<void> {
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

  // Expose for tests: read cached meta without a live engine.
  static async readMeta(modelId: ModelId) {
    return readMeta(modelId);
  }
}
