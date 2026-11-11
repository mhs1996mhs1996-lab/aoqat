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
  let minuteNativeSyncTimer=null,minutePreviewTimer=null;
  // One native reschedule after the user's last tap. Each press still persists
  // its latest value locally, so no changes are lost during a fast sequence.
  function syncNativeIqama(){
    if(minuteNativeSyncTimer!==null){clearTimeout(minuteNativeSyncTimer);minuteNativeSyncTimer=null;}
    if(!nativeIqama)return;
    const before=settings(),after=afterSettings(),enabled=iqamaNotifyEnabled();
    const payload=JSON.stringify([enabled,before,after]);
    if(payload===lastNativeSettings)return;
    try{
      AndroidNative.configureIqamaTiming(enabled,JSON.stringify(before),JSON.stringify(after));
      lastNativeSettings=payload;
    }catch(error){console.error("iqama native sync",error);}
  }
  function queueNativeIqamaSync(){
    if(!nativeIqama)return;
    if(minuteNativeSyncTimer!==null)clearTimeout(minuteNativeSyncTimer);
    minuteNativeSyncTimer=setTimeout(()=>{minuteNativeSyncTimer=null;syncNativeIqama();},360);
  }
  function queueMinutePreview(){
    if(minutePreviewTimer!==null)clearTimeout(minutePreviewTimer);
    // A full countdown update must never delay the visible press feedback.
    minutePreviewTimer=setTimeout(()=>{minutePreviewTimer=null;tick();},110);
  }
  function flushPendingMinuteSync(){
    if(minuteNativeSyncTimer!==null)syncNativeIqama();
  }
  window.addEventListener("pagehide",flushPendingMinuteSync);
  document.addEventListener("visibilitychange",()=>{if(document.hidden)flushPendingMinuteSync();});
  function hydrateNativeIqama(){
    if(!nativeIqama||!AndroidNative.readIqamaTiming)return;
    try{const saved=JSON.parse(AndroidNative.readIqamaTiming());
      if(localStorage.getItem(IQAMA_NOTIFY_KEY)===null)localStorage.setItem(IQAMA_NOTIFY_KEY,saved.enabled?"1":"0");
      if(localStorage.getItem(KEY)===null)localStorage.setItem(KEY,JSON.stringify(saved.minutes||{}));
      if(localStorage.getItem(AFTER_KEY)===null)localStorage.setItem(AFTER_KEY,JSON.stringify(saved.afterMinutes||{}));
    }catch(e){console.error("iqama settings",e);}
  }
  function save(s){localStorage.setItem(KEY,JSON.stringify(s));queueNativeIqamaSync();}
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
  async function showIqamaNotification(text,friday=false){if(nativeIqama)return;if((!friday&&!iqamaNotifyEnabled())||typeof Notification==="undefined"||Notification.permission!=="granted")return;if(text===lastIqamaNotifyText&&iqamaNotificationActive)return;lastIqamaNotifyText=text;iqamaNotificationActive=true;try{if(window.AndroidNative?.showIqamaNotification){AndroidNative.showIqamaNotification(text);return;}const reg=await navigator.serviceWorker?.ready;if(reg)await reg.showNotification(friday?"🕌 صلاة الجمعة":"⏳ الإقامة",{body:text,tag:"iqama-countdown-live",renotify:false,requireInteraction:true,silent:true});}catch(_){}}
  async function clearIqamaNotification(){if(nativeIqama)return;lastIqamaNotifyText="";iqamaNotificationActive=false;try{if(window.AndroidNative?.hideIqamaNotification){AndroidNative.hideIqamaNotification();return;}const reg=await navigator.serviceWorker?.ready;if(reg){const ns=await reg.getNotifications({tag:"iqama-countdown-live"});ns.forEach(n=>n.close());}}catch(_){}}
  function addIqamaNotifyButton(){const panel=document.getElementById("switchPanel");if(!panel||document.getElementById("iqamaNotificationToggle"))return false;const b=document.createElement("button");b.id="iqamaNotificationToggle";b.type="button";b.className="switch-control-btn";b.addEventListener("click",()=>setIqamaNotify(!iqamaNotifyEnabled()));const status=document.getElementById("tomorrowSwitchStatus");panel.insertBefore(b,status?.parentElement===panel?status:null);refreshIqamaNotifyButton();return true;}
  function parse(v,id){return window.AoqatAdhanCore.minutes(v,id);}
  function fmt(sec){sec=Math.max(0,Math.floor(sec));const h=Math.floor(sec/3600),m=Math.floor((sec%3600)/60),s=sec%60;return [h,m,s].map(x=>String(x).padStart(2,"0")).join(":");}
  function fmtIqama(sec){sec=Math.max(0,Math.floor(sec));const m=Math.floor(sec/60),s=sec%60;return `${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`;}
  async function fetchRow(month,day){const row=await readAnnualPrayer(month,day);return window.AoqatPrayerTimeChoice?.applyRow(row)||row;}
  async function loadToday(){if(busy||typeof SUPABASE_URL==="undefined"||typeof dbHeaders!=="function")return;busy=true;try{const n=new Date(),key=`${n.getFullYear()}-${n.getMonth()+1}-${n.getDate()}`;if(key!==todayKey||!todayRow){todayRow=await fetchRow(n.getMonth()+1,n.getDate());todayKey=key;}const t=new Date(n.getFullYear(),n.getMonth(),n.getDate()+1,12);const tk=`${t.getFullYear()}-${t.getMonth()+1}-${t.getDate()}`;if(tk!==tomorrowKey){const row=await fetchRow(t.getMonth()+1,t.getDate());tomorrowFajr=row?parse(row.fajr,"fajr"):null;tomorrowKey=tk;}}catch(e){console.error("prayer countdown",e)}finally{busy=false;}}
  function createDisplay(){let host=document.querySelector(".workspace")||document.querySelector(".main-content")||document.body;let old=document.getElementById("mainPrayerCountdownHost");if(!old){old=document.createElement("div");old.id="mainPrayerCountdownHost";old.className="preview-header prayer-countdown-host";const preview=host.querySelector(".previewBox")||host.firstElementChild;if(preview)host.insertBefore(old,preview);else host.prepend(old);}old.innerHTML=`<div class="live-prayer-status"><div class="next-prayer"><span id="nextPrayerLabel">الأذان القادم بعد</span><b id="nextPrayerCountdown">--:--:--</b></div><div class="countdown-separator" id="countdownSeparator" aria-hidden="true"></div><div class="iqama-status" id="iqamaStatus"><span id="iqamaLabel">باقي على الإقامة</span><b id="iqamaCountdown">00:00</b></div></div>`;}
  // Both settings pages use this same compact control. Timings and native
  // notification scheduling remain in their existing components.
  function minuteStepperStyles(){
    if(document.getElementById('aoqatIqamaMinuteStepperStyles'))return;
    const style=document.createElement('style');
    style.id='aoqatIqamaMinuteStepperStyles';
    style.textContent="\n#iqamaPanel .iqama-minute-row,#afterIqamaPanel .iqama-minute-row{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:6px 0;margin:4px 0;min-height:51px;direction:rtl}\n#iqamaPanel .iqama-minute-name,#afterIqamaPanel .iqama-minute-name{font-size:17px;font-weight:650;line-height:1.5;color:#183b33;min-width:0}\n#iqamaPanel .iqama-minute-stepper,#afterIqamaPanel .iqama-minute-stepper{display:inline-flex;align-items:center;justify-content:center;gap:4px;direction:ltr;flex-shrink:0;box-sizing:border-box;padding:4px;border:1px solid #aac6bb;background:#edf3f0;border-radius:13px;box-shadow:0 1px 3px rgba(8,49,39,.11)}\n#iqamaPanel .iqama-minute-stepper button,#afterIqamaPanel .iqama-minute-stepper button{width:35px;min-width:35px;height:35px;min-height:35px;padding:0;margin:0;display:inline-flex;justify-content:center;align-items:center;border:1px solid #acc6bb;border-radius:9px;background:#fff;color:#215741;font-size:23px;font-weight:700;line-height:1;cursor:pointer;touch-action:manipulation;box-shadow:none}\n#iqamaPanel .iqama-minute-stepper button:active,#afterIqamaPanel .iqama-minute-stepper button:active{background:#d8e9df;transform:scale(.97)}\n#iqamaPanel .iqama-minute-stepper button:focus-visible,#afterIqamaPanel .iqama-minute-stepper button:focus-visible{outline:2px solid #387457;outline-offset:2px}\n#iqamaPanel .iqama-minute-stepper button:disabled,#afterIqamaPanel .iqama-minute-stepper button:disabled{opacity:.35;cursor:default;transform:none}\n#iqamaPanel .iqama-minute-stepper output,#afterIqamaPanel .iqama-minute-stepper output{display:inline-flex;justify-content:center;align-items:baseline;gap:4px;min-width:89px;text-align:center;direction:rtl;color:#183b33;white-space:nowrap;font-variant-numeric:tabular-nums}\n#iqamaPanel .iqama-minute-stepper output strong,#afterIqamaPanel .iqama-minute-stepper output strong{font-size:21px;font-weight:750}\n#iqamaPanel .iqama-minute-stepper output small,#afterIqamaPanel .iqama-minute-stepper output small{font-size:12px;font-weight:500}\n@media(max-width:360px){#iqamaPanel .iqama-minute-name,#afterIqamaPanel .iqama-minute-name{font-size:15px}#iqamaPanel .iqama-minute-stepper output,#afterIqamaPanel .iqama-minute-stepper output{min-width:74px}#iqamaPanel .iqama-minute-stepper button,#afterIqamaPanel .iqama-minute-stepper button{width:32px;min-width:32px;height:33px;min-height:33px}}\n";
    document.head.appendChild(style);
  }
  function minuteStepperMarkup(id,name,attribute,value){
    return '<div class="iqama-minute-row"><span class="iqama-minute-name">'+name+'</span>'+
      '<div class="iqama-minute-stepper" role="group" aria-label="مدة '+name+'">'+
      '<button type="button" data-minute-step="-1" aria-label="تقليل مدة '+name+' دقيقة واحدة">−</button>'+
      '<output '+attribute+'="'+id+'" aria-live="polite" aria-atomic="true"><strong>'+value+'</strong><small>دقيقة</small></output>'+
      '<button type="button" data-minute-step="1" aria-label="زيادة مدة '+name+' دقيقة واحدة">+</button>'+
      '</div></div>';
  }
  function bindMinuteSteppers(panel,attribute,read,persist){
    panel.querySelectorAll('output['+attribute+']').forEach(out=>{
      const id=out.getAttribute(attribute),wrap=out.parentElement;
      const minus=wrap.querySelector('[data-minute-step="-1"]');
      const plus=wrap.querySelector('[data-minute-step="1"]');
      function render(value){
        out.querySelector('strong').textContent=String(value);
        minus.disabled=value<=1;plus.disabled=value>=30;
      }
      function change(delta){
        // Update the number BEFORE local storage, Android scheduling, or
        // repainting other prayer timers. Rapid repeated taps stay responsive.
        const before=Number(out.querySelector('strong').textContent)||read()[id];
        const next=Math.max(1,Math.min(30,before+delta));
        if(next===before)return;
        render(next);
        const updated=read();
        updated[id]=next;
        persist(updated);
        queueMinutePreview();
      }
      minus.addEventListener('click',()=>change(-1));
      plus.addEventListener('click',()=>change(1));
      render(read()[id]);
    });
  }
  function createPanel(){
    const main=document.querySelector(".sidebar .main-panel");
    if(!main||document.getElementById("iqamaPanel"))return;
    minuteStepperStyles();
    const prayerBtn=main.querySelector('[data-open-panel="prayerPanel"]');
    const btn=document.createElement("button");
    btn.type="button";btn.className="main-action iqama-action";btn.dataset.openPanel="iqamaPanel";
    btn.innerHTML="⏳ <span>أوقات الإقامة</span>";
    prayerBtn?.insertAdjacentElement("afterend",btn);
    const panel=document.createElement("section");
    panel.id="iqamaPanel";panel.className="panel inline-control-panel";
    const values=settings();
    panel.innerHTML='<div class="iqama-help">حدد المدة من وقت الأذان حتى الإقامة.</div>'+
      [...IDS,"friday"].map(id=>minuteStepperMarkup(id,id==="friday"?"الجمعة الأولى":NAMES[id],"data-iqama",values[id])).join("")+
      '<div class="iqama-friday-help">الجمعة الأولى تكون قبل أذان الظهر بالمدة المحددة.</div>';
    btn.insertAdjacentElement("afterend",panel);
    bindMinuteSteppers(panel,"data-iqama",settings,updated=>save(updated));
    btn.addEventListener("click",()=>{
      const open=panel.classList.toggle("inline-open");
      document.querySelectorAll(".inline-control-panel.inline-open").forEach(x=>{
        if(x!==panel)x.classList.remove("inline-open");
      });
      btn.classList.toggle("inline-active",open);
    });
  }
  function createAfterPanel(){
    const main=document.querySelector(".sidebar .main-panel");
    if(!main||document.getElementById("afterIqamaPanel"))return;
    minuteStepperStyles();
    const panel=document.createElement("section");
    panel.id="afterIqamaPanel";panel.className="panel inline-control-panel";
    const values=afterSettings();
    panel.innerHTML='<div class="iqama-help">حدد مدة ظهور عدّاد «مضى على الإقامة» بعد إقامة كل صلاة. عند انتهاء المدة يختفي الإشعار فقط؛ وتبقى واجهة البرنامج «باقي على الإقامة 00:00».</div>'+
      IDS.map(id=>minuteStepperMarkup(id,NAMES[id],"data-after-iqama",values[id])).join("");
    bindMinuteSteppers(panel,"data-after-iqama",afterSettings,updated=>{
      localStorage.setItem(AFTER_KEY,JSON.stringify(updated));
      queueNativeIqamaSync();
    });
    main.appendChild(panel);
  }
  function css(){if(document.getElementById("prayerCountdownStyles"))return;const s=document.createElement("style");s.id="prayerCountdownStyles";s.textContent=`#mainPrayerCountdownHost{display:block!important;width:100%;min-height:36px;margin:0 auto 8px;padding:0;position:relative;z-index:20}.live-prayer-status{width:max-content;max-width:100%;margin:auto;display:flex;flex-wrap:nowrap!important;justify-content:center;align-items:center;gap:6px;direction:rtl;white-space:nowrap}.live-prayer-status .next-prayer,.live-prayer-status .iqama-status{flex:0 1 auto;min-width:0}.live-prayer-status :is(#nextPrayerLabel,#iqamaLabel,#nextPrayerCountdown,#iqamaCountdown){flex-shrink:0;white-space:nowrap}.next-prayer,.iqama-status{display:inline-flex;width:auto;align-items:center;justify-content:center;gap:4px;padding:4px 7px;border-radius:9px;background:rgba(5,28,39,.88);border:1px solid rgba(255,255,255,.12);white-space:nowrap}#nextPrayerLabel,#nextPrayerCountdown,#iqamaLabel,#iqamaCountdown{color:#fff!important}.next-prayer span,.iqama-status span{font-size:12px;font-weight:700}.next-prayer b,.iqama-status b{font-size:15px;direction:ltr;font-weight:900;font-variant-numeric:tabular-nums;letter-spacing:0}#iqamaStatus[hidden],#countdownSeparator[hidden]{display:none!important}${nativeIqama?'.iqama-status{background:rgba(126,84,14,.9)}':''}.countdown-separator{display:block;width:1px;height:28px;flex:0 0 1px;margin:0 2px;background:linear-gradient(to bottom,transparent,rgba(218,178,82,.95),transparent);box-shadow:0 0 5px rgba(218,178,82,.25)}.main-action.iqama-action{background:#8a6518}.iqama-help,.iqama-friday-help{font-size:12px;opacity:.85;margin-bottom:8px}#iqamaPanel label,#afterIqamaPanel label{display:flex;align-items:center;justify-content:space-between;gap:8px;margin:6px 0}#iqamaPanel select,#afterIqamaPanel select{max-width:125px}@media(max-width:600px){.live-prayer-status{width:max-content!important;max-width:calc(100vw - 12px)!important;gap:3px!important;flex-wrap:nowrap!important}.next-prayer,.iqama-status{padding:3px 5px!important;gap:3px!important}#nextPrayerLabel,#nextPrayerCountdown,#iqamaLabel,#iqamaCountdown{color:#fff!important}.next-prayer span,.iqama-status span{font-size:9px}.next-prayer b,.iqama-status b{font-size:12px}.countdown-separator{height:23px;margin:0 1px}}`;document.head.appendChild(s);}
  // Local to the main interface, never shares home-widget typography state.
  function savedLiveSize(el){
      const k=el.id.startsWith('iqama')?'aoqat-live-iqama-style-v1':'aoqat-live-adhan-style-v1';
      try{
        const old=JSON.parse(localStorage.getItem('aoqat-live-countdown-style-v2')||'{}');
        const custom=JSON.parse(localStorage.getItem(k)||'{}');
        const size=Number(Object.assign({},old,custom).fontSize);
        if(Number.isFinite(size)&&size>0)return {size,custom:true};
      }catch(_){}
      if(!el.dataset.countdownBaseSize)
        el.dataset.countdownBaseSize=String(parseFloat(getComputedStyle(el).fontSize)||12);
      return {size:Number(el.dataset.countdownBaseSize)||12,custom:false};
    }
    // Keep custom typography unchanged; on overflow stack rather than reset.
    function fitLiveCountdownRow(){
      const row=document.querySelector('#mainPrayerCountdownHost .live-prayer-status');
      if(!row)return;
      const next=row.querySelector('.next-prayer'),iqama=row.querySelector('.iqama-status');
      if(!next||!iqama)return;
      const txt=['nextPrayerLabel','nextPrayerCountdown','iqamaLabel','iqamaCountdown']
        .map(id=>document.getElementById(id)).filter(Boolean);
      const sizes=txt.map(savedLiveSize);
      const container=row.parentElement?.clientWidth||window.innerWidth;
      const available=Math.max(160,Math.min(container,window.innerWidth||container)-12);
      const sep=row.querySelector('#countdownSeparator');
      row.style.setProperty('max-width',available+'px','important');
      row.style.setProperty('flex-wrap','nowrap','important');
      for(const block of [next,iqama]){
        block.style.removeProperty('max-width');
        block.style.setProperty('flex-wrap','nowrap','important');
        block.style.removeProperty('white-space');
      }
      const paint=(scale)=>txt.forEach((el,i)=>{
        const item=sizes[i];
        const n=item.custom?item.size:Math.max(8,item.size*scale);
        el.style.setProperty('font-size',n.toFixed(2)+'px','important');
      });
      const needed=()=>Math.max(next.scrollWidth,next.offsetWidth)+
        (iqama.hidden?0:Math.max(iqama.scrollWidth,iqama.offsetWidth))+
        (sep&&!sep.hidden&&!iqama.hidden?sep.offsetWidth+6:0);
      let scale=1;
      for(let i=0;i<19;i++){
        paint(scale);
        if(needed()<=available-2||sizes.every(x=>x.custom))break;
        scale=Math.max(.58,scale-.025);
      }
      if(needed()>available-2){
        row.style.setProperty('flex-wrap','wrap','important');
        for(const block of [next,iqama]){
          block.style.setProperty('max-width','100%','important');
          if(block.scrollWidth>available){
            block.style.setProperty('flex-wrap','wrap','important');
            block.style.setProperty('white-space','normal','important');
          }
        }
      }
      row.style.setProperty('justify-content','center','important');
    }
    window.aoqatLiveCountdownFit=fitLiveCountdownRow;
    window.addEventListener('aoqatLiveCountdownStyleChanged',fitLiveCountdownRow);
    function tick(){if(!todayRow){loadToday();return;}const n=new Date(),now=n.getHours()*3600+n.getMinutes()*60+n.getSeconds(),s=settings();const times=IDS.map(id=>({id,min:parse(todayRow[id],id)})).filter(x=>x.min!=null);let next=times.find(x=>x.min*60>now),left=null;if(next){left=next.min*60-now;}else{next={id:"fajr"};if(tomorrowFajr!=null)left=(24*3600-now)+tomorrowFajr*60;}
    const label=document.getElementById("nextPrayerLabel"),counter=document.getElementById("nextPrayerCountdown");if(label)label.textContent=`أذان ${NAMES[next.id]} بعد`;if(counter)counter.textContent=left==null?"--:--:--":fmt(left);
    const iq=document.getElementById("iqamaStatus"),sep=document.getElementById("countdownSeparator"),iqLabel=document.getElementById("iqamaLabel"),iqCounter=document.getElementById("iqamaCountdown");
    let friday={};try{friday=window.AoqatAdhanCore.normalizeFriday(JSON.parse(localStorage.getItem('aoqatAdhanV1')||'{}').friday);}catch(_){}
    const at=window.AoqatAdhanCore.fridayAt([todayRow],n),frame=at===null?null:window.AoqatAdhanCore.fridayFrame(at,+n,friday);
    if(frame){if(iq)iq.hidden=false;if(sep)sep.hidden=false;const clock=fmtIqama(frame.seconds);if(iqLabel)iqLabel.textContent=frame.label;if(iqCounter)iqCounter.textContent=clock;showIqamaNotification(frame.label+' '+clock,true);return;}
    const phase=TIMING.state(now,times.filter(x=>!(n.getDay()===5&&friday.enabled&&x.id==='dhuhr')).map(x=>({id:x.id,startSeconds:x.min*60})),s,afterSettings());
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

  window.addEventListener("aoqatPrayerRowsUpdated",()=>{todayKey="";tomorrowKey="";loadToday().then(tick);});
  function init(){hydrateNativeIqama();syncNativeIqama();css();createDisplay();createPanel();createAfterPanel();loadToday().then(tick);setInterval(tick,1000);setInterval(fitLiveCountdownRow,1000);window.addEventListener("resize",fitLiveCountdownRow);setTimeout(fitLiveCountdownRow,150);setInterval(loadToday,60000);window.addEventListener("focus",refreshIqamaNotifyButton);let tries=0,t=setInterval(()=>{tries++;if(addIqamaNotifyButton()||tries>80)clearInterval(t);},150);}
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});else init();
})();


