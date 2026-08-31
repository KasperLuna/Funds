import { NextResponse, type NextRequest } from "next/server";

// cavetail: the WASM fallback path of WebLLM needs SharedArrayBuffer, which
// requires cross-origin isolation. The iOS fast path is WebGPU
// (capability.ts:detectSupport), which needs neither COOP nor COEP — so skip
// the headers on iOS to avoid paying the browser-isolation setup cost on
// every /dashboard navigation (cold PWA launch TTI). Desktop still gets COI
// for the WASM fallback.
function isIos(request: NextRequest): boolean {
  const ua = request.headers.get("user-agent") ?? "";
  // Matches capability.ts:isIosLikeDevice — iPhone/iPad/iPod explicit, and
  // iPadOS which reports a Mac UA but is mobile (Sec-CH-UA-Mobile: ?1).
  if (/iPhone|iPad|iPod/i.test(ua)) return true;
  return /Mac/i.test(ua) && request.headers.get("sec-ch-ua-mobile") === "?1";
}

/**
 * Enable cross-origin isolation on routes that need SharedArrayBuffer
 * (required by WebLLM's WASM inference path). Scoped to /dashboard.
 */
export function middleware(request: NextRequest) {
  const response = NextResponse.next();
  if (isIos(request)) return response;
  response.headers.set("Cross-Origin-Opener-Policy", "same-origin");
  response.headers.set("Cross-Origin-Embedder-Policy", "credentialless");
  return response;
}

export const config = {
  matcher: "/dashboard/:path*",
};
