import { describe, expect, it } from "vitest";
import { ulid } from "./ulid";

describe("ulid", () => {
  it("returns a 26-char Crockford base32 string", () => {
    const id = ulid();
    expect(id).toMatch(/^[0-9A-HJKMNP-TV-Z]{26}$/);
    expect(id).toHaveLength(26);
  });

  it("produces unique ids across 100,000 calls", () => {
    const seen = new Set<string>();
    for (let i = 0; i < 100_000; i++) {
      seen.add(ulid());
    }
    expect(seen.size).toBe(100_000);
  });

  it("is monotonically sortable (time-ordered)", () => {
    const ids = Array.from({ length: 1000 }, () => ulid());
    const sorted = [...ids].sort();
    expect(sorted).toEqual(ids);
  });

  it("encodes a timestamp within ±5 minutes of now", () => {
    const alphabet = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
    const id = ulid();
    const tsChars = id.slice(0, 10);
    let ts = 0;
    for (const ch of tsChars) {
      ts = ts * 32 + alphabet.indexOf(ch);
    }
    expect(Math.abs(ts - Date.now())).toBeLessThan(5 * 60 * 1000);
  });
});
