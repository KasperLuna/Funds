import type { CompleteOptions, LlmEngine } from "@/lib/llm/types";

/**
 * Test seam. Each test installs a fixture (raw model output) and the mock
 * returns it on the next complete() call. The chat-engine sees a real
 * LlmEngine contract, so the retry/fallback path is exercised end-to-end.
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
    async load() {
      // no-op
    },
    async complete(opts: CompleteOptions) {
      calls.push({ system: opts.system, user: opts.user });
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
