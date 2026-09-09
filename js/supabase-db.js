"use strict";

const SUPABASE_URL = "https://ytdvhiijxxaqofduorwm.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_dQRoxdwRJDDgWLze1U4ZqA_aaVlKC-1";

const GREGORIAN_MONTHS = ["كانون الثاني","شباط","آذار","نيسان","أيار","حزيران","تموز","آب","أيلول","تشرين الأول","تشرين الثاني","كانون الأول"];
const ARABIC_DAY_NAMES = ["الأحد","الاثنين","الثلاثاء","الأربعاء","الخميس","الجمعة","السبت"];

function dbStatus(message, type = "") {
    const el = document.getElementById("databaseStatus");
    if (!el) return;
    el.textContent = message;
    el.className = "database-status" + (type ? " " + type : "");
}
function dbHeaders(extra = {}) { return {apikey:SUPABASE_PUBLISHABLE_KEY,Authorization:`Bearer ${SUPABASE_PUBLISHABLE_KEY}`,"Content-Type":"application/json",...extra}; }
function setSelectValue(id,value){const el=document.getElementById(id);if(!el)return false;const wanted=String(value);const exists=Array.from(el.options||[]).some(o=>o.value===wanted);if(exists){el.value=wanted;return true;}return false;}
function setTodayDateAutomatically(){const now=new Date();const day=now.getDate(),monthIndex=now.getMonth(),year=now.getFullYear(),dayName=ARABIC_DAY_NAMES[now.getDay()];setSelectValue("gregorianDay",day);setSelectValue("gregorianMonth",GREGORIAN_MONTHS[monthIndex]);setSelectValue("gregorianYear",year);setSelectValue("dayName",dayName);if(typeof updateAll==="function")updateAll();return{day,month:monthIndex+1,year,dayName};}
async function loadPrayerFromDatabase(silent=false){try{if(!silent)dbStatus("جاري تحميل مواقيت اليوم...");const monthName=document.getElementById("gregorianMonth")?.value;const month=GREGORIAN_MONTHS.indexOf(monthName)+1;const day=Number(document.getElementById("gregorianDay")?.value);if(!month||!day)throw new Error("التاريخ الميلادي غير مكتمل");const url=new URL(`${SUPABASE_URL}/rest/v1/annual_prayer_times`);url.searchParams.set("select","*");url.searchParams.set("gregorian_month",`eq.${month}`);url.searchParams.set("gregorian_day",`eq.${day}`);url.searchParams.set("limit","1");const response=await fetch(url,{headers:dbHeaders()});if(!response.ok)throw new Error(await response.text());const rows=await response.json();if(!rows.length){dbStatus("لا توجد مواقيت محفوظة لهذا التاريخ","error");return false;}const row=rows[0];const values={fajr:row.fajr,sunrise:row.sunrise,dhuhr:row.dhuhr,asr:row.asr,maghrib:row.maghrib,isha:row.isha};Object.entries(values).forEach(([id,value])=>{const el=document.getElementById(id);if(el&&value!=null)el.value=String(value);});if(typeof updateAll==="function")updateAll();dbStatus("تم تحميل مواقيت تاريخ اليوم تلقائياً ✓","success");return true;}catch(error){console.error(error);dbStatus("تعذر تحميل مواقيت اليوم","error");if(!silent)alert("تعذر تحميل المواقيت من قاعدة البيانات. تحقق من اتصال الإنترنت.");return false;}}
function currentAnnualPrayerRecord(){const monthName=document.getElementById("gregorianMonth").value;return{gregorian_day:Number(document.getElementById("gregorianDay").value),gregorian_month:GREGORIAN_MONTHS.indexOf(monthName)+1,fajr:document.getElementById("fajr").value,sunrise:document.getElementById("sunrise").value,dhuhr:document.getElementById("dhuhr").value,asr:document.getElementById("asr").value,maghrib:document.getElementById("maghrib").value,isha:document.getElementById("isha").value};}
async function savePrayerToDatabase(){try{dbStatus("جاري الحفظ...");const record=currentAnnualPrayerRecord();const response=await fetch(`${SUPABASE_URL}/rest/v1/annual_prayer_times?on_conflict=gregorian_month,gregorian_day`,{method:"POST",headers:dbHeaders({Prefer:"resolution=merge-duplicates,return=representation"}),body:JSON.stringify(record)});if(!response.ok)throw new Error(await response.text());dbStatus("تم حفظ المواقيت في قاعدة البيانات ✓","success");}catch(error){console.error(error);dbStatus("تعذر الحفظ","error");alert("تعذر الحفظ في قاعدة البيانات.");}}
function setupAutomaticDateChangeLoading(){document.getElementById("gregorianDay")?.addEventListener("change",()=>loadPrayerFromDatabase(true));document.getElementById("gregorianMonth")?.addEventListener("change",()=>loadPrayerFromDatabase(true));}

