import { NextResponse } from "next/server";
import { handleDemoSignIn } from "@/server/auth";

// cavetail: minimal in-memory rate limit (10 req/min/IP) for the guest demo endpoint
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 10;
const hits = new Map<string, number[]>();

function limited(ip: string | null): boolean {
  const key = ip ?? "unknown";
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < WINDOW_MS);
  if (recent.length >= MAX_PER_WINDOW) {
    hits.set(key, recent);
    return true;
  }
  recent.push(now);
  hits.set(key, recent);
  return false;
}

export async function GET(request: Request) {
  const ip = request.headers.get("x-forwarded-for") ?? request.headers.get("x-real-ip");
  if (limited(ip)) {
    return NextResponse.json({ error: "Too many demo sign-ins. Try again shortly." }, { status: 429 });
  }

  const result = await handleDemoSignIn();

  if (!result.success) {
    return NextResponse.json(
      { error: result.error ?? "Failed to sign in demo user" },
      { status: 400 }
    );
  }

  // Create response with session cookies
  const response = NextResponse.json({
    success: true,
    userId: result.userId,
  });

  // Set cookie header from auth result
  if (result.setCookie) {
    response.headers.set("set-cookie", result.setCookie);
  }

  return response;
}
