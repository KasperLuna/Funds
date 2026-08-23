import { describe, expect, it } from "vitest";
import { generateKeyPairSync } from "node:crypto";
import {
  createVapidSender,
  decryptPayload,
  encryptPayload,
  generateVapidKeys,
  rawPublicKey,
  vapidAuthorization,
  type PushPayload,
  type PushSubscription,
} from "./push";

function clientKeys() {
  return generateKeyPairSync("ec", { namedCurve: "prime256v1" });
}

function serverKeys() {
  const { privateKey } = generateKeyPairSync("ec", { namedCurve: "prime256v1" });
  return { privateKey };
}

const authSecret = Buffer.from("0123456789abcdef0123456789abcdef");

function makeSub(keys: ReturnType<typeof clientKeys>): PushSubscription {
  const jwk = keys.publicKey.export({ format: "jwk" }) as { x: string; y: string };
  const b64url = Buffer.concat([
    Buffer.from([0x04]),
    Buffer.from(jwk.x, "base64url"),
    Buffer.from(jwk.y, "base64url"),
  ]).toString("base64url");
  return { endpoint: "https://push.example/sub/1", keys: { p256dh: b64url, auth: authSecret.toString("base64url") } };
}

describe("encryptPayload / decryptPayload roundtrip", () => {
  it("round-trips a payload", () => {
    const ck = clientKeys();
    const sk = serverKeys();
    const sub = makeSub(ck);
    const payload: PushPayload = {
      title: "Log Now: Rent due today!",
      body: "Open the app to log this planned transaction.",
      url: "/dashboard/scheduled?plannedId=sch-1",
    };
    const body = encryptPayload(payload, sub, sk);
    // header: 16 salt + 4 rs + 1 idlen + 65 key = 86 bytes
    expect(body.length).toBeGreaterThan(86);
    const decoded = decryptPayload(body, ck, authSecret);
    expect(decoded).toEqual(payload);
  });

  it("produces different ciphertexts per call (random salt)", () => {
    const ck = clientKeys();
    const sk = serverKeys();
    const sub = makeSub(ck);
    const a = encryptPayload({ title: "t", body: "b", url: "u" }, sub, sk);
    const b = encryptPayload({ title: "t", body: "b", url: "u" }, sub, sk);
    expect(a.equals(b)).toBe(false);
  });
});

describe("vapidAuthorization", () => {
  it("builds a vapid header with ES256 JWT and raw 64-byte signature", () => {
    const keys = generateVapidKeys();
    const now = new Date("2026-08-23T10:00:00Z");
    const auth = vapidAuthorization({ ...keys, subject: "mailto:test@example.com" }, "https://push.example", now);
    expect(auth).toMatch(/^vapid t=eyJ[^.]+\.[^.]+\.[A-Za-z0-9_-]+, k=[A-Za-z0-9_-]+$/);
    const [, token, key] = auth.match(/^vapid t=(.+), k=(.+)$/)!;
    expect(key).toBe(keys.publicKey);
    const [h, p, sig] = token!.split(".");
    const header = JSON.parse(Buffer.from(h!, "base64url").toString());
    const claims = JSON.parse(Buffer.from(p!, "base64url").toString());
    expect(header).toEqual({ typ: "JWT", alg: "ES256" });
    expect(claims.aud).toBe("https://push.example");
    expect(claims.sub).toContain("mailto:");
    expect(claims.exp).toBe(Math.floor(now.getTime() / 1000) + 12 * 3600);
    expect(Buffer.from(sig!, "base64url").length).toBe(64);
  });
});

describe("generateVapidKeys", () => {
  it("returns base64url keys; public is a 65-byte uncompressed point", () => {
    const keys = generateVapidKeys();
    expect(Buffer.from(keys.publicKey, "base64url").length).toBe(65);
  });
});

describe("createVapidSender", () => {
  const payload: PushPayload = { title: "t", body: "b", url: "u" };

  it("returns ok on 201 and posts encrypted body with VAPID auth header", async () => {
    const ck = clientKeys();
    const sub = makeSub(ck);
    const keys = generateVapidKeys();
    const fetchMock = vi.fn(async () =>
      new Response(null, { status: 201 }),
    ) as unknown as typeof fetch;
    const send = createVapidSender(
      { ...keys, subject: "mailto:test@example.com" },
      fetchMock,
    );
    const res = await send(sub, payload);
    expect(res.ok).toBe(true);
    expect(fetchMock).toHaveBeenCalledOnce();
    const init = (fetchMock as unknown as { mock: { calls: unknown[][] } }).mock.calls[0]![1] as RequestInit;
    const headers = init.headers as Record<string, string>;
    expect(headers.Authorization).toMatch(/^vapid t=/);
    expect(headers["Content-Encoding"]).toBe("aes128gcm");
    const sentBody = Buffer.from(init.body as Uint8Array);
    // Decrypt what was sent using the client key to prove full round-trip.
    expect(decryptPayload(sentBody, ck, authSecret)).toEqual(payload);
  });

  it("marks 404/410 as gone", async () => {
    const sub = makeSub(clientKeys());
    const keys = generateVapidKeys();
    const send = createVapidSender(
      { ...keys, subject: "mailto:test@example.com" },
      (async () => new Response(null, { status: 410 })) as unknown as typeof fetch,
    );
    const res = await send(sub, payload);
    expect(res).toEqual({ ok: false, gone: true });
  });

  it("swallows network errors as not-ok", async () => {
    const sub = makeSub(clientKeys());
    const keys = generateVapidKeys();
    const send = createVapidSender(
      { ...keys, subject: "mailto:test@example.com" },
      (async () => {
        throw new Error("network down");
      }) as unknown as typeof fetch,
    );
    const res = await send(sub, payload);
    expect(res).toEqual({ ok: false, gone: false });
  });
});

describe("rawPublicKey", () => {
  it("exports 65-byte uncompressed point", () => {
    const { publicKey } = clientKeys();
    expect(rawPublicKey(publicKey).length).toBe(65);
    expect(rawPublicKey(publicKey)[0]).toBe(0x04);
  });
});
