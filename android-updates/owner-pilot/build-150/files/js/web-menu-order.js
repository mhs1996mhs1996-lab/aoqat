"use strict";
(function(){
  // القائمة الرئيسية تحتوي فقط على عناصر لها وظيفة حقيقية في المشروع.
  // أزيلت عناصر (الحويجة/اللغة/الصوت) لأنها كانت مجرد اختصارات شكلية مرتبطة بلوحات غير صحيحة.
  const ROWS=[
    ["settings","⚙️","إعدادت التصميم"],["notifications","🔔","الإشعارات"],["appearance","🎨","شكل التطبيق"],
    ["savePhone","📱","مشاركة التصميم"],
    ["datePrayer","📅","بيانات التاريخ و الصلاة"],
    ...[ ["prayerTimeChoice","🕰️","طريقة اختيار أوقات الصلاة"] ],["adhanIqama","🕌","بيانات الاذان والإقامة"],
    ["quran","📖","القرآن الكريم"],["qibla","🧭","اتجاه القبلة"],["azkar","📿","الأذكار"]
  ];
  const SETTINGS=[
    ["background","🎨","واجهة البرنامج","backgroundPanel"],["font","🔤","تنسيق الخط","fontPanel"],
    ["footer","✍","النص السفلي","footerPanel"],
    ["date","📅","بيانات التاريخ","datePanel"],["prayer","🕌","أوقات الصلاة","prayerPanel"],
    ["iqama","⏳","أوقات الإقامة","iqamaPanel"],
    ["afterIqama","⏱️","اوقات بعد الاقامة","afterIqamaPanel"]
  ];
  const webOnly=true;
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
    ["profile","👤","الملف الشخصي"],
    // Only this isolated owner-pilot feed receives this JS; production stays unchanged.
    ...(((window.AndroidNative?.readOwnerPilotOtaState && window.AndroidNative.readOwnerPilotOtaState()) || (window.AndroidNative?.configureAdhan && (location.protocol==="file:" || location.hostname==="appassets.androidplatform.net"))) ? [["ownerPilotOta","🔄","تحديثات النسخة التجريبية"]] : [])
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
    if(node)body.appendChild(node);sub.classList.toggle("aoqat-cards-sub",!!node&&["aoqatCardsAndLockMenu","aoqatWidgetAppearance","aoqatLockCardSettings","aoqatLockFontMenu","aoqatLockFontState"].includes(node.id));cardsAndLockBackButton(sub,true); sub.classList.add("open");const overlay=subOverlay();overlay.appendChild(sub);overlay.hidden=false;body.scrollTop=0;returnMode=backTo;
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
  // Owner-pilot-only browser backup service. Three local snapshots are retained
  // in IndexedDB. They are NOT a cloud backup and vanish if app data is erased.
  const PROFILE_BACKUP_PLAN_KEY="aoqatProfileBackupScheduleV2";
  const PROFILE_BACKUP_LAST_AUTO="aoqatProfileBackupLastAutoV2";
  const PROFILE_BACKUP_DB="aoqat-profile-backups-v2";
  const PROFILE_BACKUP_LIMIT=3;
  const PROFILE_BACKUP_PERIOD={daily:86400000,weekly:604800000};
  let profileBackupLastQuran=null;
  let profileBackupInFlight=null;
  function profileBackupAllowedKey(name){
    return PROFILE_BACKUP_KEYS.includes(name)||name==="quranPage"||name===PROFILE_BACKUP_PLAN_KEY||
      (/^aoqat[A-Z][A-Za-z0-9_-]{0,75}$/.test(name) &&
      !/(token|auth|secret|private|password|sign|update|ota|cache|blob|asset|backupLast|snapshot|session|nonce)/i.test(name));
  }
  function profileBackupIncludedKeys(){
    const keys=new Set([...PROFILE_BACKUP_KEYS,"quranPage",PROFILE_BACKUP_PLAN_KEY]);
    try{
      for(let i=0;i<localStorage.length;i++){
        const name=localStorage.key(i)||"";
        // Selected user settings only; never copy credentials, caches, or OTA.
        if(profileBackupAllowedKey(name))keys.add(name);
      }
    }catch(_){}
    return [...keys].sort();
  }
  function profileBackupMakeData(){
    const data={}, allow=profileBackupIncludedKeys();
    let size=0;
    for(const key of allow){
      let value=null;
      try{value=localStorage.getItem(key);}catch(_){}
      if(value===null || value==="")continue;
      if(value.length>500000)throw Error("أحد الإعدادات كبير جداً.");
      size+=key.length+value.length;
      if(size>1800000)throw Error("النسخة أكبر من الحد المسموح.");
      data[key]=value;
    }
    if(!Object.keys(data).length)throw Error("لا توجد بيانات محفوظة بعد.");
    return {format:"aoqat-local-backup",version:2,exportedAt:new Date().toISOString(),data};
  }
  function profileBackupFingerprint(data){
    const txt=JSON.stringify(data);
    let h=2166136261;
    for(let i=0;i<txt.length;i++){h^=txt.charCodeAt(i);h=Math.imul(h,16777619);}
    return (h>>>0).toString(16)+":"+txt.length;
  }
  function profileBackupOpenDb(){
    return new Promise((resolve,reject)=>{
      if(!window.indexedDB){reject(Error("الحفظ المحلي غير متاح."));return;}
      let request;
      try{request=indexedDB.open(PROFILE_BACKUP_DB,2);}
      catch(e){reject(e);return;}
      request.onupgradeneeded=()=>{
        const db=request.result;
        if(!db.objectStoreNames.contains("copies"))db.createObjectStore("copies",{keyPath:"id"});
        if(!db.objectStoreNames.contains("quran"))db.createObjectStore("quran",{keyPath:"id"});
      };
      request.onsuccess=()=>resolve(request.result);
      request.onerror=()=>reject(request.error||Error("تعذّر فتح النسخ."));
      request.onblocked=()=>reject(Error("قاعدة النسخ مشغولة."));
    });
  }
  async function profileBackupList(){
    const db=await profileBackupOpenDb();
    return new Promise((resolve,reject)=>{
      const tx=db.transaction("copies","readonly");
      const request=tx.objectStore("copies").getAll();
      let data=[];
      request.onsuccess=()=>{data=Array.isArray(request.result)?request.result:[];};
      tx.oncomplete=()=>{db.close();resolve(data.sort((a,b)=>b.createdAt-a.createdAt));};
      tx.onerror=()=>{db.close();reject(tx.error||Error("تعذّرت قراءة النسخ."));};
      tx.onabort=()=>{db.close();reject(tx.error||Error("تعذّرت قراءة النسخ."));};
    });
  }
  async function profileBackupSave(reason,skipSame){
    if(profileBackupInFlight)await profileBackupInFlight;
    const task=(async()=>{
      const pack=profileBackupMakeData(), fp=profileBackupFingerprint(pack.data);
      const all=await profileBackupList();
      if(skipSame&&all[0]?.fingerprint===fp)return {created:false,copy:all[0]};
      const stamp=Date.now();
      const copy={id:String(stamp)+"-"+Math.random().toString(36).slice(2,7),
        createdAt:stamp,reason:reason||"manual",fingerprint:fp,pack};
      const db=await profileBackupOpenDb();
      await new Promise((resolve,reject)=>{
        const tx=db.transaction("copies","readwrite"), store=tx.objectStore("copies");
        store.put(copy);
        for(const old of all.slice(PROFILE_BACKUP_LIMIT-1))store.delete(old.id);
        tx.oncomplete=()=>{db.close();resolve();};
        tx.onerror=()=>{db.close();reject(tx.error||Error("تعذّر الحفظ."));};
        tx.onabort=()=>{db.close();reject(tx.error||Error("تعذّر الحفظ."));};
      });
      return {created:true,copy};
    })();
    profileBackupInFlight=task;
    try{return await task;}finally{if(profileBackupInFlight===task)profileBackupInFlight=null;}
  }
  function profileBackupValidate(raw){
    if(raw.length>2000000)throw Error("ملف النسخة كبير جداً.");
    let pack;
    try{pack=JSON.parse(raw);}catch(_){throw Error("ملف النسخة غير صالح.");}
    if(!pack||pack.format!=="aoqat-local-backup"||![1,2].includes(pack.version)||
       !pack.data||typeof pack.data!=="object"||Array.isArray(pack.data))
      throw Error("صيغة النسخة غير مدعومة.");
    const allow={has:profileBackupAllowedKey};
    const entries=Object.entries(pack.data);
    if(!entries.length||entries.length>120||entries.some(([k,v])=>
        !allow.has(k)||typeof v!=="string"||v.length>500000))
      throw Error("النسخة تحتوي بيانات غير مسموحة.");
    return entries;
  }
  function profileBackupRestore(raw){
    const entries=profileBackupValidate(raw);
    if(!confirm("سيتم استبدال الإعدادات والمحـفوظات الموجودة بمحتوى النسخة المحددة. متابعة؟"))
      return false;
    const previous={};
    try{
      for(const [key] of entries)previous[key]=localStorage.getItem(key);
      for(const [key,value] of entries)localStorage.setItem(key,value);
      return true;
    }catch(_){
      try{for(const [key,value] of Object.entries(previous))
        if(value===null)localStorage.removeItem(key);else localStorage.setItem(key,value);
      }catch(_){}
      throw Error("تعذّرت الاستعادة، ولم تُحذف بقية البيانات.");
    }
  }
  async function profileBackupSaveQuran(raw){
    if(!raw||raw.length>500000)return;
    const db=await profileBackupOpenDb();
    await new Promise((resolve,reject)=>{
      const tx=db.transaction("quran","readwrite");
      tx.objectStore("quran").put({id:"latest",createdAt:Date.now(),raw});
      tx.oncomplete=()=>{db.close();resolve();};
      tx.onerror=()=>{db.close();reject(tx.error||Error("تعذّر حفظ المصحف."));};
      tx.onabort=()=>{db.close();reject(tx.error||Error("تعذّر حفظ المصحف."));};
    });
  }
  async function profileBackupLatestQuran(){
    const db=await profileBackupOpenDb();
    return new Promise((resolve,reject)=>{
      const tx=db.transaction("quran","readonly"),req=tx.objectStore("quran").get("latest");
      let value=null;
      req.onsuccess=()=>{value=req.result||null;};
      tx.oncomplete=()=>{db.close();resolve(value);};
      tx.onerror=()=>{db.close();reject(tx.error||Error("تعذّرت قراءة محفوظات المصحف."));};
      tx.onabort=()=>{db.close();reject(tx.error||Error("تعذّرت قراءة محفوظات المصحف."));};
    });
  }
  async function profileBackupAutoTick(forceQuran){
    let plan="off",last=0,current="";
    try{
      plan=localStorage.getItem(PROFILE_BACKUP_PLAN_KEY)||"off";
      last=Number(localStorage.getItem(PROFILE_BACKUP_LAST_AUTO)||0);
      current=localStorage.getItem("aoqatQuranReaderV1")||"";
    }catch(_){return;}
    const period=PROFILE_BACKUP_PERIOD[plan]||0;
    const due=period>0&&(!last||Date.now()-last>=period);
    const quranChanged=Boolean(current)&&(profileBackupLastQuran===null||profileBackupLastQuran!==current);
    profileBackupLastQuran=current;
    if(!due&&!quranChanged&&!forceQuran)return;
    try{
      // Quran autosave never evicts one of the three full backups.
      if(quranChanged||forceQuran)await profileBackupSaveQuran(current);
      if(due){
        await profileBackupSave("scheduled",true);
        localStorage.setItem(PROFILE_BACKUP_LAST_AUTO,String(Date.now()));
      }
    }catch(_){/* Storage may be unavailable or full. Never delete user state. */}
  }
  if(!window.aoqatProfileBackupAutoHooksV2){
    window.aoqatProfileBackupAutoHooksV2=true;
    setTimeout(()=>profileBackupAutoTick(false),2500);
    setInterval(()=>profileBackupAutoTick(false),120000);
    document.addEventListener("visibilitychange",()=>{
      if(document.visibilityState==="hidden")profileBackupAutoTick(false);
    });
    document.addEventListener("click",event=>{
      if(event.target?.closest?.("#aqBookmark,#aqSaveMark,#aqMoreMark,[data-delete-mark],[data-saved]"))
        setTimeout(()=>profileBackupAutoTick(true),900);
    },true);
  }

  // Lossless PNG carrying a validated backup payload. The already-installed
  // Android bridge can share real PNG files through Gmail, Drive or Android's
  // share sheet. Never disguise JSON as a JPEG; an altered picture must fail
  // checksum validation BEFORE any user settings are restored.
  const PROFILE_BACKUP_IMAGE_MAGIC="AOQAT-BK3";
  const PROFILE_BACKUP_IMAGE_TOP=120;
  const PROFILE_BACKUP_IMAGE_WIDTH=1024;
  function profileBackupChecksum(bytes){
    let crc=0xffffffff;
    for(const b of bytes){
      crc^=b;
      for(let i=0;i<8;i++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);
    }
    return (crc^0xffffffff)>>>0;
  }
  function profileBackupImageEncode(raw){
    const data=new TextEncoder().encode(raw);
    if(data.length>2000000)throw Error("النسخة أكبر من الحد المسموح.");
    const bytes=new Uint8Array(18+data.length);
    for(let i=0;i<PROFILE_BACKUP_IMAGE_MAGIC.length;i++)
      bytes[i]=PROFILE_BACKUP_IMAGE_MAGIC.charCodeAt(i);
    const view=new DataView(bytes.buffer);
    view.setUint32(10,data.length,true);
    view.setUint32(14,profileBackupChecksum(data),true);
    bytes.set(data,18);
    return bytes;
  }
  function profileBackupImageDecode(imageBytes){
    const bytes=imageBytes instanceof Uint8Array?imageBytes:new Uint8Array(imageBytes);
    if(bytes.length<18)throw Error("هذا ليس ملف نسخة احتياطية.");
    for(let i=0;i<PROFILE_BACKUP_IMAGE_MAGIC.length;i++)
      if(bytes[i]!==PROFILE_BACKUP_IMAGE_MAGIC.charCodeAt(i))
        throw Error("هذه الصورة لا تحتوي على نسخة احتياطية.");
    const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
    const size=view.getUint32(10,true),expected=view.getUint32(14,true);
    if(!size||size>2000000||size+18>bytes.length)
      throw Error("ملف النسخة غير مكتمل.");
    const payload=bytes.slice(18,18+size);
    if(profileBackupChecksum(payload)!==expected)
      throw Error("تغيّرت الصورة أو ضُغطت أثناء المشاركة. استخدم الملف الأصلي بدون تعديل.");
    return new TextDecoder("utf-8",{fatal:true}).decode(payload);
  }
  function profileBackupBuildPng(raw){
    const bytes=profileBackupImageEncode(raw);
    const width=PROFILE_BACKUP_IMAGE_WIDTH;
    const dataRows=Math.ceil(bytes.length/(width*3));
    const height=PROFILE_BACKUP_IMAGE_TOP+dataRows;
    if(height>1800)throw Error("النسخة كبيرة جداً للمشاركة كصورة.");
    const canvas=document.createElement("canvas");
    canvas.width=width;canvas.height=height;
    const ctx=canvas.getContext("2d",{willReadFrequently:true});
    if(!ctx)throw Error("تعذّر تجهيز ملف النسخة.");
    const gradient=ctx.createLinearGradient(0,0,width,0);
    gradient.addColorStop(0,"#0a5366");gradient.addColorStop(1,"#2196a6");
    ctx.fillStyle=gradient;ctx.fillRect(0,0,width,PROFILE_BACKUP_IMAGE_TOP);
    ctx.fillStyle="#ffffff";ctx.textAlign="center";ctx.direction="rtl";
    ctx.font="bold 34px sans-serif";
    ctx.fillText("نسخة احتياطية • أوقات الصلاة في الحويجة",width/2,54);
    ctx.font="22px sans-serif";
    ctx.fillText("ملف محفوظاتك وإعداداتك — لا تعدّل هذه الصورة",width/2,91);
    const pixels=ctx.createImageData(width,dataRows);
    for(let i=0;i<width*dataRows;i++){
      const base=i*4,index=i*3;
      pixels.data[base]=bytes[index]||0;
      pixels.data[base+1]=bytes[index+1]||0;
      pixels.data[base+2]=bytes[index+2]||0;
      pixels.data[base+3]=255;
    }
    ctx.putImageData(pixels,0,PROFILE_BACKUP_IMAGE_TOP);
    return canvas.toDataURL("image/png");
  }
  async function profileBackupReadPng(file){
    if(file.size>8*1024*1024)throw Error("ملف النسخة كبير جداً.");
    const url=URL.createObjectURL(file);
    try{
      const photo=await new Promise((resolve,reject)=>{
        const img=new Image();img.onload=()=>resolve(img);
        img.onerror=()=>reject(Error("تعذّر فتح صورة النسخة."));
        img.src=url;
      });
      if(photo.naturalWidth!==PROFILE_BACKUP_IMAGE_WIDTH||
         photo.naturalHeight<=PROFILE_BACKUP_IMAGE_TOP||
         photo.naturalHeight>1800)
        throw Error("هذه الصورة ليست ملف النسخة الأصلي.");
      const canvas=document.createElement("canvas");
      canvas.width=photo.naturalWidth;canvas.height=photo.naturalHeight;
      const ctx=canvas.getContext("2d",{willReadFrequently:true});
      if(!ctx)throw Error("تعذّر قراءة نسخة الصورة.");
      ctx.drawImage(photo,0,0);
      const image=ctx.getImageData(0,PROFILE_BACKUP_IMAGE_TOP,
        canvas.width,canvas.height-PROFILE_BACKUP_IMAGE_TOP).data;
      const bytes=new Uint8Array((image.length/4)*3);
      for(let i=0,j=0;i<image.length;i+=4){
        bytes[j++]=image[i];bytes[j++]=image[i+1];bytes[j++]=image[i+2];
      }
      return profileBackupImageDecode(bytes);
    }finally{URL.revokeObjectURL(url);}
  }

  function profileView(section="root"){
    // Override global theme button dimensions ONLY within this profile.
    if(!document.getElementById("aoqatPilotProfileSharedNavV9")){
      const style=document.createElement("style");
      style.id="aoqatPilotProfileSharedNavV9";
      style.textContent=`
        #aoqatPersonalProfile{padding:3px 3px 12px!important;line-height:1.3!important}
        #aoqatPersonalProfile #aoqatProfileCard{padding:8px 10px!important;margin:0 0 7px!important;gap:9px!important;border-radius:11px!important}
        #aoqatPersonalProfile #aoqatProfileAvatar{width:46px!important;height:46px!important;flex-basis:46px!important;font-size:22px!important}
        #aoqatPersonalProfile #aoqatProfileDisplayName{font-size:15px!important;line-height:1.3!important}
        #aoqatPersonalProfile #aoqatProfileEdit{min-height:30px!important;height:30px!important;padding:3px 8px!important;border-radius:7px!important;font-size:11px!important}
        #aoqatPersonalProfile h3{font-size:13px!important;margin:10px 0 4px!important;padding:0 2px!important;line-height:1.3!important}
        #aoqatPersonalProfile button.aoqat-profile-row{box-sizing:border-box!important;display:flex!important;align-items:center!important;gap:7px!important;min-height:48px!important;height:auto!important;padding:9px 12px!important;margin:4px 0!important;border-radius:9px!important;box-shadow:none!important;text-align:right!important;line-height:1.35!important;text-shadow:none!important}
        #aoqatPersonalProfile button.aoqat-profile-row span{line-height:1.3!important}
        #aoqatPersonalProfile button.aoqat-profile-row small{font-size:10px!important;line-height:1.25!important;opacity:.77!important}
        #aoqatPersonalProfile #aoqatProfileEditPanel{padding:7px!important;margin:4px 0!important}
        #aoqatPersonalProfile #aoqatProfileEditPanel button,#aoqatPersonalProfile #aoqatProfileRestorePanel button,#aoqatPersonalProfile #aoqatProfileBackupCopy{min-height:34px!important;height:auto!important;padding:5px 7px!important;font-size:12px!important;border-radius:7px!important;box-shadow:none!important}
        #aoqatPersonalProfile #aoqatProfileSaveStatus{font-size:11px!important;margin:5px 0!important;min-height:0!important}
      `;
      document.head.appendChild(style);
    }
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
      const title=el("h3",heading,"font-size:13px;font-weight:700;margin:9px 0 4px;padding:0 2px");
      panel.append(title);
    };
    function row(id,title,subtitle,action,icon){
      const b=el("button",null,"width:100%;display:flex;align-items:center;gap:10px;min-height:49px;border:1px solid var(--wt-border,#c7d8df);border-radius:11px;background:var(--wt-surface,#fff);color:var(--wt-text,#173c50);padding:8px 10px;margin:4px 0;text-align:right;font:inherit;cursor:pointer");
      b.id=id;b.type="button";b.className="main-action aoqat-profile-row";
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
        refresh();edit.style.display="none";say("تم حفظ بيانات الملف على الهاتف.");
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
    panel.append(el("small","نسخة احتياطية بصيغة JSON تحفظ الإعدادات ومحفوظات المصحف في ملف واحد، وليس صورة. اختر حفظ الملف أو مشاركته عبر Gmail أو Drive أو التطبيقات الداعمة.","display:block;margin:4px 4px 9px;font-size:11px;line-height:1.7"));
    const backupPanel=el("div",null,"display:none;border:1px solid var(--wt-border,#c7d8df);border-radius:10px;padding:9px;margin:5px 0;background:var(--wt-surface,#fff)");
    backupPanel.id="aoqatProfileBackupActions";
    const backupActionStatus=el("small","","display:block;line-height:1.6;margin:4px 0 8px;font-size:12px");
    backupActionStatus.setAttribute("role","status");
    const backupCopies=el("div",null,"margin:4px 0 7px");
    backupCopies.id="aoqatProfileBackupCopies";
    let exportJson="",exportFilename="";
    const backupNativePending=window.aoqatBackupNativePendingV1||(window.aoqatBackupNativePendingV1=new Map());
    if(!window.aoqatBackupNativeResult){
      window.aoqatBackupNativeResult=function(requestId,ok){
        const done=backupNativePending.get(requestId);
        if(done){backupNativePending.delete(requestId);done(!!ok);}
      };
    }
    function backupNativeAction(method){
      const requestId="aoqat-backup-"+Date.now()+"-"+Math.random().toString(36).slice(2,8);
      backupNativePending.set(requestId,ok=>{
        backupActionStatus.textContent=ok
          ?(method==="saveBackupFile"?"تم حفظ ملف النسخة في المكان الذي اخترته.":"تم فتح اختيار التطبيق. تأكد من إرسال ملف النسخة في الوجهة التي اخترتها.")
          :"لم يكتمل حفظ ملف النسخة. أعد المحاولة.";
      });
      window.AndroidNative[method](exportJson,exportFilename,requestId);
    }
    function prepareExport(pack){
      exportJson=JSON.stringify(pack);
      exportFilename="AOQAT-backup-"+new Date().toISOString().replace(/[:.]/g,"-")+".json";

    }
    function fileBackupDownload(){
      if(!exportJson){say("أنشئ نسخة احتياطية أولاً.");return;}
      try{
        const url=URL.createObjectURL(new Blob([exportJson],{type:"application/json"}));
        const link=document.createElement("a");
        link.href=url;link.download=exportFilename;link.style.display="none";
        document.body.append(link);link.click();link.remove();
        setTimeout(()=>URL.revokeObjectURL(url),10000);
        backupActionStatus.textContent="تم طلب حفظ ملف النسخة على جهازك. ابحث عنه في التنزيلات.";
      }catch(_){say("تعذّر تنزيل الملف من هذا المتصفح.");}
    }
    async function shareBackupFile(){
      if(!exportJson){say("أنشئ نسخة احتياطية أولاً.");return;}
      backupActionStatus.textContent="جارٍ تجهيز ملف النسخة...";
      // Web Share, when implemented, shares a REAL .json file, not an image.
      try{
        const file=new File([exportJson],exportFilename,{type:"application/json"});
        if(typeof navigator.share==="function" &&
           typeof navigator.canShare==="function" &&
           navigator.canShare({files:[file]})){
          await navigator.share({files:[file],title:"نسخة احتياطية لأوقات الصلاة"});
          backupActionStatus.textContent="اخترت مشاركة ملف النسخة. تأكد من إتمام إرساله إلى التطبيق المطلوب.";
          return;
        }
      }catch(e){
        if(e?.name==="AbortError"){
          backupActionStatus.textContent="أُلغيت المشاركة؛ يمكنك اختيار وجهة أخرى.";
          return;
        }
      }
      if(typeof window.AndroidNative?.shareBackupFile==="function"){
        try{backupNativeAction("shareBackupFile");return;}
        catch(e){backupActionStatus.textContent="تعذّر فتح مشاركة ملف النسخة.";return;}
      }
      // Old APK builds have IMAGE-ONLY native sharing. Refuse to mislabel a
      // PNG as a backup document or claim it was uploaded to Gmail/Drive.
      if(window.AndroidNative?.configureAdhan){
        backupActionStatus.textContent="نسخة التطبيق الحالية تدعم مشاركة الصور فقط، وليس ملفات النسخ. يلزم تحديث APK لدعم مشاركة ملف JSON حقيقي. لم يتم إرسال صورة أو فقدان بياناتك.";
        return;
      }
      fileBackupDownload();
    }
    const shareBackup=actionButton("aoqatProfileBackupShare","📤 مشاركة ملف النسخة (.json)",()=>shareBackupFile());
    shareBackup.style.width="100%";
    const downloadBackup=actionButton("aoqatProfileBackupDownload","📁 حفظ ملف نسخة احتياطية (.json)",()=>{
      if(!exportJson){say("أنشئ النسخة أولاً.");return;}
      if(typeof window.AndroidNative?.saveBackupFile==="function"){
        try{backupNativeAction("saveBackupFile");}
        catch(_){backupActionStatus.textContent="تعذّر فتح اختيار مكان الحفظ.";}
      }else if(window.AndroidNative?.configureAdhan){
        backupActionStatus.textContent="حفظ ملف JSON من داخل هذا الإصدار القديم غير مدعوم. يلزم تحديث APK لدعم حفظ الملفات، ولم تُنشأ صورة بديلة.";
      }else fileBackupDownload();
    });
    downloadBackup.style.width="100%";
    async function renderBackupCopies(){
      backupCopies.replaceChildren();
      try{
        const copies=await profileBackupList();
        if(!copies.length){
          backupCopies.append(el("small","لا توجد نسخ محفوظة على هذا الهاتف بعد.","display:block;font-size:11px"));
          return;
        }
        for(const copy of copies){
          const label="استعادة نسخة "+new Date(copy.createdAt).toLocaleString("ar-IQ");
          const button=actionButton("aoqatProfileRestoreCopy"+copy.id,label,()=>{
            try{
              if(!profileBackupRestore(JSON.stringify(copy.pack)))return;
              say("تمت استعادة البيانات. سيُعاد فتح التطبيق لعرضها.");
              setTimeout(()=>location.reload(),900);
            }catch(e){say(e.message||"تعذّرت الاستعادة.");}
          });
          button.style.cssText+=";width:100%;text-align:right;margin:3px 0;font-size:11px";
          backupCopies.append(button);
        }
      }catch(_){backupCopies.append(el("small","النسخ المحلية غير متاحة على هذا الهاتف.","font-size:11px"));}
    }
    row("aoqatProfileBackupExport","إنشاء نسخة احتياطية","ملف JSON • الحفظ أو المشاركة",async()=>{
      backupPanel.style.display="block";
      backupActionStatus.textContent="جارٍ إعداد الملف...";
      try{
        const result=await profileBackupSave("manual",false);
        prepareExport(result.copy.pack);
        await renderBackupCopies();
        await shareBackupFile();
      }catch(e){
        // A restricted IndexedDB must not prevent a portable backup export.
        try{
          prepareExport(profileBackupMakeData());
          backupActionStatus.textContent="النسخ المحلية غير متاحة، لكن يمكنك حفظ الملف خارج التطبيق.";
          await shareBackupFile();
        }catch(failure){
          backupActionStatus.textContent=failure?.message||e?.message||"تعذّر إنشاء النسخة.";
        }
      }
    },"💾");
    backupPanel.append(backupActionStatus,shareBackup,downloadBackup);
    const backupDetails=el("details",null,"margin-top:9px");
    backupDetails.id="aoqatProfileBackupLocalDetails";
    backupDetails.append(el("summary","النسخ المحفوظة على هذا الهاتف (حتى 3)","cursor:pointer;font-size:12px;font-weight:600;padding:5px"));
    backupDetails.append(backupCopies);
    backupDetails.addEventListener("toggle",()=>{if(backupDetails.open)renderBackupCopies();});
    backupPanel.append(backupDetails);
    panel.append(backupPanel);
    const scheduleWrap=el("details",null,"border:1px solid var(--wt-border,#c7d8df);border-radius:9px;padding:7px 9px;margin:5px 0;background:var(--wt-surface,#fff)");
    scheduleWrap.id="aoqatProfileBackupOptionalSettings";
    scheduleWrap.append(el("summary","إعدادات النسخ التلقائي (اختياري)","cursor:pointer;font-size:12px;font-weight:600"));
    const scheduleLabel=el("label","حفظ نسخ محلية عند استخدام التطبيق","display:block;font-size:12px;margin-top:8px");
    const scheduleSelect=el("select",null,"width:100%;margin:4px 0 0;min-height:36px;border:1px solid var(--wt-border,#c7d8df);border-radius:7px;background:var(--wt-surface,#fff);color:var(--wt-text,#173c50);font-size:12px");
    scheduleSelect.id="aoqatProfileBackupSchedule";
    for(const [value,label] of [["off","إيقاف"],["daily","يومي"],["weekly","أسبوعي"]]){
      const option=el("option",label);option.value=value;scheduleSelect.append(option);
    }
    scheduleSelect.value=get(PROFILE_BACKUP_PLAN_KEY)||"off";
    scheduleSelect.onchange=()=>{
      try{
        localStorage.setItem(PROFILE_BACKUP_PLAN_KEY,scheduleSelect.value);
        localStorage.removeItem(PROFILE_BACKUP_LAST_AUTO);
        profileBackupAutoTick(false);
        say("تم حفظ الاختيار. يعمل النسخ المحلي أثناء تشغيل التطبيق.");
      }catch(_){say("تعذّر حفظ الجدولة.");}
    };
    scheduleLabel.append(scheduleSelect);
    scheduleWrap.append(scheduleLabel,el("small","النسخ التلقائي هنا محلي أثناء استخدام التطبيق، وليس رفعاً تلقائياً إلى Drive. محفوظات المصحف تحفظ محلياً تلقائياً. عند حذف التطبيق تختفي النسخ المحلية؛ احتفظ بملف خارجي.","display:block;font-size:10px;line-height:1.6;opacity:.8;margin:5px 0"));
    panel.append(scheduleWrap);
    const restoreInput=el("input",null,"display:none");
    restoreInput.type="file";restoreInput.accept=".png,image/png,.json,application/json";
    restoreInput.id="aoqatProfileRestoreFile";
    const restorePanel=el("div",null,"display:none;border:1px solid var(--wt-border,#c7d8df);border-radius:10px;padding:9px;margin:5px 0;background:var(--wt-surface,#fff)");
    restorePanel.id="aoqatProfileRestorePanel";
    const restoreStatus=el("small","اختر ملف النسخة المحفوظ في Drive أو الهاتف. لنسخة Gmail نزّل المرفق أولاً ثم اختره هنا.","display:block;font-size:11px;line-height:1.7;margin-bottom:7px");
    restoreStatus.setAttribute("role","status");
    const choose=actionButton("aoqatProfileChooseRestore","📂 اختيار ملف من Drive أو الهاتف أو البريد",()=>restoreInput.click());
    choose.style.width="100%";
    const localRestore=el("details",null,"margin-top:9px");
    localRestore.id="aoqatProfileRestoreLocalDetails";
    localRestore.append(el("summary","استعادة نسخة محلية على هذا الهاتف","cursor:pointer;font-size:12px;font-weight:600;padding:5px"));
    const localRestoreRows=el("div",null,"margin-top:5px");
    async function showLocalRestore(){
      localRestoreRows.replaceChildren();
      try{
        const copies=await profileBackupList(),quran=await profileBackupLatestQuran();
        if(quran?.raw){
          const button=actionButton("aoqatProfileRestoreQuranAuto","📖 آخر حفظ للمصحف",()=>{
            if(!confirm("استعادة علامات المصحف وآخر صفحة فقط؟"))return;
            try{
              localStorage.setItem("aoqatQuranReaderV1",quran.raw);
              say("تم استرجاع محفوظات المصحف.");
              setTimeout(()=>location.reload(),900);
            }catch(_){say("تعذّرت استعادة محفوظات المصحف.");}
          });
          button.style.cssText+=";width:100%;margin:3px 0;font-size:11px";
          localRestoreRows.append(button);
        }
        for(const copy of copies){
          const button=actionButton("aoqatProfileRestoreLocal"+copy.id,
            "استعادة نسخة "+new Date(copy.createdAt).toLocaleString("ar-IQ"),()=>{
              try{
                if(!profileBackupRestore(JSON.stringify(copy.pack)))return;
                say("تمت الاستعادة.");
                setTimeout(()=>location.reload(),900);
              }catch(e){say(e.message||"تعذّرت الاستعادة.");}
            });
          button.style.cssText+=";width:100%;margin:3px 0;text-align:right;font-size:11px";
          localRestoreRows.append(button);
        }
        if(!copies.length&&!quran?.raw)
          localRestoreRows.append(el("small","لا توجد نسخ محلية. اختر الملف المحفوظ خارج التطبيق.","font-size:11px"));
      }catch(_){localRestoreRows.append(el("small","تعذّرت قراءة النسخ المحلية.","font-size:11px"));}
    }
    localRestore.addEventListener("toggle",()=>{if(localRestore.open)showLocalRestore();});
    localRestore.append(localRestoreRows);
    restoreInput.onchange=async()=>{
      const file=restoreInput.files?.[0];restoreInput.value="";
      if(!file)return;
      restoreStatus.textContent="جارٍ فحص الملف...";
      try{
        if(file.size>8*1024*1024)throw Error("ملف النسخة كبير جداً.");
        const isPng=file.type==="image/png"||/\.png$/i.test(file.name);
        const content=isPng?await profileBackupReadPng(file):await file.text();
        const entries=profileBackupValidate(content);
        const quran=entries.find(([key])=>key==="aoqatQuranReaderV1");
        let bookmarks=0;
        if(quran){try{bookmarks=JSON.parse(quran[1]).bookmarks?.length||0;}catch(_){}}
        restoreStatus.textContent="تم العثور على نسخة سليمة فيها "+entries.length+
          " إعداد أو محفوظات"+(quran?"، و"+bookmarks+" علامة للمصحف":"")+".";
        if(!profileBackupRestore(content)){
          restoreStatus.textContent="أُلغيت الاستعادة. بياناتك الحالية لم تتغير.";
          return;
        }
        restoreStatus.textContent="تمت الاستعادة بنجاح؛ سيتم تحديث التطبيق لعرض بياناتك.";
        refresh();setTimeout(()=>location.reload(),1000);
      }catch(e){restoreStatus.textContent=e?.message||"هذا الملف ليس نسخة احتياطية صالحة.";say(restoreStatus.textContent);}
    };
    restorePanel.append(restoreInput,restoreStatus,choose,localRestore);
    row("aoqatProfileBackupRestore","استعادة نسخة احتياطية","اختيار ملف JSON من Drive أو الهاتف",()=>{
      const open=restorePanel.style.display==="none";
      restorePanel.style.display=open?"block":"none";
      if(open){restorePanel.scrollIntoView?.({behavior:"smooth",block:"nearest"});}
    },"📥");
    panel.append(restorePanel);
    sections("المساعدة والخصوصية");
    row("aoqatProfilePrivacy","سياسة الخصوصية","قراءة السياسة داخل التطبيق",()=>privacyView("profileHelp"),"🔒");
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
    // Pure navigation regrouping: reuse the ORIGINAL nodes and click handlers.
    // Storage keys, backup/restore methods, Quran actions and delete confirmation
    // are not changed. Each call rebuilds a fresh panel for safe Back navigation.
    const groupNodes={account:document.createDocumentFragment(),backup:document.createDocumentFragment(),
      help:document.createDocumentFragment(),quran:document.createDocumentFragment()};
    const headings={"القرآن ومحفوظاتي":"quran","النسخ الاحتياطي":"backup",
      "المساعدة والخصوصية":"help","إدارة الملف الشخصي":"account"};
    let currentGroup="account";
    for(const node of [...panel.children]){
      if(node===card || node===note)continue;
      if(node.tagName==="H3" && headings[node.textContent.trim()]){
        currentGroup=headings[node.textContent.trim()];
        continue;
      }
      groupNodes[currentGroup].append(node);
    }
    panel.replaceChildren();
    const profilePages={
      account:"إدارة الملف الشخصي",
      backup:"النسخ الاحتياطي",
      help:"المساعدة والخصوصية",
      quran:"محفوظات القرآن"
    };
    if(section==="root" || !Object.hasOwn(profilePages,section)){
      panel.append(card);
      editButton.onclick=()=>profileView("account");
      const mainGroups=[
        ["account","👤","إدارة الملف الشخصي","الاسم والصورة والبريد الإلكتروني وحذف بيانات الملف"],
        ["backup","💾","النسخ الاحتياطي","إنشاء النسخ واستعادتها والنسخ التلقائي"],
        ["help","🔒","المساعدة والخصوصية","سياسة الخصوصية والتواصل وحول التطبيق"],
        ["quran","📖","محفوظات القرآن","العلامات المرجعية وآخر صفحة قرأتها"]
      ];
      for(const [key,icon,title,subtitle] of mainGroups)
        row("aoqatProfileGroup-"+key,title,subtitle,()=>profileView(key),icon);
      openSub("الملف الشخصي",panel,"main");
    }else{
      panel.append(groupNodes[section],note);
      openSub(profilePages[section],panel,"profile");
    }
  }
  // Read-only pilot OTA availability UI. Android's existing signed receiver
  // remains solely responsible for downloading/verifying/staging OTA updates.
  const PILOT_OTA_BUNDLED_SEQUENCE=6;
  const PILOT_OTA_FEED="https://raw.githubusercontent.com/mhs1996mhs1996-lab/aoqat/owner-pilot-ota/android-updates/owner-pilot/build-150/manifest.json";
  const PILOT_OTA_APK=!!(
    (window.AndroidNative?.readOwnerPilotOtaState && window.AndroidNative.readOwnerPilotOtaState()) ||
    (window.AndroidNative?.configureAdhan && (location.protocol==="file:"||location.hostname==="appassets.androidplatform.net"))
  );
  function readPilotState(){
    if(!PILOT_OTA_APK)return {};
    try{return JSON.parse(window.AndroidNative.readOwnerPilotOtaState()||"{}");}
    catch(_){return {};}
  }
  function pilotActiveSequence(){
    const value=Number(readPilotState().lastSequence);
    return Number.isSafeInteger(value)?Math.max(PILOT_OTA_BUNDLED_SEQUENCE,value):PILOT_OTA_BUNDLED_SEQUENCE;
  }
  let pilotLatest=null,pilotCheckAt=0,pilotCheckRunning=null,pilotPanelUpdate=null;
  function pilotBadge(){
    const b=document.querySelector('#webDrawerMain [data-drawer="ownerPilotOta"]');
    if(!b)return;
    const update=pilotLatest!==null&&pilotLatest>pilotActiveSequence();
    let notice=b.querySelector(".aoqat-pilot-ota-badge");
    if(!notice){
      notice=document.createElement("span");notice.className="aoqat-pilot-ota-badge";
      notice.style.cssText="display:none;flex:none;border-radius:8px;padding:3px 6px;font:700 11px Arial,Tahoma,sans-serif;background:#c62f35;color:white;line-height:1.2";
      b.appendChild(notice);
    }
    notice.textContent=update?"جديد":"";
    notice.style.display=update?"inline-block":"none";
    if(update)b.setAttribute("aria-label","تحديثات النسخة التجريبية، تحديث جديد متاح");
    else b.removeAttribute("aria-label");
    if(typeof pilotPanelUpdate==="function")pilotPanelUpdate();
  }
  async function checkPilotOtaAvailable(force=false){
    if(!PILOT_OTA_APK)return;
    if(pilotCheckRunning)return pilotCheckRunning;
    if(!force && Date.now()-pilotCheckAt<300000)return;
    pilotCheckAt=Date.now();
    pilotCheckRunning=(async()=>{
      const response=await fetch(PILOT_OTA_FEED,{cache:"no-store"});
      if(!response.ok)throw Error("offline");
      const m=await response.json();
      if(!m||m.channel!=="owner-pilot"||m.nativeBuild!==150||
        !Number.isInteger(m.sequence)||m.sequence<1||m.sequence>2147483647||
        typeof m.signature!=="string"||m.signature.length<70||
        !Number.isSafeInteger(m.expiresAt)||m.expiresAt<Date.now()||
        !m.files||typeof m.files!=="object")throw Error("invalid");
      pilotLatest=m.sequence;
    })().catch(()=>{pilotLatest=null;}).finally(()=>{pilotCheckRunning=null;pilotBadge();});
    return pilotCheckRunning;
  }
  function pilotOtaView(){
    if(!PILOT_OTA_APK)return;
    const panel=document.createElement("section");
    panel.id="aoqatPilotOtaPanel";panel.dir="rtl";panel.style.cssText="max-width:550px;margin:0 auto;padding:7px 9px;line-height:1.4";
    const style=document.createElement("style");
    style.textContent="#aoqatPilotOtaPanel .pilot-line{border:1px solid var(--wt-border,#c7d8df);background:var(--wt-surface,#fff);border-radius:8px;padding:6px 9px;margin:4px 0;font-size:12px}#aoqatPilotOtaPanel .pilot-command{display:block!important;box-sizing:border-box!important;width:100%!important;min-height:33px!important;height:auto!important;padding:6px!important;font-size:12px!important;margin:5px 0!important;border:1px solid var(--wt-border,#c7d8df)!important;border-radius:7px!important;background:var(--wt-surface,#fff)!important;color:var(--wt-text,#173c50)!important;box-shadow:none!important}";
    panel.appendChild(style);
    const installed=document.createElement("div");installed.className="pilot-line";
    installed.textContent="التحديث المفعّل: "+pilotActiveSequence();
    const status=document.createElement("div");status.className="pilot-line";
    status.setAttribute("role","status");
    function render(){
      const saved=readPilotState();
      installed.textContent="التحديث المفعّل: "+pilotActiveSequence();
      if(saved.pending)status.textContent="وصل تحديث جاهز للتفعيل. أعد فتح التطبيق.";
      else if(saved.trial)status.textContent="التحديث يعمل ويجري التحقق منه.";
      else if(pilotLatest!==null&&pilotLatest>pilotActiveSequence())
        status.textContent="تحديث جديد "+pilotLatest+" — جارٍ استلامه تلقائياً.";
      else if(pilotLatest===null)status.textContent="تعذّر الفحص حالياً. التطبيق يعمل دون إنترنت.";
      else status.textContent="النسخة التجريبية محدّثة.";
    }
    const check=document.createElement("button");check.className="pilot-command";
    check.type="button";check.textContent="التحقق من تحديث جديد";
    check.onclick=async()=>{check.disabled=true;status.textContent="جارٍ التحقق…";await checkPilotOtaAvailable(true);check.disabled=false;render();};
    const rerun=document.createElement("button");rerun.type="button";rerun.className="pilot-command";
    rerun.textContent="إعادة فتح التطبيق لتفعيل التحديث";
    rerun.onclick=()=>{if(confirm("إعادة فتح النسخة التجريبية الآن؟"))window.AndroidNative.reopenOwnerPilotForUpdate?.();};
    const advanced=document.createElement("button");advanced.type="button";advanced.className="pilot-command";
    advanced.textContent="خيارات متقدمة (ZIP احتياطي)";
    advanced.onclick=()=>window.AndroidNative.openOwnerPilotOtaAdvanced?.();
    panel.append(installed,status,check,rerun,advanced);
    pilotPanelUpdate=()=>{if(panel.isConnected)render();else pilotPanelUpdate=null;};
    render();openSub("تحديثات النسخة التجريبية",panel,"main");
    void checkPilotOtaAvailable();
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
  function privacyView(backTo="profile"){
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
    openSub("سياسة الخصوصية",wrap,backTo);
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
    const enabled=()=>window.AndroidNative?.readScreenWakeEnabled?.()??(localStorage.getItem(WAKE_ALERTS_KEY)!=="0");
    const refresh=()=>{const on=enabled();button.textContent="💡 إضاءة الشاشة لجميع التنبيهات: "+(on?"مفعّلة":"متوقفة");button.setAttribute("aria-pressed",String(on));};
    button.onclick=()=>{const next=!enabled();localStorage.setItem(WAKE_ALERTS_KEY,next?"1":"0");window.AndroidNative?.configureScreenWake?.(next);refresh();window.dispatchEvent(new Event("aoqatScreenWakePreferenceChanged"));};
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
  // Owner-pilot web-only card navigation; seq13 repairs layout without
  // altering native notification schedules, preferences, or prayer data.
  const LOCK_FONT_STATES=[
    ["prayer","باقي على الصلاة"],
    ["iqama_wait","باقي على الإقامة"],
    ["iqama_elapsed","مضى على الإقامة"],
    ["friday_first","باقي على أذان الجمعة الأول"],
    ["sermon_wait","باقي على الخطبة"],
    ["sermon_elapsed","مضى على الخطبة"]
  ];
  let lockFontMenuReturn="cardsLock";
  function cardsAndLockThemeStyles(){
    if(document.getElementById("aoqatCardsAndLockThemeCss"))return;
    const css=document.createElement("style");css.id="aoqatCardsAndLockThemeCss";
    css.textContent=[
      "#aoqatCardsAndLockMenu,#aoqatLockCardSettings,#aoqatLockFontMenu,#aoqatLockFontState{display:grid;gap:8px;direction:rtl;padding:4px 0 14px}",
      "#webDrawerSub.aoqat-cards-sub .web-sub-head{flex:0 0 46px!important;min-height:46px!important;padding:5px 9px!important}",
      "#webDrawerSub.aoqat-cards-sub .web-sub-title{font-size:17px!important;line-height:1.35!important}",
      "#aoqatCardsAndLockMenu button.main-action,#aoqatLockCardSettings button.main-action,#aoqatLockFontMenu button.main-action,#aoqatLockFontState button.main-action,#aoqatWidgetAppearance button.main-action{box-sizing:border-box!important;display:block!important;width:100%!important;min-height:47px!important;height:auto!important;margin:0!important;padding:9px 12px 9px 50px!important;border:1px solid var(--wt-border,#c5d5c8)!important;border-radius:9px!important;background:linear-gradient(90deg,var(--wt-surface,#fffaf0),var(--wt-surface2,#f8efd9))!important;color:var(--wt-text,#284435)!important;box-shadow:none!important;text-shadow:none!important;text-align:right!important;white-space:normal!important;overflow-wrap:break-word!important;font-size:clamp(13px,3.8vw,16px)!important;font-weight:700!important;line-height:1.5!important}",
      "#aoqatCardsAndLockMenu button.main-action:nth-of-type(odd),#aoqatLockCardSettings button.main-action:nth-of-type(odd),#aoqatLockFontMenu button.main-action:nth-of-type(odd){background:linear-gradient(90deg,var(--wt-surface2,#f8efd9),var(--wt-surface,#fffaf0))!important}",
      "#aoqatWidgetAppearance{color:var(--wt-text,#183a4a)!important;gap:9px!important;min-width:0}",
      "#aoqatWidgetAppearance .wa-actions,#aoqatWidgetAppearance .wa-chooser{display:grid!important;grid-template-columns:1fr!important;gap:8px!important}",
      "#aoqatWidgetAppearance button.wa-primary,#aoqatWidgetAppearance .wa-chooser button{box-sizing:border-box!important;display:block!important;width:100%!important;min-height:47px!important;height:auto!important;margin:0!important;padding:9px 12px 9px 50px!important;border:1px solid var(--wt-border,#c5d5c8)!important;border-radius:9px!important;background:linear-gradient(90deg,var(--wt-surface,#fffaf0),var(--wt-surface2,#f8efd9))!important;color:var(--wt-text,#284435)!important;text-shadow:none!important;box-shadow:none!important;text-align:right!important;white-space:normal!important;font-size:clamp(13px,3.8vw,16px)!important;font-weight:700!important;line-height:1.55!important}",
      "#aoqatWidgetAppearance .wa-chooser button[aria-pressed=true]{outline:2px solid var(--wt-accent,#29836a)!important;outline-offset:-2px!important}",
      "#aoqatWidgetAppearance .wa-preview{box-sizing:border-box!important;width:100%!important;min-width:0!important;overflow:hidden!important;border:1px solid var(--wt-border,#b4cbd1)!important;background:var(--wt-surface2,#e5eef1)!important}",
      "#aoqatWidgetAppearance .wa-preview .wa-line{max-width:100%!important;min-width:0!important;display:flex!important;flex-wrap:wrap!important;justify-content:center!important;gap:6px!important;text-align:center!important}",
      "#aoqatWidgetAppearance .wa-preview .wa-label{overflow-wrap:anywhere!important}",
      "#aoqatWidgetAppearance .wa-preview .wa-number{flex-shrink:0!important}",
      "#aoqatWidgetAppearance .wa-style-group{background:var(--wt-surface,#fffaf0)!important;color:var(--wt-text,#284435)!important;border:1px solid var(--wt-border,#c7d8df)!important;min-width:0!important}",
      "#aoqatWidgetAppearance .wa-note,#aoqatLockCardSettings .wa-note,#aoqatLockFontMenu .aoqat-cards-note,#aoqatLockFontState .aoqat-cards-note{font-size:12px!important;line-height:1.6!important;color:var(--wt-text,#354d5a)!important;margin:5px 2px!important}",
      "#aoqatLockCardSettings>.aoqat-lock-heading{font-size:15px!important;color:var(--wt-text,#284435)!important;margin:2px!important}",
      "#aoqatWidgetAppearance select,#aoqatWidgetAppearance input[type=color]{background:var(--wt-surface,#fff)!important;border:1px solid var(--wt-border,#c7d8df)!important;color:var(--wt-text,#284435)!important}"
    ].join("\n");
    document.head.append(css);
  }
  function cardsAndLockStyleButton(button,index){
    // Use the same theme-aware class as the rest of the inner settings.
    // Don't insert layout-changing icon spans or override with fixed blue.
    button.classList.add("main-action","aoqat-theme-card-button");
    button.style.removeProperty("background");
    button.style.removeProperty("background-image");
    button.style.removeProperty("background-color");
    button.style.removeProperty("padding");
    button.style.removeProperty("color");
  }
  function cardsAndLockStyleButtons(root){
    if(!root)return;
    root.querySelectorAll("button").forEach((button,i)=>cardsAndLockStyleButton(button,i));
  }
  function cardsAndLockBackButton(sub,enabled){
    const button=sub.querySelector(".web-sub-head .web-back");if(!button)return;
    const css={width:"70px",height:"32px","min-height":"32px","min-width":"0",padding:"3px 8px","font-size":"12px","line-height":"1.2","border-radius":"9px",background:"linear-gradient(100deg,color-mix(in srgb,var(--wt-accent,#267e98) 84%,var(--wt-surface,#fffaf0)),color-mix(in srgb,var(--wt-accent,#267e98) 62%,var(--wt-surface2,#e4f2f7)))",color:"var(--wt-text,#183a4a)",border:"1px solid var(--wt-border,#b4cbd1)","box-shadow":"none"};
    for(const [name,value] of Object.entries(css)){
      if(enabled)button.style.setProperty(name,value,"important");
      else button.style.removeProperty(name);
    }
  }
  function cardsAndLockButton(parent,id,label,onclick){
    const b=document.createElement("button");b.type="button";b.id=id;b.className="main-action";
    b.textContent=label;b.onclick=onclick;parent.append(b);return b;
  }
  function widgetAppearanceView(){
    cardsAndLockThemeStyles();
    const root=document.createElement("section");root.id="aoqatCardsAndLockMenu";root.className="web-settings-list";root.dir="rtl";
    cardsAndLockButton(root,"aoqatHomeCardsMenu","🖼️ بطاقات الشاشة الرئيسية",homeCardsEditorView);
    if(window.AndroidNative?.configureLockScreenPrayer)
      cardsAndLockButton(root,"aoqatLockCardMenu","🔒 إشعار شاشة القفل",lockCardSettingsView);
    if(window.AndroidNative?.readOwnerPilotOtaState?.())
      cardsAndLockButton(root,"aoqatLockScreenNotificationTextStyle","🔤 تنسيق خطوط إشعار شاشة القفل",()=>lockFontSubmenuView("cardsLock"));
    cardsAndLockStyleButtons(root);
    openSub("بطاقات الشاشة الرئيسية و القفل",root,"appearance");
  }
  function homeCardsEditorView(){
    const panel=window.AoqatWidgetAppearance?.createPanel?.();if(!panel)return;
    panel.classList.add("web-settings-list");
    panel.querySelector("#aoqatLockScreenSection")?.remove();
    panel.querySelector(":scope > strong")?.remove();
    cardsAndLockStyleButtons(panel);
    openSub("بطاقات الشاشة الرئيسية",panel,"cardsLock");
  }
  function lockCardSettingsView(){
    const source=window.AoqatWidgetAppearance?.createPanel?.();if(!source)return;
    const panel=document.createElement("section");panel.id="aoqatLockCardSettings";
    panel.className="web-settings-list";panel.dir="rtl";
    const original=source.querySelector("#aoqatLockScreenSection");
    if(original){
      const heading=original.querySelector("strong");
      if(heading){heading.className="aoqat-lock-heading";panel.append(heading);}
      // Reparent real controls. Do not copy or rebind notification settings.
      original.querySelectorAll("button.wa-primary").forEach(button=>panel.append(button));
      original.querySelectorAll(".wa-note").forEach(note=>{if(note.textContent?.trim())panel.append(note);});
    }
    if(window.AndroidNative?.readOwnerPilotOtaState?.())
      cardsAndLockButton(panel,"aoqatLockScreenFontFromLock","🔤 تنسيق خطوط إشعار شاشة القفل",()=>lockFontSubmenuView("lockCard"));
    cardsAndLockStyleButtons(panel);
    openSub("إشعار شاشة القفل",panel,"cardsLock");
  }
  function lockFontSubmenuView(backTo=lockFontMenuReturn){
    lockFontMenuReturn=backTo;
    const panel=document.createElement("section");panel.id="aoqatLockFontMenu";panel.className="web-settings-list";panel.dir="rtl";
    const note=document.createElement("p");note.className="aoqat-cards-note";
    note.textContent="لكل عدّاد حجمه ولونه الخاص. اختَر الحالة المطلوبة:";
    panel.append(note);
    LOCK_FONT_STATES.forEach(([key,label],i)=>
      cardsAndLockButton(panel,"aoqatLockFontState-"+key,(i+1)+". "+label,()=>lockFontStateView(key,label)));
    cardsAndLockStyleButtons(panel);
    openSub("تنسيق خطوط إشعار شاشة القفل",panel,lockFontMenuReturn);
  }
  function lockFontStateView(key,label){
    if(!LOCK_FONT_STATES.some(([id])=>id===key))return;
    const panel=document.createElement("section");panel.id="aoqatLockFontState";panel.className="web-settings-list";panel.dir="rtl";
    const note=document.createElement("p");note.className="aoqat-cards-note";
    note.textContent="الحالة المختارة: "+label+".";
    panel.append(note);
    if(typeof window.AndroidNative?.readLockScreenTextStyle==="function" &&
       typeof window.AndroidNative?.configureLockScreenTextStyle==="function"){
      // Native bridge is only available after the separately signed APK update.
      // Do not simulate persistence when using a legacy APK.
      try{
        const saved=JSON.parse(window.AndroidNative.readLockScreenTextStyle(key)||"{}");
        const row=(name,value,type)=>{
          const labelEl=document.createElement("label");labelEl.className="aoqat-cards-note";labelEl.textContent=name;
          const input=document.createElement(type==="select"?"select":"input");
          if(type==="select")for(const [v,t] of [["0","أبيض"],["1","عاجي"],["2","كحلي"],["3","أسود"]]){const o=document.createElement("option");o.value=v;o.textContent=t;input.append(o);}
          else{input.type="number";input.min="12";input.max="24";}
          input.value=String(value);input.style.cssText="display:block;width:100%;min-height:40px;margin:4px 0 10px";
          labelEl.append(input);panel.append(labelEl);return input;
        };
        const title=row("حجم عنوان العدّاد (12–24)",saved.title??16,"number");
        const clock=row("حجم أرقام العدّاد (12–24)",saved.clock??17,"number");
        const color=row("لون العنوان والأرقام",saved.color??0,"select");
        cardsAndLockButton(panel,"aoqatLockFontSave-"+key,"حفظ تنسيق "+label,()=>{
          const t=Math.min(24,Math.max(12,Number(title.value)||16)),n=Math.min(24,Math.max(12,Number(clock.value)||17));
          if(window.AndroidNative.configureLockScreenTextStyle(key,t,n,Number(color.value))===true){
            const status=panel.querySelector("[role=status]");if(status)status.textContent="تم حفظ تنسيق "+label;
          }else{
            const status=panel.querySelector("[role=status]");if(status)status.textContent="تعذّر الحفظ؛ لم تتغير الإعدادات.";
          }
        });
        const status=document.createElement("p");status.setAttribute("role","status");status.className="aoqat-cards-note";panel.append(status);
      }catch(_){panel.append(document.createTextNode("تعذر تحميل خيارات هذه الحالة."));}
    }else{
      // The existing native editor cannot accept a requested state through
      // JS. Explain the limitation instead of displaying fake per-state save.
      const note2=document.createElement("p");note2.className="aoqat-cards-note";
      note2.textContent="النسخة المثبتة تستخدم محرر أندرويد المشترك. بعد فتحه اختر «"+label+"» من نوع العدّاد قبل الحفظ؛ لا تنتقل الحالة تلقائياً حالياً.";
      panel.append(note2);
      cardsAndLockButton(panel,"aoqatLaunchLockFontEditor","🔤 فتح محرر الخط الأصلي",()=>{
        window.AndroidNative?.openLockScreenTextStyle?.();
      });
    }
    cardsAndLockStyleButtons(panel);
    openSub(label,panel,"lockFontMenu");
  }
  function themeView(){const p=document.createElement("div");p.className="web-theme-drawer-panel";const source=document.getElementById("webThemePanel");if(source){p.innerHTML=source.innerHTML;}else{p.innerHTML='<div class="wt-head"><span>🎨 الثيمات والألوان</span><span>اختيار مباشر</span></div><div class="wt-grid"><button type="button" class="wt-card" data-theme="cream-blue">🟦 كريمي وأزرق فاتح</button><button type="button" class="wt-card" data-theme="cream-gold">🟨 كريمي وذهبي هادئ</button><button type="button" class="wt-card" data-theme="white-sky">🔵 أبيض وسماوي حديث</button><button type="button" class="wt-card" data-theme="cream-green">🟩 كريمي وأخضر هادئ</button><button type="button" class="wt-card" data-theme="beige-gold">🟫 بيج وذهبي أنيق</button><button type="button" class="wt-card" data-theme="dark-night">🌙 داكن كحلي (ليلي)</button></div>';}p.addEventListener("click",e=>{const card=e.target.closest(".wt-card");if(!card)return;if(typeof window.applyWebTheme==="function")window.applyWebTheme(card.dataset.theme);p.querySelectorAll(".wt-card").forEach(b=>b.classList.toggle("is-active",b.dataset.theme===document.body.dataset.webTheme));window.refreshWebThemeControls?.();});p.querySelectorAll(".wt-card").forEach(b=>b.classList.toggle("is-active",b.dataset.theme===document.body.dataset.webTheme));const widgets=document.createElement("button");widgets.type="button";widgets.className="main-action";
    widgets.textContent="🖼️ بطاقات الشاشة الرئيسية و القفل";
    widgets.style.cssText="display:block;width:100%;margin:4px 0 14px;padding:12px;border-radius:12px;text-align:center;font-weight:800;background:linear-gradient(90deg,var(--wt-surface,#f9f7f0),var(--wt-surface2,#e1eeec));color:var(--wt-text,#193f42);border:1px solid var(--wt-border,#b4cbd1)";
    cardsAndLockStyleButton(widgets,0);widgets.onclick=widgetAppearanceView;p.prepend(widgets);
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
    sub.querySelector(".web-back").addEventListener("click",()=>{if(returnMode.startsWith("post:")){openMuslimBagSection(returnMode.slice(5));return;}if(returnMode==="muslimBag"&&bagSection==="friday"){muslimBagView();return;}if(window.aoqatAzkarCategory&&window.aoqatCloseAzkarCategory?.())return;if(returnMode==="muslimBag"){muslimBagView();return;}if(returnMode==="reminderInbox"){inboxView();return;}if(returnMode==="program"){mainView();if(document.body.classList.contains('design-menu-open'))document.getElementById('designSideMenuBtn')?.click();}else if(returnMode==="tools")openInterfacePart('tools','أدوات تعديل التصميم');else if(returnMode==="background")openPanel('واجهة البرنامج','backgroundPanel','settings');else if(returnMode==="settings")settingsView();else if(returnMode==="profileHelp")profileView("help");else if(returnMode==="profile")profileView();else if(returnMode==="alertSettings")alertSettingsView();else if(returnMode==="prayerAlerts"){mainView();openAdhanServices("alerts");}else if(returnMode==="lockFontMenu")lockFontSubmenuView();else if(returnMode==="lockCard")lockCardSettingsView();else if(returnMode==="cardsLock")widgetAppearanceView();else if(returnMode==="appearance")themeView();else if(returnMode==="datePrayer")datePrayerView();else if(returnMode==="adhanIqama")adhanIqamaView();else mainView();});
    mainList.addEventListener("click",e=>{
      const b=e.target.closest("[data-drawer]");if(!b)return;const id=b.dataset.drawer;if(id==="qibla"){window.AndroidNative.openQibla();return;}
      if(["quran","qibla","azkar","widget"].includes(id)){
        const title=MENU_ROWS.find(row=>row[0]===id)?.[2]||id;
        openPanel(title,"prayerServicePanel");window.aoqatOpenService?.(id);return;
      }
      if(id==="reminderInbox"){inboxView();return;}
      if(id==="muslimBag"){muslimBagView();return;}
      if(id==="settings"){settingsView();return;}
      if(id==="usageGuide"){guideView();return;}
      if(id==="profile"){profileView();return;}
      if(id==="ownerPilotOta"){pilotOtaView();return;}
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
    if(PILOT_OTA_APK){
      void checkPilotOtaAvailable();
      window.addEventListener("focus",()=>{void checkPilotOtaAvailable();});
      document.addEventListener("visibilitychange",()=>{if(!document.hidden)void checkPilotOtaAvailable();});
      setInterval(()=>{if(!document.hidden)void checkPilotOtaAvailable();},300000);
    }
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

  // Owner-pilot first-launch privacy introduction. The Android native StartupScreen
  // stays intact: this WebView surface is only created AFTER the web app is ready.
  // This is a notice, not a broad consent grant or a replacement for OS permissions.
  const PILOT_PRIVACY_WELCOME_KEY="pilotPrivacyWelcomeSeenV1";
  let pilotPrivacyWelcomeQueued=false;
  function showPilotPrivacyWelcome(){
    if(!PILOT_OTA_APK || !window.AndroidNative?.readOwnerPilotOtaState ||
       !document.body?.classList.contains("aoqat-ready") ||
       !window.aoqatUIReady || document.hidden ||
       document.getElementById("aoqatPilotPrivacyWelcome"))return;
    try{if(localStorage.getItem(PILOT_PRIVACY_WELCOME_KEY)==="1")return;}catch(_){}
    if(!document.getElementById("aoqatPilotPrivacyWelcomeStyle")){
      const style=document.createElement("style");
      style.id="aoqatPilotPrivacyWelcomeStyle";
      style.textContent=[
        "#aoqatPilotPrivacyWelcome{position:fixed!important;inset:0!important;z-index:2147483000!important;overflow:auto!important;overscroll-behavior:contain!important;box-sizing:border-box!important;padding:calc(15px + env(safe-area-inset-top,0px)) 14px calc(16px + env(safe-area-inset-bottom,0px))!important;background:var(--wt-bg,#f4ead5)!important;color:var(--wt-text,#4f3b20)!important;direction:rtl!important;display:flex!important;align-items:center!important;justify-content:center!important;font-family:Tahoma,Arial,sans-serif!important}",
        "#aoqatPilotPrivacyWelcome [hidden]{display:none!important}",
        "#aoqatPilotPrivacyWelcome .pilot-privacy-card{box-sizing:border-box;width:min(100%,520px);max-height:100%;overflow:auto;border:1px solid var(--wt-border,#dbc28d);border-radius:18px;background:linear-gradient(145deg,var(--wt-surface,#fffaf0),var(--wt-surface2,#f8efd9));padding:20px 16px;box-shadow:0 5px 20px #0002;text-align:center}",
        "#aoqatPilotPrivacyWelcome h2{font-size:22px!important;line-height:1.5!important;margin:8px 0!important;color:var(--wt-text,#4f3b20)!important}",
        "#aoqatPilotPrivacyWelcome p{font-size:14px!important;line-height:1.85!important;margin:8px 0!important;color:var(--wt-text,#4f3b20)!important}",
        "#aoqatPilotPrivacyWelcome .pilot-privacy-icon{font-size:38px;line-height:1.3}",
        "#aoqatPilotPrivacyWelcome .pilot-privacy-points{text-align:right;font-size:13px;line-height:1.9;padding:9px 12px;margin:12px 0;border:1px solid var(--wt-border,#dbc28d);border-radius:12px;background:var(--wt-surface,#fffaf0)}",
        "#aoqatPilotPrivacyWelcome .pilot-privacy-action{display:block!important;box-sizing:border-box!important;width:100%!important;min-height:47px!important;margin:9px 0 0!important;padding:9px 12px!important;border:1px solid var(--wt-border,#dbc28d)!important;border-radius:10px!important;background:linear-gradient(90deg,var(--wt-surface,#fffaf0),var(--wt-surface2,#f8efd9))!important;color:var(--wt-text,#4f3b20)!important;font:700 15px Tahoma,Arial,sans-serif!important;box-shadow:none!important;text-shadow:none!important;cursor:pointer!important}",
        "#aoqatPilotPrivacyWelcome .pilot-privacy-action:focus-visible{outline:3px solid var(--wt-accent,#b58a35)!important;outline-offset:2px}",
        "#aoqatPilotPrivacyWelcome .pilot-privacy-notice{font-size:11px!important;opacity:.85}",
        "#aoqatPilotPrivacyWelcome .pilot-privacy-details{text-align:right;max-height:min(63vh,510px);overflow:auto;overscroll-behavior:contain}",
        "#aoqatPilotPrivacyWelcome .pilot-privacy-details section{padding:9px 0;border-bottom:1px solid var(--wt-border,#dbc28d)}",
        "#aoqatPilotPrivacyWelcome .pilot-privacy-details h3{font-size:14px!important;line-height:1.6!important;margin:0!important;color:var(--wt-text,#4f3b20)!important}",
        "#aoqatPilotPrivacyWelcome .pilot-privacy-details p{font-size:12px!important;line-height:1.8!important}",
        "@media (max-height:620px){#aoqatPilotPrivacyWelcome{align-items:flex-start!important}#aoqatPilotPrivacyWelcome .pilot-privacy-card{max-height:none!important}}"
      ].join("");
      document.head.appendChild(style);
    }
    const create=(tag,content,className)=>{
      const el=document.createElement(tag);
      if(content!==null)el.textContent=content;
      if(className)el.className=className;
      return el;
    };
    const overlay=create("section",null);
    overlay.id="aoqatPilotPrivacyWelcome";
    overlay.setAttribute("role","dialog");
    overlay.setAttribute("aria-modal","true");
    overlay.setAttribute("aria-labelledby","aoqatPilotPrivacyWelcomeTitle");
    overlay.dir="rtl";
    const card=create("div",null,"pilot-privacy-card");
    const summary=create("div",null);
    const shield=create("div","🛡️","pilot-privacy-icon");
    shield.setAttribute("aria-hidden","true");
    const title=create("h2","خصوصيتك تهمنا");
    title.id="aoqatPilotPrivacyWelcomeTitle";
    const intro=create("p","مرحباً بك في أوقات الصلاة في الحويجة وضواحيها. يمكنك التعرف على كيفية حفظ بياناتك واستخدام خدمات التطبيق.");
    const points=create("div",null,"pilot-privacy-points");
    [
      "📱 تُحفظ إعدادات التطبيق وبيانات الملف الشخصي محلياً على هاتفك.",
      "🧭 قد يُطلب الموقع عند استخدام ميزة اتجاه القبلة.",
      "🔔 تُطلب أذونات التنبيهات عند الحاجة، بشكل منفصل."
    ].forEach(line=>points.append(create("div",line)));
    const read=create("button","📄 قراءة سياسة الخصوصية كاملة","pilot-privacy-action");
    read.type="button";read.id="aoqatPilotPrivacyRead";
    const continueBtn=create("button","متابعة إلى التطبيق","pilot-privacy-action");
    continueBtn.type="button";continueBtn.id="aoqatPilotPrivacyContinue";
    const hint=create("p","المتابعة لا تمنح إذن الموقع أو الإشعارات تلقائياً. تستطيع قراءة السياسة لاحقاً من الملف الشخصي ← المساعدة والخصوصية.","pilot-privacy-notice");
    summary.append(shield,title,intro,points,read,continueBtn,hint);
    const full=create("div",null);
    full.hidden=true;
    const fullTitle=create("h2","سياسة الخصوصية");
    const fullText=create("div",null,"pilot-privacy-details");
    for(const entry of PRIVACY_SECTIONS){
      const section=create("section",null);
      section.append(create("h3",entry.title));
      for(const paragraph of entry.paragraphs)section.append(create("p",paragraph));
      fullText.append(section);
    }
    const back=create("button","رجوع إلى الملخص","pilot-privacy-action");
    back.type="button";back.id="aoqatPilotPrivacyBack";
    const done=create("button","متابعة إلى التطبيق","pilot-privacy-action");
    done.type="button";done.id="aoqatPilotPrivacyFinish";
    full.append(fullTitle,fullText,back,done);
    const finish=()=>{
      try{localStorage.setItem(PILOT_PRIVACY_WELCOME_KEY,"1");}catch(_){}
      overlay.remove();
    };
    read.onclick=()=>{summary.hidden=true;full.hidden=false;fullText.scrollTop=0;back.focus();};
    back.onclick=()=>{full.hidden=true;summary.hidden=false;read.focus();};
    continueBtn.onclick=finish;
    done.onclick=finish;
    overlay.addEventListener("keydown",event=>{
      if(event.key==="Escape"){
        event.preventDefault();event.stopPropagation();
        if(!full.hidden)back.click();else finish();
      }
    });
    card.append(summary,full);overlay.append(card);
    document.body.appendChild(overlay);
    read.focus();
  }
  function schedulePilotPrivacyWelcome(){
    if(!PILOT_OTA_APK||!window.AndroidNative?.readOwnerPilotOtaState||pilotPrivacyWelcomeQueued)return;
    try{if(localStorage.getItem(PILOT_PRIVACY_WELCOME_KEY)==="1")return;}catch(_){}
    pilotPrivacyWelcomeQueued=true;
    let tries=0;
    const ready=setInterval(()=>{
      if(++tries>450){clearInterval(ready);pilotPrivacyWelcomeQueued=false;return;}
      // Android removes the original native splash after the ready WebView is painted.
      if(!window.aoqatUIReady||!document.body?.classList.contains("aoqat-ready")||document.hidden)return;
      clearInterval(ready);
      // Give Android's startup image and first permission guide their own moment.
      setTimeout(()=>{if(!document.hidden)showPilotPrivacyWelcome();else pilotPrivacyWelcomeQueued=false;},3200);
    },200);
  }

  function start(){let n=0;const t=setInterval(()=>{if(install()||++n>80)clearInterval(t)},150);install();window.addEventListener("aoqatModulesReady",install);schedulePilotPrivacyWelcome();}
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start,{once:true});else start();
})();




