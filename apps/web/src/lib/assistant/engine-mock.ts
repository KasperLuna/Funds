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
  setTldr(modelOutput: string): void;
  setTldrs(outputs: string[]): void;
  failNext(reason: Error): void;
  failTldr(reason: Error): void;
  calls: Array<{ system: string; user: string }>;
};

export function createMockLlmEngine(): MockLlmEngine {
  const queue: Array<string | Error> = [];
  const tldrQueue: Array<string | Error> = [];
  const calls: Array<{ system: string; user: string }> = [];
  return {
    calls,
    status: () => "ready",
    currentModelId: () => "Llama-3.2-1B-Instruct-q4f32_1-MLC",
    async load() {
      // no-op
    },
    async complete(opts: CompleteOptions) {
      calls.push({ system: opts.system, user: opts.user });
      // The TLDR system prompt is a stable signal. The chat-engine uses it
      // for the second-call summarization; tests can install fixture
      // responses separately to keep the two paths deterministic.
      const isTldr = opts.system.startsWith("You write a single-sentence headline");
      const q = isTldr ? tldrQueue : queue;
      const next = q.shift();
      if (next instanceof Error) throw next;
      if (typeof next === "string") return next;
      return JSON.stringify({ tldr: "ok" });
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
    setTldr(out: string) {
      tldrQueue.length = 0;
      tldrQueue.push(out);
    },
    setTldrs(outputs: string[]) {
      tldrQueue.length = 0;
      tldrQueue.push(...outputs);
    },
    failNext(reason: Error) {
      queue.length = 0;
      queue.push(reason);
    },
    failTldr(reason: Error) {
      tldrQueue.length = 0;
      tldrQueue.push(reason);
    },
  };
}