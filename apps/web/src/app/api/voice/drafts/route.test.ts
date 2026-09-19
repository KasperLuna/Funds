/**
 * Drafts inbox endpoints: session-scoped list (non-expired, newest first)
 * and delete (own rows only).
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { NextRequest } from "next/server";
import { getDb, closeDb } from "@/server/db";
import { auth } from "@/server/auth";
import * as schema from "@funds/db/schema";
import { GET } from "./route";
import { DELETE } from "./[id]/route";

let userACookie = "";
let userAId = "";
let userBId = "";

async function signUp(email: string, username: string) {
  const res = await auth.api.signUpEmail({
    body: { email, name: username, username, password: "testpass123" },
    asResponse: true,
  });
  const body = (await res.json()) as { user: { id: string } };
  return { id: body.user.id, cookie: res.headers.get("set-cookie") ?? "" };
}

function authedGet(cookie: string) {
  return GET(
    new NextRequest("http://localhost/api/voice/drafts", {
      headers: { cookie },
    }),
  );
}

function authedDelete(cookie: string, id: string) {
  return DELETE(
    new NextRequest(`http://localhost/api/voice/drafts/${id}`, {
      method: "DELETE",
      headers: { cookie },
    }),
    { params: Promise.resolve({ id }) },
  );
}

beforeAll(async () => {
  process.env.DATABASE_URL = "postgres://postgres:postgres@localhost:54329/funds_test";

  const db = getDb();
  await migrate(db, { migrationsFolder: "../../packages/db/drizzle" });

  const a = await signUp("drafts-a-test@example.com", "draftsauser");
  const b = await signUp("drafts-b-test@example.com", "draftsbuser");
  userACookie = a.cookie;
  userAId = a.id;
  userBId = b.id;

  const now = new Date();
  await db.insert(schema.voiceDrafts).values([
    {
      id: "draft-old",
      userId: userAId,
      token: "token-old",
      preview: { rawText: "old", categories: [], candidates: [], confidence: 0 },
      source: "webhook",
      createdAt: new Date(now.getTime() - 2000),
      expiresAt: new Date(now.getTime() + 24 * 60 * 60 * 1000),
    },
    {
      id: "draft-new",
      userId: userAId,
      token: "token-new",
      preview: { rawText: "new", categories: [], candidates: [], confidence: 0 },
      source: "webhook",
      createdAt: now,
      expiresAt: new Date(now.getTime() + 24 * 60 * 60 * 1000),
    },
    {
      id: "draft-expired",
      userId: userAId,
      token: "token-expired",
      preview: { rawText: "expired", categories: [], candidates: [], confidence: 0 },
      source: "webhook",
      createdAt: new Date(now.getTime() - 60_000),
      expiresAt: new Date(now.getTime() - 1000),
    },
    {
      id: "draft-other-user",
      userId: userBId,
      token: "token-other",
      preview: { rawText: "other", categories: [], candidates: [], confidence: 0 },
      source: "webhook",
      createdAt: now,
      expiresAt: new Date(now.getTime() + 24 * 60 * 60 * 1000),
    },
  ]);
});

afterAll(async () => {
  const db = getDb();
  await db.delete(schema.voiceDrafts);
  await db.delete(schema.authSessions);
  await db.delete(schema.authAccounts);
  await db.delete(schema.users);
  await closeDb();
});

describe("GET /api/voice/drafts", () => {
  it("rejects anonymous callers", async () => {
    const res = await GET(new NextRequest("http://localhost/api/voice/drafts"));
    expect(res.status).toBe(401);
  });

  it("lists own non-expired drafts newest first", async () => {
    const res = await authedGet(userACookie);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { drafts: { id: string }[] };
    expect(body.drafts.map((d) => d.id)).toEqual(["draft-new", "draft-old"]);
  });
});

describe("DELETE /api/voice/drafts/[id]", () => {
  it("deletes an own draft, then 404s", async () => {
    await expect(authedDelete(userACookie, "draft-old")).resolves.toMatchObject({ status: 200 });
    await expect(authedDelete(userACookie, "draft-old")).resolves.toMatchObject({ status: 404 });
  });

  it("refuses another user's draft", async () => {
    await expect(authedDelete(userACookie, "draft-other-user")).resolves.toMatchObject({
      status: 404,
    });
  });
});
