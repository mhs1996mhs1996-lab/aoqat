const CACHE_NAME = "aoqat-pwa-v132-surah-frame";
const APP_SHELL = [
  "/js/monthly-calendars-core.js?v=11",
  "/js/monthly-calendars-renderer.js?v=11",
  "/js/monthly-calendars.js?v=13",
  "/css/monthly-calendars.css?v=12",
  "/js/prayer-alert-methods.js?v=2",
  "/js/web-quiet-core.js?v=1",
  "/js/web-quiet-settings.js?v=1",
  "/js/web-settings-search-calendar.js?v=6",
  "/js/design-side-menu.js?v=2",
  "/js/startup-stabilizer.js?v=1",
  "/js/modal-panels.js?v=4",
  "/js/design-side-menu.js?v=1",
  "/js/tomorrow-alarm.js?v=1",
  "/js/push-notifications.js?v=1",
  "/js/hide-legacy-design.js?v=1",
  "/js/second-design.js?v=5",
  "/js/additional-designs.js?v=6",
  "/js/design-order.js?v=3",
  "/js/night-design.js?v=3",
  "/js/five-new-designs.js?v=6",
  "/js/reference-date-order-fix.js?v=4",
  "/js/footer-placement-guard.js?v=1",
  "/js/manual-edit-toggle.js?v=5",
  "/js/background-tools-organizer.js?v=2",
  "/js/footer-background-organizer.js?v=1",
  "/js/interface-clock.js?v=2",
  "/js/font-controls-core.js?v=3",
  "/js/universal-font-controls.js?v=10",
  "/js/adaptive-design-boxes.js?v=1",
  "/js/font-design-manager.js?v=2",
  "/js/design-history.js?v=2",
  "/js/universal-preview-editor.js?v=2",
  "/js/export-toolbar.js?v=4",
  "/js/compact-design-menu.js?v=1",
  "/js/exact-export.js?v=19",
  "/js/prayer-countdown.js?v=6",
  "/js/prayer-countdown-mobile-fix.js?v=2",
  "/js/prayer-countdown-edit-bridge.js?v=2",
  "/js/carousel-unified-fix.js?v=9",

  "/js/fasting-posts-calendar.js",
  "/js/community-posts-core.js",
  "/js/community-posts-renderer.js",
  "/js/community-posts.js",
  "/assets/fonts/amiri-quran.ttf",
  "/js/fasting-reminders-core.js",
  "/js/fasting-reminders.js",
  "/js/reminder-inbox.js?v=2",
  "/js/muslim-bag.js",
  "/js/notification-settings-layout.js",
  "/js/web-menu-button-theme.js?v=3",
  "/js/azkar-web.js?v=6",
  "/js/azkar-reminders-core.js",
  "/js/azkar-reminders.js",
  "/js/friday-sunnah-data.js",
  "/js/friday-reminders-core.js",
  "/js/friday-reminders.js",
  "/js/prayer-time-choice.js",
  "/js/web-back-navigation.js",
  "/data/prayer-times-offline.js?v=2",
  "/assets/mushaf-phone-hafs-ready.json", "/assets/mushaf-phone-hafs.json.gz", "/assets/mushaf-phone-hafs/001.json.gz", "/assets/mushaf-phone-hafs/604.json.gz",
  "/css/quran-reader.css?v=surah-frame-20261025",
  "/js/settings-subwindows.js", "/js/prayer-alarm-core.js", "/js/prayer-alarm.js", "/css/prayer-alarm.css",
  "/",
  "/index.html",
  "/css/style.css",
  "/css/adhan.css?v=2",
  "/css/adhan-modal.css?v=1",
  "/js/adhan-core.js?v=3",
  "/js/adhan-settings.js?v=6",
  "/js/azkar.js?v=1",
  "/assets/quran.json",
  "/assets/audio/adhan-v124-1.mp3",
  "/assets/audio/adhan-v124-1-short.mp3",
  "/assets/audio/adhan-v124-2.mp3",
  "/assets/audio/adhan-v124-2-short.mp3",
  "/assets/audio/adhan-quba-suraihi.mp3",
  "/assets/audio/adhan-quba-suraihi-short.mp3",
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
  "/js/modal-panels.js?v=10",
  "/js/tomorrow-alarm.js?v=9",
  "/js/push-notifications.js?v=9",
  "/js/quran-reader.js?v=surah-frame-20261025",
  "/js/iqama-timing.js?v=1",
  "/js/prayer-countdown.js?v=17",
  "/js/compact-design-menu.js?v=13",
  "/js/web-theme-settings.js?v=5",
  "/js/web-menu-order.js?v=31",
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
  event.waitUntil((async()=>{
    const keys=await caches.keys();
    const upgraded=keys.some(key=>key.startsWith("aoqat-pwa-")&&key!==CACHE_NAME);
    await Promise.all(keys.filter(key => key !== CACHE_NAME && key !== "aoqat-mushaf-hafs1441" && key !== "aoqat-mushaf-hafs-pocket" && key !== "aoqat-mushaf-phone-hafs").map(key => caches.delete(key)));
    await self.clients.claim();
    // An existing document still runs the previous menu even after the worker changes.
    // Reload once per installed upgrade; preferences remain in localStorage.
    if(upgraded){
      const clients=await self.clients.matchAll({type:"window"});
      // Do not await navigation: its fetch waits for activation to finish.
      clients.forEach(client=>{if(client.navigate)client.navigate(client.url).catch(()=>{});});
    }
  })());
});

self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if (url.pathname === "/rest/v1/annual_prayer_times") return;
  // Online visits receive the deployed page; offline visits keep the full local shell.
  if (event.request.mode === "navigate" && url.origin === self.location.origin) {
    event.respondWith((async()=>{
      const cache=await caches.open(CACHE_NAME);
      try {
        const response=await fetch(event.request);
        if(response.ok){await cache.put(event.request,response.clone());await cache.put("/index.html",response.clone());return response;}
        return (await cache.match(event.request)) || (await cache.match("/index.html")) || response;
      } catch (_) {
        return (await cache.match(event.request)) || (await cache.match("/index.html")) || Response.error();
      }
    })());
    return;
  }

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

  if (data.kind === "azkar-reminder") {
    event.waitUntil(self.clients.matchAll({type:"window",includeUncontrolled:true}).then(clients=>{
      const client=clients.find(item=>"focus" in item);
      if(client){client.postMessage({type:"AOQAT_OPEN_AZKAR",topicId:data.topicId});return client.focus();}
      return self.clients.openWindow("/?azkar="+encodeURIComponent(data.topicId||""));
    }));
    return;
  }
  if (data.kind === "calendar-post-reminder" || data.kind === "friday-reminder" || data.kind === "fasting-reminder" || data.kind === "community-post-reminder") {
    event.waitUntil(self.clients.matchAll({type:"window",includeUncontrolled:true}).then(clients=>{
      const client=clients.find(item=>"focus" in item);
      if(client?.focus){client.postMessage({type:"AOQAT_OPEN_REMINDER",id:data.id,entry:data.entry});return client.focus();}
      return self.clients.openWindow("/?reminder="+encodeURIComponent(data.id||""));
    }));
    return;
  }
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



