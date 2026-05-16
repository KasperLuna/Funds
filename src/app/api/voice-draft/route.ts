import { NextRequest, NextResponse } from "next/server";
import PocketBase from "pocketbase";
import { getVoiceDraft } from "@/lib/voiceDrafts";

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const token = url.searchParams.get("token");
    if (!token)
      return NextResponse.json({ error: "Missing token" }, { status: 400 });

    const pb = new PocketBase(process.env.NEXT_PUBLIC_POCKETBASE_URL || "");
    await pb.admins.authWithPassword(
      process.env.POCKETBASE_ADMIN_EMAIL || "",
      process.env.POCKETBASE_ADMIN_PASSWORD || "",
    );

    const draft = await getVoiceDraft(token, pb);
    if (!draft)
      return NextResponse.json(
        { error: "Not found or expired" },
        { status: 404 },
      );

    return NextResponse.json({ status: "ok", draft });
  } catch (err) {
    console.error("/api/voice-draft error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
