const CACHE = "gemgo-shell-v6";
const SHELL = [
  "/",
  "/app/explore",
  "/app/my-trip",
  "/app/gempoints",
  "/app/notifications",
  "/manifest.webmanifest",
  "/assets/gemgo-logo.png",
  "/assets/team/mattia-centonze.png",
  "/assets/team/killian-foloppe.png",
  "/assets/team/martino-dalla-fontana.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE).then((cache) => cache.put(event.request, copy));
          }
          return response;
        })
        .catch(() =>
          caches.match(event.request).then((cached) => cached || caches.match("/")),
        ),
    );
    return;
  }
  event.respondWith(
    caches.match(event.request).then(
      (cached) =>
        cached ||
        fetch(event.request).then((response) => {
          if (
            response.ok &&
            ["script", "style", "image", "font"].includes(
              event.request.destination,
            )
          ) {
            const copy = response.clone();
            caches.open(CACHE).then((cache) => cache.put(event.request, copy));
          }
          return response;
        }),
    ),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const href = event.notification.data?.href || "/app/notifications";
  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((windows) => {
        const existing = windows.find((client) => new URL(client.url).origin === self.location.origin);
        if (existing) {
          return existing.navigate(href).then((client) => client?.focus());
        }
        return clients.openWindow(href);
      }),
  );
});

self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data?.json() || {};
  } catch {
    payload = { body: event.data?.text() || "" };
  }
  event.waitUntil(
    self.registration.showNotification(payload.title || "GemGo", {
      body: payload.body || "You have a new GemGo update.",
      icon: "/favicon.svg",
      badge: "/favicon.svg",
      tag: payload.tag || "gemgo-update",
      data: { href: payload.href || "/app/notifications" },
    }),
  );
});
