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

  it("accumulates streamed tool_calls (fragmented args, finalized on last chunk)", async () => {
    const e = engineWith(async () =>
      (async function* () {
        yield { choices: [{ delta: { tool_calls: [{ index: 0, id: "call-1", function: { name: "get_spending_breakdown", arguments: "{\"peri" } }] } }] };
        yield { choices: [{ delta: { tool_calls: [{ index: 0, function: { arguments: "od\":\"last_month\"}" } }] } }] };
        yield { choices: [{ delta: {}, finish_reason: "tool_calls" }] };
      })(),
    );
    const out = await e.complete({
      system: "s",
      user: "u",
      tools: [{ type: "function", function: { name: "get_spending_breakdown", description: "", parameters: {} } }],
      temperature: 0.1,
      maxTokens: 600,
    });
    expect(out.content).toBe("");
    expect(out.toolCalls).toHaveLength(1);
    expect(out.toolCalls[0]?.name).toBe("get_spending_breakdown");
    expect(out.toolCalls[0]?.arguments).toBe("{\"period\":\"last_month\"}");
  });

  it("forwards tools and tool_choice to completions.create", async () => {
    let captured: unknown;
    const e = engineWith(async (args) => {
      captured = args;
      return (async function* () {
        yield { choices: [{ delta: {} }] };
      })();
    });
    await e.complete({
      system: "s",
      user: "u",
      temperature: 0.1,
      maxTokens: 600,
      tools: [{ type: "function", function: { name: "t", description: "d", parameters: {} } }],
      toolChoice: "auto",
    });
    expect(captured).toMatchObject({
      tools: [{ type: "function", function: { name: "t" } }],
      tool_choice: "auto",
    });
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
