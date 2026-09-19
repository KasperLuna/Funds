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
