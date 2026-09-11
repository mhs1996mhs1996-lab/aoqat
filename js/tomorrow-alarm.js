"use strict";
(function(){
  const ALARM_KEY="prayerTomorrowAlarmEnabledV1";
  const SNOOZE_KEY="prayerTomorrowAlarmSnoozeUntilV1";
  const LAST_KEY="prayerTomorrowAlarmLastDateV1";
  const SNOOZE_MINUTES=10;
  let alarmActive=false;
  let audioCtx=null;
  let toneTimer=null;
  let vibrationTimer=null;
  let snoozeTimer=null;

  function tomorrowParts(){
    const d=new Date();
    d.setHours(12,0,0,0);
    d.setDate(d.getDate()+1);
    return {year:d.getFullYear(),month:d.getMonth()+1,day:d.getDate()};
  }
  function dateKey(p){return `${p.year}-${String(p.month).padStart(2,"0")}-${String(p.day).padStart(2,"0")}`;}
  function sameDate(a,b){return a&&b&&Number(a.year)===Number(b.year)&&Number(a.month)===Number(b.month)&&Number(a.day)===Number(b.day);}
  function enabled(){return localStorage.getItem(ALARM_KEY)==="1";}

  function injectStyles(){
    if(document.getElementById("tomorrowAlarmStyles"))return;
    const s=document.createElement("style");s.id="tomorrowAlarmStyles";
    s.textContent=`
      #tomorrowAlarmOverlay{position:fixed;inset:0;z-index:200000;display:none;align-items:center;justify-content:center;padding:18px;background:rgba(1,9,16,.88);backdrop-filter:blur(7px)}
      #tomorrowAlarmOverlay.open{display:flex}
      #tomorrowAlarmOverlay .alarm-card{width:min(430px,94vw);border:1px solid rgba(255,255,255,.18);border-radius:22px;background:#102b39;color:#fff;padding:22px;text-align:center;box-shadow:0 25px 80px rgba(0,0,0,.5)}
      #tomorrowAlarmOverlay .alarm-icon{font-size:54px;line-height:1;margin-bottom:10px}
      #tomorrowAlarmOverlay h2{margin:0 0 8px;font-size:23px}#tomorrowAlarmOverlay p{margin:0 0 18px;line-height:1.8;color:#d9e7ed;font-size:14px}
      #tomorrowAlarmOverlay .alarm-actions{display:grid;grid-template-columns:1fr 1fr;gap:9px}
      #tomorrowAlarmOverlay button{border:0;border-radius:12px;padding:13px 12px;font-family:inherit;font-size:14px;font-weight:800;cursor:pointer;color:#fff}
      #tomorrowAlarmStop{background:#b33b3b}#tomorrowAlarmSnooze{background:#b17a19}
      #tomorrowAlarmEnable{width:100%;margin-top:8px;border:1px solid rgba(255,255,255,.15);border-radius:9px;padding:10px 12px;background:#176f9f;color:#fff;font-family:inherit;font-size:13px;font-weight:800;cursor:pointer}
      #tomorrowAlarmEnable.enabled{background:#168b52}
      .tomorrow-alarm-note{font-size:11px;opacity:.78;line-height:1.6;margin-top:6px}
    `;document.head.appendChild(s);
  }

  function ensureOverlay(){
    let o=document.getElementById("tomorrowAlarmOverlay");if(o)return o;
    o=document.createElement("div");o.id="tomorrowAlarmOverlay";
    o.innerHTML=`<div class="alarm-card"><div class="alarm-icon">⏰</div><h2>تم تبديل المواقيت إلى اليوم التالي</h2><p>مواقيت الغد أصبحت جاهزة. انشر المواقيت الآن.</p><div class="alarm-actions"><button id="tomorrowAlarmStop" type="button">⏹ إيقاف التنبيه</button><button id="tomorrowAlarmSnooze" type="button">😴 غفوة ${SNOOZE_MINUTES} دقائق</button></div></div>`;
    document.body.appendChild(o);
    o.querySelector("#tomorrowAlarmStop").addEventListener("click",stopAlarm);
    o.querySelector("#tomorrowAlarmSnooze").addEventListener("click",snoozeAlarm);
    return o;
  }

  function beepOnce(){
    try{
      audioCtx=audioCtx||new (window.AudioContext||window.webkitAudioContext)();
      if(audioCtx.state==="suspended")audioCtx.resume();
      const osc=audioCtx.createOscillator(),gain=audioCtx.createGain();
      osc.type="sine";osc.frequency.value=880;gain.gain.value=.12;
      osc.connect(gain);gain.connect(audioCtx.destination);osc.start();osc.stop(audioCtx.currentTime+.35);
    }catch(_){ }
  }
  function startSoundAndVibration(){
    beepOnce();clearInterval(toneTimer);toneTimer=setInterval(beepOnce,1400);
    if(navigator.vibrate){navigator.vibrate([700,300,700,800]);clearInterval(vibrationTimer);vibrationTimer=setInterval(()=>navigator.vibrate([700,300,700,800]),3200);}
  }
  function stopSoundAndVibration(){clearInterval(toneTimer);clearInterval(vibrationTimer);toneTimer=null;vibrationTimer=null;if(navigator.vibrate)navigator.vibrate(0);}

  async function showSystemNotification(){
    if(typeof Notification==="undefined"||Notification.permission!=="granted")return;
    const options={
      body:"تم تبديل التوقيت إلى اليوم التالي. انشر المواقيت.",
      icon:"/assets/icons/app-icon.svg",badge:"/assets/icons/app-icon.svg",
      tag:"prayer-tomorrow-publish-alarm",renotify:true,requireInteraction:true,
      vibrate:[700,300,700,300,900],
      actions:[{action:"snooze",title:`غفوة ${SNOOZE_MINUTES} دقائق`},{action:"stop",title:"إيقاف التنبيه"}],
      data:{kind:"tomorrow-publish-alarm",url:"/"}
    };
    try{
      const reg=await navigator.serviceWorker?.ready;
      if(reg)await reg.showNotification("⏰ مواقيت الغد جاهزة",options);
      else new Notification("⏰ مواقيت الغد جاهزة",options);
    }catch(error){console.error("تعذر إرسال إشعار التنبيه",error);}
  }

  async function fireAlarm(force=false){
    if(!enabled()&&!force)return;
    const key=dateKey(tomorrowParts());
    if(!force&&localStorage.getItem(LAST_KEY)===key)return;
    const snoozeUntil=Number(localStorage.getItem(SNOOZE_KEY)||0);
    if(!force&&Date.now()<snoozeUntil){scheduleSnooze(snoozeUntil-Date.now());return;}
    localStorage.setItem(LAST_KEY,key);localStorage.removeItem(SNOOZE_KEY);
    alarmActive=true;ensureOverlay().classList.add("open");startSoundAndVibration();showSystemNotification();
  }
  function stopAlarm(){alarmActive=false;stopSoundAndVibration();ensureOverlay().classList.remove("open");localStorage.removeItem(SNOOZE_KEY);}
  function snoozeAlarm(){
    stopAlarm();const until=Date.now()+SNOOZE_MINUTES*60*1000;localStorage.setItem(SNOOZE_KEY,String(until));
    localStorage.removeItem(LAST_KEY);scheduleSnooze(SNOOZE_MINUTES*60*1000);
  }
  function scheduleSnooze(delay){clearTimeout(snoozeTimer);snoozeTimer=setTimeout(()=>fireAlarm(true),Math.max(1000,delay));}

  async function requestPermission(){
    if(typeof Notification==="undefined"){alert("هذا المتصفح لا يدعم إشعارات الهاتف.");return;}
    let result=Notification.permission;
    if(result!=="granted")result=await Notification.requestPermission();
    if(result==="granted"){
      localStorage.setItem(ALARM_KEY,"1");
      try{audioCtx=audioCtx||new (window.AudioContext||window.webkitAudioContext)();await audioCtx.resume();}catch(_){ }
      if(navigator.vibrate)navigator.vibrate(100);
    }else localStorage.setItem(ALARM_KEY,"0");
    refreshButton();
  }

  function addEnableButton(){
    const panel=document.getElementById("switchPanel");if(!panel||document.getElementById("tomorrowAlarmEnable"))return false;
    const b=document.createElement("button");b.id="tomorrowAlarmEnable";b.type="button";b.addEventListener("click",async()=>{if(enabled()){localStorage.setItem(ALARM_KEY,"0");stopAlarm();refreshButton();}else await requestPermission();});
    const status=document.getElementById("tomorrowSwitchStatus");panel.insertBefore(b,status||null);
    const note=document.createElement("div");note.className="tomorrow-alarm-note";note.textContent="التنبيه يظهر عند تبديل المواقيت بعد العشاء بـ35 دقيقة، مع إيقاف وغفوة.";b.insertAdjacentElement("afterend",note);refreshButton();return true;
  }
  function refreshButton(){const b=document.getElementById("tomorrowAlarmEnable");if(!b)return;const on=enabled()&&typeof Notification!=="undefined"&&Notification.permission==="granted";b.classList.toggle("enabled",on);b.textContent=on?"⏰ تنبيه النشر: تشغيل":"⏰ تفعيل تنبيه النشر على الهاتف";}

  function handlePreviewChange(event){
    const p=event?.detail?.date;if(!p||!sameDate(p,tomorrowParts()))return;
    const status=document.getElementById("tomorrowSwitchStatus")?.textContent||"";
    if(status.includes("تلقائ")||status.includes("35 دقيقة"))setTimeout(()=>fireAlarm(false),250);
  }

  function handleSnoozeFromUrl(){
    const url=new URL(location.href);if(url.searchParams.get("alarm")==="snooze"){
      const until=Date.now()+SNOOZE_MINUTES*60*1000;localStorage.setItem(SNOOZE_KEY,String(until));localStorage.removeItem(LAST_KEY);scheduleSnooze(SNOOZE_MINUTES*60*1000);url.searchParams.delete("alarm");history.replaceState({},"",url.pathname+url.search+url.hash);
    }
    const stored=Number(localStorage.getItem(SNOOZE_KEY)||0);if(stored>Date.now())scheduleSnooze(stored-Date.now());
  }

  function init(){
    injectStyles();ensureOverlay();handleSnoozeFromUrl();
    let tries=0;const timer=setInterval(()=>{tries++;if(addEnableButton()||tries>80)clearInterval(timer);},150);
    document.addEventListener("prayerPreviewDateChanged",handlePreviewChange);
    navigator.serviceWorker?.addEventListener("message",e=>{if(e.data?.type==="PRAYER_ALARM_STOP")stopAlarm();if(e.data?.type==="PRAYER_ALARM_SNOOZE")snoozeAlarm();});
  }

  window.PrayerTomorrowAlarm={fire:()=>fireAlarm(true),stop:stopAlarm,snooze:snoozeAlarm};
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});else init();
})();