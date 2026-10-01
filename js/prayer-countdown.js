"use strict";
(function(){
  const KEY="aoqatIqamaMinutesV1";
  const AFTER_KEY="aoqatAfterIqamaMinutesV1";
  const TIMING=window.AoqatIqamaTiming;
  const AFTER_DEFAULTS={fajr:10,dhuhr:10,asr:10,maghrib:10,isha:10};
  const IQAMA_NOTIFY_KEY="aoqatIqamaNotificationEnabledV1"; let lastIqamaNotifyText=""; let iqamaNotificationActive=false;
  const DEFAULTS={fajr:20,dhuhr:10,asr:10,maghrib:10,isha:10,friday:15};
  const NAMES={fajr:"الفجر",dhuhr:"الظهر",asr:"العصر",maghrib:"المغرب",isha:"العشاء"};
  const IDS=["fajr","dhuhr","asr","maghrib","isha"];
  let todayRow=null,todayKey="",busy=false,tomorrowFajr=null,tomorrowKey="";
  function readMinutes(key,defaults){
    let saved={};try{saved=JSON.parse(localStorage.getItem(key)||"{}");}catch(_){}
    return TIMING.normalize(saved,defaults);
  }
  function settings(){return readMinutes(KEY,DEFAULTS);}
  function afterSettings(){return readMinutes(AFTER_KEY,AFTER_DEFAULTS);}
  const nativeIqama=!!window.AndroidNative?.configureIqamaTiming;
  let lastNativeSettings="";
  function syncNativeIqama(){
    if(!nativeIqama)return;
    const payload=JSON.stringify([iqamaNotifyEnabled(),settings(),afterSettings()]);
    if(payload===lastNativeSettings)return;
    lastNativeSettings=payload;
    AndroidNative.configureIqamaTiming(iqamaNotifyEnabled(),JSON.stringify(settings()),JSON.stringify(afterSettings()));
  }
  function hydrateNativeIqama(){
    if(!nativeIqama||!AndroidNative.readIqamaTiming)return;
    try{const saved=JSON.parse(AndroidNative.readIqamaTiming());
      if(localStorage.getItem(IQAMA_NOTIFY_KEY)===null)localStorage.setItem(IQAMA_NOTIFY_KEY,saved.enabled?"1":"0");
      if(localStorage.getItem(KEY)===null)localStorage.setItem(KEY,JSON.stringify(saved.minutes||{}));
      if(localStorage.getItem(AFTER_KEY)===null)localStorage.setItem(AFTER_KEY,JSON.stringify(saved.afterMinutes||{}));
    }catch(e){console.error("iqama settings",e);}
  }
  function save(s){localStorage.setItem(KEY,JSON.stringify(s));syncNativeIqama();}
  function iqamaNotifyEnabled(){return localStorage.getItem(IQAMA_NOTIFY_KEY)==="1";}
  async function setIqamaNotify(on){
    localStorage.setItem(IQAMA_NOTIFY_KEY,on?"1":"0");
    if(nativeIqama){syncNativeIqama();refreshIqamaNotifyButton();return;}
    if(on&&typeof Notification!=="undefined"&&Notification.permission!=="granted"){
      const permission=await Notification.requestPermission();if(permission!=="granted")localStorage.setItem(IQAMA_NOTIFY_KEY,"0");
    }
    refreshIqamaNotifyButton();if(!iqamaNotifyEnabled())clearIqamaNotification();
  }
  function refreshIqamaNotifyButton(){
    const b=document.getElementById("iqamaNotificationToggle");if(!b)return;
    const on=iqamaNotifyEnabled()&&(nativeIqama||(typeof Notification!=="undefined"&&Notification.permission==="granted"));
    const needsPermission=on&&nativeIqama&&AndroidNative.iqamaNotificationPermission&&!AndroidNative.iqamaNotificationPermission();
    const needsBackground=on&&nativeIqama&&AndroidNative.iqamaBackgroundPermission&&!AndroidNative.iqamaBackgroundPermission();
    b.classList.toggle("enabled",on);b.setAttribute("aria-pressed",String(on));
    let repair=document.getElementById('iqamaBackgroundAccess');
    if(needsBackground&&!repair){repair=document.createElement('button');repair.id='iqamaBackgroundAccess';repair.type='button';repair.className='switch-control-btn';repair.textContent='السماح بإشعار الإقامة في الخلفية';repair.onclick=()=>AndroidNative.requestIqamaBackgroundPermission?.();b.insertAdjacentElement('afterend',repair);}
    if(repair)repair.hidden=!needsBackground;
    b.innerHTML=`<span>🔔 ظهور إشعار الإقامة</span><span style="padding:2px 7px;border-radius:999px;background:rgba(255,255,255,.14);font-size:11px">${needsPermission?"يحتاج إذن Android":needsBackground?"يحتاج إذن الخلفية":on?"تشغيل":"إيقاف"}</span>`;
  }
  async function showIqamaNotification(text){if(nativeIqama)return;if(!iqamaNotifyEnabled()||typeof Notification==="undefined"||Notification.permission!=="granted")return;if(text===lastIqamaNotifyText&&iqamaNotificationActive)return;lastIqamaNotifyText=text;iqamaNotificationActive=true;try{if(window.AndroidNative?.showIqamaNotification){AndroidNative.showIqamaNotification(text);return;}const reg=await navigator.serviceWorker?.ready;if(reg)await reg.showNotification("⏳ الإقامة",{body:text,tag:"iqama-countdown-live",renotify:false,requireInteraction:true,silent:true});}catch(_){}}
  async function clearIqamaNotification(){if(nativeIqama)return;lastIqamaNotifyText="";iqamaNotificationActive=false;try{if(window.AndroidNative?.hideIqamaNotification){AndroidNative.hideIqamaNotification();return;}const reg=await navigator.serviceWorker?.ready;if(reg){const ns=await reg.getNotifications({tag:"iqama-countdown-live"});ns.forEach(n=>n.close());}}catch(_){}}
  function addIqamaNotifyButton(){const panel=document.getElementById("switchPanel");if(!panel||document.getElementById("iqamaNotificationToggle"))return false;const b=document.createElement("button");b.id="iqamaNotificationToggle";b.type="button";b.className="switch-control-btn";b.addEventListener("click",()=>setIqamaNotify(!iqamaNotifyEnabled()));const status=document.getElementById("tomorrowSwitchStatus");panel.insertBefore(b,status?.parentElement===panel?status:null);refreshIqamaNotifyButton();return true;}
  function parse(v,id){return window.AoqatAdhanCore.minutes(v,id);}
  function fmt(sec){sec=Math.max(0,Math.floor(sec));const h=Math.floor(sec/3600),m=Math.floor((sec%3600)/60),s=sec%60;return [h,m,s].map(x=>String(x).padStart(2,"0")).join(":");}
  function fmtIqama(sec){sec=Math.max(0,Math.floor(sec));const m=Math.floor(sec/60),s=sec%60;return `${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`;}
  async function fetchRow(month,day){const u=new URL(`${SUPABASE_URL}/rest/v1/annual_prayer_times`);u.searchParams.set("select","*");u.searchParams.set("gregorian_month",`eq.${month}`);u.searchParams.set("gregorian_day",`eq.${day}`);u.searchParams.set("limit","1");const r=await fetch(u,{headers:dbHeaders()});if(!r.ok)return null;const a=await r.json();return a[0]||null;}
  async function loadToday(){if(busy||typeof SUPABASE_URL==="undefined"||typeof dbHeaders!=="function")return;busy=true;try{const n=new Date(),key=`${n.getFullYear()}-${n.getMonth()+1}-${n.getDate()}`;if(key!==todayKey||!todayRow){todayRow=await fetchRow(n.getMonth()+1,n.getDate());todayKey=key;}const t=new Date(n.getFullYear(),n.getMonth(),n.getDate()+1,12);const tk=`${t.getFullYear()}-${t.getMonth()+1}-${t.getDate()}`;if(tk!==tomorrowKey){const row=await fetchRow(t.getMonth()+1,t.getDate());tomorrowFajr=row?parse(row.fajr,"fajr"):null;tomorrowKey=tk;}}catch(e){console.error("prayer countdown",e)}finally{busy=false;}}
  function createDisplay(){let host=document.querySelector(".workspace")||document.querySelector(".main-content")||document.body;let old=document.getElementById("mainPrayerCountdownHost");if(!old){old=document.createElement("div");old.id="mainPrayerCountdownHost";old.className="preview-header prayer-countdown-host";const preview=host.querySelector(".previewBox")||host.firstElementChild;if(preview)host.insertBefore(old,preview);else host.prepend(old);}old.innerHTML=`<div class="live-prayer-status"><div class="next-prayer"><span id="nextPrayerLabel">الأذان القادم بعد</span><b id="nextPrayerCountdown">--:--:--</b></div><div class="countdown-separator" id="countdownSeparator" aria-hidden="true"></div><div class="iqama-status" id="iqamaStatus"><span id="iqamaLabel">باقي على الإقامة</span><b id="iqamaCountdown">00:00</b></div></div>`;}
  function createPanel(){const main=document.querySelector(".sidebar .main-panel");if(!main||document.getElementById("iqamaPanel"))return;const prayerBtn=main.querySelector('[data-open-panel="prayerPanel"]');const btn=document.createElement("button");btn.type="button";btn.className="main-action iqama-action";btn.dataset.openPanel="iqamaPanel";btn.innerHTML="⏳ <span>أوقات الإقامة</span>";prayerBtn?.insertAdjacentElement("afterend",btn);const p=document.createElement("section");p.id="iqamaPanel";p.className="panel inline-control-panel";const opts=[5,10,15,20,25,30].map(v=>`<option value="${v}">${v} دقيقة</option>`).join("");p.innerHTML=`<div class="iqama-help">حدد المدة من وقت الأذان حتى الإقامة.</div>${IDS.map(id=>`<label>${NAMES[id]}<select data-iqama="${id}">${opts}</select></label>`).join("")}<label>الجمعة الأولى<select data-iqama="friday">${opts}</select></label><div class="iqama-friday-help">الجمعة الأولى تكون قبل أذان الظهر بالمدة المحددة.</div>`;btn.insertAdjacentElement("afterend",p);const s=settings();p.querySelectorAll("[data-iqama]").forEach(el=>{el.value=String(s[el.dataset.iqama]||DEFAULTS[el.dataset.iqama]);el.addEventListener("change",()=>{const q=settings();q[el.dataset.iqama]=+el.value;save(q);tick();});});btn.addEventListener("click",()=>{const open=p.classList.toggle("inline-open");document.querySelectorAll(".inline-control-panel.inline-open").forEach(x=>{if(x!==p)x.classList.remove("inline-open")});btn.classList.toggle("inline-active",open);});}
  function createAfterPanel(){
    const main=document.querySelector(".sidebar .main-panel");
    if(!main||document.getElementById("afterIqamaPanel"))return;
    const panel=document.createElement("section");
    panel.id="afterIqamaPanel";panel.className="panel inline-control-panel";
    const options=TIMING.OPTIONS.map(value=>`<option value="${value}">${value} دقيقة</option>`).join("");
    panel.innerHTML=`<div class="iqama-help">حدد مدة ظهور عدّاد «مضى على الإقامة» بعد إقامة كل صلاة. عند انتهاء المدة يختفي الإشعار فقط؛ وتبقى واجهة البرنامج «باقي على الإقامة 00:00».</div>${IDS.map(id=>`<label>${NAMES[id]}<select data-after-iqama="${id}">${options}</select></label>`).join("")}`;
    const values=afterSettings();
    panel.querySelectorAll("[data-after-iqama]").forEach(select=>{
      select.value=String(values[select.dataset.afterIqama]);
      select.addEventListener("change",()=>{
        const updated=afterSettings();updated[select.dataset.afterIqama]=Number(select.value);
        localStorage.setItem(AFTER_KEY,JSON.stringify(updated));syncNativeIqama();tick();
      });
    });
    main.appendChild(panel);
  }
  function css(){if(document.getElementById("prayerCountdownStyles"))return;const s=document.createElement("style");s.id="prayerCountdownStyles";s.textContent=`#mainPrayerCountdownHost{display:block!important;width:100%;min-height:36px;margin:0 auto 8px;padding:0;position:relative;z-index:20}.live-prayer-status{width:max-content;max-width:100%;margin:auto;display:flex;justify-content:center;align-items:center;gap:6px;direction:rtl;white-space:nowrap}.next-prayer,.iqama-status{display:inline-flex;width:auto;align-items:center;justify-content:center;gap:4px;padding:4px 7px;border-radius:9px;background:rgba(5,28,39,.88);border:1px solid rgba(255,255,255,.12);white-space:nowrap}.next-prayer span,.iqama-status span{font-size:12px;font-weight:700}.next-prayer b,.iqama-status b{font-size:15px;direction:ltr;font-weight:900;font-variant-numeric:tabular-nums;letter-spacing:0}#iqamaStatus[hidden],#countdownSeparator[hidden]{display:none!important}.iqama-status{background:rgba(126,84,14,.9)}.countdown-separator{display:block;width:1px;height:28px;flex:0 0 1px;margin:0 2px;background:linear-gradient(to bottom,transparent,rgba(218,178,82,.95),transparent);box-shadow:0 0 5px rgba(218,178,82,.25)}.main-action.iqama-action{background:#8a6518}.iqama-help,.iqama-friday-help{font-size:12px;opacity:.85;margin-bottom:8px}#iqamaPanel label,#afterIqamaPanel label{display:flex;align-items:center;justify-content:space-between;gap:8px;margin:6px 0}#iqamaPanel select,#afterIqamaPanel select{max-width:125px}@media(max-width:600px){.live-prayer-status{width:max-content!important;max-width:calc(100vw - 12px)!important;gap:3px!important;flex-wrap:nowrap!important}.next-prayer,.iqama-status{padding:3px 5px!important;gap:3px!important}.next-prayer span,.iqama-status span{font-size:9px}.next-prayer b,.iqama-status b{font-size:12px}.countdown-separator{height:23px;margin:0 1px}}`;document.head.appendChild(s);}
  function tick(){if(!todayRow){loadToday();return;}const n=new Date(),now=n.getHours()*3600+n.getMinutes()*60+n.getSeconds(),s=settings();const times=IDS.map(id=>({id,min:parse(todayRow[id],id)})).filter(x=>x.min!=null);let next=times.find(x=>x.min*60>now),left=null;if(next){left=next.min*60-now;}else{next={id:"fajr"};if(tomorrowFajr!=null)left=(24*3600-now)+tomorrowFajr*60;}
    const label=document.getElementById("nextPrayerLabel"),counter=document.getElementById("nextPrayerCountdown");if(label)label.textContent=`أذان ${NAMES[next.id]} بعد`;if(counter)counter.textContent=left==null?"--:--:--":fmt(left);
    const iq=document.getElementById("iqamaStatus"),sep=document.getElementById("countdownSeparator"),iqLabel=document.getElementById("iqamaLabel"),iqCounter=document.getElementById("iqamaCountdown");
    const phase=TIMING.state(now,times.map(x=>({id:x.id,startSeconds:x.min*60})),s,afterSettings());
    if(iq)iq.hidden=false;if(sep)sep.hidden=false;
    if(!phase){
      if(iqLabel)iqLabel.textContent="باقي على الإقامة";
      if(iqCounter)iqCounter.textContent="00:00";
      clearIqamaNotification();return;
    }
    const text=phase.phase==="elapsed"?"مضى على الإقامة":"باقي على الإقامة";
    const clock=fmtIqama(phase.seconds);
    if(iqLabel)iqLabel.textContent=text;if(iqCounter)iqCounter.textContent=clock;
    showIqamaNotification(text+" "+clock);
  }

  function init(){hydrateNativeIqama();syncNativeIqama();css();createDisplay();createPanel();createAfterPanel();loadToday().then(tick);setInterval(tick,1000);setInterval(loadToday,60000);window.addEventListener("focus",refreshIqamaNotifyButton);let tries=0,t=setInterval(()=>{tries++;if(addIqamaNotifyButton()||tries>80)clearInterval(t);},150);}
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});else init();
})();
