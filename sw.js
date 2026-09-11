const CACHE_NAME = "aoqat-pwa-v7";
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
  "/js/push-notifications.js",
  "/data/prayer-times.js",
  "/manifest.webmanifest",
  "/assets/icons/app-icon.svg"
];

const PUSH_ACTION_URL="https://ytdvhiijxxaqofduorwm.supabase.co/functions/v1/push-action";

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
    event.waitUntil(Promise.all([
      sendPushAction("snooze"),
      self.clients.matchAll({type:"window",includeUncontrolled:true}).then(clients => {
        clients.forEach(client => client.postMessage({type:"PRAYER_ALARM_SNOOZE"}));
      })
    ]));
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