/* عرض الهاتف: نستخدم zoom بدل transform حتى تبقى المعاينة ظاهرة ومكانها صحيح */
function setupMobileResponsiveView(){
    if(document.getElementById("mobileResponsiveStyles")) return;

    const style=document.createElement("style");
    style.id="mobileResponsiveStyles";
    style.textContent=`
      @media(max-width:800px){
        html,body{overflow-x:hidden!important}
        .topbar{min-height:auto!important;padding:9px 10px!important;gap:8px!important}
        .brand{gap:8px!important;min-width:0!important}.brand-icon{font-size:27px!important}.brand h1{font-size:17px!important;margin:0!important;white-space:nowrap}.brand p{display:none!important}
        .top-export{padding:9px 11px!important;font-size:13px!important;white-space:nowrap}
        .app{width:100%!important;padding:6px!important;gap:8px!important;grid-template-columns:1fr!important}
        .workspace,.sidebar{width:100%!important;min-width:0!important}.workspace{order:1!important}.sidebar{order:2!important}
        .preview-header{padding:5px 3px 7px!important}.preview-header h2{font-size:16px!important}.preview-header span{font-size:10px!important}
        .previewBox{width:100%!important;min-height:0!important;height:auto!important;padding:6px!important;overflow:hidden!important;display:block!important;text-align:center!important}
        .design{margin:0 auto!important;transform:none!important;transform-origin:top center!important}
        .panel{padding:10px!important}.panel h2,.font-title h2{font-size:16px!important}
        .main-action{height:40px!important;font-size:14px!important}label{font-size:12px!important}select,input[type=number],input[type=text],textarea{min-height:34px!important;font-size:13px!important}
        .font-controls{grid-template-columns:1fr 1fr!important}.drag-info{min-height:0!important;flex-direction:column!important;align-items:stretch!important}#resetPositions{width:100%!important;min-width:0!important}
      }
      @media(max-width:420px){.brand h1{font-size:15px!important}.brand-icon{font-size:23px!important}.preview-header span{display:none!important}.font-controls{grid-template-columns:1fr!important}}
    `;
    document.head.appendChild(style);

    const previewBox=document.querySelector(".previewBox");
    const design=document.getElementById("design");
    if(!previewBox||!design) return;

    const DESIGN_WIDTH=1024;

    const resize=()=>{
      if(window.innerWidth>800){
        design.style.zoom="1";
        design.style.transform="none";
        design.style.margin="0 auto";
        return;
      }

      const cs=getComputedStyle(previewBox);
      const padding=parseFloat(cs.paddingLeft||0)+parseFloat(cs.paddingRight||0);
      const available=Math.max(220, previewBox.clientWidth-padding-2);
      const scale=Math.min(1, available/DESIGN_WIDTH);

      design.style.transform="none";
      design.style.zoom=String(scale);
      design.style.margin="0 auto";
    };

    resize();
    requestAnimationFrame(resize);
    setTimeout(resize,150);
    setTimeout(resize,500);
    window.addEventListener("resize",resize,{passive:true});
    window.addEventListener("orientationchange",()=>setTimeout(resize,150),{passive:true});
    document.fonts?.ready?.then(resize).catch(()=>{});
}

async function setupSupabaseDatabase(){document.getElementById("savePrayerDbBtn")?.addEventListener("click",savePrayerToDatabase);document.getElementById("loadPrayerDbBtn")?.addEventListener("click",()=>loadPrayerFromDatabase(false));setupAutomaticDateChangeLoading();setupMobileResponsiveView();setTodayDateAutomatically();await loadPrayerFromDatabase(true);}
