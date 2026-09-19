#!/usr/bin/env node
// Generate a VAPID key pair for Web Push (RFC 8292, ES256 / P-256).
// Prints dotenv lines — append to apps/web/.env AND the VPS env file, then
// restart the stack. Zero dependencies, runs on any modern node.
import { generateKeyPairSync, createPublicKey } from "node:crypto";

const { privateKey } = generateKeyPairSync("ec", { namedCurve: "prime256v1" });
const jwk = createPublicKey(privateKey).export({ format: "jwk" });
const b64url = (b) => Buffer.from(b).toString("base64url");
const pubRaw = Buffer.concat([
  Buffer.from([0x04]),
  Buffer.from(jwk.x, "base64url"),
  Buffer.from(jwk.y, "base64url"),
]);
const privDer = privateKey.export({ format: "der", type: "pkcs8" });

console.log(`VAPID_PUBLIC_KEY=${b64url(pubRaw)}`);
console.log(`VAPID_PRIVATE_KEY=${b64url(privDer)}`);
console.log("VAPID_SUBJECT=mailto:you@example.com");
