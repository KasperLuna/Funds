/**
 * Integration tests for the voice API key router (Shortcut provisioning).
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createHash } from "node:crypto";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { eq } from "drizzle-orm";
import { getDb, closeDb } from "./db.js";
import { auth } from "./auth.js";
import * as schema from "@funds/db/schema";
import { createCaller } from "./routers/root.js";

const TEST_EMAIL = "voicekey-test@example.com";
const TEST_PASSWORD = "testpass123";

let testUserId: string;
let authCookie: string;

beforeAll(async () => {
  process.env.DATABASE_URL = "postgres://postgres:postgres@localhost:54329/funds_test";

  const db = getDb();
  await migrate(db, { migrationsFolder: "../../packages/db/drizzle" });

  const signUpRes = await auth.api.signUpEmail({
    body: {
      email: TEST_EMAIL,
      name: "Voice Key User",
      username: "voicekeyuser",
      password: TEST_PASSWORD,
    },
    asResponse: true,
  });

  const signUpData = (await signUpRes.json()) as { user: { id: string } };
  testUserId = signUpData.user.id;
  authCookie = signUpRes.headers.get("set-cookie") ?? "";
});

afterAll(async () => {
  const db = getDb();
  await db.delete(schema.authSessions);
  await db.delete(schema.authAccounts);
  await db.delete(schema.users);
  await closeDb();
});

function authedCaller() {
  return createCaller({ headers: new Headers({ cookie: authCookie }) });
}

describe("voiceKey", () => {
  it("throws UNAUTHORIZED without session", async () => {
    const caller = createCaller({ headers: new Headers() });
    await expect(caller.voiceKey.status()).rejects.toThrow(/UNAUTHORIZED/);
    await expect(caller.voiceKey.generate()).rejects.toThrow(/UNAUTHORIZED/);
    await expect(caller.voiceKey.revoke()).rejects.toThrow(/UNAUTHORIZED/);
  });

  it("generate → status → revoke round trip, hash-only storage", async () => {
    const db = getDb();
    const caller = authedCaller();

    await expect(caller.voiceKey.status()).resolves.toEqual({ configured: false });

    const { apiKey } = await caller.voiceKey.generate();
    expect(apiKey).toMatch(/^[0-9a-f]{48}$/);

    await expect(caller.voiceKey.status()).resolves.toEqual({ configured: true });

    const rows = await db
      .select({ hash: schema.users.voiceApiKeyHash })
      .from(schema.users)
      .where(eq(schema.users.id, testUserId));
    expect(rows[0]?.hash).toBe(createHash("sha256").update(apiKey).digest("hex"));

    // Regenerating replaces the old key (old bearer stops working).
    const rotated = await caller.voiceKey.generate();
    expect(rotated.apiKey).not.toBe(apiKey);

    await expect(caller.voiceKey.revoke()).resolves.toEqual({ ok: true });
    await expect(caller.voiceKey.status()).resolves.toEqual({ configured: false });
  });
});
