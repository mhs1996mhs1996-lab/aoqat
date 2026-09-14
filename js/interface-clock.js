"use strict";
(function(){
  const STYLE_KEY="prayerDesignerInterfaceClockStylesV1";
  function pad(value){return String(value).padStart(2,"0");}
  function injectStyles(){
    if(document.getElementById("interfaceClockStyles"))return;
    const style=document.createElement("style");style.id="interfaceClockStyles";
    style.textContent=`
      .topbar.web-interface-header{direction:ltr!important;display:flex!important;align-items:center!important;justify-content:center!important;gap:18px!important;padding:8px 12px!important;min-height:48px!important}
      .topbar.web-interface-header .interface-clock-card,.topbar.web-interface-header .interface-date-card{min-width:0;display:flex!important;align-items:center!important;gap:7px!important;padding:7px 11px!important;border:1px solid rgba(255,255,255,.14)!important;border-radius:11px!important;background:linear-gradient(145deg,rgba(20,39,51,.94),rgba(8,24,35,.94))!important;box-shadow:0 4px 14px rgba(0,0,0,.14)!important}
      .topbar.web-interface-header #saveToPhoneBtn{margin:0!important;flex:0 0 auto!important}
      .interface-clock-icon,.interface-date-icon{font-size:14px!important;line-height:1!important;opacity:.92}
      #liveClockTime{display:flex!important;align-items:baseline!important;gap:5px!important;direction:ltr!important;color:#f8fbfd;font-size:17px;font-weight:800;line-height:1.1;font-variant-numeric:tabular-nums;white-space:nowrap}
      #liveClockDate{display:flex!important;flex-direction:row!important;align-items:center!important;gap:4px!important;direction:ltr!important;color:#dfe8ed;font-size:14px;font-weight:700;line-height:1.1;font-variant-numeric:tabular-nums;white-space:nowrap}
      #liveClockDate .interface-date-sep{opacity:.52;font-weight:500}
      @media(max-width:600px){.topbar.web-interface-header{gap:8px!important;padding:6px 5px!important}.topbar.web-interface-header .interface-clock-card,.topbar.web-interface-header .interface-date-card{padding:6px 7px!important;gap:4px!important}.interface-clock-icon,.interface-date-icon{display:none!important}#liveClockTime{font-size:12.5px}#liveClockDate{font-size:11px}}
    `;document.head.appendChild(style);
  }
  function makeClock(){const d=document.createElement("div");d.className="interface-clock-card";d.setAttribute("aria-label","الساعة الحالية");d.innerHTML='<div class="interface-clock-icon" aria-hidden="true">◷</div><div id="liveClockTime"><div id="liveClockDigits">12:00:00</div><div id="liveClockPeriod">ص</div></div>';return d;}
  function makeDate(){const d=document.createElement("div");d.className="interface-date-card";d.setAttribute("aria-label","تاريخ اليوم");d.innerHTML='<div class="interface-date-icon" aria-hidden="true">▣</div><div id="liveClockDate"><div id="liveDateDay">01</div><div class="interface-date-sep">/</div><div id="liveDateMonth">01</div><div class="interface-date-sep">/</div><div id="liveDateYear">2026</div></div>';return d;}
  function buildHeader(){
    const header=document.querySelector(".topbar");if(!header)return false;
    header.classList.add("web-interface-header");
    header.querySelectorAll(".brand,.interface-clock-card,.interface-date-card").forEach(x=>x.remove());
    const save=header.querySelector("#saveToPhoneBtn,#exportBtn");
    const clock=makeClock(),date=makeDate();
    header.insertBefore(clock,header.firstChild);
    if(save)header.insertBefore(date,save.nextSibling);else{header.appendChild(date);}
    return true;
  }
  function ensureOrder(){
    const header=document.querySelector(".topbar.web-interface-header");if(!header)return;
    const clock=header.querySelector(".interface-clock-card"),save=header.querySelector("#saveToPhoneBtn,#exportBtn"),date=header.querySelector(".interface-date-card");
    if(clock&&save&&date){header.append(clock,save,date);}
  }
  function updateClock(){const now=new Date();let hour=now.getHours();const period=hour<12?"ص":"م";hour=((hour+11)%12)+1;const digits=document.getElementById("liveClockDigits"),periodEl=document.getElementById("liveClockPeriod"),day=document.getElementById("liveDateDay"),month=document.getElementById("liveDateMonth"),year=document.getElementById("liveDateYear");if(digits)digits.textContent=`${pad(hour)}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;if(periodEl)periodEl.textContent=period;if(day)day.textContent=pad(now.getDate());if(month)month.textContent=pad(now.getMonth()+1);if(year)year.textContent=String(now.getFullYear());}
  function addFontOptions(){const select=document.getElementById("elementSelect");if(!select)return;[["#liveClockTime","الساعة — للتحكم بخط الساعة"],["#liveClockDate","التاريخ — للتحكم بخط التاريخ"]].forEach(([value,label])=>{if(!Array.from(select.options).some(o=>o.value===value))select.add(new Option(label,value));});}
  function init(){injectStyles();if(!buildHeader())return;addFontOptions();updateClock();setTimeout(ensureOrder,100);setTimeout(ensureOrder,700);setInterval(updateClock,1000);document.addEventListener("visibilitychange",()=>{if(!document.hidden)updateClock();});window.addEventListener("aoqatModulesReady",ensureOrder);}
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});else init();
})();