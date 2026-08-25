// serwist 9 main entry dropped precacheAndRoute; legacy keeps the classic API.
import { precacheAndRoute } from "serwist/legacy";

// @ts-expect-error -- injected by @serwist/webpack-plugin
const manifest: (string | { url: string; revision?: string })[] = self.__SW_MANIFEST;
if (manifest) {
  precacheAndRoute(manifest);
}

self.addEventListener("install", () => {
  (self as unknown as { skipWaiting(): void }).skipWaiting();
});

self.addEventListener("activate", (event) => {
  (event as unknown as { waitUntil(p: Promise<unknown>): void }).waitUntil(
    (self as unknown as { clients: { claim(): Promise<unknown> } }).clients.claim(),
  );
});

// Cache-first with no revalidation (the previous handler) pinned clients to
// stale bundles forever: the runtime cache outranked the revisioned precache,
// so a deploy never reached open clients — stale code kept crashing and stale
// HTML hydrated against newer chunks (#418). Navigation is network-first so a
// fresh shell (and its chunk URLs) always wins; same-origin assets are
// stale-while-revalidate so the runtime cache refreshes in the background
// instead of serving the first-seen copy indefinitely.
self.addEventListener("fetch", (event) => {
  const e = event as unknown as {
    request: Request;
    respondWith(r: Response | Promise<Response>): void;
  };
  if (e.request.method !== "GET") return;
  if (e.request.url.includes("/api/")) return;

  const isNavigate = e.request.mode === "navigate";
  const sameOrigin = e.request.url.startsWith(self.location.origin);

  // Navigations: network-first, fall back to cache (offline / slow link).
  if (isNavigate) {
    e.respondWith(
      fetch(e.request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open("runtime").then((cache) => cache.put(e.request, clone));
          }
          return response;
        })
        .catch(async (): Promise<Response> => {
          const cached = await caches.match(e.request);
          if (cached) return cached;
          return new Response(null, { status: 302, headers: { Location: "/dashboard" } });
        }),
    );
    return;
  }

  // Same-origin assets: serve cached copy immediately, refresh in background so
  // the next request (and the next load) gets the current build's chunks.
  if (sameOrigin) {
    e.respondWith(
      (async (): Promise<Response> => {
        const cached = await caches.match(e.request);
        const network = fetch(e.request)
          .then((response) => {
            if (response.ok) {
              const clone = response.clone();
              caches.open("runtime").then((cache) => cache.put(e.request, clone));
            }
            return response;
          })
          .catch((): Response | null => null);
        if (cached) return cached;
        return (await network) ?? new Response("Offline", { status: 503 });
      })(),
    );
  }
});
