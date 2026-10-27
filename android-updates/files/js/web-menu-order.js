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
  const MENU_ROWS=webOnly?[...ROWS.filter(([id])=>!["savePhone","prayerTimeChoice","notifications","azkar"].includes(id)),["muslimBag",'<svg viewBox="0 0 32 32" width="30" height="30" fill="none" aria-hidden="true"><path d="M3 9c5-2 9-1 13 2 4-3 8-4 13-2v18c-5-2-9-1-13 2-4-3-8-4-13-2Z" fill="#e9d59b" stroke="#216644" stroke-width="2"/><path d="M16 11v18M6 14l6 1M6 19l6 1M20 15l6-1M20 20l6-1" stroke="#216644" stroke-width="1.5"/><path d="M21 2a5 5 0 1 0 6 6 4 4 0 0 1-6-6Z" fill="#c39327"/></svg>',"حقيبة المسلم"],["reminderInbox","🔔","الإشعارات"]]:ROWS;
  let returnMode="main",bagSection="",inboxId=null;
  let adhanReturnFocus=null, adhanHome=null, sidebarWasInert=false;

  function closeAdhanServices(){
    const dialog=document.getElementById("adhanServicesDialog");
    if(!dialog||dialog.hidden)return false;
    dialog.hidden=true;document.body.classList.remove("adhan-services-open");
    const p=document.getElementById("adhanPanel");
    if(p&&adhanHome){p.classList.remove("inline-open","active-panel");adhanHome.appendChild(p);}
    const sidebar=document.querySelector(".sidebar");if(sidebar)sidebar.inert=sidebarWasInert;
    if(adhanReturnFocus?.isConnected)adhanReturnFocus.focus({preventScroll:true});
    return true;
  }
  function openAdhanServices(){
    const p=document.getElementById("adhanPanel");if(!p)return;
    let dialog=document.getElementById("adhanServicesDialog");
    if(!dialog){
      dialog=document.createElement("section");dialog.id="adhanServicesDialog";dialog.hidden=true;
      dialog.dir="rtl";dialog.setAttribute("role","dialog");dialog.setAttribute("aria-modal","true");dialog.setAttribute("aria-labelledby","adhanServicesTitle");
      dialog.innerHTML='<header class="ad-modal-head"><button type="button" id="adhanServicesBack" aria-label="رجوع إلى بيانات الأذان والإقامة">‹ رجوع</button><h2 id="adhanServicesTitle">الأذان والتنبيه</h2></header><div id="adhanServicesBody"></div>';
      document.body.appendChild(dialog);
      dialog.querySelector("#adhanServicesBack").onclick=closeAdhanServices;
      dialog.addEventListener("keydown",e=>{
        if(e.key==="Escape"){e.preventDefault();e.stopPropagation();closeAdhanServices();}
        if(e.key!=="Tab")return;
        const controls=[...dialog.querySelectorAll('button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled)')].filter(el=>el.getClientRects().length);
        const first=controls[0],last=controls.at(-1);
        if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}
        else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}
      });
    }
    adhanReturnFocus=document.activeElement;adhanHome=p.parentElement;
    const sidebar=document.querySelector(".sidebar");sidebarWasInert=sidebar?.inert||false;if(sidebar)sidebar.inert=true;
    dialog.querySelector("#adhanServicesBody").appendChild(p);dialog.hidden=false;
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
      .web-settings-list{display:grid;gap:7px}.web-settings-list .main-action{width:100%!important;min-height:48px!important;height:auto!important;margin:0!important;padding:9px 12px!important;border-radius:9px!important;font-size:15px!important;background:#137985!important;color:#fff!important}
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
    panel.insertBefore(list,panel.querySelector('[data-web-footer]'));
    if(!document.getElementById('webInterfaceMenuStyle')){const style=document.createElement('style');style.id='webInterfaceMenuStyle';style.textContent='body.design-menu-open #webDrawerSub #backgroundPanel.web-interface-menu{padding:0!important;border:0!important;background:transparent!important;box-shadow:none!important}#backgroundPanel.web-interface-menu>#backgroundDesignTools,#backgroundPanel.web-interface-menu>#interfaceVisibilityControls,#backgroundPanel.web-interface-menu>#designVisibilityControls{display:none!important}#webInterfaceMenu button{display:flex;gap:9px;align-items:center;text-align:right}#webInterfaceMenu button span:last-child{margin-inline-start:auto}#webInterfacePage .interface-visibility-grid,#webInterfacePage .bg-tools-grid{display:grid!important;grid-template-columns:1fr!important;gap:8px!important;width:100%!important}#webInterfacePage button{width:100%!important;min-height:48px!important;margin:0!important;padding:9px 12px!important;border-radius:9px!important;font-size:15px!important}#webInterfacePage .manual-edit-toggle-wrap{margin:0!important;width:100%!important}';document.head.appendChild(style);}
  }

  function restoreMoved(){
    restoreInterfacePart();
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
  function settingsView(){
    const wrap=document.createElement("div");wrap.id="webSettingsTemp";wrap.className="web-settings-list";
    SETTINGS.filter(([key])=>!["date","prayer","iqama","afterIqama",...(webOnly?["footer"]:[])].includes(key)).forEach(([key,icon,label,panel])=>{const b=document.createElement("button");b.type="button";b.className="main-action";b.dataset.panel=panel;b.dataset.title=label;b.innerHTML=icon+" <span>"+label+"</span>";wrap.appendChild(b);});
    wrap.addEventListener("click",e=>{const b=e.target.closest("[data-panel]");if(b)openPanel(b.dataset.title,b.dataset.panel,"settings");});
    if(webOnly){const b=document.createElement('button');b.type='button';b.className='main-action';b.dataset.settingSavePhone='true';b.textContent='📱 مشاركة التصميم';b.onclick=savePhone;wrap.appendChild(b);}
    openSub("إعدادت التصميم",wrap,"main");
    if(webOnly){const controls=document.getElementById('switchPanel');if(controls){controls.classList.add('inline-open');wrap.appendChild(controls);window.aoqatMoveNotificationSettings?.();}}

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
    [["🔊","الأذان والتنبيه","adhanPanel"],["⏳","أوقات الإقامة","iqamaPanel"],["⏱️","اوقات بعد الاقامة","afterIqamaPanel"]].forEach(([icon,title,id])=>{const b=document.createElement("button");b.type="button";b.className="main-action";b.textContent=icon+" "+title;b.onclick=()=>openPanel(title,id,"adhanIqama");wrap.appendChild(b);});openSub("بيانات الاذان والإقامة",wrap,"main");
  }
  function themeView(){const p=document.createElement("div");p.className="web-theme-drawer-panel";const source=document.getElementById("webThemePanel");if(source){p.innerHTML=source.innerHTML;}else{p.innerHTML='<div class="wt-head"><span>🎨 الثيمات والألوان</span><span>اختيار مباشر</span></div><div class="wt-grid"><button type="button" class="wt-card" data-theme="cream-blue">🟦 كريمي وأزرق فاتح</button><button type="button" class="wt-card" data-theme="cream-gold">🟨 كريمي وذهبي هادئ</button><button type="button" class="wt-card" data-theme="white-sky">🔵 أبيض وسماوي حديث</button><button type="button" class="wt-card" data-theme="cream-green">🟩 كريمي وأخضر هادئ</button><button type="button" class="wt-card" data-theme="beige-gold">🟫 بيج وذهبي أنيق</button><button type="button" class="wt-card" data-theme="dark-night">🌙 داكن كحلي (ليلي)</button></div>';}p.addEventListener("click",e=>{const card=e.target.closest(".wt-card");if(!card)return;if(typeof window.applyWebTheme==="function")window.applyWebTheme(card.dataset.theme);p.querySelectorAll(".wt-card").forEach(b=>b.classList.toggle("is-active",b.dataset.theme===document.body.dataset.webTheme));window.refreshWebThemeControls?.();});p.querySelectorAll(".wt-card").forEach(b=>b.classList.toggle("is-active",b.dataset.theme===document.body.dataset.webTheme));openSub("شكل التطبيق",p,"main");window.refreshWebThemeControls?.();}
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
    sub.querySelector(".web-back").addEventListener("click",()=>{if(returnMode.startsWith("post:")){openMuslimBagSection(returnMode.slice(5));return;}if(returnMode==="muslimBag"&&bagSection==="friday"){muslimBagView();return;}if(window.aoqatAzkarCategory&&window.aoqatCloseAzkarCategory?.())return;if(returnMode==="muslimBag"){muslimBagView();return;}if(returnMode==="reminderInbox"){inboxView();return;}if(returnMode==="program"){mainView();if(document.body.classList.contains('design-menu-open'))document.getElementById('designSideMenuBtn')?.click();}else if(returnMode==="tools")openInterfacePart('tools','أدوات تعديل التصميم');else if(returnMode==="background")openPanel('واجهة البرنامج','backgroundPanel','settings');else if(returnMode==="settings")settingsView();else if(returnMode==="datePrayer")datePrayerView();else if(returnMode==="adhanIqama")adhanIqamaView();else mainView();});
    mainList.addEventListener("click",e=>{
      const b=e.target.closest("[data-drawer]");if(!b)return;const id=b.dataset.drawer;if(id==="qibla"){window.AndroidNative.openQibla();return;}
      if(["quran","qibla","azkar","widget"].includes(id)){
        const title=ROWS.find(row=>row[0]===id)[2];
        openPanel(title,"prayerServicePanel");window.aoqatOpenService?.(id);return;
      }
      if(id==="reminderInbox"){inboxView();return;}
      if(id==="muslimBag"){muslimBagView();return;}
      if(id==="settings"){settingsView();return;}
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
  if(!window.AndroidNative?.configureAdhan)window.AoqatWebSettingsNavigation={
    main:mainView,sub:openSub,panel:(id,title)=>openPanel(title,id,'settings'),interface:openInterfacePart,
    adhan:()=>{adhanIqamaView();openAdhanServices();},bag:openMuslimBagSection,
    drawer:id=>{mainView();document.querySelector('[data-drawer="'+id+'"]')?.click();}
  };
  function start(){let n=0;const t=setInterval(()=>{if(install()||++n>80)clearInterval(t)},150);install();window.addEventListener("aoqatModulesReady",install);}
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start,{once:true});else start();
})();




