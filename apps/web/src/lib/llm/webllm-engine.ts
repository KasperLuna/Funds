"use client";

import type {
  CompleteOptions,
  CompletionResult,
  DownloadProgress,
  EngineStatus,
  LlmEngine,
  ModelId,
  ToolCall,
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
  private loadError: string | null = null;

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
      // Status flips to ready BEFORE sidecar writes: a Safari OPFS hiccup
      // must not wedge the engine in "downloading" (complete() would then
      // throw forever and send() would never retry the load).
      this.statusValue = "ready";
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
      }
      this.loadError = null;
    } catch (e) {
      this.statusValue = "error";
      this.loadError = e instanceof Error ? e.message : String(e);
      throw e;
    }
  }

  async complete(opts: CompleteOptions): Promise<CompletionResult> {
    if (this.statusValue !== "ready" || !this.engine) {
      throw new Error(this.loadError ?? "LLM not ready");
    }
    this.cancelRef = { cancelled: false };

    // iOS Safari can kill the tab during long-running WebGPU inference due to
    // memory pressure. A per-token timeout detects this early and surfaces a
    // recoverable error instead of a white-screen crash.
    const isIos = isIosLikeDevice();
    const TOKEN_TIMEOUT_MS = isIos ? 30_000 : 60_000;
    let lastTokenAt = Date.now();

    // cavetail: must match @mlc-ai/web-llm's real streaming contract.
    // `create({ stream: true })` resolves to an AsyncIterable of chunks; text
    // lives in `choices[0].delta.content`, and `tool_calls` are accumulated
    // only on the FINAL chunk (per web-llm's openai_api_protocols header).
    type MlcToolCallDelta = {
      index?: number;
      id?: string;
      function?: { name?: string; arguments?: string };
      type?: "function";
    };
    type MlcChunk = {
      choices?: Array<{
        delta?: { content?: string | null; tool_calls?: Array<MlcToolCallDelta> };
        finish_reason?: string | null;
      }>;
    };
    type MlcChat = {
      completions: {
        create: (args: unknown) => Promise<AsyncIterable<MlcChunk>>;
      };
    };
    const mlc = this.engine as MlcChat;

    const messages: Array<{ role: string; content: string | null; tool_calls?: unknown; tool_call_id?: string }> = [
      { role: "system", content: opts.system },
      { role: "user", content: opts.user },
    ];
    for (const m of opts.messages ?? []) {
      messages.push({
        role: m.role,
        content: m.content,
        tool_call_id: m.toolCallId,
      });
    }

    let completion: AsyncIterable<MlcChunk>;
    try {
      completion = await mlc.completions.create({
        messages,
        temperature: opts.temperature,
        max_tokens: opts.maxTokens,
        stream: true,
        ...(opts.jsonMode ? { response_format: { type: "json_object" } } : {}),
        ...(opts.tools ? { tools: opts.tools } : {}),
        ...(opts.toolChoice !== undefined ? { tool_choice: opts.toolChoice } : {}),
      });
    } catch (err) {
      if (this.statusValue === "ready") this.statusValue = "error";
      throw err;
    }

    let out = "";
    const toolCalls: ToolCall[] = [];
    // WebLLM streams tool-call argument fragments across chunks and only
    // finalizes them on the last chunk. Accumulate by index, keyed on name.
    const acc = new Map<number, { id: string; name: string; args: string }>();
    try {
      for await (const chunk of completion) {
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
        const delta = chunk.choices?.[0]?.delta;
        if (delta?.content) {
          lastTokenAt = Date.now();
          out += delta.content;
          opts.onToken?.(delta.content);
        }
        for (const tc of delta?.tool_calls ?? []) {
          const idx = tc.index ?? 0;
          const cur = acc.get(idx) ?? { id: tc.id ?? String(idx), name: "", args: "" };
          if (tc.function?.name) cur.name = tc.function.name;
          if (tc.function?.arguments) cur.args += tc.function.arguments;
          acc.set(idx, cur);
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

    for (const v of acc.values()) {
      if (v.name) {
        toolCalls.push({ id: v.id, name: v.name, arguments: v.args });
      }
    }
    return { content: out, toolCalls };
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
