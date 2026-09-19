// serwist 9 main entry dropped precacheAndRoute; legacy keeps the classic API.
import { precacheAndRoute } from "serwist/legacy";
import { fetchWithTimeout } from "./lib/fetch-timeout";

// cavetail: connected-but-no-route networks hang fetches instead of failing
// them, so a bare fetch here holds the navigation on a white screen until the
// OS TCP timeout (minutes). Bound the wait: a timeout falls into the same
// cache fallback as a fast failure. 8s sits above legit slow-link loads and
// far below a blackhole hang; the next online navigation refreshes the shell.
const NETWORK_TIMEOUT_MS = 8_000;

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
      fetchWithTimeout(e.request, undefined, fetch, NETWORK_TIMEOUT_MS)
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
      const network = fetchWithTimeout(e.request, undefined, fetch, NETWORK_TIMEOUT_MS)
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

// cavetail: push/notificationclick MUST stay top-level. A worker woken by a
// push event runs only top-level code — listeners registered inside the fetch
// handler above never exist in that fresh instance, so the notification is
// silently dropped whenever the worker was idle (the normal phone case).

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

// Tapping a notification focuses the matching dashboard tab, else opens it.
self.addEventListener("notificationclick", (event) => {
  const e = event as unknown as {
    notification: Notification & { data?: { url?: string } };
    waitUntil(p: Promise<unknown>): void;
  };
  const url = e.notification.data?.url ?? "/dashboard";
  e.notification.close();
  e.waitUntil(
    (async () => {
      const w = self as unknown as {
        clients: {
          matchAll(o?: object): Promise<{ url: string; focus(): Promise<unknown> }[]>;
          openWindow(u: string): Promise<unknown>;
        };
      };
      let pathname = "/dashboard";
      try {
        pathname = new URL(url, self.location.origin).pathname;
      } catch {
        // unparseable url; fall through to openWindow
      }
      try {
        const list = await w.clients.matchAll({ type: "window", includeUncontrolled: true });
        const existing = list.find((c) => {
          try {
            return new URL(c.url).pathname === pathname;
          } catch {
            return false;
          }
        });
        if (existing) {
          await existing.focus().catch(() => {});
          return;
        }
      } catch {
        // matchAll unavailable; fall through to openWindow
      }
      await w.clients.openWindow(sameOriginUrl(url)).catch(() => {});
    })(),
  );
});

function sameOriginUrl(url: string): string {
  // A payload baked with a wrong absolute origin (e.g. the container hostname
  // behind the proxy) must never strand the tap on a foreign blank page —
  // keep our path+query, force our origin.
  const target = new URL(url, self.location.origin);
  return target.origin === self.location.origin
    ? target.href
    : self.location.origin + target.pathname + target.search;
}

// Subscription rotation: browsers may invalidate a push subscription at any
// time. Without renewal the server keeps pushing to a dead endpoint (pruned
// only on the next 410) and the device goes quietly dark. Re-subscribe with
// the public VAPID key and persist via the session-authed endpoint.
self.addEventListener("pushsubscriptionchange", (event) => {
  const e = event as unknown as { waitUntil(p: Promise<unknown>): void };
  e.waitUntil(
    (async () => {
      try {
        const w = self as unknown as { registration: ServiceWorkerRegistration };
        const config = (await fetch("/api/push/config").then((r) => r.json())) as {
          vapidPublicKey?: string;
        };
        if (!config.vapidPublicKey) return;
        const sub = await w.registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: config.vapidPublicKey,
        });
        const raw = (name: "p256dh" | "auth") => {
          const buf = sub.getKey(name);
          if (!buf) throw new Error(`missing ${name}`);
          const bytes = new Uint8Array(buf);
          let bin = "";
          for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]!);
          return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
        };
        await fetch("/api/push/subscriptions", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            endpoint: sub.endpoint,
            keys: { p256dh: raw("p256dh"), auth: raw("auth") },
          }),
        }).catch(() => {});
      } catch {
        // best-effort; the stale row is pruned on the next 410
      }
    })(),
  );
});
