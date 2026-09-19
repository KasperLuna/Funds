import { NextResponse } from "next/server";
import { createHash, randomUUID } from "node:crypto";
import { and, asc, eq, gt, isNull } from "drizzle-orm";
import { getDb } from "@/server/db";
import * as schema from "@funds/db/schema";
import { parseTransaction, type ParsedResult } from "@funds/core/parser";
import { assetSymbol } from "@/lib/money";
import { createVapidSender } from "@/lib/scheduled/push";

const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 20;
// cavetail: drafts live on the dashboard until logged, discarded, or expired.
const DRAFT_TTL_MS = 3 * 24 * 60 * 60 * 1000;
const DEDUPE_WINDOW_MS = 10 * 60 * 1000;
const MAX_PENDING_DRAFTS = 20;
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

function normalizeText(text: string): string {
  return text.toLowerCase().replace(/\s+/g, " ").trim();
}

function formatMajor(amount: number): string {
  return Math.abs(amount).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 8,
  });
}

export interface DraftPushCopy {
  title: string;
  body: string;
  url: string;
}

export function draftPushCopy(
  preview: ParsedResult,
  accountName: string | null,
  draftId: string,
  origin: string,
): DraftPushCopy {
  const description = preview.description?.trim() || preview.rawText.trim();
  const amount =
    preview.amount !== undefined && !Number.isNaN(preview.amount)
      ? `-${assetSymbol(preview.currency)}${formatMajor(preview.amount)}`
      : null;
  return {
    title: amount ? `${amount} ${description}` : description,
    body: `Tap to review and save · ${accountName ?? "Funds"}`,
    url: `${origin}/dashboard?draftId=${encodeURIComponent(draftId)}`,
  };
}

export async function notifyDraftPush(
  userId: string,
  copy: { title: string; body: string; url: string },
  fetchImpl: typeof fetch = fetch,
): Promise<void> {
  const publicKey = process.env.VAPID_PUBLIC_KEY ?? "";
  const privateKey = process.env.VAPID_PRIVATE_KEY ?? "";
  if (!publicKey || !privateKey) return;
  const db = getDb();
  const subs = await db
    .select({ endpoint: schema.pushSubscriptions.endpoint, keys: schema.pushSubscriptions.keys })
    .from(schema.pushSubscriptions)
    .where(
      and(
        eq(schema.pushSubscriptions.userId, userId),
        isNull(schema.pushSubscriptions.deletedAt),
      ),
    );
  if (subs.length === 0) return;
  const send = createVapidSender(
    {
      publicKey,
      privateKey,
      subject: process.env.VAPID_SUBJECT ?? "mailto:admin@funds.app",
    },
    fetchImpl,
  );
  const payload = { title: copy.title, body: copy.body, url: copy.url };
  for (const sub of subs) {
    try {
      const res = await send(sub, payload);
      if (res.gone) {
        await db
          .update(schema.pushSubscriptions)
          .set({ deletedAt: new Date() })
          .where(eq(schema.pushSubscriptions.endpoint, sub.endpoint));
      }
    } catch {
      // single-device failure must not block the rest
    }
  }
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

  const now = new Date();
  const normalized = normalizeText(text);

  const pending = await db
    .select()
    .from(schema.voiceDrafts)
    .where(
      and(eq(schema.voiceDrafts.userId, user.id), gt(schema.voiceDrafts.expiresAt, now)),
    )
    .orderBy(asc(schema.voiceDrafts.createdAt));

  const duplicate = pending.find(
    (d) =>
      normalizeText((d.preview as ParsedResult).rawText ?? "") === normalized &&
      now.getTime() - new Date(d.createdAt).getTime() < DEDUPE_WINDOW_MS,
  );
  if (duplicate) {
    return NextResponse.json({
      draftId: duplicate.id,
      preview: duplicate.preview,
      deduped: true,
    });
  }

  if (pending.length >= MAX_PENDING_DRAFTS) {
    const evict = pending.slice(0, pending.length - MAX_PENDING_DRAFTS + 1);
    for (const row of evict) {
      await db.delete(schema.voiceDrafts).where(eq(schema.voiceDrafts.id, row.id));
    }
  }

  const accountId =
    accountRows.find((a) => a.name.trim().toLowerCase() === parsed.account?.trim().toLowerCase())?.id ??
    null;
  const expiresAt = new Date(now.getTime() + DRAFT_TTL_MS);

  const inserted = await db
    .insert(schema.voiceDrafts)
    .values({
      userId: user.id,
      accountId,
      token: randomUUID(),
      preview: parsed,
      source: "webhook",
      createdAt: now,
      expiresAt,
    })
    .returning({ id: schema.voiceDrafts.id });
  const draftId = inserted[0]?.id;
  if (!draftId) {
    return NextResponse.json({ error: "Failed to save draft" }, { status: 500 });
  }

  const accountName = accountRows.find((a) => a.id === accountId)?.name ?? parsed.account ?? null;
  const origin = new URL(request.url).origin;
  // cavetail: push is best-effort — a push outage must never fail the intake.
  void notifyDraftPush(user.id, draftPushCopy(parsed, accountName, draftId, origin)).catch(() => {});

  return NextResponse.json({ draftId, preview: parsed, deduped: false });
}
