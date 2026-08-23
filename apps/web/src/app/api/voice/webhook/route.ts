import { NextResponse } from "next/server";
import { createHash, randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { getDb } from "@/server/db";
import * as schema from "@funds/db/schema";
import { parseTransaction } from "@funds/core/parser";

const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 20;
const DRAFT_TTL_MS = 300_000; // 5 minutes
const hits = new Map<string, number[]>();

function limited(ip: string | null): boolean {
  const key = ip ?? "unknown";
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < WINDOW_MS);
  if (recent.length >= MAX_PER_WINDOW) {
    hits.set(key, recent);
    return true;
  }
  recent.push(now);
  hits.set(key, recent);
  return false;
}

function sha256hex(input: string): string {
  return createHash("sha256").update(input).digest("hex");
}

export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for") ?? request.headers.get("x-real-ip");
  if (limited(ip)) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Missing bearer token" }, { status: 401 });
  }
  const apiKey = authHeader.slice(7);
  if (!apiKey) {
    return NextResponse.json({ error: "Missing bearer token" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as { text?: string } | null;
  const text = body?.text?.trim();
  if (!text) {
    return NextResponse.json({ error: "text is required" }, { status: 400 });
  }

  const db = getDb();
  const keyHash = sha256hex(apiKey);

  const user = await db
    .select({ id: schema.users.id })
    .from(schema.users)
    .where(eq(schema.users.voiceApiKeyHash, keyHash))
    .limit(1)
    .then((rows) => rows[0]);

  if (!user) {
    return NextResponse.json({ error: "Invalid API key" }, { status: 401 });
  }

  const [accountRows, categoryRows] = await Promise.all([
    db
      .select({ id: schema.accounts.id, name: schema.accounts.name })
      .from(schema.accounts)
      .where(eq(schema.accounts.userId, user.id)),
    db
      .select({ id: schema.categories.id, name: schema.categories.name })
      .from(schema.categories)
      .where(eq(schema.categories.userId, user.id)),
  ]);

  const parsed = parseTransaction(text, {
    accounts: accountRows,
    categories: categoryRows,
  });

  const token = randomUUID();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + DRAFT_TTL_MS);

  await db.insert(schema.voiceDrafts).values({
    userId: user.id,
    token,
    preview: parsed,
    source: "webhook",
    createdAt: now,
    expiresAt,
  });

  return NextResponse.json({ draftToken: token, preview: parsed });
}
