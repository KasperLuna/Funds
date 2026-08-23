/**
 * Web Push sender (RFC 8291 aes128gcm + VAPID RFC 8292), implemented with
 * node:crypto so no `web-push` dependency is needed. Injectable: the send
 * function is a value passed around, so tests can stub it.
 */
import {
  createPrivateKey,
  createPublicKey,
  generateKeyPairSync,
  diffieHellman,
  hkdfSync,
  createCipheriv,
  createDecipheriv,
  randomBytes,
  sign,
  type KeyObject,
} from "node:crypto";

export interface PushSubscription {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

export interface PushPayload {
  title: string;
  body: string;
  url: string;
}

export type SendFn = (
  sub: PushSubscription,
  payload: PushPayload,
) => Promise<{ ok: boolean; gone?: boolean }>;

function b64urlToBuf(s: string): Buffer {
  return Buffer.from(s, "base64url");
}

export function bufToB64url(b: Buffer | Uint8Array): string {
  return Buffer.from(b).toString("base64url");
}

/** Extract the raw/uncompressed point of a P-256 public key (65 bytes). */
export function rawPublicKey(pub: KeyObject): Buffer {
  const jwk = pub.export({ format: "jwk" }) as { x: string; y: string };
  return Buffer.concat([
    Buffer.from([0x04]),
    b64urlToBuf(jwk.x),
    b64urlToBuf(jwk.y),
  ]);
}

function hkdf(ikm: Buffer, salt: Buffer, info: Buffer, length: number): Buffer {
  return Buffer.from(hkdfSync("sha256", ikm, salt, info, length));
}

function ecdhSecret(clientPubRaw: Buffer, authSecret: Buffer, serverPriv: KeyObject): Buffer {
  const serverPubRaw = rawPublicKey(createPublicKey(serverPriv));
  const clientPub = createPublicKey({
    key: { kty: "EC", crv: "P-256", x: bufToB64url(clientPubRaw.subarray(1, 33)), y: bufToB64url(clientPubRaw.subarray(33, 65)) },
    format: "jwk",
  });
  const ikm = Buffer.from(diffieHellman({ privateKey: serverPriv, publicKey: clientPub }));
  return hkdf(
    ikm,
    authSecret,
    Buffer.concat([Buffer.from("WebPush: info\0"), clientPubRaw, serverPubRaw]),
    32,
  );
}

/** RFC 8291 aes128gcm body encryption. Returns raw bytes to POST. */
export function encryptPayload(
  payload: PushPayload,
  sub: PushSubscription,
  serverKeys: { privateKey: KeyObject },
): Buffer {
  const clientPubRaw = b64urlToBuf(sub.keys.p256dh);
  const authSecret = b64urlToBuf(sub.keys.auth);
  const salt = randomBytes(16);
  const prk = ecdhSecret(clientPubRaw, authSecret, serverKeys.privateKey);
  const cek = hkdf(prk, salt, Buffer.from("Content-Encoding: aes128gcm\0"), 16);
  const nonce = hkdf(prk, salt, Buffer.from("Content-Encoding: nonce\0"), 12);
  const plaintext = Buffer.concat([
    Buffer.from(JSON.stringify(payload)),
    Buffer.from([0x02]), // last-record padding delimiter
  ]);
  const cipher = createCipheriv("aes-128-gcm", cek, nonce);
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const serverPubRaw = rawPublicKey(createPublicKey(serverKeys.privateKey));
  const header = Buffer.concat([
    salt,
    // rs = 4096 (uint32 big endian)
    Buffer.from([0, 0, 0x10, 0]),
    Buffer.from([serverPubRaw.length]),
    serverPubRaw,
  ]);
  return Buffer.concat([header, ciphertext]);
}

/** Inverse of encryptPayload, for round-trip tests. */
export function decryptPayload(
  body: Buffer,
  clientKeys: { privateKey: KeyObject; publicKey: KeyObject },
  authSecret: Buffer,
): PushPayload {
  const salt = body.subarray(0, 16);
  const idLen = body[20]!;
  const serverPubRaw = body.subarray(21, 21 + idLen);
  const ciphertext = body.subarray(21 + idLen);
  const clientPubRaw = rawPublicKey(clientKeys.publicKey);
  const ikm = Buffer.from(diffieHellman({ privateKey: clientKeys.privateKey, publicKey: createPublicKey({
    key: { kty: "EC", crv: "P-256", x: bufToB64url(serverPubRaw.subarray(1, 33)), y: bufToB64url(serverPubRaw.subarray(33, 65)) },
    format: "jwk",
  }) }));
  const prk = hkdf(
    ikm,
    authSecret,
    Buffer.concat([Buffer.from("WebPush: info\0"), clientPubRaw, serverPubRaw]),
    32,
  );
  const cek = hkdf(prk, salt, Buffer.from("Content-Encoding: aes128gcm\0"), 16);
  const nonce = hkdf(prk, salt, Buffer.from("Content-Encoding: nonce\0"), 12);
  const decipher = createDecipheriv("aes-128-gcm", cek, nonce);
  const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  // strip trailing 0x02-delimiter padding
  let end = plaintext.length;
  while (end > 0 && plaintext[end - 1] === 0) end--;
  end--; // the 0x02 delimiter
  return JSON.parse(plaintext.subarray(0, end).toString("utf8"));
}

export interface VapidKeys {
  publicKey: string; // base64url (uncompressed point)
  privateKey: string; // base64url PKCS8 DER
  subject: string; // mailto:
}

/**
 * Build the VAPID Authorization header value (RFC 8292, ES256).
 * Pure apart from the `now` injection — unit-testable.
 */
export function vapidAuthorization(
  keys: VapidKeys,
  audience: string, // push service origin, e.g. https://fcm.googleapis.com
  now: Date,
): string {
  const priv = createPrivateKey({ key: b64urlToBuf(keys.privateKey), format: "der", type: "pkcs8" });
  const header = { typ: "JWT", alg: "ES256" };
  const claims = {
    aud: audience,
    exp: Math.floor(now.getTime() / 1000) + 12 * 3600,
    sub: keys.subject,
  };
  const b64 = (obj: unknown) =>
    Buffer.from(JSON.stringify(obj)).toString("base64url");
  const unsigned = `${b64(header)}.${b64(claims)}`;
  const der = sign(undefined, Buffer.from(unsigned), priv);
  // convert DER ECDSA signature to raw r||s (64 bytes)
  const raw = derToRaw(der);
  return `vapid t=${unsigned}.${raw.toString("base64url")}, k=${keys.publicKey}`;
}

function derToRaw(der: Buffer): Buffer {
  let pos = 2; // SEQUENCE header
  const vals: Buffer[] = [];
  while (pos < der.length) {
    if (der[pos] !== 0x02) break;
    pos++;
    let len = der[pos++]!;
    if (len & 0x80) {
      const n = len & 0x7f;
      len = 0;
      for (let i = 0; i < n; i++) len = len * 256 + der[pos++]!;
    }
    vals.push(der.subarray(pos, pos + len));
    pos += len;
  }
  const pad = (b: Buffer) => {
    const stripped = b[0] === 0 ? b.subarray(1) : b;
    return Buffer.concat([Buffer.alloc(32 - stripped.length), stripped]);
  };
  return Buffer.concat(vals.flatMap((b) => [pad(b)]));
}

export function generateVapidKeys(): { publicKey: string; privateKey: string } {
  const { privateKey } = generateKeyPairSync("ec", { namedCurve: "prime256v1" });
  const pubRaw = rawPublicKey(createPublicKey(privateKey));
  const privDer = privateKey.export({ format: "der", type: "pkcs8" });
  return {
    publicKey: pubRaw.toString("base64url"),
    privateKey: Buffer.from(privDer).toString("base64url"),
  };
}

/**
 * Create a fetch-based sender. Injectable: tests pass their own send fn.
 * Env: VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY / VAPID_SUBJECT.
 */
export function createVapidSender(keys: VapidKeys, fetchImpl: typeof fetch = fetch): SendFn {
  const privateKey = createPrivateKey({
    key: b64urlToBuf(keys.privateKey),
    format: "der",
    type: "pkcs8",
  });
  return async (sub, payload) => {
    try {
      const body = encryptPayload(payload, sub, { privateKey });
      const audience = new URL(sub.endpoint).origin;
      const res = await fetchImpl(sub.endpoint, {
        method: "POST",
        headers: {
          TTL: "3600",
          Urgency: "normal",
          "Content-Encoding": "aes128gcm",
          "Content-Type": "application/octet-stream",
          Authorization: vapidAuthorization(keys, audience, new Date()),
        },
        body: body as unknown as BufferSource,
      });
      if (res.status === 404 || res.status === 410) {
        return { ok: false, gone: true };
      }
      return { ok: res.ok || res.status === 201, gone: false };
    } catch {
      return { ok: false, gone: false };
    }
  };
}

/** Stub sender for tests/seed: always succeeds without network. */
export const stubSender: SendFn = async () => ({ ok: true, gone: false });
