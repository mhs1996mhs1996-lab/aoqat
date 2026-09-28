"use strict";
(function(){
  function apply(){
    const main=document.querySelector(".sidebar .main-panel");
    if(!main)return false;
    const appearance=document.getElementById("webAppearanceBtn");
    const appearancePanel=document.getElementById("webThemePanel");
    const interfaceGroup=document.getElementById("backgroundFontGroup");
    const dataGroup=document.getElementById("datePrayerGroup");
    const interfaceBtn=document.getElementById("backgroundFontMainBtn");
    const dataBtn=document.getElementById("datePrayerMainBtn");

    // Reorder only the existing top-level nodes. Nothing is cloned/replaced,
    // therefore all original click handlers and IDs stay untouched.
    // Reference order: location, language, sound, settings, appearance, night mode,
    // social, calendar, contact. Existing controls keep their original handlers.
    [dataGroup,interfaceGroup,appearance,appearancePanel].filter(Boolean).forEach(el=>main.appendChild(el));

    if(appearance){
      appearance.innerHTML='<span aria-hidden="true">🎨</span><span>شكل التطبيق</span>';
      appearance.classList.add("web-reference-menu-item");
    }
    if(interfaceGroup){
      const b=interfaceBtn;
      if(b){b.innerHTML='⚙️ <span>الإعدادات</span><span class="group-arrow">▼</span>';b.classList.add("web-reference-menu-item");}
    }
    if(dataGroup){
      const b=dataBtn;
      if(b){b.innerHTML='📍 <span>الحويجة</span><span class="group-arrow">▼</span>';b.classList.add("web-reference-menu-item");}
    }

    if(!document.getElementById("webReferenceMenuStyles")){
      const s=document.createElement("style");s.id="webReferenceMenuStyles";s.textContent=`
        body.design-menu-open .sidebar .main-panel{width:min(86vw,330px)!important;max-width:min(86vw,330px)!important;padding:9px!important;border-radius:14px!important}
        body.design-menu-open .sidebar .main-panel>h2{font-size:18px!important;text-align:center!important;margin:0 0 8px!important}
        body.design-menu-open .sidebar .main-panel>.web-reference-menu-item,
        body.design-menu-open #backgroundFontGroup>#backgroundFontMainBtn,
        body.design-menu-open #datePrayerGroup>#datePrayerMainBtn{
          width:100%!important;max-width:100%!important;height:42px!important;min-height:42px!important;
          margin:0 0 7px!important;padding:7px 11px!important;border-radius:10px!important;
          font-size:15px!important;font-weight:800!important;display:flex!important;align-items:center!important;
          justify-content:flex-start!important;gap:8px!important;box-sizing:border-box!important
        }
        body.design-menu-open #backgroundFontGroup,body.design-menu-open #datePrayerGroup{
          width:100%!important;max-width:100%!important;margin:0 0 7px!important;padding:0!important;border:0!important;background:transparent!important
        }
        body.design-menu-open #webThemePanel{width:100%!important;max-width:100%!important;margin:0 0 8px!important}
        body.design-menu-open #backgroundFontGroup>#backgroundFontMainBtn{background:transparent!important;color:var(--wt-text,#173743)!important;border:0!important;border-bottom:1px solid rgba(120,120,120,.18)!important;border-radius:0!important}
        body.design-menu-open #datePrayerGroup>#datePrayerMainBtn{background:transparent!important;color:var(--wt-text,#173743)!important;border:0!important;border-bottom:1px solid rgba(120,120,120,.18)!important;border-radius:0!important}
        body.design-menu-open #webAppearanceBtn{background:transparent!important;color:var(--wt-text,#173743)!important;border:0!important;border-bottom:1px solid rgba(120,120,120,.18)!important;border-radius:0!important}
      `;document.head.appendChild(s);
    }
    return !!(appearance&&interfaceGroup&&dataGroup);
  }
  function start(){
    let n=0;const t=setInterval(()=>{n++;if(apply()||n>80)clearInterval(t)},150);apply();
    window.addEventListener("aoqatModulesReady",()=>setTimeout(apply,80));
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start,{once:true});else start();
})();