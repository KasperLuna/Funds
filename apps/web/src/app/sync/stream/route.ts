import { NextRequest } from "next/server";

/**
 * Proxy /sync/stream to the PowerSync service inside the compose network.
 *
 * Why: the PowerSync SDK POSTs the sync stream to `${endpoint}/sync/stream`
 * where endpoint is the PUBLIC URL (POWER_SYNC_URL). Instead of requiring a
 * Cloudflare tunnel rule for /sync/* -> powersync, the web app terminates the
 * request and proxies it to the internal service, so a single catch-all tunnel
 * entry is enough.
 */
export async function POST(req: NextRequest) {
  const upstream = new URL(
    "/sync/stream",
    process.env.POWER_SYNC_INTERNAL_URL ?? "http://powersync:8080",
  );

  const headers = new Headers(req.headers);
  headers.delete("host");
  headers.delete("connection");
  headers.delete("content-length");

  const res = await fetch(upstream, {
    method: "POST",
    headers,
    body: req.body,
    duplex: "half",
  } as RequestInit);

  return new Response(res.body, {
    status: res.status,
    headers: {
      "content-type": res.headers.get("content-type") ?? "text/event-stream",
    },
  });
}