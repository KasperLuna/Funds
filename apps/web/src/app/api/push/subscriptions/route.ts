/**
 * Subscription renewal: the service worker re-subscribes after a
 * pushsubscriptionchange rotation and lands here (session cookie auth) so
 * pushes never silently die on key rotation. Endpoint-unique: prior rows for
 * the endpoint are tombstoned before the fresh row lands.
 */
import { NextRequest, NextResponse } from "next/server";
import { and, eq, isNull } from "drizzle-orm";
import { auth } from "@/server/auth";
import { getDb } from "@/server/db";
import * as schema from "@funds/db/schema";
import { newId } from "@funds/db";

function validKeys(keys: unknown): keys is { p256dh: string; auth: string } {
  if (!keys || typeof keys !== "object") return false;
  const k = keys as Record<string, unknown>;
  return typeof k.p256dh === "string" && typeof k.auth === "string";
}

async function sessionUserId(request: NextRequest): Promise<string | null> {
  const session = await auth.api.getSession({ headers: request.headers });
  return session?.user?.id ?? null;
}

/**
 * Device truth check: is this exact endpoint live on the server for the
 * session user? Powers the Settings states so the UI reflects the device,
 * not just Notification.permission.
 */
export async function GET(request: NextRequest) {
  const userId = await sessionUserId(request);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const endpoint = new URL(request.url).searchParams.get("endpoint") ?? "";
  if (!endpoint.startsWith("https://")) {
    return NextResponse.json({ error: "endpoint is required" }, { status: 400 });
  }
  const db = getDb();
  const rows = await db
    .select({ id: schema.pushSubscriptions.id })
    .from(schema.pushSubscriptions)
    .where(
      and(
        eq(schema.pushSubscriptions.userId, userId),
        eq(schema.pushSubscriptions.endpoint, endpoint),
        isNull(schema.pushSubscriptions.deletedAt),
      ),
    )
    .limit(1);
  return NextResponse.json({ live: rows.length > 0 });
}

/**
 * Immediate server tombstone for Disables (the outbox path is eventual and
 * would leave phantom pushes). Scoped to the session user.
 */
export async function DELETE(request: NextRequest) {
  const userId = await sessionUserId(request);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = (await request.json().catch(() => null)) as {
    endpoint?: unknown;
  } | null;
  if (typeof body?.endpoint !== "string" || !body.endpoint.startsWith("https://")) {
    return NextResponse.json({ error: "endpoint is required" }, { status: 400 });
  }
  const db = getDb();
  await db
    .update(schema.pushSubscriptions)
    .set({ deletedAt: new Date() })
    .where(
      and(
        eq(schema.pushSubscriptions.userId, userId),
        eq(schema.pushSubscriptions.endpoint, body.endpoint),
        isNull(schema.pushSubscriptions.deletedAt),
      ),
    );
  return NextResponse.json({ ok: true });
}

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as {
    endpoint?: unknown;
    keys?: unknown;
  } | null;
  if (
    typeof body?.endpoint !== "string" ||
    !body.endpoint.startsWith("https://") ||
    !validKeys(body.keys)
  ) {
    return NextResponse.json({ error: "endpoint and keys are required" }, { status: 400 });
  }

  const db = getDb();
  const now = new Date();
  await db
    .update(schema.pushSubscriptions)
    .set({ deletedAt: now })
    .where(
      and(
        eq(schema.pushSubscriptions.endpoint, body.endpoint),
        isNull(schema.pushSubscriptions.deletedAt),
      ),
    );
  await db.insert(schema.pushSubscriptions).values({
    id: newId(),
    userId: session.user.id,
    endpoint: body.endpoint,
    keys: body.keys,
    createdAt: now,
    updatedAt: now,
  });

  return NextResponse.json({ ok: true });
}
