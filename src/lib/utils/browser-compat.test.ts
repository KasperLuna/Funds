import { describe, it, expect } from "vitest";
import { parseBrowserInfo, isBrowserSupported, getMinBrowserRequirements } from "./browser-compat";

describe("parseBrowserInfo", () => {
  it("detects Chrome", () => {
    const ua =
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
    expect(parseBrowserInfo(ua)).toEqual({ name: "Chrome", version: 120 });
  });

  it("detects Edge (Chromium)", () => {
    const ua =
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0";
    expect(parseBrowserInfo(ua)).toEqual({ name: "Edge", version: 120 });
  });

  it("detects Firefox", () => {
    const ua = "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0";
    expect(parseBrowserInfo(ua)).toEqual({ name: "Firefox", version: 121 });
  });

  it("detects Safari", () => {
    const ua =
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15";
    expect(parseBrowserInfo(ua)).toEqual({ name: "Safari", version: 17.2 });
  });

  it("returns null for unknown user agents", () => {
    expect(parseBrowserInfo("SomeBot/1.0")).toBeNull();
  });
});

describe("isBrowserSupported", () => {
  it("returns true for null (unknown browser)", () => {
    expect(isBrowserSupported(null)).toBe(true);
  });

  it("returns true for supported Chrome version", () => {
    expect(isBrowserSupported({ name: "Chrome", version: 120 })).toBe(true);
  });

  it("returns false for old Chrome version", () => {
    expect(isBrowserSupported({ name: "Chrome", version: 90 })).toBe(false);
  });

  it("returns true for supported Firefox version", () => {
    expect(isBrowserSupported({ name: "Firefox", version: 113 })).toBe(true);
  });

  it("returns false for old Firefox version", () => {
    expect(isBrowserSupported({ name: "Firefox", version: 88 })).toBe(false);
  });

  it("returns true for supported Safari version", () => {
    expect(isBrowserSupported({ name: "Safari", version: 17 })).toBe(true);
  });

  it("returns false for old Safari version", () => {
    expect(isBrowserSupported({ name: "Safari", version: 14 })).toBe(false);
  });

  it("returns true for supported Edge version", () => {
    expect(isBrowserSupported({ name: "Edge", version: 111 })).toBe(true);
  });

  it("returns false for old Edge version", () => {
    expect(isBrowserSupported({ name: "Edge", version: 90 })).toBe(false);
  });

  it("returns true for unknown browser names", () => {
    expect(isBrowserSupported({ name: "Opera", version: 50 })).toBe(true);
  });
});

describe("getMinBrowserRequirements", () => {
  it("returns a human-readable string", () => {
    const result = getMinBrowserRequirements();
    expect(result).toContain("Chrome");
    expect(result).toContain("Firefox");
    expect(result).toContain("Safari");
  });
});
