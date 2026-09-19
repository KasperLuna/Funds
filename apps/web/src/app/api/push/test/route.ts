/**
 * Self-test: push a "working" notification to the session user's devices.
 * Lets the user verify enrollment from Settings instead of wondering.
 */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/server/auth";
import { sendPushToUser } from "@/server/push-send";

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { delivered, total } = await sendPushToUser(session.user.id, {
    title: "Funds test notification",
    body: "Push is working on this device.",
    url: "/dashboard",
  });

  return NextResponse.json({ delivered, total });
}
