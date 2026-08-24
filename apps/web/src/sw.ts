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

self.addEventListener("fetch", (event) => {
  const e = event as unknown as {
    request: Request;
    respondWith(r: Response | Promise<Response>): void;
  };
  if (e.request.method !== "GET") return;
  if (e.request.url.includes("/api/")) return;

  e.respondWith(
    (caches.match(e.request) as Promise<Response | undefined>).then((cached): Response | Promise<Response> => {
      return cached ?? fetch(e.request).then((response) => {
        if (response.ok && e.request.url.startsWith(self.location.origin)) {
          const clone = response.clone();
          caches.open("runtime").then((cache) => cache.put(e.request, clone));
        }
        return response;
      }).catch((): Response => {
        if (e.request.mode === "navigate") {
          return new Response(null, { status: 302, headers: { Location: "/dashboard" } });
        }
        return new Response("Offline", { status: 503 });
      });
    }),
  );
});
