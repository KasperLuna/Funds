import type { LlmEngine, ModelId } from "./types";
import { WebLlmEngine } from "./webllm-engine";
import { detectSupport, type LlmSupport } from "./capability";
import { isModelCached } from "./opfs-cache";

export type { LlmSupport } from "./capability";

const ALL_MODELS: ModelId[] = [
  "SmolLM2-360M-Instruct-q4f16_1-MLC",
  "Qwen3-0.6B-q4f16_1-MLC",
  "Llama-3.2-1B-Instruct-q4f32_1-MLC",
  "Llama-3.2-1B-Instruct-q4f16_1-MLC",
];

/**
 * Factory + cache. Components call `getLlmEngine()` and receive a singleton;
 * the engine itself is created lazily on first use so a user who never opens
 * the assistant never pays the WebLLM import cost.
 *
 * cavetail: this module is the single point where real-vs-mock selection
 * happens. Tests reach in via `setLlmEngineForTest` to inject a mock; UI code
 * never imports the mock.
 */
let cached: LlmEngine | null = null;
let support: LlmSupport | null = null;

export async function getLlmSupport(): Promise<LlmSupport> {
  if (support) return support;
  support = await detectSupport();
  return support;
}

export function getLlmEngine(): LlmEngine {
  if (!cached) cached = new WebLlmEngine();
  return cached;
}

export function setLlmEngineForTest(engine: LlmEngine | null): void {
  cached = engine;
}

/** Reset cached support state so the next getLlmSupport re-probes (e.g. on resume). */
export function resetLlmSupport(): void {
  support = null;
}

/** Check whether a model's weights are cached in OPFS. */
export async function isModelAvailable(modelId: ModelId): Promise<boolean> {
  return isModelCached(modelId);
}

/** All model IDs the app knows about. */
export function allModelIds(): ModelId[] {
  return ALL_MODELS;
}
