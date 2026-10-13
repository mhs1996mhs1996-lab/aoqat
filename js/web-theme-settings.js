"use strict";
(function(){
  const STORAGE_KEY="aoqatWebAppearanceThemeV1";
  const themes=[
    {id:"cream-blue",name:"كريمي وأزرق فاتح",icon:"🟦",vars:{bg:"#f5f0e4",surface:"#fffaf0",surface2:"#e8f5fb",text:"#12334a",muted:"#587487",accent:"#35acd0",border:"#b9dbe8",top:"#eaf7fb"}},
    {id:"cream-gold",name:"كريمي وذهبي هادئ",icon:"🟨",vars:{bg:"#f4ead5",surface:"#fffaf0",surface2:"#f8efd9",text:"#4f3b20",muted:"#806c4b",accent:"#b58a35",border:"#dbc28d",top:"#f6eddc"}},
    {id:"white-sky",name:"أبيض وسماوي حديث",icon:"🔵",vars:{bg:"#eef8fc",surface:"#ffffff",surface2:"#e4f5fb",text:"#173c52",muted:"#65808e",accent:"#3bb5d8",border:"#b9e0ec",top:"#f7fdff"}},
    {id:"cream-green",name:"كريمي وأخضر هادئ",icon:"🟩",vars:{bg:"#f1f1df",surface:"#fffef2",surface2:"#e9f0df",text:"#33452b",muted:"#68765d",accent:"#668a51",border:"#c9d2a9",top:"#f4f5e9"}},
    {id:"beige-gold",name:"بيج وذهبي أنيق",icon:"🟫",vars:{bg:"#ead8c2",surface:"#fff5e8",surface2:"#f1dfcb",text:"#57351f",muted:"#86634d",accent:"#b66f3e",border:"#d9b18f",top:"#f2e1cf"}},
    {id:"dark-night",name:"داكن كحلي (ليلي)",icon:"🌙",vars:{bg:"#061019",surface:"#102431",surface2:"#0b1b27",text:"#f4f7f8",muted:"#b7c7d0",accent:"#1b8ca8",border:"#294857",top:"#0c2734"}},
    {"id":"white-lavender","name":"أبيض وبنفسجي","icon":"🟣","vars":{"bg":"#f2edf8","surface":"#fffaff","surface2":"#eee5f6","text":"#352844","muted":"#70607e","accent":"#78549b","border":"#d0bedf","top":"#f5effb"}},
    {"id":"soft-rose","name":"وردي هادئ","icon":"🌸","vars":{"bg":"#f7edef","surface":"#fffafb","surface2":"#f6e4ea","text":"#532b3b","muted":"#866172","accent":"#a14869","border":"#dfb8c7","top":"#f9eff3"}},
    {"id":"white-teal","name":"أبيض وتركوازي","icon":"💠","vars":{"bg":"#eaf6f4","surface":"#fbfffe","surface2":"#dff0eb","text":"#173f3a","muted":"#527b72","accent":"#157b72","border":"#aed4c9","top":"#eff9f6"}},
    {"id":"emerald","name":"أخضر زمردي","icon":"🌿","vars":{"bg":"#eaf2e9","surface":"#fbfff8","surface2":"#dfecdb","text":"#234128","muted":"#59745c","accent":"#347348","border":"#b6cdb0","top":"#f0f7ec"}},
    {"id":"white-navy","name":"أبيض وأزرق ملكي","icon":"🔷","vars":{"bg":"#edf1f9","surface":"#ffffff","surface2":"#e4ebf7","text":"#203653","muted":"#62738e","accent":"#3e5b9c","border":"#b8c8e2","top":"#f4f7fc"}},
    {"id":"warm-burgundy","name":"عاجي وعنابي","icon":"🍷","vars":{"bg":"#f3ede5","surface":"#fffaf2","surface2":"#efe1dc","text":"#4b2930","muted":"#826568","accent":"#8c3f50","border":"#d5b9b6","top":"#f7eee8"}},
    {"id":"dark-graphite","name":"رمادي داكن","icon":"🌑","vars":{"bg":"#15191e","surface":"#222830","surface2":"#2b333e","text":"#f1f4f7","muted":"#b2bfcc","accent":"#496a89","border":"#465361","top":"#1b222b"}},
    {"id":"dark-purple","name":"بنفسجي ليلي","icon":"🌌","vars":{"bg":"#1b1625","surface":"#2b2239","surface2":"#362a46","text":"#f7f1fb","muted":"#c8b8d8","accent":"#79559c","border":"#5d486f","top":"#241c31"}}
  ];
  const BUTTON_KEY="aoqatWebButtonAppearanceV1";
  function buttonSettings(){let x={};try{x=JSON.parse(localStorage.getItem(BUTTON_KEY)||'{}')||{};}catch(_){}return {target:['both','app','buttons'].includes(x.target)?x.target:'both',style:x.style==='solid'?'solid':'gradient',theme:themes.some(t=>t.id===x.theme)?x.theme:null};}
  function saveButtons(x){try{localStorage.setItem(BUTTON_KEY,JSON.stringify(x));}catch(_){}}
  function buttonTheme(){const x=buttonSettings();return themes.find(t=>t.id===(x.theme||getSavedTheme()))||themes[0];}
  function syncButtons(){const x=buttonSettings(),t=buttonTheme();document.documentElement.style.setProperty('--wt-button-accent',t.vars.accent);document.body.dataset.buttonTheme=t.id;document.body.dataset.buttonStyle=x.style;window.dispatchEvent(new Event('aoqatButtonAppearanceChanged'));}
  function refreshControls(){const x=buttonSettings();const selected=x.target==='buttons'?buttonTheme().id:getSavedTheme();document.querySelectorAll('.wt-card[data-theme]').forEach(b=>b.classList.toggle('is-active',b.dataset.theme===selected));document.querySelectorAll('[data-theme-control]').forEach(el=>el.value=x[el.dataset.themeControl]);document.querySelectorAll('[data-theme-current]').forEach(el=>el.textContent='الواجهة: '+(themes.find(t=>t.id===getSavedTheme())||themes[0]).name+' — الأزرار: '+buttonTheme().name);}
  function selectTheme(id){const x=buttonSettings();if(x.target==='app'){if(!x.theme){x.theme=buttonTheme().id;saveButtons(x);}applyTheme(id);}else{x.theme=id;saveButtons(x);if(x.target==='both')applyTheme(id);else syncButtons();}refreshControls();}
  function controls(){return '<div class="wt-controls"><label>تطبيق الثيم على<select data-theme-control="target"><option value="both">شكل التطبيق والأزرار معاً</option><option value="app">شكل التطبيق فقط</option><option value="buttons">الأزرار فقط</option></select></label><label>لون أزرار القوائم<select data-theme-control="style"><option value="gradient">لون متدرّج</option><option value="solid">لون ثابت</option></select></label><p data-theme-current></p></div>';}
  if(!window.AndroidNative?.configureAdhan)document.addEventListener('change',e=>{const el=e.target.closest?.('[data-theme-control]');if(!el)return;const x=buttonSettings();x[el.dataset.themeControl]=el.value;saveButtons(x);syncButtons();refreshControls();});
  const css=document.createElement("style");
  css.id="webThemeSettingsStyles";
  css.textContent=`
    .web-theme-drawer-panel .wt-card.is-active{outline:2px solid var(--wt-button-accent,var(--wt-accent));outline-offset:1px}
    .wt-controls{display:grid;gap:8px;margin-bottom:12px}.wt-controls label{display:flex!important;flex-direction:column!important;gap:5px;font-size:14px}.wt-controls select{width:100%!important;max-width:100%!important;min-height:42px;padding:7px;border-radius:8px;border:1px solid var(--wt-border);background:var(--wt-surface2);color:var(--wt-text)}.wt-controls [data-theme-current]{font-size:12px;line-height:1.7;margin:0;color:var(--wt-muted)}
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
    syncButtons();refreshControls();
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
    panel.innerHTML=(!window.AndroidNative?.configureAdhan?controls():'')+'<div class="wt-head"><span>🎨 الثيمات والألوان</span><span>اختيار مباشر</span></div><div class="wt-grid">'+themes.map(t=>'<button type="button" class="wt-card" data-theme="'+t.id+'"><span class="wt-swatch" style="background:linear-gradient(90deg,'+t.vars.bg+','+t.vars.accent+')"></span><span>'+t.icon+' '+t.name+'</span></button>').join("")+'</div>';

    const backgroundBtn=main.querySelector('[data-open-panel="backgroundPanel"]');
    if(backgroundBtn?.parentElement===main)main.insertBefore(btn,backgroundBtn); else main.appendChild(btn);
    main.insertBefore(panel,btn.nextSibling);

    btn.addEventListener("click",()=>{panel.hidden=!panel.hidden;});
    panel.addEventListener("click",e=>{
      const card=e.target.closest(".wt-card"); if(!card)return;
      selectTheme(card.dataset.theme);
    });
    applyTheme(getSavedTheme());
    return true;
  }
  window.ensureWebThemePanel=function(){install();return document.getElementById("webThemePanel");};
  window.applyWebTheme=selectTheme;
  window.refreshWebThemeControls=refreshControls;
  window.addEventListener("pageshow",()=>applyTheme(getSavedTheme()));
  document.addEventListener("visibilitychange",()=>{if(!document.hidden)applyTheme(getSavedTheme());});
  function start(){
    let tries=0;const timer=setInterval(()=>{tries++;if(install()||tries>80)clearInterval(timer)},150);install();
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start,{once:true});else start();
})();