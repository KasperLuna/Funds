import { describe, it, expect } from "vitest";

describe("Vitest setup", () => {
  it("should work", () => {
    expect(true).toBe(true);
  });

  it("should resolve path aliases", async () => {
    const utils = await import("@/lib/utils");
    expect(utils).toBeDefined();
  });
});
