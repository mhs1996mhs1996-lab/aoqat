"use strict";
(function(){
  // القائمة الرئيسية تحتوي فقط على عناصر لها وظيفة حقيقية في المشروع.
  // أزيلت عناصر (الحويجة/اللغة/الصوت) لأنها كانت مجرد اختصارات شكلية مرتبطة بلوحات غير صحيحة.
  const ROWS=[
    ["settings","⚙️","إعدادت التصميم"],["notifications","🔔","الإشعارات"],["appearance","🎨","شكل التطبيق"],
    ["savePhone","📱","مشاركة التصميم"],
    ["datePrayer","📅","بيانات التاريخ و الصلاة"],
    ...(!window.AndroidNative?.configureAdhan ? [["prayerTimeChoice","🕰️","طريقة اختيار أوقات الصلاة"]] : []),["adhanIqama","🕌","بيانات الاذان والإقامة"],
    ...(!window.AndroidNative?.configureAdhan ? [["quran","📖","القرآن الكريم"],["qibla","🧭","اتجاه القبلة"],["azkar","📿","الأذكار"]] : [])
  ];
  const SETTINGS=[
    ["background","🎨","واجهة البرنامج","backgroundPanel"],["font","🔤","تنسيق الخط","fontPanel"],
    ["footer","✍","النص السفلي","footerPanel"],
    ["date","📅","بيانات التاريخ","datePanel"],["prayer","🕌","أوقات الصلاة","prayerPanel"],
    ["iqama","⏳","أوقات الإقامة","iqamaPanel"],
    ["afterIqama","⏱️","اوقات بعد الاقامة","afterIqamaPanel"]
  ];
  const webOnly=!window.AndroidNative?.configureAdhan;
  // Twelve primary icons in the owner's order, identical on web and APK.
  const BAG_ICON='<svg viewBox="0 0 32 32" width="30" height="30" fill="none" aria-hidden="true"><path d="M3 9c5-2 9-1 13 2 4-3 8-4 13-2v18c-5-2-9-1-13 2-4-3-8-4-13-2Z" fill="#e9d59b" stroke="#216644" stroke-width="2"/><path d="M16 11v18M6 14l6 1M6 19l6 1M20 15l6-1M20 20l6-1" stroke="#216644" stroke-width="1.5"/><path d="M21 2a5 5 0 1 0 6 6 4 4 0 0 1-6-6Z" fill="#c39327"/></svg>';
  const CALENDAR_ICON='<svg viewBox="0 0 32 32" width="28" height="28" fill="none" aria-hidden="true"><rect x="4" y="6" width="24" height="23" rx="4" stroke="currentColor" stroke-width="2"/><path d="M4 13h24M10 3v7M22 3v7M10 18h3m6 0h3m-12 6h3m6 0h3" stroke="currentColor" stroke-width="2"/></svg>';
  const MENU_ROWS=[
    ["settings","⚙️","إعدادات التصميم"],
    ["quran","📖","القرآن الكريم"],
    ["muslimBag",BAG_ICON,"حقيبة المسلم"],
    ["datePrayer","📅","بيانات التاريخ والصلاة"],
    ["adhanIqama","🕌","بيانات الأذان والإقامة"],
    ["usageGuide","📘","شرح استخدام التطبيق"],
    ["calendar",CALENDAR_ICON,"التقاويم"],
    ["alertSettings","🎚️","ضبط التنبيهات"],
    ["reminderInbox","🔔","الإشعارات"],
    ["appearance","🎨","شكل التطبيق"],
    ["qibla","🧭","اتجاه القبلة"],
    ["profile","👤","الملف الشخصي"]
  ];
  let returnMode="main",bagSection="",inboxId=null;
  let adhanReturnFocus=null, adhanHome=null, sidebarWasInert=false;

  let adhanViewObserver=null, adhanViewQueued=false;
  function arrangeAdhanView(){
    adhanViewQueued=false;
    const dialog=document.getElementById("adhanServicesDialog"),p=document.getElementById("adhanPanel");
    if(!dialog||dialog.hidden||!p||!dialog.contains(p))return;
    const voice=dialog.dataset.aoqatView==="voice";
    const timetable=p.querySelector("#adNext")?.closest(".ad-card");
    if(timetable)timetable.classList.add("aoqat-prayer-timetable");
    let holder=p.querySelector("#aoqatVoiceOnly");
    if(voice){
      if(!holder){
        holder=document.createElement("div");holder.id="aoqatVoiceOnly";
        if(timetable)timetable.after(holder);else p.prepend(holder);
        const hint=document.createElement("p");hint.className="ad-note";
        hint.textContent="تنبيهات الصلاة والصامت وعدم الإزعاج موجودة حصراً داخل «ضبط التنبيهات».";
        holder.append(hint);
      }
      const sound=p.querySelector("#adSection-sound .ad-card");
      if(sound&&sound.parentElement!==holder)holder.prepend(sound);
    }else if(holder){
      const sound=holder.querySelector(".ad-card");
      const home=p.querySelector("#adSection-sound .ad-leaf-body")||p.querySelector("#adSection-sound");
      if(home&&sound)home.appendChild(sound);
      holder.remove();
    }
  }
  function queueAdhanView(){
    if(adhanViewQueued)return;
    adhanViewQueued=true;requestAnimationFrame(arrangeAdhanView);
  }
  function closeAdhanServices(){
    const dialog=document.getElementById("adhanServicesDialog");
    if(!dialog||dialog.hidden)return false;
    if(dialog.dataset.aoqatView==="voice"){
      dialog.dataset.aoqatView="alerts";arrangeAdhanView();
    }
    dialog.hidden=true;document.body.classList.remove("adhan-services-open");
    const p=document.getElementById("adhanPanel");
    if(p&&adhanHome){p.classList.remove("inline-open","active-panel");adhanHome.appendChild(p);}
    const sidebar=document.querySelector(".sidebar");if(sidebar)sidebar.inert=sidebarWasInert;
    if(adhanReturnFocus?.isConnected)adhanReturnFocus.focus({preventScroll:true});
    return true;
  }
  function openAdhanServices(view="voice"){
    const p=document.getElementById("adhanPanel");if(!p)return;
    let dialog=document.getElementById("adhanServicesDialog");
    if(!dialog){
      dialog=document.createElement("section");dialog.id="adhanServicesDialog";dialog.hidden=true;
      dialog.dir="rtl";dialog.setAttribute("role","dialog");dialog.setAttribute("aria-modal","true");dialog.setAttribute("aria-labelledby","adhanServicesTitle");
      dialog.innerHTML='<header class="ad-modal-head"><button type="button" id="adhanServicesBack" aria-label="رجوع إلى بيانات الأذان والإقامة">‹ رجوع</button><h2 id="adhanServicesTitle">الأذان والتنبيه</h2></header><div id="adhanServicesBody"><div id="aoqatPrayerAlertExtra" class="web-settings-list" hidden><button type="button" class="main-action" id="aoqatPrayerIqamaEntry">⏳ إشعار الإقامة ‹</button><button type="button" class="main-action" id="aoqatPrayerQuietEntry">🔕 تفعيل وضع الصامت ‹</button></div></div>';
      document.body.appendChild(dialog);
      dialog.querySelector("#adhanServicesBack").onclick=closeAdhanServices;
      dialog.querySelector("#aoqatPrayerIqamaEntry").onclick=()=>{
        closeAdhanServices();
        openSub("إشعار الإقامة",window.AoqatAlertsHub?.iqamaView?.(),"prayerAlerts");
      };
      dialog.querySelector("#aoqatPrayerQuietEntry").onclick=()=>{
        closeAdhanServices();
        if(window.AndroidNative?.configureAdhan)openAlertSection("quiet");
        else openSub("تفعيل وضع الصامت",window.AoqatAlertsHub?.iqamaView?.(),"prayerAlerts");
      };
      dialog.addEventListener("keydown",e=>{
        if(e.key==="Escape"){e.preventDefault();e.stopPropagation();closeAdhanServices();}
        if(e.key!=="Tab")return;
        const controls=[...dialog.querySelectorAll('button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled)')].filter(el=>el.getClientRects().length);
        const first=controls[0],last=controls.at(-1);
        if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}
        else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}
      });
    }
    const mode=view==="alerts"?"alerts":"voice";
    if(!dialog.hidden&&dialog.contains(p)){
      dialog.dataset.aoqatView=mode;
      dialog.querySelector("#aoqatPrayerAlertExtra").hidden=mode!=="alerts";
      dialog.querySelector("#adhanServicesTitle").textContent=mode==="alerts"?"تنبيهات أوقات الصلاة":"مواقيت الصلاة وصوت الأذان";
      queueAdhanView();return;
    }
    adhanReturnFocus=document.activeElement;adhanHome=p.parentElement;
    const sidebar=document.querySelector(".sidebar");sidebarWasInert=sidebar?.inert||false;if(sidebar)sidebar.inert=true;
    dialog.dataset.aoqatView=mode;
    dialog.querySelector("#aoqatPrayerAlertExtra").hidden=mode!=="alerts";
    dialog.querySelector("#adhanServicesTitle").textContent=mode==="alerts"?"تنبيهات أوقات الصلاة":"مواقيت الصلاة وصوت الأذان";
    dialog.querySelector("#adhanServicesBack").setAttribute("aria-label",mode==="alerts"?"رجوع إلى ضبط التنبيهات":"رجوع إلى بيانات الأذان والإقامة");
    dialog.querySelector("#adhanServicesBody").appendChild(p);dialog.hidden=false;
    if(!adhanViewObserver){
      adhanViewObserver=new MutationObserver(queueAdhanView);
      adhanViewObserver.observe(p,{childList:true});
    }
    queueAdhanView();
    document.body.classList.add("adhan-services-open");dialog.querySelector("#adhanServicesBody").scrollTop=0;
    dialog.querySelector("#adhanServicesBack").focus({preventScroll:true});
  }
  window.aoqatCloseAdhanServices=closeAdhanServices;

  function addStyles(){
    if(document.getElementById("webDrawerExactStyles"))return;
    const s=document.createElement("style");s.id="webDrawerExactStyles";s.textContent=`
      body.design-menu-open .sidebar .main-panel{position:fixed!important;inset:0 0 0 auto!important;width:min(78vw,355px)!important;max-width:355px!important;height:100dvh!important;min-height:0!important;max-height:100dvh!important;box-sizing:border-box!important;overflow:hidden!important;padding:0!important;margin:0!important;border:0!important;border-radius:0!important;background:#fff!important;color:#111!important;box-shadow:-12px 0 28px #0004!important;z-index:10020!important}
      body.design-menu-open .sidebar .main-panel>h2#webSettingsHeading{height:78px!important;min-height:78px!important;box-sizing:border-box!important;margin:0!important;padding:0 20px!important;display:flex!important;align-items:center!important;justify-content:center!important;text-align:center!important;font-family:Arial,Tahoma,sans-serif!important;font-size:24px!important;font-weight:700!important;line-height:1.25!important;color:#153642!important;text-shadow:none!important;border-bottom:1px solid #ddd!important;background:#fff!important}
      body.design-menu-open:not(.quran-reader-open) .sidebar .panel.main-panel{position:fixed!important;inset:0 0 0 auto!important;width:min(78vw,355px)!important;max-width:355px!important;height:100dvh!important;min-height:0!important;max-height:100dvh!important;box-sizing:border-box!important;overflow:hidden!important;padding:0!important;margin:0!important;border:0!important;border-radius:0!important;background:#fff!important;color:#111!important;box-shadow:-12px 0 28px #0004!important;z-index:10020!important}
      #webExactDrawer{display:none}body.design-menu-open #webExactDrawer{display:block!important;height:calc(100dvh - 78px)!important;overflow:hidden!important;background:#fff!important}
      body.design-menu-open:not(.quran-reader-open) #webExactDrawer{position:absolute!important;inset:78px 0 0!important;margin:0!important;padding:0!important;z-index:1!important}
      body.design-menu-open .sidebar .main-panel>#datePrayerGroup,body.design-menu-open .sidebar .main-panel>#backgroundFontGroup,body.design-menu-open .sidebar .main-panel>#webAppearanceBtn,body.design-menu-open .sidebar .main-panel>#topExportJpg{display:none!important}
      body.design-menu-open .sidebar .main-panel>#webThemePanel{display:none!important}
      body.design-menu-open #webDrawerSub .web-theme-drawer-panel{display:block!important;position:static!important;width:100%!important;margin:0!important;padding:8px!important;border:1px solid var(--wt-border,#ddd)!important;border-radius:9px!important;background:var(--wt-surface,#fffaf0)!important;color:var(--wt-text,#222)!important}
      body.design-menu-open #webDrawerSub .web-theme-drawer-panel .wt-grid{display:grid!important;grid-template-columns:1fr 1fr!important;gap:6px!important}
      body.design-menu-open #webDrawerSub .web-theme-drawer-panel .wt-card{min-height:58px!important;height:auto!important;margin:0!important;padding:6px!important;border:1px solid var(--wt-border,#38515d)!important;border-radius:8px!important;background:var(--wt-surface2,#0b1b27)!important;color:var(--wt-text,#fff)!important;display:flex!important;flex-direction:column!important;align-items:center!important;justify-content:center!important;gap:3px!important;font-size:10px!important}
      body.design-menu-open #webDrawerSub .web-theme-drawer-panel .wt-swatch{width:32px;height:14px;border-radius:999px;border:1px solid #0002;display:block!important}
      body.design-menu-open #webExactDrawer #webDrawerMain{height:100%!important;min-height:0!important;max-height:100%!important;overflow-y:auto!important;overflow-x:hidden!important;overscroll-behavior:contain!important;touch-action:pan-y!important;-webkit-overflow-scrolling:touch;box-sizing:border-box!important;padding-bottom:calc(24px + env(safe-area-inset-bottom,0px))!important;background:#fff}.web-drawer-row{width:100%!important;height:64px!important;margin:0!important;padding:0 24px!important;border:0!important;border-bottom:1px solid color-mix(in srgb,var(--wt-border,#d9c8a8) 70%,#fff)!important;border-radius:0!important;background:linear-gradient(90deg,var(--wt-surface,#fffaf0),var(--wt-surface2,#f8efd9))!important;color:var(--wt-text,#3f3425)!important;display:flex!important;align-items:center!important;justify-content:flex-start!important;gap:18px!important;font-size:18px!important;font-weight:600!important;text-align:right!important;box-shadow:none!important}.web-drawer-row:nth-child(odd){background:linear-gradient(90deg,var(--wt-surface2,#f8efd9),var(--wt-surface,#fffaf0))!important}.web-drawer-row .ico{width:30px;font-size:24px;text-align:center}.web-drawer-row .txt{flex:1}
      #webDrawerSub{display:none;height:100%;overflow:hidden;background:#fff}#webDrawerSub.open{display:flex!important;flex-direction:column!important}.web-sub-head{flex:0 0 58px;display:flex;align-items:center;gap:8px;padding:8px 10px;border-bottom:1px solid #ddd;background:#fff}.web-back{width:42px;height:42px;border:0;border-radius:9px;background:#39afd2;color:#fff;font-size:25px;font-weight:900}.web-sub-title{flex:1;text-align:right;font-size:20px;font-weight:800;color:#2b5265}.web-sub-body{flex:1;min-height:0;overflow-y:auto;padding:10px;background:#fff}
      body.design-menu-open #webDrawerSub .inline-control-panel,body.design-menu-open #webDrawerSub .panel,body.design-menu-open #webDrawerSub .font-panel{display:block!important;position:static!important;transform:none!important;inset:auto!important;width:100%!important;max-width:none!important;height:auto!important;min-height:0!important;margin:0!important;padding:12px!important;background:var(--wt-surface,#fffaf0)!important;color:var(--wt-text,#222)!important;border:1px solid var(--wt-border,#ddd)!important;border-radius:9px!important;box-shadow:none!important}
      body.design-menu-open #webDrawerSub .panel-title,body.design-menu-open #webDrawerSub .font-title{display:none!important}
      .web-settings-list{display:grid;gap:7px}.web-settings-list .main-action{width:100%!important;min-height:48px!important;height:auto!important;margin:0!important;padding:9px 12px!important;border-radius:9px!important;font-size:15px!important;background:linear-gradient(90deg,var(--wt-surface,#fffaf0),var(--wt-surface2,#f8efd9))!important;color:var(--wt-text,#284435)!important;border:1px solid var(--wt-border,#c5d5c8)!important;font-weight:600!important;text-align:right!important;box-shadow:none!important}.web-settings-list .main-action:nth-of-type(odd){background:linear-gradient(90deg,var(--wt-surface2,#f8efd9),var(--wt-surface,#fffaf0))!important}.web-settings-list .main-action[aria-pressed="true"]{outline:2px solid var(--wt-accent,#278052)!important;outline-offset:-2px!important}
      /* Legible labels and icons on the exact same gradient as the main drawer. */
      .web-settings-list .main-action{font-family:Tahoma,Arial,sans-serif!important;font-size:17px!important;font-weight:750!important;line-height:1.65!important;color:var(--wt-text,#233c32)!important;text-shadow:none!important}
      .web-settings-list .main-action :is(span,strong,b,small,em,i){color:inherit!important;text-shadow:none!important;font-weight:inherit}
      .web-settings-list .main-action span[aria-hidden="true"]{font-size:1.14em!important;text-shadow:0 1px 1px #0004!important}
      #webExactDrawer #webDrawerMain .web-drawer-row :is(.txt,.ico){color:var(--wt-text,#233c32)!important}
      #webExactDrawer #webDrawerMain .web-drawer-row .txt{font-weight:750!important}
      #webExactDrawer #webDrawerMain .web-drawer-row .ico{filter:drop-shadow(0 1px 1px #0004)!important}
      body.design-menu-open #webDrawerSub #webThemePanel{display:block!important;position:static!important;width:100%!important;margin:0!important;padding:8px!important}
      #saveToPhoneBtn{display:none!important}
      /* النص السفلي يُفتح فقط من الإعدادات؛ أخفِ الزر القديم المكرر من واجهة البرنامج. */
      .sidebar .main-panel>button.main-action[data-open-panel="footerPanel"]{display:none!important}
      /* واجهة البرنامج: هذه الأدوات حُذفت نهائياً من العرض حسب التصميم الحالي. */
      body.design-menu-open #webDrawerSub #backgroundPanel>label:has(#bgType),
      body.design-menu-open #webDrawerSub #backgroundPanel>#gradientBox,
      body.design-menu-open #webDrawerSub #backgroundPanel>#imageBox{display:none!important}
      body.design-menu-open #webDrawerSub #backgroundPanel>.inline-back-btn{display:none!important}
      /* النص السفلي يبقى فقط داخل الإعدادات، ولا يظهر مكرراً داخل واجهة البرنامج. */
      body.design-menu-open #webDrawerSub #backgroundPanel #footerBtn,
      body.design-menu-open #webDrawerSub #backgroundPanel [data-panel="footerPanel"],
      body.design-menu-open #webDrawerSub #backgroundPanel [data-target="footerPanel"]{display:none!important}
      /* واجهة البرنامج لا تحتوي زر النص السفلي؛ يبقى فقط داخل الإعدادات. */
      body.design-menu-open #webDrawerSub #backgroundPanel #footerBtn,
      body.design-menu-open #webDrawerSub #backgroundPanel [data-panel="footerPanel"],
      body.design-menu-open #webDrawerSub #backgroundPanel [data-target="footerPanel"]{display:none!important}
      /* The drawer already has one back button; hide legacy inline back controls inside subpages. */
      body.design-menu-open #webDrawerSub .design-popup-close{display:none!important}
      /* إصلاح لوحة ألوان تنسيق الخط داخل القائمة الجديدة: لا نغيّر منطق الألوان، فقط نعيد إظهار لون كل swatch. */
      body.design-menu-open #webDrawerSub #fontPanel input[type="color"]{display:block!important;width:100%!important;min-height:46px!important;padding:3px!important;opacity:1!important;visibility:visible!important}
      body.design-menu-open #webDrawerSub #fontPanel [style*="background-color"],
      body.design-menu-open #webDrawerSub #fontPanel [style*="background:"]{opacity:1!important;visibility:visible!important}

    `;document.head.appendChild(s);
  }

  function subOverlay(){
    let d=document.getElementById("settingsContentDialog");if(d)return d;
    d=document.createElement("section");d.id="settingsContentDialog";d.className="sidebar";d.hidden=true;d.dir="rtl";d.setAttribute("role","dialog");d.setAttribute("aria-modal","true");d.setAttribute("aria-labelledby","webSubTitle");document.body.appendChild(d);
    d.addEventListener("keydown",e=>{if(e.key==="Escape"){e.preventDefault();e.stopPropagation();d.querySelector(".web-back")?.click();}});return d;
  }

  let interfaceMove=null;
  function restoreInterfacePart(){if(!interfaceMove)return;const {node,anchor}=interfaceMove;if(anchor.parentNode)anchor.replaceWith(node);interfaceMove=null;}
  function openInterfacePart(key,title){
    restoreInterfacePart();
    const panel=document.getElementById('backgroundPanel');
    const selectors={elements:'#interfaceVisibilityControls .interface-visibility-grid',designs:'#designVisibilityControls .interface-visibility-grid',tools:'#backgroundDesignTools .bg-tools-grid'};
    const node=panel?.querySelector(selectors[key]);if(!node)return;
    const anchor=document.createComment('interface-controls-home');node.before(anchor);
    const view=document.createElement('section');view.id='webInterfacePage';view.className='web-settings-list';
    openSub(title,view,'background');view.appendChild(node);interfaceMove={node,anchor};
    if(key==='tools'){
      const b=document.createElement('button');b.type='button';b.className='main-action';b.dataset.webFooter='true';b.textContent='✍ النص السفلي';b.style.textAlign='right';
      b.onclick=()=>openPanel('النص السفلي','footerPanel','tools');view.appendChild(b);
    }
  }
  function prepareInterfaceMenu(panel){
    panel.classList.add('web-interface-menu');
    if(panel.querySelector('#webInterfaceMenu'))return;
    const list=document.createElement('div');list.id='webInterfaceMenu';list.className='web-settings-list';
    for(const [key,icon,title] of [['elements','👁️','إظهار عناصر واجهة البرنامج'],['designs','🖼️','إظهار / إخفاء التصاميم'],['tools','🛠️','أدوات تعديل التصميم']]){
      const b=document.createElement('button');b.type='button';b.className='main-action';b.dataset.interfacePage=key;b.innerHTML=icon+' <span>'+title+'</span> <span aria-hidden="true">‹</span>';b.onclick=()=>openInterfacePart(key,title);list.appendChild(b);
    }
    showShortButtonHelp(list,{
      elements:'إظهار أو إخفاء الساعة والتاريخ وعدّادي الصلاة والإقامة.',
      designs:'تحديد التصاميم الظاهرة في واجهة البرنامج.',
      tools:'تعديل أماكن العناصر والتصميم.'
    });
    panel.insertBefore(list,panel.querySelector('[data-web-footer]'));
    if(!document.getElementById('webInterfaceMenuStyle')){const style=document.createElement('style');style.id='webInterfaceMenuStyle';style.textContent='body.design-menu-open #webDrawerSub #backgroundPanel.web-interface-menu{padding:0!important;border:0!important;background:transparent!important;box-shadow:none!important}#backgroundPanel.web-interface-menu>#backgroundDesignTools,#backgroundPanel.web-interface-menu>#interfaceVisibilityControls,#backgroundPanel.web-interface-menu>#designVisibilityControls{display:none!important}#webInterfaceMenu button{display:flex;gap:9px;align-items:center;text-align:right}#webInterfaceMenu button span:last-child{margin-inline-start:auto}body.design-menu-open #webDrawerSub #backgroundPanel.web-interface-menu #webInterfaceMenu>button.main-action{background:linear-gradient(90deg,var(--wt-surface,#fffaf0),var(--wt-surface2,#f8efd9))!important;color:var(--wt-text,#233c32)!important;border:1px solid var(--wt-border,#c5d5c8)!important;box-shadow:none!important;text-shadow:none!important}body.design-menu-open #webDrawerSub #backgroundPanel.web-interface-menu #webInterfaceMenu>button.main-action:nth-of-type(odd){background:linear-gradient(90deg,var(--wt-surface2,#f8efd9),var(--wt-surface,#fffaf0))!important}body.design-menu-open #webDrawerSub #backgroundPanel.web-interface-menu #webInterfaceMenu>button.main-action span{color:inherit!important;text-shadow:none!important}#webInterfacePage .interface-visibility-grid,#webInterfacePage .bg-tools-grid{display:grid!important;grid-template-columns:1fr!important;gap:8px!important;width:100%!important}#webInterfacePage button{width:100%!important;min-height:48px!important;margin:0!important;padding:9px 12px!important;border-radius:9px!important;font-size:15px!important}#webInterfacePage .manual-edit-toggle-wrap{margin:0!important;width:100%!important}';document.head.appendChild(style);}
  }

  function restoreMoved(){
    restoreInterfacePart();
    window.AoqatAlertsHub?.park?.();
    window.aoqatCloseService?.();
    const body=document.getElementById("webSubBody"),home=document.querySelector(".sidebar .main-panel");
    if(!body||!home)return;
    body.querySelector("#prayerShareView")?.aoqatDispose?.();
    body.querySelector("#communityPostView")?.aoqatDispose?.();
    [...(webOnly?body.querySelectorAll(":scope > .panel,:scope > .font-panel,:scope > .inline-control-panel,#webSettingsTemp > #switchPanel"):body.children)].forEach(el=>{if(el.matches(".panel,.font-panel,.inline-control-panel")&&el.id!=="webSettingsTemp"){el.classList.remove("inline-open","active-panel");home.appendChild(el);}});
  }
  function mainView(){
    restoreMoved();const sub=document.getElementById("webDrawerSub");sub?.classList.remove("open");if(sub)document.getElementById("webExactDrawer")?.appendChild(sub);const overlay=document.getElementById("settingsContentDialog");if(overlay)overlay.hidden=true;
    const m=document.getElementById("webDrawerMain");if(m)m.style.display="block";returnMode="main";
  }
  function openSub(title,node,backTo="main"){
    restoreMoved();const m=document.getElementById("webDrawerMain"),sub=document.getElementById("webDrawerSub"),body=document.getElementById("webSubBody");
    if(!sub||!body)return;if(m)m.style.display="none";body.innerHTML="";document.getElementById("webSubTitle").textContent=title;
    if(node)body.appendChild(node);sub.classList.add("open");const overlay=subOverlay();overlay.appendChild(sub);overlay.hidden=false;body.scrollTop=0;returnMode=backTo;
  }
  function openPanel(title,id,backTo="main"){
    if(id==="adhanPanel"){openAdhanServices();return;}
    const p=document.getElementById(id);if(!p)return;
    if(webOnly&&id==='backgroundPanel')prepareInterfaceMenu(p);
    if(webOnly&&id==='fontPanel'){window.PrayerFontCore?.restoreAll?.();window.PrayerFontCore?.load?.();}
    p.classList.add("inline-control-panel","inline-open","active-panel");openSub(title,p,backTo);
  }

  // Help bubbles are rendered by the separate CSS-only helper.
  // Do not wrap/reparent inner settings actions: doing so broke the adhan menus.
  function showShortButtonHelp(host,descriptions){
    // doNotWrapHelpButtons — original button nodes, IDs and handlers remain intact.
    return host;
  }
  const DESIGN_HELP={
    backgroundPanel:'إظهار عناصر الشاشة والتصاميم وتعديل الواجهة.',
    fontPanel:'تغيير نوع الخط وحجمه ولونه.',
    footerPanel:'تعديل النص السفلي للتصميم.'
  };
  const ALERT_HELP={
    prayer:'ضبط الأذان والمنبه والصامت لكل صلاة.',
    iqama:'إشعار الإقامة وخيارات الصامت.',
    friday:'تذكير سنن الجمعة وسورة الكهف.',
    fasting:'تذكير صيام التطوع قبل موعده.',
    azkar:'أوقات تذكير الأذكار والصلاة على النبي ﷺ.',
    publish:'التبديل إلى الغد وتنبيه النشر بعد العشاء.',
    calendarNotice:'تنبيه مشاركة تقويم الشهر الجديد.',
    screen:'إضاءة الهاتف عند وصول التنبيهات المفعّلة.'
  };

  // Owner-pilot profile: entirely offline, optional data only. No cloud account,
  // server registration, password, automatic upload or native preference reset.
  const PROFILE_DISPLAY_NAME_KEY="aoqatLocalProfileNameV1";
  const PROFILE_EMAIL_KEY="aoqatLocalProfileEmailV1";
  const PROFILE_AVATAR_KEY="aoqatLocalProfileAvatarV1";
  const PROFILE_BACKUP_KEYS=[
    PROFILE_DISPLAY_NAME_KEY,PROFILE_EMAIL_KEY,PROFILE_AVATAR_KEY,
    "aoqatQuranReaderV1","aoqatAdhanV1","aoqatIqamaMinutesV1",
    "aoqatAfterIqamaMinutesV1","aoqatAzkarRemindersV1",
    "aoqatFridayRemindersV1","aoqatFastingRemindersV1",
    "aoqatMonthlyCalendarsV1","aoqatYearGalleryStylesV5",
    "aoqatWebAppearanceThemeV1","aoqatWebButtonAppearanceV1",
    "aoqatAlertScreenWakeV1","aoqatWebHelpLiveStyle"
  ];
  function profileView(){
    const panel=document.createElement("section");panel.id="aoqatPersonalProfile";
    panel.dir="rtl";panel.className="web-settings-list";
    panel.style.cssText="max-width:560px;margin:0 auto;padding:10px 10px 22px;line-height:1.5;color:var(--wt-text,#173c50)";
    function el(tag,text,css){
      const node=document.createElement(tag);
      if(text!==null&&text!==undefined)node.textContent=text;
      if(css)node.style.cssText=css;
      return node;
    }
    const note=el("p","","font-size:12px;margin:7px 0 0;line-height:1.5;color:var(--wt-text,#324b51)");
    note.id="aoqatProfileSaveStatus";note.setAttribute("role","status");note.setAttribute("aria-live","polite");
    function say(t){note.textContent=t;}
    function get(k){try{return localStorage.getItem(k)||"";}catch(_){return "";}}
    function put(k,v){if(v)localStorage.setItem(k,v);else localStorage.removeItem(k);}
    const sections=(heading)=>{
      const title=el("h3",heading,"font-size:13px;font-weight:700;margin:14px 0 6px;padding:0 4px");
      panel.append(title);
    };
    function row(id,title,subtitle,action,icon){
      const b=el("button",null,"width:100%;display:flex;align-items:center;gap:10px;min-height:49px;border:1px solid var(--wt-border,#c7d8df);border-radius:11px;background:var(--wt-surface,#fff);color:var(--wt-text,#173c50);padding:8px 10px;margin:4px 0;text-align:right;font:inherit;cursor:pointer");
      b.id=id;b.type="button";b.className="aoqat-profile-row";
      const glyph=el("span",icon,"font-size:19px;flex:0 0 26px;text-align:center");
      const detail=el("span",null,"display:flex;flex:1;min-width:0;flex-direction:column;gap:2px");
      detail.append(el("span",title,"font-size:14px;font-weight:700"));
      if(subtitle)detail.append(el("small",subtitle,"font-size:11px;opacity:.75;overflow-wrap:anywhere"));
      b.append(glyph,detail,el("span","‹","font-size:20px;opacity:.6"));
      b.onclick=action;panel.append(b);return b;
    }
    function field(label,id,type,max,placeholder){
      const wrap=el("label",null,"display:block;font-size:13px;font-weight:700;margin:10px 0 4px");
      wrap.textContent=label;
      const input=el("input",null,"width:100%;min-height:43px;padding:8px 11px;margin-top:4px;border:1px solid var(--wt-border,#b5cad0);border-radius:9px;box-sizing:border-box;background:var(--wt-surface,#fff);color:var(--wt-text,#173c50);font-size:15px");
      input.id=id;input.type=type;input.maxLength=max;input.placeholder=placeholder;
      wrap.append(input);return {wrap,input};
    }
    const card=el("div",null,"border:1px solid var(--wt-border,#c7d8df);border-radius:14px;background:var(--wt-surface,#fff);padding:12px;display:flex;align-items:center;gap:12px");
    card.id="aoqatProfileCard";
    const avatar=el("div","👤","width:58px;height:58px;flex:0 0 58px;border-radius:50%;display:grid;place-items:center;background:#e5f2f5;overflow:hidden;font-size:27px");
    avatar.id="aoqatProfileAvatar";
    const info=el("div",null,"flex:1;min-width:0;text-align:right");
    const display=el("strong","","font-size:17px;display:block;overflow-wrap:anywhere");display.id="aoqatProfileDisplayName";
    const emailText=el("div","","font-size:12px;opacity:.8;overflow-wrap:anywhere");
    info.append(display,emailText,el("small","الحويجة وضواحيها – العراق · ملف محلي","font-size:11px;opacity:.8"));
    const editButton=el("button","تعديل","border:1px solid var(--wt-border,#bfd1d7);border-radius:9px;background:transparent;color:inherit;min-height:36px;padding:5px 9px;font-size:12px;cursor:pointer");
    editButton.type="button";editButton.id="aoqatProfileEdit";
    card.append(avatar,info,editButton);panel.append(card);
    function refresh(){
      const name=get(PROFILE_DISPLAY_NAME_KEY).slice(0,40);
      const email=get(PROFILE_EMAIL_KEY).slice(0,150);
      display.textContent=name||"مستخدم التطبيق";
      emailText.textContent=email||"البريد الإلكتروني غير مضاف";
      avatar.textContent="";avatar.replaceChildren();
      const picture=get(PROFILE_AVATAR_KEY);
      if(/^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(picture)&&picture.length<190000){
        const image=el("img",null,"height:100%;width:100%;object-fit:cover");
        image.alt="الصورة الشخصية";image.src=picture;avatar.append(image);
      }else avatar.textContent=name?Array.from(name)[0]:"👤";
    }
    refresh();
    const edit=el("div",null,"display:none;border:1px solid var(--wt-border,#c7d8df);border-radius:12px;padding:10px;margin:8px 0;background:var(--wt-surface,#fff)");
    edit.id="aoqatProfileEditPanel";
    const nameField=field("اسم العرض","aoqatProfileNickname","text",40,"الاسم (اختياري)");
    const emailField=field("البريد الإلكتروني","aoqatProfileEmail","email",150,"name@example.com (اختياري)");
    emailField.input.autocomplete="email";nameField.input.autocomplete="nickname";
    nameField.input.value=get(PROFILE_DISPLAY_NAME_KEY);
    emailField.input.value=get(PROFILE_EMAIL_KEY);
    const photo=field("الصورة الشخصية","aoqatProfilePhoto","file",1,"");
    photo.input.accept="image/png,image/jpeg,image/webp";photo.input.removeAttribute("maxlength");
    const buttons=el("div",null,"display:flex;gap:8px;margin:8px 0");
    function actionButton(id,text,fn){
      const b=el("button",text,"min-height:40px;flex:1;border:1px solid var(--wt-border,#b5cad0);border-radius:9px;background:var(--wt-surface,#fff);color:var(--wt-text,#173c50);font-size:13px;font-weight:700;padding:6px;cursor:pointer");
      b.type="button";b.id=id;b.onclick=fn;return b;
    }
    const save=actionButton("aoqatProfileSave","حفظ التغييرات",()=>{
      const name=nameField.input.value.trim().replace(/\s+/g," ").slice(0,40);
      const email=emailField.input.value.trim().slice(0,150);
      if(email&&(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||email.includes(" "))){
        say("صيغة البريد الإلكتروني غير صحيحة.");emailField.input.focus();return;
      }
      try{put(PROFILE_DISPLAY_NAME_KEY,name);put(PROFILE_EMAIL_KEY,email);
        refresh();edit.style.display="none";say("حُفظت البيانات على الهاتف فقط. لم يُنشأ حساب إلكتروني.");
      }catch(_){say("تعذّر حفظ البيانات على الهاتف.");}
    });
    const cancel=actionButton("aoqatProfileCancel","إلغاء",()=>{
      nameField.input.value=get(PROFILE_DISPLAY_NAME_KEY);
      emailField.input.value=get(PROFILE_EMAIL_KEY);
      edit.style.display="none";
    });
    buttons.append(save,cancel);
    const clearPhoto=actionButton("aoqatProfileClearPhoto","حذف الصورة",()=>{
      if(!confirm("حذف الصورة الشخصية من هذا الهاتف فقط؟"))return;
      try{localStorage.removeItem(PROFILE_AVATAR_KEY);photo.input.value="";refresh();say("تم حذف الصورة الشخصية.");}catch(_){say("تعذّر حذف الصورة.");}
    });
    clearPhoto.style.flex="none";clearPhoto.style.width="100%";
    edit.append(nameField.wrap,emailField.wrap,photo.wrap,buttons,clearPhoto);
    panel.append(edit);
    editButton.onclick=()=>{const opening=edit.style.display==="none";edit.style.display=opening?"block":"none";if(opening)nameField.input.focus();};
    photo.input.onchange=()=>{
      const file=photo.input.files&&photo.input.files[0];if(!file)return;
      if(!/^image\/(png|jpeg|webp)$/.test(file.type)||file.size>3*1024*1024){
        say("اختر صورة PNG أو JPG أو WEBP بحجم أقل من 3 ميغابايت.");photo.input.value="";return;
      }
      const reader=new FileReader();
      reader.onload=()=>{
        const image=new Image();image.onload=()=>{
          const canvas=document.createElement("canvas");const side=160;canvas.width=side;canvas.height=side;
          const context=canvas.getContext("2d");if(!context){say("تعذّر تجهيز الصورة.");return;}
          const scale=Math.max(side/image.width,side/image.height);
          context.drawImage(image,(side-image.width*scale)/2,(side-image.height*scale)/2,image.width*scale,image.height*scale);
          const result=canvas.toDataURL("image/jpeg",.7);
          try{put(PROFILE_AVATAR_KEY,result);refresh();say("تم حفظ الصورة على الهاتف.");}
          catch(_){say("تعذّر حفظ الصورة، جرّب صورة أصغر.");}
          photo.input.value="";
        };
        image.onerror=()=>say("الصورة غير صالحة.");
        image.src=String(reader.result||"");
      };
      reader.onerror=()=>say("تعذّر قراءة الصورة.");
      reader.readAsDataURL(file);
    };
    sections("الملف الشخصي");
    row("aoqatProfileEditRow","الاسم والصورة والبريد الإلكتروني","بيانات اختيارية محفوظة محلياً",()=>editButton.click(),"👤");
    function quranDetails(){
      try{const x=JSON.parse(get("aoqatQuranReaderV1")||"{}");
        const count=Array.isArray(x.bookmarks)?x.bookmarks.length:0;
        const page=Number(x.page)||1;
        return {count,page:Math.max(1,Math.min(604,Math.floor(page)))};
      }catch(_){return {count:0,page:1};}
    }
    sections("القرآن ومحفوظاتي");
    row("aoqatProfileQuranBookmarks","محفوظاتي في المصحف",String(quranDetails().count)+" علامة مرجعية محفوظة",()=>{
      mainView();document.querySelector('[data-drawer="quran"]')?.click();
    },"🔖");
    row("aoqatProfileQuranLastPage","آخر صفحة قرأتها","الصفحة "+quranDetails().page,()=>{
      mainView();document.querySelector('[data-drawer="quran"]')?.click();
    },"📖");
    sections("النسخ الاحتياطي");
    const backupHint=el("small","نسخة من بيانات الملف والإعدادات والمحفوظات المحلية المتاحة فقط؛ لا تشمل الأذونات أو الملفات الصوتية أو إعدادات أندرويد الداخلية.","display:block;margin:1px 4px 8px;font-size:11px;opacity:.8");
    panel.append(backupHint);
    const backupTextArea=el("textarea",null,"width:100%;box-sizing:border-box;min-height:100px;font-size:11px;margin-top:5px;display:none;direction:ltr");
    backupTextArea.id="aoqatProfileBackupText";backupTextArea.readOnly=true;
    function backupData(){
      const data={};let total=0;
      for(const k of PROFILE_BACKUP_KEYS){const value=get(k);
        if(!value)continue;
        if(value.length>500000)throw Error("حجم أحد الإعدادات أكبر من المسموح.");
        total+=value.length;if(total>1700000)throw Error("البيانات كبيرة جداً لإنشاء نسخة محلية.");
        data[k]=value;
      }
      return {format:"aoqat-local-backup",version:1,exportedAt:new Date().toISOString(),data};
    }
    const backupCopy=actionButton("aoqatProfileBackupCopy","نسخ بيانات النسخة",async()=>{
      backupTextArea.select();
      try{
        if(navigator.clipboard&&navigator.clipboard.writeText){await navigator.clipboard.writeText(backupTextArea.value);}
        else if(!document.execCommand("copy"))throw Error("copy unsupported");
        say("تم نسخ البيانات. احفظها بملف نصي آمن خارج التطبيق.");
      }catch(_){say("حدّد النص الظاهر وانسخه يدوياً واحفظه بمكان آمن.");}
    });
    backupCopy.style.display="none";backupCopy.style.width="100%";
    row("aoqatProfileBackupExport","إنشاء نسخة احتياطية","حفظ بياناتي المحلية خارج التطبيق",async()=>{
      let value;try{value=JSON.stringify(backupData());}catch(e){say(e.message||"تعذّر إنشاء النسخة.");return;}
      const filename="AOQAT-backup-"+new Date().toISOString().slice(0,10)+".json";
      try{
        const file=new File([value],filename,{type:"application/json"});
        if(navigator.share&&navigator.canShare&&navigator.canShare({files:[file]})){
          try{await navigator.share({files:[file],title:"نسخة احتياطية لأوقات الصلاة"});say("تم فتح خيارات مشاركة النسخة الاحتياطية.");return;}
          catch(e){if(e&&e.name==="AbortError")return;}
        }
        // Browser downloads use the browser; Android WebView's blob hook is
        // for images only, so NEVER route a JSON blob into saveDataUrl().
        if(!window.AndroidNative?.configureAdhan){
          const url=URL.createObjectURL(new Blob([value],{type:"application/json"}));
          const a=document.createElement("a");a.href=url;a.download=filename;
          document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1200);
          say("تم طلب تنزيل نسخة JSON.");return;
        }
      }catch(_){}
      backupTextArea.style.display="block";backupCopy.style.display="block";
      backupTextArea.value=value;say("هذه بيانات النسخة. انسخها واحفظها خارج التطبيق. تحتوي الاسم والبريد إن وجد.");
    },"💾");
    panel.append(backupTextArea,backupCopy);
    const restoreInput=el("input",null,"display:none");restoreInput.type="file";restoreInput.accept=".json,application/json";restoreInput.id="aoqatProfileRestoreFile";
    const restorePanel=el("div",null,"display:none;border:1px solid var(--wt-border,#c7d8df);border-radius:10px;padding:10px;margin:6px 0;background:var(--wt-surface,#fff)");
    restorePanel.id="aoqatProfileRestorePanel";
    const restoreText=el("textarea",null,"min-height:84px;width:100%;box-sizing:border-box;font-size:12px;direction:ltr");
    restoreText.placeholder="ألصق بيانات النسخة هنا، أو اختر ملف JSON";
    const choose=actionButton("aoqatProfileChooseRestore","اختيار ملف JSON",()=>restoreInput.click());
    const restore=actionButton("aoqatProfileRestoreSave","استعادة البيانات",()=>{
      let parsed;try{parsed=JSON.parse(restoreText.value);}
      catch(_){say("ملف النسخة غير صالح.");return;}
      if(!parsed||parsed.format!=="aoqat-local-backup"||parsed.version!==1||!parsed.data||typeof parsed.data!=="object"||Array.isArray(parsed.data)){
        say("صيغة النسخة الاحتياطية غير مدعومة.");return;
      }
      const entries=Object.entries(parsed.data);
      if(!entries.length||entries.length>PROFILE_BACKUP_KEYS.length||entries.some(([k,v])=>!PROFILE_BACKUP_KEYS.includes(k)||typeof v!=="string"||v.length>500000)||restoreText.value.length>2000000){
        say("النسخة تحتوي على بيانات غير مسموحة أو حجم كبير.");return;
      }
      if(!confirm("استعادة النسخة قد تستبدل إعداداتك ومحفوظاتك المحلية الحالية. هل تريد المتابعة؟"))return;
      const previous={};try{
        for(const [k] of entries)previous[k]=localStorage.getItem(k);
        for(const [k,v] of entries)put(k,v);
        refresh();say("اكتملت استعادة البيانات المحلية. أغلق التطبيق وافتحه لتظهر الإعدادات.");
        restorePanel.style.display="none";
      }catch(_){
        try{for(const [k,v] of Object.entries(previous))put(k,v);}catch(_){}
        say("تعذّرت الاستعادة، ولم تُحذف البيانات الأخرى.");
      }
    });
    restorePanel.append(restoreInput,restoreText,choose,restore);
    restoreInput.onchange=()=>{
      const f=restoreInput.files&&restoreInput.files[0];if(!f)return;
      if(f.size>2000000){say("الملف كبير جداً.");return;}
      const reader=new FileReader();
      reader.onload=()=>{restoreText.value=String(reader.result||"");say("تم اختيار الملف. اضغط استعادة البيانات للمتابعة.");};
      reader.onerror=()=>say("تعذّر فتح ملف النسخة.");
      reader.readAsText(f);restoreInput.value="";
    };
    row("aoqatProfileBackupRestore","استعادة نسخة احتياطية","من ملف JSON أو نص محفوظ",()=>{
      restorePanel.style.display=restorePanel.style.display==="none"?"block":"none";
    },"📥");
    panel.append(restorePanel);
    sections("المساعدة والخصوصية");
    row("aoqatProfilePrivacy","سياسة الخصوصية","قراءة السياسة داخل التطبيق",()=>privacyView(),"🔒");
    row("aoqatProfileContact","تواصل معنا عبر واتساب","فتح جهة الدعم",()=>window.AoqatHelpSupport?.openWhatsApp?.(),"💬");
    row("aoqatProfileAbout","حول التطبيق","أوقات الصلاة في الحويجة وضواحيها · التجريبي 2.12 (بناء 150)",()=>{
      say("النسخة التجريبية تستقبل تحديثات OTA الموقّعة تلقائياً عند اتصال التطبيق بالإنترنت.");
    },"ℹ️");
    sections("إدارة الملف الشخصي");
    row("aoqatProfileDelete","حذف بيانات الملف الشخصي","الاسم والبريد والصورة فقط، دون إعدادات الصلاة أو المصحف",()=>{
      if(!confirm("حذف الاسم والبريد والصورة من الهاتف؟ لا يوجد حساب إلكتروني لحذفه."))return;
      try{
        localStorage.removeItem(PROFILE_DISPLAY_NAME_KEY);
        localStorage.removeItem(PROFILE_EMAIL_KEY);
        localStorage.removeItem(PROFILE_AVATAR_KEY);
        nameField.input.value="";emailField.input.value="";refresh();
        edit.style.display="none";say("تم حذف بيانات الملف الشخصي فقط.");
      }catch(_){say("تعذّر حذف بيانات الملف الشخصي.");}
    },"🗑️");
    panel.append(note);
    openSub("الملف الشخصي",panel,"main");
  }
  function settingsView(){
    const wrap=document.createElement("div");wrap.id="webSettingsTemp";wrap.className="web-settings-list";
    SETTINGS.filter(([key])=>!["date","prayer","iqama","afterIqama",...(webOnly?["footer"]:[])].includes(key)).forEach(([key,icon,label,panel])=>{const b=document.createElement("button");b.type="button";b.className="main-action";b.dataset.panel=panel;b.dataset.title=label;b.innerHTML=icon+" <span>"+label+"</span>";wrap.appendChild(b);});
    wrap.addEventListener("click",e=>{const b=e.target.closest("[data-panel]");if(b)openPanel(b.dataset.title,b.dataset.panel,"settings");});
    if(webOnly){const b=document.createElement('button');b.type='button';b.className='main-action';b.dataset.settingSavePhone='true';b.textContent='📱 مشاركة التصميم';b.onclick=savePhone;wrap.appendChild(b);}
    showShortButtonHelp(wrap,DESIGN_HELP);
    openSub("إعدادات التصميم",wrap,"main");
    // Switch controls have their own page on both web and APK; never duplicate them in the settings root.

  }
  // Self-contained policy copy: readable in the offline APK, no web fetch.
  const PRIVACY_SECTIONS=[{"title":"ما الذي يحتفظ به التطبيق على الجهاز؟","paragraphs":["يحفظ التطبيق إعدادات العرض والأذان والإقامة والتنبيهات والصامت والمواقيت المختارة، وما تنشئه من تصاميم وتقاويم، وعلامات المصحف المرجعية، في مساحة التخزين المحلية للتطبيق متى كانت الميزة متاحة. لا تحتاج وظائف الصلاة والمصحف الأساسية في نسخة أندرويد المجهزة للعمل دون إنترنت إلى حساب شخصي.","يمكنك مسح البيانات المحلية عبر إعدادات التطبيق في هاتفك أو إزالة التطبيق؛ وقد تُفقد حينها إعداداتك وعلاماتك وملفاتك غير المحفوظة خارج التطبيق."]},{"title":"الموقع والاتجاه إلى القبلة","paragraphs":["قد تطلب ميزة اتجاه القبلة إذن الموقع التقريبي (ACCESS_COARSE_LOCATION) لحساب اتجاه القبلة من موقع الهاتف، وتستخدم حساسات الاتجاه عند توفرها. يُستخدم الموقع لهذه المهمة على الجهاز؛ ولا تتضمن وظيفة القبلة البرمجية الحالية إرسال الإحداثيات إلى خادمنا. يمكنك رفض الإذن أو سحبه من إعدادات الهاتف.","مواقيت الصلاة الأساسية مخصصة لمدينة الحويجة وضواحيها، ولا تحتاج إلى تتبع مستمر لموقعك."]},{"title":"الإنترنت وخدمات الجهات الأخرى","paragraphs":["عند الاتصال بالإنترنت قد يتواصل التطبيق مع خدمة Supabase للحصول على بيانات مواقيت الصلاة وتحديثاتها، وقد يرسل بيانات المواقيت التي تختار حفظها في قاعدة البيانات عند استخدام أمر الحفظ المتاح في الواجهة.","إذا اخترت تشغيل إشعارات الويب الخلفية، قد تُرسل إلى خدمة الاشتراك بيانات اشتراك الإشعارات، ومنها عنوان الاشتراك ومفاتيحه والمنطقة الزمنية، لغرض إيصال الإشعار إلى متصفحك. تستطيع تعطيل الاشتراك من إعدادات التنبيهات.","قد تعالج خدمات الاستضافة والشبكات عنوان IP ومعلومات الاتصال التقنية وسجلات الأمان اللازمة لتقديم الخدمة. وإذا اخترت التواصل عبر واتساب، تُفتح خدمة واتساب الخارجية وتسري عليها سياسة الخصوصية الخاصة بها."]},{"title":"أذونات الهاتف","paragraphs":["قد يطلب التطبيق إذناً للإشعارات والمنبهات الدقيقة وإظهار التنبيه على شاشة القفل، وتشغيل خدمات التنبيه في الخلفية والتحكم بوضع عدم الإزعاج أو الصوت، بحسب الميزة التي تفعّلها. تُستخدم هذه الصلاحيات لتشغيل الأذان والإقامة والتذكيرات ولا تعني وحدها إرسال معلومات شخصية.","قد تُستخدم أدوات اختيار الملفات أو مشاركة الصور عندما تطلب حفظ تصميم أو مشاركته. لا تُرفع ملفاتك الشخصية تلقائياً بمجرد اختيارها."]},{"title":"الاحتفاظ بالبيانات والحماية","paragraphs":["تبقى البيانات المحلية في مساحة التطبيق إلى أن تحذفها أو تمسح بيانات التطبيق، وفق آليات أندرويد والنسخ الاحتياطي المفعّلة على جهازك. بيانات اشتراك الإشعارات المرتبطة بالخدمة تبقى حسب حالة الاشتراك وإجراءات مشغّل الخدمة؛ وعند إلغاء الاشتراك يحاول التطبيق إبلاغ الخادم بحذفه.","تستخدم اتصالات خدماتنا الشبكية المعتمدة HTTPS حيثما تكون الخدمة متاحة. لا يمكن ضمان خلو أي نقل أو تخزين إلكتروني من المخاطر بالكامل. يمكن أن تحتفظ مزودات البنية التحتية بسجلات تقنية لأغراض التشغيل والأمان وفق سياساتها."]},{"title":"خياراتك وطلبات الحذف","paragraphs":["تستطيع تعطيل الأذونات من إعدادات أندرويد، وإيقاف الإشعارات من التطبيق، ومسح إعدادات التطبيق المحلية. إذا رغبت في الاستفسار عن بيانات قد تكون محفوظة لدى الخدمة، أو طلب حذفها، تواصل معنا عبر «تواصل معنا عبر واتساب» الموجود بالتطبيق مع توضيح الطلب، دون إرسال كلمة مرور أو مفتاح توقيع."]},{"title":"التغييرات والتواصل","paragraphs":["قد نعدّل هذه السياسة عند تغيير الوظائف أو الأذونات أو الخدمات المستخدمة، ونحدّث تاريخ المراجعة. راجع هذه الصفحة عند تثبيت إصدار جديد.","اسم التطبيق: أوقات الصلاة في الحويجة وضواحيها. جهة التواصل: خدمة الدعم عبر خيار «تواصل معنا عبر واتساب» داخل التطبيق. تاريخ آخر تحديث: 20 تشرين الثاني 2026."]}];
  function privacyView(){
    const wrap=document.createElement("section");wrap.id="aoqatPrivacyPolicy";
    wrap.dir="rtl";wrap.style.cssText="max-width:720px;margin:0 auto;padding:7px 9px 22px;color:var(--wt-text,#293d37);line-height:1.75";
    const intro=document.createElement("p");
    intro.textContent="تطبيق أوقات الصلاة في الحويجة وضواحيها — أندرويد والويب | آخر تحديث: 20 تشرين الثاني 2026";
    intro.style.cssText="font-size:13px;color:var(--wt-text,#3a504a);margin:0 0 10px";
    const summary=document.createElement("p");
    summary.textContent="توضح هذه السياسة المعلومات المحلية والاتصالات الاختيارية والخدمات الخارجية. تختلف الإمكانات باختلاف نسخة التطبيق والجهاز.";
    summary.style.cssText="margin:0 0 9px;font-size:13px";
    wrap.append(intro,summary);
    for(const entry of PRIVACY_SECTIONS){
      const section=document.createElement("section");section.style.cssText="border:1px solid var(--wt-border,#d7dfd9);border-radius:11px;background:var(--wt-surface,#fff);padding:10px 12px;margin:8px 0";
      const h=document.createElement("h3");h.textContent=entry.title;h.style.cssText="font-size:15px;margin:0 0 5px;line-height:1.55";
      section.append(h);
      for(const passage of entry.paragraphs){
        const p=document.createElement("p");p.textContent=passage;p.style.cssText="font-size:13px;line-height:1.85;margin:5px 0";
        section.append(p);
      }
      wrap.append(section);
    }
    const contact=document.createElement("button");contact.type="button";
    contact.className="main-action";contact.textContent="💬 الاستفسارات وطلبات الخصوصية";
    contact.style.cssText="width:100%;min-height:44px;margin-top:7px";
    contact.onclick=()=>window.AoqatHelpSupport?.openWhatsApp?.();
    wrap.append(contact);
    openSub("سياسة الخصوصية",wrap,"profile");
  }
  function guideView(){const api=window.AoqatHelpSupport;if(api)openSub("شرح استخدام التطبيق",api.guide(),"main");}
  function contactView(){window.AoqatHelpSupport?.openWhatsApp?.();}
  // Only this master control governs the requested screen-wake policy for ALL
  // enabled alarms and reminders. It does not create or schedule notifications.
  // The native Android services will honor this saved preference in the APK;
  // a web page cannot wake a locked phone from the background.
  const WAKE_ALERTS_KEY="aoqatAlertScreenWakeV1";
  function screenWakeView(){
    const wrap=document.createElement("section");wrap.className="web-settings-list";wrap.id="aoqatWakeAlertsSettings";wrap.dir="rtl";
    const heading=document.createElement("p");heading.className="ad-note";
    heading.textContent="إضاءة شاشة الهاتف عند وصول أي تنبيه مفعّل، سواء كان أذاناً أو منبّه صلاة أو إشعار صلاة أو تنبيه نشر مواقيت الغد أو التقويم أو الأذكار والجمعة والصيام. زر واحد للجميع، بدون تغيير الأصوات أو مواعيد التنبيهات.";
    const button=document.createElement("button");button.type="button";button.id="aoqatWakeAllAlerts";button.className="main-action";
    const enabled=()=>localStorage.getItem(WAKE_ALERTS_KEY)!=="0";
    const refresh=()=>{const on=enabled();button.textContent="💡 إضاءة الشاشة لجميع التنبيهات: "+(on?"مفعّلة":"متوقفة");button.setAttribute("aria-pressed",String(on));};
    button.onclick=()=>{localStorage.setItem(WAKE_ALERTS_KEY,enabled()?"0":"1");refresh();window.dispatchEvent(new Event("aoqatScreenWakePreferenceChanged"));};
    const note=document.createElement("p");note.className="ad-note";
    note.textContent="التحكم بإضاءة شاشة الهاتف وهي مقفلة يحتاج خدمات أندرويد وصلاحيات الهاتف؛ هذا الخيار يُحفظ هنا لتجهيزه لنسخة APK بعد اعتمادك. عرض الأذان بملء الشاشة خيار مستقل داخل «تنبيهات أوقات الصلاة»؛ أما الإشعارات العادية فيتحكم نظام أندرويد بكيفية إضاءتها.";
    wrap.append(heading,button,note);refresh();openSub("إضاءة الشاشة عند التنبيهات",wrap,"alertSettings");
  }
  function alertSettingsView(){
    const wrap=document.createElement("section");wrap.id="aoqatAlertSettings";wrap.dir="rtl";wrap.className="web-settings-list";
    const options=[
      ["prayer","🔔","تنبيهات أوقات الصلاة"],
      ["friday","🌿","تنبيهات سنن يوم الجمعة"],
      ["fasting","🌙","تنبيهات صيام التطوع"],
      ["azkar","📿","تنبيهات الأذكار"],
      ["publish","⏰","التبديل التلقائي وتنبيه النشر"],
      ["calendarNotice","📅","تنبيه نشر تقويم الشهر"],
      ["screen","💡","إضاءة الشاشة لجميع التنبيهات"]
    ];
    options.forEach(([kind,ico,label])=>{
      const button=document.createElement("button");button.type="button";button.className="main-action";button.dataset.alertSection=kind;
      button.textContent=ico+" "+label+" ‹";button.onclick=()=>openAlertSection(kind);wrap.append(button);
    });
    showShortButtonHelp(wrap,ALERT_HELP);
    openSub("ضبط التنبيهات",wrap,"main");
  }
  function openAlertSection(kind){
    const api=window.AoqatAlertsHub;
    if(kind==="prayer"){openAdhanServices("alerts");return;}
    if(kind==="screen"){screenWakeView();return;}
    if(kind==="calendarNotice"){window.AoqatCalendars?.reminder?.(alertSettingsView);return;}
    if(kind==="quiet"){window.AoqatApkQuietSettings?.render?.();openPanel("تفعيل وضع الصامت","quietPanel","prayerAlerts");return;}
    if(kind==="friday"){const wrap=document.createElement("div");wrap.className="web-settings-list";openSub("تنبيهات سنن يوم الجمعة",wrap,"alertSettings");window.AoqatFridayReminders?.mount?.(wrap);return;}
    if(kind==="fasting"){const wrap=document.createElement("div");wrap.className="web-settings-list";const controls=window.AoqatFastingReminders?.createControls?.();if(controls)wrap.append(controls);openSub("تنبيهات صيام التطوع",wrap,"alertSettings");return;}
    if(kind==="azkar"){
      const wrap=document.createElement("div");wrap.className="web-settings-list";
      const core=window.AoqatAzkarRemindersCore,controls=document.createElement("div");controls.id="aoqatAzkarAlertControls";
      (core?.ids||[]).forEach(id=>{const button=document.createElement("button");button.type="button";button.className="main-action";button.dataset.alertAzkar=id;
        button.textContent="🔔 "+(core.titles[id]||id);button.onclick=()=>{
          controls.replaceChildren();window.AoqatAzkarReminders?.mount?.(controls,id);
          wrap.querySelectorAll("[data-alert-azkar]").forEach(x=>x.setAttribute("aria-pressed",String(x===button)));
        };wrap.append(button);});
      wrap.append(controls);openSub("تنبيهات الأذكار",wrap,"alertSettings");return;
    }
    if(kind==="publish"){openSub("تنبيه نشر مواقيت اليوم التالي",api?.publishView?.(),"alertSettings");return;}
  }
  function datePrayerView(){
    const wrap=document.createElement("div");wrap.id="webDatePrayerTemp";wrap.className="web-settings-list";
    SETTINGS.filter(([key])=>["date","prayer"].includes(key)).forEach(([key,icon,label,panel])=>{
      const b=document.createElement("button");b.type="button";b.className="main-action";b.dataset.panel=panel;b.dataset.title=label;b.innerHTML=icon+" <span>"+label+"</span>";wrap.appendChild(b);
    });
    wrap.addEventListener("click",e=>{const b=e.target.closest("[data-panel]");if(b)openPanel(b.dataset.title,b.dataset.panel,"datePrayer");});
    if(webOnly){const b=document.createElement('button');b.type='button';b.className='main-action';b.dataset.timeChoiceOpen='true';b.textContent='🕰️ طريقة اختيار أوقات الصلاة';b.onclick=()=>openSub('طريقة اختيار أوقات الصلاة',window.aoqatPrayerTimeChoiceView(),'datePrayer');wrap.appendChild(b);}
    openSub("بيانات التاريخ و الصلاة",wrap,"main");
  }
  function muslimBagView(){
    bagSection='';window.aoqatCloseAzkarCategory?.();
    const wrap=document.createElement('div');wrap.id='muslimBagMenu';wrap.className='web-settings-list';
    for(const [id,icon,label] of [['azkar','📿','الأذكار'],['friday','🌿','سنن يوم الجمعة و آدابها'],['fasting','🌙','صيام التطوع']]){
      const b=document.createElement('button');b.type='button';b.className='main-action';b.dataset.bagSection=id;
      b.innerHTML=icon+' <span>'+label+'</span><span aria-hidden="true">‹</span>';b.onclick=()=>openMuslimBagSection(id);wrap.appendChild(b);
    }
    openSub('حقيبة المسلم',wrap,'main');
  }
  function openMuslimBagSection(kind,topicId){
    if(!webOnly)return;
    if(kind==='fasting'){bagSection=kind;openSub('صيام التطوع',window.AoqatMuslimBag.createFastingView(topicId),'muslimBag');return;}
    if(!['azkar','friday'].includes(kind))return;
    bagSection=kind;openPanel(kind==='friday'?'سنن يوم الجمعة و آدابها':'الأذكار','prayerServicePanel','muslimBag');window.aoqatOpenService?.('azkar');
    if(kind==='friday'){
      window.aoqatOpenAzkarCategory?.('friday');
      const closeCategory=window.aoqatCloseAzkarCategory;
      window.aoqatCloseAzkarCategory=()=>{if(returnMode==='muslimBag'&&bagSection==='friday'){bagSection='';closeCategory?.();muslimBagView();return true;}return closeCategory?.()||false;};
      const back=document.getElementById('adAzkarBack');if(back){back.textContent='‹ رجوع إلى حقيبة المسلم';back.onclick=muslimBagView;}
    }
  }
  window.aoqatOpenMuslimBagSection=openMuslimBagSection;
  window.aoqatOpenCommunityPost=function(kind,topicId,targetDate){
    if(!webOnly||!['friday','fasting'].includes(kind)||!window.AoqatCommunityPosts)return;
    bagSection='';window.aoqatCloseAzkarCategory?.();document.body.classList.add('design-menu-open');
    openSub(kind==='friday'?'بوست سنن الجمعة':'بوست صيام التطوع',window.AoqatCommunityPosts.createShareView(kind,topicId,targetDate),'post:'+kind);
  };
  function inboxView(id){
    if(!webOnly||!window.AoqatReminderInbox)return;
    bagSection='';window.aoqatCloseAzkarCategory?.();document.body.classList.add('design-menu-open');
    inboxId=id||null;openSub('الإشعارات',window.AoqatReminderInbox.createView(id),id?'reminderInbox':'main');
  }
  window.aoqatOpenNotification=inboxView;
  window.addEventListener('aoqatInboxChanged',()=>{if(document.getElementById('reminderInbox')&&['main','reminderInbox'].includes(returnMode)&&document.getElementById('webDrawerSub')?.classList.contains('open'))inboxView(inboxId);});
  function adhanIqamaView(){
    const wrap=document.createElement("div");wrap.className="web-settings-list";
    [["🔊","مواقيت الصلاة وصوت الأذان","adhanPanel"],["⏳","أوقات الإقامة","iqamaPanel"],["⏱️","أوقات بعد الإقامة","afterIqamaPanel"]].forEach(([icon,title,id])=>{const b=document.createElement("button");b.type="button";b.className="main-action";b.dataset.panel=id;b.textContent=icon+" "+title;b.onclick=()=>openPanel(title,id,"adhanIqama");wrap.appendChild(b);});
    showShortButtonHelp(wrap,{adhanPanel:'مواقيت الصلاة وصوت المؤذن.',iqamaPanel:'المدة بين الأذان والإقامة.',afterIqamaPanel:'مدة ظهور مضى على الإقامة.'});
    openSub("بيانات الاذان والإقامة",wrap,"main");
  }
  function widgetAppearanceView(){
    const panel=window.AoqatWidgetAppearance?.createPanel?.();
    if(panel)openSub("تعديل بطاقات الشاشة الرئيسية",panel,"appearance");
  }
  function themeView(){const p=document.createElement("div");p.className="web-theme-drawer-panel";const source=document.getElementById("webThemePanel");if(source){p.innerHTML=source.innerHTML;}else{p.innerHTML='<div class="wt-head"><span>🎨 الثيمات والألوان</span><span>اختيار مباشر</span></div><div class="wt-grid"><button type="button" class="wt-card" data-theme="cream-blue">🟦 كريمي وأزرق فاتح</button><button type="button" class="wt-card" data-theme="cream-gold">🟨 كريمي وذهبي هادئ</button><button type="button" class="wt-card" data-theme="white-sky">🔵 أبيض وسماوي حديث</button><button type="button" class="wt-card" data-theme="cream-green">🟩 كريمي وأخضر هادئ</button><button type="button" class="wt-card" data-theme="beige-gold">🟫 بيج وذهبي أنيق</button><button type="button" class="wt-card" data-theme="dark-night">🌙 داكن كحلي (ليلي)</button></div>';}p.addEventListener("click",e=>{const card=e.target.closest(".wt-card");if(!card)return;if(typeof window.applyWebTheme==="function")window.applyWebTheme(card.dataset.theme);p.querySelectorAll(".wt-card").forEach(b=>b.classList.toggle("is-active",b.dataset.theme===document.body.dataset.webTheme));window.refreshWebThemeControls?.();});p.querySelectorAll(".wt-card").forEach(b=>b.classList.toggle("is-active",b.dataset.theme===document.body.dataset.webTheme));const widgets=document.createElement("button");widgets.type="button";widgets.className="main-action";
    widgets.textContent="🖼️ تعديل بطاقات الشاشة الرئيسية";
    widgets.style.cssText="display:block;width:100%;margin:4px 0 14px;padding:12px;border-radius:12px;text-align:center;font-weight:800;background:linear-gradient(90deg,var(--wt-surface,#f9f7f0),var(--wt-surface2,#e1eeec));color:var(--wt-text,#193f42);border:1px solid var(--wt-border,#b4cbd1)";
    widgets.onclick=widgetAppearanceView;p.prepend(widgets);
    openSub("شكل التطبيق",p,"main");window.refreshWebThemeControls?.();}
  function savePhone(){
    if(webOnly&&window.aoqatCreatePrayerShareView){document.body.classList.add('design-menu-open');openSub('مشاركة التصميم',window.aoqatCreatePrayerShareView(),'program');return;}
    const b=document.getElementById("saveToPhoneBtn");if(b){b.click();return;}const x=document.querySelector("[data-save-phone]");if(x)x.click();}

  window.aoqatOpenPrayerShare=savePhone;

  function install(){
    const main=document.querySelector(".sidebar .main-panel");if(!main)return false;addStyles();
    if(document.getElementById("webExactDrawer"))return true;
    const drawer=document.createElement("div");drawer.id="webExactDrawer";
    const mainList=document.createElement("div");mainList.id="webDrawerMain";mainList.className="web-drawer-main";
    MENU_ROWS.forEach(([id,icon,label])=>{const b=document.createElement("button");b.type="button";b.className="web-drawer-row";b.dataset.drawer=id;b.innerHTML='<span class="ico">'+icon+'</span><span class="txt">'+label+'</span>';mainList.appendChild(b);});
    const sub=document.createElement("div");sub.id="webDrawerSub";sub.innerHTML='<div class="web-sub-head"><button type="button" class="web-back" aria-label="رجوع">‹ رجوع</button><div id="webSubTitle" class="web-sub-title"></div></div><div id="webSubBody" class="web-sub-body"></div>';
    drawer.append(mainList,sub);main.appendChild(drawer);
    sub.querySelector(".web-back").addEventListener("click",()=>{if(returnMode.startsWith("post:")){openMuslimBagSection(returnMode.slice(5));return;}if(returnMode==="muslimBag"&&bagSection==="friday"){muslimBagView();return;}if(window.aoqatAzkarCategory&&window.aoqatCloseAzkarCategory?.())return;if(returnMode==="muslimBag"){muslimBagView();return;}if(returnMode==="reminderInbox"){inboxView();return;}if(returnMode==="program"){mainView();if(document.body.classList.contains('design-menu-open'))document.getElementById('designSideMenuBtn')?.click();}else if(returnMode==="tools")openInterfacePart('tools','أدوات تعديل التصميم');else if(returnMode==="background")openPanel('واجهة البرنامج','backgroundPanel','settings');else if(returnMode==="settings")settingsView();else if(returnMode==="profile")profileView();else if(returnMode==="alertSettings")alertSettingsView();else if(returnMode==="prayerAlerts"){mainView();openAdhanServices("alerts");}else if(returnMode==="appearance")themeView();else if(returnMode==="datePrayer")datePrayerView();else if(returnMode==="adhanIqama")adhanIqamaView();else mainView();});
    mainList.addEventListener("click",e=>{
      const b=e.target.closest("[data-drawer]");if(!b)return;const id=b.dataset.drawer;
      if(["quran","qibla","azkar"].includes(id)){
        const title=MENU_ROWS.find(row=>row[0]===id)?.[2]||id;
        openPanel(title,"prayerServicePanel");window.aoqatOpenService?.(id);return;
      }
      if(id==="reminderInbox"){inboxView();return;}
      if(id==="muslimBag"){muslimBagView();return;}
      if(id==="settings"){settingsView();return;}
      if(id==="usageGuide"){guideView();return;}
      if(id==="profile"){profileView();return;}
      if(id==="privacyPolicy"){privacyView();return;}
       if(id==="contactWhatsApp"){contactView();return;}
       if(id==="alertSettings"){alertSettingsView();return;}
       if(id==="calendar"){window.aoqatOpenCalendar?.();return;}
      if(id==="prayerTimeChoice"){openSub("طريقة اختيار أوقات الصلاة",window.aoqatPrayerTimeChoiceView(),"main");return;}
      if(id==="datePrayer"){datePrayerView();return;}
      if(id==="adhanIqama"){adhanIqamaView();return;}
      if(id==="notifications"){openPanel("الإشعارات","switchPanel");return;}
      if(id==="appearance"){themeView();return;}
      if(id==="savePhone")savePhone();
    });
    try{mainList.querySelector('[data-drawer="adhanIqama"]').classList.toggle("adhan-on",JSON.parse(localStorage.getItem("aoqatAdhanV1")||"{}").enabled===true);}catch(_){}
    const reminderId=new URL(location.href).searchParams.get('reminder');
    if(webOnly&&reminderId)inboxView(reminderId);
    const sharedPage=Number(new URL(location.href).searchParams.get("quranPage"));
    if(!window.AndroidNative?.configureAdhan && Number.isInteger(sharedPage) && sharedPage>=1 && sharedPage<=604){
      let attempts=0;const timer=setInterval(()=>{
        if(document.getElementById("prayerServicePanel") && window.aoqatOpenService){clearInterval(timer);document.body.classList.add("design-menu-open");mainList.querySelector('[data-drawer="quran"]').click();}
        else if(++attempts>50)clearInterval(timer);
      },100);
    }
    return true;
  }
  window.AoqatWebSettingsNavigation={
    main:mainView,sub:openSub,panel:(id,title)=>openPanel(title,id,'settings'),interface:openInterfacePart,
    adhan:()=>{adhanIqamaView();openAdhanServices();},quiet:()=>{if(window.AndroidNative?.configureAdhan)openAlertSection('quiet');else openAdhanServices('alerts');},alerts:alertSettingsView,bag:openMuslimBagSection,
    drawer:id=>{mainView();document.querySelector('[data-drawer="'+id+'"]')?.click();}
  };
  function start(){let n=0;const t=setInterval(()=>{if(install()||++n>80)clearInterval(t)},150);install();window.addEventListener("aoqatModulesReady",()=>setTimeout(install,100));}
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start,{once:true});else start();
})();




