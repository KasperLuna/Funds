import { NextRequest, NextResponse } from "next/server";
import PocketBase from "pocketbase";

const pb = new PocketBase(process.env.NEXT_PUBLIC_POCKETBASE_URL);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const secret = body.CRON_SECRET;
    if (secret !== process.env.CRON_SECRET) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Authenticate as PocketBase admin
    await pb.admins.authWithPassword(
      process.env.POCKETBASE_ADMIN_EMAIL!,
      process.env.POCKETBASE_ADMIN_PASSWORD!
    );

    const nowIso = new Date().toISOString();
    // Get all expired voice drafts
    const expired = await pb
      .collection("voice_drafts")
      .getFullList({ filter: `expiresAt<="${nowIso}"`, fields: "id" });

    if (expired.length === 0) {
      return NextResponse.json({ deleted: 0 });
    }

    // Delete in parallel
    await Promise.all(expired.map((r: any) => pb.collection("voice_drafts").delete(r.id)));

    return NextResponse.json({ deleted: expired.length });
  } catch (err) {
    console.error("/api/cron-cleanup-voice-drafts error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
