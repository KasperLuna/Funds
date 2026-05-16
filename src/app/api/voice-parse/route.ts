import { NextRequest, NextResponse } from "next/server";
import PocketBase from "pocketbase";
import { parseTransaction } from "@/lib/voiceParser";
import { createVoiceDraft } from "@/lib/voiceDrafts";

export async function POST(req: NextRequest) {
  try {
    const auth = req.headers.get("authorization") || "";
    if (!auth.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Missing Authorization" },
        { status: 401 },
      );
    }
    const token = auth.split(" ")[1];

    // Authenticate to PocketBase as admin to lookup user by voiceApiKey
    const pb = new PocketBase(process.env.NEXT_PUBLIC_POCKETBASE_URL || "");
    await pb.admins.authWithPassword(
      process.env.POCKETBASE_ADMIN_EMAIL || "",
      process.env.POCKETBASE_ADMIN_PASSWORD || "",
    );

    // Find user by voiceApiKey
    const usersResp = await pb.collection("users").getList(1, 1, {
      filter: `voiceApiKey="${token}"`,
    });
    const userRecord = usersResp.items?.[0];
    if (!userRecord) {
      return NextResponse.json({ error: "Invalid API key" }, { status: 401 });
    }

    const userId = userRecord.id;

    // Parse JSON body (only expects { text: string })
    const body = await req.json();
    const text: string = body.text || "";
    if (!text || typeof text !== "string") {
      return NextResponse.json({ error: "Missing text" }, { status: 400 });
    }

    // Fetch user's accounts and categories from PocketBase for better parsing
    const banks = await pb
      .collection("banks")
      .getFullList({ filter: `user="${userId}"` });
    const categories = await pb
      .collection("categories")
      .getFullList({ filter: `user="${userId}"` });
    const accountNames = banks.map((b: any) => b.name).filter(Boolean);
    const categoryNames = categories.map((c: any) => c.name).filter(Boolean);

    const result = parseTransaction(text, {
      accounts: accountNames,
      categories: categoryNames,
    });

    const draft = {
      preview: result,
      createdAt: new Date().toISOString(),
      source: "shortcut",
      userId,
    };

    const draftToken = await createVoiceDraft(draft, 300, pb); // 5 minutes

    return NextResponse.json({ status: "ok", draftToken, preview: result });
  } catch (err) {
    console.error("/api/voice-parse error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
