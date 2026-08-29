import { NextResponse } from "next/server";

/**
 * Enable cross-origin isolation on routes that need SharedArrayBuffer
 * (required by WebLLM for on-device inference). Scoped to /dashboard
 * so the rest of the app is unaffected.
 */
export function middleware() {
  const response = NextResponse.next();
  response.headers.set("Cross-Origin-Opener-Policy", "same-origin");
  response.headers.set("Cross-Origin-Embedder-Policy", "credentialless");
  return response;
}

export const config = {
  matcher: "/dashboard/:path*",
};
