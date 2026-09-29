"use strict";
(function(){
  const STORAGE_KEY="aoqatWebAppearanceThemeV1";
  const themes=[
    {id:"cream-blue",name:"كريمي وأزرق فاتح",icon:"🟦",vars:{bg:"#f5f0e4",surface:"#fffaf0",surface2:"#e8f5fb",text:"#12334a",muted:"#587487",accent:"#35acd0",border:"#b9dbe8",top:"#eaf7fb"}},
    {id:"cream-gold",name:"كريمي وذهبي هادئ",icon:"🟨",vars:{bg:"#f4ead5",surface:"#fffaf0",surface2:"#f8efd9",text:"#4f3b20",muted:"#806c4b",accent:"#b58a35",border:"#dbc28d",top:"#f6eddc"}},
    {id:"white-sky",name:"أبيض وسماوي حديث",icon:"🔵",vars:{bg:"#eef8fc",surface:"#ffffff",surface2:"#e4f5fb",text:"#173c52",muted:"#65808e",accent:"#3bb5d8",border:"#b9e0ec",top:"#f7fdff"}},
    {id:"cream-green",name:"كريمي وأخضر هادئ",icon:"🟩",vars:{bg:"#f1f1df",surface:"#fffef2",surface2:"#e9f0df",text:"#33452b",muted:"#68765d",accent:"#668a51",border:"#c9d2a9",top:"#f4f5e9"}},
    {id:"beige-gold",name:"بيج وذهبي أنيق",icon:"🟫",vars:{bg:"#ead8c2",surface:"#fff5e8",surface2:"#f1dfcb",text:"#57351f",muted:"#86634d",accent:"#b66f3e",border:"#d9b18f",top:"#f2e1cf"}},
    {id:"dark-night",name:"داكن كحلي (ليلي)",icon:"🌙",vars:{bg:"#061019",surface:"#102431",surface2:"#0b1b27",text:"#f4f7f8",muted:"#b7c7d0",accent:"#1b8ca8",border:"#294857",top:"#0c2734"}}
  ];
  const css=document.createElement("style");
  css.id="webThemeSettingsStyles";
  css.textContent=`
    body.aoqat-web-theme{background:var(--wt-bg)!important;color:var(--wt-text)!important}
    body.aoqat-web-theme .topbar{background:var(--wt-top)!important;border-color:var(--wt-border)!important}
    body.aoqat-web-theme .panel,body.aoqat-web-theme .font-panel{background:var(--wt-surface)!important;color:var(--wt-text)!important;border-color:var(--wt-border)!important}
    body.aoqat-web-theme .panel h2,body.aoqat-web-theme .font-panel h2,body.aoqat-web-theme label{color:var(--wt-text)!important}
    body.aoqat-web-theme select,body.aoqat-web-theme input[type="number"],body.aoqat-web-theme input[type="text"],body.aoqat-web-theme textarea{background:var(--wt-surface2)!important;color:var(--wt-text)!important;border-color:var(--wt-border)!important}
    body.aoqat-web-theme .main-panel{background:var(--wt-surface)!important}
    body.aoqat-web-theme #designSideMenuBtn{background:var(--wt-accent)!important;border-color:var(--wt-border)!important}
    #webAppearanceBtn{background:var(--wt-accent,#357f91)!important;color:#fff!important}
    #webThemePanel{margin:2px 0 4px!important;padding:8px!important;border:1px solid var(--wt-border,#38515d)!important;border-radius:8px!important;background:var(--wt-surface,#102431)!important;color:var(--wt-text,#fff)!important}
    #webThemePanel[hidden]{display:none!important}
    #webThemePanel .wt-head{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:7px;font-size:12px;font-weight:800}
    #webThemePanel .wt-grid{display:grid;grid-template-columns:1fr 1fr;gap:6px}
    #webThemePanel .wt-card{min-height:58px!important;height:auto!important;margin:0!important;padding:6px!important;border:1px solid var(--wt-border,#38515d)!important;border-radius:8px!important;background:var(--wt-surface2,#0b1b27)!important;color:var(--wt-text,#fff)!important;display:flex!important;flex-direction:column!important;align-items:center!important;justify-content:center!important;gap:3px!important;font-size:10px!important;line-height:1.25!important;text-align:center!important;white-space:normal!important}
    #webThemePanel .wt-card.is-active{outline:2px solid var(--wt-accent,#35acd0);outline-offset:1px}
    #webThemePanel .wt-swatch{width:32px;height:14px;border-radius:999px;border:1px solid #0002;display:block}
    body.design-menu-open #webThemePanel{width:var(--design-action-width,auto)!important;max-width:100%!important;margin:0 0 2px auto!important}
    body.design-menu-open #webThemePanel .wt-grid{grid-template-columns:1fr 1fr}
  `;
  document.head.appendChild(css);

  function getSavedTheme(){
    try{return localStorage.getItem(STORAGE_KEY)||"cream-blue";}catch(_){return "cream-blue";}
  }
  function saveTheme(id){
    try{localStorage.setItem(STORAGE_KEY,id);}catch(_){}
  }
  function applyTheme(id){
    const theme=themes.find(t=>t.id===id)||themes[0];
    const r=document.documentElement;
    Object.entries(theme.vars).forEach(([k,v])=>r.style.setProperty("--wt-"+k,v));
    document.body.classList.add("aoqat-web-theme");
    document.body.dataset.webTheme=theme.id;
    saveTheme(theme.id);
    document.querySelectorAll("#webThemePanel .wt-card").forEach(b=>b.classList.toggle("is-active",b.dataset.theme===theme.id));
  }

  function install(){
    const main=document.querySelector(".sidebar .main-panel");
    if(!main)return false;
    const existing=document.getElementById("webThemePanel");
    if(existing)return true;
    const btn=document.createElement("button");
    btn.type="button";btn.id="webAppearanceBtn";btn.className="main-action";
    btn.innerHTML='<span aria-hidden="true">🎨</span><span>شكل التطبيق</span>';

    const panel=document.createElement("div");
    panel.id="webThemePanel";panel.hidden=true;
    panel.innerHTML='<div class="wt-head"><span>🎨 الثيمات والألوان</span><span>اختيار مباشر</span></div><div class="wt-grid">'+themes.map(t=>'<button type="button" class="wt-card" data-theme="'+t.id+'"><span class="wt-swatch" style="background:linear-gradient(90deg,'+t.vars.bg+','+t.vars.accent+')"></span><span>'+t.icon+' '+t.name+'</span></button>').join("")+'</div>';

    const backgroundBtn=main.querySelector('[data-open-panel="backgroundPanel"]');
    if(backgroundBtn)main.insertBefore(btn,backgroundBtn); else main.appendChild(btn);
    main.insertBefore(panel,btn.nextSibling);

    btn.addEventListener("click",()=>{panel.hidden=!panel.hidden;});
    panel.addEventListener("click",e=>{
      const card=e.target.closest(".wt-card"); if(!card)return;
      applyTheme(card.dataset.theme);
    });
    applyTheme(getSavedTheme());
    return true;
  }
  window.ensureWebThemePanel=function(){install();return document.getElementById("webThemePanel");};
  window.applyWebTheme=applyTheme;
  window.addEventListener("pageshow",()=>applyTheme(getSavedTheme()));
  document.addEventListener("visibilitychange",()=>{if(!document.hidden)applyTheme(getSavedTheme());});
  function start(){
    let tries=0;const timer=setInterval(()=>{tries++;if(install()||tries>80)clearInterval(timer)},150);install();
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start,{once:true});else start();
})();