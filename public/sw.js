const CACHE_NAME = "funds-v1";
const MODEL_CACHE_NAME = "funds-models-v1";

// Cache model files on fetch for offline support
self.addEventListener("fetch", function (event) {
  const url = new URL(event.request.url);

  // Cache model files from HuggingFace (WebLLM models)
  if (
    url.hostname === "huggingface.co" &&
    (url.pathname.includes(".wasm") ||
      url.pathname.includes(".safetensors") ||
      url.pathname.endsWith(".json"))
  ) {
    event.respondWith(
      caches.open(MODEL_CACHE_NAME).then(function (cache) {
        return fetch(event.request)
          .then(function (response) {
            // Cache successful responses
            if (response.status === 200) {
              cache.put(event.request, response.clone());
            }
            return response;
          })
          .catch(function () {
            // Return cached version if offline
            return cache.match(event.request);
          });
      }),
    );
  }
});

self.addEventListener("push", function (event) {
  if (event.data) {
    const data = event.data.json();
    const options = {
      body: data.body,
      icon: data.icon || "/icon.png",
      badge: "/badge.png",
      vibrate: [100, 50, 100],
      data: {
        dateOfArrival: Date.now(),
        primaryKey: "2",
        url: data.url || undefined, // Pass url from push payload if present
      },
    };
    event.waitUntil(self.registration.showNotification(data.title, options));
  }
});

self.addEventListener("notificationclick", function (event) {
  event.notification.close();
  const url =
    event.notification.data && event.notification.data.url
      ? event.notification.data.url
      : "/dashboard";
  event.waitUntil(clients.openWindow(url));
});
