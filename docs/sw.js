/* Minimal service worker for Notifications + basic offline shell caching */
const CACHE_NAME = "vibe-richeng-v2";
const basePath = (() => {
  try {
    const scopePathname = new URL(self.registration.scope).pathname;
    return scopePathname.endsWith("/") ? scopePathname.slice(0, -1) : scopePathname;
  } catch {
    return "";
  }
})();
const withBase = (path) => {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  if (!basePath || basePath === "/") return normalized;
  return `${basePath}${normalized}`;
};
const APP_SHELL = [
  withBase("/"),
  withBase("/index.html"),
  withBase("/manifest.webmanifest"),
  withBase("/icons/icon.svg"),
  withBase("/icons/maskable.svg")
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)));
      await self.clients.claim();
    })()
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    (async () => {
      const cached = await caches.match(request);
      if (cached) {
        event.waitUntil(
          (async () => {
            try {
              const res = await fetch(request);
              if (res && res.ok) {
                const cache = await caches.open(CACHE_NAME);
                await cache.put(request, res.clone());
              }
            } catch {
              // ignore
            }
          })()
        );
        return cached;
      }
      try {
        const res = await fetch(request);
        if (res && res.ok) {
          const cache = await caches.open(CACHE_NAME);
          await cache.put(request, res.clone());
        }
        return res;
      } catch {
        return caches.match(withBase("/"));
      }
    })()
  );
});

self.addEventListener("message", (event) => {
  const data = event.data;
  if (!data || typeof data !== "object") return;

  if (data.type === "SHOW_NOTIFICATION") {
    const title = data.title || "日程提醒";
    const options = data.options || {};
    event.waitUntil(self.registration.showNotification(title, options));
  }
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    (async () => {
      const allClients = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      for (const client of allClients) {
        if ("focus" in client) return client.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow(withBase("/"));
    })()
  );
});
