"use strict";
(function(){
  const ROWS=[
    ["location","📍","الحويجة"],["language","🌐","اللغة"],["sound","🔊","الصوت"],
    ["settings","⚙️","الإعدادات"],["appearance","🎨","شكل التطبيق"],["night","🌙","الوضع الليلي"],
    ["savePhone","📱","حفظ على الهاتف"]
  ];
  function style(){
    if(document.getElementById("webDrawerExactStyles"))return;
    const s=document.createElement("style");s.id="webDrawerExactStyles";s.textContent=`
    body.design-menu-open .sidebar .main-panel{position:fixed!important;top:0!important;right:0!important;bottom:0!important;left:auto!important;width:min(78vw,355px)!important;max-width:355px!important;height:100dvh!important;overflow-y:auto!important;padding:0!important;margin:0!important;border:0!important;border-radius:0!important;background:#fff!important;color:#111!important;box-shadow:-12px 0 28px #0004!important;z-index:10020!important}
    body.design-menu-open .sidebar .main-panel>h2{height:78px!important;margin:0!important;padding:25px 20px 12px!important;text-align:right!important;font-size:23px!important;color:#42add0!important;border-bottom:1px solid #ddd!important;background:#fff!important}
    #webExactDrawer{display:none} body.design-menu-open #webExactDrawer{display:block!important;background:#fff!important}
    body.design-menu-open .sidebar .main-panel>#datePrayerGroup,body.design-menu-open .sidebar .main-panel>#backgroundFontGroup,body.design-menu-open .sidebar .main-panel>#webAppearanceBtn,body.design-menu-open .sidebar .main-panel>#webThemePanel,body.design-menu-open .sidebar .main-panel>#topExportJpg{display:none!important}
    .web-drawer-row{width:100%!important;height:64px!important;margin:0!important;padding:0 24px!important;border:0!important;border-bottom:1px solid #e2e2e2!important;border-radius:0!important;background:#fff!important;color:#111!important;display:flex!important;align-items:center!important;justify-content:flex-start!important;gap:18px!important;font-size:18px!important;font-weight:500!important;text-align:right!important;box-shadow:none!important}
    .web-drawer-row .ico{width:30px!important;font-size:24px!important;text-align:center!important;filter:grayscale(1);opacity:.65}.web-drawer-row .txt{flex:1!important}.web-drawer-sep{height:12px;background:#fafafa;border-bottom:1px solid #ddd}.web-drawer-title{padding:14px 24px 7px;color:#888;font-size:14px;background:#fff}.web-drawer-contact .web-drawer-row{height:58px!important;font-size:16px!important}
    #webDrawerThemeHost{display:none;padding:10px;background:#fff;border-bottom:1px solid #ddd}#webDrawerThemeHost.open{display:block}
    body.design-menu-open #webDrawerThemeHost #webThemePanel{display:block!important;position:static!important;width:100%!important;margin:0!important;background:#fff!important;color:#111!important;border:0!important}
    body.design-menu-open #webDrawerThemeHost #webThemePanel[hidden]{display:block!important}
    `;document.head.appendChild(s);
  }
  function openOriginal(id){
    const g=document.getElementById(id);if(!g)return;
    const b=g.querySelector(":scope > button");if(b)b.click();
  }
  function install(){
    const main=document.querySelector(".sidebar .main-panel");if(!main)return false;style();
    if(document.getElementById("webExactDrawer"))return true;
    const drawer=document.createElement("div");drawer.id="webExactDrawer";
    ROWS.forEach(([id,icon,label])=>{
      const b=document.createElement("button");b.type="button";b.className="web-drawer-row";b.dataset.drawer=id;
      b.innerHTML='<span class="ico">'+icon+'</span><span class="txt">'+label+'</span>';drawer.appendChild(b);
    });
    const themeHost=document.createElement("div");themeHost.id="webDrawerThemeHost";drawer.appendChild(themeHost);
    main.appendChild(drawer);
    drawer.addEventListener("click",e=>{
      const b=e.target.closest("[data-drawer]");if(!b)return;
      const id=b.dataset.drawer;
      if(id==="location"){openOriginal("datePrayerGroup");return;}
      if(id==="settings"){openOriginal("backgroundFontGroup");return;}
      if(id==="savePhone"){
        const save=document.getElementById("topExportJpg")||document.getElementById("exportBtn")||document.querySelector('[data-export-format="jpg"]')||document.querySelector('[data-export-format="png"]');
        if(save)save.click();
        return;
      }
      if(id==="appearance"){
        const p=document.getElementById("webThemePanel");if(p){themeHost.appendChild(p);p.hidden=false;themeHost.classList.toggle("open");}
        return;
      }
      if(id==="night"){
        const current=document.body.dataset.webTheme==="dark-night";
        const cards=document.querySelectorAll("#webThemePanel .wt-card");
        const target=[...cards].find(x=>x.dataset.theme===(current?"cream-blue":"dark-night"));if(target)target.click();
      }
    });
    return true;
  }
  function start(){let n=0;const t=setInterval(()=>{if(install()||++n>80)clearInterval(t)},150);install();window.addEventListener("aoqatModulesReady",()=>setTimeout(install,100));}
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start,{once:true});else start();
})();