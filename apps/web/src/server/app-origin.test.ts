import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { resolveAppOrigin } from "./app-origin";

function req(url: string, headers: Record<string, string> = {}) {
  return new NextRequest(url, { headers });
}

describe("resolveAppOrigin", () => {
  const saved = process.env.PUBLIC_APP_URL;
  beforeEach(() => {
    delete process.env.PUBLIC_APP_URL;
  });
  afterEach(() => {
    if (saved === undefined) delete process.env.PUBLIC_APP_URL;
    else process.env.PUBLIC_APP_URL = saved;
  });

  it("prefers PUBLIC_APP_URL over everything", () => {
    process.env.PUBLIC_APP_URL = "https://funds.example/";
    expect(
      resolveAppOrigin(
        req("http://219183cd69:3000/x", {
          "x-forwarded-host": "evil.example",
        }),
      ),
    ).toBe("https://funds.example");
  });

  it("uses the forwarded host behind the proxy", () => {
    expect(
      resolveAppOrigin(
        req("http://219183cd69:3000/api/voice/webhook", {
          "x-forwarded-proto": "https",
          "x-forwarded-host": "funds.example",
        }),
      ),
    ).toBe("https://funds.example");
  });

  it("falls back to the request origin", () => {
    expect(resolveAppOrigin(req("http://localhost:3000/x"))).toBe(
      "http://localhost:3000",
    );
  });
});
