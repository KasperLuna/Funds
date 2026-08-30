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
  // Drop outdated precache revisions. The `runtime` cache is kept so a hot
  // nav to a previously-rendered shell paints instantly while the network
  // revalidates in the background (the fetch handler below).
  (event as unknown as { waitUntil(p: Promise<unknown>): void }).waitUntil(
    (async () => {
      await (self as unknown as { clients: { claim(): Promise<unknown> } }).clients.claim();
    })(),
  );
});

// Same-origin assets are served cache-first with a background revalidation,
// and navigations use stale-while-revalidate against the `runtime` cache so
// taps to previously-rendered routes paint instantly. A previous cache-first
// (no revalidate) handler pinned clients on stale bundles — the SWR pattern
// keeps the precache authoritative while letting the runtime cache hot-path
// repeated navigations. (#418 hydration hazard documented for posterity.)
self.addEventListener("fetch", (event) => {
  const e = event as unknown as {
    request: Request;
    respondWith(r: Response | Promise<Response>): void;
  };
  if (e.request.method !== "GET") return;
  if (e.request.url.includes("/api/")) return;

  const isNavigate = e.request.mode === "navigate";
  const sameOrigin = e.request.url.startsWith(self.location.origin);

  // Navigations: stale-while-revalidate. Serve the cached shell immediately
  // (so a tap on a previously-rendered route paints instantly), then refresh
  // in the background so the next load is current. New routes with no cached
  // copy fall through to the network with a runtime-cache write-through.
  if (isNavigate) {
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
        if (cached) {
          // Don't await — revalidate in the background.
          void network;
          return cached;
        }
        return (
          (await network) ??
          new Response(null, { status: 302, headers: { Location: "/dashboard" } })
        );
      })(),
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

// Web Push display (reminders). The worker POSTs an aes128gcm body that the
// browser decrypts and delivers here as a `push` event carrying the payload
// JSON ({ title, body, url }). Without this handler no notification shows.
self.addEventListener("push", (event) => {
  const e = event as unknown as { data?: { json(): unknown }; waitUntil(p: Promise<unknown>): void };
  let data: { title?: string; body?: string; url?: string } = {};
  try {
    const parsed = e.data?.json();
    if (parsed && typeof parsed === "object") data = parsed as typeof data;
  } catch {
    // malformed payload; fall back to a generic title
  }
  const title = data.title ?? "Funds";
  const options: NotificationOptions = {
    body: data.body ?? "",
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
    data: { url: data.url ?? "/dashboard" },
  };
  e.waitUntil((self as unknown as { registration: ServiceWorkerRegistration }).registration.showNotification(title, options));
});

// Tapping the reminder opens the app at the deep-linked scheduled entry.
self.addEventListener("notificationclick", (event) => {
  const e = event as unknown as {
    notification: Notification & { data?: { url?: string } };
    waitUntil(p: Promise<unknown>): void;
  };
  const url = e.notification.data?.url ?? "/dashboard";
  e.notification.close();
  e.waitUntil(
    (self as unknown as { clients: { openWindow(u: string): Promise<unknown> } }).clients
      .openWindow(url)
      .catch(() => {}),
  );
});
});
