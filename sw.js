const CACHE_NAME = "aoqat-pwa-v6";
const APP_SHELL = [
  "/",
  "/index.html",
  "/css/style.css",
  "/js/script.js",
  "/js/supabase-db.js",
  "/js/second-design.js",
  "/js/additional-designs.js",
  "/js/night-design.js",
  "/js/modal-panels.js",
  "/js/tomorrow-alarm.js",
  "/data/prayer-times.js",
  "/manifest.webmanifest",
  "/assets/icons/app-icon.svg"
];

self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))))
  );
  self.clients.claim();
});

self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;
  event.respondWith(
    fetch(event.request)
      .then(response => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
        return response;
      })
      .catch(() => caches.match(event.request).then(cached => cached || caches.match("/index.html")))
  );
});

self.addEventListener("notificationclick", event => {
  const notification = event.notification;
  const data = notification?.data || {};
  notification?.close();

  if (data.kind !== "tomorrow-publish-alarm") return;

  if (event.action === "stop") {
    event.waitUntil(
      self.clients.matchAll({type:"window",includeUncontrolled:true}).then(clients => {
        clients.forEach(client => client.postMessage({type:"PRAYER_ALARM_STOP"}));
      })
    );
    return;
  }

  if (event.action === "snooze") {
    event.waitUntil(
      self.clients.matchAll({type:"window",includeUncontrolled:true}).then(async clients => {
        const client = clients[0];
        if (client) {
          client.postMessage({type:"PRAYER_ALARM_SNOOZE"});
          if (client.focus) await client.focus();
          return;
        }
        if (self.clients.openWindow) await self.clients.openWindow("/?alarm=snooze");
      })
    );
    return;
  }

  event.waitUntil(
    self.clients.matchAll({type:"window",includeUncontrolled:true}).then(async clients => {
      const client = clients[0];
      if (client?.focus) return client.focus();
      if (self.clients.openWindow) return self.clients.openWindow(data.url || "/");
    })
  );
});
