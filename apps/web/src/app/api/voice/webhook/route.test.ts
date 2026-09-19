/**
 * End-to-end intake loop for external automations (iOS Shortcuts):
 * webhook POST with bearer key -> draft -> one-shot redeem -> 404 on replay.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createHash } from "node:crypto";
import { eq } from "drizzle-orm";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { getDb, closeDb } from "@/server/db";
import { auth } from "@/server/auth";
import * as schema from "@funds/db/schema";
import { POST } from "./route";
import { GET } from "../redeem/[token]/route";

const TEST_EMAIL = "shortcut-loop-test@example.com";
const TEST_PASSWORD = "testpass123";
const API_KEY = "b".repeat(48);

function postWebhook(body: unknown, key: string | null) {
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (key !== null) headers.authorization = `Bearer ${key}`;
  return POST(
    new Request("http://localhost/api/voice/webhook", {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    }),
  );
}

beforeAll(async () => {
  process.env.DATABASE_URL = "postgres://postgres:postgres@localhost:54329/funds_test";

  const db = getDb();
  await migrate(db, { migrationsFolder: "../../packages/db/drizzle" });

  const signUpRes = await auth.api.signUpEmail({
    body: {
      email: TEST_EMAIL,
      name: "Shortcut Loop User",
      username: "shortcutloopuser",
      password: TEST_PASSWORD,
    },
    asResponse: true,
  });
  const { user } = (await signUpRes.json()) as { user: { id: string } };

  await db
    .update(schema.users)
    .set({ voiceApiKeyHash: createHash("sha256").update(API_KEY).digest("hex") })
    .where(eq(schema.users.id, user.id));

  await db.insert(schema.assets).values({
    id: "test-asset-shortcut",
    kind: "fiat",
    code: "SCT",
    name: "Shortcut Dollar",
    decimals: 2,
  }).onConflictDoNothing();

  await db.insert(schema.accounts).values({
    id: "test-account-wallet",
    userId: user.id,
    name: "Test Wallet",
    kind: "bank",
    assetId: "test-asset-shortcut",
    openingBalanceMinor: 0n,
  });
  await db.insert(schema.categories).values({
    id: "test-category-coffee",
    userId: user.id,
    name: "Coffee",
  });
});

afterAll(async () => {
  const db = getDb();
  await db.delete(schema.voiceDrafts);
  await db.delete(schema.transactions);
  await db.delete(schema.accounts);
  await db.delete(schema.categories);
  await db.delete(schema.assets);
  await db.delete(schema.authSessions);
  await db.delete(schema.authAccounts);
  await db.delete(schema.users);
  await closeDb();
});

describe("shortcut intake loop", () => {
  it("rejects missing/unknown bearer keys", async () => {
    await expect(postWebhook({ text: "1.00 x" }, null)).resolves.toMatchObject({ status: 401 });
    await expect(postWebhook({ text: "1.00 x" }, "wrong")).resolves.toMatchObject({ status: 401 });
  });

  it("parses text against the user's accounts and redeems exactly once", async () => {
    const res = await postWebhook({ text: "25.00 Coffee Test Wallet" }, API_KEY);
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      draftToken: string;
      preview: { amount?: number; account?: string; categories?: string[] };
    };
    expect(typeof body.draftToken).toBe("string");
    expect(body.preview.amount).toBe(25);
    expect(body.preview.account).toBe("Test Wallet");
    expect(body.preview.categories).toContain("Coffee");

    const first = await GET(new Request("http://localhost"), {
      params: Promise.resolve({ token: body.draftToken }),
    });
    expect(first.status).toBe(200);

    const replay = await GET(new Request("http://localhost"), {
      params: Promise.resolve({ token: body.draftToken }),
    });
    expect(replay.status).toBe(404);
  });
});
