import { describe, expect, it, vi } from "vitest";
import { fetchWithTimeout, withTimeout } from "./fetch-timeout";

const hangingFetch = vi.fn(
  () => new Promise<Response>(() => {}),
) as unknown as typeof fetch;

describe("fetchWithTimeout", () => {
  it("rejects a hanging fetch once the timeout elapses", async () => {
    await expect(fetchWithTimeout("/x", undefined, hangingFetch, 20)).rejects.toThrow(
      /timed out/,
    );
  });

  it("resolves a fast fetch and aborts nothing observable", async () => {
    const res = { ok: true } as Response;
    const fast = vi.fn(async () => res) as unknown as typeof fetch;
    await expect(fetchWithTimeout("/x", undefined, fast, 1000)).resolves.toBe(res);
  });

  it("passes through a fast rejection untouched", async () => {
    const boom = new Error("denied");
    const failing = vi.fn(async () => {
      throw boom;
    }) as unknown as typeof fetch;
    await expect(fetchWithTimeout("/x", undefined, failing, 1000)).rejects.toBe(boom);
  });
});

describe("withTimeout", () => {
  it("rejects a hanging promise once the timeout elapses", async () => {
    await expect(withTimeout(new Promise(() => {}), 20)).rejects.toThrow(/timed out/);
  });

  it("resolves values and passes through rejections", async () => {
    await expect(withTimeout(Promise.resolve(7), 100)).resolves.toBe(7);
    const boom = new Error("nope");
    await expect(withTimeout(Promise.reject(boom), 100)).rejects.toBe(boom);
  });
});
