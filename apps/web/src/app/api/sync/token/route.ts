/**
 * PowerSync JWT token endpoint
 * Returns HS256-signed JWT for PowerSync authentication
 */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/server/auth";
import { SignJWT } from "jose";

export async function GET(request: NextRequest) {
  // Require authenticated session
  const session = await auth.api.getSession({ headers: request.headers });
  
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  
  // Get JWT secret (fallback chain for dev)
  const secret =
    process.env.JWT_SECRET ??
    process.env.BETTER_AUTH_SECRET ??
    "dev-jwt-secret-change-me-in-production";
  
  const secretKey = new TextEncoder().encode(secret);
  
  // Sign JWT with HS256
  const now = Math.floor(Date.now() / 1000);
  const token = await new SignJWT({
    user_id: session.user.id,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(session.user.id)
    .setIssuedAt(now)
    .setExpirationTime(now + 3600) // 1 hour
    .sign(secretKey);
  
  // PowerSync endpoint from env or dev default
  const endpoint = process.env.POWER_SYNC_URL ?? "ws://localhost:8080";
  
  return NextResponse.json({
    token,
    endpoint,
  });
}
