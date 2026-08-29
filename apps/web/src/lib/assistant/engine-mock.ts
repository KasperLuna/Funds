import type { CompleteOptions, CompletionResult, LlmEngine, ToolCall } from "@/lib/llm/types";

/**
 * Test seam. Each test installs a fixture and the mock returns it on the next
 * complete() call. A fixture is either a raw string (treated as a plain
 * `content` reply, matching the old single-shot contract) or a full
 * `CompletionResult` (letting a test drive the tool-call loop: the model
 * first emits a tool call, then a final content reply).
 */
export type MockFixture = string | CompletionResult;

export type MockLlmEngine = LlmEngine & {
  setResponse(fixture: MockFixture): void;
  setResponses(fixtures: MockFixture[]): void;
  failNext(reason: Error): void;
  calls: Array<{ system: string; user: string; messages?: CompleteOptions["messages"] }>;
};

function coerce(content: string): CompletionResult {
  return { content, toolCalls: [] };
}

export function createMockLlmEngine(): MockLlmEngine {
  const queue: Array<MockFixture | Error> = [];
  const calls: Array<{ system: string; user: string; messages?: CompleteOptions["messages"] }> = [];
  return {
    calls,
    status: () => "ready",
    currentModelId: () => "Llama-3.2-1B-Instruct-q4f32_1-MLC",
    async load() {
      // no-op
    },
    async complete(opts: CompleteOptions): Promise<CompletionResult> {
      calls.push({ system: opts.system, user: opts.user, messages: opts.messages });
      const next = queue.shift();
      if (next instanceof Error) throw next;
      if (typeof next === "string") return coerce(next);
      if (next) return next;
      return coerce(JSON.stringify({ type: "text", content: "no fixture" }));
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
    setResponse(fixture: MockFixture) {
      queue.length = 0;
      queue.push(fixture);
    },
    setResponses(fixtures: MockFixture[]) {
      queue.length = 0;
      queue.push(...fixtures);
    },
    failNext(reason: Error) {
      queue.length = 0;
      queue.push(reason);
    },
  };
}

/** Convenience: build a tool-call fixture (a model turn that calls a tool). */
export function toolCall(name: string, args: unknown): CompletionResult {
  return {
    content: "",
    toolCalls: [{ id: `call-${name}`, name, arguments: JSON.stringify(args) } as ToolCall],
  };
}