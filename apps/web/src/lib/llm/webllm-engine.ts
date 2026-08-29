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
import { isIosLikeDevice, requestPersistentStorage } from "./capability";

/**
 * JSON-mode tool protocol. The model MUST reply with exactly one JSON object:
 * a tool call, a text reply, or (tolerated) a legacy widget shape. Validated
 * here so the orchestrator always receives well-formed tool calls.
 */
function buildToolSystemPrompt(
  system: string,
  tools: Array<{ type: "function"; function: { name: string; description: string; parameters: unknown } }>,
): string {
  return `${system}

TOOL PROTOCOL — reply with exactly ONE JSON object, nothing else:
- To use a tool: {"tool":"<tool name>","arguments":{<args per its schema>}}
- To answer in text: {"reply":"<your answer>"}

Available tools:
${JSON.stringify(
  tools.map((t) => ({ name: t.function.name, description: t.function.description, parameters: t.function.parameters })),
)}`;
}

function parseToolReply(out: string): CompletionResult {
  const raw = out.trim();
  let parsed: unknown = null;
  try {
    // response_format json_object guarantees a parseable whole; the fence
    // strip is belt-and-braces for models that wrap it anyway.
    const stripped = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "");
    parsed = JSON.parse(stripped);
  } catch {
    return { content: raw, toolCalls: [] };
  }
  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
    return { content: raw, toolCalls: [] };
  }
  const obj = parsed as Record<string, unknown>;
  if (typeof obj.tool === "string" && obj.tool.trim()) {
    const call: ToolCall = {
      id: `call-${obj.tool}`,
      name: obj.tool.trim(),
      arguments: JSON.stringify(obj.arguments ?? {}),
    };
    return { content: "", toolCalls: [call] };
  }
  const reply = typeof obj.reply === "string" ? obj.reply : undefined;
  return { content: reply ?? out, toolCalls: [] };
}
import {
  isModelCached,
  readMeta,
  readStamp,
  writeMeta,
  writeStamp,
  clearModel,
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
    // `create({ stream: true })` resolves to an AsyncIterable of chunks whose
    // text lives in `choices[0].delta.content`.
    type MlcChunk = {
      choices?: Array<{
        delta?: { content?: string | null };
        finish_reason?: string | null;
      }>;
    };
    type MlcChat = {
      completions: {
        create: (args: unknown) => Promise<AsyncIterable<MlcChunk>>;
      };
    };
    const mlc = this.engine as MlcChat;

    // cavetail: web-llm 0.2.84's native `tools` only works for the five
    // Hermes models (functionCallingModelIds), and even there it replaces the
    // system prompt and forbids response_format. On the STREAMING path it
    // skips the allowlist check entirely and then JSON.parses the whole
    // output as a tool-call array — any prose reply throws
    // ToolCallOutputParseError, crashing every request on Llama/Qwen/SmolLM.
    // So tool-calling is carried in JSON mode instead: the model replies with
    // {"tool":..., "arguments":{...}} or {"reply":"..."} under the
    // grammar-constrained json_object response format, which works for ANY
    // model and cannot produce unparseable output.
    let system = opts.system;
    const messages: Array<{ role: string; content: string | null }> = [
      { role: "system", content: opts.system },
      { role: "user", content: opts.user },
    ];
    if (opts.tools) {
      system = buildToolSystemPrompt(opts.system, opts.tools);
      messages[0] = { role: "system", content: system };
      for (const m of opts.messages ?? []) {
        if (m.role === "tool") {
          // Llama-3.2's MLC template has no tool role; feed results back as
          // a user turn the model can read.
          messages.push({ role: "user", content: `TOOL_RESULT: ${m.content}` });
        } else {
          messages.push({ role: m.role, content: m.content });
        }
      }
    } else {
      for (const m of opts.messages ?? []) {
        messages.push({ role: m.role, content: m.content });
      }
    }

    let completion: AsyncIterable<MlcChunk>;
    try {
      completion = await mlc.completions.create({
        messages,
        temperature: opts.temperature,
        max_tokens: opts.maxTokens,
        stream: true,
        // Tool-protocol turns MUST be grammar-constrained: prose output is
        // what made native tools crash. jsonMode also stays honored alone.
        response_format: opts.jsonMode || opts.tools ? { type: "json_object" } : undefined,
      });
    } catch (err) {
      if (this.statusValue === "ready") this.statusValue = "error";
      throw err;
    }

    let out = "";
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

    // Parse the tool-call envelope out of the grammar-constrained JSON reply.
    if (opts.tools) {
      return parseToolReply(out);
    }
    return { content: out, toolCalls: [] };
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
