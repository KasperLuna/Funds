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
  
  // Sign the JWT with the SAME secret PowerSync validates against
  // (POWER_SYNC_JWT_SECRET_B64URL, base64url-encoded). This must match
  // infra/powersync.yaml's client_auth.jwks key, otherwise PowerSync rejects
  // the token and nothing syncs down.
  const b64url = process.env.POWER_SYNC_JWT_SECRET_B64URL;
  const rawSecret = b64url
    ? Buffer.from(b64url, "base64url").toString("utf8")
    : (process.env.JWT_SECRET ??
      process.env.BETTER_AUTH_SECRET ??
      // cavetail: dev-only default. Must equal the secret the PowerSync service
      // validates with (infra/docker-compose PS_JWT_SECRET_B64URL); the running
      // dev service uses "test-secret-key-for-dev-only", otherwise its JWKS
      // rejects our HS256 tokens (PSYNC_S2101) and sync stays in local mode.
      "test-secret-key-for-dev-only");
  
  const secretKey = new TextEncoder().encode(rawSecret);
  
  // Sign JWT with HS256. `kid` must match infra/powersync.yaml's jwks key id and
  // `aud` must match client_auth.audience (configured as ["powersync"]), or the
  // service rejects the token.
  const now = Math.floor(Date.now() / 1000);
  const token = await new SignJWT({
    user_id: session.user.id,
  })
    .setProtectedHeader({ alg: "HS256", kid: "funds-hs256" })
    .setSubject(session.user.id)
    .setAudience("powersync")
    .setIssuedAt(now)
    .setExpirationTime(now + 3600) // 1 hour
    .sign(secretKey);
  
  // PowerSync endpoint from env or dev default. Must be an HTTP(S) URL — the
  // SDK appends /sync/stream to it (AbstractRemote). A ws:// scheme breaks the
  // sync connection.
  const endpoint =
    process.env.POWER_SYNC_URL ??
    `http://localhost:8080`;

  return NextResponse.json({
    token,
    endpoint,
  });
}
