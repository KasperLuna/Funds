/**
 * Discard (or consume-after-save) a single draft. Scoped to the session user.
 */
import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { auth } from "@/server/auth";
import { getDb } from "@/server/db";
import * as schema from "@funds/db/schema";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth.api.getSession({ headers: request.headers });

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const db = getDb();
  const deleted = await db
    .delete(schema.voiceDrafts)
    .where(
      and(eq(schema.voiceDrafts.id, id), eq(schema.voiceDrafts.userId, session.user.id)),
    )
    .returning({ id: schema.voiceDrafts.id });

  if (deleted.length === 0) {
    return NextResponse.json({ error: "Draft not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
