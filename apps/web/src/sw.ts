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
  // Drop outdated precache versions AND the ad-hoc `runtime`/navigation caches
  // the old cache-first handler left behind. On activate, no stale chunk or
  // shell may survive — otherwise a device mid-transition keeps serving the
  // pre-fix bundle (dead buttons + hydration #418). The network-first fetch
  // handler below then rebuilds caches from the current build only.
  (event as unknown as { waitUntil(p: Promise<unknown>): void }).waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((k) => k === "runtime" || k === "navigation")
          .map((k) => caches.delete(k).catch(() => {})),
      );
      await (self as unknown as { clients: { claim(): Promise<unknown> } }).clients.claim();
    })(),
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
