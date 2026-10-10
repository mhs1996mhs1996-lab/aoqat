const CACHE_NAME = "aoqat-pwa-v38";
const APP_SHELL = [
  "/js/web-back-navigation.js",
  "/data/prayer-times-offline.js",
  "/assets/mushaf-phone-hafs-ready.json", "/assets/mushaf-phone-hafs.json.gz", "/assets/mushaf-phone-hafs/001.json.gz", "/assets/mushaf-phone-hafs/604.json.gz",
  "/assets/mushaf-hafs-pocket-ready.json", "/assets/mushaf-hafs-pocket.json.gz", "/assets/mushaf-hafs-pocket/001.webp", "/assets/mushaf-hafs-pocket/604.webp", "/assets/mushaf-hafs-1441-ready.json", "/assets/mushaf-hafs-1441.json.gz", "/assets/mushaf-hafs-1441/001.webp", "/assets/mushaf-hafs-1441/604.webp", "/css/quran-reader.css?v=phone-hafs-1",
  "/assets/qcf-preview/data.json", "/assets/qcf-preview/p498.woff2", "/assets/qcf-preview/p499.woff2",
  "/js/settings-subwindows.js", "/js/prayer-alarm-core.js", "/js/prayer-alarm.js", "/css/prayer-alarm.css",
  "/",
  "/index.html",
  "/css/style.css",
  "/css/adhan.css?v=2",
  "/css/adhan-modal.css?v=1",
  "/js/adhan-core.js?v=3",
  "/js/adhan-settings.js?v=4",
  "/js/azkar.js?v=1",
  "/assets/quran.json",
  "/assets/audio/adhan-v124-1.mp3",
  "/assets/audio/adhan-v124-1-short.mp3",
  "/assets/audio/adhan-v124-2.mp3",
  "/assets/audio/adhan-v124-2-short.mp3",
  "/assets/audio/adhan-v124-3.mp3",
  "/assets/audio/adhan-v124-3-short.mp3",
  "/assets/audio/adhan-v124-4.mp3",
  "/assets/audio/adhan-v124-4-short.mp3",
  "/js/script.js",
  "/js/supabase-db.js",
  "/js/startup-stabilizer.js",
  "/js/second-design.js",
  "/js/additional-designs.js",
  "/js/night-design.js",
  "/js/modal-panels.js",
  "/js/tomorrow-alarm.js",
  "/js/push-notifications.js",
  "/data/prayer-times.js",
  "/manifest.webmanifest",
  "/assets/icons/app-icon.svg",
  "/data/prayer-times.js?v=5",
  "/js/script.js?v=4",
  "/js/export-toolbar.js?v=2",
  "/js/exact-export.js?v=2",
  "/js/modal-panels.js?v=9",
  "/js/tomorrow-alarm.js?v=9",
  "/js/push-notifications.js?v=9",
  "/js/quran-reader.js",
  "/js/iqama-timing.js?v=1",
  "/js/prayer-countdown.js?v=15",
  "/js/compact-design-menu.js?v=12",
  "/js/web-theme-settings.js?v=4",
  "/js/web-menu-order.js?v=24",
  "/css/quran-reader.css",
  "/assets/quran-pages.json",
  "/assets/fonts/uthmanic-hafs.woff2"
];

const PUSH_ACTION_URL="https://ytdvhiijxxaqofduorwm.supabase.co/functions/v1/push-action";

self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME && key !== "aoqat-mushaf-hafs1441" && key !== "aoqat-mushaf-hafs-pocket" && key !== "aoqat-mushaf-phone-hafs").map(key => caches.delete(key))))
  );
  self.clients.claim();
});

self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if (url.pathname === "/rest/v1/annual_prayer_times") return;
  if (url.origin === self.location.origin && (APP_SHELL.includes(url.pathname + url.search) || /^\/(js|css|data)\//.test(url.pathname))) {
    event.respondWith(caches.open(CACHE_NAME).then(async cache => {
      const cached = await cache.match(event.request);
      if (cached) return cached;
      const response = await fetch(event.request);
      if (response.ok) await cache.put(event.request, response.clone());
      return response;
    }));
    return;
  }
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

self.addEventListener("push", event => {
  let payload={};
  try{payload=event.data?.json()||{};}catch(_){payload={body:event.data?.text()||"تم تبديل التوقيت إلى اليوم التالي. انشر المواقيت."};}
  const title=payload.title||"⏰ مواقيت الغد جاهزة";
  const options={
    body:payload.body||"تم تبديل التوقيت إلى اليوم التالي. انشر المواقيت.",
    icon:"/assets/icons/app-icon.svg",
    badge:"/assets/icons/app-icon.svg",
    tag:payload.tag||"prayer-tomorrow-publish-alarm",
    renotify:true,
    requireInteraction:true,
    vibrate:[700,300,700,300,900],
    data:payload.data||{kind:"tomorrow-publish-alarm",url:"/"},
    actions:payload.actions||[
      {action:"snooze",title:"غفوة 10 دقائق"},
      {action:"stop",title:"إيقاف التنبيه"}
    ]
  };
  event.waitUntil(self.registration.showNotification(title,options));
});

async function sendPushAction(action){
  try{
    const sub=await self.registration.pushManager.getSubscription();
    if(!sub)return;
    await fetch(PUSH_ACTION_URL,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({endpoint:sub.endpoint,action})});
  }catch(_){ }
}

self.addEventListener("notificationclick", event => {
  const notification = event.notification;
  const data = notification?.data || {};
  notification?.close();

  if (data.kind !== "tomorrow-publish-alarm") return;

  if (event.action === "stop") {
    event.waitUntil(Promise.all([
      sendPushAction("stop"),
      self.clients.matchAll({type:"window",includeUncontrolled:true}).then(clients => {
        clients.forEach(client => client.postMessage({type:"PRAYER_ALARM_STOP"}));
      })
    ]));
    return;
  }

  if (event.action === "snooze") {
    event.waitUntil(sendPushAction("snooze"));
    return;
  }

  event.waitUntil(
    self.clients.matchAll({type:"window",includeUncontrolled:true}).then(clients => {
      const client=clients.find(item=>"focus" in item);
      if (client?.focus) return client.focus();
      if (self.clients.openWindow) return self.clients.openWindow(data.url || "/");
    })
  );
});

