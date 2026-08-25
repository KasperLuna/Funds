/**
 * Delta-pull endpoint for the custom sync.
 * GET ?since=<epoch_ms> returns rows for the session user across all
 * replicated tables, serialized to the snake_case wire shape.
 */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/server/auth";
import { fetchDeltas } from "@/server/sync-data";

function parseSince(raw: string | null): number | null {
  if (raw == null || raw === "") return null;
  const ms = Number(raw);
  if (!Number.isFinite(ms) || ms <= 0) return null;
  return ms;
}

export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const since = parseSince(request.nextUrl.searchParams.get("since"));
  const result = await fetchDeltas(session.user.id, since);

  return NextResponse.json(result);
}
