/**
 * Shortcut intake loop: webhook POST with bearer key -> persistent draft ->
 * list/discard via drafts endpoints. Covers dedupe, cap-20 eviction,
 * account binding, push copy, and best-effort push delivery.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createHash, randomBytes } from "node:crypto";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { and, eq, gt } from "drizzle-orm";
import { getDb, closeDb } from "@/server/db";
import { auth } from "@/server/auth";
import * as schema from "@funds/db/schema";
import { generateVapidKeys } from "@/lib/scheduled/push";
import { draftPushCopy, notifyDraftPush } from "@/server/voice-push";
import { POST } from "./route";

const TEST_EMAIL = "shortcut-loop-test@example.com";
const TEST_PASSWORD = "testpass123";
const API_KEY = "b".repeat(48);

let testUserId: string;

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

async function pendingCount(): Promise<number> {
  const db = getDb();
  const rows = await db
    .select({ id: schema.voiceDrafts.id })
    .from(schema.voiceDrafts)
    .where(
      and(
        eq(schema.voiceDrafts.userId, testUserId),
        gt(schema.voiceDrafts.expiresAt, new Date()),
      ),
    );
  return rows.length;
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
  testUserId = user.id;

  await db
    .update(schema.users)
    .set({ voiceApiKeyHash: createHash("sha256").update(API_KEY).digest("hex") })
    .where(eq(schema.users.id, user.id));

  await db
    .insert(schema.assets)
    .values({
      id: "test-asset-shortcut",
      kind: "fiat",
      code: "SCT",
      name: "Shortcut Dollar",
      decimals: 2,
    })
    .onConflictDoNothing();

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
  await db.delete(schema.pushSubscriptions);
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

  it("creates a persistent draft bound to the matched account", async () => {
    const res = await postWebhook({ text: "25.00 Coffee Test Wallet" }, API_KEY);
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      draftId: string;
      preview: { amount?: number; account?: string; categories?: string[] };
      deduped: boolean;
    };
    expect(typeof body.draftId).toBe("string");
    expect(body.deduped).toBe(false);
    expect(body.preview.amount).toBe(25);
    expect(body.preview.account).toBe("Test Wallet");
    expect(body.preview.categories).toContain("Coffee");

    const db = getDb();
    const rows = await db
      .select()
      .from(schema.voiceDrafts)
      .where(eq(schema.voiceDrafts.id, body.draftId));
    expect(rows[0]?.accountId).toBe("test-account-wallet");
    const ttlMs = new Date(rows[0]?.expiresAt ?? 0).getTime() - Date.now();
    expect(ttlMs).toBeGreaterThan(2 * 24 * 60 * 60 * 1000);
  });

  it("dedupes an identical text within the window", async () => {
    const first = (await (
      await postWebhook({ text: "9.99 Donuts Test Wallet" }, API_KEY)
    ).json()) as { draftId: string };
    const before = await pendingCount();
    const res = await postWebhook({ text: "9.99   donuts test wallet " }, API_KEY);
    const body = (await res.json()) as { draftId: string; deduped: boolean };
    expect(body.deduped).toBe(true);
    expect(body.draftId).toBe(first.draftId);
    expect(await pendingCount()).toBe(before);
  });

  it("evicts the oldest draft past the pending cap", async () => {
    const db = getDb();
    const now = new Date();
    for (let i = 0; i < 20; i++) {
      await db.insert(schema.voiceDrafts).values({
        id: `cap-draft-${i}`,
        userId: testUserId,
        token: `cap-token-${i}`,
        preview: { rawText: `cap ${i}`, categories: [], candidates: [], confidence: 0 },
        source: "webhook",
        createdAt: new Date(now.getTime() - (20 - i) * 1000),
        expiresAt: new Date(now.getTime() + 24 * 60 * 60 * 1000),
      });
    }
    const res = await postWebhook({ text: "1.00 Cap Test Wallet" }, API_KEY);
    expect(res.status).toBe(200);
    expect(await pendingCount()).toBeLessThanOrEqual(20);
    const oldest = await db
      .select({ id: schema.voiceDrafts.id })
      .from(schema.voiceDrafts)
      .where(eq(schema.voiceDrafts.id, "cap-draft-0"));
    expect(oldest.length).toBe(0);
    await db.delete(schema.voiceDrafts);
  });
});

describe("draftPushCopy", () => {
  const base = {
    rawText: "4.50 Oat latte",
    amount: 4.5,
    currency: "USD",
    description: "Oat latte",
    categories: [],
    candidates: [],
    confidence: 1,
  };

  it("titles amount + description with the account in the body", () => {
    const copy = draftPushCopy(base, "Apple Card", "d1", "https://funds.example");
    expect(copy.title).toBe("-$4.50 Oat latte");
    expect(copy.body).toBe("Tap to review and save · Apple Card");
    expect(copy.url).toBe("https://funds.example/dashboard?draftId=d1");
  });

  it("falls back to description, then raw text, without an amount", () => {
    const noAmount = {
      rawText: base.rawText,
      currency: base.currency,
      description: base.description,
      categories: base.categories,
      candidates: base.candidates,
      confidence: base.confidence,
    };
    const copy = draftPushCopy(noAmount, null, "d2", "https://funds.example");
    expect(copy.title).toBe("Oat latte");
    expect(copy.body).toBe("Tap to review and save · Funds");

    const bare = { ...noAmount, description: undefined };
    expect(draftPushCopy(bare, null, "d2", "https://funds.example").title).toBe(
      "4.50 Oat latte",
    );
  });
});

describe("notifyDraftPush", () => {
  const env = { ...process.env };

  afterAll(() => {
    process.env = env;
  });

  it("is a silent no-op without VAPID keys", async () => {
    delete process.env.VAPID_PUBLIC_KEY;
    delete process.env.VAPID_PRIVATE_KEY;
    await expect(
      notifyDraftPush(testUserId, { title: "t", body: "b", url: "u" }, async () => {
        throw new Error("must not send");
      }),
    ).resolves.toBeUndefined();
  });

  it("sends to live subs and prunes gone ones", async () => {
    const keys = generateVapidKeys();
    process.env.VAPID_PUBLIC_KEY = keys.publicKey;
    process.env.VAPID_PRIVATE_KEY = keys.privateKey;
    // cavetail: the sender runs real aes128gcm, so subs need valid-curve keys
    // or encryption throws before any fetch happens.
    const clientKeys = {
      p256dh: generateVapidKeys().publicKey,
      auth: randomBytes(16).toString("base64url"),
    };
    const db = getDb();
    await db.insert(schema.pushSubscriptions).values([
      {
        id: "sub-live",
        userId: testUserId,
        endpoint: "https://push.example/live",
        keys: clientKeys,
      },
      {
        id: "sub-gone",
        userId: testUserId,
        endpoint: "https://push.example/gone",
        keys: clientKeys,
      },
    ]);

    const sent: string[] = [];
    const fetchImpl: typeof fetch = async (url) => {
      sent.push(String(url));
      if (String(url).endsWith("/gone")) return new Response(null, { status: 410 });
      return new Response(null, { status: 201 });
    };

    await notifyDraftPush(
      testUserId,
      { title: "t", body: "b", url: "u" },
      fetchImpl,
    );
    expect(sent).toHaveLength(2);

    const gone = await db
      .select()
      .from(schema.pushSubscriptions)
      .where(eq(schema.pushSubscriptions.id, "sub-gone"));
    expect(gone[0]?.deletedAt).not.toBeNull();
  });
});
