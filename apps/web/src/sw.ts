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
  // Drop outdated precache revisions (handled by Serwist) plus the legacy
  // `navigation` cache name from an older handler. The `runtime` cache is
  // deliberately KEPT across updates: with the network-first handler below,
  // a stale shell is only ever served when the network fails, i.e. truly
  // offline — where the previous build's HTML + its runtime-cached CSS is
  // the best available and still styled. Wiping `runtime` here would break
  // offline across an update with no online benefit (the next online
  // navigation overwrites the stale entry anyway).
  (event as unknown as { waitUntil(p: Promise<unknown>): void }).waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((k) => k === "navigation")
          .map((k) => caches.delete(k).catch(() => {})),
      );
      await (self as unknown as { clients: { claim(): Promise<unknown> } }).clients.claim();
    })(),
  );
});

// Navigations are network-first so a fresh shell (and its hashed chunk URLs)
// always wins; same-origin assets are stale-while-revalidate so the runtime
// cache refreshes in the background. A previous stale-while-revalidate
// navigation handler served the cached shell instantly — after a deploy that
// shell referenced hashed CSS/JS the server no longer hosts, so a refresh
// painted unstyled HTML (and risked #418 hydration mismatch).
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
