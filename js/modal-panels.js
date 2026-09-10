"use strict";

(function(){
  const AUTO_KEY="prayerAutoTomorrowEnabledV1";
  const NOTIFY_KEY="prayerTomorrowNotifyEnabledV1";
  const BAGHDAD_TZ="Asia/Baghdad";
  const HIJRI_MONTHS=["محرم","صفر","ربيع الأول","ربيع الآخر","جمادى الأولى","جمادى الآخرة","رجب","شعبان","رمضان","شوال","ذو القعدة","ذو الحجة"];
  const DAY_NAMES=["الأحد","الاثنين","الثلاثاء","الأربعاء","الخميس","الجمعة","السبت"];
  let manualOverrideUntil=0;
  let lastAutoMode="";

  function setSelect(id,value){
    const el=document.getElementById(id);
    if(!el) return;
    const wanted=String(value);
    const option=Array.from(el.options||[]).find(o=>o.value===wanted||o.textContent.trim()===wanted);
    if(option) el.value=option.value;
  }

  function baghdadNowParts(){
    const parts=new Intl.DateTimeFormat("en-US",{
      timeZone:BAGHDAD_TZ,year:"numeric",month:"2-digit",day:"2-digit",
      hour:"2-digit",minute:"2-digit",second:"2-digit",hourCycle:"h23"
    }).formatToParts(new Date());
    const out={};
    parts.forEach(p=>{if(p.type!=="literal") out[p.type]=Number(p.value)});
    return out;
  }

  function addDays(dateParts,days){
    const d=new Date(Date.UTC(dateParts.year,dateParts.month-1,dateParts.day+days,12,0,0));
    return {year:d.getUTCFullYear(),month:d.getUTCMonth()+1,day:d.getUTCDate(),date:d};
  }

  function hijriFor(dateParts){
    try{
      const d=new Date(Date.UTC(dateParts.year,dateParts.month-1,dateParts.day,12,0,0));
      const parts=new Intl.DateTimeFormat("en-US-u-ca-islamic-umalqura",{
        timeZone:BAGHDAD_TZ,year:"numeric",month:"numeric",day:"numeric"
      }).formatToParts(d);
      const out={};
      parts.forEach(p=>{if(p.type!=="literal"&&p.type!=="era") out[p.type]=Number(p.value)});
      return {day:out.day,month:out.month,year:out.year};
    }catch(error){return null;}
  }

  function weekdayFor(dateParts){
    const d=new Date(Date.UTC(dateParts.year,dateParts.month-1,dateParts.day,12,0,0));
    return DAY_NAMES[d.getUTCDay()];
  }

  function monthName(month){
    const names=(typeof GREGORIAN_MONTHS!=="undefined"&&Array.isArray(GREGORIAN_MONTHS))?GREGORIAN_MONTHS:["كانون الثاني","شباط","آذار","نيسان","أيار","حزيران","تموز","آب","أيلول","تشرين الأول","تشرين الثاني","كانون الأول"];
    return names[month-1];
  }

  async function fetchAnnualPrayer(month,day){
    if(typeof SUPABASE_URL==="undefined"||typeof dbHeaders!=="function") return null;
    const url=new URL(`${SUPABASE_URL}/rest/v1/annual_prayer_times`);
    url.searchParams.set("select","*");
    url.searchParams.set("gregorian_month",`eq.${month}`);
    url.searchParams.set("gregorian_day",`eq.${day}`);
    url.searchParams.set("limit","1");
    const response=await fetch(url,{headers:dbHeaders()});
    if(!response.ok) return null;
    const rows=await response.json();
    return rows[0]||null;
  }

  function parseIshaMinutes(value){
    const m=String(value||"").trim().match(/^(\d{1,2}):(\d{2})/);
    if(!m) return null;
    let hour=Number(m[1]);
    const minute=Number(m[2]);
    if(hour<12) hour+=12;
    return hour*60+minute;
  }

  async function applyPreviewDate(dateParts,sourceLabel=""){
    const row=await fetchAnnualPrayer(dateParts.month,dateParts.day);
    if(!row){
      setSwitchStatus(`لا توجد مواقيت محفوظة لتاريخ ${dateParts.day}/${dateParts.month}` ,"error");
      return false;
    }

    setSelect("gregorianDay",dateParts.day);
    setSelect("gregorianMonth",monthName(dateParts.month));
    setSelect("gregorianYear",dateParts.year);
    setSelect("dayName",weekdayFor(dateParts));

    const hijri=hijriFor(dateParts);
    if(hijri){
      setSelect("hijriDay",hijri.day);
      setSelect("hijriMonth",HIJRI_MONTHS[hijri.month-1]);
      setSelect("hijriYear",hijri.year);
    }

    ["fajr","sunrise","dhuhr","asr","maghrib","isha"].forEach(id=>{
      const el=document.getElementById(id);
      if(el&&row[id]!=null) el.value=String(row[id]);
    });

    if(typeof updateAll==="function") updateAll();
    document.dispatchEvent(new CustomEvent("prayerPreviewDateChanged",{detail:{date:dateParts,row}}));
    setSwitchStatus(sourceLabel||`المعاينة تعرض ${dateParts.day}/${dateParts.month}/${dateParts.year}`,"success");
    return true;
  }

  function setSwitchStatus(message,type=""){
    const el=document.getElementById("tomorrowSwitchStatus");
    if(!el) return;
    el.textContent=message;
    el.className="tomorrow-switch-status"+(type?` ${type}`:"");
  }

  function autoEnabled(){return localStorage.getItem(AUTO_KEY)!=="0";}
  function notifyEnabled(){return localStorage.getItem(NOTIFY_KEY)==="1";}

  function refreshToggleButtons(){
    const autoBtn=document.getElementById("autoTomorrowToggle");
    const notifyBtn=document.getElementById("tomorrowNotifyToggle");
    if(autoBtn){
      const on=autoEnabled();
      autoBtn.textContent=on?"🟢 التبديل التلقائي: تشغيل":"⚪ التبديل التلقائي: إيقاف";
      autoBtn.classList.toggle("enabled",on);
    }
    if(notifyBtn){
      const on=notifyEnabled()&&typeof Notification!=="undefined"&&Notification.permission==="granted";
      notifyBtn.textContent=on?"🔔 التنبيه: تشغيل":"🔕 التنبيه: إيقاف";
      notifyBtn.classList.toggle("enabled",on);
    }
  }

  async function sendTomorrowNotification(){
    if(!notifyEnabled()||typeof Notification==="undefined"||Notification.permission!=="granted") return;
    try{
      if(navigator.serviceWorker?.ready){
        const reg=await navigator.serviceWorker.ready;
        await reg.showNotification("تقاويم الصلاة",{body:"تم تجهيز مواقيت اليوم التالي للمعاينة والنشر.",icon:"/assets/icons/app-icon.svg"});
      }else{
        new Notification("تقاويم الصلاة",{body:"تم تجهيز مواقيت اليوم التالي للمعاينة والنشر."});
      }
    }catch(error){console.error(error);}
  }

  async function evaluateAutoSwitch(force=false){
    if(!autoEnabled()||Date.now()<manualOverrideUntil) return;
    try{
      const now=baghdadNowParts();
      const today={year:now.year,month:now.month,day:now.day};
      const todayRow=await fetchAnnualPrayer(today.month,today.day);
      if(!todayRow){setSwitchStatus("تعذر قراءة وقت العشاء لليوم","error");return;}
      const isha=parseIshaMinutes(todayRow.isha);
      if(isha==null){setSwitchStatus("وقت العشاء غير صالح","error");return;}

      const nowMinutes=now.hour*60+now.minute;
      const switchMinutes=isha+35;
      const shouldTomorrow=nowMinutes>=switchMinutes;
      const desired=shouldTomorrow?"tomorrow":"today";
      const target=shouldTomorrow?addDays(today,1):today;

      const shownDay=Number(document.getElementById("gregorianDay")?.value);
      const shownMonth=((typeof GREGORIAN_MONTHS!=="undefined")?GREGORIAN_MONTHS:[]).indexOf(document.getElementById("gregorianMonth")?.value)+1;
      const shownYear=Number(document.getElementById("gregorianYear")?.value);
      const alreadyTarget=shownDay===target.day&&shownMonth===target.month&&shownYear===target.year;

      const switchHour=Math.floor(switchMinutes/60)%24;
      const switchMinute=switchMinutes%60;
      const switchText=`${String(switchHour).padStart(2,"0")}:${String(switchMinute).padStart(2,"0")}`;

      if(force||!alreadyTarget||lastAutoMode!==desired){
        const changed=await applyPreviewDate(target,shouldTomorrow?`تم عرض مواقيت اليوم التالي تلقائياً بعد العشاء بـ35 دقيقة`:`المعاينة تعرض مواقيت اليوم. التبديل التلقائي الساعة ${switchText}`);
        if(changed&&shouldTomorrow&&lastAutoMode&&lastAutoMode!=="tomorrow") sendTomorrowNotification();
      }else{
        setSwitchStatus(shouldTomorrow?"المعاينة الآن تعرض مواقيت اليوم التالي تلقائياً":`المعاينة تعرض مواقيت اليوم. التبديل التلقائي الساعة ${switchText}` ,"success");
      }
      lastAutoMode=desired;
    }catch(error){
      console.error("تعذر تنفيذ التبديل التلقائي",error);
      setSwitchStatus("تعذر تنفيذ التبديل التلقائي","error");
    }
  }

  async function showTomorrowManual(){
    const now=baghdadNowParts();
    manualOverrideUntil=Date.now()+10*60*1000;
    await applyPreviewDate(addDays({year:now.year,month:now.month,day:now.day},1),"تم عرض مواقيت اليوم التالي يدويًا");
  }

  async function showTodayManual(){
    const now=baghdadNowParts();
    manualOverrideUntil=Date.now()+10*60*1000;
    await applyPreviewDate({year:now.year,month:now.month,day:now.day},"تم الرجوع إلى مواقيت اليوم يدويًا");
  }

  function createSwitchPanel(mainPanel){
    let panel=document.getElementById("switchPanel");
    let button=mainPanel.querySelector('[data-open-panel="switchPanel"]');
    if(!button){
      button=document.createElement("button");
      button.type="button";
      button.className="main-action switch-action";
      button.dataset.openPanel="switchPanel";
      button.innerHTML="⏰ <span>التبديل والتنبيه</span>";
      mainPanel.appendChild(button);
    }
    if(!panel){
      panel=document.createElement("section");
      panel.id="switchPanel";
      panel.className="panel inline-control-panel";
      panel.innerHTML=`
        <div class="switch-help">يتم تجهيز صورة اليوم التالي تلقائيًا بعد وقت صلاة العشاء بـ 35 دقيقة.</div>
        <button type="button" id="autoTomorrowToggle" class="switch-control-btn"></button>
        <button type="button" id="tomorrowNotifyToggle" class="switch-control-btn"></button>
        <button type="button" id="showTomorrowNowBtn" class="switch-control-btn manual">➡ عرض اليوم التالي الآن</button>
        <button type="button" id="showTodayNowBtn" class="switch-control-btn manual secondary">↩ الرجوع إلى اليوم</button>
        <div id="tomorrowSwitchStatus" class="tomorrow-switch-status">جاري فحص وقت العشاء...</div>`;
      button.insertAdjacentElement("afterend",panel);
    }
    return {button,panel};
  }

  function initInlinePanels(){
    if(document.getElementById("inlinePanelStyles")) return;

    const sidebar=document.querySelector(".sidebar");
    const mainPanel=sidebar?.querySelector(".main-panel");
    if(!sidebar||!mainPanel) return;

    const fontPanel=document.querySelector(".font-panel");
    if(fontPanel&&!fontPanel.id) fontPanel.id="fontPanel";

    let fontButton=mainPanel.querySelector('[data-open-panel="fontPanel"]');
    if(fontPanel&&!fontButton){
      fontButton=document.createElement("button");
      fontButton.type="button";
      fontButton.className="main-action font-action";
      fontButton.dataset.openPanel="fontPanel";
      fontButton.innerHTML="🔤 <span>تنسيق الخط</span>";
      mainPanel.appendChild(fontButton);
    }

    createSwitchPanel(mainPanel);

    const pairs=[
      {button:'[data-open-panel="datePanel"]',panel:"datePanel"},
      {button:'[data-open-panel="prayerPanel"]',panel:"prayerPanel"},
      {button:'[data-open-panel="backgroundPanel"]',panel:"backgroundPanel"},
      {button:'[data-open-panel="footerPanel"]',panel:"footerPanel"},
      {button:'[data-open-panel="fontPanel"]',panel:"fontPanel"},
      {button:'[data-open-panel="switchPanel"]',panel:"switchPanel"}
    ];

    const style=document.createElement("style");
    style.id="inlinePanelStyles";
    style.textContent=`
      .main-action.font-action{background:#0f8b8d}.main-action.switch-action{background:#a26a13}
      .inline-control-panel{display:none!important;width:100%!important;margin:7px 0 3px!important;padding:12px!important;border:1px solid rgba(255,255,255,.14)!important;border-radius:9px!important;background:rgba(5,20,30,.78)!important;box-shadow:inset 0 1px 0 rgba(255,255,255,.04)!important}
      .inline-control-panel.inline-open{display:block!important}.inline-control-panel>.panel-title,.inline-control-panel>.font-title{display:none!important}.inline-control-panel.collapsed>*:not(.panel-title):not(.font-title){display:revert!important}.main-action.inline-active{filter:brightness(1.12);box-shadow:0 0 0 2px rgba(255,255,255,.16)}
      #fontPanel .font-controls{display:grid!important;grid-template-columns:1fr!important;gap:8px!important}#fontPanel label{margin-bottom:4px!important}
      .switch-help{font-size:12px;line-height:1.8;color:#d7e2e8;margin-bottom:9px;padding:8px;border-radius:7px;background:rgba(255,255,255,.045)}
      .switch-control-btn{width:100%;min-height:40px;margin:5px 0;border:1px solid rgba(255,255,255,.16);border-radius:8px;background:#263746;color:#fff;font-weight:700;cursor:pointer}.switch-control-btn.enabled{background:#147c49}.switch-control-btn.manual{background:#176f9f}.switch-control-btn.manual.secondary{background:#45515b}.tomorrow-switch-status{margin-top:8px;padding:8px;border-radius:7px;background:rgba(255,255,255,.05);font-size:12px;line-height:1.7;color:#dce6eb}.tomorrow-switch-status.success{border-right:3px solid #23b66d}.tomorrow-switch-status.error{border-right:3px solid #d34d4d}
      .sidebar>.drag-info{width:100%!important;margin:0!important;display:flex!important;flex-direction:column!important;gap:7px!important;padding:10px!important}.sidebar>.drag-info span{display:none!important}.sidebar>.drag-info button{width:100%!important;min-width:0!important}
      @media(max-width:800px){.sidebar{gap:8px!important}.sidebar>.main-panel{padding:10px!important}.inline-control-panel{padding:10px!important;margin:6px 0 2px!important}.inline-control-panel label{margin-bottom:10px!important;font-size:13px!important}.inline-control-panel select,.inline-control-panel input[type="text"],.inline-control-panel input[type="number"],.inline-control-panel textarea{min-height:40px!important;font-size:14px!important}.inline-control-panel textarea{min-height:76px!important}#fontPanel .font-controls{grid-template-columns:1fr!important}}
    `;
    document.head.appendChild(style);

    const closeAll=except=>{
      pairs.forEach(item=>{
        const btn=mainPanel.querySelector(item.button);const pnl=document.getElementById(item.panel);
        if(!pnl||pnl===except) return;
        pnl.classList.remove("inline-open","active-panel","collapsed");btn?.classList.remove("inline-active");
      });
    };

    pairs.forEach(item=>{
      const button=mainPanel.querySelector(item.button);const panel=document.getElementById(item.panel);
      if(!button||!panel) return;
      panel.classList.add("inline-control-panel");panel.classList.remove("active-panel","collapsed");button.insertAdjacentElement("afterend",panel);
      button.addEventListener("click",event=>{
        event.preventDefault();event.stopImmediatePropagation();
        const willOpen=!panel.classList.contains("inline-open");closeAll(panel);panel.classList.toggle("inline-open",willOpen);panel.classList.toggle("active-panel",willOpen);button.classList.toggle("inline-active",willOpen);
        if(willOpen&&window.innerWidth<=800) setTimeout(()=>button.scrollIntoView({behavior:"smooth",block:"start"}),40);
      },true);
    });

    const dragInfo=document.querySelector(".workspace .drag-info");if(dragInfo) sidebar.appendChild(dragInfo);

    document.getElementById("autoTomorrowToggle")?.addEventListener("click",()=>{
      localStorage.setItem(AUTO_KEY,autoEnabled()?"0":"1");manualOverrideUntil=0;refreshToggleButtons();if(autoEnabled()) evaluateAutoSwitch(true);else setSwitchStatus("التبديل التلقائي متوقف");
    });
    document.getElementById("tomorrowNotifyToggle")?.addEventListener("click",async()=>{
      if(notifyEnabled()){localStorage.setItem(NOTIFY_KEY,"0");refreshToggleButtons();return;}
      if(typeof Notification==="undefined"){setSwitchStatus("هذا المتصفح لا يدعم التنبيهات","error");return;}
      const permission=await Notification.requestPermission();
      if(permission==="granted"){localStorage.setItem(NOTIFY_KEY,"1");setSwitchStatus("تم تشغيل التنبيه","success");}else{localStorage.setItem(NOTIFY_KEY,"0");setSwitchStatus("لم يتم السماح بإشعارات التطبيق","error");}
      refreshToggleButtons();
    });
    document.getElementById("showTomorrowNowBtn")?.addEventListener("click",showTomorrowManual);
    document.getElementById("showTodayNowBtn")?.addEventListener("click",showTodayManual);

    refreshToggleButtons();
    setTimeout(()=>evaluateAutoSwitch(true),1400);
    setInterval(()=>evaluateAutoSwitch(false),60000);
    window.addEventListener("focus",()=>evaluateAutoSwitch(false));
    document.addEventListener("visibilitychange",()=>{if(!document.hidden) evaluateAutoSwitch(false)});
  }

  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",initInlinePanels,{once:true});
  else initInlinePanels();
})();
