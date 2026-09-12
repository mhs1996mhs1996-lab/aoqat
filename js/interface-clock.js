"use strict";
(function(){
  const STYLE_KEY="prayerDesignerInterfaceClockStylesV1";

  function pad(value){return String(value).padStart(2,"0");}

  function injectStyles(){
    if(document.getElementById("interfaceClockStyles"))return;
    const style=document.createElement("style");
    style.id="interfaceClockStyles";
    style.textContent=`
      .preview-header.live-interface-header{
        direction:rtl!important;
        display:flex!important;
        align-items:center!important;
        justify-content:space-between!important;
        gap:12px!important;
        padding:8px 8px 12px!important;
      }
      .interface-clock-card,.interface-date-card{
        min-width:0;
        display:flex!important;
        align-items:center!important;
        gap:8px!important;
        padding:7px 12px!important;
        border:1px solid rgba(255,255,255,.14)!important;
        border-radius:12px!important;
        background:linear-gradient(145deg,rgba(20,39,51,.94),rgba(8,24,35,.94))!important;
        box-shadow:0 6px 18px rgba(0,0,0,.16)!important;
      }
      .interface-clock-icon,.interface-date-icon{
        flex:0 0 auto;
        font-size:15px!important;
        line-height:1!important;
        opacity:.92;
      }
      #liveClockTime{
        display:flex!important;
        align-items:baseline!important;
        gap:5px!important;
        direction:ltr!important;
        color:#f8fbfd;
        font-size:18px;
        font-weight:800;
        line-height:1.1;
        font-variant-numeric:tabular-nums;
        white-space:nowrap;
      }
      #liveClockDigits,#liveClockPeriod{display:block!important;white-space:nowrap!important}
      #liveClockPeriod{font-size:.72em;font-weight:800}
      #liveClockDate{
        display:flex!important;
        flex-direction:row-reverse!important;
        align-items:center!important;
        gap:5px!important;
        direction:ltr!important;
        color:#dfe8ed;
        font-size:15px;
        font-weight:700;
        line-height:1.1;
        font-variant-numeric:tabular-nums;
        white-space:nowrap;
      }
      #liveClockDate .interface-date-part,#liveClockDate .interface-date-sep{display:block!important;white-space:nowrap!important}
      #liveClockDate .interface-date-sep{opacity:.52;font-weight:500}
      @media(max-width:800px){
        .preview-header.live-interface-header{padding:5px 3px 7px!important;gap:7px!important}
        .interface-clock-card,.interface-date-card{padding:6px 8px!important;border-radius:10px!important;gap:5px!important}
        .interface-clock-icon,.interface-date-icon{font-size:12px!important}
        #liveClockTime{font-size:14px}
        #liveClockDate{font-size:12px}
      }
      @media(max-width:420px){
        .preview-header.live-interface-header{display:flex!important;gap:5px!important}
        .interface-clock-card,.interface-date-card{display:flex!important;padding:5px 7px!important;gap:4px!important}
        #liveClockTime{display:flex!important;font-size:12.5px}
        #liveClockDate{display:flex!important;font-size:10.5px}
        #liveClockDate .interface-date-part,#liveClockDate .interface-date-sep,#liveClockDigits,#liveClockPeriod{display:block!important}
      }
    `;
    document.head.appendChild(style);
  }

  function buildHeader(){
    const header=document.querySelector(".preview-header");
    if(!header)return false;
    header.classList.add("live-interface-header");
    header.innerHTML=`
      <div class="interface-clock-card" aria-label="الساعة الحالية">
        <div class="interface-clock-icon" aria-hidden="true">◷</div>
        <div id="liveClockTime"><div id="liveClockDigits">12:00:00</div><div id="liveClockPeriod">ص</div></div>
      </div>
      <div class="interface-date-card" aria-label="تاريخ اليوم">
        <div class="interface-date-icon" aria-hidden="true">▣</div>
        <div id="liveClockDate">
          <div id="liveDateDay" class="interface-date-part">01</div>
          <div class="interface-date-sep">/</div>
          <div id="liveDateMonth" class="interface-date-part">01</div>
          <div class="interface-date-sep">/</div>
          <div id="liveDateYear" class="interface-date-part">2026</div>
        </div>
      </div>`;
    return true;
  }

  function updateClock(){
    const now=new Date();
    let hour=now.getHours();
    const period=hour<12?"ص":"م";
    hour=((hour+11)%12)+1;
    const digits=document.getElementById("liveClockDigits");
    const periodEl=document.getElementById("liveClockPeriod");
    const day=document.getElementById("liveDateDay");
    const month=document.getElementById("liveDateMonth");
    const year=document.getElementById("liveDateYear");
    if(digits)digits.textContent=`${pad(hour)}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
    if(periodEl)periodEl.textContent=period;
    if(day)day.textContent=pad(now.getDate());
    if(month)month.textContent=pad(now.getMonth()+1);
    if(year)year.textContent=String(now.getFullYear());
  }

  function addFontOptions(){
    const select=document.getElementById("elementSelect");
    if(!select)return;
    const entries=[
      ["#liveClockTime","الساعة — للتحكم بخط الساعة"],
      ["#liveClockDate","التاريخ — للتحكم بخط التاريخ"]
    ];
    entries.forEach(([value,label],index)=>{
      if(Array.from(select.options).some(option=>option.value===value))return;
      const option=new Option(label,value);
      const anchor=select.options[Math.min(index+1,select.options.length)]||null;
      select.insertBefore(option,anchor);
    });
  }

  function readSaved(){
    try{return JSON.parse(localStorage.getItem(STYLE_KEY)||"{}")||{};}catch(_){return {};}
  }

  function saveTargetStyle(selector){
    const el=document.querySelector(selector);
    if(!el)return;
    const state=readSaved();
    state[selector]={
      fontFamily:el.style.fontFamily||"",
      fontSize:el.style.fontSize||"",
      fontWeight:el.style.fontWeight||"",
      color:el.style.color||"",
      textAlign:el.style.textAlign||"",
      textShadow:el.style.textShadow||""
    };
    try{localStorage.setItem(STYLE_KEY,JSON.stringify(state));}catch(_){ }
  }

  function restoreStyles(){
    const state=readSaved();
    ["#liveClockTime","#liveClockDate"].forEach(selector=>{
      const el=document.querySelector(selector),saved=state[selector];
      if(!el||!saved)return;
      Object.entries(saved).forEach(([key,value])=>{if(value)el.style[key]=value;});
    });
  }

  function currentClockSelector(){
    const selected=document.getElementById("elementSelect")?.value;
    return selected==="#liveClockTime"||selected==="#liveClockDate"?selected:null;
  }

  function bindFontPersistence(){
    if(document.documentElement.dataset.interfaceClockFontBound==="1")return;
    document.documentElement.dataset.interfaceClockFontBound="1";
    const controlIds=new Set(["fontFamily","fontSize","fontWeight","fontColor","textAlign","textShadow"]);
    const saveIfClock=event=>{
      if(!controlIds.has(event.target?.id))return;
      const selected=currentClockSelector();
      if(!selected)return;
      setTimeout(()=>saveTargetStyle(selected),0);
    };
    document.addEventListener("input",saveIfClock,true);
    document.addEventListener("change",saveIfClock,true);
    document.addEventListener("click",event=>{
      const swatch=event.target?.closest?.("#designColorPalette .palette-color");
      const selected=currentClockSelector();
      if(!swatch||!selected)return;
      const target=document.querySelector(selected);
      const color=swatch.dataset.color;
      if(target&&color){
        target.style.color=color;
        const input=document.getElementById("fontColor");
        if(input)input.value=color;
        saveTargetStyle(selected);
      }
    });
  }

  function init(){
    injectStyles();
    if(!buildHeader())return;
    addFontOptions();
    restoreStyles();
    bindFontPersistence();
    updateClock();
    setInterval(updateClock,1000);
    document.addEventListener("visibilitychange",()=>{if(!document.hidden)updateClock();});
  }

  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});else init();
})();
