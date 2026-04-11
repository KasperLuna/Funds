const CACHE_NAME = "funds-cache-v1";
const CRITICAL_ASSETS = ["/", "/dashboard", "/offline.html"];

// Install: pre-cache critical assets
self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(CRITICAL_ASSETS)));
  self.skipWaiting();
});

// Activate: clean up old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))),
      ),
  );
  self.clients.claim();
});

// Fetch: cache-first for cached assets, network-first for API calls
self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Skip non-GET requests
  if (request.method !== "GET") return;

  // Network-first for API calls
  if (request.url.includes("/api/")) {
    event.respondWith(fetch(request).catch(() => caches.match(request)));
    return;
  }

  // Cache-first for navigation and cached assets
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;

      return fetch(request).catch(() => {
        // Serve offline page for navigation requests that fail
        if (request.mode === "navigate") {
          return caches.match("/offline.html");
        }
        return new Response("Offline", { status: 503 });
      });
    }),
  );
});
