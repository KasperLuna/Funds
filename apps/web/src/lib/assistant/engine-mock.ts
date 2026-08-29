import type { CompleteOptions, LlmEngine } from "@/lib/llm/types";

/**
 * Test seam. Each test installs a raw model output string and the mock
 * returns it on the next complete() call. The chat-engine sees a real
 * LlmEngine contract, so the parse/dispatch/fallback path is exercised
 * end-to-end without a live model.
 */
export type MockLlmEngine = LlmEngine & {
  setResponse(modelOutput: string): void;
  setResponses(outputs: string[]): void;
  failNext(reason: Error): void;
  calls: Array<{ system: string; user: string }>;
};

export function createMockLlmEngine(): MockLlmEngine {
  const queue: Array<string | Error> = [];
  const calls: Array<{ system: string; user: string }> = [];
  return {
    calls,
    status: () => "ready",
    currentModelId: () => "Llama-3.2-1B-Instruct-q4f32_1-MLC",
    async load() {
      // no-op
    },
    async complete(_opts: CompleteOptions) {
      calls.push({ system: _opts.system, user: _opts.user });
      const next = queue.shift();
      if (next instanceof Error) throw next;
      if (typeof next === "string") return next;
      return JSON.stringify({ type: "text", content: "no fixture" });
    },
    async unload() {
      // no-op
    },
    async lastLoadedAt() {
      return Date.now();
    },
    cancel() {
      // no-op
    },
    async deleteModel() {
      // no-op
    },
    setResponse(out: string) {
      queue.length = 0;
      queue.push(out);
    },
    setResponses(outputs: string[]) {
      queue.length = 0;
      queue.push(...outputs);
    },
    failNext(reason: Error) {
      queue.length = 0;
      queue.push(reason);
    },
  };
}
