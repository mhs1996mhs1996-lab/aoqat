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
    if(button.dataset.helpDescription)return button.dataset.helpDescription;
    const key=button.dataset.alertSection||button.dataset.panel||button.dataset.interfacePage||button.dataset.bagSection||button.id;
    if(DETAILS[key])return DETAILS[key];
    if(button.matches(".interface-visibility-btn"))return "إظهار أو إخفاء هذا العنصر في واجهة البرنامج، مع الاحتفاظ باختيارك.";
    const title=(button.innerText||button.textContent||"").trim().replace(/\s+/g," ");
    const label=Object.keys(LABELS).find(x=>title.includes(x));
    return label?LABELS[label]:"هذا الزر مخصص لـ «"+title+"». اضغط عليه لتغيير إعداداته.";
  }
  function ensureStyle(){
    if(document.getElementById(STYLE_ID))return;
    const style=document.createElement("style");
    style.id=STYLE_ID;
    style.textContent="#aoqatHelpPage{position:fixed!important;inset:0!important;z-index:2147483000!important;box-sizing:border-box!important;overflow-y:auto!important;background:var(--wt-surface,#fff)!important;color:var(--wt-text,#253f35)!important;padding:calc(6px + env(safe-area-inset-top,0px)) 14px 22px!important;direction:rtl!important}#aoqatHelpPage .aoqat-help-card{max-width:680px;width:100%;margin:0 auto;min-height:100%;box-sizing:border-box;padding:6px 2px}#aoqatHelpPage .aoqat-help-top{display:flex;align-items:center;justify-content:space-between;gap:12px;min-height:57px;border-bottom:1px solid var(--wt-border,#b4c7b8)}#aoqatHelpPage .aoqat-help-heading{font-weight:750;font-size:20px;line-height:1.5}#aoqatHelpPage button.aoqat-help-back{width:auto!important;height:37px!important;min-height:37px!important;padding:6px 10px!important;border-radius:9px!important;border:1px solid var(--wt-border,#b4c7b8)!important;background:var(--wt-surface2,#e9f0e9)!important;color:var(--wt-text,#253f35)!important;font:600 14px/1.4 Tahoma,Arial,sans-serif!important;box-shadow:none!important}#aoqatHelpPage .aoqat-help-subheading{font-size:19px;font-weight:750;line-height:1.65;margin:23px 0 10px;color:var(--wt-text,#253f35)}#aoqatHelpPage .aoqat-help-description{font-size:16px;line-height:1.8;color:var(--wt-text,#253f35);margin:0;white-space:normal}button.aoqat-help-eligible{position:relative!important;box-sizing:border-box!important;padding-left:43px!important}button.aoqat-help-eligible::before{content:'؟';position:absolute!important;left:13px!important;right:auto!important;top:50%!important;transform:translateY(-50%)!important;width:17px!important;height:17px!important;min-width:17px!important;min-height:17px!important;box-sizing:border-box!important;display:flex!important;align-items:center!important;justify-content:center!important;border:1px solid currentColor!important;border-radius:50%!important;background:transparent!important;color:inherit!important;box-shadow:none!important;text-shadow:none!important;font:700 11px/1 Tahoma,Arial,sans-serif!important;pointer-events:none!important;opacity:.88!important}#adhanPanel button.aoqat-help-eligible .ad-section-chevron{margin-left:43px!important}@media(max-width:360px){button.aoqat-help-eligible::before{width:16px!important;height:16px!important;min-width:16px!important;min-height:16px!important;font-size:10px!important}}";

    // Spacing corrections only: no wrapping/reparenting/replacement of buttons.
    // The actual circle stays small; the surrounding native button remains its tap target.
    style.textContent += [
      "button.aoqat-help-eligible::before{width:18px!important;height:18px!important;min-width:18px!important;min-height:18px!important;border:1px solid var(--wt-button-accent,var(--wt-accent,#277c54))!important;border-radius:50%!important;color:#fff!important;font:700 11px/1 Tahoma,Arial,sans-serif!important;opacity:1!important;background:var(--wt-button-accent,var(--wt-accent,#277c54))!important;box-shadow:none!important}",
      "#webSubBody button.main-action.aoqat-help-eligible,#webSubBody button.wa-primary.aoqat-help-eligible,#webSubBody button.interface-visibility-btn.aoqat-help-eligible{padding-left:57px!important}",
      "#webInterfaceMenu button.main-action.aoqat-help-eligible{justify-content:flex-start!important;text-align:right!important}",
      "#webInterfaceMenu button.main-action.aoqat-help-eligible>span:last-child{margin-inline-start:0!important}",
      "#adhanServicesDialog #adhanPanel button.ad-section-toggle.aoqat-help-eligible{padding-left:58px!important}",
      "#adhanServicesDialog #adhanPanel button.ad-section-toggle.aoqat-help-eligible.aoqat-help-with-chevron{padding-left:82px!important}",
      // Specificity must beat the original ordered alert-menu padding rule.
      "#adhanServicesDialog #adhanPanel.pa-ordered-layout #paAlertMenu > button.ad-section-toggle.aoqat-help-eligible{padding-left:60px!important}",
      "#adhanServicesDialog #adhanPanel.pa-ordered-layout #paAlertMenu > button.ad-section-toggle.aoqat-help-eligible.aoqat-help-with-chevron{padding-left:82px!important}",
      "#adhanServicesDialog #adhanPanel button.ad-section-toggle.aoqat-help-with-chevron>.ad-section-chevron{margin-left:0!important}",
      "@media(max-width:360px){button.aoqat-help-eligible::before{width:17px!important;height:17px!important;min-width:17px!important;min-height:17px!important;font-size:10px!important}}"
    ].join("");
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
  // Keep all original buttons in their exact DOM position. In particular,
  // the adhan view reconstructs its buttons often; wrapping them generated
  // abandoned empty holders and made its page thousands of pixels tall.
  // A CSS pseudo-element supplies the small help circle without extra nodes.
  function cleanLegacyHelp(root){
    root.querySelectorAll('.aoqat-help-holder').forEach(holder=>{
      const original=[...holder.children].find(el=>el.tagName==='BUTTON'&&!el.classList.contains('aoqat-help-badge'));
      if(original)holder.replaceWith(original);else holder.remove();
    });
    root.querySelectorAll('button.aoqat-help-badge').forEach(badge=>badge.remove());
  }
  function decorate(button){
    // Inbox items show delivered reminders, not configurable settings.
    // No generic question marks in the notification history or its details.
    if(button.closest('#reminderInbox'))return;
    if(button.classList.contains('aoqat-help-eligible'))return;
    if(button.matches('.web-back,[data-minute-step],.design-popup-close,[aria-label="رجوع"]'))return;
    if(button.closest('#aoqatHelpPage'))return;
    const title=(button.innerText||button.textContent||'').trim().replace(/\s+/g,' ');
    if(!title)return;
    button.classList.add('aoqat-help-eligible');
    // Explicitly reserve a separate place for the original navigation arrow.
    // Its element and click handler are left untouched.
    const last=button.lastElementChild;
    if(last?.classList.contains('ad-section-chevron')||
       (last?.tagName==='SPAN'&&/^[‹›❮❯]$/.test(last.textContent.trim())))
      button.classList.add('aoqat-help-with-chevron');
    // The left 43px are a comfortable invisible touch target around a 17px
    // circle. All other parts of the button keep their existing functionality.
    button.addEventListener('click',event=>{
      if(event.detail===0)return; // keyboard Enter/Space remains the normal action
      const bounds=button.getBoundingClientRect();
      const inHelp=event.clientX>=bounds.left&&event.clientX<=bounds.left+43&&
        Math.abs(event.clientY-(bounds.top+bounds.height/2))<=23;
      if(!inHelp)return;
      event.preventDefault();
      event.stopImmediatePropagation();
      event.stopPropagation();
      const current=(button.innerText||button.textContent||title).trim().replace(/\s+/g,' ');
      showHelp(current,helpText(button),button);
    },true);
    button.addEventListener('keydown',event=>{
      if(event.key!=='F1')return;
      event.preventDefault();event.stopPropagation();
      const current=(button.innerText||button.textContent||title).trim().replace(/\s+/g,' ');
      showHelp(current,helpText(button),button);
    },true);
  }
  let queued=false;
  function apply(){
    queued=false;
    ensureStyle();
    for(const id of ROOT_IDS){
      const root=document.getElementById(id);
      if(!root)continue;
      cleanLegacyHelp(root);
      root.querySelectorAll('button.main-action,button.wa-primary,button.ad-section-toggle,button.switch-control-btn,button.interface-visibility-btn').forEach(decorate);
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
    window.addEventListener("aoqatButtonAppearanceChanged",schedule);
    // Re-evaluate text contrast if the user switches to another light/dark
    // button theme while the settings drawer stays open.
    new MutationObserver(schedule).observe(document.documentElement,{attributes:true,attributeFilter:["style","data-web-theme","data-button-style"]});
    new MutationObserver(schedule).observe(document.body,{attributes:true,attributeFilter:["data-web-theme","data-button-style"]});
    // Some dialogs are instantiated only when first opened.
    new MutationObserver(records=>{
      if(records.some(r=>[...r.addedNodes].some(n=>n.nodeType===1&&
        (n.id==="adhanServicesDialog"||n.querySelector?.("#adhanServicesDialog")))))bind();
    }).observe(document.body,{childList:true});
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start,{once:true});
  else start();
})();
