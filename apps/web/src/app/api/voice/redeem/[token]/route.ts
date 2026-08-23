import { NextResponse } from "next/server";
import { eq, and, gt } from "drizzle-orm";
import { getDb } from "@/server/db";
import * as schema from "@funds/db/schema";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const db = getDb();
  const now = new Date();

  const draft = await db
    .select()
    .from(schema.voiceDrafts)
    .where(
      and(
        eq(schema.voiceDrafts.token, token),
        gt(schema.voiceDrafts.expiresAt, now),
      ),
    )
    .limit(1)
    .then((rows) => rows[0]);

  if (!draft) {
    return NextResponse.json({ error: "Draft not found or expired" }, { status: 404 });
  }

  await db
    .delete(schema.voiceDrafts)
    .where(eq(schema.voiceDrafts.id, draft.id));

  return NextResponse.json({ preview: draft.preview, source: draft.source });
}
