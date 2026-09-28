"use strict";
(function(){
  // Web-only visual reordering. Existing elements are moved, never cloned/replaced,
  // so their original IDs, event listeners and behavior remain intact.
  const labels=[
    {keys:["الحويجة","الموقع"],icon:"📍"},
    {keys:["اللغة"],icon:"🌐"},
    {keys:["الصوت"],icon:"🔊"},
    {keys:["الإعدادات"],icon:"⚙️"},
    {keys:["شكل التطبيق"],icon:"🎨"},
    {keys:["الوضع الليلي"],icon:"🌙"},
    {keys:["المواقع الاجتماعية"],icon:"👥"},
    {keys:["تقويم جوجل","حفظ على تقويم"],icon:"🗓️"},
    {keys:["البريد الإلكتروني","راسلنا"],icon:"✉️"},
    {keys:["بلغ عن خطأ"],icon:"⚠️"},
    {keys:["اقترح ميزة"],icon:"💡"}
  ];
  function txt(el){return (el.textContent||"").replace(/\s+/g," ").trim();}
  function iconFor(el){
    const t=txt(el);const hit=labels.find(x=>x.keys.some(k=>t.includes(k)));
    return hit?hit.icon:null;
  }
  function decorate(root){
    const candidates=[...root.querySelectorAll("button,a,.main-action,[role='button']")];
    candidates.forEach(el=>{
      const icon=iconFor(el);if(!icon||el.dataset.webMenuDecorated)return;
      el.dataset.webMenuDecorated="1";
      const current=txt(el);
      // Preserve controls and handlers; only add a semantic visual icon when missing.
      if(!/^[📍🌐🔊⚙️🎨🌙👥🗓️✉️⚠️💡]/u.test(current)){
        const span=document.createElement("span");span.className="web-menu-semantic-icon";span.textContent=icon;
        el.prepend(span);
      }
    });
  }
  function rank(el){
    const t=txt(el);
    const order=["الحويجة","الموقع","اللغة","الصوت","الإعدادات","شكل التطبيق","الوضع الليلي","المواقع الاجتماعية","تقويم جوجل","حفظ على تقويم","البريد الإلكتروني","راسلنا","بلغ عن خطأ","اقترح ميزة"];
    for(let i=0;i<order.length;i++)if(t.includes(order[i]))return i;
    return 999;
  }
  function reorderContainer(container){
    const kids=[...container.children];
    const matched=kids.filter(el=>rank(el)<999);
    if(matched.length<3)return false;
    const first=matched[0];
    matched.sort((a,b)=>rank(a)-rank(b)).forEach(el=>container.insertBefore(el,first));
    return true;
  }
  function apply(){
    const roots=[document.querySelector(".sidebar .main-panel"),document.querySelector(".sidebar")].filter(Boolean);
    roots.forEach(decorate);
    // Only reorder siblings inside the same existing container; never move controls across panels.
    roots.forEach(root=>{
      reorderContainer(root);
      [...root.querySelectorAll(":scope > div,:scope > section")].forEach(reorderContainer);
    });
    const styleId="webMenuOrderStyles";
    if(!document.getElementById(styleId)){
      const s=document.createElement("style");s.id=styleId;s.textContent=`
        .web-menu-semantic-icon{display:inline-flex;min-width:22px;align-items:center;justify-content:center;font-size:1.05em;line-height:1}
        body.design-menu-open .sidebar .main-action{justify-content:flex-start!important;gap:8px!important}
        body.design-menu-open #webAppearanceBtn{order:0}
      `;document.head.appendChild(s);
    }
  }
  function start(){
    apply();
    let n=0;const t=setInterval(()=>{apply();if(++n>30)clearInterval(t)},200);
    window.addEventListener("aoqatModulesReady",()=>setTimeout(apply,60));
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start,{once:true});else start();
})();