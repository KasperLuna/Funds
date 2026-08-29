/**
 * The LlmEngine contract used by the assistant. The real implementation is in
 * `webllm-engine.ts`; tests use `MockLlmEngine`. The orchestrator imports this
 * interface only, so swapping the runtime costs zero callsite edits.
 */
export type ModelId =
  | "SmolLM2-360M-Instruct-q4f16_1-MLC"
  | "Qwen3-0.6B-q4f16_1-MLC"
  | "Llama-3.2-1B-Instruct-q4f32_1-MLC"
  | "Llama-3.2-1B-Instruct-q4f16_1-MLC";

/** Display-friendly labels for model IDs. */
export const MODEL_LABELS: Record<ModelId, string> = {
  "SmolLM2-360M-Instruct-q4f16_1-MLC": "SmolLM2 360M",
  "Qwen3-0.6B-q4f16_1-MLC": "Qwen3 0.6B",
  "Llama-3.2-1B-Instruct-q4f32_1-MLC": "Llama 3.2 1B",
  "Llama-3.2-1B-Instruct-q4f16_1-MLC": "Llama 3.2 1B (fp16)",
};

export const DEFAULT_MODEL: ModelId = "SmolLM2-360M-Instruct-q4f16_1-MLC";

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
  /** Prior assistant/tool/user messages to continue a conversation. */
  messages?: Array<{ role: "assistant" | "tool" | "user"; content: string; toolCallId?: string }>;
  /** When true the engine constrains output to a JSON grammar when supported. */
  jsonMode?: true;
  /** OpenAI-style function definitions the model may call (JSON-schema params). */
  tools?: Array<{ type: "function"; function: { name: string; description: string; parameters: unknown } }>;
  /** "none" | "auto" | or a forced named tool. Defaults per WebLLM ("auto" when tools present). */
  toolChoice?: unknown;
  /** 0.0–1.0; the orchestrator passes 0.1 for deterministic aggregation. */
  temperature: number;
  /** Hard cap on tokens the model may emit; prevents runaway generation. */
  maxTokens: number;
  /** Called for each token as it streams. Optional — engine accumulates regardless. */
  onToken?: (token: string) => void;
};

export type ToolCall = {
  id: string;
  name: string;
  /** The model-generated JSON arguments (string form; validate before use). */
  arguments: string;
};

export type CompletionResult = {
  /** Accumulated text content (empty when the model chose to call a tool). */
  content: string;
  /** Tool calls requested by the model in this turn, if any. */
  toolCalls: ToolCall[];
};

export interface LlmEngine {
  status(): EngineStatus;
  currentModelId(): ModelId | null;
  load(modelId: ModelId, onProgress: (p: DownloadProgress) => void): Promise<void>;
  complete(opts: CompleteOptions): Promise<CompletionResult>;
  unload(): Promise<void>;
  /** Timestamp of the most recent successful load, sourced from an OPFS sidecar. */
  lastLoadedAt(): Promise<number | null>;
  /** Cancel an in-flight `complete()`. The promise rejects with `AbortError`. */
  cancel(): void;
  /** Delete a model's cached weights from disk. Unloads first if active. */
  deleteModel(modelId: ModelId): Promise<void>;
}
