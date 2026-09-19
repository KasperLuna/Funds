/**
 * Public origin of the app for absolute URLs baked into push payloads.
 * `request.url` inside a route handler is the INTERNAL origin (the container
 * hostname behind the proxy — e.g. http://219183cd69:3000), which once
 * stranded notification taps on a blank page. Prefer the configured public
 * origin, then the forwarded host the client actually used.
 */
import type { NextRequest } from "next/server";

type RequestLike = Pick<NextRequest, "url" | "headers">;

export function resolveAppOrigin(request: RequestLike): string {
  const env = process.env.PUBLIC_APP_URL?.trim();
  if (env) return env.replace(/\/+$/, "");
  const proto = request.headers.get("x-forwarded-proto") ?? "https";
  const host =
    request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  if (host) return `${proto}://${host}`;
  return new URL(request.url).origin;
}
