"use strict";
(function(){
  const FUNCTION_BASE="https://ytdvhiijxxaqofduorwm.supabase.co/functions/v1";
  const ENABLE_KEY="prayerTomorrowAlarmEnabledV1";

  function b64ToBytes(value){
    const pad="=".repeat((4-value.length%4)%4);
    const raw=atob((value+pad).replace(/-/g,"+").replace(/_/g,"/"));
    return Uint8Array.from(raw,c=>c.charCodeAt(0));
  }

  function ensureStatus(){
    let el=document.getElementById("serverPushStatus");
    if(el)return el;
    const button=document.getElementById("tomorrowAlarmEnable");
    if(!button)return null;
    el=document.createElement("div");
    el.id="serverPushStatus";
    el.style.cssText="margin-top:6px;font-size:11px;line-height:1.6;opacity:.82;text-align:center";
    button.insertAdjacentElement("afterend",el);
    return el;
  }
  function status(text,ok=false){
    const el=ensureStatus();if(!el)return;
    el.textContent=text;el.style.color=ok?"#83e2ad":"";
  }

  async function getPublicKey(){
    const response=await fetch(`${FUNCTION_BASE}/push-subscription`,{method:"GET",cache:"no-store"});
    if(!response.ok)throw new Error("تعذر قراءة مفتاح الإشعارات");
    const data=await response.json();
    if(!data.publicKey)throw new Error("مفتاح الإشعارات غير متوفر");
    return data.publicKey;
  }

  async function syncSubscription(){
    if(localStorage.getItem(ENABLE_KEY)!=="1")return false;
    if(!("serviceWorker" in navigator)||!("PushManager" in window)){status("هذا المتصفح لا يدعم الإشعارات بالخلفية.");return false;}
    if(typeof Notification==="undefined"||Notification.permission!=="granted"){status("اسمح بإشعارات الهاتف أولاً من زر تنبيه النشر.");return false;}
    try{
      status("جاري ربط إشعارات الخلفية...");
      const reg=await navigator.serviceWorker.ready;
      let sub=await reg.pushManager.getSubscription();
      if(!sub){
        const publicKey=await getPublicKey();
        sub=await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:b64ToBytes(publicKey)});
      }
      const json=sub.toJSON();
      const timezone=Intl.DateTimeFormat().resolvedOptions().timeZone||"UTC";
      const response=await fetch(`${FUNCTION_BASE}/push-subscription`,{
        method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({endpoint:sub.endpoint,keys:json.keys||{},timezone})
      });
      if(!response.ok)throw new Error("تعذر حفظ اشتراك الإشعارات");
      localStorage.setItem("prayerServerPushReadyV1","1");
      status("✅ إشعارات الخلفية مفعلة حتى عند إغلاق البرنامج.",true);
      return true;
    }catch(error){
      console.error("تعذر ربط إشعارات الخلفية",error);
      status("تعذر تفعيل إشعارات الخلفية. افتح البرنامج كتطبيق مثبت واسمح بالإشعارات.");
      return false;
    }
  }

  async function disableSubscription(){
    try{
      if(!("serviceWorker" in navigator))return;
      const reg=await navigator.serviceWorker.ready;
      const sub=await reg.pushManager?.getSubscription();
      if(sub){
        await fetch(`${FUNCTION_BASE}/push-subscription`,{method:"DELETE",headers:{"Content-Type":"application/json"},body:JSON.stringify({endpoint:sub.endpoint})});
      }
      localStorage.removeItem("prayerServerPushReadyV1");
      status("إشعارات الخلفية متوقفة.");
    }catch(_){ }
  }

  function init(){
    let tries=0;
    const timer=setInterval(()=>{
      tries++;ensureStatus();
      if(document.getElementById("tomorrowAlarmEnable")||tries>80){clearInterval(timer);if(localStorage.getItem(ENABLE_KEY)==="1")setTimeout(syncSubscription,400);}
    },150);

    document.addEventListener("click",event=>{
      if(!event.target.closest?.("#tomorrowAlarmEnable"))return;
      setTimeout(()=>{
        if(localStorage.getItem(ENABLE_KEY)==="1")syncSubscription();else disableSubscription();
      },900);
    });

    window.addEventListener("focus",()=>{if(localStorage.getItem(ENABLE_KEY)==="1"&&Notification.permission==="granted")syncSubscription();},{passive:true});
  }

  window.PrayerPushNotifications={sync:syncSubscription,disable:disableSubscription};
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});else init();
})();