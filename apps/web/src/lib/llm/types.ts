/**
 * The LlmEngine contract used by the assistant. The real implementation is in
 * `webllm-engine.ts`; tests use `MockLlmEngine`. The orchestrator imports this
 * interface only, so swapping the runtime costs zero callsite edits.
 */
export type ModelId =
  | "Llama-3.2-1B-Instruct-q4f32_1-MLC"
  | "Llama-3.2-1B-Instruct-q4f16_1-MLC";

/** Display-friendly labels for model IDs. */
export const MODEL_LABELS: Record<ModelId, string> = {
  "Llama-3.2-1B-Instruct-q4f32_1-MLC": "Llama 3.2 1B",
  "Llama-3.2-1B-Instruct-q4f16_1-MLC": "Llama 3.2 1B (fp16)",
};

export const DEFAULT_MODEL: ModelId = "Llama-3.2-1B-Instruct-q4f32_1-MLC";

export type EngineStatus =
  | "unsupported"
  | "not-loaded"
  | "downloading"
  | "ready"
  | "error";

export type DownloadProgress = { loaded: number; total: number };

export type CompleteOptions = {
  system: string;
  user: string;
  /** When true the engine constrains output to a JSON grammar when supported. */
  jsonMode: true;
  /** 0.0–1.0; the orchestrator passes 0.1 for deterministic aggregation. */
  temperature: number;
  /** Hard cap on tokens the model may emit; prevents runaway generation. */
  maxTokens: number;
};

export interface LlmEngine {
  status(): EngineStatus;
  currentModelId(): ModelId | null;
  load(modelId: ModelId, onProgress: (p: DownloadProgress) => void): Promise<void>;
  complete(opts: CompleteOptions): Promise<string>;
  unload(): Promise<void>;
  /** Timestamp of the most recent successful load, sourced from an OPFS sidecar. */
  lastLoadedAt(): Promise<number | null>;
  /** Cancel an in-flight `complete()`. The promise rejects with `AbortError`. */
  cancel(): void;
}
