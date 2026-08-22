import { randomBytes } from "node:crypto";

const ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

function encodeBigInt(value: bigint, chars: number): string {
  let v = value;
  let out = "";
  for (let i = 0; i < chars; i += 1) {
    out = ALPHABET[Number(v & 31n)] + out;
    v >>= 5n;
  }
  return out;
}

let lastTime = 0n;
let lastRand = 0n;

export function ulid(): string {
  const now = BigInt(Date.now());
  const rand = BigInt("0x" + randomBytes(10).toString("hex"));

  if (now === lastTime && rand <= lastRand) {
    lastRand += 1n;
  } else {
    lastTime = now;
    lastRand = rand;
  }

  return encodeBigInt(now, 10) + encodeBigInt(lastRand, 16);
}
