/**
 * Push subscription renewal + self-test endpoints. Session-scoped.
 */
import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { and, eq, isNull } from "drizzle-orm";
import { NextRequest } from "next/server";
import { randomBytes } from "node:crypto";
import { getDb, closeDb } from "@/server/db";
import { auth } from "@/server/auth";
import * as schema from "@funds/db/schema";
import { generateVapidKeys } from "@/lib/scheduled/push";
import { POST as subscribe } from "./subscriptions/route";
import { POST as pushTest } from "./test/route";

let cookieA = "";
let cookieB = "";
let userAId = "";

async function signUp(email: string, username: string) {
  const res = await auth.api.signUpEmail({
    body: { email, name: username, username, password: "testpass123" },
    asResponse: true,
  });
  const body = (await res.json()) as { user: { id: string } };
  return { id: body.user.id, cookie: res.headers.get("set-cookie") ?? "" };
}

function post(path: string, cookie: string | null, payload: unknown) {
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (cookie !== null) headers.cookie = cookie;
  return new NextRequest(`http://localhost${path}`, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });
}

const SUB = {
  endpoint: "https://push.example/renew-1",
  keys: { p256dh: "k1", auth: "a1" },
};

async function activeRows(endpoint: string) {
  const db = getDb();
  return db
    .select()
    .from(schema.pushSubscriptions)
    .where(
      and(
        eq(schema.pushSubscriptions.endpoint, endpoint),
        isNull(schema.pushSubscriptions.deletedAt),
      ),
    );
}

beforeAll(async () => {
  process.env.DATABASE_URL = "postgres://postgres:postgres@localhost:54329/funds_test";

  const db = getDb();
  await migrate(db, { migrationsFolder: "../../packages/db/drizzle" });

  const a = await signUp("push-sub-a-test@example.com", "pushsubauser");
  const b = await signUp("push-sub-b-test@example.com", "pushsubbuser");
  cookieA = a.cookie;
  cookieB = b.cookie;
  userAId = a.id;
});

afterAll(async () => {
  vi.unstubAllGlobals();
  const db = getDb();
  await db.delete(schema.pushSubscriptions);
  await db.delete(schema.authSessions);
  await db.delete(schema.authAccounts);
  await db.delete(schema.users);
  await closeDb();
});

describe("POST /api/push/subscriptions", () => {
  it("rejects anonymous callers", async () => {
    const res = await subscribe(post("/api/push/subscriptions", null, SUB));
    expect(res.status).toBe(401);
  });

  it("creates a row, rotation replaces it, validation holds", async () => {
    const authed = (payload: unknown, cookie: string) =>
      subscribe(post("/api/push/subscriptions", cookie, payload));

    await expect(authed({ endpoint: SUB.endpoint }, cookieA)).resolves.toMatchObject({
      status: 400,
    });
    await expect(
      authed({ endpoint: "http://insecure.example/x", keys: SUB.keys }, cookieA),
    ).resolves.toMatchObject({ status: 400 });

    await expect(authed(SUB, cookieA)).resolves.toMatchObject({ status: 200 });
    expect(await activeRows(SUB.endpoint)).toHaveLength(1);

    await expect(authed(SUB, cookieA)).resolves.toMatchObject({ status: 200 });
    const rows = await activeRows(SUB.endpoint);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.userId).toBe(userAId);
  });
});

describe("POST /api/push/test", () => {
  it("reports zero without subscriptions", async () => {
    const res = await pushTest(post("/api/push/test", cookieB, {}));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ delivered: 0, total: 0 });
  });

  it("delivers to a live subscription", async () => {
    const keys = generateVapidKeys();
    process.env.VAPID_PUBLIC_KEY = keys.publicKey;
    process.env.VAPID_PRIVATE_KEY = keys.privateKey;
    const db = getDb();
    await db
      .delete(schema.pushSubscriptions)
      .where(eq(schema.pushSubscriptions.userId, userAId));
    const clientKeys = {
      p256dh: generateVapidKeys().publicKey,
      auth: randomBytes(16).toString("base64url"),
    };
    await db.insert(schema.pushSubscriptions).values({
      id: "sub-selftest",
      userId: userAId,
      endpoint: "https://push.example/selftest",
      keys: clientKeys,
    });

    const seen: string[] = [];
    vi.stubGlobal(
      "fetch",
      (async (url: unknown) => {
        seen.push(String(url));
        return new Response(null, { status: 201 });
      }) as typeof fetch,
    );

    const res = await pushTest(post("/api/push/test", cookieA, {}));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ delivered: 1, total: 1 });
    expect(seen).toEqual(["https://push.example/selftest"]);
  });
});
