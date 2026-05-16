import { NextRequest, NextResponse } from "next/server";
import PocketBase from "pocketbase";
import { parseTransaction } from "@/lib/voiceParser";
import { createVoiceDraft } from "@/lib/voiceDrafts";

// Module-level admin PocketBase client reused across warm server processes
const adminPb = new PocketBase(process.env.NEXT_PUBLIC_POCKETBASE_URL || "");

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

    // Ensure module-level admin client is authenticated (warm reuse)
    if (!adminPb.authStore.isValid) {
      await adminPb.admins.authWithPassword(
        process.env.POCKETBASE_ADMIN_EMAIL || "",
        process.env.POCKETBASE_ADMIN_PASSWORD || "",
      );
    }

    // Find user by voiceApiKey (faster single-item lookup)
    let userRecord: any;
    try {
      userRecord = await adminPb
        .collection("users")
        .getFirstListItem(`voiceApiKey="${token}"`);
    } catch {
      return NextResponse.json({ error: "Invalid API key" }, { status: 401 });
    }

    const userId = userRecord.id;

    // Parse JSON body (only expects { text: string })
    const body = await req.json();
    const text: string = body.text || "";
    if (!text || typeof text !== "string") {
      return NextResponse.json({ error: "Missing text" }, { status: 400 });
    }

    // Fetch user's accounts and categories in parallel; limit page size
    const [banksResp, categoriesResp] = await Promise.all([
      adminPb.collection("banks").getList(1, 100, {
        filter: `user="${userId}"`,
        fields: "name",
      }),
      adminPb.collection("categories").getList(1, 100, {
        filter: `user="${userId}"`,
        fields: "name",
      }),
    ]);
    const accountNames = banksResp.items
      .map((b: any) => b.name)
      .filter(Boolean);
    const categoryNames = categoriesResp.items
      .map((c: any) => c.name)
      .filter(Boolean);

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

    const draftToken = await createVoiceDraft(draft, 300, adminPb); // 5 minutes

    return NextResponse.json({ status: "ok", draftToken, preview: result });
  } catch (err) {
    console.error("/api/voice-parse error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
