/**
 * Pending Shortcut/voice drafts for the session user, newest first.
 * Drafts are ephemeral inbox rows (3-day TTL), not synced entities.
 */
import { NextRequest, NextResponse } from "next/server";
import { and, desc, eq, gt } from "drizzle-orm";
import { auth } from "@/server/auth";
import { getDb } from "@/server/db";
import * as schema from "@funds/db/schema";

export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getDb();
  const now = new Date();
  const rows = await db
    .select({
      id: schema.voiceDrafts.id,
      accountId: schema.voiceDrafts.accountId,
      preview: schema.voiceDrafts.preview,
      source: schema.voiceDrafts.source,
      createdAt: schema.voiceDrafts.createdAt,
      expiresAt: schema.voiceDrafts.expiresAt,
    })
    .from(schema.voiceDrafts)
    .where(
      and(
        eq(schema.voiceDrafts.userId, session.user.id),
        gt(schema.voiceDrafts.expiresAt, now),
      ),
    )
    .orderBy(desc(schema.voiceDrafts.createdAt));

  return NextResponse.json({ drafts: rows });
}
