const CACHE = "gemgo-shell-v4";
const SHELL = [
  "/",
  "/app",
  "/about",
  "/privacy",
  "/saved",
  "/gemdrop",
  "/points",
  "/gemdeals",
  "/notifications",
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
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const copy = response.clone();
        caches.open(CACHE).then((cache) => cache.put(event.request, copy));
        return response;
      })
      .catch(() => caches.match(event.request).then((cached) => cached || caches.match("/app"))),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(clients.openWindow("/notifications"));
});
