import { describe, expect, it } from "vitest";
import { WebLlmEngine } from "./webllm-engine";

/**
 * Contract test against the REAL @mlc-ai/web-llm 0.2.84 API shapes:
 * `completions.create({ stream: true })` resolves to an AsyncIterable of
 * chunks carrying `choices[0].delta.content`. The engine adapter must speak
 * exactly this shape — the fixture mocks in engine-mock.ts can't cover it.
 */
function chunk(text: string) {
  return { choices: [{ delta: { content: text } }] };
}

type Internals = {
  statusValue: string;
  loadError: string | null;
  engine: unknown;
  complete: WebLlmEngine["complete"];
};

function engineWith(
  create: (args: unknown) => Promise<AsyncIterable<object>>,
): Internals {
  const e = new WebLlmEngine() as unknown as Internals;
  e.statusValue = "ready";
  e.engine = { completions: { create } };
  return e;
}

describe("WebLlmEngine.complete contract vs @mlc-ai/web-llm streaming shapes", () => {
  it("iterates the async iterable directly and reads delta.content", async () => {
    let captured: unknown;
    const e = engineWith(async (args) => {
      captured = args;
      return (async function* () {
        yield chunk("Hello");
        yield chunk(" world");
        yield { choices: [{ delta: {} }] };
      })();
    });
    const tokens: string[] = [];
    const out = await e.complete({
      system: "s",
      user: "u",
      jsonMode: true,
      temperature: 0.1,
      maxTokens: 600,
      onToken: (t) => tokens.push(t),
    });
    expect(out.content).toBe("Hello world");
    expect(out.toolCalls).toEqual([]);
    expect(tokens).toEqual(["Hello", " world"]);
    expect(captured).toMatchObject({
      stream: true,
      max_tokens: 600,
      response_format: { type: "json_object" },
    });
  });

  it("emulates tool-calling in JSON mode: tool envelope parsed into toolCalls", async () => {
    let captured: unknown;
    const e = engineWith(async (args) => {
      captured = args;
      return (async function* () {
        yield chunk('{"tool":"get_summary","arguments":{"period":"this_week"}}');
        yield { choices: [{ delta: {}, finish_reason: "stop" }] };
      })();
    });
    const out = await e.complete({
      system: "s",
      user: "u",
      temperature: 0.1,
      maxTokens: 600,
      tools: [
        { type: "function", function: { name: "get_summary", description: "d", parameters: {} } },
      ],
    });
    // Native `tools` must NOT be forwarded — web-llm 0.2.84 only supports
    // Hermes models for them and crashes on any other model.
    expect(captured).toMatchObject({
      stream: true,
      response_format: { type: "json_object" },
    });
    expect((captured as { tools?: unknown }).tools).toBeUndefined();
    expect(out.content).toBe("");
    expect(out.toolCalls).toHaveLength(1);
    expect(out.toolCalls[0]?.name).toBe("get_summary");
    expect(out.toolCalls[0]?.arguments).toBe('{"period":"this_week"}');
  });

  it("parses a text reply out of the tool protocol envelope", async () => {
    const e = engineWith(async () =>
      (async function* () {
        yield chunk('{"reply":"Hi! What can I help with?"}');
      })(),
    );
    const out = await e.complete({
      system: "s",
      user: "u",
      temperature: 0.1,
      maxTokens: 600,
      tools: [{ type: "function", function: { name: "t", description: "d", parameters: {} } }],
    });
    expect(out.toolCalls).toEqual([]);
    expect(out.content).toBe("Hi! What can I help with?");
  });

  it("passes unparseable tool-protocol output through as content (no crash)", async () => {
    const e = engineWith(async () =>
      (async function* () {
        yield chunk("plain prose reply");
      })(),
    );
    const out = await e.complete({
      system: "s",
      user: "u",
      temperature: 0.1,
      maxTokens: 600,
      tools: [{ type: "function", function: { name: "t", description: "d", parameters: {} } }],
    });
    expect(out.toolCalls).toEqual([]);
    expect(out.content).toBe("plain prose reply");
  });

  it("keeps tool results in the conversation as user turns (no tool role)", async () => {
    let captured: unknown;
    const e = engineWith(async (args) => {
      captured = args;
      return (async function* () {
        yield chunk('{"reply":"ok"}');
      })();
    });
    await e.complete({
      system: "s",
      user: "u",
      temperature: 0.1,
      maxTokens: 600,
      tools: [{ type: "function", function: { name: "t", description: "d", parameters: {} } }],
      messages: [
        { role: "assistant", content: '{"tool":"x","arguments":{}}', toolCallId: "c1" },
        { role: "tool", content: '{"total":"1"}', toolCallId: "call-x" },
      ],
    });
    const msgs = (captured as { messages: Array<{ role: string; content: string }> }).messages;
    expect(msgs.some((m) => m.role === "tool")).toBe(false);
    expect(msgs.some((m) => m.content.startsWith("TOOL_RESULT:"))).toBe(true);
  });

  it("throws the stored load failure reason when not ready", async () => {
    const e = new WebLlmEngine() as unknown as Internals;
    e.statusValue = "error";
    e.loadError = "download interrupted";
    await expect(
      e.complete({ system: "s", user: "u", jsonMode: true, temperature: 0, maxTokens: 10 }),
    ).rejects.toThrow("download interrupted");
  });

  it("marks the engine error when completions.create rejects (crash/OOM)", async () => {
    const e = engineWith(async () => {
      throw new Error("WebGPU context lost");
    });
    await expect(
      e.complete({ system: "s", user: "u", jsonMode: true, temperature: 0, maxTokens: 10 }),
    ).rejects.toThrow("WebGPU context lost");
    expect(e.statusValue).toBe("error");
  });
});
