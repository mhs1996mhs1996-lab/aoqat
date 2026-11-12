"use strict";
(function(){
  // Web-only, isolated layer. Never replaces the underlying settings handlers.
  const STYLE_ID="aoqatWebHelpLiveStyle";
  const ROOT_IDS=["webSubBody","adhanServicesBody"];
  const DETAILS={
    "backgroundPanel":"إظهار عناصر الواجهة وتعديل ألوان التصميم.",
    "fontPanel":"تغيير شكل الخط وحجمه ولونه.",
    "switchPanel":"ضبط التبديل التلقائي وتنبيه اليوم التالي.",
    "adhanPanel":"عرض المواقيت وضبط صوت الأذان.",
    "iqamaPanel":"تحديد الدقائق بين الأذان والإقامة لكل صلاة.",
    "afterIqamaPanel":"تحديد مدة عداد مضى على الإقامة.",
    "prayerPanel":"عرض البيانات المتعلقة بأوقات الصلاة.",
    "datePanel":"تعديل بيانات التاريخ.",
    "prayer":"تشغيل تنبيهات الصلاة والتحكم في طرقها.",
    "iqama":"ضبط إشعار الإقامة وخياراته.",
    "friday":"ضبط تذكير سنن الجمعة وسورة الكهف.",
    "fasting":"ضبط تذكيرات صيام التطوع.",
    "azkar":"ضبط أوقات الأذكار والتنبيه بها.",
    "publish":"ضبط التبديل التلقائي وتنبيه نشر مواقيت الغد.",
    "calendarNotice":"تذكير نشر تقويم الشهر التالي.",
    "screen":"التحكم بإضاءة الشاشة عند التنبيه.",
    "elements":"إظهار أو إخفاء الساعة والتاريخ وعدادي الصلاة والإقامة.",
    "designs":"اختيار التصاميم التي تظهر بالواجهة.",
    "tools":"تعديل عناصر الواجهة والتصميم.",
    "next":"عرض بطاقة الصلاة القادمة وتنسيقها.",
    "classic":"تخصيص البطاقة وحجم الخط وألوانها."
  };
  const LABELS={
    "مواقيت الصلاة":"عرض الأوقات وخيارات الأذان.",
    "أوقات بعد الإقامة":"تحديد مدة ظهور مضى على الإقامة.",
    "أوقات الإقامة":"تحديد عدد الدقائق بين الأذان والإقامة.",
    "تنسيق الخط":"تغيير نوع الخط وحجمه وألوانه.",
    "إشعار شاشة القفل":"إظهار أو إخفاء إشعار مواقيت الصلاة على شاشة القفل.",
    "أذونات التنبيهات":"فتح أذونات الإشعارات في أندرويد.",
    "الذكر":"عرض الأذكار وضبط التذكير بها.",
    "الصلاة على النبي":"تذكير الصلاة على النبي ﷺ يوم الجمعة.",
    "المشاركة":"مشاركة المحتوى أو التصميم مع الآخرين.",
    "الصامت":"تحديد بدء الصامت ومدته وموعد انتهاءه.",
    "التسبيح":"ضبط تذكير الذكر والتسبيح.",
    "الألوان":"اختيار الألوان المناسبة لواجهة التطبيق.",
    "إضافة":"تنفيذ الإضافة الموضحة في عنوان الزر.",
    "إرجاع":"استعادة الإعداد السابق للعنصر."
  };
  function helpText(button){
    const key=button.dataset.alertSection||button.dataset.panel||button.dataset.interfacePage||button.dataset.bagSection||button.id;
    if(DETAILS[key])return DETAILS[key];
    const title=(button.innerText||button.textContent||"").trim().replace(/\s+/g," ");
    const label=Object.keys(LABELS).find(x=>title.includes(x));
    return label?LABELS[label]:"هذا الزر مخصص لـ «"+title+"». اضغط عليه لتغيير إعداداته.";
  }
  function ensureStyle(){
    if(document.getElementById(STYLE_ID))return;
    const style=document.createElement("style");
    style.id=STYLE_ID;
    style.textContent="#aoqatHelpPage{position:fixed!important;inset:0!important;z-index:2147483000!important;box-sizing:border-box!important;overflow-y:auto!important;background:var(--wt-surface,#fff)!important;color:var(--wt-text,#253f35)!important;padding:calc(6px + env(safe-area-inset-top,0px)) 14px 22px!important;direction:rtl!important}#aoqatHelpPage .aoqat-help-card{max-width:680px;width:100%;margin:0 auto;min-height:100%;box-sizing:border-box;padding:6px 2px}#aoqatHelpPage .aoqat-help-top{display:flex;align-items:center;justify-content:space-between;gap:12px;min-height:57px;border-bottom:1px solid var(--wt-border,#b4c7b8)}#aoqatHelpPage .aoqat-help-heading{font-weight:750;font-size:20px;line-height:1.5}#aoqatHelpPage button.aoqat-help-back{width:auto!important;height:37px!important;min-height:37px!important;padding:6px 10px!important;border-radius:9px!important;border:1px solid var(--wt-border,#b4c7b8)!important;background:var(--wt-surface2,#e9f0e9)!important;color:var(--wt-text,#253f35)!important;font:600 14px/1.4 Tahoma,Arial,sans-serif!important;box-shadow:none!important}#aoqatHelpPage .aoqat-help-subheading{font-size:19px;font-weight:750;line-height:1.65;margin:23px 0 10px;color:var(--wt-text,#253f35)}#aoqatHelpPage .aoqat-help-description{font-size:16px;line-height:1.8;color:var(--wt-text,#253f35);margin:0;white-space:normal}.aoqat-help-holder{position:relative;min-width:0;width:100%;display:block;box-sizing:border-box}.aoqat-help-holder>button.main-action,.aoqat-help-holder>button.wa-primary,.aoqat-help-holder>button.ad-section-toggle{box-sizing:border-box!important;width:100%!important;padding-left:49px!important}.aoqat-help-holder>button.aoqat-help-badge,#webInterfacePage button.aoqat-help-badge,#webInterfaceMenu button.aoqat-help-badge{position:absolute!important;top:50%!important;left:3px!important;right:auto!important;transform:translateY(-50%)!important;width:43px!important;height:43px!important;min-width:43px!important;min-height:43px!important;max-width:43px!important;max-height:43px!important;box-sizing:border-box!important;padding:0!important;margin:0!important;display:flex!important;align-items:center!important;justify-content:center!important;border:0!important;border-radius:50%!important;background:transparent!important;box-shadow:none!important;cursor:pointer!important;z-index:4!important;direction:rtl!important}.aoqat-help-badge>.aoqat-help-circle{width:25px!important;height:25px!important;min-width:25px!important;min-height:25px!important;display:flex!important;align-items:center!important;justify-content:center!important;margin:0!important;padding:0!important;border-radius:50%!important;border:1px solid var(--wt-button-accent,var(--wt-accent,#3a7658))!important;background:color-mix(in srgb,var(--wt-button-accent,var(--wt-accent,#3a7658)) 12%,var(--wt-surface,#fff))!important;color:var(--wt-button-accent,var(--wt-accent,#3a7658))!important;box-shadow:none!important;font:750 16px/1 Tahoma,Arial,sans-serif!important;text-shadow:none!important}.aoqat-help-badge:focus-visible{outline:2px solid var(--wt-button-accent,var(--wt-accent,#3a7658))!important;outline-offset:-2px!important}.aoqat-help-badge:active>.aoqat-help-circle{transform:scale(.94)}#webInterfaceMenu button.aoqat-help-badge span{margin:0!important}.wa-actions>.aoqat-help-holder{flex:1 1 0;width:auto}@media(max-width:360px){.aoqat-help-badge>.aoqat-help-circle{width:23px!important;height:23px!important;min-width:23px!important;min-height:23px!important;font-size:15px!important}}";
    document.head.appendChild(style);
  }
  let lastFocus=null;
  function closeHelp(){
    document.getElementById("aoqatHelpPage")?.remove();
    document.removeEventListener("keydown",onKey);
    const focus=lastFocus;lastFocus=null;
    if(focus?.isConnected)focus.focus({preventScroll:true});
  }
  function onKey(e){
    if(e.key==="Escape"||e.key==="Backspace"){
      e.preventDefault();
      closeHelp();
    }
  }
  function showHelp(title,description,source){
    ensureStyle();
    document.getElementById("aoqatHelpPage")?.remove();
    lastFocus=source||document.activeElement;
    const page=document.createElement("section");
    page.id="aoqatHelpPage";page.dir="rtl";
    page.setAttribute("role","dialog");page.setAttribute("aria-modal","true");
    page.setAttribute("aria-label","شرح "+title);
    const card=document.createElement("div");card.className="aoqat-help-card";
    const bar=document.createElement("div");bar.className="aoqat-help-top";
    const heading=document.createElement("strong");heading.className="aoqat-help-heading";heading.textContent="شرح الزر";
    const back=document.createElement("button");back.className="aoqat-help-back";back.type="button";back.textContent="‹ رجوع";back.onclick=closeHelp;
    bar.append(heading,back);
    const name=document.createElement("h3");name.className="aoqat-help-subheading";name.textContent=title;
    const body=document.createElement("p");body.className="aoqat-help-description";body.textContent=description;
    card.append(bar,name,body);page.append(card);document.body.append(page);
    document.addEventListener("keydown",onKey);
    back.focus({preventScroll:true});
  }
  window.aoqatOpenSettingsHelp=(title,description)=>showHelp(title,description);
  function decorate(button){
    if(button.classList.contains("aoqat-help-badge")||button.closest(".aoqat-help-holder"))return;
    if(button.closest("#aoqatHelpPage")||button.matches(".web-back,[data-minute-step],.design-popup-close,[aria-label='رجوع']"))return;
    const title=(button.innerText||button.textContent||"").trim().replace(/\s+/g," ");
    if(!title)return;
    const desc=helpText(button);
    const holder=document.createElement("div");holder.className="aoqat-help-holder";
    button.before(holder);holder.append(button);
    const help=document.createElement("button");help.type="button";help.className="aoqat-help-badge";
    help.setAttribute("aria-label","شرح "+title);help.title="شرح مختصر";
    const circle=document.createElement("span");circle.className="aoqat-help-circle";circle.textContent="؟";
    circle.setAttribute("aria-hidden","true");help.append(circle);
    help.addEventListener("click",e=>{
      e.preventDefault();e.stopImmediatePropagation();e.stopPropagation();
      showHelp(title,desc,help);
    });
    holder.append(help);
  }
  let queued=false;
  function apply(){
    queued=false;
    ensureStyle();
    for(const id of ROOT_IDS){
      const root=document.getElementById(id);
      if(!root)continue;
      root.querySelectorAll("button.main-action,button.wa-primary,button.ad-section-toggle").forEach(decorate);
    }
  }
  function schedule(){
    if(queued)return;queued=true;requestAnimationFrame(apply);
  }
  const roots=new WeakSet();
  const observer=new MutationObserver(records=>{
    if(records.some(r=>r.type==="childList"&&[...r.addedNodes].some(n=>n.nodeType===1)))schedule();
  });
  function bind(){
    let found=false;
    for(const id of ROOT_IDS){
      const root=document.getElementById(id);
      if(root){
        found=true;
        if(!roots.has(root)){roots.add(root);observer.observe(root,{childList:true,subtree:true});}
      }
    }
    if(found)schedule();
    return found;
  }
  function start(){
    ensureStyle();bind();
    let tries=0;
    const interval=setInterval(()=>{
      bind();
      if(++tries>=60||ROOT_IDS.every(id=>document.getElementById(id)))clearInterval(interval);
    },200);
    window.addEventListener("aoqatModulesReady",bind);
    window.addEventListener("pageshow",bind);
    // Some dialogs are instantiated only when first opened.
    new MutationObserver(records=>{
      if(records.some(r=>[...r.addedNodes].some(n=>n.nodeType===1&&
        (n.id==="adhanServicesDialog"||n.querySelector?.("#adhanServicesDialog")))))bind();
    }).observe(document.body,{childList:true});
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start,{once:true});
  else start();
})();
