import { describe, it, expect, beforeEach } from "vitest";
import { publishHint, subscribeHint, hintVersion, resetHints } from "./sync-hints.js";

beforeEach(() => {
  resetHints();
});

describe("sync hints hub", () => {
  it("publishes a monotonic version and notifies subscribers", () => {
    const seen: number[] = [];
    const unsub = subscribeHint("u1", (v) => seen.push(v));
    expect(publishHint("u1")).toBe(1);
    expect(publishHint("u1")).toBe(2);
    expect(seen).toEqual([1, 2]);
    expect(hintVersion("u1")).toBe(2);
    unsub();
  });

  it("is scoped per user", () => {
    const seen: number[] = [];
    subscribeHint("u1", (v) => seen.push(v));
    publishHint("u2");
    expect(seen).toHaveLength(0);
    expect(hintVersion("u1")).toBe(0);
    expect(hintVersion("u2")).toBe(1);
  });

  it("unsubscribe stops delivery and a throwing subscriber does not break others", () => {
    const good: number[] = [];
    const bad = () => {
      throw new Error("broken tab");
    };
    const unsubGood = subscribeHint("u1", (v) => good.push(v));
    subscribeHint("u1", bad);
    publishHint("u1");
    expect(good).toEqual([1]);
    unsubGood();
    publishHint("u1");
    expect(good).toEqual([1]);
  });

  it("carries no row data — version numbers only", () => {
    let payload: unknown;
    subscribeHint("u1", (v) => {
      payload = v;
    });
    publishHint("u1");
    expect(typeof payload).toBe("number");
  });
});
