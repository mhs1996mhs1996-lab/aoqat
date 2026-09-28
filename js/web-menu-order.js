"use strict";
(function(){
  const ROWS=[
    ["location","📍","الحويجة"],
    ["language","🌐","اللغة"],
    ["sound","🔊","الصوت"],
    ["settings","⚙️","الإعدادات"],
    ["appearance","🎨","شكل التطبيق"],
    ["night","🌙","الوضع الليلي"],
    ["savePhone","📱","حفظ على الهاتف"]
  ];

  function addStyles(){
    if(document.getElementById("webDrawerExactStyles"))return;
    const s=document.createElement("style");s.id="webDrawerExactStyles";s.textContent=`
      body.design-menu-open .sidebar .main-panel{position:fixed!important;top:0!important;right:0!important;bottom:0!important;left:auto!important;width:min(78vw,355px)!important;max-width:355px!important;height:100dvh!important;overflow-y:auto!important;padding:0!important;margin:0!important;border:0!important;border-radius:0!important;background:#fff!important;color:#111!important;box-shadow:-12px 0 28px #0004!important;z-index:10020!important}
      body.design-menu-open .sidebar .main-panel>h2{height:78px!important;margin:0!important;padding:25px 20px 12px!important;text-align:right!important;font-size:23px!important;color:#42add0!important;border-bottom:1px solid #ddd!important;background:#fff!important}
      #webExactDrawer{display:none}body.design-menu-open #webExactDrawer{display:block!important;background:#fff!important}
      body.design-menu-open .sidebar .main-panel>#datePrayerGroup,body.design-menu-open .sidebar .main-panel>#backgroundFontGroup,body.design-menu-open .sidebar .main-panel>#webAppearanceBtn,body.design-menu-open .sidebar .main-panel>#webThemePanel,body.design-menu-open .sidebar .main-panel>#topExportJpg{display:none!important}
      .web-drawer-row{width:100%!important;height:64px!important;margin:0!important;padding:0 24px!important;border:0!important;border-bottom:1px solid color-mix(in srgb,var(--wt-border,#d9c8a8) 70%,#fff)!important;border-radius:0!important;background:linear-gradient(90deg,var(--wt-surface,#fffaf0),var(--wt-surface2,#f8efd9))!important;color:var(--wt-text,#3f3425)!important;display:flex!important;align-items:center!important;justify-content:flex-start!important;gap:18px!important;font-size:18px!important;font-weight:600!important;text-align:right!important;box-shadow:none!important}
      .web-drawer-row:nth-child(odd){background:linear-gradient(90deg,var(--wt-surface2,#f8efd9),var(--wt-surface,#fffaf0))!important}
      .web-drawer-row .ico{width:30px!important;font-size:24px!important;text-align:center!important}.web-drawer-row .txt{flex:1!important}
      #webDrawerPanelHost{display:none!important;background:#fff!important;padding:8px!important;border-bottom:1px solid #ddd!important}
      #webDrawerPanelHost.open{display:block!important}
      body.design-menu-open #webDrawerPanelHost .inline-control-panel{display:block!important;position:static!important;width:100%!important;height:auto!important;min-height:0!important;margin:0!important;padding:10px!important;background:var(--wt-surface,#fffaf0)!important;color:var(--wt-text,#222)!important;border:1px solid var(--wt-border,#ddd)!important;border-radius:8px!important}
      body.design-menu-open #webDrawerPanelHost .inline-control-panel>.design-popup-close{display:none!important}
      #webDrawerThemeHost{display:none!important;padding:10px;background:#fff;border-bottom:1px solid #ddd}#webDrawerThemeHost.open{display:block!important}
      body.design-menu-open #webDrawerThemeHost #webThemePanel{display:block!important;position:static!important;width:100%!important;margin:0!important;background:var(--wt-surface,#fff)!important;color:var(--wt-text,#111)!important;border:0!important}
      #saveToPhoneBtn{display:none!important}
    `;document.head.appendChild(s);
  }

  function closeHosts(){
    const ph=document.getElementById("webDrawerPanelHost"),th=document.getElementById("webDrawerThemeHost");
    if(ph){ph.classList.remove("open");const p=ph.querySelector(".inline-control-panel");if(p){p.classList.remove("inline-open","active-panel");const home=document.querySelector(".sidebar .main-panel");if(home)home.appendChild(p);}}
    if(th)th.classList.remove("open");
  }

  function showOriginalPanel(panelId){
    const panel=document.getElementById(panelId),host=document.getElementById("webDrawerPanelHost");
    if(!panel||!host)return false;
    closeHosts();
    host.appendChild(panel);
    panel.classList.add("inline-control-panel","inline-open","active-panel");
    host.classList.add("open");
    return true;
  }

  function showSettings(){
    const host=document.getElementById("webDrawerPanelHost");
    if(!host)return;
    closeHosts();host.innerHTML="";
    const wrap=document.createElement("div");wrap.className="inline-control-panel inline-open active-panel";
    wrap.innerHTML='<div style="display:grid;gap:7px"><button type="button" class="main-action" data-old="background">🎨 <span>واجهة البرنامج</span></button><button type="button" class="main-action" data-old="font">🔤 <span>تنسيق الخط</span></button><button type="button" class="main-action" data-old="switch">⏰ <span>التبديل والتنبيه</span></button><button type="button" class="main-action" data-old="footer">✍ <span>النص السفلي</span></button><button type="button" class="main-action" data-old="date">📅 <span>بيانات التاريخ</span></button><button type="button" class="main-action" data-old="prayer">🕌 <span>أوقات الصلاة</span></button></div>';
    host.appendChild(wrap);host.classList.add("open");
    wrap.addEventListener("click",e=>{const b=e.target.closest("[data-old]");if(!b)return;const map={background:"backgroundPanel",font:"fontPanel",switch:"switchPanel",footer:"footerPanel",date:"datePanel",prayer:"prayerPanel"};showOriginalPanel(map[b.dataset.old]);});
  }

  function savePhone(){
    const exportBtn=document.getElementById("topExportJpg")||document.querySelector('[data-export-format="jpg"]');
    if(exportBtn){exportBtn.click();return;}
    const old=document.getElementById("saveToPhoneBtn");if(old)old.click();
  }

  function install(){
    const main=document.querySelector(".sidebar .main-panel");if(!main)return false;addStyles();
    let drawer=document.getElementById("webExactDrawer");
    if(!drawer){
      drawer=document.createElement("div");drawer.id="webExactDrawer";
      ROWS.forEach(([id,icon,label])=>{const b=document.createElement("button");b.type="button";b.className="web-drawer-row";b.dataset.drawer=id;b.innerHTML='<span class="ico">'+icon+'</span><span class="txt">'+label+'</span>';drawer.appendChild(b);});
      const panelHost=document.createElement("div");panelHost.id="webDrawerPanelHost";drawer.appendChild(panelHost);
      const themeHost=document.createElement("div");themeHost.id="webDrawerThemeHost";drawer.appendChild(themeHost);
      main.appendChild(drawer);
      drawer.addEventListener("click",e=>{
        const b=e.target.closest("[data-drawer]");if(!b)return;
        const id=b.dataset.drawer;
        if(id==="location"){showOriginalPanel("datePanel");return;}
        if(id==="language"){showSettings();return;}
        if(id==="sound"){showOriginalPanel("switchPanel");return;}
        if(id==="settings"){showSettings();return;}
        if(id==="appearance"){
          closeHosts();const p=document.getElementById("webThemePanel"),h=document.getElementById("webDrawerThemeHost");
          if(p&&h){h.appendChild(p);p.hidden=false;h.classList.add("open");}return;
        }
        if(id==="night"){
          const cards=[...document.querySelectorAll("#webThemePanel .wt-card")],current=document.body.dataset.webTheme==="dark-night";
          const target=cards.find(x=>x.dataset.theme===(current?"cream-blue":"dark-night"));if(target)target.click();return;
        }
        if(id==="savePhone"){savePhone();}
      });
    }
    return true;
  }

  function start(){let n=0;const t=setInterval(()=>{if(install()||++n>80)clearInterval(t)},150);install();window.addEventListener("aoqatModulesReady",()=>setTimeout(install,100));}
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start,{once:true});else start();
})();