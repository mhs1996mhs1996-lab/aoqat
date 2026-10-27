const prayerTimes=[];

/* js/startup-stabilizer.js */
"use strict";
(function(){
  const MIGRATION_KEY="aoqatStartupCleanupV3";
  const REQUIRED_DESIGNS=["design2","design3","design4","designRef"];

  function addStyle(){
    if(document.getElementById("startupStabilizerStyle"))return;
    const s=document.createElement("style");
    s.id="startupStabilizerStyle";
    s.textContent=`
      body.aoqat-booting .workspace,body.aoqat-booting .sidebar{visibility:hidden!important}
      body.aoqat-ready .workspace,body.aoqat-ready .sidebar{visibility:visible!important}
      .workspace>.export-buttons{display:none!important}
    `;
    document.head.appendChild(s);
  }

  function clearObsoleteSavedStateOnce(){
    if(localStorage.getItem(MIGRATION_KEY)==="1")return;
    try{
      // هذه المفاتيح كانت تعتمد على ترتيب العناصر/التصاميم القديم، وبعد حذف تصاميم
      // صار تطبيقها على عناصر جديدة يسبب مواضع وتنسيقات عشوائية عند بداية التشغيل.
      localStorage.removeItem("prayerDesignerSavedAdjustmentsV1");
      localStorage.removeItem("prayerDesignerUniversalSavedStateV2");
      localStorage.removeItem("prayerDesignerFontStatesV1");
      localStorage.setItem(MIGRATION_KEY,"1");
    }catch(_){ }
  }

  function cleanLegacyExportUi(){
    document.querySelectorAll('.workspace>.export-buttons').forEach(el=>el.remove());
    document.querySelectorAll('[data-export-format="png"],[data-export-format="webp"]').forEach(el=>el.remove());
    const old=document.getElementById("exportBtn");
    if(old&&!document.getElementById("saveToPhoneBtn")){
      old.id="saveToPhoneBtn";
      old.removeAttribute("data-export-format");
      old.setAttribute("data-save-phone","true");
      old.innerHTML='📱 <span>حفظ على الهاتف</span>';
    }
  }

  function currentSlides(){
    const track=document.querySelector('.design-carousel-track');
    if(!track)return [];
    return REQUIRED_DESIGNS.map(id=>document.getElementById(id)?.closest('.design-slide')).filter(Boolean);
  }

  function stabilizeCarousel(){
    const track=document.querySelector('.design-carousel-track');
    const car=document.querySelector('.design-carousel');
    if(!track||!car)return false;

    const slides=currentSlides();
    if(slides.length!==REQUIRED_DESIGNS.length)return false;

    // لا نعيد أي تصميم محذوف، ونُظهر فقط التصاميم الأربعة الحالية.
    slides.forEach(slide=>{
      slide.style.removeProperty('display');
      slide.hidden=false;
      slide.removeAttribute('aria-hidden');
    });

    // التصميم الأول القديم يبقى خارج المعاينة لخدمة منطق البيانات فقط.
    const legacy=document.getElementById('design');
    const legacySlide=legacy?.closest('.design-slide');
    if(legacySlide&&track.contains(legacySlide)){
      let storage=document.getElementById('removedDesignStorage');
      if(!storage){storage=document.createElement('div');storage.id='removedDesignStorage';storage.className='removed-design-storage';document.body.appendChild(storage);}
      storage.appendChild(legacySlide);
    }

    // البداية دائمًا من أول تصميم حالي حقيقي، بدون الاعتماد على حالة قديمة.
    track.style.transform='translateX(0%)';
    window.__prayerActiveDesignIndex=0;
    window.__prayerActiveVisibleIndex=0;
    window.__prayerActiveDesignElement=document.getElementById('design2');

    document.querySelectorAll('.design-carousel-controls,.design-carousel-dots,.night-carousel-controls,.night-carousel-dots,.ornate-carousel-controls,.ornate-carousel-dots').forEach(el=>{
      if(!el.classList.contains('final-carousel-controls')&&!el.classList.contains('final-carousel-dots'))el.style.display='none';
    });
    const controls=document.querySelector('.final-carousel-controls');
    const dots=document.querySelector('.final-carousel-dots');
    if(controls){controls.style.display='flex';const status=controls.querySelector('.design-carousel-status');if(status)status.textContent='التصميم 1 من 4';}
    if(dots){dots.style.display='flex';dots.querySelectorAll('.design-carousel-dot').forEach((d,i)=>d.classList.toggle('active',i===0));}

    const preview=document.querySelector('.previewBox');
    if(preview&&innerWidth<=800){
      const cs=getComputedStyle(preview);
      const avail=Math.max(220,preview.clientWidth-parseFloat(cs.paddingLeft||0)-parseFloat(cs.paddingRight||0)-2);
      const scale=Math.min(1,avail/1024);
      REQUIRED_DESIGNS.forEach(id=>{const d=document.getElementById(id);if(d)d.style.zoom=String(scale);});
      car.style.height=Math.ceil(1448*scale)+'px';
    }
    return true;
  }

  function prayerDataReady(){
    return ["fajr","sunrise","dhuhr","asr","maghrib","isha"].every(id=>{
      const el=document.getElementById(id);
      return el&&String(el.value||'').trim();
    });
  }

  let finishing=false;
  function finish(){
    if(finishing)return;finishing=true;
    cleanLegacyExportUi();
    document.body.classList.remove('design-menu-open');
    const menu=document.getElementById('designSideMenuBtn');
    if(menu)menu.setAttribute('aria-expanded','false');
    window.AoqatAndroidUniversal?.syncAllData?.();
    // Trigger local font layout now; the cap only protects against broken fonts.
    document.querySelector('.previewBox')?.getBoundingClientRect();
    const fonts=document.fonts?.ready||Promise.resolve();
    let cap;Promise.race([fonts,new Promise(resolve=>{cap=setTimeout(resolve,800);})]).then(()=>{
      clearTimeout(cap);
      requestAnimationFrame(()=>requestAnimationFrame(()=>{
        document.body.classList.remove('aoqat-booting');
        document.body.classList.add('aoqat-ready');
        window.aoqatUIReady=true;
        window.AndroidNative?.startupReady?.();
      }));
    });
  }

  function init(){
    addStyle();

    document.body.classList.add('aoqat-booting');
    cleanLegacyExportUi();

    let tries=0,modulesReady=false;
    window.addEventListener("aoqatModulesReady",()=>{modulesReady=true;},{once:true});
    const timer=setInterval(()=>{
      tries++;
      cleanLegacyExportUi();
      const designsOk=currentSlides().length===REQUIRED_DESIGNS.length;
      if((modulesReady&&designsOk&&prayerDataReady())||tries>=125){
        clearInterval(timer);
        finish();
      }
    },32);


  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
})();
;

/* js/design-side-menu.js */
"use strict";
(function(){
  function install(){
    if(document.getElementById('designSideMenuBtn')) return true;
    const sidebar=document.querySelector('.sidebar');
    if(!sidebar) return false;

    const style=document.createElement('style');
    style.id='designSideMenuStyles';
    style.textContent=`
      #designSideMenuBtn{position:fixed;top:11px;right:12px;z-index:10020;width:31px;height:31px;border:1px solid rgba(255,255,255,.16);border-radius:8px;background:linear-gradient(145deg,#1b5147,#123c35);color:transparent;font-size:0;line-height:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2.5px;box-shadow:0 2px 8px #0003;cursor:pointer;padding:0}#designSideMenuBtn .menu-bar{display:block;width:13px;height:1.4px;border-radius:999px;background:#fff;box-shadow:0 0 2px rgba(255,255,255,.2);transition:transform .2s ease,opacity .2s ease}
      body.design-menu-open #designSideMenuBtn{top:5px;right:7px;width:28px;height:28px;border-radius:7px;font-size:0;box-shadow:0 2px 5px #0003}body.design-menu-open #designSideMenuBtn .menu-bar:nth-child(1){transform:translateY(4.5px) rotate(45deg)}body.design-menu-open #designSideMenuBtn .menu-bar:nth-child(2){opacity:0}body.design-menu-open #designSideMenuBtn .menu-bar:nth-child(3){transform:translateY(-4.5px) rotate(-45deg)}
      #designSideMenuBackdrop{position:fixed;inset:0;z-index:10000;background:rgba(0,0,0,.38);opacity:0;pointer-events:none;transition:opacity .22s ease}
      body.design-menu-open #designSideMenuBackdrop{opacity:1;pointer-events:auto}
      .preview-header{display:none!important}
      .drag-info{display:none!important}body.design-menu-open .previewBox::before,body.design-menu-open .previewBox::after,body.design-menu-open .workspace::before,body.design-menu-open .workspace::after{display:none!important;content:none!important}
      .sidebar{position:fixed!important;top:0!important;right:0!important;bottom:auto!important;z-index:10010!important;width:min(74vw,312px)!important;max-width:312px!important;height:auto!important;min-height:0!important;max-height:100dvh!important;overflow-y:auto!important;overscroll-behavior:contain;background:transparent!important;padding:0!important;margin:0!important;box-sizing:border-box!important;transform:translateX(105%)!important;transition:transform .24s ease!important;box-shadow:none!important}
      body.design-menu-open .sidebar{transform:none!important;overflow:visible!important;max-height:none!important;padding:0!important}
      html.design-menu-scroll-locked{overflow:hidden!important;overscroll-behavior:none!important}
      body.design-menu-open{overflow:hidden!important}
      body.design-menu-open .workspace{pointer-events:none!important}
      body.design-menu-open .sidebar,body.design-menu-open .web-sub-body{overscroll-behavior:contain!important}
      body.design-menu-open .sidebar>.panel:not(.main-panel){display:none!important}
      body.design-menu-open .sidebar .main-panel{width:max-content!important;max-width:calc(100% - 6px)!important;margin:28px 3px 0 auto!important;padding:3px!important;height:auto!important;min-height:0!important}
      body.design-menu-open .sidebar .main-panel>h2{margin:0 0 2px!important;font-size:14px!important;line-height:1!important}
      body.design-menu-open .sidebar .main-panel>.main-action,body.design-menu-open .sidebar .main-panel>#topExportJpg,body.design-menu-open #datePrayerGroup>.main-action,body.design-menu-open #backgroundFontGroup>.main-action{width:var(--design-action-width,auto)!important;min-width:var(--design-action-width,0)!important;max-width:100%!important;min-height:25px!important;height:25px!important;margin:0 0 1px auto!important;padding:2px 5px!important;font-size:11.5px!important;line-height:1!important;border-radius:6px!important;white-space:nowrap!important}
      body.design-menu-open #datePrayerGroup,body.design-menu-open #backgroundFontGroup{width:var(--design-action-width,auto)!important;max-width:100%!important;margin:0 0 1px auto!important}
      body.design-menu-open .sidebar .main-panel>.inline-control-panel{margin:0 0 1px!important;padding:3px!important}
      body.design-menu-open .sidebar .main-panel>.inline-control-panel:not(.inline-open){display:none!important;margin:0!important;padding:0!important;border:0!important;min-height:0!important;height:0!important;box-shadow:none!important}body.design-menu-open .sidebar .main-panel>.inline-control-panel:empty{display:none!important}body.design-menu-open .sidebar .main-panel::after{display:none!important;content:none!important}body.design-menu-open .sidebar .main-panel>*:last-child:not(#topExportJpg):not(.main-action):not(#backgroundFontGroup):not(#datePrayerGroup){display:none!important}body.design-menu-open .sidebar>.drag-info{display:none!important;width:0!important;height:0!important;min-height:0!important;margin:0!important;padding:0!important;border:0!important;background:none!important;box-shadow:none!important;overflow:hidden!important}
      body.design-menu-open #datePrayerSubmenu,body.design-menu-open #backgroundFontSubmenu{margin:0!important}
      body.design-menu-open #datePrayerSubmenu>.main-action,body.design-menu-open #backgroundFontSubmenu>.main-action{width:100%!important;min-height:24px!important;height:24px!important;margin:0 0 1px!important;padding:2px 5px!important;font-size:11px!important}
      @media(max-width:800px){
        .topbar.web-interface-header{margin-top:50px!important;margin-bottom:5px!important}
        .topbar.web-interface-header #saveToPhoneBtn,.topbar.web-interface-header #exportBtn{position:fixed!important;top:11px!important;left:12px!important;right:auto!important;transform:none!important;z-index:9990!important;margin:0!important}
        body.design-menu-open .topbar.web-interface-header #saveToPhoneBtn,body.design-menu-open .topbar.web-interface-header #exportBtn{z-index:9990!important}
        .workspace{padding-top:0!important}
      }
      @media(max-width:420px){.sidebar{width:74vw!important;max-width:312px!important}}
      @media(min-width:801px){#designSideMenuBtn{top:12px;right:12px}body.design-menu-open #designSideMenuBtn{top:5px;right:7px}}
    `;
    document.head.appendChild(style);

    const btn=document.createElement('button');
    btn.id='designSideMenuBtn';btn.type='button';btn.setAttribute('aria-label','الأعدادات');btn.setAttribute('aria-expanded','false');btn.innerHTML='<span class="menu-bar"></span><span class="menu-bar"></span><span class="menu-bar"></span>';
    const backdrop=document.createElement('div');backdrop.id='designSideMenuBackdrop';
    document.body.append(backdrop,btn);

    function syncActionWidth(){
      const main=sidebar.querySelector('.main-panel');
      if(!main)return;
      const items=[document.getElementById('backgroundFontMainBtn'),document.getElementById('datePrayerMainBtn'),main.querySelector('[data-open-panel="switchPanel"]'),document.getElementById('topExportJpg')].filter(Boolean);
      if(items.length<4)return;
      main.style.removeProperty('--design-action-width');
      items.forEach(el=>{el.style.removeProperty('width');el.style.removeProperty('min-width');});
      const max=Math.ceil(Math.max(...items.map(el=>el.scrollWidth))+8);
      main.style.setProperty('--design-action-width',Math.min(max,sidebar.clientWidth-16)+'px');
    }

    function hideEmptyStrips(){
      const main=sidebar.querySelector('.main-panel');
      if(!main)return;
      Array.from(main.children).forEach(el=>{
        if(!el.classList.contains('inline-control-panel'))return;
        const hasVisibleContent=Array.from(el.children).some(child=>!child.hidden&&getComputedStyle(child).display!=='none');
        if(!hasVisibleContent)el.style.setProperty('display','none','important');
      });
    }

    // Lock only background gestures; retain native scrolling inside each menu.
    let scrollLock=null,touchPoint=null;
    const overlaySelector='.sidebar,#settingsContentDialog,#adhanServicesDialog';
    function syncScrollLock(){
      const open=document.body.classList.contains('design-menu-open');
      if(open&&!scrollLock){
        scrollLock={x:window.scrollX,y:window.scrollY};
        document.documentElement.classList.add('design-menu-scroll-locked');
      }else if(!open&&scrollLock){
        const saved=scrollLock;scrollLock=null;touchPoint=null;
        document.documentElement.classList.remove('design-menu-scroll-locked');
        window.scrollTo(saved.x,saved.y);
      }
    }
    window.addEventListener('touchstart',e=>{
      if(scrollLock&&e.touches.length===1)touchPoint={x:e.touches[0].clientX,y:e.touches[0].clientY};
    },{capture:true,passive:true});
    window.addEventListener('touchmove',e=>{
      if(!scrollLock)return;
      const inside=e.target.closest?.(overlaySelector);
      if(!inside){if(e.cancelable)e.preventDefault();e.stopPropagation();return;}
      if(e.touches.length!==1||!touchPoint)return;
      const next={x:e.touches[0].clientX,y:e.touches[0].clientY},dy=touchPoint.y-next.y,dx=touchPoint.x-next.x;
      touchPoint=next;
      // Horizontal reader gestures and zoom retain their existing behavior.
      if(Math.abs(dx)>Math.abs(dy))return;
      let canScroll=false;
      for(let el=e.target;el instanceof Element&&inside.contains(el);el=el.parentElement){
        const style=getComputedStyle(el);
        if(/auto|scroll/.test(style.overflowY)&&el.scrollHeight>el.clientHeight+1&&
          ((dy>0&&el.scrollTop<el.scrollHeight-el.clientHeight-1)||(dy<0&&el.scrollTop>0))){canScroll=true;break;}
      }
      if(!canScroll&&e.cancelable)e.preventDefault();
      // A menu gesture must not reach the design's global drag handlers.
      e.stopPropagation();
    },{capture:true,passive:false});
    window.addEventListener('touchend',()=>{touchPoint=null;},{capture:true,passive:true});
    window.addEventListener('touchcancel',()=>{touchPoint=null;},{capture:true,passive:true});
    new MutationObserver(syncScrollLock).observe(document.body,{attributes:true,attributeFilter:['class']});
    syncScrollLock();

    function setOpen(open){document.body.classList.toggle('design-menu-open',open);syncScrollLock();btn.setAttribute('aria-expanded',String(open));btn.innerHTML='<span class="menu-bar"></span><span class="menu-bar"></span><span class="menu-bar"></span>';if(open)setTimeout(()=>{syncActionWidth();hideEmptyStrips();const drag=sidebar.querySelector(':scope > .drag-info');if(drag){drag.hidden=true;drag.style.setProperty('display','none','important');}},30);else{const drag=sidebar.querySelector(':scope > .drag-info');if(drag)drag.hidden=false;}}
    btn.addEventListener('click',()=>setOpen(!document.body.classList.contains('design-menu-open')));
    backdrop.addEventListener('click',()=>setOpen(false));
    document.addEventListener('keydown',e=>{if(e.key==='Escape')setOpen(false);});
    window.addEventListener('aoqatModulesReady',()=>{syncActionWidth();hideEmptyStrips();});
    setTimeout(()=>{syncActionWidth();hideEmptyStrips();},1200);
    return true;
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{let n=0,t=setInterval(()=>{if(install()||++n>40)clearInterval(t)},100)},{once:true});else install();
})();

;

/* data/prayer-times-offline.js */
// Annual database snapshot; Fajr-only photo correction applied 2026-10-23. No calculated prayer times.
window.AoqatPrayerBackupRows=[{"location_name":"الحويجة وضواحيها","gregorian_month":1,"gregorian_day":1,"fajr":"5:59","sunrise":"7:14","dhuhr":"12:13","asr":"2:50","maghrib":"5:06","isha":"6:26"},{"location_name":"الحويجة وضواحيها","gregorian_month":1,"gregorian_day":2,"fajr":"5:59","sunrise":"7:14","dhuhr":"12:13","asr":"2:51","maghrib":"5:06","isha":"6:26"},{"location_name":"الحويجة وضواحيها","gregorian_month":1,"gregorian_day":3,"fajr":"5:59","sunrise":"7:14","dhuhr":"12:14","asr":"2:52","maghrib":"5:07","isha":"6:27"},{"location_name":"الحويجة وضواحيها","gregorian_month":1,"gregorian_day":4,"fajr":"5:59","sunrise":"7:15","dhuhr":"12:14","asr":"2:54","maghrib":"5:08","isha":"6:28"},{"location_name":"الحويجة وضواحيها","gregorian_month":1,"gregorian_day":5,"fajr":"5:59","sunrise":"7:15","dhuhr":"12:15","asr":"2:55","maghrib":"5:09","isha":"6:29"},{"location_name":"الحويجة وضواحيها","gregorian_month":1,"gregorian_day":6,"fajr":"5:58","sunrise":"7:15","dhuhr":"12:15","asr":"2:56","maghrib":"5:10","isha":"6:30"},{"location_name":"الحويجة وضواحيها","gregorian_month":1,"gregorian_day":7,"fajr":"5:58","sunrise":"7:15","dhuhr":"12:16","asr":"2:57","maghrib":"5:11","isha":"6:31"},{"location_name":"الحويجة وضواحيها","gregorian_month":1,"gregorian_day":8,"fajr":"5:58","sunrise":"7:15","dhuhr":"12:16","asr":"2:58","maghrib":"5:12","isha":"6:32"},{"location_name":"الحويجة وضواحيها","gregorian_month":1,"gregorian_day":9,"fajr":"5:58","sunrise":"7:15","dhuhr":"12:16","asr":"3:00","maghrib":"5:13","isha":"6:33"},{"location_name":"الحويجة وضواحيها","gregorian_month":1,"gregorian_day":10,"fajr":"5:57","sunrise":"7:15","dhuhr":"12:17","asr":"3:00","maghrib":"5:14","isha":"6:34"},{"location_name":"الحويجة وضواحيها","gregorian_month":1,"gregorian_day":11,"fajr":"5:57","sunrise":"7:15","dhuhr":"12:17","asr":"3:01","maghrib":"5:15","isha":"6:35"},{"location_name":"الحويجة وضواحيها","gregorian_month":1,"gregorian_day":12,"fajr":"5:57","sunrise":"7:15","dhuhr":"12:17","asr":"3:02","maghrib":"5:16","isha":"6:36"},{"location_name":"الحويجة وضواحيها","gregorian_month":1,"gregorian_day":13,"fajr":"5:56","sunrise":"7:14","dhuhr":"12:18","asr":"3:03","maghrib":"5:17","isha":"6:37"},{"location_name":"الحويجة وضواحيها","gregorian_month":1,"gregorian_day":14,"fajr":"5:56","sunrise":"7:14","dhuhr":"12:18","asr":"3:04","maghrib":"5:18","isha":"6:38"},{"location_name":"الحويجة وضواحيها","gregorian_month":1,"gregorian_day":15,"fajr":"5:56","sunrise":"7:14","dhuhr":"12:19","asr":"3:04","maghrib":"5:19","isha":"6:39"},{"location_name":"الحويجة وضواحيها","gregorian_month":1,"gregorian_day":16,"fajr":"5:55","sunrise":"7:14","dhuhr":"12:19","asr":"3:05","maghrib":"5:20","isha":"6:40"},{"location_name":"الحويجة وضواحيها","gregorian_month":1,"gregorian_day":17,"fajr":"5:55","sunrise":"7:14","dhuhr":"12:19","asr":"3:06","maghrib":"5:21","isha":"6:41"},{"location_name":"الحويجة وضواحيها","gregorian_month":1,"gregorian_day":18,"fajr":"5:55","sunrise":"7:13","dhuhr":"12:20","asr":"3:07","maghrib":"5:21","isha":"6:41"},{"location_name":"الحويجة وضواحيها","gregorian_month":1,"gregorian_day":19,"fajr":"5:54","sunrise":"7:13","dhuhr":"12:20","asr":"3:08","maghrib":"5:22","isha":"6:42"},{"location_name":"الحويجة وضواحيها","gregorian_month":1,"gregorian_day":20,"fajr":"5:54","sunrise":"7:12","dhuhr":"12:20","asr":"3:09","maghrib":"5:23","isha":"6:43"},{"location_name":"الحويجة وضواحيها","gregorian_month":1,"gregorian_day":21,"fajr":"5:53","sunrise":"7:12","dhuhr":"12:20","asr":"3:09","maghrib":"5:24","isha":"6:44"},{"location_name":"الحويجة وضواحيها","gregorian_month":1,"gregorian_day":22,"fajr":"5:53","sunrise":"7:12","dhuhr":"12:21","asr":"3:10","maghrib":"5:25","isha":"6:45"},{"location_name":"الحويجة وضواحيها","gregorian_month":1,"gregorian_day":23,"fajr":"5:52","sunrise":"7:11","dhuhr":"12:21","asr":"3:11","maghrib":"5:26","isha":"6:46"},{"location_name":"الحويجة وضواحيها","gregorian_month":1,"gregorian_day":24,"fajr":"5:52","sunrise":"7:10","dhuhr":"12:21","asr":"3:12","maghrib":"5:27","isha":"6:47"},{"location_name":"الحويجة وضواحيها","gregorian_month":1,"gregorian_day":25,"fajr":"5:52","sunrise":"7:10","dhuhr":"12:21","asr":"3:14","maghrib":"5:29","isha":"6:49"},{"location_name":"الحويجة وضواحيها","gregorian_month":1,"gregorian_day":26,"fajr":"5:51","sunrise":"7:09","dhuhr":"12:22","asr":"3:15","maghrib":"5:30","isha":"6:50"},{"location_name":"الحويجة وضواحيها","gregorian_month":1,"gregorian_day":27,"fajr":"5:51","sunrise":"7:09","dhuhr":"12:22","asr":"3:15","maghrib":"5:31","isha":"6:51"},{"location_name":"الحويجة وضواحيها","gregorian_month":1,"gregorian_day":28,"fajr":"5:50","sunrise":"7:08","dhuhr":"12:22","asr":"3:16","maghrib":"5:32","isha":"6:52"},{"location_name":"الحويجة وضواحيها","gregorian_month":1,"gregorian_day":29,"fajr":"5:49","sunrise":"7:07","dhuhr":"12:22","asr":"3:17","maghrib":"5:33","isha":"6:53"},{"location_name":"الحويجة وضواحيها","gregorian_month":1,"gregorian_day":30,"fajr":"5:48","sunrise":"7:07","dhuhr":"12:22","asr":"3:18","maghrib":"5:34","isha":"6:54"},{"location_name":"الحويجة وضواحيها","gregorian_month":1,"gregorian_day":31,"fajr":"5:47","sunrise":"7:06","dhuhr":"12:23","asr":"3:19","maghrib":"5:35","isha":"6:55"},{"location_name":"الحويجة وضواحيها","gregorian_month":2,"gregorian_day":1,"fajr":"5:47","sunrise":"7:06","dhuhr":"12:23","asr":"3:19","maghrib":"5:36","isha":"6:56"},{"location_name":"الحويجة وضواحيها","gregorian_month":2,"gregorian_day":2,"fajr":"5:47","sunrise":"7:05","dhuhr":"12:23","asr":"3:20","maghrib":"5:37","isha":"6:57"},{"location_name":"الحويجة وضواحيها","gregorian_month":2,"gregorian_day":3,"fajr":"5:46","sunrise":"7:04","dhuhr":"12:23","asr":"3:21","maghrib":"5:38","isha":"6:58"},{"location_name":"الحويجة وضواحيها","gregorian_month":2,"gregorian_day":4,"fajr":"5:45","sunrise":"7:03","dhuhr":"12:23","asr":"3:22","maghrib":"5:39","isha":"6:59"},{"location_name":"الحويجة وضواحيها","gregorian_month":2,"gregorian_day":5,"fajr":"5:44","sunrise":"7:02","dhuhr":"12:23","asr":"3:23","maghrib":"5:40","isha":"7:00"},{"location_name":"الحويجة وضواحيها","gregorian_month":2,"gregorian_day":6,"fajr":"5:43","sunrise":"7:02","dhuhr":"12:23","asr":"3:24","maghrib":"5:41","isha":"7:01"},{"location_name":"الحويجة وضواحيها","gregorian_month":2,"gregorian_day":7,"fajr":"5:43","sunrise":"7:01","dhuhr":"12:23","asr":"3:25","maghrib":"5:42","isha":"7:02"},{"location_name":"الحويجة وضواحيها","gregorian_month":2,"gregorian_day":8,"fajr":"5:43","sunrise":"7:00","dhuhr":"12:24","asr":"3:26","maghrib":"5:43","isha":"7:03"},{"location_name":"الحويجة وضواحيها","gregorian_month":2,"gregorian_day":9,"fajr":"5:42","sunrise":"6:59","dhuhr":"12:24","asr":"3:26","maghrib":"5:44","isha":"7:04"},{"location_name":"الحويجة وضواحيها","gregorian_month":2,"gregorian_day":10,"fajr":"5:41","sunrise":"6:58","dhuhr":"12:24","asr":"3:27","maghrib":"5:45","isha":"7:05"},{"location_name":"الحويجة وضواحيها","gregorian_month":2,"gregorian_day":11,"fajr":"5:41","sunrise":"6:57","dhuhr":"12:24","asr":"3:28","maghrib":"5:46","isha":"7:06"},{"location_name":"الحويجة وضواحيها","gregorian_month":2,"gregorian_day":12,"fajr":"5:40","sunrise":"6:56","dhuhr":"12:24","asr":"3:29","maghrib":"5:47","isha":"7:07"},{"location_name":"الحويجة وضواحيها","gregorian_month":2,"gregorian_day":13,"fajr":"5:39","sunrise":"6:55","dhuhr":"12:24","asr":"3:29","maghrib":"5:48","isha":"7:08"},{"location_name":"الحويجة وضواحيها","gregorian_month":2,"gregorian_day":14,"fajr":"5:38","sunrise":"6:55","dhuhr":"12:24","asr":"3:30","maghrib":"5:48","isha":"7:08"},{"location_name":"الحويجة وضواحيها","gregorian_month":2,"gregorian_day":15,"fajr":"5:37","sunrise":"6:54","dhuhr":"12:24","asr":"3:31","maghrib":"5:49","isha":"7:09"},{"location_name":"الحويجة وضواحيها","gregorian_month":2,"gregorian_day":16,"fajr":"5:36","sunrise":"6:53","dhuhr":"12:24","asr":"3:31","maghrib":"5:50","isha":"7:10"},{"location_name":"الحويجة وضواحيها","gregorian_month":2,"gregorian_day":17,"fajr":"5:35","sunrise":"6:53","dhuhr":"12:24","asr":"3:32","maghrib":"5:51","isha":"7:11"},{"location_name":"الحويجة وضواحيها","gregorian_month":2,"gregorian_day":18,"fajr":"5:34","sunrise":"6:50","dhuhr":"12:24","asr":"3:32","maghrib":"5:52","isha":"7:12"},{"location_name":"الحويجة وضواحيها","gregorian_month":2,"gregorian_day":19,"fajr":"5:33","sunrise":"6:50","dhuhr":"12:24","asr":"3:33","maghrib":"5:53","isha":"7:13"},{"location_name":"الحويجة وضواحيها","gregorian_month":2,"gregorian_day":20,"fajr":"5:32","sunrise":"6:49","dhuhr":"12:23","asr":"3:33","maghrib":"5:54","isha":"7:14"},{"location_name":"الحويجة وضواحيها","gregorian_month":2,"gregorian_day":21,"fajr":"5:31","sunrise":"6:47","dhuhr":"12:23","asr":"3:34","maghrib":"5:55","isha":"7:15"},{"location_name":"الحويجة وضواحيها","gregorian_month":2,"gregorian_day":22,"fajr":"5:30","sunrise":"6:46","dhuhr":"12:23","asr":"3:34","maghrib":"5:56","isha":"7:16"},{"location_name":"الحويجة وضواحيها","gregorian_month":2,"gregorian_day":23,"fajr":"5:29","sunrise":"6:45","dhuhr":"12:23","asr":"3:35","maghrib":"5:56","isha":"7:16"},{"location_name":"الحويجة وضواحيها","gregorian_month":2,"gregorian_day":24,"fajr":"5:28","sunrise":"6:44","dhuhr":"12:23","asr":"3:35","maghrib":"5:57","isha":"7:17"},{"location_name":"الحويجة وضواحيها","gregorian_month":2,"gregorian_day":25,"fajr":"5:27","sunrise":"6:43","dhuhr":"12:23","asr":"3:36","maghrib":"5:58","isha":"7:18"},{"location_name":"الحويجة وضواحيها","gregorian_month":2,"gregorian_day":26,"fajr":"5:26","sunrise":"6:42","dhuhr":"12:23","asr":"3:36","maghrib":"5:59","isha":"7:19"},{"location_name":"الحويجة وضواحيها","gregorian_month":2,"gregorian_day":27,"fajr":"5:25","sunrise":"6:42","dhuhr":"12:23","asr":"3:37","maghrib":"6:00","isha":"7:20"},{"location_name":"الحويجة وضواحيها","gregorian_month":2,"gregorian_day":28,"fajr":"5:24","sunrise":"6:41","dhuhr":"12:23","asr":"3:37","maghrib":"6:00","isha":"7:20"},{"location_name":"الحويجة وضواحيها","gregorian_month":2,"gregorian_day":29,"fajr":"5:23","sunrise":"6:39","dhuhr":"12:23","asr":"3:38","maghrib":"6:02","isha":"7:22"},{"location_name":"الحويجة وضواحيها","gregorian_month":3,"gregorian_day":1,"fajr":"5:22","sunrise":"6:38","dhuhr":"12:22","asr":"3:38","maghrib":"6:02","isha":"7:22"},{"location_name":"الحويجة وضواحيها","gregorian_month":3,"gregorian_day":2,"fajr":"5:21","sunrise":"6:37","dhuhr":"12:22","asr":"3:38","maghrib":"6:02","isha":"7:22"},{"location_name":"الحويجة وضواحيها","gregorian_month":3,"gregorian_day":3,"fajr":"5:19","sunrise":"6:35","dhuhr":"12:22","asr":"3:39","maghrib":"6:03","isha":"7:23"},{"location_name":"الحويجة وضواحيها","gregorian_month":3,"gregorian_day":4,"fajr":"5:17","sunrise":"6:34","dhuhr":"12:22","asr":"3:39","maghrib":"6:04","isha":"7:24"},{"location_name":"الحويجة وضواحيها","gregorian_month":3,"gregorian_day":5,"fajr":"5:15","sunrise":"6:33","dhuhr":"12:21","asr":"3:40","maghrib":"6:05","isha":"7:25"},{"location_name":"الحويجة وضواحيها","gregorian_month":3,"gregorian_day":6,"fajr":"5:14","sunrise":"6:32","dhuhr":"12:21","asr":"3:40","maghrib":"6:06","isha":"7:26"},{"location_name":"الحويجة وضواحيها","gregorian_month":3,"gregorian_day":7,"fajr":"5:12","sunrise":"6:31","dhuhr":"12:21","asr":"3:42","maghrib":"6:07","isha":"7:27"},{"location_name":"الحويجة وضواحيها","gregorian_month":3,"gregorian_day":8,"fajr":"5:11","sunrise":"6:30","dhuhr":"12:21","asr":"3:42","maghrib":"6:08","isha":"7:28"},{"location_name":"الحويجة وضواحيها","gregorian_month":3,"gregorian_day":9,"fajr":"5:09","sunrise":"6:29","dhuhr":"12:20","asr":"3:42","maghrib":"6:09","isha":"7:29"},{"location_name":"الحويجة وضواحيها","gregorian_month":3,"gregorian_day":10,"fajr":"5:07","sunrise":"6:28","dhuhr":"12:20","asr":"3:43","maghrib":"6:10","isha":"7:30"},{"location_name":"الحويجة وضواحيها","gregorian_month":3,"gregorian_day":11,"fajr":"5:06","sunrise":"6:26","dhuhr":"12:20","asr":"3:43","maghrib":"6:11","isha":"7:31"},{"location_name":"الحويجة وضواحيها","gregorian_month":3,"gregorian_day":12,"fajr":"5:04","sunrise":"6:25","dhuhr":"12:20","asr":"3:44","maghrib":"6:12","isha":"7:32"},{"location_name":"الحويجة وضواحيها","gregorian_month":3,"gregorian_day":13,"fajr":"5:03","sunrise":"6:22","dhuhr":"12:19","asr":"3:45","maghrib":"6:13","isha":"7:33"},{"location_name":"الحويجة وضواحيها","gregorian_month":3,"gregorian_day":14,"fajr":"5:02","sunrise":"6:21","dhuhr":"12:19","asr":"3:45","maghrib":"6:14","isha":"7:34"},{"location_name":"الحويجة وضواحيها","gregorian_month":3,"gregorian_day":15,"fajr":"5:01","sunrise":"6:20","dhuhr":"12:19","asr":"3:45","maghrib":"6:15","isha":"7:35"},{"location_name":"الحويجة وضواحيها","gregorian_month":3,"gregorian_day":16,"fajr":"5:00","sunrise":"6:19","dhuhr":"12:19","asr":"3:46","maghrib":"6:16","isha":"7:36"},{"location_name":"الحويجة وضواحيها","gregorian_month":3,"gregorian_day":17,"fajr":"4:58","sunrise":"6:17","dhuhr":"12:18","asr":"3:47","maghrib":"6:17","isha":"7:37"},{"location_name":"الحويجة وضواحيها","gregorian_month":3,"gregorian_day":18,"fajr":"4:57","sunrise":"6:16","dhuhr":"12:18","asr":"3:47","maghrib":"6:18","isha":"7:38"},{"location_name":"الحويجة وضواحيها","gregorian_month":3,"gregorian_day":19,"fajr":"4:56","sunrise":"6:15","dhuhr":"12:18","asr":"3:47","maghrib":"6:19","isha":"7:39"},{"location_name":"الحويجة وضواحيها","gregorian_month":3,"gregorian_day":20,"fajr":"4:55","sunrise":"6:14","dhuhr":"12:17","asr":"3:48","maghrib":"6:20","isha":"7:40"},{"location_name":"الحويجة وضواحيها","gregorian_month":3,"gregorian_day":21,"fajr":"4:54","sunrise":"6:12","dhuhr":"12:17","asr":"3:49","maghrib":"6:21","isha":"7:41"},{"location_name":"الحويجة وضواحيها","gregorian_month":3,"gregorian_day":22,"fajr":"4:53","sunrise":"6:11","dhuhr":"12:17","asr":"3:49","maghrib":"6:22","isha":"7:42"},{"location_name":"الحويجة وضواحيها","gregorian_month":3,"gregorian_day":23,"fajr":"4:52","sunrise":"6:10","dhuhr":"12:16","asr":"3:49","maghrib":"6:23","isha":"7:43"},{"location_name":"الحويجة وضواحيها","gregorian_month":3,"gregorian_day":24,"fajr":"4:51","sunrise":"6:08","dhuhr":"12:16","asr":"3:49","maghrib":"6:24","isha":"7:44"},{"location_name":"الحويجة وضواحيها","gregorian_month":3,"gregorian_day":25,"fajr":"4:49","sunrise":"6:06","dhuhr":"12:16","asr":"3:51","maghrib":"6:25","isha":"7:45"},{"location_name":"الحويجة وضواحيها","gregorian_month":3,"gregorian_day":26,"fajr":"4:48","sunrise":"6:04","dhuhr":"12:15","asr":"3:51","maghrib":"6:26","isha":"7:46"},{"location_name":"الحويجة وضواحيها","gregorian_month":3,"gregorian_day":27,"fajr":"4:47","sunrise":"6:03","dhuhr":"12:15","asr":"3:51","maghrib":"6:27","isha":"7:47"},{"location_name":"الحويجة وضواحيها","gregorian_month":3,"gregorian_day":28,"fajr":"4:45","sunrise":"6:02","dhuhr":"12:15","asr":"3:51","maghrib":"6:28","isha":"7:48"},{"location_name":"الحويجة وضواحيها","gregorian_month":3,"gregorian_day":29,"fajr":"4:44","sunrise":"6:00","dhuhr":"12:14","asr":"3:51","maghrib":"6:28","isha":"7:48"},{"location_name":"الحويجة وضواحيها","gregorian_month":3,"gregorian_day":30,"fajr":"4:43","sunrise":"5:59","dhuhr":"12:14","asr":"3:51","maghrib":"6:29","isha":"7:49"},{"location_name":"الحويجة وضواحيها","gregorian_month":3,"gregorian_day":31,"fajr":"4:42","sunrise":"5:57","dhuhr":"12:14","asr":"3:51","maghrib":"6:30","isha":"7:50"},{"location_name":"الحويجة وضواحيها","gregorian_month":4,"gregorian_day":1,"fajr":"4:40","sunrise":"5:56","dhuhr":"12:14","asr":"3:51","maghrib":"6:30","isha":"7:50"},{"location_name":"الحويجة وضواحيها","gregorian_month":4,"gregorian_day":2,"fajr":"4:39","sunrise":"5:55","dhuhr":"12:13","asr":"3:52","maghrib":"6:31","isha":"7:51"},{"location_name":"الحويجة وضواحيها","gregorian_month":4,"gregorian_day":3,"fajr":"4:38","sunrise":"5:53","dhuhr":"12:13","asr":"3:52","maghrib":"6:32","isha":"7:52"},{"location_name":"الحويجة وضواحيها","gregorian_month":4,"gregorian_day":4,"fajr":"4:36","sunrise":"5:53","dhuhr":"12:13","asr":"3:52","maghrib":"6:33","isha":"7:53"},{"location_name":"الحويجة وضواحيها","gregorian_month":4,"gregorian_day":5,"fajr":"4:34","sunrise":"5:51","dhuhr":"12:12","asr":"3:52","maghrib":"6:34","isha":"7:54"},{"location_name":"الحويجة وضواحيها","gregorian_month":4,"gregorian_day":6,"fajr":"4:32","sunrise":"5:50","dhuhr":"12:12","asr":"3:52","maghrib":"6:35","isha":"7:55"},{"location_name":"الحويجة وضواحيها","gregorian_month":4,"gregorian_day":7,"fajr":"4:31","sunrise":"5:48","dhuhr":"12:12","asr":"3:52","maghrib":"6:35","isha":"7:55"},{"location_name":"الحويجة وضواحيها","gregorian_month":4,"gregorian_day":8,"fajr":"4:30","sunrise":"5:47","dhuhr":"12:11","asr":"3:52","maghrib":"6:36","isha":"7:56"},{"location_name":"الحويجة وضواحيها","gregorian_month":4,"gregorian_day":9,"fajr":"4:28","sunrise":"5:45","dhuhr":"12:11","asr":"3:52","maghrib":"6:36","isha":"7:56"},{"location_name":"الحويجة وضواحيها","gregorian_month":4,"gregorian_day":10,"fajr":"4:27","sunrise":"5:44","dhuhr":"12:11","asr":"3:53","maghrib":"6:38","isha":"7:58"},{"location_name":"الحويجة وضواحيها","gregorian_month":4,"gregorian_day":11,"fajr":"4:25","sunrise":"5:43","dhuhr":"12:10","asr":"3:53","maghrib":"6:39","isha":"7:59"},{"location_name":"الحويجة وضواحيها","gregorian_month":4,"gregorian_day":12,"fajr":"4:23","sunrise":"5:41","dhuhr":"12:10","asr":"3:53","maghrib":"6:40","isha":"8:00"},{"location_name":"الحويجة وضواحيها","gregorian_month":4,"gregorian_day":13,"fajr":"4:21","sunrise":"5:40","dhuhr":"12:10","asr":"3:53","maghrib":"6:40","isha":"8:00"},{"location_name":"الحويجة وضواحيها","gregorian_month":4,"gregorian_day":14,"fajr":"4:20","sunrise":"5:38","dhuhr":"12:10","asr":"3:53","maghrib":"6:40","isha":"8:00"},{"location_name":"الحويجة وضواحيها","gregorian_month":4,"gregorian_day":15,"fajr":"4:18","sunrise":"5:37","dhuhr":"12:09","asr":"3:53","maghrib":"6:42","isha":"8:02"},{"location_name":"الحويجة وضواحيها","gregorian_month":4,"gregorian_day":16,"fajr":"4:17","sunrise":"5:36","dhuhr":"12:09","asr":"3:53","maghrib":"6:43","isha":"8:03"},{"location_name":"الحويجة وضواحيها","gregorian_month":4,"gregorian_day":17,"fajr":"4:15","sunrise":"5:35","dhuhr":"12:09","asr":"3:53","maghrib":"6:43","isha":"8:03"},{"location_name":"الحويجة وضواحيها","gregorian_month":4,"gregorian_day":18,"fajr":"4:14","sunrise":"5:33","dhuhr":"12:09","asr":"3:53","maghrib":"6:44","isha":"8:04"},{"location_name":"الحويجة وضواحيها","gregorian_month":4,"gregorian_day":19,"fajr":"4:12","sunrise":"5:32","dhuhr":"12:08","asr":"3:53","maghrib":"6:45","isha":"8:05"},{"location_name":"الحويجة وضواحيها","gregorian_month":4,"gregorian_day":20,"fajr":"4:10","sunrise":"5:30","dhuhr":"12:08","asr":"3:53","maghrib":"6:46","isha":"8:06"},{"location_name":"الحويجة وضواحيها","gregorian_month":4,"gregorian_day":21,"fajr":"4:09","sunrise":"5:29","dhuhr":"12:08","asr":"3:53","maghrib":"6:46","isha":"8:06"},{"location_name":"الحويجة وضواحيها","gregorian_month":4,"gregorian_day":22,"fajr":"4:08","sunrise":"5:28","dhuhr":"12:08","asr":"3:53","maghrib":"6:47","isha":"8:07"},{"location_name":"الحويجة وضواحيها","gregorian_month":4,"gregorian_day":23,"fajr":"4:07","sunrise":"5:27","dhuhr":"12:08","asr":"3:54","maghrib":"6:48","isha":"8:08"},{"location_name":"الحويجة وضواحيها","gregorian_month":4,"gregorian_day":24,"fajr":"4:05","sunrise":"5:26","dhuhr":"12:07","asr":"3:54","maghrib":"6:49","isha":"8:09"},{"location_name":"الحويجة وضواحيها","gregorian_month":4,"gregorian_day":25,"fajr":"4:04","sunrise":"5:25","dhuhr":"12:07","asr":"3:55","maghrib":"6:50","isha":"8:10"},{"location_name":"الحويجة وضواحيها","gregorian_month":4,"gregorian_day":26,"fajr":"4:03","sunrise":"5:24","dhuhr":"12:07","asr":"3:55","maghrib":"6:51","isha":"8:11"},{"location_name":"الحويجة وضواحيها","gregorian_month":4,"gregorian_day":27,"fajr":"4:02","sunrise":"5:23","dhuhr":"12:07","asr":"3:55","maghrib":"6:52","isha":"8:12"},{"location_name":"الحويجة وضواحيها","gregorian_month":4,"gregorian_day":28,"fajr":"4:01","sunrise":"5:21","dhuhr":"12:07","asr":"3:55","maghrib":"6:53","isha":"8:13"},{"location_name":"الحويجة وضواحيها","gregorian_month":4,"gregorian_day":29,"fajr":"4:01","sunrise":"5:20","dhuhr":"12:07","asr":"3:55","maghrib":"6:53","isha":"8:13"},{"location_name":"الحويجة وضواحيها","gregorian_month":4,"gregorian_day":30,"fajr":"4:00","sunrise":"5:20","dhuhr":"12:06","asr":"3:55","maghrib":"6:54","isha":"8:14"},{"location_name":"الحويجة وضواحيها","gregorian_month":5,"gregorian_day":1,"fajr":"3:59","sunrise":"5:19","dhuhr":"12:06","asr":"3:55","maghrib":"6:55","isha":"8:15"},{"location_name":"الحويجة وضواحيها","gregorian_month":5,"gregorian_day":2,"fajr":"3:58","sunrise":"5:18","dhuhr":"12:06","asr":"3:55","maghrib":"6:56","isha":"8:16"},{"location_name":"الحويجة وضواحيها","gregorian_month":5,"gregorian_day":3,"fajr":"3:57","sunrise":"5:17","dhuhr":"12:06","asr":"3:55","maghrib":"6:57","isha":"8:17"},{"location_name":"الحويجة وضواحيها","gregorian_month":5,"gregorian_day":4,"fajr":"3:56","sunrise":"5:16","dhuhr":"12:06","asr":"3:55","maghrib":"6:57","isha":"8:17"},{"location_name":"الحويجة وضواحيها","gregorian_month":5,"gregorian_day":5,"fajr":"3:55","sunrise":"5:15","dhuhr":"12:06","asr":"3:55","maghrib":"6:58","isha":"8:18"},{"location_name":"الحويجة وضواحيها","gregorian_month":5,"gregorian_day":6,"fajr":"3:54","sunrise":"5:13","dhuhr":"12:06","asr":"3:55","maghrib":"6:59","isha":"8:19"},{"location_name":"الحويجة وضواحيها","gregorian_month":5,"gregorian_day":7,"fajr":"3:52","sunrise":"5:11","dhuhr":"12:06","asr":"3:55","maghrib":"7:00","isha":"8:20"},{"location_name":"الحويجة وضواحيها","gregorian_month":5,"gregorian_day":8,"fajr":"3:51","sunrise":"5:10","dhuhr":"12:06","asr":"3:55","maghrib":"7:00","isha":"8:20"},{"location_name":"الحويجة وضواحيها","gregorian_month":5,"gregorian_day":9,"fajr":"3:49","sunrise":"5:09","dhuhr":"12:06","asr":"3:55","maghrib":"7:01","isha":"8:21"},{"location_name":"الحويجة وضواحيها","gregorian_month":5,"gregorian_day":10,"fajr":"3:48","sunrise":"5:08","dhuhr":"12:06","asr":"3:55","maghrib":"7:02","isha":"8:22"},{"location_name":"الحويجة وضواحيها","gregorian_month":5,"gregorian_day":11,"fajr":"3:47","sunrise":"5:07","dhuhr":"12:06","asr":"3:55","maghrib":"7:03","isha":"8:23"},{"location_name":"الحويجة وضواحيها","gregorian_month":5,"gregorian_day":12,"fajr":"3:46","sunrise":"5:06","dhuhr":"12:06","asr":"3:55","maghrib":"7:03","isha":"8:23"},{"location_name":"الحويجة وضواحيها","gregorian_month":5,"gregorian_day":13,"fajr":"3:45","sunrise":"5:05","dhuhr":"12:06","asr":"3:55","maghrib":"7:04","isha":"8:24"},{"location_name":"الحويجة وضواحيها","gregorian_month":5,"gregorian_day":14,"fajr":"3:44","sunrise":"5:04","dhuhr":"12:06","asr":"3:55","maghrib":"7:05","isha":"8:25"},{"location_name":"الحويجة وضواحيها","gregorian_month":5,"gregorian_day":15,"fajr":"3:43","sunrise":"5:04","dhuhr":"12:06","asr":"3:56","maghrib":"7:06","isha":"8:26"},{"location_name":"الحويجة وضواحيها","gregorian_month":5,"gregorian_day":16,"fajr":"3:42","sunrise":"5:03","dhuhr":"12:06","asr":"3:57","maghrib":"7:07","isha":"8:27"},{"location_name":"الحويجة وضواحيها","gregorian_month":5,"gregorian_day":17,"fajr":"3:41","sunrise":"5:03","dhuhr":"12:06","asr":"3:57","maghrib":"7:08","isha":"8:28"},{"location_name":"الحويجة وضواحيها","gregorian_month":5,"gregorian_day":18,"fajr":"3:40","sunrise":"5:02","dhuhr":"12:06","asr":"3:57","maghrib":"7:08","isha":"8:28"},{"location_name":"الحويجة وضواحيها","gregorian_month":5,"gregorian_day":19,"fajr":"3:39","sunrise":"5:01","dhuhr":"12:06","asr":"3:57","maghrib":"7:08","isha":"8:28"},{"location_name":"الحويجة وضواحيها","gregorian_month":5,"gregorian_day":20,"fajr":"3:38","sunrise":"5:01","dhuhr":"12:06","asr":"3:57","maghrib":"7:10","isha":"8:30"},{"location_name":"الحويجة وضواحيها","gregorian_month":5,"gregorian_day":21,"fajr":"3:37","sunrise":"5:00","dhuhr":"12:06","asr":"3:57","maghrib":"7:11","isha":"8:31"},{"location_name":"الحويجة وضواحيها","gregorian_month":5,"gregorian_day":22,"fajr":"3:36","sunrise":"5:00","dhuhr":"12:06","asr":"3:57","maghrib":"7:12","isha":"8:32"},{"location_name":"الحويجة وضواحيها","gregorian_month":5,"gregorian_day":23,"fajr":"3:35","sunrise":"5:00","dhuhr":"12:06","asr":"3:58","maghrib":"7:12","isha":"8:32"},{"location_name":"الحويجة وضواحيها","gregorian_month":5,"gregorian_day":24,"fajr":"3:34","sunrise":"5:00","dhuhr":"12:06","asr":"3:58","maghrib":"7:13","isha":"8:33"},{"location_name":"الحويجة وضواحيها","gregorian_month":5,"gregorian_day":25,"fajr":"3:33","sunrise":"4:59","dhuhr":"12:06","asr":"3:58","maghrib":"7:14","isha":"8:34"},{"location_name":"الحويجة وضواحيها","gregorian_month":5,"gregorian_day":26,"fajr":"3:32","sunrise":"4:59","dhuhr":"12:07","asr":"3:58","maghrib":"7:14","isha":"8:34"},{"location_name":"الحويجة وضواحيها","gregorian_month":5,"gregorian_day":27,"fajr":"3:31","sunrise":"4:58","dhuhr":"12:07","asr":"3:58","maghrib":"7:15","isha":"8:35"},{"location_name":"الحويجة وضواحيها","gregorian_month":5,"gregorian_day":28,"fajr":"3:30","sunrise":"4:58","dhuhr":"12:07","asr":"3:58","maghrib":"7:16","isha":"8:36"},{"location_name":"الحويجة وضواحيها","gregorian_month":5,"gregorian_day":29,"fajr":"3:29","sunrise":"4:57","dhuhr":"12:07","asr":"3:59","maghrib":"7:17","isha":"8:37"},{"location_name":"الحويجة وضواحيها","gregorian_month":5,"gregorian_day":30,"fajr":"3:28","sunrise":"4:57","dhuhr":"12:07","asr":"3:59","maghrib":"7:18","isha":"8:38"},{"location_name":"الحويجة وضواحيها","gregorian_month":5,"gregorian_day":31,"fajr":"3:27","sunrise":"4:56","dhuhr":"12:07","asr":"3:59","maghrib":"7:19","isha":"8:39"},{"location_name":"الحويجة وضواحيها","gregorian_month":6,"gregorian_day":1,"fajr":"3:27","sunrise":"4:56","dhuhr":"12:07","asr":"4:00","maghrib":"7:19","isha":"8:39"},{"location_name":"الحويجة وضواحيها","gregorian_month":6,"gregorian_day":2,"fajr":"3:26","sunrise":"4:55","dhuhr":"12:08","asr":"4:00","maghrib":"7:20","isha":"8:40"},{"location_name":"الحويجة وضواحيها","gregorian_month":6,"gregorian_day":3,"fajr":"3:25","sunrise":"4:55","dhuhr":"12:08","asr":"4:00","maghrib":"7:20","isha":"8:40"},{"location_name":"الحويجة وضواحيها","gregorian_month":6,"gregorian_day":4,"fajr":"3:24","sunrise":"4:55","dhuhr":"12:08","asr":"4:00","maghrib":"7:21","isha":"8:41"},{"location_name":"الحويجة وضواحيها","gregorian_month":6,"gregorian_day":5,"fajr":"3:23","sunrise":"4:54","dhuhr":"12:08","asr":"4:00","maghrib":"7:22","isha":"8:42"},{"location_name":"الحويجة وضواحيها","gregorian_month":6,"gregorian_day":6,"fajr":"3:22","sunrise":"4:54","dhuhr":"12:08","asr":"4:01","maghrib":"7:22","isha":"8:42"},{"location_name":"الحويجة وضواحيها","gregorian_month":6,"gregorian_day":7,"fajr":"3:21","sunrise":"4:54","dhuhr":"12:08","asr":"4:01","maghrib":"7:23","isha":"8:43"},{"location_name":"الحويجة وضواحيها","gregorian_month":6,"gregorian_day":8,"fajr":"3:20","sunrise":"4:54","dhuhr":"12:09","asr":"4:01","maghrib":"7:23","isha":"8:43"},{"location_name":"الحويجة وضواحيها","gregorian_month":6,"gregorian_day":9,"fajr":"3:19","sunrise":"4:54","dhuhr":"12:09","asr":"4:01","maghrib":"7:24","isha":"8:44"},{"location_name":"الحويجة وضواحيها","gregorian_month":6,"gregorian_day":10,"fajr":"3:18","sunrise":"4:54","dhuhr":"12:09","asr":"4:01","maghrib":"7:24","isha":"8:44"},{"location_name":"الحويجة وضواحيها","gregorian_month":6,"gregorian_day":11,"fajr":"3:17","sunrise":"4:54","dhuhr":"12:09","asr":"4:02","maghrib":"7:24","isha":"8:44"},{"location_name":"الحويجة وضواحيها","gregorian_month":6,"gregorian_day":12,"fajr":"3:17","sunrise":"4:54","dhuhr":"12:09","asr":"4:02","maghrib":"7:25","isha":"8:45"},{"location_name":"الحويجة وضواحيها","gregorian_month":6,"gregorian_day":13,"fajr":"3:18","sunrise":"4:54","dhuhr":"12:10","asr":"4:02","maghrib":"7:25","isha":"8:45"},{"location_name":"الحويجة وضواحيها","gregorian_month":6,"gregorian_day":14,"fajr":"3:19","sunrise":"4:54","dhuhr":"12:10","asr":"4:02","maghrib":"7:26","isha":"8:46"},{"location_name":"الحويجة وضواحيها","gregorian_month":6,"gregorian_day":15,"fajr":"3:20","sunrise":"4:54","dhuhr":"12:10","asr":"4:02","maghrib":"7:26","isha":"8:46"},{"location_name":"الحويجة وضواحيها","gregorian_month":6,"gregorian_day":16,"fajr":"3:22","sunrise":"4:54","dhuhr":"12:10","asr":"4:03","maghrib":"7:26","isha":"8:46"},{"location_name":"الحويجة وضواحيها","gregorian_month":6,"gregorian_day":17,"fajr":"3:23","sunrise":"4:54","dhuhr":"12:10","asr":"4:03","maghrib":"7:27","isha":"8:47"},{"location_name":"الحويجة وضواحيها","gregorian_month":6,"gregorian_day":18,"fajr":"3:24","sunrise":"4:54","dhuhr":"12:11","asr":"4:03","maghrib":"7:27","isha":"8:47"},{"location_name":"الحويجة وضواحيها","gregorian_month":6,"gregorian_day":19,"fajr":"3:25","sunrise":"4:54","dhuhr":"12:11","asr":"4:03","maghrib":"7:27","isha":"8:47"},{"location_name":"الحويجة وضواحيها","gregorian_month":6,"gregorian_day":20,"fajr":"3:25","sunrise":"4:55","dhuhr":"12:11","asr":"4:03","maghrib":"7:28","isha":"8:48"},{"location_name":"الحويجة وضواحيها","gregorian_month":6,"gregorian_day":21,"fajr":"3:26","sunrise":"4:55","dhuhr":"12:11","asr":"4:04","maghrib":"7:28","isha":"8:48"},{"location_name":"الحويجة وضواحيها","gregorian_month":6,"gregorian_day":22,"fajr":"3:27","sunrise":"4:55","dhuhr":"12:12","asr":"4:04","maghrib":"7:28","isha":"8:48"},{"location_name":"الحويجة وضواحيها","gregorian_month":6,"gregorian_day":23,"fajr":"3:28","sunrise":"4:55","dhuhr":"12:12","asr":"4:04","maghrib":"7:28","isha":"8:48"},{"location_name":"الحويجة وضواحيها","gregorian_month":6,"gregorian_day":24,"fajr":"3:29","sunrise":"4:55","dhuhr":"12:12","asr":"4:04","maghrib":"7:28","isha":"8:48"},{"location_name":"الحويجة وضواحيها","gregorian_month":6,"gregorian_day":25,"fajr":"3:29","sunrise":"4:55","dhuhr":"12:12","asr":"4:04","maghrib":"7:29","isha":"8:49"},{"location_name":"الحويجة وضواحيها","gregorian_month":6,"gregorian_day":26,"fajr":"3:30","sunrise":"4:56","dhuhr":"12:12","asr":"4:05","maghrib":"7:29","isha":"8:49"},{"location_name":"الحويجة وضواحيها","gregorian_month":6,"gregorian_day":27,"fajr":"3:30","sunrise":"4:57","dhuhr":"12:12","asr":"4:05","maghrib":"7:29","isha":"8:49"},{"location_name":"الحويجة وضواحيها","gregorian_month":6,"gregorian_day":28,"fajr":"3:31","sunrise":"4:57","dhuhr":"12:13","asr":"4:05","maghrib":"7:29","isha":"8:49"},{"location_name":"الحويجة وضواحيها","gregorian_month":6,"gregorian_day":29,"fajr":"3:32","sunrise":"4:57","dhuhr":"12:13","asr":"4:05","maghrib":"7:29","isha":"8:49"},{"location_name":"الحويجة وضواحيها","gregorian_month":6,"gregorian_day":30,"fajr":"3:33","sunrise":"4:57","dhuhr":"12:13","asr":"4:05","maghrib":"7:29","isha":"8:49"},{"location_name":"الحويجة وضواحيها","gregorian_month":7,"gregorian_day":1,"fajr":"3:33","sunrise":"4:58","dhuhr":"12:13","asr":"4:06","maghrib":"7:29","isha":"8:49"},{"location_name":"الحويجة وضواحيها","gregorian_month":7,"gregorian_day":2,"fajr":"3:34","sunrise":"4:58","dhuhr":"12:13","asr":"4:06","maghrib":"7:29","isha":"8:49"},{"location_name":"الحويجة وضواحيها","gregorian_month":7,"gregorian_day":3,"fajr":"3:34","sunrise":"4:59","dhuhr":"12:14","asr":"4:06","maghrib":"7:29","isha":"8:49"},{"location_name":"الحويجة وضواحيها","gregorian_month":7,"gregorian_day":4,"fajr":"3:35","sunrise":"4:59","dhuhr":"12:14","asr":"4:06","maghrib":"7:29","isha":"8:49"},{"location_name":"الحويجة وضواحيها","gregorian_month":7,"gregorian_day":5,"fajr":"3:36","sunrise":"4:59","dhuhr":"12:14","asr":"4:06","maghrib":"7:29","isha":"8:49"},{"location_name":"الحويجة وضواحيها","gregorian_month":7,"gregorian_day":6,"fajr":"3:37","sunrise":"5:00","dhuhr":"12:14","asr":"4:06","maghrib":"7:28","isha":"8:48"},{"location_name":"الحويجة وضواحيها","gregorian_month":7,"gregorian_day":7,"fajr":"3:38","sunrise":"5:00","dhuhr":"12:14","asr":"4:06","maghrib":"7:28","isha":"8:48"},{"location_name":"الحويجة وضواحيها","gregorian_month":7,"gregorian_day":8,"fajr":"3:39","sunrise":"5:00","dhuhr":"12:14","asr":"4:06","maghrib":"7:27","isha":"8:47"},{"location_name":"الحويجة وضواحيها","gregorian_month":7,"gregorian_day":9,"fajr":"3:40","sunrise":"5:01","dhuhr":"12:14","asr":"4:06","maghrib":"7:27","isha":"8:47"},{"location_name":"الحويجة وضواحيها","gregorian_month":7,"gregorian_day":10,"fajr":"3:41","sunrise":"5:01","dhuhr":"12:15","asr":"4:06","maghrib":"7:27","isha":"8:47"},{"location_name":"الحويجة وضواحيها","gregorian_month":7,"gregorian_day":11,"fajr":"3:42","sunrise":"5:02","dhuhr":"12:15","asr":"4:06","maghrib":"7:26","isha":"8:46"},{"location_name":"الحويجة وضواحيها","gregorian_month":7,"gregorian_day":12,"fajr":"3:42","sunrise":"5:03","dhuhr":"12:15","asr":"4:06","maghrib":"7:26","isha":"8:46"},{"location_name":"الحويجة وضواحيها","gregorian_month":7,"gregorian_day":13,"fajr":"3:43","sunrise":"5:04","dhuhr":"12:15","asr":"4:06","maghrib":"7:26","isha":"8:46"},{"location_name":"الحويجة وضواحيها","gregorian_month":7,"gregorian_day":14,"fajr":"3:43","sunrise":"5:04","dhuhr":"12:15","asr":"4:06","maghrib":"7:25","isha":"8:45"},{"location_name":"الحويجة وضواحيها","gregorian_month":7,"gregorian_day":15,"fajr":"3:44","sunrise":"5:05","dhuhr":"12:15","asr":"4:06","maghrib":"7:25","isha":"8:45"},{"location_name":"الحويجة وضواحيها","gregorian_month":7,"gregorian_day":16,"fajr":"3:44","sunrise":"5:06","dhuhr":"12:15","asr":"4:06","maghrib":"7:25","isha":"8:45"},{"location_name":"الحويجة وضواحيها","gregorian_month":7,"gregorian_day":17,"fajr":"3:45","sunrise":"5:06","dhuhr":"12:15","asr":"4:06","maghrib":"7:24","isha":"8:44"},{"location_name":"الحويجة وضواحيها","gregorian_month":7,"gregorian_day":18,"fajr":"3:45","sunrise":"5:07","dhuhr":"12:15","asr":"4:06","maghrib":"7:24","isha":"8:44"},{"location_name":"الحويجة وضواحيها","gregorian_month":7,"gregorian_day":19,"fajr":"3:46","sunrise":"5:07","dhuhr":"12:15","asr":"4:06","maghrib":"7:23","isha":"8:43"},{"location_name":"الحويجة وضواحيها","gregorian_month":7,"gregorian_day":20,"fajr":"3:47","sunrise":"5:08","dhuhr":"12:15","asr":"4:06","maghrib":"7:23","isha":"8:43"},{"location_name":"الحويجة وضواحيها","gregorian_month":7,"gregorian_day":21,"fajr":"3:47","sunrise":"5:09","dhuhr":"12:15","asr":"4:05","maghrib":"7:22","isha":"8:42"},{"location_name":"الحويجة وضواحيها","gregorian_month":7,"gregorian_day":22,"fajr":"3:48","sunrise":"5:10","dhuhr":"12:16","asr":"4:05","maghrib":"7:22","isha":"8:42"},{"location_name":"الحويجة وضواحيها","gregorian_month":7,"gregorian_day":23,"fajr":"3:48","sunrise":"5:11","dhuhr":"12:16","asr":"4:05","maghrib":"7:21","isha":"8:41"},{"location_name":"الحويجة وضواحيها","gregorian_month":7,"gregorian_day":24,"fajr":"3:49","sunrise":"5:12","dhuhr":"12:16","asr":"4:05","maghrib":"7:20","isha":"8:40"},{"location_name":"الحويجة وضواحيها","gregorian_month":7,"gregorian_day":25,"fajr":"3:50","sunrise":"5:12","dhuhr":"12:16","asr":"4:05","maghrib":"7:18","isha":"8:38"},{"location_name":"الحويجة وضواحيها","gregorian_month":7,"gregorian_day":26,"fajr":"3:50","sunrise":"5:13","dhuhr":"12:16","asr":"4:05","maghrib":"7:17","isha":"8:37"},{"location_name":"الحويجة وضواحيها","gregorian_month":7,"gregorian_day":27,"fajr":"3:51","sunrise":"5:14","dhuhr":"12:16","asr":"4:05","maghrib":"7:16","isha":"8:36"},{"location_name":"الحويجة وضواحيها","gregorian_month":7,"gregorian_day":28,"fajr":"3:51","sunrise":"5:14","dhuhr":"12:16","asr":"4:05","maghrib":"7:16","isha":"8:36"},{"location_name":"الحويجة وضواحيها","gregorian_month":7,"gregorian_day":29,"fajr":"3:52","sunrise":"5:15","dhuhr":"12:16","asr":"4:04","maghrib":"7:15","isha":"8:35"},{"location_name":"الحويجة وضواحيها","gregorian_month":7,"gregorian_day":30,"fajr":"3:52","sunrise":"5:15","dhuhr":"12:16","asr":"4:04","maghrib":"7:14","isha":"8:34"},{"location_name":"الحويجة وضواحيها","gregorian_month":7,"gregorian_day":31,"fajr":"3:53","sunrise":"5:16","dhuhr":"12:16","asr":"4:04","maghrib":"7:13","isha":"8:33"},{"location_name":"الحويجة وضواحيها","gregorian_month":8,"gregorian_day":1,"fajr":"3:53","sunrise":"5:16","dhuhr":"12:15","asr":"4:04","maghrib":"7:13","isha":"8:33"},{"location_name":"الحويجة وضواحيها","gregorian_month":8,"gregorian_day":2,"fajr":"3:54","sunrise":"5:17","dhuhr":"12:15","asr":"4:04","maghrib":"7:12","isha":"8:32"},{"location_name":"الحويجة وضواحيها","gregorian_month":8,"gregorian_day":3,"fajr":"3:55","sunrise":"5:18","dhuhr":"12:15","asr":"4:04","maghrib":"7:11","isha":"8:31"},{"location_name":"الحويجة وضواحيها","gregorian_month":8,"gregorian_day":4,"fajr":"3:56","sunrise":"5:18","dhuhr":"12:15","asr":"4:04","maghrib":"7:10","isha":"8:30"},{"location_name":"الحويجة وضواحيها","gregorian_month":8,"gregorian_day":5,"fajr":"3:57","sunrise":"5:19","dhuhr":"12:15","asr":"4:03","maghrib":"7:09","isha":"8:29"},{"location_name":"الحويجة وضواحيها","gregorian_month":8,"gregorian_day":6,"fajr":"3:58","sunrise":"5:20","dhuhr":"12:15","asr":"4:03","maghrib":"7:07","isha":"8:27"},{"location_name":"الحويجة وضواحيها","gregorian_month":8,"gregorian_day":7,"fajr":"3:59","sunrise":"5:21","dhuhr":"12:15","asr":"4:03","maghrib":"7:07","isha":"8:27"},{"location_name":"الحويجة وضواحيها","gregorian_month":8,"gregorian_day":8,"fajr":"4:00","sunrise":"5:22","dhuhr":"12:15","asr":"4:03","maghrib":"7:06","isha":"8:26"},{"location_name":"الحويجة وضواحيها","gregorian_month":8,"gregorian_day":9,"fajr":"4:01","sunrise":"5:23","dhuhr":"12:15","asr":"4:03","maghrib":"7:05","isha":"8:25"},{"location_name":"الحويجة وضواحيها","gregorian_month":8,"gregorian_day":10,"fajr":"4:02","sunrise":"5:24","dhuhr":"12:15","asr":"4:02","maghrib":"7:04","isha":"8:24"},{"location_name":"الحويجة وضواحيها","gregorian_month":8,"gregorian_day":11,"fajr":"4:03","sunrise":"5:25","dhuhr":"12:15","asr":"4:02","maghrib":"7:02","isha":"8:23"},{"location_name":"الحويجة وضواحيها","gregorian_month":8,"gregorian_day":12,"fajr":"4:04","sunrise":"5:25","dhuhr":"12:14","asr":"4:01","maghrib":"7:01","isha":"8:21"},{"location_name":"الحويجة وضواحيها","gregorian_month":8,"gregorian_day":13,"fajr":"4:04","sunrise":"5:26","dhuhr":"12:14","asr":"4:00","maghrib":"7:00","isha":"8:20"},{"location_name":"الحويجة وضواحيها","gregorian_month":8,"gregorian_day":14,"fajr":"4:05","sunrise":"5:27","dhuhr":"12:14","asr":"4:00","maghrib":"6:59","isha":"8:19"},{"location_name":"الحويجة وضواحيها","gregorian_month":8,"gregorian_day":15,"fajr":"4:06","sunrise":"5:28","dhuhr":"12:14","asr":"4:00","maghrib":"6:58","isha":"8:18"},{"location_name":"الحويجة وضواحيها","gregorian_month":8,"gregorian_day":16,"fajr":"4:06","sunrise":"5:29","dhuhr":"12:14","asr":"3:59","maghrib":"6:57","isha":"8:17"},{"location_name":"الحويجة وضواحيها","gregorian_month":8,"gregorian_day":17,"fajr":"4:07","sunrise":"5:30","dhuhr":"12:14","asr":"3:59","maghrib":"6:56","isha":"8:16"},{"location_name":"الحويجة وضواحيها","gregorian_month":8,"gregorian_day":18,"fajr":"4:07","sunrise":"5:30","dhuhr":"12:13","asr":"3:59","maghrib":"6:55","isha":"8:15"},{"location_name":"الحويجة وضواحيها","gregorian_month":8,"gregorian_day":19,"fajr":"4:08","sunrise":"5:31","dhuhr":"12:13","asr":"3:57","maghrib":"6:53","isha":"8:13"},{"location_name":"الحويجة وضواحيها","gregorian_month":8,"gregorian_day":20,"fajr":"4:09","sunrise":"5:32","dhuhr":"12:13","asr":"3:56","maghrib":"6:52","isha":"8:12"},{"location_name":"الحويجة وضواحيها","gregorian_month":8,"gregorian_day":21,"fajr":"4:10","sunrise":"5:33","dhuhr":"12:13","asr":"3:55","maghrib":"6:49","isha":"8:09"},{"location_name":"الحويجة وضواحيها","gregorian_month":8,"gregorian_day":22,"fajr":"4:11","sunrise":"5:34","dhuhr":"12:13","asr":"3:54","maghrib":"6:48","isha":"8:08"},{"location_name":"الحويجة وضواحيها","gregorian_month":8,"gregorian_day":23,"fajr":"4:11","sunrise":"5:34","dhuhr":"12:12","asr":"3:54","maghrib":"6:47","isha":"8:07"},{"location_name":"الحويجة وضواحيها","gregorian_month":8,"gregorian_day":24,"fajr":"4:12","sunrise":"5:35","dhuhr":"12:12","asr":"3:54","maghrib":"6:46","isha":"8:06"},{"location_name":"الحويجة وضواحيها","gregorian_month":8,"gregorian_day":25,"fajr":"4:13","sunrise":"5:36","dhuhr":"12:12","asr":"3:53","maghrib":"6:45","isha":"8:05"},{"location_name":"الحويجة وضواحيها","gregorian_month":8,"gregorian_day":26,"fajr":"4:14","sunrise":"5:37","dhuhr":"12:12","asr":"3:52","maghrib":"6:43","isha":"8:03"},{"location_name":"الحويجة وضواحيها","gregorian_month":8,"gregorian_day":27,"fajr":"4:14","sunrise":"5:38","dhuhr":"12:11","asr":"3:51","maghrib":"6:41","isha":"8:01"},{"location_name":"الحويجة وضواحيها","gregorian_month":8,"gregorian_day":28,"fajr":"4:15","sunrise":"5:38","dhuhr":"12:11","asr":"3:51","maghrib":"6:40","isha":"8:00"},{"location_name":"الحويجة وضواحيها","gregorian_month":8,"gregorian_day":29,"fajr":"4:16","sunrise":"5:39","dhuhr":"12:11","asr":"3:50","maghrib":"6:39","isha":"7:59"},{"location_name":"الحويجة وضواحيها","gregorian_month":8,"gregorian_day":30,"fajr":"4:17","sunrise":"5:39","dhuhr":"12:10","asr":"3:50","maghrib":"6:37","isha":"7:57"},{"location_name":"الحويجة وضواحيها","gregorian_month":8,"gregorian_day":31,"fajr":"4:18","sunrise":"5:40","dhuhr":"12:10","asr":"3:49","maghrib":"6:36","isha":"7:56"},{"location_name":"الحويجة وضواحيها","gregorian_month":9,"gregorian_day":1,"fajr":"4:19","sunrise":"5:41","dhuhr":"12:10","asr":"3:48","maghrib":"6:35","isha":"7:55"},{"location_name":"الحويجة وضواحيها","gregorian_month":9,"gregorian_day":2,"fajr":"4:19","sunrise":"5:42","dhuhr":"12:10","asr":"3:48","maghrib":"6:34","isha":"7:54"},{"location_name":"الحويجة وضواحيها","gregorian_month":9,"gregorian_day":3,"fajr":"4:20","sunrise":"5:43","dhuhr":"12:09","asr":"3:47","maghrib":"6:32","isha":"7:52"},{"location_name":"الحويجة وضواحيها","gregorian_month":9,"gregorian_day":4,"fajr":"4:21","sunrise":"5:43","dhuhr":"12:09","asr":"3:46","maghrib":"6:31","isha":"7:51"},{"location_name":"الحويجة وضواحيها","gregorian_month":9,"gregorian_day":5,"fajr":"4:22","sunrise":"5:44","dhuhr":"12:09","asr":"3:46","maghrib":"6:30","isha":"7:50"},{"location_name":"الحويجة وضواحيها","gregorian_month":9,"gregorian_day":6,"fajr":"4:23","sunrise":"5:45","dhuhr":"12:08","asr":"3:45","maghrib":"6:28","isha":"7:48"},{"location_name":"الحويجة وضواحيها","gregorian_month":9,"gregorian_day":7,"fajr":"4:24","sunrise":"5:46","dhuhr":"12:08","asr":"3:44","maghrib":"6:27","isha":"7:47"},{"location_name":"الحويجة وضواحيها","gregorian_month":9,"gregorian_day":8,"fajr":"4:25","sunrise":"5:47","dhuhr":"12:08","asr":"3:44","maghrib":"6:26","isha":"7:46"},{"location_name":"الحويجة وضواحيها","gregorian_month":9,"gregorian_day":9,"fajr":"4:26","sunrise":"5:47","dhuhr":"12:07","asr":"3:43","maghrib":"6:24","isha":"7:44"},{"location_name":"الحويجة وضواحيها","gregorian_month":9,"gregorian_day":10,"fajr":"4:26","sunrise":"5:48","dhuhr":"12:07","asr":"3:42","maghrib":"6:23","isha":"7:43"},{"location_name":"الحويجة وضواحيها","gregorian_month":9,"gregorian_day":11,"fajr":"4:27","sunrise":"5:49","dhuhr":"12:07","asr":"3:40","maghrib":"6:21","isha":"7:41"},{"location_name":"الحويجة وضواحيها","gregorian_month":9,"gregorian_day":12,"fajr":"4:28","sunrise":"5:50","dhuhr":"12:06","asr":"3:39","maghrib":"6:19","isha":"7:39"},{"location_name":"الحويجة وضواحيها","gregorian_month":9,"gregorian_day":13,"fajr":"4:29","sunrise":"5:50","dhuhr":"12:06","asr":"3:39","maghrib":"6:18","isha":"7:38"},{"location_name":"الحويجة وضواحيها","gregorian_month":9,"gregorian_day":14,"fajr":"4:29","sunrise":"5:51","dhuhr":"12:05","asr":"3:38","maghrib":"6:17","isha":"7:37"},{"location_name":"الحويجة وضواحيها","gregorian_month":9,"gregorian_day":15,"fajr":"4:30","sunrise":"5:52","dhuhr":"12:05","asr":"3:37","maghrib":"6:15","isha":"7:35"},{"location_name":"الحويجة وضواحيها","gregorian_month":9,"gregorian_day":16,"fajr":"4:30","sunrise":"5:53","dhuhr":"12:05","asr":"3:36","maghrib":"6:14","isha":"7:34"},{"location_name":"الحويجة وضواحيها","gregorian_month":9,"gregorian_day":17,"fajr":"4:31","sunrise":"5:54","dhuhr":"12:04","asr":"3:35","maghrib":"6:12","isha":"7:32"},{"location_name":"الحويجة وضواحيها","gregorian_month":9,"gregorian_day":18,"fajr":"4:32","sunrise":"5:55","dhuhr":"12:04","asr":"3:35","maghrib":"6:11","isha":"7:31"},{"location_name":"الحويجة وضواحيها","gregorian_month":9,"gregorian_day":19,"fajr":"4:33","sunrise":"5:55","dhuhr":"12:04","asr":"3:34","maghrib":"6:10","isha":"7:30"},{"location_name":"الحويجة وضواحيها","gregorian_month":9,"gregorian_day":20,"fajr":"4:34","sunrise":"5:55","dhuhr":"12:03","asr":"3:33","maghrib":"6:07","isha":"7:27"},{"location_name":"الحويجة وضواحيها","gregorian_month":9,"gregorian_day":21,"fajr":"4:35","sunrise":"5:56","dhuhr":"12:03","asr":"3:31","maghrib":"6:06","isha":"7:26"},{"location_name":"الحويجة وضواحيها","gregorian_month":9,"gregorian_day":22,"fajr":"4:36","sunrise":"5:56","dhuhr":"12:03","asr":"3:30","maghrib":"6:05","isha":"7:25"},{"location_name":"الحويجة وضواحيها","gregorian_month":9,"gregorian_day":23,"fajr":"4:37","sunrise":"5:57","dhuhr":"12:02","asr":"3:29","maghrib":"6:02","isha":"7:22"},{"location_name":"الحويجة وضواحيها","gregorian_month":9,"gregorian_day":24,"fajr":"4:38","sunrise":"5:58","dhuhr":"12:02","asr":"3:28","maghrib":"6:01","isha":"7:21"},{"location_name":"الحويجة وضواحيها","gregorian_month":9,"gregorian_day":25,"fajr":"4:39","sunrise":"5:59","dhuhr":"12:01","asr":"3:27","maghrib":"6:00","isha":"7:20"},{"location_name":"الحويجة وضواحيها","gregorian_month":9,"gregorian_day":26,"fajr":"4:40","sunrise":"6:00","dhuhr":"12:01","asr":"3:27","maghrib":"5:59","isha":"7:19"},{"location_name":"الحويجة وضواحيها","gregorian_month":9,"gregorian_day":27,"fajr":"4:41","sunrise":"6:01","dhuhr":"12:01","asr":"3:26","maghrib":"5:58","isha":"7:18"},{"location_name":"الحويجة وضواحيها","gregorian_month":9,"gregorian_day":28,"fajr":"4:42","sunrise":"6:01","dhuhr":"12:00","asr":"3:25","maghrib":"5:57","isha":"7:17"},{"location_name":"الحويجة وضواحيها","gregorian_month":9,"gregorian_day":29,"fajr":"4:43","sunrise":"6:02","dhuhr":"12:00","asr":"3:24","maghrib":"5:55","isha":"7:15"},{"location_name":"الحويجة وضواحيها","gregorian_month":9,"gregorian_day":30,"fajr":"4:44","sunrise":"6:02","dhuhr":"12:00","asr":"3:23","maghrib":"5:54","isha":"7:14"},{"location_name":"الحويجة وضواحيها","gregorian_month":10,"gregorian_day":1,"fajr":"4:44","sunrise":"6:04","dhuhr":"11:59","asr":"3:22","maghrib":"5:53","isha":"7:13"},{"location_name":"الحويجة وضواحيها","gregorian_month":10,"gregorian_day":2,"fajr":"4:44","sunrise":"6:05","dhuhr":"11:59","asr":"3:21","maghrib":"5:51","isha":"7:11"},{"location_name":"الحويجة وضواحيها","gregorian_month":10,"gregorian_day":3,"fajr":"4:45","sunrise":"6:05","dhuhr":"11:59","asr":"3:20","maghrib":"5:50","isha":"7:10"},{"location_name":"الحويجة وضواحيها","gregorian_month":10,"gregorian_day":4,"fajr":"4:46","sunrise":"6:06","dhuhr":"11:58","asr":"3:19","maghrib":"5:49","isha":"7:09"},{"location_name":"الحويجة وضواحيها","gregorian_month":10,"gregorian_day":5,"fajr":"4:47","sunrise":"6:07","dhuhr":"11:58","asr":"3:18","maghrib":"5:47","isha":"7:07"},{"location_name":"الحويجة وضواحيها","gregorian_month":10,"gregorian_day":6,"fajr":"4:48","sunrise":"6:07","dhuhr":"11:58","asr":"3:17","maghrib":"5:46","isha":"7:06"},{"location_name":"الحويجة وضواحيها","gregorian_month":10,"gregorian_day":7,"fajr":"4:49","sunrise":"6:07","dhuhr":"11:57","asr":"3:16","maghrib":"5:45","isha":"7:05"},{"location_name":"الحويجة وضواحيها","gregorian_month":10,"gregorian_day":8,"fajr":"4:49","sunrise":"6:08","dhuhr":"11:57","asr":"3:15","maghrib":"5:43","isha":"7:03"},{"location_name":"الحويجة وضواحيها","gregorian_month":10,"gregorian_day":9,"fajr":"4:50","sunrise":"6:08","dhuhr":"11:57","asr":"3:14","maghrib":"5:42","isha":"7:02"},{"location_name":"الحويجة وضواحيها","gregorian_month":10,"gregorian_day":10,"fajr":"4:50","sunrise":"6:09","dhuhr":"11:56","asr":"3:13","maghrib":"5:40","isha":"7:00"},{"location_name":"الحويجة وضواحيها","gregorian_month":10,"gregorian_day":11,"fajr":"4:51","sunrise":"6:10","dhuhr":"11:56","asr":"3:13","maghrib":"5:40","isha":"7:00"},{"location_name":"الحويجة وضواحيها","gregorian_month":10,"gregorian_day":12,"fajr":"4:52","sunrise":"6:11","dhuhr":"11:56","asr":"3:12","maghrib":"5:38","isha":"6:58"},{"location_name":"الحويجة وضواحيها","gregorian_month":10,"gregorian_day":13,"fajr":"4:53","sunrise":"6:12","dhuhr":"11:56","asr":"3:11","maghrib":"5:37","isha":"6:57"},{"location_name":"الحويجة وضواحيها","gregorian_month":10,"gregorian_day":14,"fajr":"4:54","sunrise":"6:12","dhuhr":"11:55","asr":"3:10","maghrib":"5:36","isha":"6:56"},{"location_name":"الحويجة وضواحيها","gregorian_month":10,"gregorian_day":15,"fajr":"4:55","sunrise":"6:13","dhuhr":"11:55","asr":"3:09","maghrib":"5:35","isha":"6:55"},{"location_name":"الحويجة وضواحيها","gregorian_month":10,"gregorian_day":16,"fajr":"4:56","sunrise":"6:14","dhuhr":"11:55","asr":"3:08","maghrib":"5:34","isha":"6:54"},{"location_name":"الحويجة وضواحيها","gregorian_month":10,"gregorian_day":17,"fajr":"4:57","sunrise":"6:15","dhuhr":"11:55","asr":"3:07","maghrib":"5:32","isha":"6:53"},{"location_name":"الحويجة وضواحيها","gregorian_month":10,"gregorian_day":18,"fajr":"4:58","sunrise":"6:16","dhuhr":"11:54","asr":"3:06","maghrib":"5:31","isha":"6:51"},{"location_name":"الحويجة وضواحيها","gregorian_month":10,"gregorian_day":19,"fajr":"4:59","sunrise":"6:17","dhuhr":"11:54","asr":"3:05","maghrib":"5:30","isha":"6:50"},{"location_name":"الحويجة وضواحيها","gregorian_month":10,"gregorian_day":20,"fajr":"5:00","sunrise":"6:17","dhuhr":"11:54","asr":"3:04","maghrib":"5:29","isha":"6:49"},{"location_name":"الحويجة وضواحيها","gregorian_month":10,"gregorian_day":21,"fajr":"5:01","sunrise":"6:18","dhuhr":"11:54","asr":"3:04","maghrib":"5:28","isha":"6:48"},{"location_name":"الحويجة وضواحيها","gregorian_month":10,"gregorian_day":22,"fajr":"5:02","sunrise":"6:19","dhuhr":"11:54","asr":"3:03","maghrib":"5:27","isha":"6:47"},{"location_name":"الحويجة وضواحيها","gregorian_month":10,"gregorian_day":23,"fajr":"5:03","sunrise":"6:20","dhuhr":"11:54","asr":"3:02","maghrib":"5:26","isha":"6:46"},{"location_name":"الحويجة وضواحيها","gregorian_month":10,"gregorian_day":24,"fajr":"5:04","sunrise":"6:21","dhuhr":"11:53","asr":"3:01","maghrib":"5:25","isha":"6:45"},{"location_name":"الحويجة وضواحيها","gregorian_month":10,"gregorian_day":25,"fajr":"5:05","sunrise":"6:22","dhuhr":"11:53","asr":"3:00","maghrib":"5:23","isha":"6:43"},{"location_name":"الحويجة وضواحيها","gregorian_month":10,"gregorian_day":26,"fajr":"5:06","sunrise":"6:23","dhuhr":"11:53","asr":"2:59","maghrib":"5:22","isha":"6:42"},{"location_name":"الحويجة وضواحيها","gregorian_month":10,"gregorian_day":27,"fajr":"5:07","sunrise":"6:24","dhuhr":"11:53","asr":"2:58","maghrib":"5:20","isha":"6:40"},{"location_name":"الحويجة وضواحيها","gregorian_month":10,"gregorian_day":28,"fajr":"5:08","sunrise":"6:24","dhuhr":"11:53","asr":"2:57","maghrib":"5:19","isha":"6:39"},{"location_name":"الحويجة وضواحيها","gregorian_month":10,"gregorian_day":29,"fajr":"5:09","sunrise":"6:25","dhuhr":"11:53","asr":"2:56","maghrib":"5:18","isha":"6:38"},{"location_name":"الحويجة وضواحيها","gregorian_month":10,"gregorian_day":30,"fajr":"5:10","sunrise":"6:25","dhuhr":"11:53","asr":"2:54","maghrib":"5:18","isha":"6:38"},{"location_name":"الحويجة وضواحيها","gregorian_month":10,"gregorian_day":31,"fajr":"5:11","sunrise":"6:26","dhuhr":"11:53","asr":"2:54","maghrib":"5:17","isha":"6:37"},{"location_name":"الحويجة وضواحيها","gregorian_month":11,"gregorian_day":1,"fajr":"5:11","sunrise":"6:27","dhuhr":"11:53","asr":"2:53","maghrib":"5:16","isha":"6:36"},{"location_name":"الحويجة وضواحيها","gregorian_month":11,"gregorian_day":2,"fajr":"5:12","sunrise":"6:28","dhuhr":"11:53","asr":"2:52","maghrib":"5:15","isha":"6:35"},{"location_name":"الحويجة وضواحيها","gregorian_month":11,"gregorian_day":3,"fajr":"5:12","sunrise":"6:29","dhuhr":"11:53","asr":"2:52","maghrib":"5:14","isha":"6:34"},{"location_name":"الحويجة وضواحيها","gregorian_month":11,"gregorian_day":4,"fajr":"5:13","sunrise":"6:30","dhuhr":"11:53","asr":"2:51","maghrib":"5:12","isha":"6:32"},{"location_name":"الحويجة وضواحيها","gregorian_month":11,"gregorian_day":5,"fajr":"5:14","sunrise":"6:31","dhuhr":"11:53","asr":"2:50","maghrib":"5:11","isha":"6:31"},{"location_name":"الحويجة وضواحيها","gregorian_month":11,"gregorian_day":6,"fajr":"5:15","sunrise":"6:31","dhuhr":"11:53","asr":"2:50","maghrib":"5:10","isha":"6:30"},{"location_name":"الحويجة وضواحيها","gregorian_month":11,"gregorian_day":7,"fajr":"5:16","sunrise":"6:32","dhuhr":"11:53","asr":"2:49","maghrib":"5:10","isha":"6:30"},{"location_name":"الحويجة وضواحيها","gregorian_month":11,"gregorian_day":8,"fajr":"5:17","sunrise":"6:33","dhuhr":"11:53","asr":"2:49","maghrib":"5:09","isha":"6:29"},{"location_name":"الحويجة وضواحيها","gregorian_month":11,"gregorian_day":9,"fajr":"5:17","sunrise":"6:34","dhuhr":"11:53","asr":"2:48","maghrib":"5:08","isha":"6:28"},{"location_name":"الحويجة وضواحيها","gregorian_month":11,"gregorian_day":10,"fajr":"5:18","sunrise":"6:34","dhuhr":"11:53","asr":"2:47","maghrib":"5:07","isha":"6:27"},{"location_name":"الحويجة وضواحيها","gregorian_month":11,"gregorian_day":11,"fajr":"5:19","sunrise":"6:35","dhuhr":"11:53","asr":"2:46","maghrib":"5:06","isha":"6:26"},{"location_name":"الحويجة وضواحيها","gregorian_month":11,"gregorian_day":12,"fajr":"5:20","sunrise":"6:37","dhuhr":"11:53","asr":"2:45","maghrib":"5:05","isha":"6:25"},{"location_name":"الحويجة وضواحيها","gregorian_month":11,"gregorian_day":13,"fajr":"5:21","sunrise":"6:37","dhuhr":"11:54","asr":"2:45","maghrib":"5:04","isha":"6:24"},{"location_name":"الحويجة وضواحيها","gregorian_month":11,"gregorian_day":14,"fajr":"5:22","sunrise":"6:39","dhuhr":"11:54","asr":"2:44","maghrib":"5:03","isha":"6:23"},{"location_name":"الحويجة وضواحيها","gregorian_month":11,"gregorian_day":15,"fajr":"5:23","sunrise":"6:40","dhuhr":"11:54","asr":"2:44","maghrib":"5:03","isha":"6:23"},{"location_name":"الحويجة وضواحيها","gregorian_month":11,"gregorian_day":16,"fajr":"5:24","sunrise":"6:41","dhuhr":"11:54","asr":"2:44","maghrib":"5:03","isha":"6:23"},{"location_name":"الحويجة وضواحيها","gregorian_month":11,"gregorian_day":17,"fajr":"5:25","sunrise":"6:42","dhuhr":"11:54","asr":"2:43","maghrib":"5:02","isha":"6:22"},{"location_name":"الحويجة وضواحيها","gregorian_month":11,"gregorian_day":18,"fajr":"5:25","sunrise":"6:43","dhuhr":"11:54","asr":"2:43","maghrib":"5:02","isha":"6:22"},{"location_name":"الحويجة وضواحيها","gregorian_month":11,"gregorian_day":19,"fajr":"5:26","sunrise":"6:44","dhuhr":"11:55","asr":"2:43","maghrib":"5:01","isha":"6:21"},{"location_name":"الحويجة وضواحيها","gregorian_month":11,"gregorian_day":20,"fajr":"5:26","sunrise":"6:45","dhuhr":"11:55","asr":"2:41","maghrib":"5:00","isha":"6:20"},{"location_name":"الحويجة وضواحيها","gregorian_month":11,"gregorian_day":21,"fajr":"5:27","sunrise":"6:46","dhuhr":"11:55","asr":"2:41","maghrib":"4:59","isha":"6:19"},{"location_name":"الحويجة وضواحيها","gregorian_month":11,"gregorian_day":22,"fajr":"5:28","sunrise":"6:47","dhuhr":"11:55","asr":"2:40","maghrib":"4:59","isha":"6:19"},{"location_name":"الحويجة وضواحيها","gregorian_month":11,"gregorian_day":23,"fajr":"5:29","sunrise":"6:48","dhuhr":"11:56","asr":"2:40","maghrib":"4:59","isha":"6:19"},{"location_name":"الحويجة وضواحيها","gregorian_month":11,"gregorian_day":24,"fajr":"5:30","sunrise":"6:49","dhuhr":"11:56","asr":"2:40","maghrib":"4:58","isha":"6:18"},{"location_name":"الحويجة وضواحيها","gregorian_month":11,"gregorian_day":25,"fajr":"5:31","sunrise":"6:50","dhuhr":"11:56","asr":"2:40","maghrib":"4:58","isha":"6:18"},{"location_name":"الحويجة وضواحيها","gregorian_month":11,"gregorian_day":26,"fajr":"5:32","sunrise":"6:51","dhuhr":"11:57","asr":"2:39","maghrib":"4:57","isha":"6:17"},{"location_name":"الحويجة وضواحيها","gregorian_month":11,"gregorian_day":27,"fajr":"5:33","sunrise":"6:52","dhuhr":"11:57","asr":"2:39","maghrib":"4:57","isha":"6:17"},{"location_name":"الحويجة وضواحيها","gregorian_month":11,"gregorian_day":28,"fajr":"5:34","sunrise":"6:53","dhuhr":"11:58","asr":"2:39","maghrib":"4:57","isha":"6:17"},{"location_name":"الحويجة وضواحيها","gregorian_month":11,"gregorian_day":29,"fajr":"5:35","sunrise":"6:54","dhuhr":"11:58","asr":"2:39","maghrib":"4:56","isha":"6:16"},{"location_name":"الحويجة وضواحيها","gregorian_month":11,"gregorian_day":30,"fajr":"5:36","sunrise":"6:55","dhuhr":"11:58","asr":"2:39","maghrib":"4:56","isha":"6:16"},{"location_name":"الحويجة وضواحيها","gregorian_month":12,"gregorian_day":1,"fajr":"5:36","sunrise":"6:56","dhuhr":"11:59","asr":"2:39","maghrib":"4:56","isha":"6:16"},{"location_name":"الحويجة وضواحيها","gregorian_month":12,"gregorian_day":2,"fajr":"5:37","sunrise":"6:56","dhuhr":"11:59","asr":"2:39","maghrib":"4:56","isha":"6:16"},{"location_name":"الحويجة وضواحيها","gregorian_month":12,"gregorian_day":3,"fajr":"5:38","sunrise":"6:57","dhuhr":"11:59","asr":"2:39","maghrib":"4:56","isha":"6:16"},{"location_name":"الحويجة وضواحيها","gregorian_month":12,"gregorian_day":4,"fajr":"5:38","sunrise":"6:58","dhuhr":"12:00","asr":"2:39","maghrib":"4:56","isha":"6:16"},{"location_name":"الحويجة وضواحيها","gregorian_month":12,"gregorian_day":5,"fajr":"5:39","sunrise":"6:59","dhuhr":"12:00","asr":"2:39","maghrib":"4:56","isha":"6:16"},{"location_name":"الحويجة وضواحيها","gregorian_month":12,"gregorian_day":6,"fajr":"5:39","sunrise":"7:00","dhuhr":"12:01","asr":"2:39","maghrib":"4:56","isha":"6:16"},{"location_name":"الحويجة وضواحيها","gregorian_month":12,"gregorian_day":7,"fajr":"5:40","sunrise":"7:01","dhuhr":"12:01","asr":"2:39","maghrib":"4:56","isha":"6:16"},{"location_name":"الحويجة وضواحيها","gregorian_month":12,"gregorian_day":8,"fajr":"5:41","sunrise":"7:01","dhuhr":"12:02","asr":"2:39","maghrib":"4:56","isha":"6:16"},{"location_name":"الحويجة وضواحيها","gregorian_month":12,"gregorian_day":9,"fajr":"5:42","sunrise":"7:02","dhuhr":"12:02","asr":"2:39","maghrib":"4:56","isha":"6:16"},{"location_name":"الحويجة وضواحيها","gregorian_month":12,"gregorian_day":10,"fajr":"5:42","sunrise":"7:03","dhuhr":"12:02","asr":"2:39","maghrib":"4:57","isha":"6:17"},{"location_name":"الحويجة وضواحيها","gregorian_month":12,"gregorian_day":11,"fajr":"5:43","sunrise":"7:04","dhuhr":"12:03","asr":"2:40","maghrib":"4:57","isha":"6:17"},{"location_name":"الحويجة وضواحيها","gregorian_month":12,"gregorian_day":12,"fajr":"5:44","sunrise":"7:04","dhuhr":"12:03","asr":"2:40","maghrib":"4:57","isha":"6:17"},{"location_name":"الحويجة وضواحيها","gregorian_month":12,"gregorian_day":13,"fajr":"5:45","sunrise":"7:05","dhuhr":"12:04","asr":"2:40","maghrib":"4:57","isha":"6:17"},{"location_name":"الحويجة وضواحيها","gregorian_month":12,"gregorian_day":14,"fajr":"5:46","sunrise":"7:06","dhuhr":"12:04","asr":"2:40","maghrib":"4:57","isha":"6:17"},{"location_name":"الحويجة وضواحيها","gregorian_month":12,"gregorian_day":15,"fajr":"5:47","sunrise":"7:06","dhuhr":"12:05","asr":"2:41","maghrib":"4:58","isha":"6:18"},{"location_name":"الحويجة وضواحيها","gregorian_month":12,"gregorian_day":16,"fajr":"5:47","sunrise":"7:07","dhuhr":"12:05","asr":"2:42","maghrib":"4:58","isha":"6:18"},{"location_name":"الحويجة وضواحيها","gregorian_month":12,"gregorian_day":17,"fajr":"5:48","sunrise":"7:08","dhuhr":"12:06","asr":"2:42","maghrib":"4:58","isha":"6:18"},{"location_name":"الحويجة وضواحيها","gregorian_month":12,"gregorian_day":18,"fajr":"5:49","sunrise":"7:08","dhuhr":"12:06","asr":"2:42","maghrib":"4:59","isha":"6:19"},{"location_name":"الحويجة وضواحيها","gregorian_month":12,"gregorian_day":19,"fajr":"5:49","sunrise":"7:09","dhuhr":"12:07","asr":"2:43","maghrib":"4:59","isha":"6:19"},{"location_name":"الحويجة وضواحيها","gregorian_month":12,"gregorian_day":20,"fajr":"5:50","sunrise":"7:09","dhuhr":"12:07","asr":"2:43","maghrib":"5:00","isha":"6:20"},{"location_name":"الحويجة وضواحيها","gregorian_month":12,"gregorian_day":21,"fajr":"5:51","sunrise":"7:10","dhuhr":"12:08","asr":"2:44","maghrib":"5:00","isha":"6:20"},{"location_name":"الحويجة وضواحيها","gregorian_month":12,"gregorian_day":22,"fajr":"5:52","sunrise":"7:10","dhuhr":"12:08","asr":"2:44","maghrib":"5:01","isha":"6:21"},{"location_name":"الحويجة وضواحيها","gregorian_month":12,"gregorian_day":23,"fajr":"5:52","sunrise":"7:11","dhuhr":"12:09","asr":"2:45","maghrib":"5:01","isha":"6:21"},{"location_name":"الحويجة وضواحيها","gregorian_month":12,"gregorian_day":24,"fajr":"5:53","sunrise":"7:11","dhuhr":"12:09","asr":"2:45","maghrib":"5:02","isha":"6:22"},{"location_name":"الحويجة وضواحيها","gregorian_month":12,"gregorian_day":25,"fajr":"5:53","sunrise":"7:12","dhuhr":"12:10","asr":"2:46","maghrib":"5:02","isha":"6:22"},{"location_name":"الحويجة وضواحيها","gregorian_month":12,"gregorian_day":26,"fajr":"5:54","sunrise":"7:12","dhuhr":"12:10","asr":"2:46","maghrib":"5:03","isha":"6:23"},{"location_name":"الحويجة وضواحيها","gregorian_month":12,"gregorian_day":27,"fajr":"5:55","sunrise":"7:13","dhuhr":"12:10","asr":"2:46","maghrib":"5:04","isha":"6:24"},{"location_name":"الحويجة وضواحيها","gregorian_month":12,"gregorian_day":28,"fajr":"5:56","sunrise":"7:13","dhuhr":"12:11","asr":"2:47","maghrib":"5:04","isha":"6:24"},{"location_name":"الحويجة وضواحيها","gregorian_month":12,"gregorian_day":29,"fajr":"5:57","sunrise":"7:13","dhuhr":"12:11","asr":"2:48","maghrib":"5:05","isha":"6:25"},{"location_name":"الحويجة وضواحيها","gregorian_month":12,"gregorian_day":30,"fajr":"5:58","sunrise":"7:14","dhuhr":"12:12","asr":"2:48","maghrib":"5:06","isha":"6:26"},{"location_name":"الحويجة وضواحيها","gregorian_month":12,"gregorian_day":31,"fajr":"5:58","sunrise":"7:14","dhuhr":"12:12","asr":"2:49","maghrib":"5:06","isha":"6:26"}];
// Replace only the superseded Fajr database value in saved caches; user offsets stay separate.
window.AoqatPrayerPhotoCorrections = [{"month":10,"day":1,"field":"fajr","before":"4:43","after":"4:44","source":"156371.jpg"}];
(function(){
  const corrections=window.AoqatPrayerPhotoCorrections;
  for(const key of ['aoqatAnnualPrayerRowsV1','aoqatAdhanRows']){
    try{
      const rows=JSON.parse(localStorage.getItem(key)||'null');if(!Array.isArray(rows))continue;
      let changed=false;
      for(const row of rows){
        if(!row||row.location_name&&row.location_name!=='الحويجة وضواحيها')continue;
        for(const c of corrections)if(Number(row.gregorian_month)===c.month&&Number(row.gregorian_day)===c.day&&row[c.field]===c.before){row[c.field]=c.after;changed=true;}
      }
      if(changed)localStorage.setItem(key,JSON.stringify(rows));
    }catch(_){}
  }
})();

;

/* js/prayer-time-choice.js */
(function(){
  'use strict';
  const KEY='aoqatPrayerTimeChoiceV1',ids=['fajr','dhuhr','asr','maghrib','isha'];
  const names={fajr:'الفجر',dhuhr:'الظهر',asr:'العصر',maghrib:'المغرب',isha:'العشاء'};
  function normalize(raw={}){return {mode:raw?.mode==='custom'?'custom':'database',offsets:Object.fromEntries(ids.map(id=>{const n=Number(raw?.offsets?.[id]);return [id,Number.isInteger(n)&&n>=-40&&n<=40?n:0];}))};}
  let nativeChoice;function read(){try{if(window.AndroidNative?.readPrayerTimeChoice){if(!nativeChoice)nativeChoice=normalize(JSON.parse(window.AndroidNative.readPrayerTimeChoice()));return nativeChoice;}return normalize(JSON.parse(localStorage.getItem(KEY)||'{}'));}catch(_){return normalize();}}
  function shift(value,id,offset){
    if(!offset)return value;
    const m=String(value||'').match(/^(\d{1,2}):([0-5]\d)(?::([0-5]\d))?$/);if(!m||+m[1]>23)return value;
    let h=+m[1];if(['asr','maghrib','isha'].includes(id)&&h<12)h+=12;if(id==='fajr'&&h===12)h=0;
    const t=((h*60+Number(m[2])+offset)%1440+1440)%1440;
    // Keep afternoon database conventions, so all existing preview formatting stays intact.
    let hour=Math.floor(t/60);if(['asr','maghrib','isha'].includes(id)&&hour>=13)hour-=12;
    return hour+':'+String(t%60).padStart(2,'0')+(m[3]?':'+m[3]:'');
  }
  function transform(row,direction){if(!row)return row;const s=read();if(s.mode!=='custom')return {...row};const result={...row};for(const id of ids)result[id]=shift(row[id],id,direction*s.offsets[id]);return result;}
  function save(raw){const s=normalize(raw);localStorage.setItem(KEY,JSON.stringify(s));window.AndroidNative?.configurePrayerTimeChoice?.(JSON.stringify(s));nativeChoice=s;window.dispatchEvent(new Event('aoqatPrayerRowsUpdated'));if(typeof loadPrayerFromDatabase==='function')loadPrayerFromDatabase(true);return s;}
  window.AoqatPrayerTimeChoice={read,normalize,shift,save,applyRow:row=>transform(row,1),unapplyRow:row=>transform(row,-1)};
  window.aoqatPrayerTimeChoiceView=function(){
    if(!document.getElementById('prayerTimeChoiceStyles')){const css=document.createElement('style');css.id='prayerTimeChoiceStyles';css.textContent=`
      .ptc-panel{max-width:620px;margin:auto;direction:rtl;padding:4px;color:var(--wt-text,#33452b)}
      .ptc-modes{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px}
      .ptc-mode{font-family:inherit;font-weight:600;font-size:14px;border:0;border-radius:10px;padding:8px 6px;min-height:42px;background:#878e8b;color:white;cursor:pointer}
      .ptc-mode[aria-pressed=true]{background:#258454}
      .ptc-fields[hidden],.ptc-note[hidden]{display:none!important}
      .ptc-fields{margin:0;border:1px solid var(--wt-border,#d0d6b8);border-radius:14px;padding:10px 14px}
      .ptc-fields label{display:grid;grid-template-columns:1fr 145px;align-items:center;gap:12px;padding:12px 0;margin:0;font-size:17px}
      .ptc-fields label+label{border-top:1px solid var(--wt-border,#d0d6b8)}
      .ptc-fields select{width:100%;min-height:42px;border-radius:10px;border:1px solid var(--wt-border,#bdcbbd);background:var(--wt-surface2,#edf4e9);color:inherit;font:inherit;padding:6px 10px}
      .ptc-fields:disabled{color:#808783;background:#f0f1ee}.ptc-fields:disabled select{background:#e5e7e5;color:#808783;opacity:1}
      .ptc-note{font-size:14px;line-height:1.9;margin:14px 2px 0;color:var(--wt-text,#33452b)}
    `;document.head.appendChild(css);}
    const panel=document.createElement('section');panel.className='ptc-panel';panel.id='prayerTimeChoicePanel';
    panel.innerHTML='<div class="ptc-modes" role="group" aria-label="طريقة اختيار الأوقات"><button type="button" class="ptc-mode" data-time-mode="database">افتراضياً</button><button type="button" class="ptc-mode" data-time-mode="custom">تخصيص المستخدم</button></div><fieldset class="ptc-fields"><legend>تعديل الوقت بالدقائق</legend></fieldset><p class="ptc-note">السالب يقدّم وقت الصلاة، والموجب يؤخّره. يُحفظ الاختيار تلقائياً على هذا الجهاز، ويُطبّق على المواقيت والعدادات والتنبيهات. الشروق يبقى كما هو، وأوقات قاعدة البيانات الأصلية لا تتغير.</p><p id="ptcStatus" role="status" class="ptc-note"></p>';
    const fields=panel.querySelector('fieldset');for(const id of ids){const label=document.createElement('label');label.textContent=names[id];const select=document.createElement('select');select.id='ptc-'+id;select.dataset.timePrayer=id;select.setAttribute('aria-label','تعديل وقت '+names[id]+' بالدقائق');for(let n=-40;n<=40;n++){const o=document.createElement('option');o.value=String(n);o.textContent=n===0?'٠ — بدون تعديل':(n>0?'+':'−')+Math.abs(n);select.appendChild(o);}label.appendChild(select);fields.appendChild(label);}
    function draw(){const s=read();fields.disabled=s.mode!=='custom';fields.hidden=s.mode!=='custom';panel.querySelector('.ptc-note').hidden=s.mode!=='custom';panel.querySelectorAll('[data-time-mode]').forEach(b=>{const selected=b.dataset.timeMode===s.mode;b.setAttribute('aria-pressed',String(selected));b.style.setProperty('background',selected?'#278052':'#858e8b','important');b.style.setProperty('color','#fff','important');let mark=b.querySelector('[data-time-state]');if(!mark){mark=document.createElement('small');mark.dataset.timeState='true';mark.style.cssText='display:block;margin-top:3px;font-size:11px';b.appendChild(mark);}mark.textContent=selected?'✓ مفعّل':'غير مفعّل';});for(const id of ids)panel.querySelector('#ptc-'+id).value=String(s.offsets[id]);}
    panel.addEventListener('click',e=>{const b=e.target.closest('[data-time-mode]');if(!b)return;const s=read();s.mode=b.dataset.timeMode;save(s);draw();panel.querySelector('#ptcStatus').textContent='تم حفظ طريقة اختيار الأوقات';});
    panel.addEventListener('change',e=>{const id=e.target.dataset.timePrayer;if(!ids.includes(id))return;const s=read();if(s.mode!=='custom')return;s.offsets[id]=Number(e.target.value);save(s);draw();panel.querySelector('#ptcStatus').textContent='تم حفظ تعديل وقت '+names[id];});draw();return panel;
  };
})();

;

/* js/supabase-db.js */
"use strict";

const SUPABASE_URL = "https://ytdvhiijxxaqofduorwm.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_dQRoxdwRJDDgWLze1U4ZqA_aaVlKC-1";

const GREGORIAN_MONTHS = ["كانون الثاني","شباط","آذار","نيسان","أيار","حزيران","تموز","آب","أيلول","تشرين الأول","تشرين الثاني","كانون الأول"];
const ARABIC_DAY_NAMES = ["الأحد","الاثنين","الثلاثاء","الأربعاء","الخميس","الجمعة","السبت"];

function dbStatus(message, type = "") {
    const el = document.getElementById("databaseStatus");
    if (!el) return;
    el.textContent = message;
    el.className = "database-status" + (type ? " " + type : "");
}
function dbHeaders(extra = {}) { return {apikey:SUPABASE_PUBLISHABLE_KEY,Authorization:`Bearer ${SUPABASE_PUBLISHABLE_KEY}`,"Content-Type":"application/json",...extra}; }
function setSelectValue(id,value){const el=document.getElementById(id);if(!el)return false;const wanted=String(value);const exists=Array.from(el.options||[]).some(o=>o.value===wanted);if(exists){el.value=wanted;return true;}return false;}
function updateDateFromGregorian(){
    const year=Number(document.getElementById("gregorianYear")?.value),monthIndex=GREGORIAN_MONTHS.indexOf(document.getElementById("gregorianMonth")?.value);
    const daySelect=document.getElementById("gregorianDay");if(!year||monthIndex<0||!daySelect)return null;
    const lastDay=new Date(year,monthIndex+1,0,12).getDate(),day=Math.max(1,Math.min(lastDay,Number(daySelect.value)||1));
    for(const option of daySelect.options)option.disabled=Number(option.value)>lastDay;
    setSelectValue("gregorianDay",day);
    const selected=new Date(year,monthIndex,day,12),dayName=ARABIC_DAY_NAMES[selected.getDay()];
    setSelectValue("dayName",dayName);
    try{
        const months=["محرم","صفر","ربيع الأول","ربيع الآخر","جمادى الأولى","جمادى الآخرة","رجب","شعبان","رمضان","شوال","ذو القعدة","ذو الحجة"];
        const parts=new Intl.DateTimeFormat("en-US-u-ca-islamic-umalqura",{year:"numeric",month:"numeric",day:"numeric"}).formatToParts(selected),h={};for(const part of parts)h[part.type]=part.value;
        const values={hijriDay:h.day,hijriMonth:months[Number(h.month)-1],hijriYear:h.year};
        for(const [id,value] of Object.entries(values)){const el=document.getElementById(id);if(el&&!Array.from(el.options).some(o=>o.value===String(value)))el.add(new Option(String(value),String(value)));setSelectValue(id,value);}
    }catch(error){console.warn("Hijri date conversion unavailable",error);}
    if(typeof updateAll==="function")updateAll();return {year,month:monthIndex+1,day,dayName};
}
function setTodayDateAutomatically(){const now=new Date();const day=now.getDate(),monthIndex=now.getMonth(),year=now.getFullYear(),dayName=ARABIC_DAY_NAMES[now.getDay()];setSelectValue("gregorianDay",day);setSelectValue("gregorianMonth",GREGORIAN_MONTHS[monthIndex]);setSelectValue("gregorianYear",year);setSelectValue("dayName",dayName);try{const months=["محرم","صفر","ربيع الأول","ربيع الآخر","جمادى الأولى","جمادى الآخرة","رجب","شعبان","رمضان","شوال","ذو القعدة","ذو الحجة"],parts=new Intl.DateTimeFormat("en-US-u-ca-islamic-umalqura",{year:"numeric",month:"numeric",day:"numeric"}).formatToParts(new Date(year,monthIndex,day,12)),h={};for(const p of parts)h[p.type]=p.value;setSelectValue("hijriDay",h.day);setSelectValue("hijriMonth",months[Number(h.month)-1]);setSelectValue("hijriYear",h.year);}catch(_){}if(typeof updateAll==="function")updateAll();return{day,month:monthIndex+1,year,dayName};}
/* Local database rows first; network refresh never blocks an available row. */
const PRAYER_FIELDS=["fajr","sunrise","dhuhr","asr","maghrib","isha"];
function validPrayerRow(row){
    return !!row&&(!row.location_name||row.location_name==="الحويجة وضواحيها")&&PRAYER_FIELDS.every(id=>/^(?:[01]?\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/.test(String(row[id]||"")));
}
function savedPrayerRows(){try{const rows=JSON.parse(localStorage.getItem("aoqatAnnualPrayerRowsV1")||"[]");return Array.isArray(rows)?rows.filter(validPrayerRow):[];}catch(_){return[];}}
function cachedAnnualPrayer(month,day){
    const sources=[savedPrayerRows()];
    try{sources.push(JSON.parse(localStorage.getItem("aoqatAdhanRows")||"[]"));}catch(_){}
    try{if(window.AndroidNative?.readPrayerRows)sources.unshift(JSON.parse(window.AndroidNative.readPrayerRows()));}catch(_){}
    sources.push(window.AoqatPrayerBackupRows||[]);
    for(const rows of sources){const row=Array.isArray(rows)&&rows.find(r=>Number(r.gregorian_month)===month&&Number(r.gregorian_day)===day&&validPrayerRow(r));if(row)return row;}
    return null;
}
function availablePrayerRows(applyChoice=true){
    const merged=new Map((window.AoqatPrayerBackupRows||[]).filter(validPrayerRow).map(r=>[`${r.gregorian_month}-${r.gregorian_day}`,r]));
    try{const native=JSON.parse(window.AndroidNative?.readPrayerRows?.()||"[]");for(const r of native)if(validPrayerRow(r))merged.set(`${r.gregorian_month}-${r.gregorian_day}`,r);}catch(_){}
    try{for(const r of JSON.parse(localStorage.getItem("aoqatAdhanRows")||"[]"))if(validPrayerRow(r))merged.set(`${r.gregorian_month}-${r.gregorian_day}`,r);}catch(_){}
    for(const r of savedPrayerRows())merged.set(`${r.gregorian_month}-${r.gregorian_day}`,r);
    return applyChoice&&window.AoqatPrayerTimeChoice ? [...merged.values()].map(window.AoqatPrayerTimeChoice.applyRow) : [...merged.values()];
}
function storePrayerRows(rows){
    const merged=new Map(savedPrayerRows().map(r=>[`${r.gregorian_month}-${r.gregorian_day}`,r]));
    for(const r of rows)if(validPrayerRow(r))merged.set(`${r.gregorian_month}-${r.gregorian_day}`,r);
    const value=JSON.stringify([...merged.values()]);localStorage.setItem("aoqatAnnualPrayerRowsV1",value);localStorage.setItem("aoqatAdhanRows",JSON.stringify(availablePrayerRows(false)));
    window.AndroidNative?.cachePrayerRows?.(value);
    if(typeof Event!=="undefined")window.dispatchEvent?.(new Event("aoqatPrayerRowsUpdated"));
}
async function prayerFetch(url){
    const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),8000);
    try{const r=await fetch(url,{headers:dbHeaders(),signal:controller.signal});if(!r.ok)throw Error("Prayer data unavailable");return await r.json();}finally{clearTimeout(timer);}
}
async function readAnnualPrayer(month,day,force=false){
    const cached=cachedAnnualPrayer(month,day);if(cached&&!force)return cached;
    const url=new URL(`${SUPABASE_URL}/rest/v1/annual_prayer_times`);
    url.searchParams.set("select","*");url.searchParams.set("location_name","eq.الحويجة وضواحيها");url.searchParams.set("gregorian_month",`eq.${month}`);url.searchParams.set("gregorian_day",`eq.${day}`);url.searchParams.set("limit","1");
    try{const rows=await prayerFetch(url),row=Array.isArray(rows)&&rows.find(r=>Number(r.gregorian_month)===month&&Number(r.gregorian_day)===day&&validPrayerRow(r));if(row){storePrayerRows([row]);return row;}}catch(_){}
    return cachedAnnualPrayer(month,day);
}
let prayerSyncPending=null;
function prayerWindow(now=new Date()){return Array.from({length:8},(_,i)=>{const d=new Date(now.getFullYear(),now.getMonth(),now.getDate()+i,12);return{month:d.getMonth()+1,day:d.getDate()};});}
function syncPrayerWindow(force=false){
    if(prayerSyncPending)return prayerSyncPending;
    const dates=prayerWindow(),last=Number(localStorage.getItem("aoqatPrayerSyncAtV1")||0),saved=savedPrayerRows();
    if(!force&&Date.now()-last<7*86400000&&dates.slice(0,2).every(d=>saved.some(r=>Number(r.gregorian_month)===d.month&&Number(r.gregorian_day)===d.day)))return Promise.resolve(false);
    if(typeof navigator!=="undefined"&&navigator.onLine===false)return Promise.resolve(false);
    prayerSyncPending=(async()=>{try{
        const url=new URL(`${SUPABASE_URL}/rest/v1/annual_prayer_times`);url.searchParams.set("select","gregorian_month,gregorian_day,location_name,fajr,sunrise,dhuhr,asr,maghrib,isha");url.searchParams.set("location_name","eq.الحويجة وضواحيها");url.searchParams.set("or","("+dates.map(d=>`and(gregorian_month.eq.${d.month},gregorian_day.eq.${d.day})`).join(",")+")");url.searchParams.set("limit","8");
        const rows=await prayerFetch(url);
        if(!Array.isArray(rows)||rows.length!==8||!rows.every(validPrayerRow)||!dates.every(d=>rows.some(r=>Number(r.gregorian_month)===d.month&&Number(r.gregorian_day)===d.day)))throw Error("Incomplete prayer window");
        storePrayerRows(rows);localStorage.setItem("aoqatPrayerSyncAtV1",String(Date.now()));await loadPrayerFromDatabase(true);return true;
    }catch(error){console.warn("Prayer background sync kept saved data",error);return false;}finally{prayerSyncPending=null;}})();return prayerSyncPending;
}
window.aoqatRefreshNativePrayerRows=()=>{if(!window.AndroidNative?.readPrayerRows)return;try{const rows=JSON.parse(window.AndroidNative.readPrayerRows());localStorage.setItem("aoqatAnnualPrayerRowsV1",JSON.stringify(rows.filter(validPrayerRow)));localStorage.setItem("aoqatAdhanRows",JSON.stringify(rows.filter(validPrayerRow)));window.dispatchEvent(new Event("aoqatPrayerRowsUpdated"));loadPrayerFromDatabase(true);}catch(_){}};
function setupPrayerBackgroundSync(){
    const sync=()=>syncPrayerWindow();window.addEventListener("online",sync);document.addEventListener("visibilitychange",()=>{if(!document.hidden)sync();});
    setInterval(sync,15*60000);sync();
}

let prayerLoadRequest=0;
async function loadPrayerFromDatabase(silent=false){try{if(!silent)dbStatus("جاري تحميل مواقيت اليوم...");const monthName=document.getElementById("gregorianMonth")?.value;const month=GREGORIAN_MONTHS.indexOf(monthName)+1;const day=Number(document.getElementById("gregorianDay")?.value);if(!month||!day)throw new Error("التاريخ الميلادي غير مكتمل");const request=++prayerLoadRequest;const row=(silent&&cachedAnnualPrayer(month,day))||await readAnnualPrayer(month,day,!silent);if(request!==prayerLoadRequest)return false;if(!row){dbStatus("لا توجد مواقيت محفوظة لهذا التاريخ؛ اتصل بالإنترنت","error");return false;}const values=window.AoqatPrayerTimeChoice?.applyRow(row)||row;Object.entries(values).forEach(([id,value])=>{const el=document.getElementById(id);if(el&&value!=null){if(!Array.from(el.options).some(o=>o.value===String(value)))el.add(new Option(String(value),String(value)));el.value=String(value);}});if(typeof updateAll==="function")updateAll();dbStatus("تم تحميل مواقيت تاريخ اليوم تلقائياً ✓","success");return true;}catch(error){console.error(error);dbStatus("تعذر تحميل مواقيت اليوم","error");if(!silent)alert("تعذر تحميل المواقيت من قاعدة البيانات. تحقق من اتصال الإنترنت.");return false;}}
function currentAnnualPrayerRecord(){const monthName=document.getElementById("gregorianMonth").value;return{gregorian_day:Number(document.getElementById("gregorianDay").value),gregorian_month:GREGORIAN_MONTHS.indexOf(monthName)+1,fajr:document.getElementById("fajr").value,sunrise:document.getElementById("sunrise").value,dhuhr:document.getElementById("dhuhr").value,asr:document.getElementById("asr").value,maghrib:document.getElementById("maghrib").value,isha:document.getElementById("isha").value};}
async function savePrayerToDatabase(){try{dbStatus("جاري الحفظ...");const record=window.AoqatPrayerTimeChoice?.unapplyRow(currentAnnualPrayerRecord())||currentAnnualPrayerRecord();const response=await fetch(`${SUPABASE_URL}/rest/v1/annual_prayer_times?on_conflict=gregorian_month,gregorian_day`,{method:"POST",headers:dbHeaders({Prefer:"resolution=merge-duplicates,return=representation"}),body:JSON.stringify(record)});if(!response.ok)throw new Error(await response.text());dbStatus("تم حفظ المواقيت في قاعدة البيانات ✓","success");}catch(error){console.error(error);dbStatus("تعذر الحفظ","error");alert("تعذر الحفظ في قاعدة البيانات.");}}
function setupAutomaticDateChangeLoading(){

    const changed=()=>{updateDateFromGregorian();loadPrayerFromDatabase(true);};
    for(const id of ["gregorianDay","gregorianMonth","gregorianYear"])document.getElementById(id)?.addEventListener("change",changed);
    const panel=document.getElementById("datePanel");
    if(panel&&!document.getElementById("returnDateToToday")){
        const button=document.createElement("button");button.id="returnDateToToday";button.type="button";button.className="main-action";button.textContent="إرجاع التاريخ إلى اليوم";
        button.style.cssText="margin-top:14px;min-height:42px;border:0;border-radius:12px;background:#147c89;color:#fff;font-family:inherit;font-size:15px;padding:10px 14px;cursor:pointer";
        button.addEventListener("click",()=>{setTodayDateAutomatically();updateDateFromGregorian();loadPrayerFromDatabase(true);});panel.appendChild(button);
    }
}

/* عرض الهاتف: نستخدم zoom بدل transform حتى تبقى المعاينة ظاهرة ومكانها صحيح */
function setupMobileResponsiveView(){
    if(document.getElementById("mobileResponsiveStyles")) return;

    const style=document.createElement("style");
    style.id="mobileResponsiveStyles";
    style.textContent=`
      @media(max-width:800px){
        html,body{overflow-x:hidden!important}
        .topbar{min-height:auto!important;padding:9px 10px!important;gap:8px!important}
        .brand{gap:8px!important;min-width:0!important}.brand-icon{font-size:27px!important}.brand h1{font-size:17px!important;margin:0!important;white-space:nowrap}.brand p{display:none!important}
        .top-export{padding:9px 11px!important;font-size:13px!important;white-space:nowrap}
        .app{width:100%!important;padding:6px!important;gap:8px!important;grid-template-columns:1fr!important}
        .workspace,.sidebar{width:100%!important;min-width:0!important}.workspace{order:1!important}.sidebar{order:2!important}
        .preview-header{padding:5px 3px 7px!important}.preview-header h2{font-size:16px!important}.preview-header span{font-size:10px!important}
        .previewBox{width:100%!important;min-height:0!important;height:auto!important;padding:6px!important;overflow:hidden!important;display:block!important;text-align:center!important}
        .design{margin:0 auto!important;transform:none!important;transform-origin:top center!important}
        .panel{padding:10px!important}.panel h2,.font-title h2{font-size:16px!important}
        .main-action{height:40px!important;font-size:14px!important}label{font-size:12px!important}select,input[type=number],input[type=text],textarea{min-height:34px!important;font-size:13px!important}
        .font-controls{grid-template-columns:1fr 1fr!important}.drag-info{min-height:0!important;flex-direction:column!important;align-items:stretch!important}#resetPositions,#saveDesignAdjustments{width:100%!important;min-width:0!important}
      }
      @media(max-width:420px){.brand h1{font-size:15px!important}.brand-icon{font-size:23px!important}.preview-header span{display:none!important}.font-controls{grid-template-columns:1fr!important}}
    `;
    document.head.appendChild(style);

    const previewBox=document.querySelector(".previewBox");
    const design=document.getElementById("design");
    if(!previewBox||!design) return;

    const DESIGN_WIDTH=1024;

    const resize=()=>{
      if(window.innerWidth>800){
        design.style.zoom="1";
        design.style.transform="none";
        design.style.margin="0 auto";
        return;
      }

      const cs=getComputedStyle(previewBox);
      const padding=parseFloat(cs.paddingLeft||0)+parseFloat(cs.paddingRight||0);
      const available=Math.max(220, previewBox.clientWidth-padding-2);
      const scale=Math.min(1, available/DESIGN_WIDTH);

      design.style.transform="none";
      design.style.zoom=String(scale);
      design.style.margin="0 auto";
    };

    resize();
    requestAnimationFrame(resize);
    setTimeout(resize,150);
    setTimeout(resize,500);
    window.addEventListener("resize",resize,{passive:true});
    window.addEventListener("orientationchange",()=>setTimeout(resize,150),{passive:true});
    document.fonts?.ready?.then(resize).catch(()=>{});
}

/* تثبيت البرنامج كتطبيق على الهاتف PWA */
function setupPWAInstallation(){
    if(document.querySelector('link[rel="manifest"]')) return;

    const manifest=document.createElement("link");
    manifest.rel="manifest";
    manifest.href="/manifest.webmanifest";
    document.head.appendChild(manifest);

    const theme=document.createElement("meta");
    theme.name="theme-color";
    theme.content="#07151e";
    document.head.appendChild(theme);

    const appleCapable=document.createElement("meta");
    appleCapable.name="apple-mobile-web-app-capable";
    appleCapable.content="yes";
    document.head.appendChild(appleCapable);

    const appleStatus=document.createElement("meta");
    appleStatus.name="apple-mobile-web-app-status-bar-style";
    appleStatus.content="black-translucent";
    document.head.appendChild(appleStatus);

    const appleTitle=document.createElement("meta");
    appleTitle.name="apple-mobile-web-app-title";
    appleTitle.content="تقاويم الصلاة";
    document.head.appendChild(appleTitle);

    const icon=document.createElement("link");
    icon.rel="icon";
    icon.href="/assets/icons/app-icon.svg";
    icon.type="image/svg+xml";
    document.head.appendChild(icon);

    if("serviceWorker" in navigator){
        window.addEventListener("load",()=>{
            navigator.serviceWorker.register("/sw.js",{updateViaCache:"none"}).then(reg=>{
                document.addEventListener("visibilitychange",()=>{if(!document.hidden&&navigator.onLine)reg.update().catch(()=>{});});
            }).catch(err=>console.error("SW registration failed",err));
        });
    }

    let deferredPrompt=null;
    const installBtn=document.createElement("button");
    installBtn.id="installAppBtn";
    installBtn.type="button";
    installBtn.textContent="📲 تثبيت التطبيق";
    installBtn.style.cssText="display:none;border:0;border-radius:8px;padding:10px 14px;font-size:14px;font-weight:700;color:#fff;background:#b58a22;cursor:pointer;white-space:nowrap";

    const topbar=document.querySelector(".topbar");
    if(topbar) topbar.appendChild(installBtn);

    const standalone=window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone===true;
    const isiOS=/iphone|ipad|ipod/i.test(navigator.userAgent);

    if(isiOS && !standalone){
        installBtn.style.display="inline-flex";
        installBtn.addEventListener("click",()=>{
            alert("لتثبيت التطبيق على iPhone: افتح زر المشاركة في Safari ثم اختر «إضافة إلى الشاشة الرئيسية».");
        });
    }

    window.addEventListener("beforeinstallprompt",event=>{
        event.preventDefault();
        deferredPrompt=event;
        installBtn.style.display="inline-flex";
    });

    installBtn.addEventListener("click",async()=>{
        if(!deferredPrompt) return;
        deferredPrompt.prompt();
        await deferredPrompt.userChoice;
        deferredPrompt=null;
        installBtn.style.display="none";
    });

    window.addEventListener("appinstalled",()=>{
        deferredPrompt=null;
        installBtn.style.display="none";
    });
}

/* حفظ تعديلات التصميم: المواضع + تنسيق العناصر */
function setupDesignSaveSystem(){
    const STORAGE_KEY="prayerDesignerSavedAdjustmentsV1";
    const dragInfo=document.querySelector(".drag-info");
    if(!dragInfo||document.getElementById("saveDesignAdjustments")) return;

    const button=document.createElement("button");
    button.id="saveDesignAdjustments";
    button.type="button";
    button.textContent="💾 حفظ تعديلات التصميم";
    button.style.cssText="border:0;border-radius:8px;padding:10px 14px;font-size:14px;font-weight:700;color:#fff;background:#168d4a;cursor:pointer";
    dragInfo.appendChild(button);

    const getElements=()=>Array.from(document.querySelectorAll(".draggable"));

    const save=()=>{
        const items=getElements().map((el,index)=>({
            index,
            x:el.dataset.x||"0",
            y:el.dataset.y||"0",
            style:el.getAttribute("style")||""
        }));
        localStorage.setItem(STORAGE_KEY,JSON.stringify(items));
        const oldText=button.textContent;
        button.textContent="✅ تم حفظ التعديلات";
        setTimeout(()=>button.textContent=oldText,1600);
    };

    const load=()=>{
        try{
            const saved=JSON.parse(localStorage.getItem(STORAGE_KEY)||"null");
            if(!Array.isArray(saved)) return;
            const elements=getElements();
            saved.forEach(item=>{
                const el=elements[item.index];
                if(!el) return;
                el.dataset.x=String(item.x??0);
                el.dataset.y=String(item.y??0);
                if(item.style) el.setAttribute("style",item.style);
                else el.removeAttribute("style");
            });
        }catch(error){
            console.error("تعذر تحميل تعديلات التصميم المحفوظة",error);
        }
    };

    button.addEventListener("click",save);
    load();
}

async function setupSupabaseDatabase(){document.getElementById("savePrayerDbBtn")?.addEventListener("click",savePrayerToDatabase);document.getElementById("loadPrayerDbBtn")?.addEventListener("click",()=>loadPrayerFromDatabase(false));setupAutomaticDateChangeLoading();setupMobileResponsiveView();setupPWAInstallation();setupDesignSaveSystem();setTodayDateAutomatically();await loadPrayerFromDatabase(true);setupPrayerBackgroundSync();}


;

/* js/script.js */
"use strict";


/* =====================================================
   اختصار العناصر
===================================================== */

const $ = id =>
    document.getElementById(id);


/* =====================================================
   بيانات العناصر
===================================================== */

const draggableElements = [

    ".quran",

    "#dayP",

    ".dateRight",

    ".dateLeft",

    "#hijriMonthP",

    "#gregorianMonthP",

    "#hijriYearP",

    "#gregorianYearP",

    ".prayer-row:nth-child(1)",

    ".prayer-row:nth-child(2)",

    ".prayer-row:nth-child(3)",

    ".prayer-row:nth-child(4)",

    ".prayer-row:nth-child(5)",

    ".prayer-row:nth-child(6)",

    "#footerP"

];


/* =====================================================
   إنشاء القوائم
===================================================== */

function fillSelect(id, values) {

    const select = $(id);

    if (!select) return;


    select.innerHTML = "";


    values.forEach(value => {

        const option =
            document.createElement("option");


        option.value = value;

        option.textContent = value;


        select.appendChild(option);

    });

}


/* =====================================================
   بيانات التاريخ
===================================================== */

function initDateData() {


    /* اليوم الهجري */

    fillSelect(
        "hijriDay",

        Array.from(
            { length: 31 },
            (_, i) => String(i + 1)
        )
    );


    /* اليوم الميلادي */

    fillSelect(
        "gregorianDay",

        Array.from(
            { length: 31 },
            (_, i) => String(i + 1)
        )
    );


    /* السنة الهجرية */

    fillSelect(
        "hijriYear",

        Array.from(
            { length: 101 },
            (_, i) => String(1400 + i)
        )
    );


    /* السنة الميلادية */

    fillSelect(
        "gregorianYear",

        Array.from(
            { length: 201 },
            (_, i) => String(1900 + i)
        )
    );


    /* القيم الافتراضية */

    $("dayName").value =
        "الأحد";


    $("hijriDay").value =
        "17";


    $("gregorianDay").value =
        "30";


    $("hijriMonth").value =
        "ربيع الأول";


    $("gregorianMonth").value =
        "آب";


    $("hijriYear").value =
        "1448";


    $("gregorianYear").value =
        "2026";

}


/* =====================================================
   أوقات الصلاة
===================================================== */


function initPrayerTimes(){
  const ids=['fajr','sunrise','dhuhr','asr','maghrib','isha'];
  for(const id of ids){const el=document.getElementById(id);el.replaceChildren(new Option('--:--',''));}
  function populate(el){if(el.dataset.apkTimesReady)return;const selected=el.value,fragment=document.createDocumentFragment();
    for(let hour=1;hour<=12;hour++)for(let minute=0;minute<60;minute++){const value=hour+':'+String(minute).padStart(2,'0');fragment.appendChild(new Option(value,value));}
    el.appendChild(fragment);el.value=selected;el.dataset.apkTimesReady='1';
  }
  document.addEventListener('focusin',e=>{if(ids.includes(e.target.id))populate(e.target);});
  document.addEventListener('pointerdown',e=>{if(ids.includes(e.target.id))populate(e.target);},{capture:true,passive:true});
}
function updateDatePreview() {


    $("dayP").textContent =
        $("dayName").value;


    $("hijriDayP").textContent =
        $("hijriDay").value;


    $("gregorianDayP").textContent =
        $("gregorianDay").value;


    $("hijriMonthP").textContent =
        $("hijriMonth").value;


    $("gregorianMonthP").textContent =
        $("gregorianMonth").value;


    $("hijriYearP").textContent =
        $("hijriYear").value + "هـ";


    $("gregorianYearP").textContent =
        $("gregorianYear").value + "م";

}


/* =====================================================
   تحديث أوقات الصلاة
===================================================== */

function updatePrayerPreview() {


    [

        "fajr",
        "sunrise",
        "dhuhr",
        "asr",
        "maghrib",
        "isha"

    ].forEach(id => {

        const output =
            $(id + "P");


        const input =
            $(id);


        if (output && input) {

            output.textContent =
                input.value;

        }

    });

}


/* =====================================================
   تحديث النص السفلي
===================================================== */

function updateFooter() {

    $("footerP").textContent =
        $("footerText").value;

}


/* =====================================================
   تحديث كامل
===================================================== */

function updateAll() {

    updateDatePreview();

    updatePrayerPreview();

    updateFooter();

    updateBackground();

}


/* =====================================================
   الخلفية
===================================================== */

function updateBackground() {

    const design =
        $("design");


    if (!design) return;


    if (
        $("bgType").value ===
        "gradient"
    ) {

        design.style.backgroundImage =

            `radial-gradient(
                circle at 50% 47%,
                rgba(20,91,82,.45),
                transparent 36%
            ),
            radial-gradient(
                circle at 50% 55%,
                rgba(4,30,30,.35),
                transparent 65%
            ),
            linear-gradient(
                145deg,
                ${$("color1").value},
                ${$("color2").value} 55%,
                #031b1b
            )`;

    }

}


/* =====================================================
   التحكم بالخلفية
===================================================== */

function setupBackground() {


    $("bgType")
        ?.addEventListener(
            "change",
            () => {

                const image =
                    $("bgType").value ===
                    "image";


                $("gradientBox")
                    .classList
                    .toggle(
                        "hidden",
                        image
                    );


                $("imageBox")
                    .classList
                    .toggle(
                        "hidden",
                        !image
                    );


                if (!image) {

                    updateBackground();

                }

            }
        );


    $("color1")
        ?.addEventListener(
            "input",
            updateBackground
        );


    $("color2")
        ?.addEventListener(
            "input",
            updateBackground
        );


    $("bgFile")
        ?.addEventListener(
            "change",
            event => {

                const file =
                    event.target.files[0];


                if (!file) return;


                const reader =
                    new FileReader();


                reader.onload =
                    function () {

                        $("design")
                            .style
                            .backgroundImage =
                            `url("${reader.result}")`;


                        $("design")
                            .style
                            .backgroundSize =
                            "cover";


                        $("design")
                            .style
                            .backgroundPosition =
                            "center";

                    };


                reader.readAsDataURL(file);

            }
        );

}


/* =====================================================
   القوائم المنسدلة
===================================================== */

function setupInputs() {


    [

        "dayName",
        "hijriDay",
        "gregorianDay",
        "hijriMonth",
        "gregorianMonth",
        "hijriYear",
        "gregorianYear"

    ].forEach(id => {

        $(id)?.addEventListener(
            "change",
            updateDatePreview
        );

    });


    [

        "fajr",
        "sunrise",
        "dhuhr",
        "asr",
        "maghrib",
        "isha"

    ].forEach(id => {

        $(id)?.addEventListener(
            "change",
            updatePrayerPreview
        );

    });


    $("footerText")
        ?.addEventListener(
            "input",
            updateFooter
        );

}


/* =====================================================
   السحب والإفلات
===================================================== */

function setupDragging() {

    const design =
        $("design");


    if (!design) return;


    draggableElements.forEach(
        selector => {


            const element =
                document.querySelector(
                    selector
                );


            if (!element) return;


            element.classList.add(
                "draggable"
            );


            let dragging = false;


            let startX = 0;

            let startY = 0;


            let baseX =
                parseFloat(
                    element.dataset.x
                ) || 0;


            let baseY =
                parseFloat(
                    element.dataset.y
                ) || 0;


            let scale = 1;


            function point(event) {

                return event.touches
                    ? event.touches[0]
                    : event;

            }


            function start(event) {

                if (
                    event.button !== undefined &&
                    event.button !== 0
                ) {

                    return;

                }


                const p =
                    point(event);


                const rect =
                    design.getBoundingClientRect();


                scale =
                    rect.width /
                    design.offsetWidth ||
                    1;


                startX =
                    p.clientX;


                startY =
                    p.clientY;


                baseX =
                    parseFloat(
                        element.dataset.x
                    ) || 0;


                baseY =
                    parseFloat(
                        element.dataset.y
                    ) || 0;


                dragging = true;


                element.classList.add(
                    "dragging"
                );


                event.preventDefault();

            }


            function move(event) {

                if (!dragging) return;


                const p =
                    point(event);


                const dx =
                    (p.clientX - startX) /
                    scale;


                const dy =
                    (p.clientY - startY) /
                    scale;


                const x =
                    baseX + dx;


                const y =
                    baseY + dy;


                element.dataset.x =
                    x;


                element.dataset.y =
                    y;


                element.style.transform =
                    `translate(${x}px, ${y}px)`;


                event.preventDefault();

            }


            function end() {

                dragging = false;


                element.classList.remove(
                    "dragging"
                );

            }


            element.addEventListener(
                "mousedown",
                start
            );


            window.addEventListener(
                "mousemove",
                move,
                {
                    passive: false
                }
            );


            window.addEventListener(
                "mouseup",
                end
            );


            element.addEventListener(
                "touchstart",
                start,
                {
                    passive: false
                }
            );


            window.addEventListener(
                "touchmove",
                move,
                {
                    passive: false
                }
            );


            window.addEventListener(
                "touchend",
                end
            );

        }
    );

}


/* =====================================================
   تنسيق الخط
===================================================== */

let selectedElement = null;


/* =====================================================
   اختيار العنصر
===================================================== */

function setupFontSystem() {


    $("elementSelect")
        ?.addEventListener(
            "change",
            function () {


                const selector =
                    this.value;


                if (!selector) {

                    selectedElement =
                        null;

                    return;

                }


                selectedElement =
                    document.querySelector(
                        selector
                    );


                if (
                    !selectedElement
                ) return;


                loadElementStyle();

            }
        );


    /* الخط */

    $("fontFamily")
        ?.addEventListener(
            "change",
            applyFontStyle
        );


    /* الحجم */

    $("fontSize")
        ?.addEventListener(
            "input",
            applyFontStyle
        );


    /* الوزن */

    $("fontWeight")
        ?.addEventListener(
            "change",
            applyFontStyle
        );


    /* اللون */

    $("fontColor")
        ?.addEventListener(
            "input",
            applyFontStyle
        );


    /* المحاذاة */

    $("textAlign")
        ?.addEventListener(
            "change",
            applyFontStyle
        );


    /* الظل */

    $("textShadow")
        ?.addEventListener(
            "change",
            applyFontStyle
        );


    setupFontUpload();

}


/* =====================================================
   تحميل تنسيق العنصر
===================================================== */

function loadElementStyle() {

    if (!selectedElement)
        return;


    const style =
        getComputedStyle(
            selectedElement
        );


    $("fontFamily").value =
        normalizeFontFamily(
            style.fontFamily
        );


    $("fontSize").value =
        parseFloat(
            style.fontSize
        );


    $("fontWeight").value =
        style.fontWeight;


    $("fontColor").value =
        rgbToHex(
            style.color
        );


    $("textAlign").value =
        style.textAlign;


    if (
        style.textShadow ===
        "none"
    ) {

        $("textShadow").value =
            "none";

    }

    else if (
        style.textShadow.includes(
            "255, 215, 0"
        )
    ) {

        $("textShadow").value =
            "gold";

    }

    else {

        $("textShadow").value =
            "black";

    }

}


/* =====================================================
   تطبيق تنسيق الخط
===================================================== */

function applyFontStyle() {

    if (!selectedElement)
        return;


    selectedElement.style.fontFamily =
        `"${$("fontFamily").value}"`;


    selectedElement.style.fontSize =
        `${$("fontSize").value}px`;


    selectedElement.style.fontWeight =
        $("fontWeight").value;


    selectedElement.style.color =
        $("fontColor").value;


    selectedElement.style.textAlign =
        $("textAlign").value;


    const shadow =
        $("textShadow").value;


    if (shadow === "none") {

        selectedElement.style.textShadow =
            "none";

    }


    if (shadow === "black") {

        selectedElement.style.textShadow =
            "4px 4px 3px #000";

    }


    if (shadow === "gold") {

        selectedElement.style.textShadow =
            "4px 4px 3px #000, 0 0 10px #ffd45c";

    }


    if (shadow === "green") {

        selectedElement.style.textShadow =
            "4px 4px 3px #000, 0 0 10px #26ff00";

    }

}


/* =====================================================
   إضافة خط من الجهاز
===================================================== */

function setupFontUpload() {


    $("fontFile")
        ?.addEventListener(
            "change",
            async event => {


                const file =
                    event.target.files[0];


                if (!file) return;


                const fontName =
                    file.name
                        .replace(
                            /\.(ttf|otf|woff2?|)$/i,
                            ""
                        )
                        .replace(
                            /[^a-zA-Z0-9\u0600-\u06FF]/g,
                            "_"
                        );


                try {


                    const fontFace =
                        new FontFace(
                            fontName,
                            `url(${URL.createObjectURL(file)})`
                        );


                    await fontFace.load();


                    document.fonts.add(
                        fontFace
                    );


                    const option =
                        document.createElement(
                            "option"
                        );


                    option.value =
                        fontName;


                    option.textContent =
                        fontName +
                        " ✓";


                    $("fontFamily")
                        .appendChild(
                            option
                        );


                    $("fontFamily").value =
                        fontName;


                    applyFontStyle();


                    alert(
                        "تمت إضافة الخط بنجاح"
                    );


                }
                catch (error) {


                    console.error(
                        error
                    );


                    alert(
                        "تعذر تحميل الخط."
                    );

                }

            }
        );

}


/* =====================================================
   تحويل RGB إلى HEX
===================================================== */

function rgbToHex(rgb) {

    if (
        !rgb ||
        rgb.startsWith("#")
    ) {

        return rgb || "#ffffff";

    }


    const match =
        rgb.match(
            /\d+/g
        );


    if (
        !match ||
        match.length < 3
    ) {

        return "#ffffff";

    }


    return "#" +
        match
            .slice(0, 3)
            .map(
                n =>
                    Number(n)
                        .toString(16)
                        .padStart(2, "0")
            )
            .join("");

}


/* =====================================================
   اسم الخط
===================================================== */

function normalizeFontFamily(value) {

    if (!value)
        return "Arial";


    return value
        .split(",")[0]
        .replace(
            /["']/g,
            ""
        )
        .trim();

}


/* =====================================================
   النوافذ / فتح وإغلاق الأقسام
===================================================== */

function setupPanels() {


    document
        .querySelectorAll(
            "[data-open-panel]"
        )
        .forEach(button => {


            button.addEventListener(
                "click",
                () => {


                    const panel =
                        $(
                            button.dataset
                                .openPanel
                        );


                    if (!panel)
                        return;


                    panel.classList.toggle(
                        "active-panel"
                    );


                    panel.scrollIntoView({
                        behavior:
                            "smooth",
                        block:
                            "nearest"
                    });

                }
            );

        });


    document
        .querySelectorAll(
            ".collapse-btn"
        )
        .forEach(button => {


            button.addEventListener(
                "click",
                () => {


                    const panel =
                        button.closest(
                            ".accordion-panel"
                        );


                    if (!panel)
                        return;


                    panel.classList.toggle(
                        "collapsed"
                    );


                    button.textContent =
                        panel.classList.contains(
                            "collapsed"
                        )
                            ? "+"
                            : "−";

                }
            );

        });

}


/* =====================================================
   إعادة ضبط المواضع
===================================================== */

function resetPositions() {


    document
        .querySelectorAll(
            ".draggable"
        )
        .forEach(element => {


            element.dataset.x =
                "0";


            element.dataset.y =
                "0";


            element.style.transform =
                "";

        });

}


function setupReset() {

    $("resetPositions")
        ?.addEventListener(
            "click",
            resetPositions
        );

}


/* =====================================================
   التصدير
===================================================== */

async function exportImage(format) {


    const design =
        $("design");


    if (!design)
        return;


    const WIDTH =
        1024;


    const HEIGHT =
        1448;


    const SCALE =
        2;


    const canvas =
        document.createElement(
            "canvas"
        );


    canvas.width =
        WIDTH * SCALE;


    canvas.height =
        HEIGHT * SCALE;


    const ctx =
        canvas.getContext(
            "2d"
        );


    ctx.scale(
        SCALE,
        SCALE
    );


    try {

        if (
            document.fonts &&
            document.fonts.ready
        ) {

            await document.fonts.ready;

        }

    }
    catch (error) {}


    await drawBackground(
        ctx,
        design,
        WIDTH,
        HEIGHT
    );


    drawBorderExport(
        ctx
    );


    /* الآية */

    drawElement(
        ctx,
        document.querySelector(
            ".quran"
        ),
        design
    );


    /* التاريخ */

    [

        "#dayP",
        ".dateRight span",
        ".dateLeft span",
        "#hijriMonthP",
        "#gregorianMonthP",
        "#hijriYearP",
        "#gregorianYearP"

    ].forEach(selector => {

        drawElement(
            ctx,
            document.querySelector(
                selector
            ),
            design
        );

    });


    /* أوقات الصلاة */

    design
        .querySelectorAll(
            ".prayer-row"
        )
        .forEach(row => {

            drawElement(
                ctx,
                row.querySelector("b"),
                design
            );


            drawElement(
                ctx,
                row.querySelector("span"),
                design
            );

        });


    /* النص السفلي */

    drawElement(
        ctx,
        $("footerP"),
        design
    );


    const mime =
        format === "jpg"
            ? "image/jpeg"
            : format === "webp"
                ? "image/webp"
                : "image/png";


    const quality =
        format === "png"
            ? undefined
            : .98;


    canvas.toBlob(
        blob => {
            if (!blob) {
                alert("تعذر إنشاء الصورة.");
                return;
            }

            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = `noor-prayer-calendar.${format}`;
            document.body.appendChild(link);
            link.click();
            link.remove();
            setTimeout(() => URL.revokeObjectURL(url), 2000);
        },
        mime,
        quality
    );

}


/* =====================================================
   رسم الخلفية للتصدير
===================================================== */

async function drawBackground(
    ctx,
    design,
    W,
    H
) {


    const background =
        getComputedStyle(
            design
        ).backgroundImage;


    if (
        background &&
        background.includes(
            "url("
        )
    ) {


        const match =
            background.match(
                /url\(["']?(.*?)["']?\)/
            );


        if (match) {


            const image =
                new Image();


            await new Promise(
                resolve => {


                    image.onload =
                        () => {


                            ctx.drawImage(
                                image,
                                0,
                                0,
                                W,
                                H
                            );


                            resolve();

                        };


                    image.onerror =
                        resolve;


                    image.src =
                        match[1];

                }
            );


        }

    }

    else {


        const c1 =
            $("color1")?.value ||
            "#031b1b";


        const c2 =
            $("color2")?.value ||
            "#0b3b37";


        const gradient =
            ctx.createLinearGradient(
                0,
                0,
                W,
                H
            );


        gradient.addColorStop(
            0,
            c1
        );


        gradient.addColorStop(
            .55,
            c2
        );


        gradient.addColorStop(
            1,
            "#031b1b"
        );


        ctx.fillStyle =
            gradient;


        ctx.fillRect(
            0,
            0,
            W,
            H
        );

    }

}


/* =====================================================
   إطار التصدير
===================================================== */

function drawBorderExport(ctx) {


    ctx.save();


    ctx.strokeStyle =
        "#e8bd58";


    ctx.lineWidth =
        3;


    roundRect(
        ctx,
        52,
        52,
        920,
        1344,
        62
    );


    ctx.stroke();


    ctx.fillStyle =
        "#e8bd58";


    ctx.font =
        "34px Georgia";


    ctx.textAlign =
        "center";


    ctx.fillText(
        "✦",
        512,
        45
    );


    ctx.fillText(
        "✦",
        512,
        1410
    );


    ctx.restore();

}


/* =====================================================
   مستطيل دائري
===================================================== */

function roundRect(
    ctx,
    x,
    y,
    width,
    height,
    radius
) {


    ctx.beginPath();


    ctx.moveTo(
        x + radius,
        y
    );


    ctx.arcTo(
        x + width,
        y,
        x + width,
        y + height,
        radius
    );


    ctx.arcTo(
        x + width,
        y + height,
        x,
        y + height,
        radius
    );


    ctx.arcTo(
        x,
        y + height,
        x,
        y,
        radius
    );


    ctx.arcTo(
        x,
        y,
        x + width,
        y,
        radius
    );


    ctx.closePath();

}


/* =====================================================
   رسم عنصر للناتج النهائي
===================================================== */

function drawElement(
    ctx,
    element,
    design
) {


    if (!element)
        return;


    const rect =
        element.getBoundingClientRect();


    const designRect =
        design.getBoundingClientRect();


    const scale =
        designRect.width /
        design.offsetWidth ||
        1;


    const x =
        (rect.left -
            designRect.left) /
        scale;


    const y =
        (rect.top -
            designRect.top) /
        scale;


    const width =
        rect.width /
        scale;


    const style =
        getComputedStyle(
            element
        );


    const text =
        element.textContent.trim();


    if (!text)
        return;


    const fontSize =
        parseFloat(
            style.fontSize
        ) || 16;


    const family =
        style.fontFamily ||
        "Arial";


    const weight =
        style.fontWeight ||
        "400";


    ctx.save();


    ctx.font =
        `${weight} ${fontSize}px ${family}`;


    ctx.fillStyle =
        style.color ||
        "#ffffff";


    ctx.textBaseline =
        "top";


    ctx.textAlign =
        style.textAlign ||
        "left";


    let textX =
        x;


    if (
        style.textAlign ===
        "center"
    ) {

        textX =
            x + width / 2;

    }


    else if (
        style.textAlign ===
        "right"
    ) {

        textX =
            x + width;

    }


    applyCanvasShadow(
        ctx,
        style.textShadow
    );


    ctx.fillText(
        text,
        textX,
        y
    );


    ctx.restore();

}


/* =====================================================
   ظل التصدير
===================================================== */

function applyCanvasShadow(
    ctx,
    shadow
) {


    if (
        !shadow ||
        shadow === "none"
    ) {

        return;

    }


    ctx.shadowColor =
        "#000000";


    ctx.shadowBlur =
        3;


    ctx.shadowOffsetX =
        3;


    ctx.shadowOffsetY =
        3;

}


/* =====================================================
   أزرار التصدير
===================================================== */

function setupExport() {


    $("exportBtn")
        ?.addEventListener(
            "click",
            () =>
                exportImage(
                    "png"
                )
        );


    document
        .querySelectorAll(
            "[data-export-format]"
        )
        .forEach(button => {


            button.addEventListener(
                "click",
                () => {


                    exportImage(
                        button.dataset
                            .exportFormat
                    );

                }
            );

        });

}


/* =====================================================
   التشغيل
===================================================== */

function init() {


    initDateData();


    initPrayerTimes();


    setupInputs();


    setupBackground();


    setupDragging();


    setupFontSystem();


    setupPanels();


    setupReset();


    setupExport();


    setupSupabaseDatabase();


    updateAll();

}


if (
    document.readyState ===
    "loading"
) {


    document.addEventListener(
        "DOMContentLoaded",
        init
    );


}

else {


    init();

}

;

/* js/export-toolbar.js */
"use strict";
(function(){
  function addStyles(){
    if(document.getElementById("exportToolbarStyles"))return;
    const s=document.createElement("style");
    s.id="exportToolbarStyles";
    s.textContent=`
      #saveToPhoneBtn{
        display:inline-flex;align-items:center;justify-content:center;gap:5px;
        width:auto!important;min-width:0!important;min-height:32px!important;
        margin:0 0 0 auto!important;padding:6px 10px!important;
        border:1px solid rgba(255,255,255,.14)!important;border-radius:7px!important;
        background:#168b52!important;color:#fff!important;font:inherit;font-size:12px!important;
        font-weight:700!important;line-height:1.1;cursor:pointer;white-space:nowrap;
        box-shadow:0 2px 7px rgba(0,0,0,.12)!important;transition:.15s ease
      }
      #saveToPhoneBtn:hover{background:#19975a!important}
      #saveToPhoneBtn:active{transform:translateY(1px)}
      #topExportJpg{
        width:100%!important;min-height:42px!important;margin:7px 0 0!important;
        padding:9px 12px!important;border:0!important;border-radius:9px!important;
        background:#176f9f!important;color:#fff!important;font:inherit;font-size:14px!important;
        font-weight:800!important;cursor:pointer;box-shadow:none!important
      }
      #topExportJpg:hover{background:#1b7daf!important}
      .workspace>.export-buttons{display:none!important}
      @media(max-width:800px){
        .topbar{display:flex!important;align-items:center!important;gap:7px!important;flex-wrap:nowrap!important}
        .topbar .brand{min-width:0;flex:1 1 auto}
        #saveToPhoneBtn{flex:0 0 auto!important;min-height:30px!important;padding:5px 7px!important;font-size:11px!important}
      }
      @media(max-width:430px){
        .topbar .brand p{display:none!important}
        #saveToPhoneBtn{padding:5px 7px!important;font-size:10.5px!important}
      }
    `;
    document.head.appendChild(s);
  }

  function init(){
    addStyles();
    document.querySelectorAll('.workspace .export-buttons').forEach(x=>x.remove());
    document.querySelectorAll('[data-export-format="png"],[data-export-format="webp"]').forEach(x=>x.remove());
    document.getElementById('topExportActions')?.remove();

    const old=document.getElementById('exportBtn');
    if(old){
      const phone=document.createElement('button');
      phone.id='saveToPhoneBtn';
      phone.type='button';
      phone.setAttribute('data-save-phone','true');
      phone.title='حفظ الصورة على الهاتف';
      phone.innerHTML='📱 <span>حفظ على الهاتف</span>';
      old.replaceWith(phone);
    }else if(!document.getElementById('saveToPhoneBtn')){
      const topbar=document.querySelector('.topbar');
      if(topbar){
        const phone=document.createElement('button');
        phone.id='saveToPhoneBtn';phone.type='button';phone.setAttribute('data-save-phone','true');
        phone.innerHTML='📱 <span>حفظ على الهاتف</span>';
        topbar.appendChild(phone);
      }
    }

    if(!document.getElementById('topExportJpg')){
      const mainPanel=document.querySelector('.sidebar .main-panel');
      if(mainPanel){
        const jpg=document.createElement('button');
        jpg.id='topExportJpg';jpg.type='button';jpg.setAttribute('data-export-format','jpg');
        jpg.title='تصدير الصورة بصيغة JPG';
        jpg.innerHTML='📷 <span>تصدير JPG</span>';
        mainPanel.appendChild(jpg);
      }
    }
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
;

/* js/exact-export.js */
"use strict";

(function(){
  const WIDTH=1024;
  const HEIGHT=1448;
  let bypass=false;
  let loaderPromise=null;

  function usableSlides(track){
    return Array.from(track.querySelectorAll(":scope > .design-slide")).filter(slide=>{
      if(slide.dataset.legacySlide==='true'||slide.querySelector('#design')) return false;
      if(slide.classList.contains('removed-design-storage')||slide.closest('.removed-design-storage')) return false;
      const cs=getComputedStyle(slide);
      return cs.display!=="none"&&!slide.hidden;
    });
  }

  function activeDesign(){
    const track=document.querySelector(".design-carousel-track");
    if(!track) return document.getElementById("design");
    const slides=usableSlides(track);
    if(!slides.length) return document.getElementById("design");

    // نعتمد أولاً على التصميم الموجود فعلياً في منتصف نافذة المعاينة.
    // هذا يمنع تصدير تصميم آخر عند اختلاف أرقام الشرائح الداخلية عن العداد الظاهر.
    const car=document.querySelector('.design-carousel');
    if(car){
      const cr=car.getBoundingClientRect();
      if(cr.width>0){
        const center=cr.left+(cr.width/2);
        let best=null,bestDistance=Infinity;
        slides.forEach(slide=>{
          const r=slide.getBoundingClientRect();
          if(!r.width)return;
          const distance=Math.abs((r.left+r.width/2)-center);
          if(distance<bestDistance){bestDistance=distance;best=slide;}
        });
        if(best&&bestDistance<=Math.max(cr.width*.8,80)){
          const design=best.firstElementChild;
          if(design){
            window.__prayerActiveDesignElement=design;
            window.__prayerActiveVisibleIndex=slides.indexOf(best);
            return design;
          }
        }
      }
    }

    // احتياط: نحسب الشريحة من حركة المسار نفسها.
    try{
      const transform=getComputedStyle(track).transform;
      const m=transform&&transform!=="none"?new DOMMatrixReadOnly(transform):null;
      const slideWidth=car?.getBoundingClientRect().width||slides[0].getBoundingClientRect().width;
      if(m&&slideWidth>0){
        const all=Array.from(track.querySelectorAll(":scope > .design-slide"));
        const domIndex=Math.max(0,Math.round(Math.abs(m.m41)/slideWidth));
        const domSlide=all[domIndex];
        if(domSlide&&slides.includes(domSlide)&&domSlide.firstElementChild)return domSlide.firstElementChild;
      }
    }catch(_){ }

    const explicit=window.__prayerActiveDesignElement;
    if(explicit&&document.contains(explicit))return explicit;
    let index=Number(window.__prayerActiveVisibleIndex);
    if(!Number.isFinite(index))index=Number(window.__prayerActiveDesignIndex);
    if(!Number.isFinite(index))index=0;
    index=Math.max(0,Math.min(index,slides.length-1));
    return slides[index]?.firstElementChild||document.getElementById("design");
  }

  function loadHtml2Canvas(){
    if(typeof window.html2canvas==="function") return Promise.resolve(window.html2canvas);
    if(loaderPromise) return loaderPromise;
    loaderPromise=new Promise((resolve,reject)=>{
      const existing=document.querySelector('script[data-html2canvas]');
      if(existing){
        existing.addEventListener("load",()=>typeof window.html2canvas==="function"?resolve(window.html2canvas):reject(new Error("html2canvas missing")),{once:true});
        existing.addEventListener("error",reject,{once:true});
        return;
      }
      const s=document.createElement("script");
      s.src="assets/vendor/html2canvas.min.js";
      s.async=true;s.dataset.html2canvas="true";
      s.onload=()=>typeof window.html2canvas==="function"?resolve(window.html2canvas):reject(new Error("html2canvas missing"));
      s.onerror=reject;
      document.head.appendChild(s);
    });
    return loaderPromise;
  }

  function copyCanvasContent(source,clone){
    const src=source.querySelectorAll("canvas"),dst=clone.querySelectorAll("canvas");
    src.forEach((canvas,i)=>{const target=dst[i];if(!target)return;try{target.width=canvas.width;target.height=canvas.height;target.getContext("2d")?.drawImage(canvas,0,0)}catch(e){}});
  }

  function addExportOnlyStyles(host,source,clone){
    const style=document.createElement("style");
    if(source.classList.contains("night-design")){
      clone.classList.add("export-night-design");
      style.textContent=`.export-night-design{isolation:isolate!important}.export-night-design:after{display:none!important;content:none!important}.export-night-design:before,.export-night-design .nd-pattern,.export-night-design .nd-stars,.export-night-design .nd-moon,.export-night-design .nd-mosque,.export-night-design .nd-export-arch{z-index:0!important}.export-night-design .nd-export-arch{position:absolute!important;left:84px!important;right:84px!important;top:14px!important;height:430px!important;border:6px solid #b97828!important;border-bottom:0!important;border-radius:52% 52% 0 0/70% 70% 0 0!important;box-shadow:inset 0 0 0 5px #061b2e!important;pointer-events:none!important;box-sizing:border-box!important}.export-night-design .nd-title,.export-night-design .nd-subtitle,.export-night-design .nd-date,.export-night-design .nd-day,.export-night-design .nd-prayers,.export-night-design .nd-book,.export-night-design .nd-lantern,.export-night-design .nd-footer{position:absolute;z-index:5!important}.export-night-design .nd-prayers{display:flex!important}.export-night-design .nd-prayer-row{position:relative!important;z-index:6!important}`;
    }
    if(source.classList.contains("ornate-design")){
      clone.classList.add("export-ornate-design");
      style.textContent+=`.export-ornate-design{isolation:isolate!important}.export-ornate-design .od-lattice,.export-ornate-design .od-inner,.export-ornate-design .od-arch,.export-ornate-design .od-stars,.export-ornate-design .od-moon,.export-ornate-design .od-mosque{z-index:0!important}.export-ornate-design .od-title,.export-ornate-design .od-subtitle,.export-ornate-design .od-date,.export-ornate-design .od-day,.export-ornate-design .od-prayers,.export-ornate-design .od-book,.export-ornate-design .od-lantern,.export-ornate-design .od-footer{z-index:5!important}`;
    }
    host.appendChild(style);
  }

  function fixSpecialDesignForExport(source,clone){
    if(source.classList.contains('reference-design')){
      const day=clone.querySelector('.ref-day'),original=source.querySelector('.ref-day');
      if(day&&original){
        // html2canvas does not paint CSS polygon clips. Rasterize the existing
        // badge on a canvas inside the clone; keep its text and position.
        const points='50,0 62,12 80,8 88,25 100,37 91,52 100,68 84,78 79,96 59,90 50,100 39,89 20,96 15,78 0,68 9,52 0,37 12,25 20,8 38,12';
        const fill=getComputedStyle(original).backgroundColor;
        const img=document.createElement('canvas');img.className='ref-export-day-badge';img.setAttribute('aria-hidden','true');
        img.width=original.offsetWidth;img.height=original.offsetHeight;
        const ctx=img.getContext('2d');ctx.scale(img.width/100,img.height/100);ctx.fillStyle=fill;ctx.beginPath();
        points.split(' ').forEach((point,i)=>{const [x,y]=point.split(',').map(Number);if(i)ctx.lineTo(x,y);else ctx.moveTo(x,y);});ctx.closePath();ctx.fill();
        img.style.cssText='position:absolute;inset:0;width:100%;height:100%;z-index:0;pointer-events:none';
        const text=document.createElement('span');text.style.cssText='position:relative;z-index:1';while(day.firstChild)text.appendChild(day.firstChild);day.appendChild(text);
        day.style.clipPath='none';day.style.background='transparent';day.style.borderColor='transparent';day.style.isolation='isolate';day.style.zIndex='2';day.prepend(img);
      }
    }
    if(source.classList.contains("night-design")){
      const arch=document.createElement("div");arch.className="nd-export-arch";clone.insertBefore(arch,clone.firstChild);
    }
    if(source.classList.contains("fourth-design")){
      clone.style.boxShadow="none";
      const sky=clone.querySelector(".sd4-sky");if(sky){sky.style.background="linear-gradient(180deg, rgba(99,169,207,.16) 0%, rgba(255,255,255,.10) 30%, rgba(255,255,255,0) 55%)";sky.style.filter="none";sky.style.boxShadow="none"}
      const prayers=clone.querySelector(".sd4-prayers");if(prayers){prayers.style.top="630px";prayers.style.gap="14px"}
      clone.querySelectorAll(".sd4-prayer-row").forEach(row=>row.style.height="88px");
      const footer=clone.querySelector(".sd4-footer");if(footer){footer.style.boxSizing="border-box";footer.style.height="96px";footer.style.minHeight="96px";footer.style.bottom="38px";footer.style.padding="12px 28px"}
      clone.querySelectorAll(".sd4-day,.sd4-date-card,.sd4-prayer-row,.sd4-footer").forEach(el=>el.style.filter="none");
    }
  }

  function prepareClone(design){
    const host=document.createElement("div");
    host.setAttribute("aria-hidden","true");
    host.style.cssText=`position:fixed;left:-20000px;top:0;width:${WIDTH}px;height:${HEIGHT}px;overflow:hidden;z-index:-2147483647;pointer-events:none;`;
    const clone=design.cloneNode(true);
    clone.removeAttribute("id");
    clone.style.zoom="1";
    clone.style.transform="none";
    clone.style.transformOrigin="top left";
    clone.style.width=WIDTH+"px";
    clone.style.height=HEIGHT+"px";
    clone.style.margin="0";
    clone.style.maxWidth="none";
    clone.style.maxHeight="none";
    clone.style.flex="0 0 auto";
    addExportOnlyStyles(host,design,clone);
    fixSpecialDesignForExport(design,clone);
    host.appendChild(clone);
    document.body.appendChild(host);
    copyCanvasContent(design,clone);
    return{host,clone};
  }

  async function renderPreview(design){
    if(document.fonts?.ready){try{await document.fonts.ready}catch(e){}}
    const html2canvas=await loadHtml2Canvas();
    const{host,clone}=prepareClone(design);
    try{
      await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
      return await html2canvas(clone,{backgroundColor:null,scale:2,width:WIDTH,height:HEIGHT,windowWidth:WIDTH,windowHeight:HEIGHT,scrollX:0,scrollY:0,useCORS:true,allowTaint:true,logging:false,imageTimeout:8000,foreignObjectRendering:false,removeContainer:true});
    }finally{host.remove()}
  }

  function canvasBlob(canvas,format="jpg"){
    const f=(format||"jpg").toLowerCase(),isJpg=f==="jpg"||f==="jpeg",mime=isJpg?"image/jpeg":f==="webp"?"image/webp":"image/png";
    return new Promise(resolve=>canvas.toBlob(resolve,mime,mime==="image/png"?undefined:.98));
  }
  function downloadBlob(blob,ext="jpg"){
    if(!blob)return;const url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download=`prayer-preview.${ext}`;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),2500);
  }
  async function download(canvas,format){const f=(format||"jpg").toLowerCase(),ext=f==="jpeg"?"jpg":f;const blob=await canvasBlob(canvas,f);downloadBlob(blob,ext);}
  async function saveToPhone(canvas){const blob=await canvasBlob(canvas,"jpg");if(!blob)return;const file=new File([blob],"prayer-preview.jpg",{type:"image/jpeg"});if(navigator.share&&navigator.canShare&&navigator.canShare({files:[file]})){try{await navigator.share({files:[file],title:"مواقيت الصلاة"});return}catch(error){if(error?.name==="AbortError")return;}}downloadBlob(blob,"jpg");}
  // Keep one prepared image in an app-owned page. The system chooser can close
  // after sharing; this page stays mounted for sharing the same file again.
  let imageActionSequence=0;const imageActions=new Map();
  window.aoqatImageActionResult=(id,ok)=>{const pending=imageActions.get(id);if(!pending)return;imageActions.delete(id);ok?pending.resolve():pending.reject(Error('Native image action failed'));};
  async function nativeImageAction(method,file){const dataUrl=await new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=reject;r.readAsDataURL(file);});return new Promise((resolve,reject)=>{const id='image-'+(++imageActionSequence);imageActions.set(id,{resolve,reject});try{window.AndroidNative[method](dataUrl,file.name,id);}catch(e){imageActions.delete(id);reject(e);}});}
  window.aoqatNativeImageAction=nativeImageAction;
  window.aoqatCreatePrayerShareView=function(){
    const panel=document.createElement('section');panel.id='prayerShareView';panel.className='web-settings-list';
    panel.innerHTML='<img id="prayerSharePreview" alt="معاينة صورة مواقيت الصلاة" hidden style="width:100%;max-width:320px;height:auto;margin:0 auto;border-radius:12px"><button type="button" id="prayerShareApps" class="main-action" disabled>↗ مشاركة الصورة</button><button type="button" id="prayerShareSave" class="main-action" disabled>📥 حفظ على الجهاز</button><button type="button" id="prayerShareRetry" class="main-action" hidden>إعادة المحاولة</button><p id="prayerShareStatus" role="status" style="margin:8px 0;line-height:1.8">جاري تجهيز الصورة…</p>';
    const share=panel.querySelector('#prayerShareApps'),save=panel.querySelector('#prayerShareSave'),retry=panel.querySelector('#prayerShareRetry'),status=panel.querySelector('#prayerShareStatus'),preview=panel.querySelector('img');
    let file=null,previewUrl=null,disposed=false,sharing=false;
    panel.aoqatDispose=()=>{disposed=true;if(previewUrl)URL.revokeObjectURL(previewUrl);previewUrl=null;file=null;};
    async function prepare(){
      retry.hidden=true;status.textContent='جاري تجهيز الصورة…';
      try{
        const design=activeDesign();if(!design)throw Error('No active design');
        const canvas=await renderPreview(design),blob=await canvasBlob(canvas,'jpg');
        if(disposed)return;if(!blob)throw Error('Image unavailable');
        file=new File([blob],'prayer-preview.jpg',{type:'image/jpeg'});previewUrl=URL.createObjectURL(blob);preview.src=previewUrl;preview.hidden=false;
        save.disabled=false;
        const supported=!!window.AndroidNative?.sharePrayerImage||!!navigator.share&&!!navigator.canShare&&navigator.canShare({files:[file]});share.disabled=!supported;
        status.textContent=supported?'اختر المشاركة لعرض التطبيقات وطرق المشاركة المتاحة على هاتفك. تبقى هذه الصفحة مفتوحة للمشاركة مرة أخرى.':'يمكنك حفظ الصورة على الجهاز. مشاركة ملفات الصور غير متاحة في هذا المتصفح.';
      }catch(e){if(disposed)return;console.error('Prayer share image',e);status.textContent='تعذر تجهيز الصورة. أعد المحاولة.';retry.hidden=false;}
    }
    share.onclick=async()=>{
      if(!file||sharing)return;sharing=true;share.disabled=true;
      try{if(window.AndroidNative?.sharePrayerImage)await nativeImageAction('sharePrayerImage',file);else await navigator.share({files:[file],title:'مواقيت الصلاة'});if(!disposed)status.textContent='يمكنك مشاركة الصورة مرة أخرى أو حفظها على الجهاز.';}
      catch(e){if(!disposed)status.textContent=e?.name==='AbortError'?'الصورة جاهزة للمشاركة أو الحفظ.':'تعذرت المشاركة. أعد المحاولة أو احفظ الصورة على الجهاز.';}
      finally{sharing=false;if(!disposed)share.disabled=false;}
    };
    save.onclick=async()=>{if(!file)return;save.disabled=true;try{if(window.AndroidNative?.savePrayerImage)await nativeImageAction('savePrayerImage',file);else downloadBlob(file,'jpg');if(!disposed)status.textContent='تم حفظ الصورة على الجهاز. يمكنك مشاركتها أيضاً.';}catch(e){if(!disposed)status.textContent='تعذر الحفظ. امنح إذن الحفظ إذا طُلب، ثم أعد المحاولة.';}finally{if(!disposed)save.disabled=false;}};
    retry.onclick=prepare;Promise.resolve().then(prepare);return panel;
  };

  function fallbackNative(button){bypass=true;try{button.click()}finally{setTimeout(()=>{bypass=false},0)}}
  async function exportExact(format,button,phoneMode=false){
    const design=activeDesign();if(!design)return;
    const oldText=button.textContent;button.disabled=true;button.textContent=phoneMode?"جاري الحفظ...":"جاري التصدير...";
    try{const canvas=await renderPreview(design);if(phoneMode)await saveToPhone(canvas);else await download(canvas,format)}catch(error){console.error("Preview export fallback",error);if(!phoneMode)fallbackNative(button)}finally{setTimeout(()=>{button.disabled=false;button.textContent=oldText},150)}
  }

  window.addEventListener("click",function(event){
    if(bypass)return;
    const btn=event.target.closest?.("[data-export-format],[data-save-phone],#exportBtn");
    if(!btn)return;
    event.preventDefault();event.stopPropagation();event.stopImmediatePropagation();
    const phoneMode=btn.hasAttribute("data-save-phone");
    if(phoneMode&&window.aoqatOpenPrayerShare){window.aoqatOpenPrayerShare();return;}
    exportExact(phoneMode?"jpg":(btn.dataset.exportFormat||"jpg"),btn,phoneMode);
  },true);
})();

;

/* js/modal-panels.js */
"use strict";

(function(){
  const AUTO_KEY="prayerAutoTomorrowEnabledV1";
  const NOTIFY_KEY="prayerTomorrowNotifyEnabledV1";
  const HIJRI_MONTHS=["محرم","صفر","ربيع الأول","ربيع الآخر","جمادى الأولى","جمادى الآخرة","رجب","شعبان","رمضان","شوال","ذو القعدة","ذو الحجة"];
  const DAY_NAMES=["الأحد","الاثنين","الثلاثاء","الأربعاء","الخميس","الجمعة","السبت"];
  let manualOverrideUntil=0;
  let lastAutoMode="";

  function setSelect(id,value){
    const el=document.getElementById(id);
    if(!el) return;
    const wanted=String(value);
    const option=Array.from(el.options||[]).find(o=>o.value===wanted||o.textContent.trim()===wanted);
    if(option) el.value=option.value;
  }

  /* الساعة الحالية تؤخذ من جهاز المستخدم، أما وقت التبديل نفسه فيؤخذ من وقت العشاء المخزن في قاعدة البيانات */
  function currentNowParts(){
    const now=new Date();
    return {
      year:now.getFullYear(),
      month:now.getMonth()+1,
      day:now.getDate(),
      hour:now.getHours(),
      minute:now.getMinutes(),
      second:now.getSeconds()
    };
  }

  function addDays(dateParts,days){
    const d=new Date(dateParts.year,dateParts.month-1,dateParts.day+days,12,0,0);
    return {year:d.getFullYear(),month:d.getMonth()+1,day:d.getDate(),date:d};
  }

  function hijriFor(dateParts){
    try{
      const d=new Date(dateParts.year,dateParts.month-1,dateParts.day,12,0,0);
      const parts=new Intl.DateTimeFormat("en-US-u-ca-islamic-umalqura",{
        year:"numeric",month:"numeric",day:"numeric"
      }).formatToParts(d);
      const out={};
      parts.forEach(p=>{if(p.type!=="literal"&&p.type!=="era") out[p.type]=Number(p.value)});
      return {day:out.day,month:out.month,year:out.year};
    }catch(error){return null;}
  }

  function weekdayFor(dateParts){
    const d=new Date(dateParts.year,dateParts.month-1,dateParts.day,12,0,0);
    return DAY_NAMES[d.getDay()];
  }

  function monthName(month){
    const names=(typeof GREGORIAN_MONTHS!=="undefined"&&Array.isArray(GREGORIAN_MONTHS))?GREGORIAN_MONTHS:["كانون الثاني","شباط","آذار","نيسان","أيار","حزيران","تموز","آب","أيلول","تشرين الأول","تشرين الثاني","كانون الأول"];
    return names[month-1];
  }

  async function fetchAnnualPrayer(month,day){
    if(typeof SUPABASE_URL==="undefined"||typeof dbHeaders!=="function") return null;
    return readAnnualPrayer(month,day);
  }

  function parseIshaMinutes(value){
    const m=String(value||"").trim().match(/^(\d{1,2}):(\d{2})/);
    if(!m) return null;
    let hour=Number(m[1]);
    const minute=Number(m[2]);
    if(hour<12) hour+=12;
    return hour*60+minute;
  }

  async function applyPreviewDate(dateParts,sourceLabel=""){
    const raw=cachedAnnualPrayer(dateParts.month,dateParts.day)||await fetchAnnualPrayer(dateParts.month,dateParts.day);const row=window.AoqatPrayerTimeChoice?.applyRow(raw)||raw;
    if(!row){
      setSwitchStatus(`لا توجد مواقيت محفوظة لتاريخ ${dateParts.day}/${dateParts.month}` ,"error");
      return false;
    }

    setSelect("gregorianDay",dateParts.day);
    setSelect("gregorianMonth",monthName(dateParts.month));
    setSelect("gregorianYear",dateParts.year);
    setSelect("dayName",weekdayFor(dateParts));

    const hijri=hijriFor(dateParts);
    if(hijri){
      setSelect("hijriDay",hijri.day);
      setSelect("hijriMonth",HIJRI_MONTHS[hijri.month-1]);
      setSelect("hijriYear",hijri.year);
    }

    ["fajr","sunrise","dhuhr","asr","maghrib","isha"].forEach(id=>{
      const el=document.getElementById(id);
      if(el&&row[id]!=null){const value=String(row[id]);if(!Array.from(el.options).some(o=>o.value===value))el.add(new Option(value,value));el.value=value;}
    });

    if(typeof updateAll==="function") updateAll();
    document.dispatchEvent(new CustomEvent("prayerPreviewDateChanged",{detail:{date:dateParts,row}}));
    setSwitchStatus(sourceLabel||`المعاينة تعرض ${dateParts.day}/${dateParts.month}/${dateParts.year}`,"success");
    return true;
  }

  function refreshPreviewDayButton(){
    const b=document.getElementById('previewDayToggle');if(!b)return;
    const now=currentNowParts(),next=addDays(now,1);
    const day=Number(document.getElementById('gregorianDay')?.value);
    const year=Number(document.getElementById('gregorianYear')?.value);
    const selected=document.getElementById('gregorianMonth')?.value;
    const tomorrow=day===next.day&&selected===monthName(next.month)&&year===next.year;
    const today=day===now.day&&selected===monthName(now.month)&&year===now.year;
    b.dataset.previewDay=tomorrow?'tomorrow':today?'today':'custom';
    b.textContent=tomorrow?'📅 بيانات اليوم التالي':today?'📅 بيانات اليوم':'📅 بيانات اليوم / بيانات اليوم التالي';
    b.setAttribute('aria-pressed',String(tomorrow));
    b.setAttribute('aria-label',tomorrow?'بيانات اليوم التالي — اضغط للرجوع إلى بيانات اليوم':today?'بيانات اليوم — اضغط لعرض بيانات اليوم التالي':'اضغط للرجوع إلى بيانات اليوم');
  }
  function setSwitchStatus(message,type=""){
    refreshPreviewDayButton();
    const el=document.getElementById("tomorrowSwitchStatus");
    if(!el) return;
    el.textContent=message;
    el.className="tomorrow-switch-status"+(type?` ${type}`:"");
  }

  function autoEnabled(){return localStorage.getItem(AUTO_KEY)==="1";}
  function notifyEnabled(){return localStorage.getItem(NOTIFY_KEY)==="1";}

  function refreshToggleButtons(){
    const autoBtn=document.getElementById("autoTomorrowToggle");
    const notifyBtn=document.getElementById("tomorrowNotifyToggle");
    if(autoBtn){
      const on=autoEnabled();
      autoBtn.textContent=on?"🟢 التبديل التلقائي: تشغيل":"⚪ التبديل التلقائي: إيقاف";
      autoBtn.classList.toggle("enabled",on);
      autoBtn.classList.toggle("is-on",on);
      autoBtn.setAttribute("aria-pressed",String(on));
      autoBtn.dataset.enabled=String(on);
    }
    if(notifyBtn){
      const on=notifyEnabled()&&typeof Notification!=="undefined"&&Notification.permission==="granted";
      notifyBtn.textContent=on?"🔔 التنبيه: تشغيل":"🔕 التنبيه: إيقاف";
      notifyBtn.classList.toggle("enabled",on);
      notifyBtn.classList.toggle("is-on",on);
      notifyBtn.setAttribute("aria-pressed",String(on));
      notifyBtn.dataset.enabled=String(on);
    }
  }

  async function sendTomorrowNotification(){
    if(!notifyEnabled()||typeof Notification==="undefined"||Notification.permission!=="granted") return;
    try{
      if(navigator.serviceWorker?.ready){
        const reg=await navigator.serviceWorker.ready;
        await reg.showNotification("تقاويم الصلاة",{body:"تم تجهيز مواقيت اليوم التالي للمعاينة والنشر.",icon:"/assets/icons/app-icon.svg"});
      }else{
        new Notification("تقاويم الصلاة",{body:"تم تجهيز مواقيت اليوم التالي للمعاينة والنشر."});
      }
    }catch(error){console.error(error);}
  }

  async function evaluateAutoSwitch(force=false){
    if(!autoEnabled()||Date.now()<manualOverrideUntil) return;
    try{
      const now=currentNowParts();
      const today={year:now.year,month:now.month,day:now.day};
      const todayRow=await fetchAnnualPrayer(today.month,today.day);
      if(!todayRow){setSwitchStatus("تعذر قراءة وقت العشاء لليوم من قاعدة البيانات","error");return;}
      const isha=parseIshaMinutes(todayRow.isha);
      if(isha==null){setSwitchStatus("وقت العشاء المخزن في قاعدة البيانات غير صالح","error");return;}

      const nowMinutes=now.hour*60+now.minute;
      const switchMinutes=isha+35;
      const shouldTomorrow=nowMinutes>=switchMinutes;
      const desired=shouldTomorrow?"tomorrow":"today";
      const target=shouldTomorrow?addDays(today,1):today;

      const shownDay=Number(document.getElementById("gregorianDay")?.value);
      const shownMonth=((typeof GREGORIAN_MONTHS!=="undefined")?GREGORIAN_MONTHS:[]).indexOf(document.getElementById("gregorianMonth")?.value)+1;
      const shownYear=Number(document.getElementById("gregorianYear")?.value);
      const alreadyTarget=shownDay===target.day&&shownMonth===target.month&&shownYear===target.year;

      const switchHour=Math.floor(switchMinutes/60)%24;
      const switchMinute=switchMinutes%60;
      const switchText=`${String(switchHour).padStart(2,"0")}:${String(switchMinute).padStart(2,"0")}`;

      if(force||!alreadyTarget||lastAutoMode!==desired){
        const changed=await applyPreviewDate(target,shouldTomorrow?`تم عرض مواقيت اليوم التالي تلقائياً بعد وقت العشاء المخزن بقاعدة البيانات بـ35 دقيقة`:`المعاينة تعرض مواقيت اليوم. التبديل حسب وقت العشاء المخزن بقاعدة البيانات الساعة ${switchText}`);
        if(changed&&shouldTomorrow&&lastAutoMode&&lastAutoMode!=="tomorrow") sendTomorrowNotification();
      }else{
        setSwitchStatus(shouldTomorrow?"المعاينة الآن تعرض مواقيت اليوم التالي تلقائياً":`المعاينة تعرض مواقيت اليوم. التبديل حسب وقت العشاء المخزن بقاعدة البيانات الساعة ${switchText}` ,"success");
      }
      lastAutoMode=desired;
    }catch(error){
      console.error("تعذر تنفيذ التبديل التلقائي",error);
      setSwitchStatus("تعذر تنفيذ التبديل التلقائي","error");
    }
  }

  async function showTomorrowManual(){
    const now=currentNowParts();
    manualOverrideUntil=Date.now()+10*60*1000;
    await applyPreviewDate(addDays({year:now.year,month:now.month,day:now.day},1),"تم عرض مواقيت اليوم التالي يدويًا");
  }

  async function showTodayManual(){
    const now=currentNowParts();
    manualOverrideUntil=Date.now()+10*60*1000;
    await applyPreviewDate({year:now.year,month:now.month,day:now.day},"تم الرجوع إلى مواقيت اليوم يدويًا");
  }

  function createSwitchPanel(mainPanel){
    let panel=document.getElementById("switchPanel");
    let button=mainPanel.querySelector('[data-open-panel="switchPanel"]');
    if(!button){
      button=document.createElement("button");
      button.type="button";
      button.className="main-action switch-action";
      button.dataset.openPanel="switchPanel";
      button.innerHTML="⏰ <span>التبديل والتنبيه</span>";
      mainPanel.appendChild(button);
    }
    if(!panel){
      panel=document.createElement("section");
      panel.id="switchPanel";
      panel.className="panel inline-control-panel";
      panel.innerHTML=`
        <div class="switch-help">يتم تجهيز صورة اليوم التالي تلقائيًا بعد وقت صلاة العشاء المخزن في قاعدة البيانات بـ 35 دقيقة.</div>
        <button type="button" id="autoTomorrowToggle" class="switch-control-btn"></button>
        ${!window.AndroidNative?.configureAdhan?'<button type="button" id="previewDayToggle" class="switch-control-btn manual"></button>':''}
        <button type="button" id="showTomorrowNowBtn" class="switch-control-btn manual">➡ عرض اليوم التالي الآن</button>
        <button type="button" id="showTodayNowBtn" class="switch-control-btn manual secondary">↩ الرجوع إلى اليوم</button>
        <div id="tomorrowSwitchStatus" class="tomorrow-switch-status">التبديل التلقائي متوقف</div>`;
      button.insertAdjacentElement("afterend",panel);
    }
    return {button,panel};
  }

  function initInlinePanels(){
    if(document.getElementById("inlinePanelStyles")) return;

    const sidebar=document.querySelector(".sidebar");
    const mainPanel=sidebar?.querySelector(".main-panel");
    if(!sidebar||!mainPanel) return;

    const fontPanel=document.querySelector(".font-panel");
    if(fontPanel&&!fontPanel.id) fontPanel.id="fontPanel";

    let fontButton=mainPanel.querySelector('[data-open-panel="fontPanel"]');
    if(fontPanel&&!fontButton){
      fontButton=document.createElement("button");
      fontButton.type="button";
      fontButton.className="main-action font-action";
      fontButton.dataset.openPanel="fontPanel";
      fontButton.innerHTML="🔤 <span>تنسيق الخط</span>";
      mainPanel.appendChild(fontButton);
    }

    createSwitchPanel(mainPanel);

    const pairs=[
      {button:'[data-open-panel="datePanel"]',panel:"datePanel"},
      {button:'[data-open-panel="prayerPanel"]',panel:"prayerPanel"},
      {button:'[data-open-panel="backgroundPanel"]',panel:"backgroundPanel"},
      {button:'[data-open-panel="footerPanel"]',panel:"footerPanel"},
      {button:'[data-open-panel="fontPanel"]',panel:"fontPanel"},
      {button:'[data-open-panel="switchPanel"]',panel:"switchPanel"}
    ];

    const style=document.createElement("style");
    style.id="inlinePanelStyles";
    style.textContent=`
      .main-action.font-action{background:#0f8b8d}.main-action.switch-action{background:#a26a13}
      .inline-control-panel{display:none!important;width:100%!important;margin:7px 0 3px!important;padding:12px!important;border:1px solid rgba(255,255,255,.14)!important;border-radius:9px!important;background:rgba(5,20,30,.78)!important;box-shadow:inset 0 1px 0 rgba(255,255,255,.04)!important}
      .inline-control-panel.inline-open{display:block!important}.inline-control-panel>.panel-title,.inline-control-panel>.font-title{display:none!important}.inline-control-panel.collapsed>*:not(.panel-title):not(.font-title){display:revert!important}.main-action.inline-active{filter:brightness(1.12);box-shadow:0 0 0 2px rgba(255,255,255,.16)}
      #fontPanel .font-controls{display:grid!important;grid-template-columns:1fr!important;gap:8px!important}#fontPanel label{margin-bottom:4px!important}
      .switch-help{font-size:12px;line-height:1.8;color:#d7e2e8;margin-bottom:9px;padding:8px;border-radius:7px;background:rgba(255,255,255,.045)}
      .switch-control-btn{width:100%;min-height:40px;margin:5px 0;border:1px solid rgba(255,255,255,.16);border-radius:8px;background:#70817f!important;border-color:#859593!important;color:#fff!important;font-weight:700;cursor:pointer}.switch-control-btn.enabled,.switch-control-btn.is-on,.switch-control-btn[aria-pressed="true"],.switch-control-btn[data-enabled="true"]{background:linear-gradient(135deg,#078b46,#10a95b)!important;border-color:#08753e!important;color:#fff!important}.switch-control-btn.manual{background:#176f9f}.switch-control-btn.manual.secondary{background:#45515b}.tomorrow-switch-status{margin-top:8px;padding:8px;border-radius:7px;background:rgba(255,255,255,.05);font-size:12px;line-height:1.7;color:#dce6eb}.tomorrow-switch-status.success{border-right:3px solid #23b66d}.tomorrow-switch-status.error{border-right:3px solid #d34d4d}
      .sidebar>.drag-info{width:100%!important;margin:0!important;display:flex!important;flex-direction:column!important;gap:7px!important;padding:10px!important}.sidebar>.drag-info span{display:none!important}.sidebar>.drag-info button{width:100%!important;min-width:0!important}
      @media(max-width:800px){.sidebar{gap:8px!important}.sidebar>.main-panel{padding:10px!important}.inline-control-panel{padding:10px!important;margin:6px 0 2px!important}.inline-control-panel label{margin-bottom:10px!important;font-size:13px!important}.inline-control-panel select,.inline-control-panel input[type="text"],.inline-control-panel input[type="number"],.inline-control-panel textarea{min-height:40px!important;font-size:14px!important}.inline-control-panel textarea{min-height:76px!important}#fontPanel .font-controls{grid-template-columns:1fr!important}}
    `;
    document.head.appendChild(style);

    const closeAll=except=>{
      pairs.forEach(item=>{
        const btn=mainPanel.querySelector(item.button);const pnl=document.getElementById(item.panel);
        if(!pnl||pnl===except) return;
        pnl.classList.remove("inline-open","active-panel","collapsed");btn?.classList.remove("inline-active");
      });
    };

    pairs.forEach(item=>{
      const button=mainPanel.querySelector(item.button);const panel=document.getElementById(item.panel);
      if(!button||!panel) return;
      panel.classList.add("inline-control-panel");panel.classList.remove("active-panel","collapsed");button.insertAdjacentElement("afterend",panel);
      button.addEventListener("click",event=>{
        event.preventDefault();event.stopImmediatePropagation();
        const willOpen=!panel.classList.contains("inline-open");closeAll(panel);panel.classList.toggle("inline-open",willOpen);panel.classList.toggle("active-panel",willOpen);button.classList.toggle("inline-active",willOpen);
        if(willOpen&&window.innerWidth<=800) setTimeout(()=>button.scrollIntoView({behavior:"smooth",block:"start"}),40);
      },true);
    });

    const dragInfo=document.querySelector(".workspace .drag-info");if(dragInfo) sidebar.appendChild(dragInfo);

    document.getElementById("autoTomorrowToggle")?.addEventListener("click",()=>{
      localStorage.setItem(AUTO_KEY,autoEnabled()?"0":"1");manualOverrideUntil=0;refreshToggleButtons();if(autoEnabled()){setSwitchStatus("جاري تحديث حالة التبديل التلقائي...","success");evaluateAutoSwitch(true);}else setSwitchStatus("التبديل التلقائي متوقف");
    });
    document.getElementById("tomorrowNotifyToggle")?.addEventListener("click",async()=>{
      if(notifyEnabled()){localStorage.setItem(NOTIFY_KEY,"0");refreshToggleButtons();return;}
      if(typeof Notification==="undefined"){setSwitchStatus("هذا المتصفح لا يدعم التنبيهات","error");return;}
      const permission=await Notification.requestPermission();
      if(permission==="granted"){localStorage.setItem(NOTIFY_KEY,"1");setSwitchStatus("تم تشغيل التنبيه","success");}else{localStorage.setItem(NOTIFY_KEY,"0");setSwitchStatus("لم يتم السماح بإشعارات التطبيق","error");}
      refreshToggleButtons();
    });
    document.getElementById('previewDayToggle')?.addEventListener('click',async()=>{
      const b=document.getElementById('previewDayToggle');if(b.disabled)return;b.disabled=true;
      try{refreshPreviewDayButton();if(b.dataset.previewDay==='today')await showTomorrowManual();else await showTodayManual();}
      finally{b.disabled=false;refreshPreviewDayButton();}
    });
    if(!window.AndroidNative?.configureAdhan){
      const style=document.createElement('style');style.textContent='#showTomorrowNowBtn,#showTodayNowBtn{display:none!important}';document.head.appendChild(style);
      document.addEventListener('prayerPreviewDateChanged',refreshPreviewDayButton);
      ['gregorianDay','gregorianMonth','gregorianYear'].forEach(id=>document.getElementById(id)?.addEventListener('change',refreshPreviewDayButton));
      refreshPreviewDayButton();
    }
    document.getElementById("showTomorrowNowBtn")?.addEventListener("click",showTomorrowManual);
    document.getElementById("showTodayNowBtn")?.addEventListener("click",showTodayManual);

    refreshToggleButtons();
    if(autoEnabled()) evaluateAutoSwitch(true);
    setInterval(()=>{refreshPreviewDayButton();if(autoEnabled()) evaluateAutoSwitch(false);},60000);
    window.addEventListener("focus",()=>{refreshPreviewDayButton();if(autoEnabled()) evaluateAutoSwitch(false);});
    document.addEventListener("visibilitychange",()=>{if(!document.hidden){refreshPreviewDayButton();if(autoEnabled()) evaluateAutoSwitch(false);}});
  }

  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",initInlinePanels,{once:true});
  else initInlinePanels();
})();


;

/* js/tomorrow-alarm.js */
(function(){'use strict';
 const N=window.AndroidNative;if(!N?.enableAlarm)return;
 window.aoqatNativePublishAlarm=true;
 const KEY='aoqatAndroidPublishAlarmEnabled';
 let enabled=!!N.readPublishAlarmEnabled(localStorage.getItem(KEY)==='1');
 localStorage.setItem(KEY,enabled?'1':'0');
 // Native Android is the only audio/snooze owner. No WebAudio or browser alarm survives in the APK.
 window.PrayerTomorrowAlarm={stop:()=>N.stopPublishAlarm?.()};
 function mount(){const panel=document.getElementById('switchPanel');if(!panel||document.getElementById('tomorrowAlarmEnable'))return;
  const b=document.createElement('button');b.id='tomorrowAlarmEnable';b.type='button';b.dataset.androidNativeAlarm='1';
  function draw(){b.setAttribute('aria-pressed',String(enabled));b.dataset.enabled=String(enabled);b.dataset.androidAlarmEnabled=enabled?'1':'0';b.className='switch-control-btn'+(enabled?' enabled is-on':'');b.textContent='🔔 تنبيه النشر على الهاتف: '+(enabled?'تشغيل':'إيقاف');}
  b.onclick=()=>{enabled=!enabled;localStorage.setItem(KEY,enabled?'1':'0');if(enabled)N.enableAlarm();else N.disableAlarm();draw();};
  panel.insertBefore(b,document.getElementById('tomorrowSwitchStatus'));draw();
  const label=document.createElement('label');label.textContent='مدة غفوة تنبيه النشر';
  const select=document.createElement('select');select.id='publishSnoozeMinutes';
  for(let m=1;m<=30;m++)select.add(new Option(m+' دقائق',m));
  select.value=String(N.readPublishSnoozeMinutes?.()||10);
  select.onchange=()=>N.configurePublishSnoozeMinutes?.(Number(select.value));label.append(select);b.after(label);
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();window.addEventListener('aoqatModulesReady',mount);
})();

;

/* js/push-notifications.js */
/* APK uses native publish notifications. */
;

/* js/adhan-core.js */
/* Shared prayer time semantics: the database uses 12-hour afternoon values. */
(function (root) {
  "use strict";
  const ids = ["fajr", "dhuhr", "asr", "maghrib", "isha"];
  function minutes(value, id) {
    const m = String(value || "").match(/^(\d{1,2}):(\d{2})/);
    if (!m) return null;
    let h = +m[1],
      n = +m[2];
    if (h > 23 || n > 59) return null;
    if (["asr", "maghrib", "isha"].includes(id) && h < 12) h += 12;
    if (["fajr", "sunrise"].includes(id) && h === 12) h = 0;
    return h * 60 + n;
  }
  function fridayDefaults(){return {enabled:false,reminder:15,sermon:35,firstSound:true,secondSound:true,quiet:true,quietMode:'silent',quietTiming:'default',quietBefore:15};}
  function normalizeFriday(raw={}){const d=fridayDefaults();d.enabled=raw?.enabled===true;d.quiet=raw?.quiet!==false;for(const k of ['firstSound','secondSound'])d[k]=raw?.[k]!==false;for(const [k,min,max] of [['reminder',1,180],['sermon',1,120],['quietBefore',0,180]]){const n=Number(raw?.[k]);if(Number.isFinite(n))d[k]=Math.max(min,Math.min(max,Math.floor(n)));}if(raw?.quietMode==='dnd')d.quietMode='dnd';if(raw?.quietTiming==='custom')d.quietTiming='custom';return d;}
  function fridayTimeline(at,raw){const f=normalizeFriday(raw);return {first:at-15*60000,second:at,start:at-(15+f.reminder)*60000,end:at+f.sermon*60000,quietStart:at-(15+(f.quietTiming==='custom'?f.quietBefore:15))*60000};}
  function fridayFrame(at,now,raw){const f=normalizeFriday(raw),t=fridayTimeline(at,f);if(!f.enabled||now<t.start||now>=t.end)return null;if(now<t.first)return {label:'باقي على أذان الجمعة الأول',seconds:Math.ceil((t.first-now)/1000),down:true,base:t.first,next:t.first};if(now<t.second)return {label:'باقي على الخطبة',seconds:Math.ceil((t.second-now)/1000),down:true,base:t.second,next:t.second};return {label:'مضى على الخطبة',seconds:Math.floor((now-t.second)/1000),down:false,base:t.second,next:t.end};}
  function fridayAt(rows,now=new Date()){if(now.getDay()!==5)return null;const r=rows.find(r=>+r.gregorian_month===now.getMonth()+1&&+r.gregorian_day===now.getDate()),m=minutes(r?.dhuhr,'dhuhr');return m===null?null:new Date(now.getFullYear(),now.getMonth(),now.getDate(),0,m).getTime();}
  function fridayQuietWindow(rows,now,settings){const f=normalizeFriday(settings?.friday),at=fridayAt(rows,now);if(!f.enabled||!f.quiet||at===null)return null;const t=fridayTimeline(at,f);return +now>=t.quietStart&&+now<t.end?{prayerId:'friday',start:t.quietStart,end:t.end}:null;}
  function defaults() {
    return {
      friday: fridayDefaults(),
      enabled: false,
      sound: "1",
      volume: 80,
      partial: false,
      customEnd: 35,
      overrideSilent: false,
      vibrate: false,
      pattern: "short",
      screen: false,
      flip: false,
      persistent: false,
      reminder: 0,
      suhoor: 0,
      widget: "transparent",
      afterSilent: 0,
      afterIqamaSilent: {
        enabled: false,
        minutes: Object.fromEntries(ids.map((id) => [id, 0])),
      },
      modes: Object.fromEntries([...ids, "friday"].map((id) => [id, "sound"])),
    };
  }
  function normalize(raw) {
    const d = defaults(),
      s = raw && typeof raw === "object" ? raw : {};
    for (const k of [
      "enabled",
      "partial",
      "overrideSilent",
      "vibrate",
      "screen",
      "flip",
      "persistent",
    ])
      d[k] = s[k] === true;
    for (const [k, max] of [
      ["volume", 100],
      ["customEnd", 180],
      ["reminder", 60],
      ["suhoor", 120],
      ["afterSilent", 60],
    ]) {
      const n = Number(s[k]);
      if (Number.isFinite(n)) d[k] = Math.max(0, Math.min(max, n));
    }
    if (["1", "2", "3", "4", "custom"].includes(s.sound)) d.sound = s.sound;
    if (["short", "long", "pulse"].includes(s.pattern)) d.pattern = s.pattern;
    if (["transparent", "light", "dark"].includes(s.widget))
      d.widget = s.widget;
    for (const id of [...ids, "friday"])
      if (["sound", "vibrate", "silent"].includes(s.modes?.[id]))
        d.modes[id] = s.modes[id];
    d.afterIqamaSilent.enabled = s.afterIqamaSilent?.enabled === true;
    for (const id of ids) {
      const n = Number(s.afterIqamaSilent?.minutes?.[id]);
      if (Number.isFinite(n))
        d.afterIqamaSilent.minutes[id] = Math.max(0, Math.min(120, Math.floor(n)));
    }
    d.friday = normalizeFriday(s.friday);
    return d;
  }
  function events(rows, now = new Date(), settings) {
    const out = [];
    for (let offset = 0; offset < 2; offset++) {
      const date = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() + offset,
      );
      const r = rows.find(
        (r) =>
          +r.gregorian_month === date.getMonth() + 1 &&
          +r.gregorian_day === date.getDate(),
      );
      if (r)
        for (const id of ids) {
          const min = minutes(r[id], id);
          if (min !== null)
            out.push({
              id,
              at: new Date(
                date.getFullYear(),
                date.getMonth(),
                date.getDate(),
                0,
                min,
              ).getTime(),
              friday: id === "dhuhr" && date.getDay() === 5,
            });
        }
    }
    if(settings?.friday?.enabled){const custom=[];for(const e of out){if(!e.friday){custom.push(e);continue;}custom.push({...e,id:'fridayFirst',at:e.at-15*60000,customFriday:true},{...e,id:'fridaySecond',customFriday:true});}return custom.sort((a,b)=>a.at-b.at);}
    return out.sort((a, b) => a.at - b.at);
  }
  function displayDate(rows, now = new Date()) {
    const date = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const row = rows.find(r => +r.gregorian_month === date.getMonth() + 1 && +r.gregorian_day === date.getDate());
    const isha = minutes(row?.isha, "isha");
    if (isha !== null && +now >= +date + (isha + 35) * 60000) date.setDate(date.getDate() + 1);
    return date;
  }
  function afterIqamaSilentWindow(rows, now, settings, iqamaMinutes = {}) {
    const s = normalize(settings);
    if (!s.enabled || !s.afterIqamaSilent.enabled) return null;
    // Include yesterday so an evening window can finish after midnight.
    const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
    const candidates = events(rows, yesterday).concat(events(rows, now));
    const active = [];
    const seen = new Set();
    for (const prayer of candidates) {
      if (prayer.friday && s.friday.enabled) continue;
      const key = prayer.id + ":" + prayer.at;
      if (seen.has(key)) continue;
      seen.add(key);
      const duration = s.afterIqamaSilent.minutes[prayer.id];
      const savedIqama = Number(iqamaMinutes[prayer.id]);
      const before = [5, 10, 15, 20, 25, 30].includes(savedIqama)
        ? savedIqama : prayer.id === "fajr" ? 20 : 10;
      const start = prayer.at + before * 60000;
      const end = start + duration * 60000;
      if (duration > 0 && +now >= start && +now < end)
        active.push({ prayerId: prayer.id, start, end });
    }
    if (!active.length) return null;
    active.sort((a, b) => b.start - a.start);
    return { ...active[0], end: Math.max(...active.map((w) => w.end)) };
  }
  const api = { ids, minutes, defaults, normalize, events, displayDate, afterIqamaSilentWindow, fridayDefaults, normalizeFriday, fridayTimeline, fridayFrame, fridayAt, fridayQuietWindow };
  root.AoqatAdhanCore = api;
  if (typeof module !== "undefined") module.exports = api;
})(typeof window === "undefined" ? globalThis : window);


;

/* js/azkar.js */
window.AoqatAzkar = (function () {
  const protection = [
    {
      text: "قُلْ هُوَ اللَّهُ أَحَدٌ ۝ اللَّهُ الصَّمَدُ ۝ لَمْ يَلِدْ وَلَمْ يُولَدْ ۝ وَلَمْ يَكُنْ لَهُ كُفُوًا أَحَدٌ",
      count: 3,
      ref: "سورة الإخلاص؛ أبو داود 5082",
    },
    {
      text: "قُلْ أَعُوذُ بِرَبِّ الْفَلَقِ ۝ مِنْ شَرِّ مَا خَلَقَ ۝ وَمِنْ شَرِّ غَاسِقٍ إِذَا وَقَبَ ۝ وَمِنْ شَرِّ النَّفَّاثَاتِ فِي الْعُقَدِ ۝ وَمِنْ شَرِّ حَاسِدٍ إِذَا حَسَدَ",
      count: 3,
      ref: "سورة الفلق؛ أبو داود 5082",
    },
    {
      text: "قُلْ أَعُوذُ بِرَبِّ النَّاسِ ۝ مَلِكِ النَّاسِ ۝ إِلَٰهِ النَّاسِ ۝ مِنْ شَرِّ الْوَسْوَاسِ الْخَنَّاسِ ۝ الَّذِي يُوَسْوِسُ فِي صُدُورِ النَّاسِ ۝ مِنَ الْجِنَّةِ وَالنَّاسِ",
      count: 3,
      ref: "سورة الناس؛ أبو داود 5082",
    },
  ];
  const common = [
    ...protection,
    {
      text: "بِسْمِ اللَّهِ الَّذِي لَا يَضُرُّ مَعَ اسْمِهِ شَيْءٌ فِي الْأَرْضِ وَلَا فِي السَّمَاءِ وَهُوَ السَّمِيعُ الْعَلِيمُ",
      count: 3,
      ref: "أبو داود 5088؛ الترمذي 3388",
    },
    {
      text: "سُبْحَانَ اللَّهِ وَبِحَمْدِهِ",
      count: 100,
      ref: "صحيح مسلم 2692",
    },
  ];
  return {
    morning: [
      {
        text: "اللَّهُمَّ بِكَ أَصْبَحْنَا وَبِكَ أَمْسَيْنَا وَبِكَ نَحْيَا وَبِكَ نَمُوتُ وَإِلَيْكَ النُّشُورُ",
        count: 1,
        ref: "أبو داود 5068",
      },
      ...common,
    ],
    evening: [
      {
        text: "اللَّهُمَّ بِكَ أَمْسَيْنَا وَبِكَ أَصْبَحْنَا وَبِكَ نَحْيَا وَبِكَ نَمُوتُ وَإِلَيْكَ الْمَصِيرُ",
        count: 1,
        ref: "أبو داود 5068",
      },
      ...common,
    ],
    prayer: [
      { text: "أَسْتَغْفِرُ اللَّهَ", count: 3, ref: "صحيح مسلم 591" },
      {
        text: "اللَّهُمَّ أَنْتَ السَّلَامُ وَمِنْكَ السَّلَامُ تَبَارَكْتَ يَا ذَا الْجَلَالِ وَالْإِكْرَامِ",
        count: 1,
        ref: "صحيح مسلم 591",
      },
      { text: "سُبْحَانَ اللَّهِ", count: 33, ref: "صحيح مسلم 597" },
      { text: "الْحَمْدُ لِلَّهِ", count: 33, ref: "صحيح مسلم 597" },
      { text: "اللَّهُ أَكْبَرُ", count: 33, ref: "صحيح مسلم 597" },
      {
        text: "لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ",
        count: 1,
        ref: "صحيح مسلم 597",
      },
    ],
  };
})();

;

/* js/friday-sunnah-data.js */
(function(root){'use strict';
  // Descriptions, not verbatim hadith quotations. Each card links its evidence.
  const card=(text,ref,source,note='')=>({text,ref,source,note,info:true,count:null});
  root.AoqatFridaySunnah=[
    card('الإكثار من الصلاة على النبي ﷺ.','سنن أبي داود 1047؛ صححه الألباني','https://dorar.net/hadith/sharh/63690','من غير تقييد بعدد مخصوص للجمعة.'),
    card('قراءة سورة الكهف يوم الجمعة.','فتوى ابن باز: وقت قراءة سورة الكهف','https://binbaz.org.sa/fatwas/11148','وقت القراءة واسع خلال نهار الجمعة؛ لا ساعة معينة ثبت أنها أفضل. أحاديث فضلها مختلف في تصحيحها، وثبت فعلها عن بعض الصحابة.'),
    card('الاغتسال، واستعمال السواك والتطيّب لصلاة الجمعة.','صحيح مسلم 846','https://sunnah.com/muslim:846b','غسل الجمعة مؤكد، واختلف العلماء في وجوبه؛ لا يُعرض هنا باعتباره مستحباً فقط.'),
    card('لبس الثياب الحسنة والنظيفة.','سنن أبي داود 1078؛ صحيح','https://sunnah.com/abudawud:1078'),
    card('التبكير إلى المسجد لصلاة الجمعة.','صحيح البخاري 881','https://sunnah.com/bukhari:881'),
    card('الصلاة مما تيسّر قبل الخطبة، وعدم إيذاء المصلّين.','صحيح البخاري 883','https://sunnah.com/bukhari:883'),
    card('الإنصات والاستماع للخطبة.','صحيح البخاري 883','https://sunnah.com/bukhari:883','الإنصات من آداب الجمعة المؤكدة، ولا يُصنّف كل ما في هذا القسم على أنه نافلة.'),
    card('الصلاة بعد الجمعة أربع ركعات، أو ركعتين في البيت.','صحيح مسلم 881','https://sunnah.com/muslim:881a','وردت أيضاً ركعتان في البيت؛ صحيح البخاري 937. يُعمل بالوارد من غير إنكار للخلاف.'),
    card('الإكثار من الدعاء وتحرّي ساعة الإجابة.','صحيح البخاري 935؛ صحيح مسلم 852','https://dorar.net/hadith/sharh/13753','اختلف العلماء في تحديد ساعة الإجابة؛ لا تُحصر في وقت مقطوع به.')
  ];
})(typeof window==='undefined'?globalThis:window);

;

/* js/azkar-reminders-core.js */
(function(root){'use strict';
  const ids=['morning','evening','prayer','sleep','waking','tasbih'];
  const prayers=['fajr','dhuhr','asr','maghrib','isha'];
  const titles={morning:'أذكار الصباح',evening:'أذكار المساء',prayer:'أذكار بعد الصلاة',sleep:'أذكار النوم',waking:'أذكار الاستيقاظ',tasbih:'التسبيح والاستغفار والصلاة على النبي ﷺ'};
  const iqamaDefaults={fajr:20,dhuhr:10,asr:10,maghrib:10,isha:10};
  const clocks={morning:['06:00'],evening:['17:00'],prayer:['05:30','12:30','15:30','18:30','20:00'],sleep:['22:00'],waking:['07:00'],tasbih:['09:00','16:00']};
  function clock(v){const m=/^(\d{2}):(\d{2})$/.exec(String(v));return m&&+m[1]<24&&+m[2]<60?+m[1]*60+(+m[2]):null;}
  function minutes(v,id){const m=/^(\d{1,2}):([0-5]\d)(?::[0-5]\d)?$/.exec(String(v));if(!m||+m[1]>23)return null;let h=+m[1];if(['asr','maghrib','isha'].includes(id)&&h<12)h+=12;if(id==='fajr'&&h===12)h=0;return h*60+(+m[2]);}
  function normalize(raw={}){return Object.fromEntries(ids.map(id=>{const r=raw?.[id],n=Number(r?.offset);return [id,{enabled:r?.enabled!==false,mode:r?.mode==='custom'?'custom':'default',type:r?.type==='clock'?'clock':'relative',offset:Number.isInteger(n)&&n>=-120&&n<=120?n:0,times:clocks[id].map((v,i)=>clock(r?.times?.[i])!==null?r.times[i]:v)}];}));}
  function day(now){const p=Object.fromEntries(new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Baghdad',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now).map(x=>[x.type,x.value]));const key=p.year+'-'+p.month+'-'+p.day;return {key,month:+p.month,day:+p.day,start:+new Date(key+'T00:00:00+03:00')};}
  function duration(raw,id,fallback){const n=raw?.[id];return Number.isInteger(n)&&n>=0&&n<=120?n:fallback;}
  // row is already transformed by the application's prayer-time choice exactly once.
  function events(now,raw,row,iqama={},after={}){const d=day(now),s=normalize(raw),out=[];
    const valid=row&&+row.gregorian_month===d.month&&+row.gregorian_day===d.day;
    const prayer=id=>valid?minutes(row[id],id):null;
    const finish=id=>{const t=prayer(id);return t===null?null:t+duration(iqama,id,iqamaDefaults[id])+duration(after,id,10);};
    const add=(id,slot,t)=>{if(t===null||!Number.isFinite(t))return;out.push({kind:'azkar-reminder',section:'azkar',topicId:id,key:'azkar:'+id+':'+d.key+':'+slot,at:d.start+t*60000,title:'تذكير: '+titles[id],body:'حان وقت '+titles[id]+'. اضغط لفتح الأذكار.'});};
    for(const id of ids){const v=s[id];if(!v.enabled)continue;
      if(id==='sleep'||id==='waking'||v.mode==='custom'&&v.type==='clock'){(v.mode==='default'?clocks[id]:v.times).forEach((t,i)=>add(id,i,clock(t)));continue;}
      const offset=v.mode==='custom'?v.offset:0;
      const shift=t=>t===null?null:t+offset;
      if(id==='morning')add(id,0,shift(finish('fajr')));
      if(id==='evening'){const t=prayer('maghrib');add(id,0,t===null?null:t-20+offset);}
      if(id==='prayer')prayers.forEach(p=>add(id,p,shift(finish(p))));
      if(id==='tasbih'){const t=prayer('sunrise');add(id,0,t===null?null:t+120+offset);add(id,1,shift(finish('asr')));}
    }return out.sort((a,b)=>a.at-b.at);
  }
  const api={ids,prayers,titles,clocks,clock,minutes,day,normalize,events};root.AoqatAzkarRemindersCore=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window==='undefined'?globalThis:window);

;

/* js/azkar-reminders.js */
(function(){'use strict';

  const C=window.AoqatAzkarRemindersCore,KEY='aoqatAzkarRemindersV1',SENT='aoqatAzkarRemindersSentV1';
  const names=['الفجر','الظهر','العصر','المغرب','العشاء'];
  const descriptions={morning:'بعد صلاة الفجر: وقت الإقامة + مدة الصلاة المحددين في التطبيق.',evening:'قبل أذان المغرب بـ20 دقيقة.',prayer:'بعد كل صلاة: وقت الإقامة + مدة الصلاة المحددين في التطبيق.',sleep:'الساعة 10 مساءً.',waking:'الساعة 7 صباحاً.',tasbih:'بعد الشروق بساعتين، وبعد صلاة العصر حسب أوقات الإقامة ومدة الصلاة.'};
  function json(key,fallback){try{return JSON.parse(localStorage.getItem(key)||'null')??fallback;}catch(_){return fallback;}}
  function read(){return C.normalize(json(KEY,{}));}
  let settings=read(),audio;
  function unlock(){try{const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;if(!audio)audio=new AC();if(audio.state==='suspended')audio.resume().catch(()=>{});}catch(_){}}
  document.addEventListener('pointerdown',unlock,{passive:true});
  function chime(){if(audio?.state!=='running')return;try{const t=audio.currentTime;[660,880].forEach((f,i)=>{const o=audio.createOscillator(),g=audio.createGain();o.frequency.value=f;g.gain.setValueAtTime(0,t+i*.16);g.gain.linearRampToValueAtTime(.12,t+i*.16+.01);g.gain.exponentialRampToValueAtTime(.001,t+i*.16+.16);o.connect(g);g.connect(audio.destination);o.start(t+i*.16);o.stop(t+i*.16+.17);});}catch(_){}}
  function currentEvents(now=new Date()){
    const out=[];for(const date of [new Date(+now-86400000),now]){const d=C.day(date);let row=typeof cachedAnnualPrayer==='function'?cachedAnnualPrayer(d.month,d.day):null;if(row)row=window.AoqatPrayerTimeChoice?.applyRow(row)||row;out.push(...C.events(date,settings,row,json('aoqatIqamaMinutesV1',{}),json('aoqatAfterIqamaMinutesV1',{})));}return out;
  }
  let pendingKind='';
  function flushOpen(){if(!pendingKind||!window.aoqatUIReady||!window.aoqatOpenMuslimBagSection )return;const kind=pendingKind;pendingKind='';document.body.classList.add('design-menu-open');window.aoqatOpenMuslimBagSection('azkar');window.aoqatOpenAzkarCategory?.(kind);}
  function open(kind){if(!C.ids.includes(kind))return;pendingKind=kind;flushOpen();}
  async function notify(events){if(!events.length)return;const first=events[0];for(const event of events)window.AoqatReminderInbox?.add(event);
    document.getElementById('azkarReminderBanner')?.remove();const banner=document.createElement('aside');banner.id='azkarReminderBanner';banner.setAttribute('role','alert');
    for(const event of events){const b=document.createElement('button');b.type='button';b.textContent=event.title;b.onclick=()=>{open(event.topicId);banner.remove();};banner.append(b);}const close=document.createElement('button');close.type='button';close.textContent='إغلاق';close.onclick=()=>banner.remove();banner.append(close);document.body.append(banner);
    // One short notification for simultaneous adhkar; no looping alarm or adhan.
    const title=events.length===1?first.title:'تذكير بالأذكار',body=events.map(e=>C.titles[e.topicId]).join(' • ');
    let shown=false;
    if(typeof Notification!=='undefined'&&Notification.permission==='granted'){
      const options={body,tag:'aoqat-azkar-'+first.key,silent:false,icon:'assets/icons/app-icon.svg',data:{kind:'azkar-reminder',topicId:first.topicId,url:location.origin+'/?azkar='+first.topicId}};
      try{const reg=await navigator.serviceWorker?.getRegistration();if(reg)await reg.showNotification(title,options);else{const n=new Notification(title,options);n.onclick=()=>{window.focus();open(first.topicId);n.close();};}shown=true;}catch(_){}
    }
    // The operating system owns notification sound; use a short local tone for an in-page reminder.
    if(!shown)chime();
  }
  function tick(now=new Date()){if(window.AndroidNative?.configureAdhan)return;let sent=json(SENT,{});if(!sent||typeof sent!=='object'||Array.isArray(sent))sent={};const due=currentEvents(now).filter(e=>+now-e.at>=0&&+now-e.at<=120000&&!sent[e.key]);if(!due.length)return;
    due.forEach(e=>sent[e.key]=+now);for(const key of Object.keys(sent))if(+now-Number(sent[key])>3*86400000)delete sent[key];
    try{localStorage.setItem(SENT,JSON.stringify(sent));}catch(_){}notify(due);
  }
  function permissionNote(){if(window.AndroidNative?.configureAdhan)return 'تنبيهات الهاتف تعمل دون إنترنت وبالخلفية بعد منح الأذونات.';if(typeof Notification==='undefined')return 'المتصفح لا يدعم إشعارات الهاتف؛ يظهر التذكير داخل الموقع.';return Notification.permission==='granted'?'إشعارات الهاتف مسموحة.':Notification.permission==='denied'?'إشعارات الهاتف محظورة؛ اسمح بها من إعدادات المتصفح.':'اسمح بإشعارات المتصفح لعرض التذكير على الهاتف.';}
  function mount(page,kind){page.querySelector('#azkarReminderControls')?.remove();if(!C.ids.includes(kind))return;
    const host=document.createElement('section');host.id='azkarReminderControls';host.className='ad-card';host.dataset.kind=kind;
    host.innerHTML='<h4>تنبيه '+C.titles[kind]+'</h4><button type="button" data-azkar-toggle></button><div class="azr-modes" role="group" aria-label="وقت التنبيه"><button type="button" data-azkar-mode="default">افتراضياً</button><button type="button" data-azkar-mode="custom">تخصيص المستخدم</button></div><p class="azr-default"></p><div class="azr-custom" hidden><label class="azr-type">طريقة تحديد الوقت<select data-azkar-type><option value="relative">تعديل الموعد الافتراضي بالدقائق</option><option value="clock">وقت محدد</option></select></label><label class="azr-offset">تقديم أو تأخير الموعد (دقيقة)<input data-azkar-offset type="number" min="-120" max="120" step="1"></label><div class="azr-times"></div></div><p class="azr-next" role="status"></p><p class="ad-note">المواعيد بتوقيت العراق. التنبيهات تعمل دون إنترنت وبالخلفية، بصوت إشعار قصير حسب إعدادات الهاتف.</p><p class="azr-permission" role="status"></p><button type="button" data-azkar-permission>أذونات الإشعارات والعمل بالخلفية</button><button type="button" data-azkar-preview>تجربة الإشعار</button>';
    page.append(host);const fixed=['sleep','waking'].includes(kind),times=host.querySelector('.azr-times');
    C.clocks[kind].forEach((_,i)=>{const label=document.createElement('label');label.textContent=kind==='prayer'?'وقت '+names[i]:kind==='tasbih'?'الوقت '+(i+1):'وقت التنبيه';const input=document.createElement('input');input.type='time';input.step='60';input.dataset.azkarTime=String(i);label.append(input);times.append(label);});
    function save(){try{localStorage.setItem(KEY,JSON.stringify(settings));}catch(_){}draw();}
    function draw(){const s=settings[kind];host.querySelector('[data-azkar-toggle]').textContent='🔔 تنبيه الذكر: '+(s.enabled?'مفعّل':'متوقف');host.querySelector('[data-azkar-toggle]').setAttribute('aria-pressed',String(s.enabled));host.querySelectorAll('[data-azkar-mode]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.azkarMode===s.mode)));host.querySelectorAll('[data-azkar-toggle],[data-azkar-mode]').forEach(b=>{b.style.setProperty('background',b.getAttribute('aria-pressed')==='true'?'#12854c':'#7f9191','important');b.style.setProperty('color','#fff','important');});
      host.querySelector('.azr-default').textContent='الوقت الافتراضي: '+descriptions[kind];host.querySelector('.azr-custom').hidden=s.mode!=='custom';host.querySelector('.azr-type').hidden=fixed;host.querySelector('.azr-offset').hidden=fixed||s.type==='clock';times.hidden=!fixed&&s.type!=='clock';host.querySelector('[data-azkar-type]').value=s.type;host.querySelector('[data-azkar-offset]').value=s.offset;host.querySelectorAll('[data-azkar-time]').forEach(e=>e.value=s.times[+e.dataset.azkarTime]);
      const today=C.day(new Date()).key,events=currentEvents().filter(e=>e.topicId===kind&&e.key.includes(today));host.querySelector('.azr-next').textContent=!s.enabled?'التنبيه متوقف.':events.length?'مواعيد اليوم: '+events.map(e=>new Date(e.at).toLocaleTimeString('ar-IQ',{timeZone:'Asia/Baghdad',hour:'2-digit',minute:'2-digit'})).join('، '):'بانتظار مواقيت الصلاة المحفوظة.';
      host.querySelector('.azr-permission').textContent=permissionNote();host.querySelector('[data-azkar-permission]').hidden=!window.AndroidNative?.configureAdhan&&typeof Notification==='undefined'||Notification.permission!=='default';
    }
    async function permission(){if(window.AndroidNative?.configureAdhan){window.AndroidNative.communityReminderPermissions();draw();return;}unlock();if(typeof Notification!=='undefined'&&Notification.permission==='default')try{await Notification.requestPermission();}catch(_){}draw();}
    host.querySelector('[data-azkar-toggle]').onclick=()=>{settings[kind].enabled=!settings[kind].enabled;save();if(settings[kind].enabled)permission();};
    host.querySelectorAll('[data-azkar-mode]').forEach(b=>b.onclick=()=>{settings[kind].mode=b.dataset.azkarMode;save();});
    host.querySelector('[data-azkar-type]').onchange=e=>{settings[kind].type=e.target.value;save();};
    host.querySelector('[data-azkar-offset]').onchange=e=>{if(!e.target.checkValidity()||e.target.value===''){e.target.reportValidity();draw();return;}settings[kind].offset=+e.target.value;save();};
    host.querySelectorAll('[data-azkar-time]').forEach(e=>e.onchange=()=>{if(C.clock(e.value)===null){draw();return;}settings[kind].times[+e.dataset.azkarTime]=e.value;save();});
    host.querySelector('[data-azkar-permission]').onclick=permission;host.querySelector('[data-azkar-preview]').onclick=async()=>{await permission();if(window.AndroidNative?.previewAzkarReminder){window.AndroidNative.previewAzkarReminder(kind);return;}notify([{kind:'preview',topicId:kind,key:'preview',title:'معاينة: '+C.titles[kind],body:'تجربة تذكير الأذكار'}]);};host.azkarDraw=draw;draw();
  }
  const style=document.createElement('style');style.textContent='#azkarReminderControls{margin-top:18px;line-height:1.8}#azkarReminderControls [hidden]{display:none!important}#azkarReminderControls button{width:100%;margin:6px 0;padding:10px;text-align:right;font-family:inherit}#azkarReminderControls label{display:flex;align-items:center;justify-content:space-between;gap:12px;margin:12px 0}#azkarReminderControls input,#azkarReminderControls select{max-width:170px;min-width:0;min-height:40px;font:inherit}#azkarReminderControls .azr-modes{display:flex;gap:8px}#azkarReminderControls .azr-modes button{font-size:14px;text-align:center}body.design-menu-open #webDrawerSub #azkarReminderControls [data-azkar-toggle],body.design-menu-open #webDrawerSub #azkarReminderControls [data-azkar-mode]{background:#7f9191!important;color:white!important}body.design-menu-open #webDrawerSub #azkarReminderControls [aria-pressed="true"]{background:#12854c!important;color:white!important}#azkarReminderBanner{position:fixed;inset:auto 12px 24px;z-index:2147483000;padding:14px;border-radius:14px;background:#fffaf0;color:#182c34;box-shadow:0 6px 24px #0004;direction:rtl}#azkarReminderBanner button{display:block;margin:6px 0;padding:9px;font:inherit}';document.head.append(style);
  function redraw(){document.getElementById('azkarReminderControls')?.azkarDraw?.();}
  setInterval(()=>{flushOpen();tick();},1000);setInterval(redraw,60000);
  window.addEventListener('storage',()=>{settings=read();redraw();});window.addEventListener('aoqatPrayerRowsUpdated',redraw);document.addEventListener('visibilitychange',()=>{if(!document.hidden){settings=read();tick();redraw();}});
  navigator.serviceWorker?.addEventListener('message',e=>{if(e.data?.type==='AOQAT_OPEN_AZKAR')open(e.data.topicId);});
  window.AoqatAzkarReminders={read,mount,tick,currentEvents,open};
  window.addEventListener('load',()=>{const kind=new URL(location.href).searchParams.get('azkar');if(C.ids.includes(kind))open(kind);tick();},{once:true});
})();

;

/* js/azkar-web.js */
(function(){'use strict';

 const base=window.AoqatAzkar;
 const categories=[['morning','☀️','أذكار الصباح'],['evening','🌙','أذكار المساء'],['prayer','🕌','أذكار بعد الصلاة'],['sleep','🛏️','أذكار النوم'],['waking','🌅','أذكار الاستيقاظ'],['adhan','📣','أذكار الأذان'],['wudu','💧','أذكار الوضوء'],['mosque','🕌','أذكار دخول المسجد والخروج منه'],['home','🏠','أذكار دخول المنزل والخروج منه'],['food','🍽️','أذكار الطعام والشراب'],['bathroom','🚪','أذكار دخول الخلاء والخروج منه'],['travel','✈️','أذكار الركوب والسفر'],['distress','🤲','أدعية الهم والحزن والكرب'],['illness','💚','أدعية المريض والرقية'],['weather','🌧️','أدعية المطر والريح'],['tasbih','📿','التسبيح والاستغفار والصلاة على النبي']];
 const d=(text,count,chapter,title,note='')=>({text,count,ref:'حصن المسلم — '+title,source:'https://www.hisnmuslim.com/i/ar/'+chapter,note});
 const kursi='اللَّهُ لَا إِلَٰهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ لَا تَأْخُذُهُ سِنَةٌ وَلَا نَوْمٌ لَهُ مَا فِي السَّمَاوَاتِ وَمَا فِي الْأَرْضِ مَنْ ذَا الَّذِي يَشْفَعُ عِنْدَهُ إِلَّا بِإِذْنِهِ يَعْلَمُ مَا بَيْنَ أَيْدِيهِمْ وَمَا خَلْفَهُمْ وَلَا يُحِيطُونَ بِشَيْءٍ مِنْ عِلْمِهِ إِلَّا بِمَا شَاءَ وَسِعَ كُرْسِيُّهُ السَّمَاوَاتِ وَالْأَرْضَ وَلَا يَؤُودُهُ حِفْظُهُمَا وَهُوَ الْعَلِيُّ الْعَظِيمُ';
 const sayyid={text:'اللَّهُمَّ أَنْتَ رَبِّي لَا إِلَهَ إِلَّا أَنْتَ، خَلَقْتَنِي وَأَنَا عَبْدُكَ، وَأَنَا عَلَى عَهْدِكَ وَوَعْدِكَ مَا اسْتَطَعْتُ، أَعُوذُ بِكَ مِنْ شَرِّ مَا صَنَعْتُ، أَبُوءُ لَكَ بِنِعْمَتِكَ عَلَيَّ، وَأَبُوءُ بِذَنْبِي فَاغْفِرْ لِي، فَإِنَّهُ لَا يَغْفِرُ الذُّنُوبَ إِلَّا أَنْتَ',count:1,ref:'سيد الاستغفار؛ صحيح البخاري 6306',source:'https://sunnah.com/bukhari:6306'};
 const progress={};
 const data={
 friday:window.AoqatFridaySunnah||[],
 morning:[...base.morning,d(kursi,1,1,'أذكار الصباح والمساء','سورة البقرة، الآية 255'),sayyid],
 evening:[...base.evening,d(kursi,1,1,'أذكار الصباح والمساء','سورة البقرة، الآية 255'),sayyid],
 prayer:[...base.prayer,d('لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ، اللَّهُمَّ لَا مَانِعَ لِمَا أَعْطَيْتَ، وَلَا مُعْطِيَ لِمَا مَنَعْتَ، وَلَا يَنْفَعُ ذَا الْجَدِّ مِنْكَ الْجَدُّ',1,25,'الأذكار بعد السلام من الصلاة')],
 sleep:[...base.morning.slice(1,4).map(x=>({...x,ref:'أذكار النوم؛ صحيح البخاري 5017',source:'https://www.hisnmuslim.com/i/ar/0',note:'اجمع كفيك وانفث فيهما واقرأ السور الثلاث، ثم امسح بهما ما استطعت من جسدك؛ كرر ذلك ثلاث مرات.'})),d(kursi,1,0,'أذكار النوم','سورة البقرة، الآية 255'),d('بِاسْمِكَ اللَّهُمَّ أَمُوتُ وَأَحْيَا',1,0,'أذكار النوم'),d('بِاسْمِكَ رَبِّي وَضَعْتُ جَنْبِي، وَبِكَ أَرْفَعُهُ، فَإِنْ أَمْسَكْتَ نَفْسِي فَارْحَمْهَا، وَإِنْ أَرْسَلْتَهَا فَاحْفَظْهَا بِمَا تَحْفَظُ بِهِ عِبَادَكَ الصَّالِحِينَ',1,0,'أذكار النوم'),d('سُبْحَانَ اللَّهِ',33,0,'التسبيح عند النوم'),d('الْحَمْدُ لِلَّهِ',33,0,'التسبيح عند النوم'),d('اللَّهُ أَكْبَرُ',34,0,'التسبيح عند النوم')],
 waking:[d('الْحَمْدُ لِلَّهِ الَّذِي أَحْيَانَا بَعْدَ مَا أَمَاتَنَا، وَإِلَيْهِ النُّشُورُ',1,28,'أذكار الاستيقاظ من النوم'),d('الْحَمْدُ لِلَّهِ الَّذِي عَافَانِي فِي جَسَدِي، وَرَدَّ عَلَيَّ رُوحِي، وَأَذِنَ لِي بِذِكْرِهِ',1,28,'أذكار الاستيقاظ من النوم')],
 adhan:[d('لَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللَّهِ',null,15,'أذكار الأذان','ردد مثل المؤذن، وعند «حي على الصلاة» و«حي على الفلاح» قل هذا الذكر.'),d('اللَّهُمَّ رَبَّ هَذِهِ الدَّعْوَةِ التَّامَّةِ، وَالصَّلَاةِ الْقَائِمَةِ، آتِ مُحَمَّدًا الْوَسِيلَةَ وَالْفَضِيلَةَ، وَابْعَثْهُ مَقَامًا مَحْمُودًا الَّذِي وَعَدْتَهُ',1,15,'أذكار الأذان','بعد انتهاء الأذان والصلاة على النبي ﷺ.')],
 wudu:[d('بِسْمِ اللَّهِ',1,8,'الذكر قبل الوضوء'),d('أَشْهَدُ أَنْ لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، وَأَشْهَدُ أَنَّ مُحَمَّدًا عَبْدُهُ وَرَسُولُهُ',1,9,'الذكر بعد الفراغ من الوضوء'),d('اللَّهُمَّ اجْعَلْنِي مِنَ التَّوَّابِينَ وَاجْعَلْنِي مِنَ الْمُتَطَهِّرِينَ',1,9,'الذكر بعد الفراغ من الوضوء')],
 mosque:[d('اللَّهُمَّ افْتَحْ لِي أَبْوَابَ رَحْمَتِكَ',1,13,'دعاء دخول المسجد'),d('اللَّهُمَّ إِنِّي أَسْأَلُكَ مِنْ فَضْلِكَ',1,14,'دعاء الخروج من المسجد')],
 home:[d('بِسْمِ اللَّهِ، تَوَكَّلْتُ عَلَى اللَّهِ، وَلَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللَّهِ',1,10,'الذكر عند الخروج من المنزل'),d('اللَّهُمَّ إِنِّي أَعُوذُ بِكَ أَنْ أَضِلَّ أَوْ أُضَلَّ، أَوْ أَزِلَّ أَوْ أُزَلَّ، أَوْ أَظْلِمَ أَوْ أُظْلَمَ، أَوْ أَجْهَلَ أَوْ يُجْهَلَ عَلَيَّ',1,10,'الذكر عند الخروج من المنزل'),d('بِسْمِ اللَّهِ وَلَجْنَا، وَبِسْمِ اللَّهِ خَرَجْنَا، وَعَلَى اللَّهِ رَبِّنَا تَوَكَّلْنَا',1,11,'الذكر عند دخول المنزل','ثم سلم على أهل المنزل.')],
 food:[d('بِسْمِ اللَّهِ',1,69,'الدعاء قبل الطعام'),d('بِسْمِ اللَّهِ فِي أَوَّلِهِ وَآخِرِهِ',1,69,'الدعاء قبل الطعام','إذا نسيت التسمية أول الطعام.'),d('الْحَمْدُ لِلَّهِ الَّذِي أَطْعَمَنِي هَذَا، وَرَزَقَنِيهِ، مِنْ غَيْرِ حَوْلٍ مِنِّي وَلَا قُوَّةٍ',1,70,'الدعاء عند الفراغ من الطعام'),d('اللَّهُمَّ بَارِكْ لَنَا فِيهِ وَزِدْنَا مِنْهُ',1,69,'دعاء شرب اللبن','عند شرب اللبن.')],
 bathroom:[d('اللَّهُمَّ إِنِّي أَعُوذُ بِكَ مِنَ الْخُبُثِ وَالْخَبَائِثِ',1,6,'دعاء دخول الخلاء'),d('غُفْرَانَكَ',1,7,'دعاء الخروج من الخلاء')],
 travel:[d('بِسْمِ اللَّهِ، وَالْحَمْدُ لِلَّهِ، سُبْحَانَ الَّذِي سَخَّرَ لَنَا هَذَا وَمَا كُنَّا لَهُ مُقْرِنِينَ، وَإِنَّا إِلَى رَبِّنَا لَمُنْقَلِبُونَ، الْحَمْدُ لِلَّهِ، الْحَمْدُ لِلَّهِ، الْحَمْدُ لِلَّهِ، اللَّهُ أَكْبَرُ، اللَّهُ أَكْبَرُ، اللَّهُ أَكْبَرُ، سُبْحَانَكَ اللَّهُمَّ إِنِّي ظَلَمْتُ نَفْسِي فَاغْفِرْ لِي؛ فَإِنَّهُ لَا يَغْفِرُ الذُّنُوبَ إِلَّا أَنْتَ',1,95,'دعاء الركوب'),d('اللَّهُ أَكْبَرُ، اللَّهُ أَكْبَرُ، اللَّهُ أَكْبَرُ، سُبْحَانَ الَّذِي سَخَّرَ لَنَا هَذَا وَمَا كُنَّا لَهُ مُقْرِنِينَ، وَإِنَّا إِلَى رَبِّنَا لَمُنْقَلِبُونَ. اللَّهُمَّ إِنَّا نَسْأَلُكَ فِي سَفَرِنَا هَذَا الْبِرَّ وَالتَّقْوَى، وَمِنَ الْعَمَلِ مَا تَرْضَى، اللَّهُمَّ هَوِّنْ عَلَيْنَا سَفَرَنَا هَذَا وَاطْوِ عَنَّا بُعْدَهُ، اللَّهُمَّ أَنْتَ الصَّاحِبُ فِي السَّفَرِ، وَالْخَلِيفَةُ فِي الْأَهْلِ، اللَّهُمَّ إِنِّي أَعُوذُ بِكَ مِنْ وَعْثَاءِ السَّفَرِ، وَكَآبَةِ الْمَنْظَرِ، وَسُوءِ الْمُنْقَلَبِ فِي الْمَالِ وَالْأَهْلِ',1,96,'دعاء السفر'),d('آيِبُونَ، تَائِبُونَ، عَابِدُونَ، لِرَبِّنَا حَامِدُونَ',1,96,'الرجوع من السفر','يقال دعاء السفر مع هذه الزيادة عند الرجوع.')],
 distress:[d('اللَّهُمَّ إِنِّي عَبْدُكَ، ابْنُ عَبْدِكَ، ابْنُ أَمَتِكَ، نَاصِيَتِي بِيَدِكَ، مَاضٍ فِيَّ حُكْمُكَ، عَدْلٌ فِيَّ قَضَاؤُكَ، أَسْأَلُكَ بِكُلِّ اسْمٍ هُوَ لَكَ، سَمَّيْتَ بِهِ نَفْسَكَ، أَوْ أَنْزَلْتَهُ فِي كِتَابِكَ، أَوْ عَلَّمْتَهُ أَحَدًا مِنْ خَلْقِكَ، أَوِ اسْتَأْثَرْتَ بِهِ فِي عِلْمِ الْغَيْبِ عِنْدَكَ، أَنْ تَجْعَلَ الْقُرْآنَ رَبِيعَ قَلْبِي، وَنُورَ صَدْرِي، وَجَلَاءَ حُزْنِي، وَذَهَابَ هَمِّي',null,34,'دعاء الهم والحزن'),d('لَا إِلَهَ إِلَّا اللَّهُ الْعَظِيمُ الْحَلِيمُ، لَا إِلَهَ إِلَّا اللَّهُ رَبُّ الْعَرْشِ الْعَظِيمِ، لَا إِلَهَ إِلَّا اللَّهُ رَبُّ السَّمَاوَاتِ وَرَبُّ الْأَرْضِ وَرَبُّ الْعَرْشِ الْكَرِيمِ',null,35,'دعاء الكرب')],
 illness:[d('لَا بَأْسَ، طَهُورٌ إِنْ شَاءَ اللَّهُ',1,49,'الدعاء للمريض في عيادته'),d('أَسْأَلُ اللَّهَ الْعَظِيمَ رَبَّ الْعَرْشِ الْعَظِيمِ أَنْ يَشْفِيَكَ',7,49,'الدعاء للمريض في عيادته'),d('بِسْمِ اللَّهِ',3,124,'ما يقول من أحس وجعاً في جسده','ضع يدك على موضع الألم وقل هذا ثلاثاً، ثم الذكر التالي سبعاً.'),d('أَعُوذُ بِاللَّهِ وَقُدْرَتِهِ مِنْ شَرِّ مَا أَجِدُ وَأُحَاذِرُ',7,124,'ما يقول من أحس وجعاً في جسده'),{text:'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ ۝ الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ ۝ الرَّحْمَٰنِ الرَّحِيمِ ۝ مَالِكِ يَوْمِ الدِّينِ ۝ إِيَّاكَ نَعْبُدُ وَإِيَّاكَ نَسْتَعِينُ ۝ اهْدِنَا الصِّرَاطَ الْمُسْتَقِيمَ ۝ صِرَاطَ الَّذِينَ أَنْعَمْتَ عَلَيْهِمْ غَيْرِ الْمَغْضُوبِ عَلَيْهِمْ وَلَا الضَّالِّينَ',count:null,ref:'سورة الفاتحة؛ الرقية بها: صحيح البخاري 5736',source:'https://sunnah.com/bukhari:5736'}],
 weather:[d('اللَّهُمَّ إِنِّي أَسْأَلُكَ خَيْرَهَا، وَخَيْرَ مَا فِيهَا، وَخَيْرَ مَا أُرْسِلَتْ بِهِ، وَأَعُوذُ بِكَ مِنْ شَرِّهَا، وَشَرِّ مَا فِيهَا، وَشَرِّ مَا أُرْسِلَتْ بِهِ',1,61,'دعاء الريح'),d('اللَّهُمَّ صَيِّبًا نَافِعًا',1,64,'الدعاء إذا نزل المطر'),d('مُطِرْنَا بِفَضْلِ اللَّهِ وَرَحْمَتِهِ',1,65,'الذكر بعد نزول المطر')],
 tasbih:[d('سُبْحَانَ اللَّهِ وَبِحَمْدِهِ',100,130,'فضل التسبيح والتحميد'),d('سُبْحَانَ اللَّهِ وَبِحَمْدِهِ، سُبْحَانَ اللَّهِ الْعَظِيمِ',null,130,'فضل التسبيح والتحميد'),d('لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ',10,130,'فضل التهليل'),d('أَسْتَغْفِرُ اللَّهَ وَأَتُوبُ إِلَيْهِ',100,129,'الاستغفار والتوبة','ورد الاستغفار والتوبة في اليوم مائة مرة.'),d('اللَّهُمَّ صَلِّ وَسَلِّمْ عَلَى نَبِيِّنَا مُحَمَّدٍ',null,107,'الصلاة على النبي ﷺ','صيغة عامة للصلاة على النبي، دون عدد محدد.')]
 };
 window.AoqatAzkarWeb={categories,data};
 const positions={};let autoAdvance=false;
 window.aoqatRenderAzkar=function(el){
  el.closest('#prayerServicePanel')?.classList.add('web-azkar-flat');
  const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const remaining=progress;let kind='';
  el.innerHTML='<div id="adAzkarMenu" class="web-settings-list">'+categories.map(([id,icon,title])=>`<button type="button" class="main-action" data-azkar-kind="${id}"><span aria-hidden="true">${icon}</span> ${title} <span aria-hidden="true">‹</span></button>`).join('')+'</div><section id="adAzkarPage" hidden><button type="button" id="adAzkarBack" class="main-action">‹ رجوع إلى الأذكار</button><h3 id="adAzkarTitle"></h3><p id="adAzkarProgress" role="status" aria-live="polite"></p><label class="azkar-auto"><input type="checkbox" id="adAzkarAuto"> الانتقال تلقائياً بعد إكمال العدد</label><div id="adAzkarList" hidden></div><nav class="azkar-reader-nav" aria-label="التنقل بين الأذكار"><button type="button" id="adAzkarPrev">السابق</button><button type="button" id="adAzkarNext">التالي</button></nav><p id="adAzkarComplete" role="status" hidden>✓ أكملت أذكار هذا القسم</p></section>';
  const menu=el.querySelector('#adAzkarMenu'),page=el.querySelector('#adAzkarPage'),list=el.querySelector('#adAzkarList');
  const move=(index)=>{if(!kind)return;const items=[...list.querySelectorAll('article')],i=Math.max(0,Math.min(index,items.length-1));positions[kind]=i;items.forEach((x,n)=>x.hidden=n!==i);el.querySelector('#adAzkarProgress').textContent=(i+1)+' من '+items.length;el.querySelector('#adAzkarPrev').disabled=i===0;el.querySelector('#adAzkarNext').disabled=i===items.length-1;el.querySelector('#adAzkarComplete').hidden=!data[kind].every((x,n)=>x.count!=null&&remaining[kind+':'+n]===0);document.getElementById('webSubBody')?.scrollTo(0,0);};
  const auto=el.querySelector('#adAzkarAuto');auto.checked=autoAdvance;auto.onchange=()=>autoAdvance=auto.checked;
  el.querySelector('#adAzkarPrev').onclick=()=>move((positions[kind]||0)-1);
  el.querySelector('#adAzkarNext').onclick=()=>move((positions[kind]||0)+1);
  const back=()=>{if(page.hidden)return false;kind='';page.hidden=true;list.hidden=true;menu.hidden=false;el.querySelector('#adAzkarBack').hidden=true;menu.querySelector('[aria-current="page"]')?.focus({preventScroll:true});window.aoqatAzkarCategory='';return true;};
  window.aoqatCloseAzkarCategory=back;el.querySelector('#adAzkarBack').onclick=back;
  function openCategory(selected){
   if(!data[selected])return;
   const b=menu.querySelector('[data-azkar-kind="'+selected+'"]');
   kind=selected;auto.closest('label').hidden=kind==='friday';window.aoqatAzkarCategory=kind;menu.hidden=true;page.hidden=false;list.hidden=false;el.querySelector('#adAzkarBack').hidden=false;
   menu.querySelectorAll('button').forEach(x=>{x.removeAttribute('aria-current');x.setAttribute('aria-pressed',String(x===b));});b?.setAttribute('aria-current','page');
   el.querySelector('#adAzkarTitle').textContent=kind==='friday'?'سنن يوم الجمعة و آدابها':categories.find(x=>x[0]===kind)[2];
   list.innerHTML=data[kind].map((x,i)=>{const free=x.count==null,n=remaining[kind+':'+i]??(free?0:x.count);return `<article class="ad-azkar"><div class="azkar-text">${esc(x.text)}</div>${x.note?'<p class="ad-note">'+esc(x.note)+'</p>':''}<small class="ad-note">${esc(x.ref)}</small>${x.source?` <a href="${esc(x.source)}" target="_blank" rel="noopener noreferrer">المصدر</a>`:''}${x.info?'':`<div class="azkar-count-row"><button type="button" data-dhikr="${i}" data-free="${free}" data-remaining="${n}" ${!free&&n===0?'disabled':''}>${free?'عدد التكرار: '+n:n?'العدد المتبقي: '+n:'✓ اكتمل'}</button><button type="button" data-dhikr-reset="${i}" aria-label="إعادة عداد الذكر">↻ إعادة</button></div>`}</article>`;}).join('');
   list.querySelectorAll('[data-dhikr]').forEach(c=>c.onclick=()=>{const n=c.dataset.free==='true'?Number(c.dataset.remaining)+1:Math.max(0,Number(c.dataset.remaining)-1);remaining[kind+':'+c.dataset.dhikr]=n;c.dataset.remaining=String(n);c.textContent=c.dataset.free==='true'?'عدد التكرار: '+n:n?'العدد المتبقي: '+n:'✓ اكتمل';c.disabled=c.dataset.free!=='true'&&n===0;if(c.disabled&&autoAdvance)move((positions[kind]||0)+1);else move(positions[kind]||0);});
   list.querySelectorAll('[data-dhikr-reset]').forEach(c=>c.onclick=()=>{const i=Number(c.dataset.dhikrReset),x=data[kind][i],n=x.count??0,button=list.querySelector('[data-dhikr="'+i+'"]');remaining[kind+':'+i]=n;button.dataset.remaining=String(n);button.disabled=false;button.textContent=x.count==null?'عدد التكرار: '+n:'العدد المتبقي: '+n;move(positions[kind]||0);});
   el.querySelector('#fridayReminderHost')?.remove();
   el.querySelector('#communityPostControls-friday')?.remove();
   if(kind==='friday'){window.AoqatFridayReminders?.mount(page);window.AoqatCommunityPosts?.mount('friday',page);}
   window.AoqatAzkarReminders?.mount(page,kind);
   move(positions[kind]||0);
   document.getElementById('webSubBody')?.scrollTo(0,0);el.querySelector('#adAzkarBack').focus({preventScroll:true});
  }
  window.aoqatOpenAzkarCategory=openCategory;
  menu.querySelectorAll('[data-azkar-kind]').forEach(b=>b.onclick=()=>openCategory(b.dataset.azkarKind));
  el.querySelector('#adAzkarBack').hidden=true;window.aoqatAzkarCategory='';
 };
 const s=document.createElement('style');s.textContent='body.design-menu-open #webDrawerSub #prayerServicePanel.web-azkar-flat,body.design-menu-open #webDrawerSub #prayerServicePanel.web-azkar-flat #adSection-services,body.design-menu-open #webDrawerSub #prayerServicePanel.web-azkar-flat #adSection-services>.ad-card,body.design-menu-open #webDrawerSub #prayerServicePanel.web-azkar-flat #adServiceFrame,body.design-menu-open #webDrawerSub #prayerServicePanel.web-azkar-flat #adService{border:0!important;border-radius:0!important;padding:0!important;margin:0!important;background:transparent!important;box-shadow:none!important;width:100%!important;max-width:none!important;overflow:visible!important}#prayerServicePanel.web-azkar-flat #adSection-services>.ad-card>h3,#prayerServicePanel.web-azkar-flat #adServiceTitle{display:none!important}#adAzkarMenu{display:grid;grid-template-columns:1fr;gap:8px}#adAzkarMenu[hidden],#adAzkarPage[hidden],#adAzkarList[hidden]{display:none!important}#adAzkarMenu button{display:flex;align-items:center;gap:9px;text-align:right;min-height:45px}#adAzkarMenu button span:last-child{margin-inline-start:auto}#adAzkarPage .azkar-text{font-size:24px;line-height:2;text-align:right;overflow-wrap:anywhere}#adAzkarTitle{font-size:19px}#adAzkarBack{width:auto;min-height:38px}#adAzkarPage .azkar-count-row{display:flex;flex-wrap:wrap;gap:8px;margin-top:10px}#adAzkarPage button:disabled{opacity:.65}#adAzkarPage article[hidden],#adAzkarComplete[hidden]{display:none!important}#adAzkarPage .ad-azkar{border:0!important;background:transparent!important;padding:12px 0!important;margin:0!important;box-shadow:none!important}#adAzkarProgress{text-align:center;font-weight:700}#adAzkarPage .azkar-auto[hidden]{display:none!important}#adAzkarPage .azkar-auto{display:flex;align-items:center;gap:8px;font-size:14px}#adAzkarAuto{width:20px!important;height:20px!important;min-height:20px!important;margin:0!important}#adAzkarPage .azkar-reader-nav{display:flex;gap:10px;margin-top:18px}#adAzkarPage .azkar-reader-nav button{flex:1;min-height:46px}#adAzkarPage .azkar-count-row{justify-content:center}#adAzkarPage a{color:var(--wt-accent,#137985)}';document.head.appendChild(s);
})();

;

/* js/quran-reader.js */
(function () {
  'use strict';

  const markColors={"blue":["أزرق","#5379c3"],"green":["أخضر","#328663"],"amber":["ذهبي","#bd8b25"],"red":["أحمر","#c55050"],"purple":["بنفسجي","#8d60b3"]};
  const KEY='aoqatQuranReaderV1', TOTAL=604;
  const paths={index:'M4 6h16M4 12h16M4 18h16',wird:'M3 5c4-2 7-1 9 1 2-2 5-3 9-1v14c-4-2-7-1-9 1-2-2-5-3-9-1V5zm9 1v14',profile:'M8 7a4 4 0 1 0 8 0 4 4 0 1 0-8 0M4 22v-4c0-5 16-5 16 0v4',settings:'M3 6h18M3 18h18M8 3v6M16 15v6',mushaf:'M3 5c4-2 7-1 9 1 2-2 5-3 9-1v14c-4-2-7-1-9 1-2-2-5-3-9-1V5zm9 1v14',search:'M17 17l5 5M3 10a7 7 0 1 0 14 0 7 7 0 1 0-14 0',audio:'M3 14v-3a9 9 0 0 1 18 0v3M3 12h4v9H3zM17 12h4v9h-4z',library:'M3 3h18v18H3zM7 8h10M7 13h10M7 17h6',more:'M3 3h6v6H3zM15 3h6v6h-6zM3 15h6v6H3zM15 18h6M18 15v6'};
  const icons=Object.fromEntries(Object.entries(paths).map(([k,d])=>[k,`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${d}"/></svg>`]));
  const titles={index:'الفهرس',wird:'وردي',profile:'ملفاتي',settings:'الإعدادات',mushaf:'المصحف',search:'البحث',audio:'التلاوة',library:'المكتبة',more:'المزيد'};
  const readers=[['ar.alafasy','مشاري راشد العفاسي'],['ar.husary','محمود خليل الحصري'],['ar.minshawi','محمد صديق المنشاوي'],['ar.abdulbasitmurattal','عبد الباسط عبد الصمد']];
  let state={layout:'phone',page:1,theme:'sepia',font:44,reciter:'ar.alafasy',volume:80,goal:20,name:'',bookmarks:[],notes:[],days:{}};
  try {Object.assign(state,JSON.parse(localStorage.getItem(KEY)||'{}'));}catch(_){}
  state.layout='phone';
  state.page=Math.max(1,Math.min(TOTAL,Math.floor(Number(state.page)||1)));
  state.theme=['sepia','ivory','white','night','green','blue','contrast'].includes(state.theme)?state.theme:'sepia';
  state.font=Math.max(22,Math.min(80,Number(state.font)||44));
  if(!state.readingRevision && state.font===32)state.font=36;
  if(state.readingRevision===2 && state.font===36 && !state.fontCustomized)state.font=40;
  if(!state.fontCustomized && (state.readingRevision||0)<4)state.font=44;
  state.readingRevision=4;
  state.goal=Math.max(1,Math.min(604,Math.floor(Number(state.goal)||20)));
  state.volume=Math.max(0,Math.min(100,Number(state.volume)||80));
  state.reciter=readers.some(r=>r[0]===state.reciter)?state.reciter:readers[0][0];
  for(const key of ['bookmarks','notes'])if(!Array.isArray(state[key]))state[key]=[];
  if(!state.days || typeof state.days!=='object' || Array.isArray(state.days))state.days={};
  let root,host,quran,meta,phone,verses=[],loading,resize,audio,selected=0,audioIndex=-1,audioOn=false,audioSequence=0,audioRepeat=1,repeated=0,returnFocus,pointer,ignoreClickUntil=0,searchLimit=60,query='',request,pressTimer,turnAnimation,incomingAnimation,dragOffset=0,dragFrame=0,warmTask=0;
  const fittedSizes=new Map(),preparedPages=new Map(),phonePages=new Map(),phoneRequests=new Map();
  const phoneMode=()=>Boolean(phone);
  const mobileTrial=()=>false;
  const pageKey=(paper,page)=>[state.layout,page,paper.clientWidth,paper.clientHeight,state.font,Boolean(state.tajwidScreenFit)].join(':');
  const $=id=>root?.querySelector('#'+id), esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const arabic=n=>String(n).replace(/\d/g,d=>'٠١٢٣٤٥٦٧٨٩'[d]);
  const plain=s=>String(s).normalize('NFKD').replace(/[\u0610-\u061a\u064b-\u065f\u0670\u06d6-\u06ed\u0640]/g,'').replace(/[ٱأإآ]/g,'ا').replace(/ى/g,'ي');
  function save(){try{localStorage.setItem(KEY,JSON.stringify(state));return true;}catch(_){notice('تعذر حفظ إعدادات القرآن على هذا الجهاز');return false;}}
  function today(){const d=new Date();return `${d.getFullYear()}-${d.getMonth()+1}-${d.getDate()}`;}
  function readToday(){const d=state.days[today()];return Array.isArray(d)?d:[];}
  function pageOf(i){if(phoneMode())return phone.versePages[i];let lo=0,hi=603;while(lo<hi){const m=Math.ceil((lo+hi)/2);if(meta.pages[m].start<=i)lo=m;else hi=m-1;}return lo+1;}
  function juzOf(i){return meta.juzs.filter(j=>j.start<=i).at(-1)?.id||1;}
  function pageItems(p=state.page){if(phoneMode())return verses.slice(phone.pages[p-1].start,phone.pages[p-1].end);return verses.slice(meta.pages[p-1].start,p<604?meta.pages[p].start:verses.length);}
  function surahBanner(id){
    const s=quran[id-1],kind=s.type==='meccan'?'مكية':'مدنية';
    // Self-contained frame avoids older Quran heading selectors overriding its border.
    const frame='display:grid!important;grid-template-columns:25% 50% 25%!important;direction:rtl!important;align-items:center!important;width:100%!important;min-height:42px!important;box-sizing:border-box!important;padding:5px 12px!important;margin:0!important;border:3px double #ad916a!important;border-radius:9px!important;background:linear-gradient(90deg,#f2e8d9,#fffbf4 50%,#f2e8d9)!important;box-shadow:inset 0 0 0 3px #fffaf1,inset 0 0 0 4px #d2bda0!important;color:#30444a!important;white-space:nowrap!important;overflow:hidden!important;line-height:1.35!important';
    const cell='display:block!important;min-width:0!important;white-space:nowrap!important;overflow:hidden!important;font-family:Tahoma,Arial,sans-serif!important;font-weight:600!important;line-height:1.35!important';
    return `<div class="aq-surah-info-clean" style="${frame}"><span class="aq-surah-info-count" style="${cell};text-align:right!important;font-size:clamp(11px,3vw,15px)!important">${arabic(s.total_verses)} آية</span><span class="aq-surah-info-name" style="${cell};text-align:center!important;font-size:clamp(14px,3.7vw,19px)!important">سورة ${esc(s.name)}</span><span class="aq-surah-info-kind" style="${cell};text-align:left!important;font-size:clamp(11px,3vw,15px)!important">${kind}</span></div>`;
  }
  function notice(text){if($('aqNotice'))$('aqNotice').textContent=text;}
  function barButton(kind){return `<button type="button" data-qr-panel="${kind}" aria-label="${titles[kind]}"${kind==='mushaf'?' class="aq-active" aria-current="page"':''}><span aria-hidden="true">${icons[kind]}</span><small>${titles[kind]}</small></button>`;}
  const mushafUrl = url => url.startsWith("assets/mushaf-") ? "https://aoqat.vercel.app/"+url : url;
  async function compressed(url){const r=await fetch(mushafUrl(url));if(!r.ok)throw Error('Mushaf resource unavailable');const bytes=new Uint8Array(await r.arrayBuffer());return bytes[0]===31&&bytes[1]===139?new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))).json():JSON.parse(new TextDecoder().decode(bytes));}
  async function loadPhone(){const ready=await fetch(mushafUrl('assets/mushaf-phone-hafs-ready.json'));if(!ready.ok)throw Error('Phone Mushaf unavailable');const data=await compressed('assets/mushaf-phone-hafs.json.gz');if(data.pages.length!==604||data.versePages.length!==6236)throw Error('Invalid responsive Mushaf');data.directory=mushafUrl(data.directory);return data;}
  async function phonePage(page){if(phonePages.has(page))return phonePages.get(page);if(!phoneRequests.has(page))phoneRequests.set(page,compressed(`${phone.directory}/${String(page).padStart(3,'0')}.json.gz`).then(data=>{if(data.page!==page||!data.lines.length)throw Error('Invalid Mushaf rows');phonePages.set(page,data);if(phonePages.size>8)phonePages.delete(phonePages.keys().next().value);return data;}).finally(()=>phoneRequests.delete(page)));return phoneRequests.get(page);}
  async function load(){
    if(!loading)loading=Promise.all([Promise.resolve().then(()=>JSON.parse(window.AndroidNative.readQuranAsset("quran.json"))),Promise.resolve().then(()=>JSON.parse(window.AndroidNative.readQuranAsset("quran-pages.json"))),loadPhone()]).then(async ([q,m,f])=>{phone=f;
      if(q.length!==114||m.pages.length!==604)throw Error();quran=q;meta=m;
      verses=q.flatMap(s=>s.verses.map(v=>({s:s.id,a:v.id,name:s.name,text:v.text,search:plain(v.text)})));
      if(verses.length!==6236)throw Error();
      // The approved phone Mushaf is the only reading edition.
      meta={...m,pages:phone.pages};state.layout='phone';state.mobileTrial=false;state.phoneRevision=1;
    }).catch(e=>{loading=null;throw e;});
    return loading;
  }
  function shell(){
    host.innerHTML=`<section id="aqReader" dir="rtl" aria-label="المصحف الشريف" data-theme="${state.theme}">
      <nav class="aq-top" aria-label="أدوات المصحف">${['index','wird','profile','settings'].map(barButton).join('')}</nav>
      <div class="aq-page-meta"><span id="aqSurahName"></span><span id="aqJuz"></span><button type="button" id="aqBookmark" aria-label="حفظ علامة الصفحة">☆</button></div>
      <main id="aqPaper" class="aq-paper" aria-label="صفحة القرآن"><div id="adVerses" class="aq-page-text"></div></main>
      <div class="aq-folio"><span id="aqFolio" aria-label="رقم الصفحة"></span><button type="button" id="aqQuickSave" aria-label="الحفظ السريع لموضع القراءة">الحفظ السريع</button></div>
      <div class="aq-turn"><button type="button" id="aqPrevious" aria-label="الصفحة السابقة">‹ السابق</button><button type="button" id="aqPageNumber" aria-label="الانتقال إلى صفحة"></button><button type="button" id="aqNext" aria-label="الصفحة التالية">التالي ›</button></div>
      <label class="aq-slider" aria-label="تصفح صفحات المصحف"><input type="range" id="aqPageSlider" min="1" max="604" step="1" value="${state.page}" aria-label="رقم صفحة المصحف"></label>
      <p id="aqNotice" class="aq-notice" role="status" aria-live="polite"></p>
      <nav class="aq-bottom" aria-label="خدمات القرآن">${['mushaf','search','audio','library','more'].map(barButton).join('')}</nav>
      <section id="aqSheet" class="aq-sheet" role="dialog" aria-modal="true" aria-labelledby="aqSheetTitle" hidden><header><h3 id="aqSheetTitle"></h3><button type="button" id="aqCloseSheet" aria-label="إغلاق">×</button></header><div id="aqSheetBody" class="aq-sheet-body"></div></section>
    </section>`;
    root=host.querySelector('#aqReader');root.tabIndex=-1;
    root.addEventListener('click',e=>{const b=e.target.closest('[data-qr-panel]');if(b)openPanel(b.dataset.qrPanel);});
    $('aqCloseSheet').onclick=closeSheet;
    $('aqPrevious').onclick=()=>go(state.page-1);$('aqNext').onclick=()=>go(state.page+1);
    $('aqPageNumber').onclick=()=>openPanel('index');
    $('aqPageSlider').oninput=e=>go(Number(e.target.value),undefined,false);
    $('aqPageSlider').onchange=e=>go(Number(e.target.value));
    $('aqBookmark').onclick=()=>bookmark(meta.pages[state.page-1].start);
    $('aqQuickSave').onclick=quickSave;
    root.addEventListener('contextmenu',e=>{if(e.target.closest('#aqSheet')&&!e.target.matches('input,textarea'))e.preventDefault();});
    $('aqPaper').addEventListener('pointerdown',e=>{
      if(!e.isPrimary)return;
      if(galleryBusy)return;clearTurn();dragOffset=0;pointer={x:e.clientX,y:e.clientY,id:e.pointerId,t:performance.now()};
      const v=e.target.closest('[data-qr-verse]');
      clearTimeout(pressTimer);
      if(v)pressTimer=setTimeout(()=>{pointer=null;ignoreClickUntil=performance.now()+800;versePanel(Number(v.dataset.qrVerse));},400);
    });
    $('aqPaper').addEventListener('pointermove',e=>{
      if(!pointer||pointer.id!==e.pointerId)return;
      const dx=e.clientX-pointer.x,dy=e.clientY-pointer.y;
      if(Math.hypot(dx,dy)>12)clearTimeout(pressTimer);
      if(phoneMode()&&Math.abs(dx)>12&&Math.abs(dx)>Math.abs(dy)*1.4)galleryDrag(dx);
    });
    $('aqPaper').addEventListener('pointerup',e=>{
      clearTimeout(pressTimer);if(!pointer||pointer.id!==e.pointerId)return;
      const dx=e.clientX-pointer.x,dy=e.clientY-pointer.y,speed=Math.abs(dx)/Math.max(1,performance.now()-pointer.t);pointer=null;
      if((Math.abs(dx)>Math.min(48,$('aqPaper').clientWidth*.12)||(Math.abs(dx)>24&&speed>.35))&&Math.abs(dx)>Math.abs(dy)*1.4){ignoreClickUntil=performance.now()+500;const target=state.page+(dx>0?1:-1);if(target>=1&&target<=TOTAL){if(phoneMode()&&galleryNeighbor){galleryFinish(target,true);}else if(phoneMode()&&(!phonePages.has(target)||(target>=3&&!qcfData.has(target)))){const from=state.page;Promise.all([phonePage(target),target>=3?qcfLoad(target):Promise.resolve()]).then(()=>{if(root?.isConnected&&state.page===from)go(target);}).catch(()=>notice('تعذر تجهيز الصفحة التالية؛ حاول مجدداً'));}else go(target);}else {clearTurn();dragOffset=0;}}
      else {if(Math.hypot(dx,dy)>12)ignoreClickUntil=performance.now()+500;if(galleryNeighbor)galleryFinish(state.page,false);else clearTurn();dragOffset=0;}
    });
    $('aqPaper').addEventListener('pointercancel',()=>{clearTimeout(pressTimer);pointer=null;clearTurn();dragOffset=0;ignoreClickUntil=performance.now()+500;});
    $('aqPaper').addEventListener('contextmenu',e=>e.preventDefault());
    $('aqPaper').addEventListener('click',e=>{if(performance.now()<ignoreClickUntil||!$('aqSheet').hidden)return;immersive(!document.body.classList.contains('quran-reader-immersive'));});
    root.addEventListener('keydown',e=>{
      if(e.key==='Escape'){e.preventDefault();e.stopPropagation();if(!$('aqSheet').hidden)closeSheet();else immersive(false);return;}
      if(!$('aqSheet').hidden){if(e.key==='Escape'){e.preventDefault();closeSheet();}if(e.key==='Tab'){const f=[...$('aqSheet').querySelectorAll('button,input,select,textarea,a[href]')].filter(x=>!x.disabled&&x.offsetParent);const first=f[0],last=f.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}}return;}
      if(e.key==='Escape'){immersive(false);return;}
      if(e.target.matches('input,select,textarea'))return;
      if(e.key==='ArrowLeft'){e.preventDefault();go(state.page+1);}if(e.key==='ArrowRight'){e.preventDefault();go(state.page-1);}if((e.key==='Enter'||e.key===' ')&&e.target.dataset.qrVerse){e.preventDefault();versePanel(Number(e.target.dataset.qrVerse));}
    });
    resize?.disconnect();resize=new ResizeObserver(()=>fit());resize.observe($('aqPaper'));
    document.fonts?.ready.then(()=>{fittedSizes.clear();preparedPages.clear();if(root?.isConnected){fit();warmAdjacent();}});
  }
  function immersive(on){
    document.body.classList.toggle('quran-reader-immersive',on);
  }
  // Gallery-style horizontal swipe: move two already prepared pages with the finger.
  let galleryNeighbor=null,galleryDirection=0,galleryBusy=false,galleryAdopted=false;
  function galleryReset(){
    galleryNeighbor?.remove();galleryNeighbor=null;galleryDirection=0;
    const current=$('adVerses');if(current){current.style.transition='';current.style.transform='';current.style.willChange='';}
  }
  function galleryDrag(dx){
    const paper=$('aqPaper'),current=$('adVerses');if(!paper||!current||!phoneMode()||galleryBusy)return;
    const direction=dx>0?1:-1,target=state.page+direction;
    if(target<1||target>604){galleryReset();return;}
    if(galleryDirection!==direction){galleryReset();galleryDirection=direction;}
    if(!galleryNeighbor){
      if(!phonePages.has(target)||(target>=3&&!qcfData.has(target)))return;
      const neighbor=document.createElement('div');neighbor.className=current.className+' aq-gallery-neighbor';
      neighbor.innerHTML=pageHTML(target);neighbor.style.cssText='position:absolute!important;z-index:5;pointer-events:none;visibility:hidden;will-change:transform;';neighbor.style.top=current.offsetTop+'px';neighbor.style.left=current.offsetLeft+'px';
      paper.append(neighbor);fitText(paper,neighbor,target);neighbor.style.visibility='visible';galleryNeighbor=neighbor;
    }
    const width=paper.clientWidth,offset=Math.max(-width,Math.min(width,dx));
    current.style.willChange='transform';current.style.transform='translate3d('+offset+'px,0,0)';
    galleryNeighbor.style.transform='translate3d('+(offset-direction*width)+'px,0,0)';
  }
  function galleryFinish(target,commit){
    const paper=$('aqPaper'),current=$('adVerses'),neighbor=galleryNeighbor;
    if(!paper||!current||!neighbor){galleryReset();if(commit)go(target);return;}
    galleryBusy=true;
    const direction=galleryDirection,width=paper.clientWidth;
    current.style.transition='transform 170ms ease-out';
    neighbor.style.transition='transform 170ms ease-out';
    requestAnimationFrame(()=>{
      current.style.transform='translate3d('+(commit?direction*width:0)+'px,0,0)';
      neighbor.style.transform='translate3d('+(commit?0:-direction*width)+'px,0,0)';
    });
    const settle=()=>{
      if(!galleryBusy)return;
      galleryBusy=false;
      if(commit&&root?.isConnected&&state.page!==target){
        // Keep the already rendered and fitted neighbor; do not rebuild it after the swipe.
        current.remove();
        neighbor.id='adVerses';
        neighbor.classList.remove('aq-gallery-neighbor');
        neighbor.style.removeProperty('position');neighbor.style.removeProperty('top');neighbor.style.removeProperty('left');
        neighbor.style.removeProperty('z-index');neighbor.style.removeProperty('pointer-events');
        neighbor.style.removeProperty('visibility');neighbor.style.removeProperty('will-change');
        neighbor.style.removeProperty('transition');neighbor.style.removeProperty('transform');
        galleryNeighbor=null;galleryDirection=0;galleryAdopted=true;
        go(target);
      }else galleryReset();
    };
    neighbor.addEventListener('transitionend',settle,{once:true});
    setTimeout(settle,195);
  }
  function clearTurn(){galleryReset();cancelAnimationFrame(dragFrame);dragFrame=0;turnAnimation?.cancel();incomingAnimation?.cancel();turnAnimation=null;incomingAnimation=null;$('aqPaper')?.querySelectorAll('.aq-leaf').forEach(e=>e.remove());if($('adVerses'))$('adVerses').style.transform='';}
  // Genuine QCF V2 glyphs: page-specific font and code_v2, never replace with vector art.
  const qcfData=new Map(),qcfPending=new Map(),qcfErrors=new Map(),qcfFontReady=new Set();
  function qcfLoad(page,force=false){
    if(qcfData.has(page))return Promise.resolve(qcfData.get(page));
    if(qcfPending.has(page))return qcfPending.get(page);
    if(qcfErrors.has(page)&&!force)return Promise.reject(qcfErrors.get(page));
    if(force)qcfErrors.delete(page);
    const job=(async()=>{
      const url='https://api.quran.com/api/v4/verses/by_page/'+page+'?words=true&word_fields=code_v2%2Ctext_uthmani&per_page=50&mushaf=1';
      const res=await fetch(mushafUrl(url));if(!res.ok)throw Error('QCF API '+res.status);
      const data=await res.json(),lines=new Map(),lookup=new Map(verses.map((v,i)=>[v.s+':'+v.a,i]));
      for(const verse of data.verses||[]){
        const index=lookup.get(verse.verse_key);
        if(index===undefined)throw Error('QCF verse index mismatch');
        for(const w of verse.words||[]){
          if(!w.code_v2||!Number.isInteger(w.line_number))throw Error('Missing QCF code or line');
          if(w.page_number&&w.page_number!==page)throw Error('Page mismatch');
          if(!lines.has(w.line_number))lines.set(w.line_number,[]);
          lines.get(w.line_number).push({code:w.code_v2,index,end:w.char_type_name==='end'});
        }
      }
      if(lines.size<1||lines.size>15)throw Error('Unexpected line count');
      if(!qcfFontReady.has(page)){
        const font=new FontFace('AqQcfV2Page'+page,'url("https://verses.quran.foundation/fonts/quran/hafs/v2/woff2/p'+page+'.woff2")');
        await font.load();document.fonts.add(font);qcfFontReady.add(page);
      }
      const sorted=[...lines].sort((a,b)=>a[0]-b[0]);
      const rows=sorted.map(x=>x[1]);rows.lineNumbers=sorted.map(x=>x[0]);
      qcfData.set(page,rows);if(qcfData.size>16)qcfData.delete(qcfData.keys().next().value);
      return rows;
    })().catch(e=>{qcfErrors.set(page,e);throw e}).finally(()=>qcfPending.delete(page));
    qcfPending.set(page,job);return job;
  }
  function qcfHTML(page){
    const rows=qcfData.get(page);if(!rows)return '';
    const source=phonePages.get(page);
    const slots=Array.from({length:15},()=>null);
    // QCF V2 supplies the canonical 1–15 line positions. Never compact or
    // shift its words to accommodate banners from another mushaf edition.
    rows.forEach((words,i)=>{
      const n=rows.lineNumbers[i]-1;
      if(!Number.isInteger(n)||n<0||n>=15||slots[n])throw Error('Invalid QCF line position');
      slots[n]={words};
    });
    // Derive surah openings from the actual QCF verse stream, not from
    // another edition's page rows. Each surah begins at ayah 1.
    const openings=[];
    for(let i=0;i<rows.length;i++){
      const words=rows[i],first=words[0];
      if(!first)continue;
      const verse=verses[first.index];
      if(verse?.a===1 && (i===0 || rows[i-1].at(-1)?.index!==first.index)){
        openings.push({surah:verse.s,line:rows.lineNumbers[i]-1});
      }
    }
    // The title and basmala belong immediately before the first ayah.
    // Reserve the nearest free rows before it; never shift or overwrite words.
    for(const opening of openings){
      const free=slots.map((v,i)=>v===null&&i<opening.line?i:-1).filter(i=>i>=0);
      const needed=opening.surah===9?1:2;
      if(free.length>=needed){
        const positions=free.slice(-needed);
        slots[positions[0]]={kind:'heading',surah:opening.surah};
        if(needed===2)slots[positions[1]]={kind:'bismillah'};
      }else{
        // Some editions have no spare grid row: attach a compact title to
        // the first verse line instead of losing it or moving Quran words.
        const target=slots[opening.line];
        if(target?.words)target.opening=opening.surah;
      }
    }
    return slots.map((slot,n)=>{
      if(slot?.kind==='heading')return '<div class="aq-native-heading aq-qcf-heading">'+surahBanner(slot.surah)+'</div>';
      if(slot?.kind==='bismillah')return '<div class="aq-native-bismillah aq-qcf-bismillah">'+esc(quran[0].verses[0].text)+'</div>';
      if(!slot?.words)return '<div class="aq-qcf-spacer" aria-hidden="true"></div>';
      return (slot.opening?'<div class="aq-qcf-inline-opening">'+surahBanner(slot.opening)+(slot.opening===9?'':'<div class="aq-qcf-inline-bismillah">'+esc(quran[0].verses[0].text)+'</div>')+'</div>':'')+'<div class="aq-qcf-line" style="--aq-qcf-font:AqQcfV2Page'+page+';--aq-qcf-row:'+(n+1)+'" aria-label="السطر '+arabic(n+1)+'">'+slot.words.map(w=>'<span class="aq-qcf-word'+(w.end?' aq-qcf-marker':'')+'" role="button" tabindex="0" data-qr-verse="'+w.index+'">'+esc(w.code)+'</span>').join('')+'</div>';
    }).join('');
  }
  function pageHTML(page){
    if(phoneMode()&&page>=3)return qcfHTML(page);
    if(phoneMode()||mobileTrial()){
      const p=phonePages.get(page);if(!p)return '<p class="aq-loading">تحميل الصفحة…</p>';
      return p.lines.map(line=>{if(line.s)return `<div class="aq-native-heading">${surahBanner(line.s)}</div>`;if(line.b)return `<div class="aq-native-bismillah">${esc(quran[0].verses[0].text)}</div>`;
        return `<svg class="aq-native-line${line.c?' aq-native-centered':''}" viewBox="${[line.box[0]-line.box[2]*.018,line.box[1],line.box[2]*1.036,line.box[3]].join(' ')}" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg" aria-label="${esc([...new Set(line.v.map(v=>verses[v[0]].text))].join(' '))}">${line.v.map(([i,d])=>`<g role="button" tabindex="0" data-qr-verse="${i}" class="aq-native-verse${audioOn&&audioIndex===i?' aq-playing':''}" aria-label="${esc(verses[i].name)} الآية ${verses[i].a}"><path d="${d}"/><title>${esc(verses[i].text)}</title></g>`).join('')}</svg>`;
      }).join('');
    }
    if(page>2&&meta.lines?.[page-1])return meta.lines[page-1].map(line=>{
      if(line.s)return `<div class="aq-mushaf-line">${surahBanner(line.s)}</div>`;
      if(line.b)return `<div class="aq-mushaf-line aq-centered"><span class="aq-line-ink">${esc(quran[0].verses[0].text)}</span></div>`;
      return `<div class="aq-mushaf-line"><span class="aq-line-ink">${line.v.map(([i,start,end])=>{const v=verses[i],words=v.text.split(/\s+/);return `<span role="button" tabindex="0" data-qr-verse="${i}" class="aq-ayah${audioOn&&audioIndex===i?' aq-playing':''}" aria-label="${esc(v.name)} الآية ${v.a}">${esc(words.slice(start,end).join(' '))}${end===words.length?` <span class="aq-ayah-number" aria-label="نهاية الآية ${v.a}"><span class="aq-ayah-rosette" aria-hidden="true">۝</span><span class="aq-ayah-digits">${arabic(v.a)}</span></span>`:''}</span>`;}).join(' ')}</span></div>`;
    }).join('');
    const items=pageItems(page),start=meta.pages[page-1].start;let html='',group=-1;
    items.forEach((v,n)=>{
      if(group!==v.s){if(group!==-1)html+='</p>';group=v.s;
        if(v.a===1){html+=`${surahBanner(v.s)}`;if(v.s!==1&&v.s!==9)html+=`<div class="aq-bismillah">${esc(quran[0].verses[0].text)}</div>`;}
        html+='<p class="aq-verses">';
      }
      html+=`<span role="button" tabindex="0" data-qr-verse="${start+n}" class="aq-ayah${audioOn&&audioIndex===start+n?' aq-playing':''}" aria-label="${esc(v.name)} الآية ${v.a}">${esc(v.text)} <span class="aq-ayah-number" aria-label="نهاية الآية ${v.a}"><span class="aq-ayah-rosette" aria-hidden="true">۝</span><span class="aq-ayah-digits">${arabic(v.a)}</span></span></span> `;
    });html+='</p>';
    return html;
  }
  function renderPage(animate=false){
    if(phoneMode()&&state.page>=3&&!phonePages.has(state.page)){
      const target=state.page;
      $('adVerses').innerHTML='<p class="aq-loading">جاري تحميل عنوان السورة والبسملة…</p>';
      root.dataset.ready='false';
      phonePage(target).then(()=>{if(root?.isConnected&&phoneMode()&&state.page===target){preparedPages.clear();renderPage(animate);}}).catch(()=>{if(root?.isConnected&&phoneMode()&&state.page===target){$('adVerses').innerHTML='<p class="aq-loading">تعذر تحميل تنسيق بداية السورة؛ حاول مجدداً.</p>';root.dataset.ready='error';}});
      return;
    }
    if(phoneMode()&&state.page>=3&&!qcfData.has(state.page)){
      const target=state.page;
      $('adVerses').innerHTML='<p class="aq-loading">جاري تحميل خط QCF V2 الأصلي…</p>';
      root.dataset.ready='false';
      qcfLoad(target).then(()=>{if(root?.isConnected&&phoneMode()&&state.page===target){preparedPages.clear();renderPage(animate);}}).catch(()=>{if(root?.isConnected&&phoneMode()&&state.page===target){$('adVerses').innerHTML='<p class="aq-loading">تعذر تحميل خط QCF V2. تحقق من اتصال الإنترنت وأعد فتح الصفحة.</p>';root.dataset.ready='error';}});
      return;
    }

    if((phoneMode()||mobileTrial())&&state.page<=2&&!phonePages.has(state.page)){
      const target=state.page;
      $('adVerses').innerHTML='<p class="aq-loading">جاري تحميل الصفحة '+arabic(target)+'…</p>';
      root.dataset.ready='false';
      phonePage(target).then(()=>{if(root?.isConnected&&(phoneMode()||mobileTrial())&&state.page===target){preparedPages.clear();renderPage(animate);}}).catch(()=>{if(root?.isConnected&&state.page===target){$('adVerses').innerHTML='<p class="aq-loading">تعذر تحميل صفحة المصحف؛ حاول مجدداً عند توفر الإنترنت.</p>';root.dataset.ready='error';}});
      return;
    }
    root.dataset.ready='true';
    $('aqQuickSave').textContent='الحفظ السريع';
    const pageChanged=root.dataset.page!==String(state.page);
    dragOffset=0;
    clearTurn();
    const items=pageItems(),start=meta.pages[state.page-1].start,html=pageHTML(state.page);
    const adopted=galleryAdopted;galleryAdopted=false;const cached=!adopted&&!audioOn&&preparedPages.get(pageKey($('aqPaper'),state.page));if(adopted){/* The incoming gallery page is already fitted and displayed. */}else if(cached){const ready=cached.cloneNode(true);ready.id='adVerses';$('adVerses').replaceWith(ready);}else{$('adVerses').innerHTML=html;$('adVerses').classList.toggle('aq-opening',state.page<=2);}
    $('aqSurahName').textContent=items[0].name;$('aqJuz').textContent='الجزء '+arabic(juzOf(start));
    $('aqFolio').textContent=arabic(state.page);$('aqPageNumber').textContent=`${state.page} / 604`;$('aqPageSlider').value=state.page;
    $('aqPrevious').disabled=state.page===1;$('aqNext').disabled=state.page===604;
    const marked=state.bookmarks.some(b=>b.i===start);$('aqBookmark').textContent=marked?'★':'☆';$('aqBookmark').setAttribute('aria-pressed',String(marked));
    root.dataset.page=state.page;root.dataset.theme=state.theme;root.dataset.edition='qcf2-phone';
    if(Number.isInteger(state.lastVerse))root.querySelectorAll(`[data-qr-verse="${state.lastVerse}"]`).forEach(e=>e.classList.add('aq-selected'));
    if(!adopted)fit();if(pageChanged)$('aqPaper').scrollTop=0;warmAdjacent(80);
  }

  function fit(){
    const paper=$('aqPaper'),text=$('adVerses');if(!paper||!text||!meta||paper.clientHeight<1)return;
    fitText(paper,text,state.page);
  }
  function fitText(paper,text,page){

    if(phoneMode()&&page>=3){
      text.classList.remove('aq-lined-page','aq-opening','aq-original-page','aq-native-page','aq-qcf-opening');
      text.classList.add('aq-qcf-page');
      text.style.setProperty('width',(paper.clientWidth-18)+'px','important');
      text.style.height=(paper.clientHeight-12)+'px';
      text.style.setProperty('--native-rows',15);
      for(const line of text.querySelectorAll('.aq-qcf-line')){
        let size=32;line.style.setProperty('font-size',size+'px','important');
        while(size>18&&line.scrollWidth>line.clientWidth+2){size-=.5;line.style.setProperty('font-size',size+'px','important');}
        if(line.scrollWidth>line.clientWidth+2)line.style.setProperty('justify-content','flex-start','important');
      }
      return;
    }
    if(phoneMode()||mobileTrial()){
      text.classList.remove('aq-lined-page','aq-opening','aq-original-page','aq-qcf-page','aq-qcf-opening');
      text.classList.add('aq-native-page');
      text.style.setProperty('width',(paper.clientWidth-18)+'px','important');
      text.style.height=(paper.clientHeight-12)+'px';
      const rows=phonePages.get(page)?.lines.length||15;
      text.style.setProperty('--native-rows',rows);
      text.style.setProperty('--native-zoom',1);
      text.querySelectorAll('.aq-native-line').forEach(svg=>{svg.querySelectorAll('.aq-native-verse').forEach(g=>{if(g.querySelector('rect'))return;const b=g.querySelector('path').getBBox(),r=document.createElementNS('http://www.w3.org/2000/svg','rect');for(const [k,v] of Object.entries({x:b.x-20,y:b.y-25,width:b.width+40,height:b.height+50}))r.setAttribute(k,v);g.prepend(r);});});return;
    }
    text.classList.remove('aq-native-page');
    const height=paper.clientHeight-28,width=paper.clientWidth-20,key=[page,width,height,state.font].join(':');
    if(page>2&&meta.lines?.[page-1]){
      text.classList.add('aq-lined-page');text.style.height=height+'px';
      const inks=[...text.querySelectorAll('.aq-line-ink')],rows=meta.lines[page-1].length;
      const cached=fittedSizes.get(key);
      if(Array.isArray(cached)){inks.forEach((ink,i)=>{ink.style.setProperty('font-size',cached[i][0]+'px','important');ink.style.transform='scaleX('+cached[i][1]+')';});return;}
      inks.forEach(ink=>{ink.style.setProperty('font-size',state.font+'px','important');ink.style.transform='';});
      const widths=inks.map(ink=>ink.scrollWidth);
      const size=Math.min(state.font,height/rows/1.65);
      const sizes=inks.map((ink,i)=>{ink.style.setProperty('font-size',size+'px','important');const scale=ink.closest('.aq-centered')?1:width/Math.max(1,widths[i]*size/state.font);ink.style.transform='scaleX('+scale+')';return [size,scale];});
      // Diacritics can extend beyond the font's line box, especially on short screens.
      for(let pass=0;pass<3&&text.scrollHeight>height;pass++){
        const factor=height/(height+2*(text.scrollHeight-height)+2);
        inks.forEach((ink,i)=>{sizes[i][0]*=factor;if(!ink.closest('.aq-centered'))sizes[i][1]/=factor;ink.style.setProperty('font-size',sizes[i][0]+'px','important');ink.style.transform='scaleX('+sizes[i][1]+')';});
      }
      if(fittedSizes.size>64)fittedSizes.delete(fittedSizes.keys().next().value);fittedSizes.set(key,sizes);return;
    }
    text.classList.remove('aq-lined-page');text.style.height='';
    if(fittedSizes.has(key)){text.style.fontSize=fittedSizes.get(key)+'px';return;}
    let low=18,high=Math.round(state.font*2),best=18;
    // Binary search half-pixel sizes instead of repeatedly forcing layout for each step.
    while(low<=high){const mid=(low+high)>>1;text.style.fontSize=mid/2+'px';
      if(text.scrollHeight<=height&&text.scrollWidth<=width){best=mid;low=mid+1;}else high=mid-1;}
    const size=best/2;text.style.fontSize=size+'px';
    if(fittedSizes.size>64)fittedSizes.delete(fittedSizes.keys().next().value);fittedSizes.set(key,size);
  }
  function warmAdjacent(delay=80){
    clearTimeout(warmTask);
    if(phoneMode()){for(const p of [state.page+1,state.page-1,state.page+2,state.page-2])if(p>=1&&p<=604){phonePage(p).catch(()=>{});if(p>=3)qcfLoad(p).catch(()=>{});}return;}
    const current=state.page;
    warmTask=setTimeout(()=>{
      const paper=$('aqPaper');if(!paper||!root?.isConnected||pointer||state.page!==current)return;
      for(const page of [current+1,current-1]){
        if(page<1||page>TOTAL)continue;
        const leaf=document.createElement('div');leaf.className='aq-leaf';leaf.style.visibility='hidden';leaf.inert=true;
        const front=document.createElement('div');front.className='aq-leaf-front';
        const text=$('adVerses').cloneNode(false);text.removeAttribute('id');text.innerHTML=pageHTML(page);text.classList.toggle('aq-opening',page<=2);text.style.transform='';
        front.append(text);leaf.append(front);paper.append(leaf);fitText(paper,text,page);if(!audioOn){preparedPages.set(pageKey(paper,page),text.cloneNode(true));if(preparedPages.size>6)preparedPages.delete(preparedPages.keys().next().value);}leaf.remove();
      }
    },delay);
  }
  function go(page,highlight,animate=true){
    if(!Number.isInteger(page)||page<1||page>604){notice('اختر صفحة من 1 إلى 604');return;}
    state.page=page;state.lastVerse=Number.isInteger(highlight)?highlight:null;state.surah=Number.isInteger(highlight)?verses[highlight].s:pageItems(page)[0].s;save();closeSheet();renderPage(animate);notice('');
    if(Number.isInteger(highlight))root.querySelectorAll(`[data-qr-verse="${highlight}"]`).forEach(e=>e.classList.add('aq-selected'));
  }
  function sheet(title,html){
    window.getSelection()?.removeAllRanges();
    request?.abort();request=null;returnFocus=document.activeElement;$('aqSheetTitle').textContent=title;$('aqSheetBody').innerHTML=html;$('aqSheet').hidden=false;
    $('aqSheet').dataset.kind=['ملفاتي','علامات','علامة مرجعية'].includes(title)?'personal':'full';$('aqCloseSheet').focus();
  }
  function closeSheet(){window.getSelection()?.removeAllRanges();root?.querySelectorAll('.aq-selected').forEach(e=>e.classList.remove('aq-selected'));request?.abort();request=null;if($('aqSheet'))$('aqSheet').hidden=true;if(returnFocus?.isConnected&&root.contains(returnFocus))returnFocus.focus({preventScroll:true});else root?.focus({preventScroll:true});}
  function surahOptions(id=pageItems().some(v=>v.s===state.surah)?state.surah:pageItems()[0].s){return quran.map(s=>`<option value="${s.id}" ${s.id===id?'selected':''}>${s.id}. ${esc(s.name)}</option>`).join('');}
  function openPanel(kind){
    if(kind==='mushaf'){closeSheet();return;}
    if(kind==='index')indexPanel();else if(kind==='search')searchPanel();else if(kind==='audio')audioPanel();else if(kind==='settings')settingsPanel();else if(kind==='wird')wirdPanel();else if(kind==='profile')profilePanel();else if(kind==='library')libraryPanel();else if(kind==='more')morePanel();
  }
  function indexPanel(){
    sheet('الفهرس',`<div class="aq-tabs"><button type="button" data-index-tab="surahs" class="selected">السور</button><button type="button" data-index-tab="juz">الأجزاء</button></div><label>السورة<select id="adSurah">${surahOptions()}</select></label><form id="aqJumpForm" class="aq-row"><label>رقم الصفحة<input id="aqJump" type="number" min="1" max="604" required value="${state.page}"></label><button type="submit">انتقال</button></form><div id="aqIndexList"></div>`);
    const list=tab=>{$('aqIndexList').innerHTML=tab==='juz'?meta.juzs.map(j=>`<button type="button" class="aq-list-row" data-goto="${pageOf(j.start)}">الجزء ${j.id}<small>صفحة ${pageOf(j.start)}</small></button>`).join(''):quran.map(s=>{const i=verses.findIndex(v=>v.s===s.id);return `<button type="button" class="aq-list-row" data-goto="${pageOf(i)}">${s.id}. سورة ${esc(s.name)}<small>${s.total_verses} آية · صفحة ${pageOf(i)}</small></button>`;}).join('');$('aqIndexList').querySelectorAll('[data-goto]').forEach(b=>b.onclick=()=>go(Number(b.dataset.goto)));};list('surahs');
    $('adSurah').onchange=e=>{const i=verses.findIndex(v=>v.s===Number(e.target.value));go(pageOf(i),i);};
    $('aqJumpForm').onsubmit=e=>{e.preventDefault();go(Number($('aqJump').value));};
    root.querySelectorAll('[data-index-tab]').forEach(b=>b.onclick=()=>{root.querySelectorAll('[data-index-tab]').forEach(x=>x.classList.toggle('selected',x===b));list(b.dataset.indexTab);});
  }
  function searchPanel(){
    searchLimit=60;sheet('البحث في القرآن',`<label>كلمة أو عبارة أو اسم سورة<input id="aqSearch" type="search" placeholder="ابحث في القرآن الكريم" value="${esc(query)}"></label><p id="aqSearchCount" role="status"></p><div id="aqSearchResults"></div><button type="button" id="aqMoreResults" hidden>نتائج أكثر</button>`);
    function draw(){query=$('aqSearch').value;const q=plain(query.trim());if(!q){$('aqSearchResults').innerHTML='';$('aqSearchCount').textContent='اكتب كلمة للبحث في السور والآيات';$('aqMoreResults').hidden=true;return;}
      const results=verses.map((v,i)=>({v,i})).filter(({v})=>v.search.includes(q)||plain(v.name).includes(q));
      $('aqSearchCount').textContent=results.length+' نتيجة';$('aqSearchResults').innerHTML=results.slice(0,searchLimit).map(({v,i})=>`<button type="button" class="aq-result" data-result="${i}"><b>${esc(v.name)} · الآية ${v.a}</b><span>${esc(v.text)}</span><small>صفحة ${pageOf(i)}</small></button>`).join('');
      $('aqMoreResults').hidden=results.length<=searchLimit;$('aqSearchResults').querySelectorAll('[data-result]').forEach(b=>b.onclick=()=>{const i=Number(b.dataset.result);go(pageOf(i),i);});
    }
    $('aqSearch').oninput=()=>{searchLimit=60;draw();};$('aqMoreResults').onclick=()=>{searchLimit+=60;draw();};draw();$('aqSearch').focus();
  }
  function quickSave(){
    if(!meta||root.dataset.ready!=='true')return;
    const start=meta.pages[state.page-1].start,end=state.page<604?meta.pages[state.page].start:verses.length;
    const i=Number.isInteger(state.lastVerse)&&state.lastVerse>=start&&state.lastVerse<end?state.lastVerse:start,v=verses[i];
    const old=state.bookmarks.find(b=>b.i===i);
    if(old){old.quick=true;old.page=state.page;}else state.bookmarks.push({i,page:state.page,label:`${v.name} · الآية ${v.a}`,color:'green',purpose:'الحفظ السريع',quick:true});
    state.lastVerse=i;if(!save()){$('aqQuickSave').textContent='تعذر الحفظ';return;}$('aqQuickSave').textContent='تم الحفظ ✓';notice('تم حفظ موضع القراءة في ملفاتي');
  }
  function bookmark(i){const v=verses[i];if(!v)return;const old=state.bookmarks.findIndex(b=>b.i===i);if(old>=0)state.bookmarks.splice(old,1);else {state.lastVerse=i;state.bookmarks.push({i,page:pageOf(i),label:`${v.name} · الآية ${v.a}`});}save();renderPage();notice(old>=0?'تم حذف العلامة':'تم حفظ العلامة في ملفاتي');}
  function versePanel(i){window.getSelection()?.removeAllRanges();root.querySelectorAll('.aq-selected').forEach(e=>e.classList.remove('aq-selected'));root.querySelectorAll(`[data-qr-verse="${i}"]`).forEach(e=>e.classList.add('aq-selected'));selected=i;state.lastVerse=i;save();const v=verses[i];sheet(`${v.name} · الآية ${v.a}`,`<p class="aq-quote">${esc(v.text)}</p><div class="aq-tools"><button type="button" id="aqVerseBookmark">علامة مرجعية</button><button type="button" id="aqVerseListen">استماع للآية</button><button type="button" id="aqVerseTafsir">التفسير الميسر</button><button type="button" id="aqVerseCopy">نسخ الآية</button></div><label>ملاحظة على الآية<textarea id="aqNote" rows="3" maxlength="2000">${esc(state.notes.find(n=>n.i===i)?.text||'')}</textarea></label><button type="button" id="aqSaveNote">حفظ الملاحظة</button><p id="aqVerseStatus" role="status"></p>`);
    $('aqSheet').dataset.kind='verse';
    const palette=document.createElement('div');palette.className='aq-mark-palette';
    palette.innerHTML=Object.entries(markColors).map(([key,[name,color]])=>`<button type="button" data-mark-color="${key}" style="--qr-mark:${color}" aria-label="علامة مرجعية باللون ${name}"><span aria-hidden="true">⚑</span><small>${name}</small></button>`).join('');
    $('aqSheetBody').append(palette);palette.querySelectorAll('[data-mark-color]').forEach(b=>b.onclick=()=>markPanel(i,b.dataset.markColor));
    $('aqVerseBookmark').onclick=()=>markPanel(i);$('aqVerseListen').onclick=()=>{closeSheet();startAudio(i);};$('aqVerseTafsir').onclick=()=>tafsirPanel(i);
    $('aqSaveNote').onclick=()=>{state.notes=state.notes.filter(n=>n.i!==i);const text=$('aqNote').value.trim();if(text)state.notes.push({i,text});save();$('aqVerseStatus').textContent=text?'تم حفظ الملاحظة':'تم حذف الملاحظة';};
    $('aqVerseCopy').onclick=async()=>{try{await navigator.clipboard.writeText(`${v.text} (${v.name}: ${v.a})`);if($('aqVerseStatus'))$('aqVerseStatus').textContent='تم نسخ الآية';}catch(_){if($('aqVerseStatus'))$('aqVerseStatus').textContent='تعذر النسخ؛ أعد المحاولة بعد السماح بالوصول إلى الحافظة';}};
  }

  function markPanel(i,preset){
    const v=verses[i],old=state.bookmarks.find(b=>b.i===i);
    sheet('علامة مرجعية',`<p>${esc(v.name)} · الآية ${v.a}</p><label>لون العلامة<select id="aqMarkColor">${Object.entries(markColors).map(([key,[name]])=>`<option value="${key}">${name}</option>`).join('')}</select></label><label>اسم العلامة أو معنى اللون (اختياري)<input id="aqMarkLabel" maxlength="80" value="${esc(old?.purpose||'')}"></label><p>اختر اللون وحدّد معناه كما يناسبك.</p><button type="button" id="aqSaveMark">حفظ العلامة</button><p id="aqMarkStatus" role="status"></p>`);
    $('aqMarkColor').value=markColors[preset]?preset:markColors[old?.color]?old.color:'blue';
    $('aqSaveMark').onclick=()=>{const color=$('aqMarkColor').value,purpose=$('aqMarkLabel').value.trim();state.bookmarks=state.bookmarks.filter(b=>b.i!==i);state.bookmarks.push({...(old||{}),i,page:pageOf(i),label:`${v.name} · الآية ${v.a}`,color,purpose});save();renderPage();$('aqMarkStatus').textContent='تم حفظ العلامة';};
  }
  function marksPanel(){
    sheet('علامات','<div id="aqMarks"></div><button type="button" id="aqBackProfile">رجوع إلى ملفاتي</button>');drawMarks();$('aqBackProfile').onclick=profilePanel;
  }
  function drawMarks(){
    $('aqMarks').innerHTML=state.bookmarks.filter(b=>verses[b.i]).map(b=>`<div class="aq-saved"><button type="button" data-saved="${b.i}"><span class="aq-mark-dot" style="--qr-mark:${markColors[b.color]?.[1]||markColors.blue[1]}"></span>${esc(b.label)} · صفحة ${pageOf(b.i)}<small>${esc(b.quick?'الحفظ السريع'+(b.purpose&&b.purpose!=='الحفظ السريع'?' · '+b.purpose:''):b.purpose||markColors[b.color]?.[0]||'أزرق')}</small></button><button type="button" data-edit-mark="${b.i}">تعديل</button><button type="button" data-delete-mark="${b.i}" aria-label="حذف العلامة">×</button></div>`).join('')||'<p>لم تحفظ علامة بعد.</p>';
    root.querySelectorAll('[data-saved]').forEach(b=>b.onclick=()=>go(pageOf(Number(b.dataset.saved)),Number(b.dataset.saved)));
    root.querySelectorAll('[data-edit-mark]').forEach(b=>b.onclick=()=>markPanel(Number(b.dataset.editMark)));
    root.querySelectorAll('[data-delete-mark]').forEach(b=>b.onclick=()=>{state.bookmarks=state.bookmarks.filter(x=>x.i!==Number(b.dataset.deleteMark));save();renderPage();drawMarks();});
  }

  function settingsPanel(){
    sheet('إعدادات المصحف',`<label>مظهر المصحف<select id="aqTheme"><option value="sepia">ورقي — المظهر الحالي</option><option value="ivory">عاجي بخط أسود</option><option value="white">أبيض</option><option value="night">ليلي</option><option value="green">أخضر هادئ</option><option value="blue">أزرق هادئ</option><option value="contrast">تباين عالٍ: أسود وأبيض</option></select></label><label>${phone?'تكبير القراءة':'حجم الخط'}<input id="aqFont" type="range" min="${phone?44:22}" max="${phone?80:46}" value="${state.font}"></label><p>المس الصفحة لإظهار الأدوات أو إخفائها. اضغط مطوّلاً على الآية لفتح خدماتها. تقليب الصفحات بالسحب يميناً ويساراً، أو بزرّي السابق والتالي.</p><p>يحفظ المصحف آخر صفحة وملاحظاتك على هذا الجهاز.</p>`);
    
    if(phone){const button=document.createElement('button');button.type='button';button.textContent='تنزيل صفحات المصحف للقراءة بدون إنترنت';const status=document.createElement('p');status.setAttribute('role','status');$('aqSheetBody').append(button,status);button.onclick=async()=>{button.disabled=true;let next=1,done=0;try{const cache=await caches.open(phone.cacheName||'aoqat-mushaf-phone-hafs');await Promise.all(Array.from({length:4},async()=>{while(next<=604){const n=next++,url=`${phone.directory}/${String(n).padStart(3,'0')}.json.gz`;if(!await cache.match(url)){const response=await fetch(mushafUrl(url));if(!response.ok)throw Error();await cache.put(url,response);}status.textContent=`تم تنزيل ${++done} / 604 صفحة`;}}));status.textContent='تم تنزيل المصحف كاملاً للقراءة بدون إنترنت';}catch(_){status.textContent='توقف التنزيل؛ الصفحات المكتملة محفوظة. يمكنك إعادة المحاولة.';}finally{button.disabled=false;}};}
    $('aqTheme').value=state.theme;$('aqTheme').onchange=e=>{state.theme=e.target.value;save();root.dataset.theme=state.theme;};$('aqFont').oninput=e=>{state.font=Number(e.target.value);state.fontCustomized=true;save();fit();};
  }
  function markRead(){const pages=readToday();if(!pages.includes(state.page))pages.push(state.page);state.days[today()]=pages;const keys=Object.keys(state.days);if(keys.length>90)delete state.days[keys[0]];save();}
  function wirdPanel(){
    const count=readToday().length;sheet('وردي اليومي',`<label>هدف القراءة اليومي (صفحات)<input id="aqGoal" type="number" min="1" max="604" value="${state.goal}"></label><button type="button" id="aqSaveGoal">حفظ الهدف</button><div class="aq-progress"><progress max="${state.goal}" value="${Math.min(count,state.goal)}"></progress><p>${count} من ${state.goal} صفحة اليوم</p></div><button type="button" id="aqMarkRead">قرأت الصفحة ${state.page}</button><button type="button" id="aqContinue">متابعة القراءة من الصفحة ${state.page}</button><p>علّم الصفحات التي قرأتها ليُحسب وردك اليومي.</p><p id="aqGoalStatus" role="status"></p>`);
    $('aqSaveGoal').onclick=()=>{const n=Number($('aqGoal').value);if(!Number.isInteger(n)||n<1||n>604){$('aqGoalStatus').textContent='اختر هدفاً من 1 إلى 604 صفحة';return;}state.goal=n;save();wirdPanel();};$('aqMarkRead').onclick=()=>{markRead();wirdPanel();};$('aqContinue').onclick=closeSheet;
  }
  function profilePanel(){
    sheet('ملفاتي',`<label>الاسم<input id="aqName" maxlength="60" value="${esc(state.name)}"></label><button type="button" id="aqSaveName">حفظ الاسم</button><p id="aqNameStatus" role="status"></p><button type="button" id="aqShowMarks">علامات</button><h4>العلامات المحفوظة</h4><div id="aqMarks"></div><h4>ملاحظاتي</h4><div id="aqNotes"></div>`);
    $('aqSaveName').onclick=()=>{state.name=$('aqName').value.trim();save();$('aqNameStatus').textContent='تم حفظ الاسم';};
    $('aqShowMarks').onclick=marksPanel;drawMarks();
    $('aqNotes').innerHTML=state.notes.length?state.notes.filter(n=>verses[n.i]).map(n=>`<div class="aq-saved"><button type="button" data-note="${n.i}">${esc(verses[n.i].name)} · ${verses[n.i].a}<small>${esc(n.text)}</small></button><button type="button" data-delete-note="${n.i}" aria-label="حذف الملاحظة">×</button></div>`).join(''):'<p>اضغط أي آية لإضافة ملاحظة.</p>';
    root.querySelectorAll('[data-saved]').forEach(b=>b.onclick=()=>go(pageOf(Number(b.dataset.saved)),Number(b.dataset.saved)));
    root.querySelectorAll('[data-note]').forEach(b=>b.onclick=()=>versePanel(Number(b.dataset.note)));
    root.querySelectorAll('[data-delete-mark]').forEach(b=>b.onclick=()=>{state.bookmarks=state.bookmarks.filter(x=>x.i!==Number(b.dataset.deleteMark));save();renderPage();profilePanel();});
    root.querySelectorAll('[data-delete-note]').forEach(b=>b.onclick=()=>{state.notes=state.notes.filter(x=>x.i!==Number(b.dataset.deleteNote));save();profilePanel();});
  }
  function audioPanel(){
    const first=meta.pages[state.page-1].start;
    sheet('التلاوة',`<label>القارئ<select id="aqReciter">${readers.map(([id,name])=>`<option value="${id}">${name}</option>`).join('')}</select></label><label>مستوى الصوت<input id="aqVolume" type="range" min="0" max="100" value="${state.volume}"></label><label>تكرار الآية<select id="aqRepeat"><option value="1">مرة واحدة</option><option value="3">3 مرات</option><option value="5">5 مرات</option></select></label><div class="aq-tools"><button type="button" id="aqAudioPlay">${audioOn?'استئناف / إعادة':'تشغيل من هذه الصفحة'}</button><button type="button" id="aqAudioPause">إيقاف مؤقت</button><button type="button" id="aqAudioStop">إيقاف التلاوة</button></div><p>التلاوة تحتاج اتصالاً بالإنترنت، وتتابع الآيات مع انتقال الصفحات.</p><p id="aqAudioStatus" role="status"></p>`);
    $('aqReciter').value=state.reciter;$('aqRepeat').value=String(audioRepeat);
    $('aqReciter').onchange=e=>{state.reciter=e.target.value;save();stopAudio();};$('aqVolume').oninput=e=>{state.volume=Number(e.target.value);if(audio)audio.volume=state.volume/100;save();};$('aqRepeat').onchange=e=>{audioRepeat=Number(e.target.value);repeated=0;};
    $('aqAudioPlay').onclick=()=>{if(audio&&audioIndex>=0&&audio.error){startAudio(audioIndex);}else if(audio&&audioIndex>=0&&audio.paused){audioOn=true;audio.play().then(()=>audioMessage('التلاوة قيد التشغيل')).catch(()=>audioMessage('تعذر تشغيل التلاوة؛ تحقق من الإنترنت واضغط تشغيل'));}else startAudio(first);};
    $('aqAudioPause').onclick=()=>{audio?.pause();audioOn=false;audioMessage('التلاوة متوقفة مؤقتاً');};$('aqAudioStop').onclick=()=>{stopAudio();audioMessage('توقفت التلاوة');};
    audioMessage(audioOn?'التلاوة قيد التشغيل':'اختر القارئ واضغط تشغيل');
  }
  function audioMessage(msg){if($('aqAudioStatus'))$('aqAudioStatus').textContent=msg;notice(msg);}
  function startAudio(i){
    if(!verses[i])return;audio?.pause();audioSequence++;const seq=audioSequence;audioIndex=i;audioOn=true;repeated=0;
    if(!audio)audio=new Audio();audio.volume=state.volume/100;
    function playVerse(){if(seq!==audioSequence||!audioOn)return;const p=pageOf(audioIndex);if(state.page!==p){state.page=p;save();renderPage(true);}root.querySelectorAll('.aq-playing').forEach(e=>e.classList.remove('aq-playing'));root.querySelectorAll(`[data-qr-verse="${audioIndex}"]`).forEach(e=>e.classList.add('aq-playing'));
      audio.src=`https://cdn.islamic.network/quran/audio/${state.reciter==='ar.abdulbasitmurattal'?192:128}/${state.reciter}/${audioIndex+1}.mp3`;audio.play().then(()=>{if(seq===audioSequence)audioMessage('تلاوة '+verses[audioIndex].name+' · الآية '+verses[audioIndex].a);}).catch(()=>{if(seq===audioSequence){audioOn=false;audioMessage('تعذر تشغيل التلاوة؛ تحقق من الإنترنت واضغط تشغيل');}});
    }
    audio.onended=()=>{if(seq!==audioSequence||!audioOn)return;repeated++;if(repeated<audioRepeat){playVerse();return;}repeated=0;if(audioIndex+1<verses.length){audioIndex++;playVerse();}else{stopAudio();audioMessage('انتهت التلاوة');}};
    audio.onerror=()=>{if(seq===audioSequence){audioOn=false;audioMessage('تعذر تحميل التلاوة؛ تحقق من الإنترنت');}};playVerse();
  }
  function stopAudio(){audioSequence++;audio?.pause();if(audio)audio.currentTime=0;audioOn=false;audioIndex=-1;root?.querySelectorAll('.aq-playing').forEach(e=>e.classList.remove('aq-playing'));}
  function libraryPanel(){
    sheet('المكتبة',`<button type="button" class="aq-list-row" id="aqLibraryTafsir">التفسير الميسر<small>تفسير الآية من الصفحة الحالية</small></button><button type="button" class="aq-list-row" id="aqLibraryGuide">دليل استخدام المصحف<small>القراءة والورد والعلامات</small></button><button type="button" class="aq-list-row" id="aqLibrarySources">مصادر المصحف<small>النص وتقسيم الصفحات والتلاوة</small></button>`);
    $('aqLibraryTafsir').onclick=()=>tafsirPanel(meta.pages[state.page-1].start);$('aqLibraryGuide').onclick=()=>sheet('دليل استخدام المصحف','<p>اسحب الصفحة أفقياً لتقليب المصحف، أو استخدم السابق والتالي. الفهرس ينقلك إلى السور والأجزاء والصفحات.</p><p>اضغط مطوّلاً على الآية لحفظ علامة أو كتابة ملاحظة أو سماعها أو قراءة تفسيرها. تجد العلامات والملاحظات في «ملفاتي».</p><p>حدّد هدفك في «وردي»، واضغط «قرأت الصفحة» بعد القراءة. يمكنك تغيير لون المصحف من إعداداته.</p>');$('aqLibrarySources').onclick=sourcesPanel;
  }
  function sourcesPanel(){sheet('مصادر المصحف',`<p>نص القرآن الموجود بالمشروع: Risan Quran JSON، 114 سورة و6236 آية، دون تغيير النص.</p><a href="https://github.com/risan/quran-json" target="_blank" rel="noopener">مصدر النص وترخيص CC BY-SA 4.0</a><p>حدود صفحات مصحف المدينة والأجزاء: مشروع تنزيل.</p><a href="https://tanzil.net/docs/Quran_Metadata" target="_blank" rel="noopener">بيانات تنزيل · CC BY</a><p>التلاوة والتفسير الميسر: Al Quran Cloud.</p><a href="https://alquran.cloud" target="_blank" rel="noopener">مصدر التلاوة والتفسير</a><p>خط حفص العثماني المستخدم بالمشروع. مرجع المقارنة: مصحف المدينة النبوية برواية حفص، الصادر عن مجمع الملك فهد.</p><a href="https://qurancomplex.gov.sa/quran-hafs/" target="_blank" rel="noopener">مصحف المدينة · المصدر الرسمي</a><p>قراءة الهاتف تعرض أشكال الحروف الأصلية من خطوط مجمع الملك فهد QCF2، مع بيانات الكلمات والأسطر من Quran Foundation. تبقى حدود الأسطر الأصلية، وتتكيّف المسافات بين الأسطر مع الشاشة. خيار الصفحة المصوّرة يعرض طبعة الجيب الأصلية. تم التحقق من تطابق ترتيب السور وحدود الصفحات مع النسخة المصوّرة في جميع الآيات؛ الانتقال بين العرضين يحافظ على موضع الآية. واجهة التطبيق من مشروعنا وليست اعتمادًا رسميًا من المجمع.</p><p>الواجهة مبنية لهذا المشروع؛ الأزرار مستوحاة من ترتيب السكرين المرجعي.</p>`);}
  function tafsirPanel(i){
    selected=i;const v=verses[i];sheet('التفسير الميسر',`<label>السورة<select id="aqTafsirSurah">${surahOptions(v.s)}</select></label><label>الآية<input id="aqTafsirAyah" type="number" min="1" max="${quran[v.s-1].total_verses}" value="${v.a}"></label><button type="button" id="aqLoadTafsir">عرض التفسير</button><p id="aqTafsirVerse" class="aq-quote">${esc(v.text)}</p><p id="aqTafsirText" role="status"></p><p class="aq-caption">التفسير الميسر · يحتاج اتصالاً بالإنترنت</p>`);
    $('aqTafsirSurah').onchange=e=>{$('aqTafsirAyah').value=1;$('aqTafsirAyah').max=quran[Number(e.target.value)-1].total_verses;};
    async function fetchTafsir(){const s=Number($('aqTafsirSurah').value),a=Number($('aqTafsirAyah').value);if(!Number.isInteger(a)||a<1||a>quran[s-1].total_verses){$('aqTafsirText').textContent='اختر رقم آية صحيحاً';return;}
      $('aqTafsirVerse').textContent=quran[s-1].verses[a-1].text;$('aqTafsirText').textContent='تحميل التفسير…';request?.abort();const controller=new AbortController();request=controller;
      try{const r=await fetch(`https://api.alquran.cloud/v1/ayah/${s}:${a}/ar.muyassar`,{signal:controller.signal});if(!r.ok)throw Error();const data=await r.json();if(!data.data?.text)throw Error();if(request===controller&&$('aqTafsirText'))$('aqTafsirText').textContent=data.data.text;}catch(e){if(e.name!=='AbortError'&&request===controller&&$('aqTafsirText'))$('aqTafsirText').textContent='تعذر تحميل التفسير. تحقق من الإنترنت وحاول مرة أخرى.';}
    }
    $('aqLoadTafsir').onclick=fetchTafsir;fetchTafsir();
  }
  function morePanel(){
    sheet('المزيد',`<div class="aq-tools"><button type="button" id="aqMoreMark">حفظ علامة الصفحة</button><button type="button" id="aqMoreRead">قرأت هذه الصفحة</button><button type="button" id="aqSharePage">مشاركة رابط الصفحة</button><button type="button" id="aqMoreSources">مصادر المصحف</button></div><p id="aqMoreStatus" role="status"></p>`);
    $('aqMoreMark').onclick=()=>{bookmark(meta.pages[state.page-1].start);$('aqMoreStatus').textContent='تم تحديث علامة الصفحة';};$('aqMoreRead').onclick=()=>{markRead();$('aqMoreStatus').textContent='تم تسجيل الصفحة ضمن ورد اليوم';};$('aqMoreSources').onclick=sourcesPanel;
    $('aqSharePage').onclick=async()=>{const url=new URL('https://aoqat.vercel.app/');url.searchParams.set('quranPage',state.page);url.searchParams.set('quranLayout',state.layout);try{if(navigator.share)await navigator.share({title:'القرآن الكريم · صفحة '+state.page,url:url.href});else{await navigator.clipboard.writeText(url.href);if($('aqMoreStatus'))$('aqMoreStatus').textContent='تم نسخ رابط الصفحة';}}catch(e){if(e.name!=='AbortError'&&$('aqMoreStatus'))$('aqMoreStatus').textContent='تعذر مشاركة الرابط';}};
  }
  async function open(element){
    host=element;const token=element;document.body.classList.add('quran-reader-open');shell();root.inert=true;notice('تحميل المصحف…');
    try{await load();if(host!==token||!token.isConnected)return;
      const url=new URL(location.href),shared=Number(url.searchParams.get('quranPage'));if(Number.isInteger(shared)&&shared>=1&&shared<=604){state.layout='phone';state.page=shared;save();url.searchParams.delete('quranPage');url.searchParams.delete('quranLayout');history.replaceState(history.state,'',url.href);}
      root.inert=false;renderPage();notice('');
    }catch(_){if(host===token&&token.isConnected){root.inert=false;$('adVerses').innerHTML='<p>تعذر فتح ملفات المصحف المحفوظة داخل التطبيق. أعد المحاولة؛ إذا استمرت المشكلة يلزم تحديث التطبيق.</p><button type="button" id="aqRetry">إعادة المحاولة</button>';$('aqRetry').onclick=()=>open(token);}}
  }
  function close(){clearTimeout(warmTask);save();clearTimeout(pressTimer);pointer=null;clearTurn();immersive(false);host=null;resize?.disconnect();request?.abort();request=null;stopAudio();document.body.classList.remove('quran-reader-open');}
  new MutationObserver(()=>{
    if(!host || !root?.isConnected)return;
    if(!document.body.classList.contains('design-menu-open')){
      immersive(false);clearTurn();clearTimeout(pressTimer);pointer=null;stopAudio();resize?.disconnect();
      if(document.body.classList.contains('quran-reader-open'))document.body.classList.remove('quran-reader-open');
    } else if(root.offsetParent && !document.body.classList.contains('quran-reader-open')){
      document.body.classList.add('quran-reader-open');resize?.observe($('aqPaper'));fit();
    }
  }).observe(document.body,{attributes:true,attributeFilter:['class']});
  const css=document.createElement('link');css.rel='stylesheet';css.href='css/quran-reader.css?v=ivory-2';document.head.appendChild(css);
  window.AoqatQuranReader={open,close};
  // Load the packaged text before the user opens its menu; failures remain retryable.
  load().catch(()=>{});
})();

;

/* js/adhan-settings.js */
(function () {
  "use strict";
  const C = window.AoqatAdhanCore,
    KEY = "aoqatAdhanV1",
    names = {
      fajr: "الفجر",
      sunrise: "الشروق",
      dhuhr: "الظهر",
      asr: "العصر",
      maghrib: "المغرب",
      isha: "العشاء",
      friday: "الجمعة",fridayFirst:"الجمعة الأول",fridaySecond:"الجمعة الثاني",
    },
    native = !!window.AndroidNative?.configureAdhan;
  let state;
  try {
    state = C.normalize(
      JSON.parse(
        native && window.AndroidNative.readAdhanSettings
          ? window.AndroidNative.readAdhanSettings()
          : localStorage.getItem(KEY) || "{}",
      ),
    );
  } catch (_) {
    state = C.defaults();
  }
  let rows = [],
    panel,
    servicePanel,
    externalService = false,
    audio,
    customURL,
    playing = false,
    playbackGeneration = 0,
    activePrayer = null,
    fridayAudio = false,
    lastTick = Date.now(),
    delivered = new Set(),
    audioUnlocked = false,
    audioUnlocking = false,
    quran,
    service = "",
    orientationHandler,
    locationBearing,
    openSection = "",
    silentSettingsOpen = false,
    quietWindow = null,
    selectedSurah = "1",
    azkarKind = "",
    azkarRemaining = {};
  const $ = (id) => document.getElementById(id),
    escape = (s) =>
      String(s).replace(
        /[&<>"']/g,
        (c) =>
          ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;",
          })[c],
      );
  function status(s) {
    if ($("adStatus")) $("adStatus").textContent = s;
  }
  function persist() {
    localStorage.setItem(KEY, JSON.stringify(state));
    if (native) window.AndroidNative.configureAdhan(JSON.stringify(state));
    document
      .querySelector('[data-drawer="adhanIqama"]')
      ?.classList.toggle("adhan-on", state.enabled);
    window.dispatchEvent(new Event("aoqatAdhanChanged"));
  }
  if(!native)window.AoqatWebQuietSettings={read:()=>C.normalize(state),save:patch=>{state=C.normalize({...state,...patch});persist();render();}};
  function audioDB() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open("aoqat-audio", 1);
      req.onupgradeneeded = () => req.result.createObjectStore("files");
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }
  async function customAudio(file) {
    const db = await audioDB();
    await new Promise((res, rej) => {
      const tx = db.transaction("files", "readwrite");
      tx.objectStore("files").put(file, "adhan");
      tx.oncomplete = res;
      tx.onerror = () => rej(tx.error);
    });
    db.close();
    localStorage.setItem("aoqatAudioName", file.name);
    state.sound = "custom";
    persist();
    render();
    status(
      "تم حفظ صوت الهاتف. حدّد نهاية التكبيرات الأربع إذا اخترت الأذان الجزئي.",
    );
  }
  async function source() {
    if (!native && state.sound === "3")
      return `assets/audio/adhan-quba-suraihi${state.partial ? "-short" : ""}.mp3`;
    if (state.sound !== "custom")
      return `assets/audio/adhan-v124-${state.sound}${state.partial ? "-short" : ""}.mp3`;
    if (customURL) return customURL;
    const db = await audioDB();
    const blob = await new Promise((res, rej) => {
      const req = db.transaction("files").objectStore("files").get("adhan");
      req.onsuccess = () => res(req.result);
      req.onerror = () => rej(req.error);
    });
    db.close();
    if (!blob) throw Error("اختر ملف الأذان من الهاتف أولًا");
    customURL = URL.createObjectURL(blob);
    return customURL;
  }
  // Prime the scheduled audio element with actual silence, even when a mobile
  // browser ignores programmatic volume changes.
  function unlockAudio() {
    if (native || (!state.enabled && !state.friday.enabled) || playing || activePrayer || audioUnlocked || audioUnlocking) return;
    if (!audio) audio = new Audio();
    const target = audio, generation = playbackGeneration;
    target.src = "data:audio/wav;base64,UklGRrQBAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YZABAACAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA";
    audioUnlocking = true;
    target.play().then(() => {
      audioUnlocked = true;
      if (generation === playbackGeneration) { target.pause(); target.currentTime = 0; }
    }).catch(() => {}).finally(() => { audioUnlocking = false; });
  }
  document.addEventListener("pointerdown", unlockAudio);
  function stop() {
    playbackGeneration++;
    activePrayer = null;
    if (native) window.AndroidNative.stopAdhan();
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
    }
    playing = false;fridayAudio=false;
    status("توقف الصوت");
  }
  async function play(preview = false, event) {
    if (!native && !preview && !event?.customFriday && window.aoqatPrayerNotificationSelected?.(event?.id)) return;
    stop();
    const generation = playbackGeneration;
    activePrayer = event ? (event.customFriday ? event.id : event.friday ? "friday" : event.id) : "preview";
    fridayAudio=event?.customFriday===true;
    if (native) {
      window.AndroidNative.previewAdhan(
        JSON.stringify({ ...state, preview, prayerId: event?.id || "fajr" }),
      );
      playing = true;
      status("تشغيل الصوت المختار");
      return;
    }
    const mode = event
      ? event.customFriday ? (state.friday[event.id==='fridayFirst'?'firstSound':'secondSound']?'sound':'silent') : state.modes[event.friday ? "friday" : event.id]
      : "sound";
    if (mode === "silent") { activePrayer = null; return; }
    if (!native && !preview && event) window.aoqatPrayerDueNotification?.(event.customFriday ? (event.id === 'fridaySecond' ? 'friday' : null) : event.friday ? 'friday' : event.id,event.at);
    if (!quietWindow && (mode === "vibrate" || state.vibrate) && navigator.vibrate)
      navigator.vibrate(
        state.pattern === "pulse"
          ? [250, 150, 250, 150, 250]
          : state.pattern === "long"
            ? 1000
            : 250,
      );
    if (mode === "vibrate") { activePrayer = null; return; }
    try {
      const src = await source();
      if (generation !== playbackGeneration) return;
      if (!audio) audio = new Audio();
      if (audio.getAttribute("src") !== src) audio.src = src;
      audio.volume = state.volume / 100;
      audio.muted = !!quietWindow && !event?.customFriday;
      audio.onended = () => {
        playing = false;
        activePrayer = null;
        status("انتهى الأذان");
      };
      audio.ontimeupdate = () => {
        if (
          state.sound === "custom" &&
          state.partial &&
          audio.currentTime >= state.customEnd
        )
          stop();
      };
      await audio.play();
      if (generation !== playbackGeneration) return;
      playing = true;
      status("تشغيل الصوت المختار");
    } catch (e) {
      if (generation !== playbackGeneration) return;
      activePrayer = null;
      status("تعذر تشغيل الصوت: " + e.message);
    }
  }
  async function loadRows() {
    rows = availablePrayerRows();
    if (rows.length) tick();
    await syncPrayerWindow();
    rows = availablePrayerRows();
    if (!rows.length) status("لا توجد مواقيت محفوظة؛ أعد المحاولة عند توفر الاتصال");
    tick();
  }
  window.addEventListener("aoqatPrayerRowsUpdated",()=>{rows=availablePrayerRows();if(panel)tick();});
  function check(key, label) {
    return `<label>${label}<input type="checkbox" data-setting="${key}" ${state[key] ? "checked" : ""}></label>`;
  }
  function number(key, label, max) {
    return `<label>${label}<input type="number" min="0" max="${max}" data-setting="${key}" value="${state[key]}"></label>`;
  }
  function fridayMarkup(){const f=state.friday;const checkF=(k,label)=>`<label>${label}<input type="checkbox" data-friday="${k}" ${f[k]?'checked':''}></label>`;const numberF=(k,label,min,max)=>`<label>${label}<input type="number" data-friday="${k}" min="${min}" max="${max}" step="1" value="${f[k]}"></label>`;return `<section id="adSection-friday" class="ad-section" hidden><div class="ad-card"><button type="button" id="adFridayBack" class="ad-inner-back">‹ رجوع إلى الأذان والتنبيه</button><h3>تخصيص صلاة الجمعة</h3>${checkF('enabled','تفعيل تخصيص صلاة الجمعة')}<p class="ad-note">الأذان الأول قبل وقت الظهر من قاعدة البيانات بـ15 دقيقة، والثاني بوقت الظهر. عند التفعيل تُستبدل إعدادات الظهر يوم الجمعة فقط؛ تبقى محفوظة لبقية الأيام.</p><fieldset ${f.enabled?'':'disabled'}>${numberF('reminder','بدء إشعار الأذان الأول قبله (دقيقة)',1,180)}${numberF('sermon','مدة عدّاد مضى على الخطبة (دقيقة)',1,120)}${checkF('firstSound','تشغيل صوت الأذان الأول')}${checkF('secondSound','تشغيل صوت الأذان الثاني')}<p class="ad-note">يُستخدم المؤذن ومستوى الصوت المختاران في «صوت الأذان». عدّاد باقي على الخطبة: 15 دقيقة.</p>${checkF('quiet','تفعيل الصامت أثناء الجمعة')}<label>وضع الهاتف<select data-friday="quietMode"><option value="silent" ${f.quietMode==='silent'?'selected':''}>صامت</option><option value="dnd" ${f.quietMode==='dnd'?'selected':''}>عدم الإزعاج</option></select></label><label>بدء الصامت<select data-friday="quietTiming"><option value="default" ${f.quietTiming==='default'?'selected':''}>قبل الأذان الأول بـ15 دقيقة</option><option value="custom" ${f.quietTiming==='custom'?'selected':''}>وقت مخصص قبل الأذان الأول</option></select></label>${f.quietTiming==='custom'?numberF('quietBefore','الصامت قبل الأذان الأول (دقيقة)',0,180):''}</fieldset><p class="ad-note">ينتهي الصامت بانتهاء مدة الخطبة ويُستعاد وضع الهاتف السابق. ${native?'الصامت وإشعار الخلفية يحتاجان أذونات Android.':'الويب يعرض العدادات والإشعار أثناء تشغيل الصفحة؛ التحكم بصامت الهاتف والخلفية يعملان في تطبيق Android.'}</p>${native?'<button type="button" id="adFridayPermissions">أذونات إشعار الجمعة والصامت</button>':''}</div></section>`;}
  function silentSettingsMarkup(){
    const s=state.afterIqamaSilent;
    return `<button type="button" id="adSilentSettingsToggle" class="ad-section-toggle ad-silent-toggle" aria-expanded="false" aria-controls="adSilentSettings">🤫 تفعيل وضع صامت بعد الإقامة</button><div id="adSilentSettings" class="ad-silent-settings" hidden><label>وضع صامت بعد الإقامة<input id="adSilentAfterEnabled" type="checkbox" ${s.enabled ? 'checked' : ''}></label><p class="ad-note">يبدأ عند الإقامة حسب المدة المحددة لكل صلاة في أوقات الإقامة. حدّد مدة الصامت بالدقائق؛ صفر لإيقافه لهذه الصلاة. الجمعة تتبع إعداد الظهر.</p><fieldset ${s.enabled ? '' : 'disabled'}>${C.ids.map(id=>`<label>${names[id]}<span class="ad-minute-control"><input type="number" min="0" max="120" step="1" data-silent-minutes="${id}" aria-label="مدة الصامت بعد إقامة ${names[id]}" value="${s.minutes[id]}"><span>دقيقة</span></span></label>`).join('')}</fieldset><p class="ad-note">يبدأ وضع الصامت عند الإقامة ويُستعاد وضع الهاتف السابق عند انتهاء المدة. يحتاج إذن التحكم بوضع الصامت في Android.</p></div>`;
  }
  function stopServiceSensors(){
    window.AoqatQuranReader?.close();
    if(!orientationHandler)return;
    window.removeEventListener('deviceorientationabsolute',orientationHandler);
    window.removeEventListener('deviceorientation',orientationHandler);orientationHandler=null;
  }
  function syncSections(){
    panel.querySelectorAll('[data-ad-section]').forEach(b=>{
      const open=(state.enabled||b.dataset.adSection==='friday')&&b.dataset.adSection===openSection;
      b.setAttribute('aria-expanded',String(open));b.classList.toggle('ad-section-active',open);
      $(b.getAttribute('aria-controls')).hidden=!open;
    });
    $("adSilentSettings").hidden=!silentSettingsOpen;
    $("adSilentSettingsToggle").setAttribute('aria-expanded',String(silentSettingsOpen));
  }
  function syncServices(){
    $("adServiceMenu").hidden=!!service;$("adServiceFrame").hidden=!service;
    $("adServiceTitle").textContent={quran:'القرآن الكريم',qibla:'اتجاه القبلة',azkar:'الأذكار',widget:'الصلاة القادمة على الهاتف'}[service]||'';
    if (servicePanel) { $("adServiceMenu").hidden=true; $("adServiceBack").hidden=true; }
    $("adService").hidden=service==='widget';$("adWidgetControls").hidden=service!=='widget';
  }
  function render() {
    if (!panel) return;
    panel.innerHTML = `<div class="ad-card"><div id="adNext" class="ad-next">تحميل المواقيت…</div><div id="adCountdown" class="ad-counter" style="text-align:center">00:00:00</div><div id="adDates" class="ad-note" style="text-align:center"></div><table id="adTimes"></table><button type="button" id="adRefresh">تحديث المواقيت</button></div>
 <button type="button" id="adEnable" class="ad-master ${state.enabled ? "on" : ""}" aria-pressed="${state.enabled}">${state.enabled ? "🔊 الأذان مفعل" : "🔇 الأذان متوقف — اضغط للتفعيل"}</button>
 <button type="button" class="ad-section-toggle" data-ad-section="friday" aria-expanded="false" aria-controls="adSection-friday"><span class="ad-section-icon" aria-hidden="true">🕌</span><span>تخصيص صلاة الجمعة</span><span class="ad-section-chevron" aria-hidden="true">‹</span></button>${fridayMarkup()}
 <fieldset class="ad-options" ${state.enabled ? "" : "disabled"}>
 <div class="ad-section-menu" aria-label="أقسام الأذان والتنبيه">${[
   ["sound", "🔊", "صوت الأذان"], ["notifications", "🔔", "التنبيهات"],
   ["modes", "🕌", "وضع الأذان لكل صلاة"], ...[],
 ].map(([id, icon, title])=>`<button type="button" class="ad-section-toggle" data-ad-section="${id}" aria-expanded="false" aria-controls="adSection-${id}"><span class="ad-section-icon" aria-hidden="true">${icon}</span><span>${title}</span><span class="ad-section-chevron" aria-hidden="true">‹</span></button>`).join("")}</div>
 <section id="adSection-sound" class="ad-section" hidden><div class="ad-card"><h3>صوت الأذان</h3><label>المؤذن<select data-setting="sound">${[
   ["1", "أذان مكة — علي أحمد ملا"],
   ["2", "أذان المدينة — الحرم النبوي"],
   ["3", "أذان مسجد قباء — عبدالمجيد السريحي"],
   ["4", "ناصر القطامي"],
   ["custom", "صوت من الهاتف"],
 ]
   .map(
     ([v, n]) =>
       `<option value="${v}" ${state.sound === v ? "selected" : ""}>${n}</option>`,
   )
   .join(
     "",
   )}</select></label><button type="button" id="adChoose">اختيار صوت من الهاتف</button><span class="ad-note">${escape(localStorage.getItem("aoqatAudioName") || "")}</span><input type="file" id="adFile" accept="audio/*" hidden><label>مستوى الصوت <output id="adVolume">${state.volume}%</output><input type="range" min="0" max="100" value="${state.volume}" data-setting="volume"></label>${check("partial", "أذان جزئي — التكبيرات الأربع فقط")}${state.sound === "custom" ? number("customEnd", "نهاية التكبيرات الأربع في ملفك (ثانية)", 180) : ""}<button type="button" id="adPreview">▶ تجربة الصوت</button><button type="button" id="adStop">■ إيقاف</button></div>
 </section><section id="adSection-modes" class="ad-section" hidden><div class="ad-card"><h3>وضع الأذان لكل صلاة</h3><button type="button" data-global-mode="sound">🔊 عام للجميع</button><button type="button" data-global-mode="silent">🔇 صامت للجميع</button>${[
   ...C.ids,
   ...[],
 ]
   .map(
     (id) =>
       `<div class="ad-mode"><span>${names[id]}</span><div>${[
         ["sound", "🔊", "عام"],
         ["vibrate", "📳", "اهتزاز"],
         ["silent", "🔇", "صامت"],
       ]
         .map(
           ([v, i, l]) =>
             `<button type="button" data-prayer="${id}" data-mode="${v}" class="${state.modes[id] === v ? "selected" : ""}" aria-label="${names[id]} ${l}" aria-pressed="${state.modes[id] === v}">${i}<small>${v === "sound" ? "صوت" : v === "vibrate" ? "هزاز" : "صامت"}</small></button>`,
         )
         .join("")}</div></div>`,
   )
   .join(
     "",
   )}<p class="ad-note">${native ? "إعداد الجمعة يُستخدم بدل الظهر يوم الجمعة. " : ""}الشروق للعرض فقط ولا يُشغّل أذانًا.</p></div>
 </section><section id="adSection-notifications" class="ad-section" hidden><div class="ad-card"><h3>التنبيهات</h3>${check("vibrate", "اهتزاز مصاحب للأذان")}<label>نوع الاهتزاز<select data-setting="pattern">${[
   ["short", "قصير"],
   ["long", "طويل"],
   ["pulse", "نبضات"],
 ]
   .map(
     ([v, n]) =>
       `<option value="${v}" ${state.pattern === v ? "selected" : ""}>${n}</option>`,
   )
   .join(
     "",
   )}</select></label>${number("reminder", "تنبيه قبل الصلاة (دقيقة؛ صفر للإيقاف)", 60)}${number("suhoor", "تنبيه السحور قبل الفجر (دقيقة؛ صفر للإيقاف)", 120)}${native ? `${check("overrideSilent", "تشغيل الأذان والتذكير حتى إذا الهاتف صامت")}${check("screen", "إضاءة شاشة القفل للأذان والتذكير")}${check("flip", "إيقاف الأذان عند قلب الهاتف")}${number("afterSilent", "صمت الهاتف بعد الأذان (دقيقة؛ صفر للإيقاف)", 60)}<button type="button" id="adPermission">أذونات الصوت وشاشة القفل</button>` : '<p class="ad-note">على الويب يعمل الصوت والاهتزاز أثناء فتح الصفحة وبعد تفاعل المستخدم. تشغيل الأذان والتذكير في الخلفية، والتحكم بصمت الهاتف وشاشة القفل متاحة في تطبيق Android.</p>'}${silentSettingsMarkup()}</div></section>
 <section id="adSection-services" class="ad-section" hidden><div class="ad-card"><h3>الخدمات</h3><div id="adServiceMenu" class="ad-service-menu"><button type="button" data-service="quran">📖 القرآن الكريم</button><button type="button" data-service="qibla">🧭 اتجاه القبلة</button><button type="button" data-service="azkar">📿 الأذكار</button>${native ? '<button type="button" data-service="widget">📱 الصلاة القادمة على الهاتف</button>' : ''}</div><div id="adServiceFrame" class="ad-service-frame" hidden><button type="button" id="adServiceBack" class="ad-inner-back">‹ رجوع إلى الخدمات</button><h4 id="adServiceTitle"></h4><div id="adService" class="ad-service"></div><div id="adWidgetControls" hidden> ${
   native
     ? `<div class="ad-card"><h3>الصلاة القادمة على الهاتف</h3>${check("persistent", "إشعار مستمر للصلاة القادمة")}<label>خلفية الودجت<select data-setting="widget">${[
         ["transparent", "شفافة"],
         ["light", "فاتحة"],
         ["dark", "داكنة"],
       ]
         .map(
           ([v, n]) =>
             `<option value="${v}" ${state.widget === v ? "selected" : ""}>${n}</option>`,
         )
         .join(
           "",
         )}</select></label><button type="button" id="adWidget">إضافة ودجت للشاشة الرئيسية</button></div>`
     : ""
 }
</div></div></div></section></fieldset><div id="adQuietStatus" class="ad-note" hidden role="status"></div><div id="adStatus" class="ad-status" role="status" aria-live="polite"></div>`;
    if (servicePanel) {
      const services = panel.querySelector("#adSection-services"); services.hidden = false;
      services.querySelector("h3")?.remove();
      servicePanel.replaceChildren(services);
    }
    panel.querySelectorAll("[data-ad-section]").forEach((button)=>{
      button.onclick=()=>{
        if(!state.enabled&&button.dataset.adSection!=='friday')return;
        openSection=openSection===button.dataset.adSection ? "" : button.dataset.adSection;
        if(openSection!=="services")stopServiceSensors();
        syncSections();
        if(openSection==="modes")requestAnimationFrame(()=>$("adSection-modes").scrollIntoView({block:"start",behavior:"auto"}));
        if(openSection==="services" && service)showService(service);
      };
    });
    $('adFridayBack').onclick=()=>{openSection='';syncSections();};
    panel.querySelectorAll('[data-friday]').forEach(input=>input.onchange=async()=>{state.friday[input.dataset.friday]=input.type==='checkbox'?input.checked:input.type==='number'?Number(input.value):input.value;state.friday=C.normalizeFriday(state.friday);persist();render();if(state.friday.enabled&&!native&&'Notification' in window&&Notification.permission==='default')await Notification.requestPermission();});
    $('adFridayPermissions')?.addEventListener('click',()=>window.AndroidNative?.adhanPermissions());
    $("adSilentSettingsToggle").onclick=()=>{silentSettingsOpen=!silentSettingsOpen;syncSections();};
    $("adSilentAfterEnabled").onchange=(e)=>{state.afterIqamaSilent.enabled=e.target.checked;persist();render();};
    panel.querySelectorAll("[data-silent-minutes]").forEach((input)=>input.onchange=()=>{
      state.afterIqamaSilent.minutes[input.dataset.silentMinutes]=Number(input.value);
      state=C.normalize(state);persist();render();
    });
    $("adServiceBack").onclick=()=>{service="";stopServiceSensors();syncServices();};
    document.querySelectorAll("#adhanPanel [data-setting], #prayerServicePanel [data-setting]").forEach((el) =>
      el.addEventListener("change", () => {
        const k = el.dataset.setting;
        state[k] =
          el.type === "checkbox"
            ? el.checked
            : el.type === "number" || el.type === "range"
              ? +el.value
              : el.value;
        state = C.normalize(state);
        if (!state.enabled) stop();
        persist();
        render();
      }),
    );
    panel
      .querySelector('[data-setting="volume"]')
      .addEventListener("input", (e) => {
        $("adVolume").textContent = e.target.value + "%";
        if (audio) audio.volume = +e.target.value / 100;
      });
    $("adEnable").onclick = () => {
      state.enabled = !state.enabled;
      if (!state.enabled) {stop();openSection="";service="";stopServiceSensors();}
      if (
        state.enabled &&
        !native &&
        "Notification" in window &&
        Notification.permission === "default"
      )
        Notification.requestPermission();
      lastTick = Date.now();
      if (state.enabled) unlockAudio();
      persist();
      render();
      status(
        state.enabled
          ? "تم تفعيل الأذان حسب جدول قاعدة البيانات"
          : "تم إيقاف الأذان",
      );
    };
    $("adRefresh").onclick = loadRows;
    $("adPreview").onclick = () => play(true);
    $("adStop").onclick = stop;
    $("adChoose").onclick = () =>
      native ? window.AndroidNative.chooseAdhanAudio() : $("adFile").click();
    $("adFile").onchange = async (e) => {
      const f = e.target.files[0];
      if (!f) return;
      if (!f.type.startsWith("audio/")) return status("اختر ملفًا صوتيًا");
      try {
        if (customURL) URL.revokeObjectURL(customURL);
        customURL = null;
        await customAudio(f);
      } catch (_) {
        status("تعذر حفظ الملف الصوتي");
      }
    };
    panel.querySelectorAll("[data-global-mode]").forEach(
      (b) =>
        (b.onclick = () => {
          for (const id of [...C.ids, "friday"])
            state.modes[id] = b.dataset.globalMode;
          if (!native && b.dataset.globalMode !== "sound") stop();
          persist();
          render();
        }),
    );
    panel.querySelectorAll("[data-mode]").forEach(
      (b) =>
        (b.onclick = () => {
          state.modes[b.dataset.prayer] = b.dataset.mode;
          if (!native && b.dataset.mode !== "sound" && (activePrayer === b.dataset.prayer || activePrayer === "preview")) stop();
          persist();
          render();
        }),
    );
    if (native) {
      $("adWidget").onclick = () => window.AndroidNative.pinPrayerWidget();
      $("adPermission").onclick = () => window.AndroidNative.adhanPermissions();
    }
    panel
      .querySelectorAll("[data-service]")
      .forEach((b) => (b.onclick = () => showService(b.dataset.service)));
    tick();
    syncSections();
    syncServices();
    if (service && (externalService || (openSection==="services" && state.enabled))) showService(service);
    persist();
  }
  function tick() {
    const now = new Date(),
      displayDate = C.displayDate(rows, now),
      ev = C.events(rows, now, state),
      next = ev.find((e) => e.at > now.getTime());
    if ($("adNext"))
      $("adNext").textContent = next
        ? "الصلاة القادمة: " + names[next.id]
        : "المواقيت غير متاحة";
    if ($("adCountdown")) {
      let n = next ? Math.max(0, Math.floor((next.at - now) / 1000)) : 0;
      $("adCountdown").textContent = [
        Math.floor(n / 3600),
        Math.floor(n / 60) % 60,
        n % 60,
      ]
        .map((n) => String(n).padStart(2, "0"))
        .join(":");
    }
    if ($("adDates"))
      $("adDates").textContent =
        new Intl.DateTimeFormat("ar-IQ", { dateStyle: "full" }).format(displayDate) +
        " • " +
        new Intl.DateTimeFormat("ar-SA-u-ca-islamic", {
          day: "numeric",
          month: "long",
          year: "numeric",
        }).format(displayDate);
    const row = rows.find(
      (r) =>
        +r.gregorian_month === displayDate.getMonth() + 1 &&
        +r.gregorian_day === displayDate.getDate(),
    );
    if ($("adTimes"))
      $("adTimes").innerHTML = [
        "fajr",
        "sunrise",
        "dhuhr",
        "asr",
        "maghrib",
        "isha",
      ]
        .map(
          (id) =>
            `<tr><td>${names[id]}</td><td>${escape(row?.[id]?.slice(0, 5) || "—")}</td></tr>`,
        )
        .join("");
    let iqama={};
    try{iqama=JSON.parse(localStorage.getItem("aoqatIqamaMinutesV1")||"{}");}catch(_){}
    quietWindow=C.fridayQuietWindow(rows,now,state)||C.afterIqamaSilentWindow(rows,now,state,iqama);
    if(!native && audio)audio.muted=!!quietWindow&&!fridayAudio;
    const quietStatus=$("adQuietStatus");
    if(quietStatus){quietStatus.hidden=!quietWindow;quietStatus.textContent=quietWindow
      ? (quietWindow.prayerId==='friday'?'الصامت لصلاة الجمعة':(quietWindow.source==='adhan'?"الصامت عند أذان ":"الصامت بعد إقامة ")+names[quietWindow.prayerId])+": "+Math.ceil((quietWindow.end-now)/60000)+" دقيقة متبقية" : "";}
    if (!native && (state.enabled||state.friday.enabled)) {
      for (const e of ev) {
        if(!e.customFriday&&!state.enabled)continue;
        if (e.at > lastTick && e.at <= now && now - e.at < 120000) {
          const key = e.id + ":" + e.at;
          if (!delivered.has(key)) { delivered.add(key); play(false, e); }
        }
        if(e.customFriday)continue;
        for (const [key, title] of [
          ["reminder", "تذكير بالصلاة"],
          ["suhoor", "تذكير بالسحور"],
        ]) {
          if (key === "suhoor" && e.id !== "fajr") continue;
          const at = e.at - state[key] * 60000;
          if (state[key] > 0 && at > lastTick && at <= now && now - at < 120000) {
            status(title + " — " + names[e.id]);
            if (
              "Notification" in window &&
              Notification.permission === "granted"
            )
              new Notification(title, {
                body: names[e.id],
                tag: "aoqat-prayer-reminder",
                silent: !!quietWindow,
              });
          }
        }
      }
    }
    lastTick = now.getTime();
  }
  window.aoqatNativeAdhanSettings = (s) => {
    state = C.normalize(s);
    localStorage.setItem(KEY, JSON.stringify(state));
    render();
  };
  window.aoqatAudioChosen = (name) => {
    localStorage.setItem("aoqatAudioName", name);
    state.sound = "custom";
    persist();
    render();
    status("تم حفظ صوت الهاتف");
  };
  window.aoqatAdhanStatus = status;
  window.aoqatOpenService = (kind) => {
    if (!["quran","qibla","azkar","widget"].includes(kind)) return;
    externalService = true;
    showService(kind);
  };
  window.aoqatCloseService = () => {
    if (!externalService) return;
    window.aoqatCloseAzkarCategory?.();window.aoqatAzkarCategory="";
    document.getElementById("prayerServicePanel")?.classList.remove("web-azkar-flat");
    externalService = false; service = ""; stopServiceSensors();
  };
  async function showService(kind) {
    if(!externalService && (!state.enabled || openSection!=="services"))return;
    service = kind;
    syncServices();
    const el = $("adService");
    if (!el) return;
    el.classList.add("open");
    if (orientationHandler) {
      window.removeEventListener(
        "deviceorientationabsolute",
        orientationHandler,
      );
      window.removeEventListener("deviceorientation", orientationHandler);
      orientationHandler = null;
    }
    if (kind === "widget")return;
    if (kind === "quran") {
      try {
        if (!window.AoqatQuranReader) {
          if (!window.aoqatQuranReaderLoading) window.aoqatQuranReaderLoading = new Promise((resolve,reject)=>{
            const script=document.createElement("script");script.src="js/quran-reader.js";
            script.onload=resolve;script.onerror=()=>{script.remove();window.aoqatQuranReaderLoading=null;reject(Error());};document.head.appendChild(script);
          });
          await window.aoqatQuranReaderLoading;
        }
        if(service!==kind || !el.isConnected || !externalService)return;
        await window.AoqatQuranReader.open(el);
      } catch (_) { if(service===kind && el.isConnected) el.textContent="تعذر تحميل المصحف؛ افتح القرآن مرة أخرى للمحاولة."; }
      return;
    }
    if (kind === "quran") {
      el.innerHTML = "<p>تحميل القرآن الكريم…</p>";
      try {
        if (!quran) {
          const r = await fetch("assets/quran.json");
          if (!r.ok) throw Error();
          quran = await r.json();
        }
        if(service!==kind || !el.isConnected)return;
        el.innerHTML =
          '<label>السورة<select id="adSurah">' +
          quran
            .map(
              (s) =>
                `<option value="${s.id}">${s.id}. ${escape(s.name)}</option>`,
            )
            .join("") +
          '</select></label><div id="adVerses" class="ad-verse"></div>';
        const draw = () => {
          selectedSurah=$("adSurah").value;
          const s = quran.find((s) => s.id === +selectedSurah);
          $("adVerses").textContent = s.verses
            .map((v) => v.text + " ﴿" + v.id + "﴾")
            .join(" ");
        };
        $("adSurah").value=selectedSurah;
        $("adSurah").onchange = draw;
        draw();
      } catch (_) {
        if(service!==kind || !el.isConnected)return;
        el.textContent = "تعذر تحميل القرآن الكريم";
      }
    } else if (kind === "qibla") {
      if (native) {
        el.innerHTML =
          '<button type="button" id="adNativeQibla">فتح بوصلة القبلة</button>';
        $("adNativeQibla").onclick = () => window.AndroidNative.openQibla();
        return;
      }
      el.innerHTML =
        '<div class="ad-qibla-card"><div class="ad-qibla-head"><h3>اتجاه القبلة</h3></div><p class="ad-qibla-hint">حدّد موقعك، ثم وجّه الهاتف بعيداً عن المعادن للحصول على اتجاه دقيق.</p><div class="ad-qibla-compass-wrap"><div class="ad-compass"><span id="adArrow" class="ad-arrow">↑</span></div></div><button type="button" id="adQiblaStart" class="ad-qibla-start">تحديد القبلة بموقعي</button><p id="adQiblaInfo" class="ad-qibla-info" aria-live="polite"></p></div>';
      $("adQiblaStart").onclick = async () => {
        try {
          if (
            typeof window.DeviceOrientationEvent?.requestPermission ===
              "function" &&
            (await DeviceOrientationEvent.requestPermission()) !== "granted"
          )
            throw Error("لم يُسمح بحساس الاتجاه");
          navigator.geolocation.getCurrentPosition(
            (p) => {
              if(service!=="qibla"||(!externalService && (openSection!=="services"||!state.enabled))||!el.isConnected)return;
              const rad = Math.PI / 180,
                a = p.coords.latitude * rad,
                dl = (39.8262 - p.coords.longitude) * rad,
                b = 21.4225 * rad;
              locationBearing =
                (Math.atan2(
                  Math.sin(dl) * Math.cos(b),
                  Math.cos(a) * Math.sin(b) -
                    Math.sin(a) * Math.cos(b) * Math.cos(dl),
                ) /
                  rad +
                  360) %
                360;
              $("adQiblaInfo").textContent =
                "اتجاه القبلة " +
                locationBearing.toFixed(1) +
                "° من الشمال. حرّك الهاتف لتفعيل البوصلة.";
              orientationHandler = (e) => {
                if (e.alpha === null || service!=="qibla" || (!externalService && openSection!=="services")) return;
                const heading =
                  e.webkitCompassHeading ?? (e.absolute ? 360 - e.alpha : null);
                if (heading === null) {
                  $("adQiblaInfo").textContent =
                    "حساس الهاتف لا يوفر اتجاه الشمال الحقيقي؛ القبلة " +
                    locationBearing.toFixed(1) +
                    "° من الشمال";
                  return;
                }
                $("adArrow").style.transform =
                  `rotate(${locationBearing - heading}deg)`;
                $("adQiblaInfo").textContent =
                  "وجّه الهاتف باتجاه السهم • " +
                  locationBearing.toFixed(1) +
                  "°";
              };
              window.addEventListener(
                "deviceorientationabsolute",
                orientationHandler,
              );
              window.addEventListener("deviceorientation", orientationHandler);
            },
            (e) => {
              if(!$("adQiblaInfo")||service!=="qibla")return;
              $("adQiblaInfo").textContent = "تعذر تحديد الموقع: " + e.message;
            },
          );
        } catch (e) {
          $("adQiblaInfo").textContent = e.message;
        }
      };
    } else {
      if(window.aoqatRenderAzkar){window.aoqatRenderAzkar(el);return;}
      el.innerHTML='<div class="ad-azkar-menu">'+[["morning","☀️","أذكار الصباح"],["evening","🌙","أذكار المساء"],["prayer","🕌","أذكار بعد الصلاة"]].map(([id,icon,title])=>`<button type="button" data-azkar-kind="${id}" aria-pressed="${azkarKind===id}">${icon} ${title}</button>`).join('')+'</div><div id="adAzkarList" hidden></div>';
      const draw=()=>{
        const list=window.AoqatAzkar[azkarKind];
        $("adAzkarList").hidden=!list;
        el.querySelectorAll('[data-azkar-kind]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.azkarKind===azkarKind)));
        if(!list)return;
        $("adAzkarList").innerHTML=list.map((x,i)=>{
          const key=azkarKind+':'+i,n=azkarRemaining[key]??x.count;
          return `<div class="ad-azkar"><div>${escape(x.text)}</div><small class="ad-note">${escape(x.ref)}</small><br><button type="button" data-dhikr="${i}" data-remaining="${n}" ${n ? '' : 'disabled'}>${n ? 'العدد المتبقي: '+n : '✓ اكتمل'}</button></div>`;
        }).join('');
        $("adAzkarList").querySelectorAll('[data-dhikr]').forEach(b=>b.onclick=()=>{
          const n=Math.max(0,+b.dataset.remaining-1);azkarRemaining[azkarKind+':'+b.dataset.dhikr]=n;
          b.dataset.remaining=n;b.textContent=n ? 'العدد المتبقي: '+n : '✓ اكتمل';b.disabled=!n;
        });
      };
      el.querySelectorAll('[data-azkar-kind]').forEach(b=>b.onclick=()=>{azkarKind=b.dataset.azkarKind;draw();});
      draw();
    }
  }

  function install() {
    const home = document.querySelector(".sidebar .main-panel");
    if (!home) return false;
    if ($("adhanPanel")) return true;
    panel = document.createElement("section");
    panel.id = "adhanPanel";
    panel.className = "panel inline-control-panel";
    panel.style.display = "none";
    home.appendChild(panel);
    {
      servicePanel = document.createElement("section");
      servicePanel.id = "prayerServicePanel";
      servicePanel.className = "panel inline-control-panel";
      servicePanel.style.display = "none";
      home.appendChild(servicePanel);
    }
    render();
    loadRows();
    setInterval(tick, 1000);
    return true;
  }
  function start() {
    if (install()) return;
    const t = setInterval(() => {
      if (install()) clearInterval(t);
    }, 200);
  }
  if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", start, { once: true });
  else start();
})();


;

/* js/friday-reminders-core.js */
(function(root){'use strict';
  const defaults=()=>({enabled:true,sunnah:true,kahf:true,afterMaghrib:20,kahfTime:'09:00'});
  function clock(value){const m=/^(\d{2}):(\d{2})$/.exec(String(value));return m&&+m[1]<24&&+m[2]<60?+m[1]*60+(+m[2]):null;}
  function normalize(raw={}){const s=defaults();s.enabled=raw?.enabled!==false;s.sunnah=raw?.sunnah!==false;s.kahf=raw?.kahf!==false;const n=Number(raw?.afterMaghrib);if(Number.isInteger(n)&&n>=0&&n<=120)s.afterMaghrib=n;if(clock(raw?.kahfTime)!==null)s.kahfTime=raw.kahfTime;return s;}
  function dateParts(now){const p=Object.fromEntries(new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Baghdad',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now).map(x=>[x.type,x.value]));const key=p.year+'-'+p.month+'-'+p.day;return {key,month:+p.month,day:+p.day,weekday:new Date(key+'T00:00:00Z').getUTCDay(),start:new Date(key+'T00:00:00+03:00').getTime()};}
  function prayerMinutes(value,id){const m=/^(\d{1,2}):(\d{2})$/.exec(String(value));if(!m||+m[1]>23||+m[2]>59)return null;let h=+m[1];if(id==='maghrib'&&h<12)h+=12;if(id==='fajr'&&h===12)h=0;return h*60+(+m[2]);}
  function events(now,raw,row){const s=normalize(raw),d=dateParts(now),out=[];if(!s.enabled)return out;if(!row||+row.gregorian_month!==d.month||+row.gregorian_day!==d.day)return out;
    const maghrib=prayerMinutes(row.maghrib,'maghrib');
    if(s.sunnah&&d.weekday===4&&maghrib!==null)out.push({kind:'sunnah',key:'sunnah:'+d.key,at:d.start+(maghrib+s.afterMaghrib)*60000,title:'تذكير بسنن الجمعة',body:'دخلت ليلة الجمعة. تذكّر الصلاة على النبي ﷺ والاستعداد للغسل والتطيّب والتبكير غداً.'});
    const time=clock(s.kahfTime),fajr=prayerMinutes(row.fajr,'fajr');
    if(s.kahf&&d.weekday===5&&time!==null&&fajr!==null&&maghrib!==null&&time>=fajr&&time<maghrib)out.push({kind:'kahf',key:'kahf:'+d.key,at:d.start+time*60000,title:'تذكير بقراءة سورة الكهف',body:'تذكير بقراءة سورة الكهف اليوم. وقت قراءتها واسع خلال نهار الجمعة.'});return out;
  }
  const api={defaults,normalize,clock,dateParts,events,prayerMinutes};root.AoqatFridayRemindersCore=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window==='undefined'?globalThis:window);

;

/* js/reminder-inbox.js */
(function(){'use strict';
  
  const KEY='aoqatReminderInboxV1',TTL=86400000;
  const excluded=new Set(['prayer','adhan','iqama','prayer-alarm','prayer-notice','tomorrow-publish-alarm']);
  function read(now=Date.now()){
    let rows;try{rows=JSON.parse(localStorage.getItem(KEY)||'[]');}catch(_){rows=[];}
    if(!Array.isArray(rows))rows=[];
    rows=rows.filter(x=>x&&typeof x.id==='string'&&typeof x.title==='string'&&typeof x.body==='string'&&Number.isFinite(x.createdAt)&&now-x.createdAt<TTL&&x.createdAt<=now&&!excluded.has(x.kind));
    try{localStorage.setItem(KEY,JSON.stringify(rows));}catch(_){}
    return rows;
  }
  function add(event){
    if(!event||excluded.has(event.kind)||event.kind==='preview')return null;
    const now=Date.now(),createdAt=Number.isFinite(event.createdAt)?event.createdAt:now;if(now-createdAt>=TTL||createdAt>now)return null;const entry={id:String(event.id||event.key||('reminder-'+now)),kind:String(event.kind||'reminder'),title:String(event.title||'تذكير'),body:String(event.body||''),createdAt,section:event.section==='calendar'?'calendar':event.section==='azkar'?'azkar':event.section==='fasting'?'fasting':'friday',topicId:String(event.topicId||''),action:event.action==='post'?'post':'detail',targetDate:/^\d{4}-\d{2}-\d{2}$/.test(event.targetDate||'')?event.targetDate:''};
    const rows=read(now);if(rows.some(x=>x.id===entry.id))return rows.find(x=>x.id===entry.id);
    rows.unshift(entry);try{localStorage.setItem(KEY,JSON.stringify(rows));}catch(_){}
    window.dispatchEvent(new Event('aoqatInboxChanged'));return entry;
  }
  function text(tag,value){const e=document.createElement(tag);e.textContent=value;return e;}
  function createView(id){
    const wrap=document.createElement('section');wrap.id='reminderInbox';wrap.dir='rtl';
    const rows=read(),entry=id?rows.find(x=>x.id===id):null;
    if(id){
      if(!entry){wrap.append(text('p','انتهت مدة هذا الإشعار أو لم يعد متاحاً.'));return wrap;}
      wrap.append(text('h3',entry.title),text('p',entry.body));
      const b=text('button',entry.section==='calendar'?'معاينة التقويم ومشاركته':entry.section==='azkar'?'فتح الأذكار':entry.action==='post'?'معاينة البوست ونشره':entry.section==='fasting'?'عرض شرح صيام التطوع والمصادر':'عرض سنن يوم الجمعة و آدابها والمصادر');b.type='button';b.className='main-action';b.onclick=()=>entry.section==='calendar'?window.AoqatCalendars?.openDate(entry.targetDate):entry.section==='azkar'?window.AoqatAzkarReminders?.open(entry.topicId):entry.action==='post'?window.aoqatOpenCommunityPost?.(entry.section,entry.topicId,entry.targetDate):window.aoqatOpenMuslimBagSection?.(entry.section,entry.topicId);wrap.append(b);
    }else{
      wrap.append(text('p','تظهر هنا التذكيرات لمدة 24 ساعة من صدورها.'));
      if(!rows.length)wrap.append(text('p','لا توجد إشعارات حالياً.'));
      for(const item of rows){const b=document.createElement('button');b.type='button';b.className='main-action';b.dataset.reminderId=item.id;b.append(text('strong',item.title),text('small',new Date(item.createdAt).toLocaleString('ar-IQ',{timeZone:'Asia/Baghdad'})));b.onclick=()=>window.aoqatOpenNotification?.(item.id);wrap.append(b);}
    }
    return wrap;
  }
  window.AoqatReminderInbox={add,read,createView};
  const style=document.createElement('style');style.textContent='#reminderInbox{line-height:1.9}#reminderInbox .main-action{width:100%;margin:10px 0;text-align:right}#reminderInbox small{display:block;font-size:12px;margin-top:5px}#reminderInbox p{white-space:pre-line}';document.head.append(style);
  setInterval(()=>{read();window.dispatchEvent(new Event('aoqatInboxChanged'));},60000);
  navigator.serviceWorker?.addEventListener('message',e=>{if(e.data?.type==='AOQAT_OPEN_REMINDER'){if(e.data.entry)add(e.data.entry);window.aoqatOpenNotification?.(e.data.id);}});
})();
;

/* js/friday-reminders.js */
(function(){'use strict';
  
  const C=window.AoqatFridayRemindersCore,KEY='aoqatFridayRemindersV1',SENT='aoqatFridayRemindersSentV1';
  if(!C)return;
  function read(){try{return C.normalize(JSON.parse(localStorage.getItem(KEY)||'{}'));}catch(_){return C.defaults();}}
  // Migrate the previous 08:00 default once; later user choices remain untouched.
  try{
    const marker='aoqatFridayKahfNineMigrationV1';
    if(localStorage.getItem(marker)!=='done'){
      const raw=JSON.parse(localStorage.getItem(KEY)||'{}');
      if(raw&&typeof raw==='object'&&!Array.isArray(raw)&&raw.kahfTime==='08:00'){
        raw.kahfTime='09:00';localStorage.setItem(KEY,JSON.stringify(raw));
      }
      localStorage.setItem(marker,'done');
    }
  }catch(_){}
  let settings=read();
  function row(now){const d=C.dateParts(now);return typeof cachedAnnualPrayer==='function'?cachedAnnualPrayer(d.month,d.day):null;}
  function save(){try{localStorage.setItem(KEY,JSON.stringify(settings));}catch(_){}draw();}
  function currentEvents(now=new Date()){return C.events(now,settings,row(now));}
  function draw(){const host=document.getElementById('fridayReminderHost');if(!host)return;
    const toggle=host.querySelector('#frReminderToggle');toggle.textContent='🔔 تنبيه سنن يوم الجمعة: '+(settings.enabled?'تشغيل':'إيقاف');toggle.setAttribute('aria-pressed',String(settings.enabled));toggle.setAttribute('aria-expanded',String(settings.enabled));host.querySelector('#frReminderSettings').hidden=!settings.enabled;
    for(const kind of ['sunnah','kahf']){const b=host.querySelector('[data-friday-reminder="'+kind+'"]');b.setAttribute('aria-pressed',String(settings[kind]));b.querySelector('span').textContent=settings[kind]?'تشغيل':'إيقاف';}
    host.querySelector('#frSunnahDelay').value=settings.afterMaghrib;host.querySelector('#frKahfTime').value=settings.kahfTime;
    const now=new Date(),events=currentEvents(now),d=C.dateParts(now);
    let note='التنبيهات تعمل دون إنترنت وبالخلفية بعد منح أذونات الإشعارات والمنبّه.';
    if(d.weekday===5&&settings.kahf&&!events.some(x=>x.kind==='kahf'))note+=' اختر وقت الكهف بين الفجر والمغرب؛ يلزم توفر مواقيت اليوم.';
    host.querySelector('#frReminderStatus').textContent=note;
  }
  async function requestPermission(){if(window.AndroidNative?.communityReminderPermissions){window.AndroidNative.communityReminderPermissions();return;}if(typeof Notification==='undefined')return;try{if(Notification.permission==='default')await Notification.requestPermission();}catch(_){}draw();}
  function install(card){if(!card||card.querySelector('#fridayReminderHost'))return;
    const host=document.createElement('section');host.id='fridayReminderHost';host.className='ad-card';
    host.innerHTML='<button type="button" id="frReminderToggle" class="main-action" aria-expanded="true" aria-pressed="true" aria-controls="frReminderSettings">🔔 تنبيه سنن يوم الجمعة</button><div id="frReminderSettings" hidden><h4>تنبيهات الجمعة</h4><button type="button" class="main-action" data-friday-reminder="sunnah" aria-pressed="false">تذكير سنن الجمعة ليلة الجمعة <span></span></button><label>الخميس بعد المغرب (دقيقة)<input id="frSunnahDelay" type="number" min="0" max="120" step="1"></label><button type="button" class="main-action" data-friday-reminder="kahf" aria-pressed="false">تذكير قراءة سورة الكهف <span></span></button><label>وقت الجمعة بتوقيت العراق<input id="frKahfTime" type="time" step="60"></label><p class="ad-note">الساعة 9 صباحاً موعد مقترح للتذكير، وليست ساعة ذات أفضلية شرعية. القراءة متاحة خلال نهار الجمعة.</p><a href="https://binbaz.org.sa/fatwas/11148" target="_blank" rel="noopener noreferrer">مصدر وقت قراءة سورة الكهف</a><p id="frReminderStatus" class="ad-note" role="status"></p><button type="button" id="frReminderPreview" class="main-action">معاينة التذكير</button></div>';
    card.appendChild(host);const toggle=host.querySelector('#frReminderToggle');toggle.onclick=()=>{settings.enabled=!settings.enabled;save();if(settings.enabled)requestPermission();};
    host.querySelectorAll('[data-friday-reminder]').forEach(b=>b.onclick=()=>{const k=b.dataset.fridayReminder;settings[k]=!settings[k];save();if(settings[k])requestPermission();});
    host.querySelector('#frSunnahDelay').onchange=e=>{const n=Number(e.target.value);if(Number.isInteger(n)&&n>=0&&n<=120){settings.afterMaghrib=n;save();}else draw();};
    host.querySelector('#frKahfTime').onchange=e=>{const n=C.clock(e.target.value),r=row(new Date()),f=C.prayerMinutes(r?.fajr,'fajr'),m=C.prayerMinutes(r?.maghrib,'maghrib');if(n===null||(f!==null&&m!==null&&(n<f||n>=m))){e.target.setCustomValidity('اختر وقتاً خلال نهار الجمعة بين الفجر والمغرب.');e.target.reportValidity();e.target.value=settings.kahfTime;return;}e.target.setCustomValidity('');settings.kahfTime=e.target.value;save();};
    host.querySelector('#frReminderPreview').onclick=()=>notify({kind:'preview',title:'معاينة تذكير الجمعة',body:'تذكير بسنن الجمعة وقراءة سورة الكهف، مع المصادر داخل حقيبة المسلم.'});draw();
  }
  function banner(event){document.getElementById('fridayReminderBanner')?.remove();const el=document.createElement('aside');el.id='fridayReminderBanner';el.setAttribute('role','alert');const title=document.createElement('strong'),body=document.createElement('p'),close=document.createElement('button');title.textContent=event.title;body.textContent=event.body;close.type='button';close.textContent='إغلاق';close.onclick=()=>el.remove();el.append(title,body,close);document.body.appendChild(el);}
  async function notify(event){const entry=window.AoqatReminderInbox?.add(event);banner(event);if(typeof Notification==='undefined'||Notification.permission!=='granted')return;
    const options={body:event.body,tag:'aoqat-friday-'+event.kind,icon:'assets/icons/app-icon.svg',data:{kind:'friday-reminder',id:entry?.id,entry,url:location.origin+'/?reminder='+encodeURIComponent(entry?.id||'')}};
    try{const reg=await navigator.serviceWorker?.getRegistration();if(reg)await reg.showNotification(event.title,options);else {const n=new Notification(event.title,options);n.onclick=()=>{window.focus();if(entry)window.aoqatOpenNotification?.(entry.id);n.close();};}}catch(_){} }
  function tick(now=new Date()){if(window.AndroidNative?.configureAdhan)return;let sent;try{sent=JSON.parse(localStorage.getItem(SENT)||'{}');}catch(_){sent={};}if(!sent||typeof sent!=='object'||Array.isArray(sent))sent={};
    for(const event of currentEvents(now)){const age=+now-event.at;if(age<0||age>120000||sent[event.key])continue;sent[event.key]=+now;
      for(const key of Object.keys(sent))if(+now-Number(sent[key])>15*86400000)delete sent[key];
      try{localStorage.setItem(SENT,JSON.stringify(sent));}catch(_){}notify(event);
    }
  }
  function init(){const style=document.createElement('style');style.textContent='#fridayReminderHost{margin-top:16px}body.design-menu-open #webDrawerSub #fridayReminderHost #frReminderToggle{background:#7f9191!important;color:#fff!important}body.design-menu-open #webDrawerSub #fridayReminderHost #frReminderToggle[aria-pressed="true"]{background:#12854c!important}#fridayReminderHost [hidden]{display:none!important}#fridayReminderHost button{width:100%;text-align:right}#fridayReminderHost [data-friday-reminder]{display:flex;justify-content:space-between;gap:8px;color:#fff!important;background:#7f9191!important}#fridayReminderHost [aria-pressed="true"]{background:#12854c!important}#fridayReminderHost label{display:flex;align-items:center;justify-content:space-between;gap:12px;margin:14px 0}#fridayReminderHost input{max-width:130px}#fridayReminderHost a{color:var(--wt-accent,#137985)}#fridayReminderBanner{position:fixed;inset: auto 12px 24px;z-index:2147483000;padding:16px;border:1px solid #ccb15a;border-radius:14px;background:#fffaf0;color:#182c34;box-shadow:0 6px 24px #0004;direction:rtl}#fridayReminderBanner p{line-height:1.8}#fridayReminderBanner button{padding:8px 16px}';document.head.appendChild(style);
    setInterval(()=>tick(),1000);tick();document.addEventListener('visibilitychange',()=>{if(!document.hidden){tick();draw();}});window.addEventListener('storage',e=>{if(e.key===KEY){settings=read();draw();}});
  }
  window.AoqatFridayReminders={tick,currentEvents,read,mount:install};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();

;

/* js/prayer-alarm-core.js */
(function(root){'use strict';
 const ids=['fajr','dhuhr','asr','maghrib','isha','third'];
 const names={fajr:'الفجر',dhuhr:'الظهر',asr:'العصر',maghrib:'المغرب',isha:'العشاء',third:'ثلث الليل الأخير'};
 function item(id,raw={}){const n=(k,d,a,b)=>Math.max(a,Math.min(b,Math.floor(Number(raw[k])||d)));return {enabled:raw.enabled===true,label:String(raw.label||names[id]).slice(0,80),repeat:['daily','once','days'].includes(raw.repeat)?raw.repeat:'daily',days:Array.isArray(raw.days)?[...new Set(raw.days.filter(d=>Number.isInteger(d)&&d>=0&&d<7))]:[0,1,2,3,4,5,6],duration:n('duration',5,1,30),snooze:n('snooze',10,1,30),count:Math.max(0,Math.min(10,Math.floor(Number(raw.count===undefined?3:raw.count))||0)),deleteAfter:raw.deleteAfter===true,tone:raw.tone&&typeof raw.tone==='object'?{kind:['default','soft','custom','system'].includes(raw.tone.kind)?raw.tone.kind:'default',value:String(raw.tone.value||''),name:String(raw.tone.name||'نغمة المنبّه').slice(0,100)}:{kind:'default',value:'',name:'نغمة المنبّه'}};}
 function normalize(raw={}){return {enabled:raw.enabled===true,items:Object.fromEntries(ids.map(id=>[id,item(id,raw.items?.[id])]))};}
 function minutes(v,id){let m=String(v||'').match(/^(\d{1,2}):(\d{2})/);if(!m)return null;let h=+m[1],n=+m[2];if(h>23||n>59)return null;if(['asr','maghrib','isha'].includes(id)&&h<12)h+=12;return h*60+n;}
 function events(rows,now=new Date(),span=8){const out=[];const date=(offset)=>new Date(now.getFullYear(),now.getMonth(),now.getDate()+offset);const row=d=>rows.find(r=>+r.gregorian_month===d.getMonth()+1&&+r.gregorian_day===d.getDate());const at=(d,n)=>new Date(d.getFullYear(),d.getMonth(),d.getDate(),0,n).getTime();
 for(let offset=-1;offset<span;offset++){const d=date(offset),r=row(d);if(!r)continue;for(const id of ids.slice(0,5)){const n=minutes(r[id],id);if(n!==null)out.push({id,at:at(d,n)});}const tomorrow=date(offset+1),next=row(tomorrow),m=minutes(r.maghrib,'maghrib'),f=minutes(next?.fajr,'fajr');if(m!==null&&f!==null){const start=at(d,m),end=at(tomorrow,f);out.push({id:'third',at:Math.round(start+(end-start)*2/3)});}}
 return out.sort((a,b)=>a.at-b.at);}
 function allowed(config,event){const s=config.items[event.id];return config.enabled&&s?.enabled&&(s.repeat!=='days'||s.days.includes(new Date(event.at).getDay()));}
 function next(rows,config,now=new Date()){const out={};for(const e of events(rows,now))if(e.at>now.getTime()&&allowed(config,e)&&!out[e.id])out[e.id]=e;return out;}
 const api={ids,names,item,normalize,events,allowed,next};if(typeof module!=='undefined')module.exports=api;root.AoqatPrayerAlarmCore=api;
})(typeof window==='undefined'?globalThis:window);

;

/* js/prayer-alarm.js */
(function(){'use strict';const C=window.AoqatPrayerAlarmCore,KEY='aoqatPrayerAlarmV1',N=window.AndroidNative, native=!!N?.configurePrayerAlarm;let state;try{state=C.normalize(JSON.parse(native?N.readPrayerAlarmSettings():localStorage.getItem(KEY)||'{}'));}catch(_){state=C.normalize();}
 let box,alarmOpen=false,editing='',active=null,snoozed=null,last=Date.now(),context,osc,gain,pulse,endTimer,previewTimer,toneAudio,customURL,soundGeneration=0;const seen=new Set();const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 function rows(){try{const list=JSON.parse(native?N.readPrayerRows():localStorage.getItem('aoqatAdhanRows')||'[]');return !native&&window.AoqatPrayerTimeChoice?list.map(window.AoqatPrayerTimeChoice.applyRow):list;}catch(_){return [];}}
 function save(){localStorage.setItem(KEY,JSON.stringify(state));if(native)N.configurePrayerAlarm(JSON.stringify(state));}
 const clock=at=>new Date(at).toLocaleTimeString('ar-IQ',{hour:'2-digit',minute:'2-digit'});
 function draw(){if(!box?.isConnected)return;const next=C.next(rows(),{...state,enabled:true,items:Object.fromEntries(C.ids.map(id=>[id,{...state.items[id],enabled:true}]))});box.querySelector('#paContent').innerHTML=`<div class="pa-master-row"><span>تشغيل منبّه الصلاة</span><button type="button" id="paMaster" class="pa-switch ${state.enabled?'pa-on':''}" aria-pressed="${state.enabled}" aria-label="${state.enabled?'إيقاف منبّه الصلاة':'تشغيل منبّه الصلاة'}">${state.enabled?'تشغيل':'إيقاف'}</button></div><fieldset id="paItems" ${state.enabled?'':'disabled'}>${C.ids.map(id=>`<div class="pa-alarm"><button type="button" class="pa-edit" data-pa-edit="${id}"><strong>${esc(state.items[id].label)}</strong><span>${next[id]?clock(next[id].at):'الموعد يحتاج مواقيت قاعدة البيانات'}</span></button><button type="button" class="pa-switch ${state.items[id].enabled?'pa-on':''}" data-pa-toggle="${id}" aria-pressed="${state.items[id].enabled}">${state.items[id].enabled?'تشغيل':'إيقاف'}</button></div>`).join('')}<p class="pa-note">المواعيد من قاعدة البيانات. يُحسب ثلث الليل الأخير من المغرب إلى فجر اليوم التالي.</p><p class="pa-note">${native?esc(N.prayerAlarmReadiness?.()||'الرنين يعمل بالخلفية بعد منح أذونات المنبّه والإشعارات.'):'على الويب: الرنين أثناء فتح الصفحة وبعد تفاعلك معها؛ الرنين بالخلفية وشاشة القفل في تطبيق Android.'}</p></fieldset><div id="paEditor"></div><p id="paStatus" role="status"></p>`;
 box.querySelector('#paMaster').onclick=()=>{unlock();state.enabled=!state.enabled;if(!native&&state.enabled&&'Notification' in window&&Notification.permission==='default')Notification.requestPermission().catch(()=>{});if(!state.enabled){stop();snoozed=null;editing='';}save();draw();};box.querySelectorAll('[data-pa-toggle]').forEach(b=>b.onclick=()=>{unlock();const id=b.dataset.paToggle;state.items[id].enabled=!state.items[id].enabled;if(!state.items[id].enabled&&active?.id===id)stop();if(snoozed?.id===id)snoozed=null;save();draw();});box.querySelectorAll('[data-pa-edit]').forEach(b=>b.onclick=()=>editor(b.dataset.paEdit));if(editing&&state.enabled)editor(editing);}
 function editor(id){if(!state.enabled)return;editing=id;const s=state.items[id],e=box.querySelector('#paEditor');e.innerHTML=`<section class="pa-settings"><h4>تعديل منبّه ${C.names[id]}</h4><p class="pa-note">الوقت يتحدث تلقائيًا حسب مواقيت الصلاة.</p><label>التكرار<select id="paRepeat"><option value="daily">كل يوم</option><option value="once">مرة واحدة فقط</option><option value="days">أيام محددة</option></select></label><div id="paDays">${['الأحد','الاثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت'].map((n,i)=>`<label><input type="checkbox" data-pa-day="${i}" ${s.days.includes(i)?'checked':''}>${n}</label>`).join('')}</div><label>النغمة<select id="paTone"><option value="default">نغمة المنبّه</option><option value="soft">نغمة هادئة</option>${['custom','system'].includes(s.tone.kind)?`<option value="${s.tone.kind}">${esc(s.tone.name)}</option>`:''}</select></label><button type="button" id="paChoose">اختيار نغمة من الهاتف</button>${native?'<button type="button" id="paSystemTone">نغمات الهاتف</button>':''}<input type="file" id="paFile" accept="audio/*" hidden><label>التسمية<input id="paLabel" maxlength="80" value="${esc(s.label)}"></label><label>مدة الرنين (دقيقة)<input id="paDuration" type="number" min="1" max="30" value="${s.duration}"></label><label>مدة الغفوة (دقيقة)<input id="paSnooze" type="number" min="1" max="30" value="${s.snooze}"></label><label>عدد الغفوات<input id="paCount" type="number" min="0" max="10" value="${s.count}"></label><label id="paDeleteRow">حذف إعداد المنبّه بعد رنين المرة الواحدة<input id="paDelete" type="checkbox" ${s.deleteAfter?'checked':''}></label><div class="pa-actions"><button type="button" id="paSave">✓ حفظ</button><button type="button" id="paCancel">إلغاء</button><button type="button" id="paPreview">تجربة النغمة</button><button type="button" id="paStopPreview">إيقاف التجربة</button></div></section>`;
 const $=id=>e.querySelector('#'+id);$('paRepeat').value=s.repeat;$('paTone').value=s.tone.kind;const sync=()=>{$('paDays').hidden=$('paRepeat').value!=='days';$('paDeleteRow').hidden=$('paRepeat').value!=='once';};$('paRepeat').onchange=sync;sync();
 $('paSave').onclick=()=>{const days=[...e.querySelectorAll('[data-pa-day]:checked')].map(b=>Number(b.dataset.paDay));if($('paRepeat').value==='days'&&!days.length){box.querySelector('#paStatus').textContent='اختر يومًا واحدًا على الأقل';return;}state.items[id]=C.item(id,{...s,label:$('paLabel').value,repeat:$('paRepeat').value,days,duration:$('paDuration').value,snooze:$('paSnooze').value,count:$('paCount').value,deleteAfter:$('paDelete').checked,tone:$('paTone').value===s.tone.kind?s.tone:{kind:$('paTone').value}});save();editing='';draw();box.querySelector('#paStatus').textContent='تم حفظ المنبّه';};$('paCancel').onclick=()=>{editing='';e.innerHTML='';};$('paPreview').onclick=()=>{unlock();if(native)N.previewPrayerAlarm(id);else{sound({...s,tone:$('paTone').value===s.tone.kind?s.tone:{kind:$('paTone').value}},id);clearTimeout(previewTimer);previewTimer=setTimeout(silence,5000);}};$('paStopPreview').onclick=()=>{if(native)N.stopPrayerAlarm();else silence();};$('paChoose').onclick=()=>native?N.choosePrayerAlarmTone(id,false):$('paFile').click();if(native)$('paSystemTone').onclick=()=>N.choosePrayerAlarmTone(id,true);
 $('paFile').onchange=async event=>{const f=event.target.files[0];if(!f)return;if(!f.type.startsWith('audio/')||f.size>25*1024*1024){box.querySelector('#paStatus').textContent='اختر صوتًا أقل من 25 ميغابايت';return;}try{const db=await audioDB();await new Promise((resolve,reject)=>{const tx=db.transaction('tones','readwrite');tx.objectStore('tones').put(f,id);tx.oncomplete=resolve;tx.onerror=reject;});db.close();s.tone={kind:'custom',value:'',name:f.name};save();editor(id);}catch(_){box.querySelector('#paStatus').textContent='تعذر حفظ النغمة';}};
 }
 function audioDB(){return new Promise((resolve,reject)=>{const r=indexedDB.open('aoqat-prayer-alarm-audio',1);r.onupgradeneeded=()=>r.result.createObjectStore('tones');r.onsuccess=()=>resolve(r.result);r.onerror=reject;});}
 function unlock(){if(native)return;try{context||=new (window.AudioContext||window.webkitAudioContext)();context.resume();}catch(_){} }
 async function sound(s,id){silence();const generation=soundGeneration;if(s.tone.kind==='custom'){try{const db=await audioDB();const file=await new Promise((resolve,reject)=>{const tx=db.transaction('tones');const r=tx.objectStore('tones').get(id);r.onsuccess=()=>resolve(r.result);r.onerror=reject;});db.close();if(generation!==soundGeneration)return;if(file){customURL=URL.createObjectURL(file);toneAudio=new Audio(customURL);toneAudio.loop=true;await toneAudio.play();return;}}catch(_){}}
 if(generation!==soundGeneration)return;unlock();if(!context)return;osc=context.createOscillator();gain=context.createGain();osc.frequency.value=s.tone.kind==='soft'?660:880;gain.gain.value=.12;osc.connect(gain);gain.connect(context.destination);osc.start();let on=true;pulse=setInterval(()=>{on=!on;if(gain)gain.gain.setValueAtTime(on?.12:0,context.currentTime);},450);}
 function silence(){soundGeneration++;clearInterval(pulse);clearTimeout(previewTimer);try{osc?.stop();}catch(_){}osc=null;gain=null;toneAudio?.pause();toneAudio=null;if(customURL)URL.revokeObjectURL(customURL);customURL=null;}
 function stop(){silence();clearTimeout(endTimer);active=null;document.getElementById('paRinging')?.remove();}
 function finish(id){const s=state.items[id];if(s.repeat==='once'){state.items[id]=s.deleteAfter?C.item(id):{...s,enabled:false};save();draw();}}
 function ring(e,count=0){if(!C.allowed(state,e)||fridaySuppressed(e))return;stop();active={...e,count};if(!native&&count===0)window.aoqatPrayerDueNotification?.(e.id==='dhuhr'&&new Date(e.at).getDay()===5?'friday':e.id,e.at);sound(state.items[e.id],e.id);const dialog=document.createElement('section');dialog.id='paRinging';dialog.dir='rtl';dialog.setAttribute('role','dialog');dialog.setAttribute('aria-modal','true');dialog.innerHTML=`<h2>⏰ ${esc(state.items[e.id].label)}</h2><p>${clock(e.at)}</p><button type="button" id="paDismiss">إيقاف</button><button type="button" id="paSnoozeNow" ${count>=state.items[e.id].count?'disabled':''}>غفوة</button>`;document.body.append(dialog);dialog.querySelector('#paDismiss').onclick=()=>{stop();finish(e.id);};dialog.querySelector('#paSnoozeNow').onclick=()=>{snoozed={id:e.id,at:Date.now()+state.items[e.id].snooze*60000,count:count+1};stop();};endTimer=setTimeout(()=>{stop();finish(e.id);},state.items[e.id].duration*60000);}
 function fridaySuppressed(e){try{return e.id==='dhuhr'&&new Date(e.at).getDay()===5&&JSON.parse(localStorage.getItem('aoqatAdhanV1')||'{}').friday?.enabled===true;}catch(_){return false;}}
 function tick(){const now=Date.now();if(!native&&state.enabled){if(snoozed&&now>=snoozed.at){const e=snoozed;snoozed=null;ring(e,e.count);}for(const e of C.events(rows(),new Date(now),2))if(e.at>last&&e.at<=now&&now-e.at<120000&&C.allowed(state,e)&&!seen.has(e.id+e.at)){seen.add(e.id+e.at);ring(e);}}last=now;}
 function mount(){const panel=document.getElementById('adhanPanel');if(!panel||panel.querySelector('#prayerAlarmPanel'))return;const toggle=document.createElement('button');toggle.type='button';toggle.id='paOpen';toggle.className='ad-section-toggle';toggle.setAttribute('aria-controls','prayerAlarmPanel');toggle.innerHTML='<span class="ad-section-icon" aria-hidden="true">⏰</span><span>منبّه الصلاة</span><span class="ad-section-chevron" aria-hidden="true">‹</span>';box=document.createElement('section');box.id='prayerAlarmPanel';box.className='ad-card';box.innerHTML='<div id="paContent"></div>';const sync=()=>{box.hidden=!alarmOpen;toggle.setAttribute('aria-expanded',String(alarmOpen));toggle.classList.toggle('ad-section-active',alarmOpen);};toggle.onclick=()=>{alarmOpen=!alarmOpen;if(!alarmOpen){editing='';box.querySelector('#paEditor').innerHTML='';}sync();if(alarmOpen)box.querySelector('[data-subwindow-back]')?.focus({preventScroll:true});else toggle.focus({preventScroll:true});};panel.append(toggle,box);sync();draw();}
 window.aoqatPrayerAlarmToneChosen=(id,tone)=>{if(!C.ids.includes(id))return;state.items[id].tone=tone;save();draw();};window.aoqatPrayerAlarmNativeSettings=s=>{state=C.normalize(s);localStorage.setItem(KEY,JSON.stringify(state));draw();};
 const css=document.createElement('link');css.rel='stylesheet';css.href='css/prayer-alarm.css';document.head.append(css);new MutationObserver(mount).observe(document.body,{childList:true,subtree:true});mount();setInterval(tick,1000);document.addEventListener('visibilitychange',()=>{if(!document.hidden){tick();draw();}});
})();



;

/* js/settings-subwindows.js */
(function(){'use strict';
 const titles={friday:'تخصيص صلاة الجمعة',sound:'صوت الأذان',notifications:'التنبيهات',modes:'وضع الأذان لكل صلاة',services:'الخدمات'};
 function decorate(el,title,back,level){
  if(el.dataset.subwindow)return;el.dataset.subwindow='true';el.classList.add('ad-leaf-window');el.style.setProperty('--leaf-level',level);
  const head=document.createElement('header');head.className='ad-leaf-head';
  const b=document.createElement('button');b.type='button';b.className='ad-leaf-back';b.dataset.subwindowBack='true';b.textContent='‹ رجوع';b.setAttribute('aria-label','رجوع');b.onclick=back;
  const h=document.createElement('h3');h.textContent=title;head.append(b,h);
  const body=document.createElement('div');body.className='ad-leaf-body';while(el.firstChild)body.appendChild(el.firstChild);
  body.querySelector('h3,h4')?.remove();body.querySelector('#adFridayBack')?.remove();el.append(head,body);
  el.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();back();}});
 }
 function mount(){
  const panel=document.getElementById('adhanPanel');if(!panel)return;
  panel.querySelectorAll('.ad-section').forEach(el=>{const id=el.id.replace('adSection-','');decorate(el,titles[id]||'الإعدادات',()=>panel.querySelector('[data-ad-section="'+id+'"]')?.click(),1);});
  const alarm=panel.querySelector('#prayerAlarmPanel');if(alarm)decorate(alarm,'منبّه الصلاة',()=>panel.querySelector('#paOpen')?.click(),1);
  const quiet=panel.querySelector('#adSilentSettings');if(quiet)decorate(quiet,'الصامت بعد الإقامة',()=>panel.querySelector('#adSilentSettingsToggle')?.click(),2);
  const editor=panel.querySelector('#paEditor .pa-settings');if(editor)decorate(editor,editor.querySelector('h4')?.textContent||'تعديل المنبّه',()=>panel.querySelector('#paCancel')?.click(),3);
 }
 window.aoqatCloseSettingsLeaves=()=>{
  const p=document.getElementById('adhanPanel');if(!p)return;
  for(const selector of ['#paEditor .pa-settings','#adSilentSettings','#prayerAlarmPanel','.ad-section:not([hidden])']){
   const el=p.querySelector(selector);if(el&&!el.hidden)el.querySelector('[data-subwindow-back]')?.click();
  }
 };
 new MutationObserver(mount).observe(document.body,{childList:true,subtree:true});mount();
})();

;

/* js/prayer-alert-methods.js */
(function(){'use strict';
  const N=window.AndroidNative,native=!!N?.configurePrayerNotifications;
  const KEY='aoqatPrayerNotificationsV1',ids=['fajr','dhuhr','asr','maghrib','isha'],names={fajr:'الفجر',dhuhr:'الظهر',asr:'العصر',maghrib:'المغرب',isha:'العشاء'};
  let settings={enabled:false,volume:65,prayers:Object.fromEntries(ids.map(id=>[id,true]))},opened=false,noticeOpen=false,last=Date.now(),audio;
  try{const raw=JSON.parse(native?N.readPrayerNotificationSettings():localStorage.getItem(KEY)||'{}');settings.enabled=raw.enabled===true;if(Number.isFinite(Number(raw.volume)))settings.volume=Math.max(0,Math.min(100,Number(raw.volume)));for(const id of ids)settings.prayers[id]=raw.prayers?.[id]!==false;}catch(_){}
  const $=id=>document.getElementById(id),seen=new Set();
  const selected=id=>settings.enabled&&settings.prayers[id]===true;
  window.aoqatPrayerNotificationSelected=selected;
  // A selected notification replaces the ordinary alarm for that prayer, retaining its preferences.
  const alarm=window.AoqatPrayerAlarmCore,allowed=alarm?.allowed;
  if(allowed)alarm.allowed=(config,event)=>!selected(event.id)&&allowed(config,event);
  function save(){localStorage.setItem(KEY,JSON.stringify(settings));if(native)N.configurePrayerNotifications(JSON.stringify(settings));}
  function unlock(){if(native)return;try{audio||=new (window.AudioContext||window.webkitAudioContext)();audio.resume().catch(()=>{});}catch(_){} }
  function chime(){if(native){N.previewPrayerNotification();return;}if(!audio||audio.state!=='running')return;const at=audio.currentTime;for(const [offset,freq] of [[0,880],[.18,1174]]){const oscillator=audio.createOscillator(),gain=audio.createGain();oscillator.frequency.value=freq;gain.gain.setValueAtTime(0,at+offset);gain.gain.linearRampToValueAtTime(settings.volume/100*.2,at+offset+.015);gain.gain.exponentialRampToValueAtTime(.001,at+offset+.16);oscillator.connect(gain);gain.connect(audio.destination);oscillator.start(at+offset);oscillator.stop(at+offset+.18);}}
  function close(){if(!$('paMethodPanel'))return;if(!$('adSilentSettings')?.hidden)$('adSilentSettingsToggle')?.click();if(!$('prayerAlarmPanel')?.hidden)$('paOpen')?.click();if(!$('adSection-sound')?.hidden)document.querySelector('[data-ad-section="sound"]')?.click();if(!$('adSection-modes')?.hidden)document.querySelector('[data-ad-section="modes"]')?.click();if(!$('adSection-notifications')?.hidden)document.querySelector('[data-ad-section="notifications"]')?.click();noticeOpen=false;if($('pnPanel'))$('pnPanel').hidden=true;opened=false;$('paMethodPanel').hidden=true;$('paMethodOpen').setAttribute('aria-expanded','false');$('paMethodOpen').focus({preventScroll:true});}
  function leaf(id,title,level,back){const section=document.createElement('section');section.id=id;section.className='ad-leaf-window';section.hidden=true;section.style.setProperty('--leaf-level',level);section.innerHTML='<header class="ad-leaf-head"><button type="button" class="ad-leaf-back" data-subwindow-back>‹ رجوع</button><h3>'+title+'</h3></header><div class="ad-leaf-body"></div>';section.querySelector('button').onclick=back;section.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();back();}});return section;}
  function drawNotice(){const body=$('pnPanel')?.querySelector('.ad-leaf-body');if(!body)return;body.innerHTML=`<div class="ad-card"><div class="pa-master-row"><span>إشعار أوقات الصلاة</span><button type="button" id="pnEnable" class="pa-switch ${settings.enabled?'pa-on':''}" aria-pressed="${settings.enabled}">${settings.enabled?'تشغيل':'إيقاف'}</button></div><fieldset ${settings.enabled?'':'disabled'}>${ids.map(id=>`<label>${names[id]}<input type="checkbox" data-pn-prayer="${id}" ${settings.prayers[id]?'checked':''}></label>`).join('')}<label>مستوى صوت الإشعار<input id="pnVolume" type="range" min="0" max="100" value="${settings.volume}"></label><button type="button" id="pnPreview">تجربة صوت الإشعار</button></fieldset><p class="ad-note">للصلوات المختارة يصدر إشعار قصير بدل الأذان ومنبه أوقات الصلاة، وتبقى إعداداتهما محفوظة. الإشعارات تعمل من المواقيت المحفوظة، دون إنترنت وبالخلفية بعد منح الأذونات.</p>${native?'<button type="button" id="pnPermissions">أذونات الإشعارات والعمل بالخلفية</button><p class="ad-note">'+N.prayerNotificationReadiness()+'</p>':''}<p id="pnStatus" role="status"></p></div>`;
    $('pnEnable').onclick=async()=>{unlock();settings.enabled=!settings.enabled;save();drawNotice();if(!native&&settings.enabled&&'Notification' in window&&Notification.permission==='default'){await Notification.requestPermission();}if(!native&&settings.enabled&&(!('Notification' in window)||Notification.permission!=='granted'))$('pnStatus').textContent='الإشعارات غير مسموحة؛ سيظهر التنبيه داخل الصفحة مع الصوت.';};
    body.querySelectorAll('[data-pn-prayer]').forEach(input=>input.onchange=()=>{settings.prayers[input.dataset.pnPrayer]=input.checked;save();});$('pnVolume').oninput=e=>{settings.volume=Number(e.target.value);save();};$('pnPreview').onclick=()=>{unlock();chime();};if(native)$('pnPermissions').onclick=()=>N.prayerNotificationPermissions();
  }
  function mount(){const panel=$('adhanPanel'),mode=panel?.querySelector('[data-ad-section="modes"]'),phone=$('paOpen');if(!panel||!mode||!phone)return;
    let root=$('paMethodPanel');if(!root){const button=document.createElement('button');button.id='paMethodOpen';button.type='button';button.className='ad-section-toggle';button.setAttribute('aria-controls','paMethodPanel');button.innerHTML='<span aria-hidden="true">🔔</span><span>اختيار طريقة تنبيه الصلاة</span><span aria-hidden="true">‹</span>';root=leaf('paMethodPanel','اختيار طريقة تنبيه الصلاة',1,close);panel.insertBefore(button,phone);panel.append(root);button.onclick=()=>{opened=!opened;root.hidden=!opened;button.setAttribute('aria-expanded',String(opened));if(opened)root.querySelector('button').focus({preventScroll:true});};
      const body=root.querySelector('.ad-leaf-body');body.classList.add('pa-method-choices');const noticeButton=document.createElement('button');noticeButton.id='pnOpen';noticeButton.type='button';noticeButton.className='ad-section-toggle';noticeButton.textContent='🔔 إشعار أوقات الصلاة ‹';noticeButton.onclick=()=>{noticeOpen=true;$('pnPanel').hidden=false;$('pnPanel').querySelector('button').focus({preventScroll:true});};body.append(phone,mode,noticeButton);
      const notices=leaf('pnPanel','إشعار أوقات الصلاة',2,()=>{noticeOpen=false;$('pnPanel').hidden=true;$('pnOpen').focus({preventScroll:true});});panel.append(notices);drawNotice();
    }
    root.hidden=!opened;$('paMethodOpen').setAttribute('aria-expanded',String(opened));$('pnPanel').hidden=!noticeOpen;
    // Keep the existing controls and their handlers in one ordered web-only list.
    panel.classList.add('pa-ordered-layout');
    let menu=$('paAlertMenu');
    if(!menu){menu=document.createElement('div');menu.id='paAlertMenu';menu.setAttribute('aria-label','إعدادات الأذان والتنبيه');panel.insertBefore(menu,$('adEnable').nextSibling);}
    const enabled=$('adEnable')?.getAttribute('aria-pressed')==='true';
    const sound=panel.querySelector('[data-ad-section="sound"]'),notifications=panel.querySelector('[data-ad-section="notifications"]'),friday=panel.querySelector('[data-ad-section="friday"]');
    const choices=root.querySelector('.ad-leaf-body');if(notifications&&notifications.parentElement!==choices)choices.appendChild(notifications);
    const quietButton=$('adSilentSettingsToggle'),quietPanel=$('adSilentSettings'),webQuiet=!window.AndroidNative?.configureAdhan;const quietHome=webQuiet?menu:choices;
    if(quietButton&&quietButton.parentElement!==quietHome)quietHome.appendChild(quietButton);
    if(quietPanel&&quietPanel.parentElement!==panel)panel.appendChild(quietPanel);
    if(quietButton)quietButton.disabled=webQuiet?false:!enabled;
    [phone,mode,$('pnOpen'),notifications,...(webQuiet?[]:[quietButton])].filter(Boolean).forEach((button,index)=>{if(choices.children[index]!==button)choices.insertBefore(button,choices.children[index]||null);});
    for(const [button,icon,title] of [[$('pnOpen'),'🔔','إشعار أوقات الصلاة'],[quietButton,'🤫','تفعيل وضع صامت بعد الإقامة']])if(button){
      if(!button.querySelector('span'))button.innerHTML='<span aria-hidden="true">'+icon+'</span><span>'+title+'</span><span aria-hidden="true">‹</span>';
      button.style.display='flex';button.style.alignItems='center';button.style.gap='8px';button.style.textAlign='right';
      const label=button.children[1];label.style.flex='1';label.style.textAlign='right';
    }
    const modeBody=$('adSection-modes')?.querySelector(':scope > .ad-leaf-body'),soundPanel=$('adSection-sound');
    if(sound&&modeBody&&sound.parentElement!==modeBody)modeBody.prepend(sound);
    if(soundPanel){
      const back=()=>{if(!soundPanel.hidden)sound.click();if($('adSection-modes')?.hidden)mode.click();sound.focus({preventScroll:true});};
      const backButton=soundPanel.querySelector(':scope > header button');if(backButton)backButton.onclick=back;
      if(!soundPanel.dataset.methodSoundBack){soundPanel.dataset.methodSoundBack='true';soundPanel.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();e.stopImmediatePropagation();back();}},true);}
    }
    [$('paMethodOpen'),...(webQuiet?[quietButton]:[]),friday].forEach((button,index)=>{if(button&&menu.children[index]!==button)menu.insertBefore(button,menu.children[index]||null);});
    for(const button of [sound,notifications])if(button)button.disabled=!enabled;
    mode.disabled=$('adEnable')?.getAttribute('aria-pressed')!=='true';
    for(const id of ['prayerAlarmPanel','adSection-modes','adSection-sound','adSection-notifications'])$(id)?.style.setProperty('--leaf-level',2);
    $('adSection-sound')?.style.setProperty('--leaf-level',3);
    $('adSilentSettings')?.style.setProperty('--leaf-level',webQuiet?1:2);
    const phoneLabel=phone.querySelector('span:nth-child(2)'),modeLabel=mode.querySelector('span:nth-child(2)');if(phoneLabel.textContent!=='منبه أوقات الصلاة')phoneLabel.textContent='منبه أوقات الصلاة';if(modeLabel.textContent!=='أذان أوقات الصلاة')modeLabel.textContent='أذان أوقات الصلاة';for(const [id,title] of [['prayerAlarmPanel','منبه أوقات الصلاة'],['adSection-modes','أذان أوقات الصلاة']]){const h=$(id)?.querySelector(':scope > header h3');if(h&&h.textContent!==title)h.textContent=title;}
  }
  const oldClose=window.aoqatCloseSettingsLeaves;window.aoqatCloseSettingsLeaves=()=>{oldClose?.();close();};
  new MutationObserver(mount).observe(document.body,{childList:true,subtree:true});mount();
  async function notify(title,tag){const options={body:'أوقات الصلاة في الحويجة',tag,silent:true};try{const registration=await navigator.serviceWorker?.getRegistration();if(registration)await registration.showNotification(title,options);else new Notification(title,options);}catch(_){} }
  const dueSeen=new Set();
  let dueTimer;
  window.aoqatPrayerDueNotification=(id,at)=>{
    const prayer=id==='friday'?'الجمعة':names[id];if(!prayer)return;
    const key=id+':'+at;if(dueSeen.has(key))return;dueSeen.add(key);
    const title='حان موعد صلاة '+prayer;
    let toast=$('prayerDueNotice');
    if(!toast){
      toast=document.createElement('aside');toast.id='prayerDueNotice';toast.dir='rtl';toast.setAttribute('role','status');toast.setAttribute('aria-live','polite');
      toast.style.cssText='position:fixed;bottom:calc(16px + env(safe-area-inset-bottom,0px));left:12px;right:12px;max-width:420px;margin:auto;z-index:2147483000;display:flex;align-items:center;gap:12px;padding:12px 16px;border-radius:14px;background:#176b4d;color:#fff;box-shadow:0 3px 15px #0004;font:600 16px Tahoma,Arial,sans-serif';
      const text=document.createElement('span');text.style.flex='1';toast.append(text);
      const dismiss=document.createElement('button');dismiss.type='button';dismiss.textContent='×';dismiss.setAttribute('aria-label','إغلاق إشعار موعد الصلاة');dismiss.style.cssText='background:transparent;color:inherit;border:0;font-size:24px;padding:2px 8px';dismiss.onclick=()=>{toast.hidden=true;toast.style.display='none';};toast.append(dismiss);document.body.append(toast);
    }
    toast.firstElementChild.textContent=title;toast.hidden=false;toast.style.display='flex';clearTimeout(dueTimer);dueTimer=setTimeout(()=>{toast.hidden=true;toast.style.display='none';},15000);
    if($('adStatus'))$('adStatus').textContent=title;
    if('Notification' in window&&Notification.permission==='granted')notify(title,'aoqat-prayer-due-'+key);
  };
  function tick(){if(native)return;const now=Date.now();try{const rows=typeof availablePrayerRows==='function'?availablePrayerRows():JSON.parse(localStorage.getItem('aoqatAdhanRows')||'[]'),ad=JSON.parse(localStorage.getItem('aoqatAdhanV1')||'{}');for(const event of window.AoqatAdhanCore.events(rows,new Date(now),ad)){if(event.customFriday||!selected(event.id)||event.at<=last||event.at>now||now-event.at>=120000)continue;const key=event.id+':'+event.at;if(seen.has(key))continue;seen.add(key);const title='حان موعد صلاة '+names[event.id];const quiet=window.AoqatAdhanCore.fridayQuietWindow(rows,new Date(now),ad)||window.AoqatAdhanCore.afterIqamaSilentWindow(rows,new Date(now),ad,JSON.parse(localStorage.getItem('aoqatIqamaMinutesV1')||'{}'));if(!quiet)chime();if($('adStatus'))$('adStatus').textContent=title;window.aoqatPrayerDueNotification(event.friday?'friday':event.id,event.at);if($('pnStatus'))$('pnStatus').textContent=title;}}catch(_){}last=now;}
  window.aoqatPrayerNotificationNativeSettings=value=>{if(!native)return;settings={...settings,...value};drawNotice();};
  document.addEventListener('pointerdown',()=>{if(settings.enabled)unlock();});
  setInterval(tick,1000);document.addEventListener('visibilitychange',()=>{if(!document.hidden)tick();});
})();


;

/* js/iqama-timing.js */
"use strict";
(function () {
  const OPTIONS = [5, 10, 15, 20, 25, 30];

  function normalize(saved, defaults) {
    const values = {};
    for (const [id, fallback] of Object.entries(defaults)) {
      const value = Number(saved?.[id]);
      values[id] = OPTIONS.includes(value) ? value : fallback;
    }
    return values;
  }

  // Both phases derive from one iqama time, never from the previous tick.
  // Reading the state after sleep or changing a setting recomputes it immediately.
  function state(nowSeconds, prayers, beforeMinutes, afterMinutes) {
    for (const prayer of prayers) {
      const iqamaAt = prayer.startSeconds + beforeMinutes[prayer.id] * 60;
      const finishAt = iqamaAt + afterMinutes[prayer.id] * 60;
      if (nowSeconds >= prayer.startSeconds && nowSeconds < iqamaAt) {
        return { phase: "remaining", prayerId: prayer.id, seconds: Math.ceil(iqamaAt - nowSeconds), iqamaAt, finishAt };
      }
      if (nowSeconds >= iqamaAt && nowSeconds < finishAt) {
        return { phase: "elapsed", prayerId: prayer.id, seconds: Math.floor(nowSeconds - iqamaAt), iqamaAt, finishAt };
      }
    }
    return null;
  }

  window.AoqatIqamaTiming = Object.freeze({ OPTIONS, normalize, state });
})();

;

/* js/prayer-countdown.js */
"use strict";
(function(){
  const KEY="aoqatIqamaMinutesV1";
  const AFTER_KEY="aoqatAfterIqamaMinutesV1";
  const TIMING=window.AoqatIqamaTiming;
  const AFTER_DEFAULTS={fajr:10,dhuhr:10,asr:10,maghrib:10,isha:10};
  const IQAMA_NOTIFY_KEY="aoqatIqamaNotificationEnabledV1"; let lastIqamaNotifyText=""; let iqamaNotificationActive=false;
  const DEFAULTS={fajr:20,dhuhr:10,asr:10,maghrib:10,isha:10,friday:15};
  const NAMES={fajr:"الفجر",dhuhr:"الظهر",asr:"العصر",maghrib:"المغرب",isha:"العشاء"};
  const IDS=["fajr","dhuhr","asr","maghrib","isha"];
  let todayRow=null,todayKey="",busy=false,tomorrowFajr=null,tomorrowKey="";
  function readMinutes(key,defaults){
    let saved={};try{saved=JSON.parse(localStorage.getItem(key)||"{}");}catch(_){}
    return TIMING.normalize(saved,defaults);
  }
  function settings(){return readMinutes(KEY,DEFAULTS);}
  function afterSettings(){return readMinutes(AFTER_KEY,AFTER_DEFAULTS);}
  const nativeIqama=!!window.AndroidNative?.configureIqamaTiming;
  let lastNativeSettings="";
  function syncNativeIqama(){
    if(!nativeIqama)return;
    const payload=JSON.stringify([iqamaNotifyEnabled(),settings(),afterSettings()]);
    if(payload===lastNativeSettings)return;
    lastNativeSettings=payload;
    AndroidNative.configureIqamaTiming(iqamaNotifyEnabled(),JSON.stringify(settings()),JSON.stringify(afterSettings()));
  }
  function hydrateNativeIqama(){
    if(!nativeIqama||!AndroidNative.readIqamaTiming)return;
    try{const saved=JSON.parse(AndroidNative.readIqamaTiming());
      if(localStorage.getItem(IQAMA_NOTIFY_KEY)===null)localStorage.setItem(IQAMA_NOTIFY_KEY,saved.enabled?"1":"0");
      if(localStorage.getItem(KEY)===null)localStorage.setItem(KEY,JSON.stringify(saved.minutes||{}));
      if(localStorage.getItem(AFTER_KEY)===null)localStorage.setItem(AFTER_KEY,JSON.stringify(saved.afterMinutes||{}));
    }catch(e){console.error("iqama settings",e);}
  }
  function save(s){localStorage.setItem(KEY,JSON.stringify(s));syncNativeIqama();}
  function iqamaNotifyEnabled(){return localStorage.getItem(IQAMA_NOTIFY_KEY)==="1";}
  async function setIqamaNotify(on){
    localStorage.setItem(IQAMA_NOTIFY_KEY,on?"1":"0");
    if(nativeIqama){syncNativeIqama();refreshIqamaNotifyButton();return;}
    if(on&&typeof Notification!=="undefined"&&Notification.permission!=="granted"){
      const permission=await Notification.requestPermission();if(permission!=="granted")localStorage.setItem(IQAMA_NOTIFY_KEY,"0");
    }
    refreshIqamaNotifyButton();if(!iqamaNotifyEnabled())clearIqamaNotification();
  }
  function refreshIqamaNotifyButton(){
    const b=document.getElementById("iqamaNotificationToggle");if(!b)return;
    const on=iqamaNotifyEnabled()&&(nativeIqama||(typeof Notification!=="undefined"&&Notification.permission==="granted"));
    const needsPermission=on&&nativeIqama&&AndroidNative.iqamaNotificationPermission&&!AndroidNative.iqamaNotificationPermission();
    const needsBackground=on&&nativeIqama&&AndroidNative.iqamaBackgroundPermission&&!AndroidNative.iqamaBackgroundPermission();
    b.classList.toggle("enabled",on);b.setAttribute("aria-pressed",String(on));
    let repair=document.getElementById('iqamaBackgroundAccess');
    if(needsBackground&&!repair){repair=document.createElement('button');repair.id='iqamaBackgroundAccess';repair.type='button';repair.className='switch-control-btn';repair.textContent='السماح بإشعار الإقامة في الخلفية';repair.onclick=()=>AndroidNative.requestIqamaBackgroundPermission?.();b.insertAdjacentElement('afterend',repair);}
    if(repair)repair.hidden=!needsBackground;
    b.innerHTML=`<span>🔔 ظهور إشعار الإقامة</span><span style="padding:2px 7px;border-radius:999px;background:rgba(255,255,255,.14);font-size:11px">${needsPermission?"يحتاج إذن Android":needsBackground?"يحتاج إذن الخلفية":on?"تشغيل":"إيقاف"}</span>`;
  }
  async function showIqamaNotification(text,friday=false){if(nativeIqama)return;if((!friday&&!iqamaNotifyEnabled())||typeof Notification==="undefined"||Notification.permission!=="granted")return;if(text===lastIqamaNotifyText&&iqamaNotificationActive)return;lastIqamaNotifyText=text;iqamaNotificationActive=true;try{if(window.AndroidNative?.showIqamaNotification){AndroidNative.showIqamaNotification(text);return;}const reg=await navigator.serviceWorker?.ready;if(reg)await reg.showNotification(friday?"🕌 صلاة الجمعة":"⏳ الإقامة",{body:text,tag:"iqama-countdown-live",renotify:false,requireInteraction:true,silent:true});}catch(_){}}
  async function clearIqamaNotification(){if(nativeIqama)return;lastIqamaNotifyText="";iqamaNotificationActive=false;try{if(window.AndroidNative?.hideIqamaNotification){AndroidNative.hideIqamaNotification();return;}const reg=await navigator.serviceWorker?.ready;if(reg){const ns=await reg.getNotifications({tag:"iqama-countdown-live"});ns.forEach(n=>n.close());}}catch(_){}}
  function addIqamaNotifyButton(){const panel=document.getElementById("switchPanel");if(!panel||document.getElementById("iqamaNotificationToggle"))return false;const b=document.createElement("button");b.id="iqamaNotificationToggle";b.type="button";b.className="switch-control-btn";b.addEventListener("click",()=>setIqamaNotify(!iqamaNotifyEnabled()));const status=document.getElementById("tomorrowSwitchStatus");panel.insertBefore(b,status?.parentElement===panel?status:null);refreshIqamaNotifyButton();return true;}
  function parse(v,id){return window.AoqatAdhanCore.minutes(v,id);}
  function fmt(sec){sec=Math.max(0,Math.floor(sec));const h=Math.floor(sec/3600),m=Math.floor((sec%3600)/60),s=sec%60;return [h,m,s].map(x=>String(x).padStart(2,"0")).join(":");}
  function fmtIqama(sec){sec=Math.max(0,Math.floor(sec));const m=Math.floor(sec/60),s=sec%60;return `${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`;}
  async function fetchRow(month,day){const row=await readAnnualPrayer(month,day);return window.AoqatPrayerTimeChoice?.applyRow(row)||row;}
  async function loadToday(){if(busy||typeof SUPABASE_URL==="undefined"||typeof dbHeaders!=="function")return;busy=true;try{const n=new Date(),key=`${n.getFullYear()}-${n.getMonth()+1}-${n.getDate()}`;if(key!==todayKey||!todayRow){todayRow=await fetchRow(n.getMonth()+1,n.getDate());todayKey=key;}const t=new Date(n.getFullYear(),n.getMonth(),n.getDate()+1,12);const tk=`${t.getFullYear()}-${t.getMonth()+1}-${t.getDate()}`;if(tk!==tomorrowKey){const row=await fetchRow(t.getMonth()+1,t.getDate());tomorrowFajr=row?parse(row.fajr,"fajr"):null;tomorrowKey=tk;}}catch(e){console.error("prayer countdown",e)}finally{busy=false;}}
  function createDisplay(){let host=document.querySelector(".workspace")||document.querySelector(".main-content")||document.body;let old=document.getElementById("mainPrayerCountdownHost");if(!old){old=document.createElement("div");old.id="mainPrayerCountdownHost";old.className="preview-header prayer-countdown-host";const preview=host.querySelector(".previewBox")||host.firstElementChild;if(preview)host.insertBefore(old,preview);else host.prepend(old);}old.innerHTML=`<div class="live-prayer-status"><div class="next-prayer"><span id="nextPrayerLabel">الأذان القادم بعد</span><b id="nextPrayerCountdown">--:--:--</b></div><div class="countdown-separator" id="countdownSeparator" aria-hidden="true"></div><div class="iqama-status" id="iqamaStatus"><span id="iqamaLabel">باقي على الإقامة</span><b id="iqamaCountdown">00:00</b></div></div>`;}
  function createPanel(){const main=document.querySelector(".sidebar .main-panel");if(!main||document.getElementById("iqamaPanel"))return;const prayerBtn=main.querySelector('[data-open-panel="prayerPanel"]');const btn=document.createElement("button");btn.type="button";btn.className="main-action iqama-action";btn.dataset.openPanel="iqamaPanel";btn.innerHTML="⏳ <span>أوقات الإقامة</span>";prayerBtn?.insertAdjacentElement("afterend",btn);const p=document.createElement("section");p.id="iqamaPanel";p.className="panel inline-control-panel";const opts=[5,10,15,20,25,30].map(v=>`<option value="${v}">${v} دقيقة</option>`).join("");p.innerHTML=`<div class="iqama-help">حدد المدة من وقت الأذان حتى الإقامة.</div>${IDS.map(id=>`<label>${NAMES[id]}<select data-iqama="${id}">${opts}</select></label>`).join("")}<label>الجمعة الأولى<select data-iqama="friday">${opts}</select></label><div class="iqama-friday-help">الجمعة الأولى تكون قبل أذان الظهر بالمدة المحددة.</div>`;btn.insertAdjacentElement("afterend",p);const s=settings();p.querySelectorAll("[data-iqama]").forEach(el=>{el.value=String(s[el.dataset.iqama]||DEFAULTS[el.dataset.iqama]);el.addEventListener("change",()=>{const q=settings();q[el.dataset.iqama]=+el.value;save(q);tick();});});btn.addEventListener("click",()=>{const open=p.classList.toggle("inline-open");document.querySelectorAll(".inline-control-panel.inline-open").forEach(x=>{if(x!==p)x.classList.remove("inline-open")});btn.classList.toggle("inline-active",open);});}
  function createAfterPanel(){
    const main=document.querySelector(".sidebar .main-panel");
    if(!main||document.getElementById("afterIqamaPanel"))return;
    const panel=document.createElement("section");
    panel.id="afterIqamaPanel";panel.className="panel inline-control-panel";
    const options=TIMING.OPTIONS.map(value=>`<option value="${value}">${value} دقيقة</option>`).join("");
    panel.innerHTML=`<div class="iqama-help">حدد مدة ظهور عدّاد «مضى على الإقامة» بعد إقامة كل صلاة. عند انتهاء المدة يختفي الإشعار فقط؛ وتبقى واجهة البرنامج «باقي على الإقامة 00:00».</div>${IDS.map(id=>`<label>${NAMES[id]}<select data-after-iqama="${id}">${options}</select></label>`).join("")}`;
    const values=afterSettings();
    panel.querySelectorAll("[data-after-iqama]").forEach(select=>{
      select.value=String(values[select.dataset.afterIqama]);
      select.addEventListener("change",()=>{
        const updated=afterSettings();updated[select.dataset.afterIqama]=Number(select.value);
        localStorage.setItem(AFTER_KEY,JSON.stringify(updated));syncNativeIqama();tick();
      });
    });
    main.appendChild(panel);
  }
  function css(){if(document.getElementById("prayerCountdownStyles"))return;const s=document.createElement("style");s.id="prayerCountdownStyles";s.textContent=`#mainPrayerCountdownHost{display:block!important;width:100%;min-height:36px;margin:0 auto 8px;padding:0;position:relative;z-index:20}.live-prayer-status{width:max-content;max-width:100%;margin:auto;display:flex;justify-content:center;align-items:center;gap:6px;direction:rtl;white-space:nowrap}.next-prayer,.iqama-status{display:inline-flex;width:auto;align-items:center;justify-content:center;gap:4px;padding:4px 7px;border-radius:9px;background:rgba(5,28,39,.88);border:1px solid rgba(255,255,255,.12);white-space:nowrap}#nextPrayerLabel,#nextPrayerCountdown,#iqamaLabel,#iqamaCountdown{color:#fff!important}.next-prayer span,.iqama-status span{font-size:12px;font-weight:700}.next-prayer b,.iqama-status b{font-size:15px;direction:ltr;font-weight:900;font-variant-numeric:tabular-nums;letter-spacing:0}#iqamaStatus[hidden],#countdownSeparator[hidden]{display:none!important}.countdown-separator{display:block;width:1px;height:28px;flex:0 0 1px;margin:0 2px;background:linear-gradient(to bottom,transparent,rgba(218,178,82,.95),transparent);box-shadow:0 0 5px rgba(218,178,82,.25)}.main-action.iqama-action{background:#8a6518}.iqama-help,.iqama-friday-help{font-size:12px;opacity:.85;margin-bottom:8px}#iqamaPanel label,#afterIqamaPanel label{display:flex;align-items:center;justify-content:space-between;gap:8px;margin:6px 0}#iqamaPanel select,#afterIqamaPanel select{max-width:125px}@media(max-width:600px){.live-prayer-status{width:max-content!important;max-width:calc(100vw - 12px)!important;gap:3px!important;flex-wrap:wrap!important}.next-prayer,.iqama-status{padding:3px 5px!important;gap:3px!important}#nextPrayerLabel,#nextPrayerCountdown,#iqamaLabel,#iqamaCountdown{color:#fff!important}#nextPrayerLabel,#iqamaLabel{font-size:12px}.next-prayer span,.iqama-status span{font-size:12px}.next-prayer b,.iqama-status b{font-size:15px}.countdown-separator{height:23px;margin:0 1px}}`;document.head.appendChild(s);}
  function tick(){if(!todayRow){loadToday();return;}const n=new Date(),now=n.getHours()*3600+n.getMinutes()*60+n.getSeconds(),s=settings();const times=IDS.map(id=>({id,min:parse(todayRow[id],id)})).filter(x=>x.min!=null);let next=times.find(x=>x.min*60>now),left=null;if(next){left=next.min*60-now;}else{next={id:"fajr"};if(tomorrowFajr!=null)left=(24*3600-now)+tomorrowFajr*60;}
    const label=document.getElementById("nextPrayerLabel"),counter=document.getElementById("nextPrayerCountdown");if(label)label.textContent=`أذان ${NAMES[next.id]} بعد`;if(counter)counter.textContent=left==null?"--:--:--":fmt(left);
    const iq=document.getElementById("iqamaStatus"),sep=document.getElementById("countdownSeparator"),iqLabel=document.getElementById("iqamaLabel"),iqCounter=document.getElementById("iqamaCountdown");
    let friday={};try{friday=window.AoqatAdhanCore.normalizeFriday(JSON.parse(localStorage.getItem('aoqatAdhanV1')||'{}').friday);}catch(_){}
    const at=window.AoqatAdhanCore.fridayAt([todayRow],n),frame=at===null?null:window.AoqatAdhanCore.fridayFrame(at,+n,friday);
    if(frame){if(iq)iq.hidden=false;if(sep)sep.hidden=false;const clock=fmtIqama(frame.seconds);if(iqLabel)iqLabel.textContent=frame.label;if(iqCounter)iqCounter.textContent=clock;showIqamaNotification(frame.label+' '+clock,true);return;}
    const phase=TIMING.state(now,times.filter(x=>!(n.getDay()===5&&friday.enabled&&x.id==='dhuhr')).map(x=>({id:x.id,startSeconds:x.min*60})),s,afterSettings());
    if(iq)iq.hidden=false;if(sep)sep.hidden=false;
    if(!phase){
      if(iqLabel)iqLabel.textContent="باقي على الإقامة";
      if(iqCounter)iqCounter.textContent="00:00";
      clearIqamaNotification();return;
    }
    const text=phase.phase==="elapsed"?"مضى على الإقامة":"باقي على الإقامة";
    const clock=fmtIqama(phase.seconds);
    if(iqLabel)iqLabel.textContent=text;if(iqCounter)iqCounter.textContent=clock;
    showIqamaNotification(text+" "+clock);
  }

  window.addEventListener("aoqatPrayerRowsUpdated",()=>{todayKey="";tomorrowKey="";loadToday().then(tick);});
  function init(){hydrateNativeIqama();syncNativeIqama();css();createDisplay();createPanel();createAfterPanel();loadToday().then(tick);setInterval(tick,1000);setInterval(loadToday,60000);window.addEventListener("focus",refreshIqamaNotifyButton);let tries=0,t=setInterval(()=>{tries++;if(addIqamaNotifyButton()||tries>80)clearInterval(t);},150);}
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});else init();
})();



;

/* js/compact-design-menu.js */
"use strict";
(function(){
  const ORDER=['#backgroundFontGroup','#datePrayerGroup'];

  function addStyles(){
    if(document.getElementById('compactDesignMenuStyles'))return;
    const s=document.createElement('style');s.id='compactDesignMenuStyles';
    s.textContent=`
      .sidebar .main-panel{padding:8px!important;text-align:right!important}.sidebar .main-panel>h2{margin:0 0 6px!important;font-size:15px!important;line-height:1.2!important}
      .sidebar .main-panel>.main-action,.sidebar .main-panel>#topExportJpg,#datePrayerGroup>.main-action,#prayerIqamaGroup>.main-action,#backgroundFontGroup>.main-action{width:max-content!important;max-width:100%!important;min-width:0!important;min-height:34px!important;height:34px!important;margin:0 0 4px auto!important;padding:5px 10px!important;border-radius:8px!important;font-size:12.5px!important;line-height:1!important;display:flex!important;align-items:center!important;justify-content:flex-start!important;gap:7px!important;box-shadow:none!important;white-space:nowrap!important}
      .sidebar .main-panel>.main-action span,.sidebar .main-panel>#topExportJpg span,#datePrayerGroup>.main-action span,#prayerIqamaGroup>.main-action span,#backgroundFontGroup>.main-action span{line-height:1!important;white-space:nowrap!important}.sidebar .main-panel>.inline-control-panel{margin:0 0 4px!important;padding:9px!important}.sidebar .main-panel>#topExportJpg{background:#176f9f!important;width:max-content!important;min-width:0!important;max-width:100%!important;min-height:26px!important;height:26px!important;padding:2px 7px!important;font-size:10.5px!important;border-radius:6px!important}
      #datePrayerGroup,#prayerIqamaGroup,#backgroundFontGroup{width:100%;margin:0 0 4px!important;padding:0!important}#datePrayerGroup>#datePrayerMainBtn{margin:0 0 0 auto!important;background:linear-gradient(135deg,#0d7890,#13a2a0)!important;border-color:#39b8b0!important}#prayerIqamaGroup>#prayerIqamaMainBtn{margin:0 0 0 auto!important;background:linear-gradient(135deg,#176b5c,#2f8f73)!important;border-color:#56b395!important}#backgroundFontGroup>#backgroundFontMainBtn{margin:0 0 0 auto!important;background:linear-gradient(135deg,#9a6424,#c58a35)!important;border-color:#e0ad62!important}
      #datePrayerSubmenu,#prayerIqamaSubmenu,#backgroundFontSubmenu{display:none!important;position:static!important;z-index:auto!important;top:auto!important;left:auto!important;right:auto!important;transform:none!important;width:100%!important;min-width:0!important;max-width:100%!important;padding:3px 0 0!important;margin:0!important;border:0!important;border-radius:0!important;background:transparent!important;box-shadow:none!important}
      #datePrayerGroup.group-open>#datePrayerSubmenu,#prayerIqamaGroup.group-open>#prayerIqamaSubmenu,#backgroundFontGroup.group-open>#backgroundFontSubmenu{display:block!important}#datePrayerSubmenu>.main-action,#prayerIqamaSubmenu>.main-action,#backgroundFontSubmenu>.main-action{width:100%!important;max-width:100%!important;min-width:0!important;min-height:34px!important;height:34px!important;margin:0 0 5px!important;padding:5px 9px!important;border-radius:7px!important;font-size:11.5px!important;display:flex!important;align-items:center!important;justify-content:flex-start!important;gap:6px!important;box-shadow:none!important;white-space:nowrap!important}#datePrayerSubmenu>.main-action:last-child,#prayerIqamaSubmenu>.main-action:last-child,#backgroundFontSubmenu>.main-action:last-child{margin-bottom:0!important}
      #datePrayerMainBtn .group-arrow,#prayerIqamaMainBtn .group-arrow,#backgroundFontMainBtn .group-arrow{margin-right:4px!important;font-size:10px;opacity:.8;transition:transform .18s ease}#datePrayerGroup.group-open #datePrayerMainBtn .group-arrow,#prayerIqamaGroup.group-open #prayerIqamaMainBtn .group-arrow,#backgroundFontGroup.group-open #backgroundFontMainBtn .group-arrow{transform:rotate(180deg)}
      /* Clear visual separation between every icon and the controls that belong to it. */
      #backgroundFontGroup,#datePrayerGroup{border:1px solid rgba(122,170,181,.22)!important;border-radius:12px!important;padding:6px!important;margin-bottom:8px!important;background:rgba(8,25,35,.38)!important}
      #backgroundFontSubmenu,#datePrayerSubmenu,#prayerIqamaSubmenu{gap:7px!important}
      #backgroundFontGroup.group-open>#backgroundFontSubmenu,#datePrayerGroup.group-open>#datePrayerSubmenu,#prayerIqamaGroup.group-open>#prayerIqamaSubmenu{display:flex!important;flex-direction:column!important;gap:7px!important;margin-top:6px!important;padding:8px!important;border:1px solid rgba(126,180,191,.32)!important;border-radius:10px!important;background:rgba(10,30,41,.72)!important;box-shadow:inset 0 1px 0 rgba(255,255,255,.05)!important}
      #backgroundFontSubmenu>.main-action,#datePrayerSubmenu>.main-action,#prayerIqamaSubmenu>.main-action,#datePrayerSubmenu>#prayerIqamaGroup{margin:0!important}
      #datePrayerSubmenu>#prayerIqamaGroup{width:100%!important;padding:6px!important;border:1px solid rgba(86,179,149,.38)!important;border-radius:10px!important;background:rgba(23,107,92,.12)!important}
      #datePrayerSubmenu>#prayerIqamaGroup.group-open{padding:7px!important;background:rgba(23,107,92,.20)!important;box-shadow:0 3px 10px rgba(0,0,0,.12)!important}
      #datePrayerSubmenu>#prayerIqamaGroup>#prayerIqamaMainBtn{margin:0!important}
      /* Main design-data icons: distinct identity + tidy framed contents when expanded. Visual only. */
      #backgroundFontGroup>#backgroundFontMainBtn{background:linear-gradient(135deg,#9a6424,#c58a35)!important;border:1px solid #e0ad62!important;box-shadow:0 3px 10px rgba(154,100,36,.24)!important}
      #datePrayerGroup>#datePrayerMainBtn{background:linear-gradient(135deg,#176b5c,#2f8f73)!important;border:1px solid #56b395!important;box-shadow:0 3px 10px rgba(23,107,92,.24)!important}
      #backgroundFontGroup.group-open,#datePrayerGroup.group-open{padding:6px!important;border-radius:11px!important;background:rgba(7,24,34,.72)!important;border:1px solid rgba(143,196,204,.28)!important;box-shadow:0 7px 18px rgba(0,0,0,.24)!important}
      #backgroundFontGroup.group-open>#backgroundFontMainBtn,#datePrayerGroup.group-open>#datePrayerMainBtn{margin-bottom:6px!important}
      #backgroundFontGroup.group-open>#backgroundFontSubmenu,#datePrayerGroup.group-open>#datePrayerSubmenu{padding:7px!important;border-radius:9px!important;background:linear-gradient(160deg,rgba(22,43,55,.96),rgba(13,31,43,.96))!important;border:1px solid rgba(120,177,191,.30)!important;box-shadow:inset 0 1px 0 rgba(255,255,255,.04)!important}
      /* Distinct colors for every submenu icon/button. Visual only; no click behavior changes. */
      #backgroundFontSubmenu>.main-action:nth-child(1){background:linear-gradient(135deg,#7b3fa1,#a55bc1)!important;border:1px solid #bd78d1!important;color:#fff!important}
      #backgroundFontSubmenu>.main-action:nth-child(2){background:linear-gradient(135deg,#176f9f,#2489bb)!important;border:1px solid #46a1c8!important;color:#fff!important}
      #backgroundFontSubmenu>.main-action:nth-child(3){background:linear-gradient(135deg,#b36a18,#d08a2e)!important;border:1px solid #dda14f!important;color:#fff!important}
      #datePrayerSubmenu>#prayerIqamaGroup>#prayerIqamaMainBtn{width:100%!important;max-width:100%!important;min-height:34px!important;height:34px!important;margin:0 0 5px!important;padding:5px 9px!important;border-radius:7px!important;font-size:11.5px!important;background:linear-gradient(135deg,#176b5c,#2f8f73)!important;border:1px solid #56b395!important;color:#fff!important;display:flex!important;align-items:center!important;justify-content:flex-start!important;gap:6px!important}\n      #datePrayerSubmenu>.main-action:nth-of-type(1){background:linear-gradient(135deg,#0d7890,#13a2a0)!important;border:1px solid #39b8b0!important;color:#fff!important}
      #datePrayerSubmenu>.main-action:nth-child(2){background:linear-gradient(135deg,#2e7d4f,#43a565)!important;border:1px solid #62ba7b!important;color:#fff!important}
      #datePrayerSubmenu>.main-action:nth-child(3){background:linear-gradient(135deg,#9b6a16,#c58b24)!important;border:1px solid #d6a144!important;color:#fff!important}
      #datePrayerSubmenu>.main-action:nth-child(4){background:linear-gradient(135deg,#a74468,#c75b7f)!important;border:1px solid #d77a98!important;color:#fff!important}
      #backgroundFontSubmenu>.main-action *,#datePrayerSubmenu>.main-action *{color:#fff!important}
      body.design-menu-open .sidebar .inline-control-panel.inline-open{display:block!important;position:fixed!important;z-index:10050!important;top:50%!important;left:50%!important;right:auto!important;transform:translate(-50%,-50%)!important;width:min(90vw,360px)!important;max-width:calc(100vw - 24px)!important;max-height:78vh!important;overflow-y:auto!important;margin:0!important;padding:38px 12px 12px!important;border-radius:12px!important;background:rgba(3,18,27,.96)!important;backdrop-filter:blur(14px)!important;-webkit-backdrop-filter:blur(14px)!important;border:1px solid rgba(255,255,255,.20)!important;box-shadow:0 18px 46px rgba(0,0,0,.68)!important}body.design-detail-open::after{content:"";position:fixed;inset:0;z-index:10005;background:rgba(0,8,14,.52);backdrop-filter:blur(4px);-webkit-backdrop-filter:blur(4px);pointer-events:none}
      body.design-menu-open .sidebar .inline-control-panel.inline-open{background:linear-gradient(160deg,rgba(10,42,55,.985),rgba(8,31,44,.985))!important;border-color:rgba(104,190,205,.38)!important}
      body.design-menu-open .sidebar .inline-control-panel.inline-open label{color:#eaf6f8!important}
      body.design-menu-open .sidebar .inline-control-panel.inline-open select,body.design-menu-open .sidebar .inline-control-panel.inline-open input[type="text"],body.design-menu-open .sidebar .inline-control-panel.inline-open input[type="number"]{background:#17394a!important;border-color:#4d7283!important;color:#fff!important;box-shadow:inset 0 0 0 1px rgba(255,255,255,.025)!important}
      body.design-menu-open .sidebar .inline-control-panel.inline-open input[type="color"]{background:#17394a!important;border-color:#4d7283!important;padding:5px!important}
      body.design-menu-open .sidebar .inline-control-panel.inline-open .main-action,body.design-menu-open .sidebar .inline-control-panel.inline-open button:not(.design-popup-close):not(.color-swatch):not(.interface-visibility-btn){background:#24485a!important;border-color:#54798a!important;color:#fff!important}
      body.design-menu-open .sidebar .inline-control-panel.inline-open .interface-visibility-btn{background:#29495a!important;border-color:#587b8b!important}.interface-visibility-btn.is-on{background:#168b52!important;border-color:#45ad78!important}
      body.design-menu-open .sidebar .inline-control-panel.inline-open hr{border-color:rgba(119,174,193,.25)!important}
      /* High-contrast visual identity for design-data popups */
      body.design-menu-open .sidebar .inline-control-panel.inline-open{background:linear-gradient(155deg,#182235 0%,#101827 52%,#211b34 100%)!important;border:1px solid #6d7593!important;box-shadow:0 20px 50px rgba(0,0,0,.72),inset 0 0 0 1px rgba(255,255,255,.035)!important}
      body.design-menu-open .sidebar .inline-control-panel.inline-open label{color:#f4f1ff!important}
      body.design-menu-open .sidebar .inline-control-panel.inline-open select,body.design-menu-open .sidebar .inline-control-panel.inline-open input[type="text"],body.design-menu-open .sidebar .inline-control-panel.inline-open input[type="number"]{background:#27324a!important;border:1px solid #7c87a9!important;color:#fff!important;box-shadow:none!important}
      body.design-menu-open .sidebar .inline-control-panel.inline-open input[type="color"]{background:#27324a!important;border:1px solid #7c87a9!important}
      body.design-menu-open .sidebar .inline-control-panel.inline-open .main-action,body.design-menu-open .sidebar .inline-control-panel.inline-open button:not(.design-popup-close):not(.color-swatch):not(.interface-visibility-btn){background:linear-gradient(135deg,#3a4660,#303a52)!important;border:1px solid #74809f!important;color:#fff!important}
      body.design-menu-open .sidebar .inline-control-panel.inline-open .interface-visibility-btn{background:#303b53!important;border:1px solid #75819f!important;color:#fff!important}
      body.design-menu-open .sidebar .inline-control-panel.inline-open .interface-visibility-btn.is-on{background:linear-gradient(135deg,#079447,#12b35d)!important;border-color:#55d88e!important;color:#fff!important;box-shadow:0 3px 10px rgba(0,150,72,.25)!important}
      body.design-menu-open .sidebar .inline-control-panel.inline-open .interface-visibility-btn.is-on strong{background:rgba(255,255,255,.20)!important;color:#fff!important}
      body.design-menu-open .sidebar .inline-control-panel.inline-open .interface-visibility-btn:not(.is-on) strong{background:#59647b!important;color:#fff!important}
      body.design-menu-open .sidebar .inline-control-panel.inline-open hr{border-color:#555f7a!important}
      /* Warm cream identity for design-data popups */
      body.design-menu-open .sidebar .inline-control-panel.inline-open{background:linear-gradient(155deg,#fffaf0 0%,#f7eedc 55%,#efe1c6 100%)!important;border:1px solid #d7bf91!important;box-shadow:0 20px 50px rgba(0,0,0,.48),inset 0 0 0 1px rgba(255,255,255,.8)!important;color:#102d39!important}
      body.design-menu-open .sidebar .inline-control-panel.inline-open label,body.design-menu-open .sidebar .inline-control-panel.inline-open h1,body.design-menu-open .sidebar .inline-control-panel.inline-open h2,body.design-menu-open .sidebar .inline-control-panel.inline-open h3,body.design-menu-open .sidebar .inline-control-panel.inline-open strong{color:#153642!important}
      body.design-menu-open .sidebar .inline-control-panel.inline-open select,body.design-menu-open .sidebar .inline-control-panel.inline-open input[type="text"],body.design-menu-open .sidebar .inline-control-panel.inline-open input[type="number"]{background:#e8f0ee!important;border:1px solid #78999b!important;color:#12343f!important;box-shadow:0 1px 2px rgba(0,0,0,.06)!important}
      body.design-menu-open .sidebar .inline-control-panel.inline-open input[type="color"]{background:#edf3ef!important;border:1px solid #78999b!important}
      body.design-menu-open .sidebar .inline-control-panel.inline-open .main-action,body.design-menu-open .sidebar .inline-control-panel.inline-open button:not(.design-popup-close):not(.color-swatch):not(.interface-visibility-btn){background:linear-gradient(135deg,#174b55,#226572)!important;border:1px solid #2f7680!important;color:#fff!important}
      body.design-menu-open .sidebar .inline-control-panel.inline-open .main-action *,body.design-menu-open .sidebar .inline-control-panel.inline-open button:not(.design-popup-close):not(.color-swatch):not(.interface-visibility-btn) *{color:#fff!important}
      body.design-menu-open .sidebar .inline-control-panel.inline-open .interface-visibility-btn{background:#dfe9e5!important;border:1px solid #82a39f!important;color:#153642!important}
      body.design-menu-open .sidebar .inline-control-panel.inline-open .interface-visibility-btn span{color:#153642!important}
      body.design-menu-open .sidebar .inline-control-panel.inline-open .interface-visibility-btn strong{background:#829793!important;color:#fff!important}
      body.design-menu-open .sidebar .inline-control-panel.inline-open .interface-visibility-btn.is-on{background:linear-gradient(135deg,#078e48,#13ad60)!important;border-color:#087d43!important;color:#fff!important;box-shadow:0 3px 10px rgba(0,128,67,.22)!important}
      body.design-menu-open .sidebar .inline-control-panel.inline-open .interface-visibility-btn.is-on span,body.design-menu-open .sidebar .inline-control-panel.inline-open .interface-visibility-btn.is-on strong{color:#fff!important}
      body.design-menu-open .sidebar .inline-control-panel.inline-open .interface-visibility-btn.is-on strong{background:rgba(255,255,255,.20)!important}
      body.design-menu-open .sidebar .inline-control-panel.inline-open hr{border-color:#d5c6aa!important}
      /* Unified toggle palette: visual only; keeps every button's existing behavior */
      body.design-menu-open .sidebar .inline-control-panel.inline-open .interface-visibility-btn.is-on,
      body.design-menu-open .sidebar .inline-control-panel.inline-open .compact-toggle.is-on,
      body.design-menu-open .sidebar .inline-control-panel.inline-open .toggle-btn.is-on,
      body.design-menu-open .sidebar .inline-control-panel.inline-open .toggle-btn.on,
      body.design-menu-open .sidebar .inline-control-panel.inline-open button.active[data-toggle],
      body.design-menu-open .sidebar .inline-control-panel.inline-open button[aria-pressed="true"],
      body.design-menu-open .sidebar .inline-control-panel.inline-open button[data-enabled="true"]{background:linear-gradient(135deg,#078b46,#10a95b)!important;border-color:#08753e!important;color:#fff!important}
      body.design-menu-open .sidebar .inline-control-panel.inline-open .interface-visibility-btn:not(.is-on),
      body.design-menu-open .sidebar .inline-control-panel.inline-open .compact-toggle:not(.is-on),
      body.design-menu-open .sidebar .inline-control-panel.inline-open .toggle-btn:not(.is-on):not(.on),
      body.design-menu-open .sidebar .inline-control-panel.inline-open button[data-toggle]:not(.active),
      body.design-menu-open .sidebar .inline-control-panel.inline-open button[aria-pressed="false"],
      body.design-menu-open .sidebar .inline-control-panel.inline-open button[data-enabled="false"]{background:#70817f!important;border-color:#859593!important;color:#fff!important}
      /* Global design-menu ON/OFF appearance.  Uses the visible Arabic state so legacy controls
         get the same palette as the four interface visibility controls without changing their logic. */
      body.design-menu-open .sidebar .inline-control-panel.inline-open button.unified-toggle-on{
        background:linear-gradient(135deg,#078b46,#10a95b)!important;
        border-color:#08753e!important;color:#fff!important;
      }
      body.design-menu-open .sidebar .inline-control-panel.inline-open button.unified-toggle-off{
        background:#70817f!important;border-color:#859593!important;color:#fff!important;
      }
      /* Readability + unified ON/OFF states inside cream design panels */
      body.design-menu-open .sidebar .inline-control-panel.inline-open,body.design-menu-open .sidebar .inline-control-panel.inline-open p,body.design-menu-open .sidebar .inline-control-panel.inline-open small,body.design-menu-open .sidebar .inline-control-panel.inline-open div:not(.color-swatch){color:#173743!important}
      body.design-menu-open .sidebar .inline-control-panel.inline-open [style*="color"]{color:#173743!important}
      body.design-menu-open .sidebar .inline-control-panel.inline-open .interface-visibility-btn.is-on,body.design-menu-open .sidebar .inline-control-panel.inline-open button[data-enabled="true"],body.design-menu-open .sidebar .inline-control-panel.inline-open button[aria-pressed="true"]{background:linear-gradient(135deg,#078b46,#10a95b)!important;border-color:#08753e!important;color:#fff!important}
      body.design-menu-open .sidebar .inline-control-panel.inline-open .interface-visibility-btn.is-on *,body.design-menu-open .sidebar .inline-control-panel.inline-open button[data-enabled="true"] *,body.design-menu-open .sidebar .inline-control-panel.inline-open button[aria-pressed="true"] *{color:#fff!important}
      body.design-menu-open .sidebar .inline-control-panel.inline-open .interface-visibility-btn:not(.is-on),body.design-menu-open .sidebar .inline-control-panel.inline-open button[data-enabled="false"],body.design-menu-open .sidebar .inline-control-panel.inline-open button[aria-pressed="false"]{background:#70817f!important;border-color:#859593!important;color:#fff!important}
      body.design-menu-open .sidebar .inline-control-panel.inline-open .interface-visibility-btn:not(.is-on) *,body.design-menu-open .sidebar .inline-control-panel.inline-open button[data-enabled="false"] *,body.design-menu-open .sidebar .inline-control-panel.inline-open button[aria-pressed="false"] *{color:#fff!important}
      #interfaceVisibilityControls,#designVisibilityControls,#designEditTools{margin:8px 0 0!important}
      /* Separate each tool group visually so an opened section never blends into the next icon. */
      body.design-menu-open #backgroundPanel #backgroundDesignTools,
      body.design-menu-open #backgroundPanel #interfaceVisibilityControls,
      body.design-menu-open #backgroundPanel #designVisibilityControls{
        margin:10px 0!important;padding:8px!important;border:1px solid #d8c49d!important;border-radius:12px!important;
        background:rgba(255,255,255,.42)!important;box-shadow:0 3px 10px rgba(74,55,28,.08)!important;
      }
      body.design-menu-open #backgroundPanel #backgroundDesignTools + #interfaceVisibilityControls,
      body.design-menu-open #backgroundPanel #interfaceVisibilityControls + #designVisibilityControls{
        margin-top:12px!important;
      }
      body.design-menu-open #backgroundPanel #backgroundDesignTools .bg-tools-grid,
      body.design-menu-open #backgroundPanel .visibility-section-body{
        margin-top:7px!important;padding:8px!important;border-radius:9px!important;
        background:rgba(246,237,219,.72)!important;border:1px solid rgba(196,169,119,.45)!important;
      }
      body.design-menu-open #backgroundPanel .visibility-section:not(.visibility-section-open) .visibility-section-body{margin-top:0!important;padding:0!important;border:0!important}
      #designEditTools .design-edit-tools-body{display:flex!important;flex-direction:column!important;gap:6px!important}
      #designEditTools .design-edit-tools-body>.main-action,#designEditTools .design-edit-tools-body>button,#designEditTools .design-edit-tools-body>.drag-info,#designEditTools .design-edit-tools-body>.drag-info>button{width:100%!important;max-width:100%!important;margin:0!important;min-height:36px!important}
      #designEditTools .design-edit-tools-body>.drag-info{padding:0!important;background:transparent!important;box-shadow:none!important;border:0!important}
      #designEditTools .design-edit-tools-body>.drag-info>span{display:none!important}
      /* Design edit tools: slim, distinct colors. Visual-only; no behavior changes. */
      body.design-menu-open #backgroundPanel #backgroundDesignTools .bg-tools-grid{gap:5px!important;padding-top:6px!important}
      body.design-menu-open #backgroundPanel #backgroundDesignTools .bg-tools-grid>button,
      body.design-menu-open #backgroundPanel #backgroundDesignTools .bg-tools-grid>.main-action,
      body.design-menu-open #backgroundPanel #backgroundDesignTools #manualEditToggle{min-height:30px!important;height:30px!important;padding:3px 10px!important;border-radius:7px!important;font-size:12px!important;font-weight:800!important;box-shadow:0 1px 3px rgba(20,45,55,.10)!important}
      body.design-menu-open #backgroundPanel #backgroundDesignTools #changeBackgroundBtn{background:linear-gradient(135deg,#176f9f,#2489bb)!important;border-color:#2d91bd!important;color:#fff!important}
      body.design-menu-open #backgroundPanel #backgroundDesignTools #saveDesignAdjustments{background:linear-gradient(135deg,#6b3fa0,#8c55b4)!important;border-color:#9a68bc!important;color:#fff!important}
      body.design-menu-open #backgroundPanel #backgroundDesignTools #resetPositions{background:linear-gradient(135deg,#b36a18,#d08a2e)!important;border-color:#d89843!important;color:#fff!important}
      /* النص السفلي له مدخل واحد فقط داخل الإعدادات؛ أخفِ النسخة القديمة داخل واجهة البرنامج. */
      body.design-menu-open #backgroundPanel [data-open-panel="footerPanel"]{display:none!important}
      body.design-menu-open #backgroundPanel #backgroundDesignTools #manualEditToggle:not(.is-on)[aria-pressed="false"]{background:#70817f!important;border-color:#859593!important;color:#fff!important}
      body.design-menu-open #backgroundPanel #backgroundDesignTools #manualEditToggle.is-on,
      body.design-menu-open #backgroundPanel #backgroundDesignTools #manualEditToggle[aria-pressed="true"]{background:linear-gradient(135deg,#078b46,#10a95b)!important;border-color:#08753e!important;color:#fff!important}
      .visibility-section-toggle{width:100%!important;min-height:32px!important;height:32px!important;margin:0!important;padding:3px 10px!important;border:1px solid rgba(255,255,255,.22)!important;border-radius:8px!important;color:#fff!important;font-weight:800!important;font-size:12.5px!important;display:flex!important;align-items:center!important;justify-content:space-between!important;gap:8px!important;cursor:pointer!important;box-shadow:0 1px 4px rgba(20,45,55,.13)!important;transition:transform .16s ease,filter .16s ease!important}
      .visibility-section-toggle:active{transform:scale(.992)!important}
      #designEditTools .visibility-section-toggle{background:linear-gradient(135deg,#087f78,#0aa59a)!important;border-color:#0fb5a8!important}
      #interfaceVisibilityControls .visibility-section-toggle{background:linear-gradient(135deg,#1d5f9e,#2f86c6)!important;border-color:#4397d2!important}
      #designVisibilityControls .visibility-section-toggle{background:linear-gradient(135deg,#6b3fa0,#9657bd)!important;border-color:#a36bc5!important}
      .visibility-section-toggle span{color:#fff!important}.visibility-section-toggle .visibility-arrow{font-size:9px!important;opacity:.9;transition:transform .18s ease}.visibility-section-toggle[aria-expanded="true"] .visibility-arrow{transform:rotate(180deg)}
      .visibility-section-body{display:none!important;padding-top:6px!important}.visibility-section-open>.visibility-section-body{display:block!important}
      .design-popup-close{position:absolute!important;top:7px!important;left:7px!important;z-index:2!important;width:27px!important;height:27px!important;min-width:27px!important;min-height:27px!important;margin:0!important;padding:0!important;border:1px solid rgba(255,255,255,.2)!important;border-radius:7px!important;background:#16594f!important;color:#fff!important;font-size:18px!important;font-weight:800!important;line-height:1!important;display:flex!important;align-items:center!important;justify-content:center!important;cursor:pointer!important}
      body.design-detail-open .sidebar .main-panel>h2,body.design-detail-open .sidebar .main-panel>#backgroundFontGroup,body.design-detail-open .sidebar .main-panel>#datePrayerGroup,body.design-detail-open .sidebar .main-panel>[data-open-panel="switchPanel"],body.design-detail-open .sidebar .main-panel>#topExportJpg{visibility:hidden!important;pointer-events:none!important}
      @media(max-width:800px){.sidebar .main-panel{padding:7px!important}.sidebar .main-panel>.main-action,.sidebar .main-panel>#topExportJpg,#datePrayerGroup>.main-action,#backgroundFontGroup>.main-action{width:max-content!important;max-width:100%!important;min-width:0!important;min-height:32px!important;height:32px!important;margin:0 0 3px auto!important;padding:4px 8px!important;font-size:12px!important;border-radius:7px!important}#datePrayerSubmenu,#backgroundFontSubmenu{width:100%!important;min-width:0!important;max-width:100%!important;margin:0!important}#datePrayerSubmenu>.main-action,#backgroundFontSubmenu>.main-action{width:100%!important;max-width:100%!important;min-width:0!important;min-height:32px!important;height:32px!important;font-size:11px!important}}
    `;document.head.appendChild(s);
  }

  function closeGroups(except=null){['datePrayerGroup','prayerIqamaGroup','backgroundFontGroup'].forEach(id=>{const g=document.getElementById(id);if(g&&g!==except&&!(except&&g.contains(except)))g.classList.remove('group-open');});}
  function closePanels(except=null){document.querySelectorAll('.inline-control-panel.inline-open').forEach(p=>{if(p===except)return;p.classList.remove('inline-open','active-panel','collapsed');document.querySelector(`[data-open-panel="${p.id}"]`)?.classList.remove('inline-active');});if(!except)document.body.classList.remove('design-detail-open');}
  function addClose(panel){if(!panel||panel.querySelector(':scope > .design-popup-close'))return;const x=document.createElement('button');x.type='button';x.className='design-popup-close';x.setAttribute('aria-label','رجوع');x.setAttribute('title','رجوع');x.textContent='‹';x.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();panel.classList.remove('inline-open','active-panel','collapsed');document.querySelector(`[data-open-panel="${panel.id}"]`)?.classList.remove('inline-active');document.body.classList.remove('design-detail-open');});panel.prepend(x);}

  function createGroup(id,buttonId,submenuId,label,icon){
    const main=document.querySelector('.sidebar .main-panel');let group=document.getElementById(id);if(group)return group;
    group=document.createElement('div');group.id=id;const mainBtn=document.createElement('button');mainBtn.type='button';mainBtn.id=buttonId;mainBtn.className='main-action';mainBtn.innerHTML=`${icon} <span>${label}</span><span class="group-arrow">▼</span>`;const submenu=document.createElement('div');submenu.id=submenuId;group.append(mainBtn,submenu);
    mainBtn.addEventListener('click',event=>{event.preventDefault();event.stopPropagation();const open=!group.classList.contains('group-open');closePanels();closeGroups(group);group.classList.toggle('group-open',open);});main.appendChild(group);return group;
  }
  function syncLegacyToggleColors(){
    document.querySelectorAll('body.design-menu-open .sidebar .inline-control-panel.inline-open').forEach(panel=>{
      const walker=document.createTreeWalker(panel,NodeFilter.SHOW_TEXT);
      const rows=new Map();let node;
      while((node=walker.nextNode())){
        const text=(node.nodeValue||'').trim();
        let word='';
        if(text==='تشغيل'||/(?:^|[:：\\s])تشغيل$/.test(text))word='تشغيل';
        else if(text==='إيقاف'||/(?:^|[:：\\s])إيقاف$/.test(text))word='إيقاف';
        if(!word)continue;
        let el=node.parentElement;
        const row=el?.closest('button,[role="button"],.main-action,.compact-toggle,.toggle-btn')||el?.parentElement;
        if(row&&row!==panel)rows.set(row,word);
      }
      rows.forEach((word,row)=>{
        const on=word==='تشغيل';
        row.classList.toggle('unified-toggle-on',on);
        row.classList.toggle('unified-toggle-off',!on);
        row.style.setProperty('background',on?'linear-gradient(135deg,#078b46,#10a95b)':'#70817f','important');
        row.style.setProperty('border-color',on?'#08753e':'#859593','important');
        row.style.setProperty('color','#fff','important');
        row.querySelectorAll('*').forEach(ch=>ch.style.setProperty('color','#fff','important'));
      });
    });
  }
  const toggleColorObserver=new MutationObserver(()=>syncLegacyToggleColors());
  toggleColorObserver.observe(document.documentElement,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['class','aria-pressed']});
  document.addEventListener('click',()=>setTimeout(syncLegacyToggleColors,0),true);
  setTimeout(syncLegacyToggleColors,0);

  function consolidateDataPrayer(){
    const date=document.querySelector('[data-open-panel="datePanel"]'),prayer=document.querySelector('[data-open-panel="prayerPanel"]'),iqama=document.querySelector('[data-open-panel="iqamaPanel"]'),switchBtn=document.querySelector('[data-open-panel="switchPanel"]');
    if(!date||!prayer||!iqama)return false;
    createGroup('datePrayerGroup','datePrayerMainBtn','datePrayerSubmenu','بيانات التاريخ والصلاة','🕌');
    const dateMenu=document.getElementById('datePrayerSubmenu');
    createGroup('prayerIqamaGroup','prayerIqamaMainBtn','prayerIqamaSubmenu','بيانات الصلاة و الإقامة','🕌');
    const prayerGroup=document.getElementById('prayerIqamaGroup');
    const prayerMenu=document.getElementById('prayerIqamaSubmenu');
    [prayer,iqama].forEach(x=>{if(x.parentElement!==prayerMenu)prayerMenu.appendChild(x)});
    [prayerGroup,date,switchBtn].filter(Boolean).forEach(x=>{if(x.parentElement!==dateMenu)dateMenu.appendChild(x)});
    return true;
  }
  function addInterfaceVisibilityControls(){
    const panel=document.getElementById('backgroundPanel');if(!panel||document.getElementById('interfaceVisibilityControls'))return false;
    const box=document.createElement('div');box.id='interfaceVisibilityControls';box.className='visibility-section';box.innerHTML='<button type="button" class="visibility-section-toggle" aria-expanded="false"><span>👁️ إظهار عناصر واجهة البرنامج</span><span class="visibility-arrow">▼</span></button><div class="visibility-section-body"><div class="interface-visibility-grid"></div></div>';
    const sectionToggle=box.querySelector('.visibility-section-toggle');sectionToggle.onclick=()=>{const open=!box.classList.contains('visibility-section-open');document.querySelectorAll('#backgroundPanel .visibility-section').forEach(x=>{if(x!==box){x.classList.remove('visibility-section-open');x.querySelector('.visibility-section-toggle')?.setAttribute('aria-expanded','false');}});box.classList.toggle('visibility-section-open',open);sectionToggle.setAttribute('aria-expanded',String(open));};
    const grid=box.querySelector('.interface-visibility-grid'),KEY='aoqatInterfaceVisibilityV1';
    let state={};try{state={clock:true,date:true,adhan:true,iqama:true,...(JSON.parse(localStorage.getItem(KEY)||'{}')||{})};}catch(_){}
    const items=[['clock','الساعة','.interface-clock-card'],['date','التاريخ','.interface-date-card'],['adhan','باقي على الصلاة','.next-prayer'],['iqama','باقي على الإقامة','.iqama-status']];
    const apply=()=>{items.forEach(([k,,sel])=>{document.querySelectorAll(sel).forEach(el=>el.style.setProperty('display',state[k]===true&&!el.hidden?'inline-flex':'none','important'));});const sep=document.getElementById('countdownSeparator');if(sep)sep.style.setProperty('display',(state.adhan===true&&state.iqama===true&&!sep.hidden)?'block':'none','important');};
    items.forEach(([k,label])=>{const b=document.createElement('button');b.type='button';b.className='interface-visibility-btn';const draw=()=>{const on=state[k]===true;b.classList.toggle('is-on',on);b.setAttribute('aria-pressed',String(on));b.innerHTML='<span>'+label+'</span><strong>'+(on?'تشغيل':'إيقاف')+'</strong>';};b.onclick=()=>{state[k]=!(state[k]===true);localStorage.setItem(KEY,JSON.stringify(state));draw();apply();};draw();grid.appendChild(b);});
    panel.appendChild(box);apply();setInterval(apply,1000);return true;
  }
  function addDesignVisibilityControls(){
    const panel=document.getElementById('backgroundPanel');if(!panel)return false;
    let box=document.getElementById('designVisibilityControls');
    if(!box){
      box=document.createElement('div');box.id='designVisibilityControls';box.className='visibility-section';
      box.innerHTML='<button type="button" class="visibility-section-toggle" aria-expanded="false"><span>🖼️ إظهار / إخفاء التصاميم</span><span class="visibility-arrow">▼</span></button><div class="visibility-section-body"><div class="interface-visibility-grid design-visibility-grid"></div></div>';
      const sectionToggle=box.querySelector('.visibility-section-toggle');sectionToggle.onclick=()=>{const open=!box.classList.contains('visibility-section-open');document.querySelectorAll('#backgroundPanel .visibility-section').forEach(x=>{if(x!==box){x.classList.remove('visibility-section-open');x.querySelector('.visibility-section-toggle')?.setAttribute('aria-expanded','false');}});box.classList.toggle('visibility-section-open',open);sectionToggle.setAttribute('aria-expanded',String(open));};
      panel.appendChild(box);
    }
    const grid=box.querySelector('.design-visibility-grid'),KEY='aoqatDesignVisibilityV1';
    let state={};try{state=JSON.parse(localStorage.getItem(KEY)||'{}')||{};}catch(_){}
    const slides=Array.from(document.querySelectorAll('.design-carousel-track > .design-slide')).filter(slide=>!slide.dataset.legacySlide&&!slide.querySelector('#design')&&!slide.classList.contains('removed-design-storage')&&!slide.closest('.removed-design-storage'));
    if(!slides.length)return false;
    const canonical=['designRef','design2','design3','design4'];
    slides.sort((a,b)=>canonical.indexOf(a.firstElementChild?.id)-canonical.indexOf(b.firstElementChild?.id));
    slides.forEach((slide,i)=>{slide.dataset.visibilityKey=slide.firstElementChild?.id||'design-'+(i+1);const key=slide.dataset.visibilityKey;if(!(key in state)&&('design-'+(i+1)) in state)state[key]=state['design-'+(i+1)];});
    const enabledSlides=()=>slides.filter(slide=>state[slide.dataset.visibilityKey]!==false);
    const apply=()=>{
      if(!enabledSlides().length){state[slides[0].dataset.visibilityKey]=true;localStorage.setItem(KEY,JSON.stringify(state));}
      slides.forEach(slide=>slide.dataset.designDisabled=state[slide.dataset.visibilityKey]===false?'true':'false');
      window.dispatchEvent(new CustomEvent('prayerDesignVisibilityChanged',{detail:{state}}));
    };
    grid.innerHTML='';
    slides.forEach((slide,i)=>{
      const key=slide.dataset.visibilityKey,b=document.createElement('button');b.type='button';b.className='interface-visibility-btn design-visibility-btn';
      const draw=()=>{const on=state[key]!==false;b.classList.toggle('is-on',on);b.setAttribute('aria-pressed',String(on));b.innerHTML='<span>التصميم '+(i+1)+'</span><strong>'+(on?'تشغيل':'إيقاف')+'</strong>';};
      b.onclick=()=>{const on=state[key]!==false;if(on&&enabledSlides().length===1)return;state[key]=!on;localStorage.setItem(KEY,JSON.stringify(state));draw();apply();};draw();grid.appendChild(b);
    });
    apply();return true;
  }
  function consolidateBackgroundFont(){addInterfaceVisibilityControls();addDesignVisibilityControls();const a=document.querySelector('[data-open-panel="fontPanel"]'),b=document.querySelector('[data-open-panel="backgroundPanel"]'),e=document.getElementById('topExportJpg');if(!a||!b)return false;createGroup('backgroundFontGroup','backgroundFontMainBtn','backgroundFontSubmenu','واجهة البرنامج الرئيسية','🎨');const s=document.getElementById('backgroundFontSubmenu');[b,a,e].filter(Boolean).forEach(x=>{if(x.parentElement!==s)s.appendChild(x)});return true;}
  function arrange(){const main=document.querySelector('.sidebar .main-panel');if(!main)return false;addStyles();const d=consolidateDataPrayer(),s=consolidateBackgroundFont();ORDER.forEach(sel=>{const item=main.querySelector(sel)||document.querySelector(sel);if(!item)return;main.appendChild(item);const id=item.dataset?.openPanel;if(id){const p=document.getElementById(id);if(p&&p.parentElement===main)main.appendChild(p);}});document.querySelectorAll('.inline-control-panel').forEach(addClose);return d&&s&&ORDER.every(sel=>!!document.querySelector(sel));}

  function installExclusivePopupBehavior(){
    if(document.documentElement.dataset.exclusiveDesignPopups)return;document.documentElement.dataset.exclusiveDesignPopups='1';
    document.addEventListener('click',e=>{
      const btn=e.target.closest('[data-open-panel]');if(!btn)return;
      const panel=document.getElementById(btn.dataset.openPanel);if(!panel)return;
      closeGroups();closePanels(panel);addClose(panel);document.body.classList.add('design-detail-open');
    },true);
  }
  function init(){window.addEventListener('prayerDesignChanged',()=>{if(document.querySelectorAll('.design-visibility-btn').length!==4)addDesignVisibilityControls();});let tries=0;arrange();installExclusivePopupBehavior();const timer=setInterval(()=>{tries++;if(arrange()||tries>=60)clearInterval(timer);},150);window.addEventListener('aoqatModulesReady',()=>{arrange();installExclusivePopupBehavior();});}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();


;

/* js/web-theme-settings.js */
"use strict";
(function(){
  const STORAGE_KEY="aoqatWebAppearanceThemeV1";
  // Also protect a previously cached document when the appearance module updates.
  if(!window.AndroidNative?.configureAdhan){
    document.documentElement.setAttribute('data-aoqat-web-colors','fixed');
    if(!document.getElementById('webFixedColorScheme')){
      const fixed=document.createElement('style');fixed.id='webFixedColorScheme';
      fixed.textContent='html[data-aoqat-web-colors="fixed"],html[data-aoqat-web-colors="fixed"] *{color-scheme:light!important;color-scheme:only light!important}';
      document.head.appendChild(fixed);
    }
  }

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
  document.addEventListener('change',e=>{const el=e.target.closest?.('[data-theme-control]');if(!el)return;const x=buttonSettings();x[el.dataset.themeControl]=el.value;saveButtons(x);syncButtons();refreshControls();});
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
    panel.innerHTML=controls()+'<div class="wt-head"><span>🎨 الثيمات والألوان</span><span>اختيار مباشر</span></div><div class="wt-grid">'+themes.map(t=>'<button type="button" class="wt-card" data-theme="'+t.id+'"><span class="wt-swatch" style="background:linear-gradient(90deg,'+t.vars.bg+','+t.vars.accent+')"></span><span>'+t.icon+' '+t.name+'</span></button>').join("")+'</div>';

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
;

/* js/notification-settings-layout.js */
(function(){'use strict';
  if(window.AndroidNative?.configureAdhan)return;
  const KEY='aoqatIqamaAppearanceV1',MODES=['white','dark','transparent'];
  function mode(){try{const value=localStorage.getItem(KEY);return MODES.includes(value)?value:'transparent';}catch(_){return 'transparent';}}
  function paint(){const select=document.getElementById('iqamaAppearance'),preview=document.getElementById('iqamaAppearancePreview');if(!select||!preview)return;select.value=mode();preview.dataset.appearance=mode();}
  function move(){const target=document.getElementById('iqamaPanel'),button=document.getElementById('iqamaNotificationToggle');if(!target||!button)return false;
    let controls=document.getElementById('iqamaNotificationSettings');if(!controls){controls=document.createElement('section');controls.id='iqamaNotificationSettings';const title=document.createElement('h3');title.textContent='إشعار الإقامة';controls.appendChild(title);target.appendChild(controls);}
    // Move originals, preserving listeners, permissions and saved timing settings.
    if(button.parentElement!==controls)controls.appendChild(button);
    const repair=document.getElementById('iqamaBackgroundAccess');if(repair&&repair.parentElement!==controls)controls.appendChild(repair);
    let select=document.getElementById('iqamaAppearance');
    if(select){const label=select.closest('label');if(label&&label.parentElement!==controls)controls.appendChild(label);}
    else{const label=document.createElement('label');label.textContent='خلفية إشعار الإقامة';select=document.createElement('select');select.id='iqamaAppearance';for(const [value,text] of [['white','أبيض'],['dark','داكن'],['transparent','شفاف']])select.add(new Option(text,value));label.appendChild(select);controls.appendChild(label);select.onchange=()=>{try{localStorage.setItem(KEY,select.value);}catch(_){}paint();};
      const preview=document.createElement('div');preview.id='iqamaAppearancePreview';preview.textContent='باقي على الإقامة 00:00';controls.appendChild(preview);const note=document.createElement('p');note.className='ad-note';note.textContent='معاينة الخلفية على الويب؛ لون إشعار الهاتف نفسه يحدده المتصفح ونظام الهاتف.';controls.appendChild(note);}
    paint();return true;
  }
  function init(){const style=document.createElement('style');style.textContent='#iqamaNotificationSettings{margin-top:16px;padding-top:12px;border-top:1px solid var(--wt-border,#d9c8a8)}#iqamaNotificationSettings label{display:flex;align-items:center;justify-content:space-between;gap:10px;margin:12px 0}#iqamaAppearance{max-width:150px}#iqamaAppearancePreview{padding:16px;border:1px solid var(--wt-border,#d9c8a8);border-radius:10px;text-align:center;font-weight:700}#iqamaAppearancePreview[data-appearance="white"]{background:#fff;color:#182c34}#iqamaAppearancePreview[data-appearance="dark"]{background:#172b37;color:#fff}#iqamaAppearancePreview[data-appearance="transparent"]{background:transparent;color:var(--wt-text,#182c34)}#webSettingsTemp #switchPanel{margin-top:12px!important}';document.head.appendChild(style);move();let tries=0;const timer=setInterval(()=>{if(move()||++tries>=60)clearInterval(timer);},150);window.addEventListener('aoqatModulesReady',move);document.addEventListener('prayerPreviewDateChanged',move);window.addEventListener('storage',e=>{if(e.key===KEY)paint();});}
  window.aoqatMoveNotificationSettings=move;
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();

;

/* js/fasting-reminders-core.js */
(function(root){'use strict';
 const defaults=()=>({enabled:true,time:'20:00'});
 function normalize(raw){return {enabled:raw?.enabled!==false,time:/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(raw?.time)?raw.time:'20:00'};}
 function dateParts(now){const p=Object.fromEntries(new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Baghdad',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now).map(x=>[x.type,x.value]));const key=p.year+'-'+p.month+'-'+p.day;return {key,start:+new Date(key+'T00:00:00+03:00')};}
 function target(now){const d=dateParts(now),day=new Date(d.start+86400000+43200000),h=Object.fromEntries(new Intl.DateTimeFormat('en-US-u-ca-islamic-umalqura',{timeZone:'Asia/Baghdad',year:'numeric',month:'numeric',day:'numeric'}).formatToParts(day).map(x=>[x.type,x.value]));return {key:dateParts(day).key,weekday:new Date(dateParts(day).key+'T00:00:00Z').getUTCDay(),month:+h.month,day:+h.day};}
 function reasons(d){if(d.month===9||(d.month===10&&d.day===1)||(d.month===12&&d.day>=10&&d.day<=13))return [];
 const out=[];const add=(id,label)=>out.push({id,label});
 if(d.month===12&&d.day===1)add('dhul-hijjah','صيام التسعة الأولى من ذي الحجة');
 if(d.month===12&&d.day===9)add('arafah','صيام يوم عرفة لغير الحاج');
 if(d.month===1&&(d.day===9||d.day===10))add('ashura',d.day===9?'صيام تاسوعاء مع عاشوراء':'صيام عاشوراء');
 if([13,14,15].includes(d.day))add('white-days','صيام الأيام البيض');
 if(d.weekday===1||d.weekday===4)add('monday-thursday',d.weekday===1?'صيام الاثنين':'صيام الخميس');
 if(d.month===10&&d.day===2)add('shawwal','التذكير بستة أيام من شوال؛ اختر أيامك المناسبة');
 if(d.month===1&&d.day===1)add('muharram','التذكير بالإكثار من الصيام في محرم');
 return out;}
 function event(now,raw){const s=normalize(raw);if(!s.enabled)return null;const d=dateParts(now),tomorrow=target(now),items=reasons(tomorrow);if(!items.length)return null;const [h,m]=s.time.split(':').map(Number);return {kind:'fasting',key:'fasting:'+tomorrow.key,at:d.start+(h*60+m)*60000,title:'تذكير بصيام التطوع',body:'تذكير للغد: '+items.map(x=>x.label).join('، ')+'.\nحسب التقويم الهجري في التطبيق (أم القرى)؛ تُراعى رؤية الهلال المحلية.',section:'fasting',topicId:items[0].id};}
 const api={defaults,normalize,dateParts,target,reasons,event};root.AoqatFastingRemindersCore=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window==='undefined'?globalThis:window);
;

/* js/fasting-reminders.js */
(function(){'use strict';
 
 const C=window.AoqatFastingRemindersCore,KEY='aoqatFastingRemindersV1',SENT='aoqatFastingRemindersSentV1';if(!C)return;
 function read(){try{return C.normalize(JSON.parse(localStorage.getItem(KEY)||'{}'));}catch(_){return C.defaults();}}
 function save(s){try{localStorage.setItem(KEY,JSON.stringify(s));}catch(_){}}
 async function permission(){if(window.AndroidNative?.communityReminderPermissions){window.AndroidNative.communityReminderPermissions();return;}if(typeof Notification!=='undefined'&&Notification.permission==='default')try{await Notification.requestPermission();}catch(_){}}
 function createControls(){const box=document.createElement('section');box.id='fastingReminderControls';
 box.innerHTML='<button type="button" id="fastingReminderToggle" class="main-action" aria-pressed="true"></button><label>وقت التذكير في الليلة السابقة (بتوقيت العراق)<input id="fastingReminderTime" type="time" step="60"></label><p>يشمل الاثنين والخميس، والأيام البيض، وعرفة لغير الحاج، وتاسوعاء وعاشوراء، وتذكيراً ببداية محرم وست شوال. صيام داود يحتاج خطة شخصية ولا يُحدّد تلقائياً.</p><p>التذكير الساعة 8 مساءً افتراضياً لليوم التالي. يعمل دون إنترنت وبالخلفية بعد منح أذونات الهاتف.</p><button type="button" id="fastingReminderPermission">السماح بإشعارات الهاتف</button>';
 const toggle=box.querySelector('#fastingReminderToggle'),time=box.querySelector('input');
 function draw(){const s=read();toggle.setAttribute('aria-pressed',String(s.enabled));toggle.textContent='🔔 تذكيرات صيام التطوع: '+(s.enabled?'تشغيل':'إيقاف');time.value=s.time;time.disabled=!s.enabled;}
 toggle.onclick=()=>{const s=read();s.enabled=!s.enabled;save(s);draw();if(s.enabled)permission();};
 time.onchange=()=>{const s=read();const next=C.normalize({enabled:s.enabled,time:time.value});save(next);draw();};
 box.querySelector('#fastingReminderPermission').onclick=permission;draw();return box;}
 async function notify(e){const entry=window.AoqatReminderInbox?.add(e);const banner=document.createElement('aside');document.getElementById('fastingReminderBanner')?.remove();banner.id='fastingReminderBanner';banner.setAttribute('role','alert');const title=document.createElement('strong'),text=document.createElement('p'),open=document.createElement('button'),close=document.createElement('button');title.textContent=e.title;text.textContent=e.body;open.textContent='عرض التذكير والشرح';open.onclick=()=>{if(entry)window.aoqatOpenNotification?.(entry.id);banner.remove();};close.textContent='إغلاق';close.onclick=()=>banner.remove();banner.append(title,text,open,close);document.body.append(banner);
 if(typeof Notification==='undefined'||Notification.permission!=='granted')return;
 const options={body:e.body,tag:e.key,icon:'/assets/icons/app-icon.svg',data:{kind:'fasting-reminder',id:entry?.id,entry,url:'/?reminder='+encodeURIComponent(entry?.id||'')}};
 try{const reg=await navigator.serviceWorker?.getRegistration();if(reg)await reg.showNotification(e.title,options);else{const n=new Notification(e.title,options);n.onclick=()=>{window.focus();if(entry)window.aoqatOpenNotification?.(entry.id);n.close();};}}catch(_){}}
 function tick(now=new Date()){if(window.AndroidNative?.configureAdhan)return;const e=C.event(now,read());if(!e||+now<e.at||+now-e.at>120000)return;let sent;try{sent=JSON.parse(localStorage.getItem(SENT)||'{}');}catch(_){sent={};}if(!sent||Array.isArray(sent)||typeof sent!=='object')sent={};if(sent[e.key])return;sent[e.key]=+now;for(const k of Object.keys(sent))if(+now-sent[k]>15*86400000)delete sent[k];try{localStorage.setItem(SENT,JSON.stringify(sent));}catch(_){}notify(e);}
 const style=document.createElement('style');style.textContent='#fastingReminderControls{padding:12px;border:1px solid var(--wt-border,#d9c8a8);border-radius:10px}body.design-menu-open #webDrawerSub #fastingReminderControls #fastingReminderToggle{width:100%;background:#7f9191!important;background-image:none!important;color:#fff!important}body.design-menu-open #webDrawerSub #fastingReminderControls #fastingReminderToggle[aria-pressed="true"]{background:#12854c!important;background-image:none!important}#fastingReminderControls label{display:flex;flex-wrap:wrap;gap:10px;align-items:center;margin-top:12px}#fastingReminderControls p{font-size:14px}#fastingReminderBanner{position:fixed;inset:auto 12px 24px;z-index:2147483000;background:#fffaf0;color:#182c34;border:1px solid #ccb15a;border-radius:14px;padding:16px;direction:rtl;box-shadow:0 6px 24px #0004}#fastingReminderBanner p{white-space:pre-line;line-height:1.8}#fastingReminderBanner button{margin:5px;padding:8px}';document.head.append(style);
 window.AoqatFastingReminders={read,tick,createControls};setInterval(()=>tick(),1000);document.addEventListener('visibilitychange',()=>{if(!document.hidden)tick();});tick();
})();
;

/* js/fasting-posts-calendar.js */
(function(root){'use strict';
 const DAY=86400000,names=['محرم','صفر','ربيع الأول','ربيع الآخر','جمادى الأولى','جمادى الآخرة','رجب','شعبان','رمضان','شوال','ذو القعدة','ذو الحجة'];
 function key(date){return root.AoqatFridayRemindersCore.dateParts(date).key;}
 function baseline(date){const p=Object.fromEntries(new Intl.DateTimeFormat('en-US-u-ca-islamic-umalqura',{timeZone:'Asia/Baghdad',year:'numeric',month:'numeric',day:'numeric'}).formatToParts(date).map(x=>[x.type,x.value]));return {year:+p.year,month:+p.month,day:+p.day};}
 const calendar={DAY,key,baseline};
 const idList=['monday','thursday','white-days','tasua','ashura','shawwal','dhul-hijjah','arafah'];
 function date(date){const C=calendar,k=C.key(date),h=C.baseline(date);return {...h,key:k,weekday:new Date(k+'T12:00:00Z').getUTCDay()};}
 function allowed(h){return h.month!==9&&!(h.month===10&&h.day===1)&&!(h.month===12&&h.day>=10&&h.day<=13);}
 function candidates(now=new Date()){
  const C=calendar,k=C.key(now),mid=Date.parse(k+'T12:00:00+03:00'),today=date(new Date(mid)),tomorrow=date(new Date(mid+C.DAY)),out=[];
  const add=(id,target,label)=>{if(!out.some(x=>x.id===id))out.push({id,topicId:id,targetDate:target,title:label});};
  if(allowed(tomorrow)){
   if(tomorrow.weekday===1)add('monday',tomorrow.key,'صيام يوم الاثنين');
   if(tomorrow.weekday===4)add('thursday',tomorrow.key,'صيام يوم الخميس');
   if(today.day>=12&&today.day<=14&&today.month!==9&&!(today.month===12&&today.day===12)){
    add('white-days',tomorrow.key,'صيام الأيام البيض');
   }
   if(tomorrow.month===1&&tomorrow.day===9)add('tasua',tomorrow.key,'صيام تاسوعاء');
   if(tomorrow.month===1&&tomorrow.day===10)add('ashura',tomorrow.key,'صيام عاشوراء');
   if(tomorrow.month===12&&tomorrow.day===9)add('arafah',tomorrow.key,'صيام يوم عرفة');
   if(tomorrow.month===12&&tomorrow.day===1)add('dhul-hijjah',tomorrow.key,'صيام التسعة الأولى من ذي الحجة');
   if(tomorrow.month===10&&tomorrow.day===2)add('shawwal',tomorrow.key,'ستة أيام من شوال');
  }
  // At the beginning of Shawwal the poster prepares for fasting after Eid, never on Eid.
  if((tomorrow.month===10&&tomorrow.day===1)||(today.month===10&&today.day===1)){
   const target=new Date(mid+(tomorrow.month===10&&tomorrow.day===1?2:1)*C.DAY);add('shawwal',C.key(target),'ستة أيام من شوال');
  }
  return out;
 }
 function topic(id){
  const base=root.AoqatMuslimBag?.topics||[],find=(name)=>base.find(x=>x.id===name);
  if(id==='monday'||id==='thursday')return {...find('monday-thursday'),id,title:id==='monday'?'صيام يوم الاثنين':'صيام يوم الخميس',text:(id==='monday'?'يُستحب صيام يوم الاثنين. ':'يُستحب صيام يوم الخميس. ')+'تُعرض الأعمال يومي الاثنين والخميس، وكان النبي ﷺ يحب أن يُعرض عمله وهو صائم.'};
  if(id==='tasua')return {...find('ashura'),id,title:'صيام تاسوعاء مع عاشوراء'};
  if(id==='dhul-hijjah')return {id,title:'صيام التسعة الأولى من ذي الحجة',text:'يُستحب الصيام في الأيام التسعة الأولى من ذي الحجة، وآكدها يوم عرفة لغير الحاج. أمّا اليوم العاشر فهو عيد الأضحى ولا يجوز صيامه.',ref:'سنن أبي داود 2437؛ صحيح البخاري 1990',url:'https://sunnah.com/abudawud:2437'};
  return find(id);
 }
 function selectedTopics(raw,version2=false){if(!Array.isArray(raw))return [...idList];const ids=new Set(raw);if(!version2&&ids.has('monday-thursday')){ids.add('monday');ids.add('thursday');}if(!version2&&ids.has('ashura'))ids.add('tasua');if(!version2&&['monday-thursday','white-days','arafah','ashura','shawwal','muharram'].every(x=>ids.has(x)))ids.add('dhul-hijjah');return idList.filter(x=>ids.has(x));}
 const api={DAY,key,baseline,names,idList,date,allowed,candidates,topic,selectedTopics};root.AoqatFastingPostsCalendar=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window==='undefined'?globalThis:window);

;

/* js/community-posts-core.js */
(function(root){'use strict';
  const topicIds=['monday','thursday','white-days','tasua','ashura','shawwal','dhul-hijjah','arafah'];
  const defaults=()=>({enabled:false,mode:'after',delay:20,time:'18:00',design:'weekly',topics:[...topicIds],topicSchema:2,color:'0',layoutSchema:1});
  function normalize(raw={}){
    const s=defaults();s.enabled=raw?.enabled===true;
    if(raw?.mode==='clock')s.mode='clock';
    if(Number.isInteger(raw?.delay)&&raw.delay>=1&&raw.delay<=120)s.delay=raw.delay;
    if(/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(raw?.time))s.time=raw.time;
    if(['weekly','0','1','2','3','4','5'].includes(String(raw?.design)))s.design=String(raw.design);
    if(Array.isArray(raw?.topics))s.topics=root.AoqatFastingPostsCalendar.selectedTopics(raw.topics,raw.topicSchema===2);
    if(/^[0-5]$/.test(String(raw?.color)))s.color=String(raw.color);
    return s;
  }
  function themeIndex(date,design='weekly'){
    if(design!=='weekly')return Number(normalize({design}).design)||0;
    const key=root.AoqatFridayRemindersCore.dateParts(date).key;
    return ((Math.floor((Date.parse(key+'T00:00:00Z')/86400000)/7)%6)+6)%6;
  }
  function schedule(now,raw,row){
    const C=root.AoqatFridayRemindersCore,s=normalize(raw),d=C.dateParts(now);
    if(!row||+row.gregorian_month!==d.month||+row.gregorian_day!==d.day)return null;
    const maghrib=C.prayerMinutes(row.maghrib,'maghrib'),isha=C.prayerMinutes(row.isha,'maghrib');
    if(maghrib===null||isha===null||isha<=maghrib)return null;
    const time=s.mode==='clock'?C.clock(s.time):maghrib+s.delay;
    if(time===null||time<=maghrib||time>=isha)return null;
    return d.start+time*60000;
  }
  function events(now,settings,row){
    const C=root.AoqatFridayRemindersCore,d=C.dateParts(now),out=[];
    for(const kind of ['friday','fasting']){
      const s=normalize(settings?.[kind]);if(!s.enabled)continue;
      const at=schedule(now,s,row);if(at===null)continue;
      const choices=kind==='friday'?(d.weekday===4?[{topicId:'',targetDate:''}]:[]):root.AoqatFastingPostsCalendar.candidates(now).filter(x=>s.topics.includes(x.id));
      for(const item of choices)out.push({kind:'community-post',key:'publish:'+kind+':'+(item.topicId||'friday')+':'+d.key,at,section:kind,topicId:item.topicId,targetDate:item.targetDate,action:'post',
        title:kind==='friday'?'حان وقت نشر بوست سنن الجمعة':'حان وقت نشر بوست '+item.title,
        body:kind==='friday'?'جهّز بوست سنن الجمعة وشاركه قبل أذان العشاء.':'جهّز بوست التذكير بالصيام وشاركه قبل أذان العشاء.'});
    }
    return out;
  }
  const api={topicIds,defaults,normalize,themeIndex,schedule,events};root.AoqatCommunityPostsCore=api;
  if(typeof module!=='undefined')module.exports=api;
})(typeof window==='undefined'?globalThis:window);


;

/* js/community-posts-renderer.js */
(function(){'use strict';
  
  const palettes=[
    {name:'أخضر وذهبي',bg:'#f6f2e6',card:'#fffdf7',ink:'#173f35',accent:'#b38a40'},
    {name:'ليلة كحلية',bg:'#101f32',card:'#1b3048',ink:'#fff9e9',accent:'#e4bf72'},
    {name:'أبيض وأزرق',bg:'#edf5fa',card:'#ffffff',ink:'#153b59',accent:'#32829d'},
    {name:'بنفسجي هادئ',bg:'#f4edf4',card:'#fffaff',ink:'#4e3058',accent:'#a87476'},
    {name:'زيتوني ورملي',bg:'#ede9da',card:'#fbf8ee',ink:'#3f4b31',accent:'#9e753c'},
    {name:'فيروزي',bg:'#e9f4f0',card:'#fcfffc',ink:'#154b4a',accent:'#358b79'}
  ];
  let fontPromise;
  async function font(){
    if(!fontPromise)fontPromise=(async()=>{
      const face=new FontFace('AoqatSocial','url("assets/fonts/amiri-quran.ttf")');
      await face.load();document.fonts.add(face);await document.fonts.ready;
    })().catch(error=>{fontPromise=null;throw error;});
    return fontPromise;
  }
  function lines(ctx,text,width){
    const out=[];let row='';
    for(const word of String(text).split(/\s+/)){const next=row?row+' '+word:word;if(row&&ctx.measureText(next).width>width){out.push(row);row=word;}else row=next;}
    if(row)out.push(row);return out;
  }
  function fit(ctx,text,width,size,maxLines){
    let rows;do{ctx.font=size+'px AoqatSocial';rows=lines(ctx,text,width);if(rows.length<=maxLines)break;size-=1;}while(size>20);
    return {rows,size};
  }
  function rounded(ctx,x,y,w,h,r){ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fill();}
  function text(ctx,value,x,y,size,color,align='right'){
    ctx.font=size+'px AoqatSocial';ctx.fillStyle=color;ctx.textAlign=align;ctx.fillText(value,x,y);
  }
  function card(ctx,p,index,y,height,body,ref,width=830){
    ctx.fillStyle=p.card;rounded(ctx,58,y,964,height,14+index%3*10);
    ctx.fillStyle=p.accent;rounded(ctx,985,y+18,6,height-36,3);
    text(ctx,String(index+1).padStart(2,'0'),104,y+44,26,p.accent,'center');
    const f=fit(ctx,body,width,33,2);ctx.font=f.size+'px AoqatSocial';ctx.fillStyle=p.ink;ctx.textAlign='right';
    f.rows.forEach((line,i)=>ctx.fillText(line,956,y+34+i*37));
    text(ctx,ref,956,y+height-11,19,p.ink);
  }
  const fridayRows=[
    ['الإكثار من الصلاة على النبي ﷺ.','أبو داود 1047'],
    ['قراءة سورة الكهف يوم الجمعة.','فتوى ابن باز: وقت قراءة سورة الكهف'],
    ['الاغتسال، واستعمال السواك والتطيّب لصلاة الجمعة.','مسلم 846'],
    ['لبس الثياب الحسنة والنظيفة.','أبو داود 1078'],
    ['التبكير إلى المسجد لصلاة الجمعة.','البخاري 881'],
    ['الصلاة مما تيسّر قبل الخطبة، وعدم إيذاء المصلّين.','البخاري 883'],
    ['الإنصات والاستماع للخطبة.','البخاري 883'],
    ['الصلاة بعد الجمعة أربع ركعات، أو ركعتين في البيت.','مسلم 881؛ البخاري 937'],
    ['الإكثار من الدعاء وتحرّي ساعة الإجابة.','البخاري 935؛ مسلم 852']
  ];
  function dateLabel(key){
    const date=new Date(key+'T12:00:00+03:00'),h=window.AoqatFastingPostsCalendar.date(date);return new Intl.DateTimeFormat('ar-IQ',{timeZone:'Asia/Baghdad',weekday:'long'}).format(date)+' '+h.day+' '+window.AoqatFastingPostsCalendar.names[h.month-1]+' '+h.year+' هـ';
  }
  const layouts=['بطاقات متتابعة','مسار مرقّم','بطاقات متقابلة','مجموعات متناسقة','بطاقات متدرجة','ترتيب تحريري'];
  function paragraph(ctx,value,x,y,width,size,maxLines,color,align='right',step=1.25){
    const f=fit(ctx,value,width,size,maxLines);f.rows.forEach((line,i)=>text(ctx,line,x,y+i*f.size*step,f.size,color,align));return f.rows.length*f.size*step;
  }
  function bodyArea(ctx,value,x,top,width,height,size,color,align='right'){
    let f=fit(ctx,value,width,size,20);while(f.rows.length*f.size*1.4>height&&size>20)f=fit(ctx,value,width,--size,20);
    const leading=f.size*1.4,start=top+(height-f.rows.length*leading)/2+f.size;
    f.rows.forEach((line,i)=>text(ctx,line,x,start+i*leading,f.size,color,align));
  }
  function fridayLayout(ctx,p,index){
    fridayRows.forEach((row,i)=>{
      if(index===0){card(ctx,p,i,194+i*104,94,row[0],row[1]);return;}
      if(index===1){
        const y=194+i*104;ctx.strokeStyle=p.accent;ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(1010,y);ctx.lineTo(1010,y+104);ctx.stroke();
        ctx.fillStyle=p.card;rounded(ctx,58,y,900,94,12);ctx.fillStyle=p.accent;ctx.beginPath();ctx.arc(1010,y+43,25,0,Math.PI*2);ctx.fill();text(ctx,String(i+1),1010,y+52,26,p.bg,'center');
        paragraph(ctx,row[0],928,y+34,830,33,2,p.ink);text(ctx,row[1],928,y+83,19,p.ink);return;
      }
      if(index===2){
        const last=i===8,x=last?58:(i%2===0?550:58),w=last?964:472,y=194+Math.floor(i/2)*184;
        ctx.fillStyle=p.card;rounded(ctx,x,y,w,172,20);text(ctx,String(i+1).padStart(2,'0'),x+w-26,y+31,25,p.accent);
        paragraph(ctx,row[0],x+w-26,y+68,w-52,31,3,p.ink,'right',1.12);text(ctx,row[1],x+w-26,y+157,18,p.ink);return;
      }
      if(index===3){
        const group=Math.floor(i/3),n=i%3,top=194+group*310;
        if(n===0){ctx.fillStyle=p.card;rounded(ctx,58,top,964,296,24);ctx.strokeStyle=p.accent;ctx.lineWidth=3;ctx.strokeRect(74,top+12,932,272);}
        const y=top+22+n*88;text(ctx,String(i+1)+' ·',978,y+29,28,p.accent);paragraph(ctx,row[0],914,y+27,800,30,2,p.ink,'right',1.1);text(ctx,row[1],914,y+70,18,p.ink);return;
      }
      if(index===4){
        const x=i%2?58:118,y=194+i*104;ctx.fillStyle=p.card;rounded(ctx,x,y,904,94,32);
        text(ctx,String(i+1),x+39,y+53,30,p.accent,'center');paragraph(ctx,row[0],x+872,y+33,790,32,2,p.ink);text(ctx,row[1],x+872,y+83,19,p.ink);return;
      }
      const y=194+i*104;ctx.strokeStyle=p.accent;ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(58,y+94);ctx.lineTo(1022,y+94);ctx.stroke();
      ctx.fillStyle=p.accent;rounded(ctx,970,y+15,52,57,4);text(ctx,String(i+1),996,y+53,29,p.bg,'center');paragraph(ctx,row[0],940,y+33,860,33,2,p.ink);text(ctx,row[1],940,y+83,19,p.ink);
    });
  }
  function fastingLayout(ctx,p,index,item,targetDate){
    const dated=targetDate?'تذكير ليوم '+dateLabel(targetDate):'';
    if(index===0){
      paragraph(ctx,item.title,540,214,900,52,2,p.accent,'center');ctx.fillStyle=p.card;rounded(ctx,64,340,952,650,28);
      bodyArea(ctx,item.text,950,410,820,450,48,p.ink);
      paragraph(ctx,item.ref,540,950,850,26,2,p.ink,'center');paragraph(ctx,dated,540,1094,940,32,2,p.accent,'center');return;
    }
    if(index===1){
      ctx.fillStyle=p.card;rounded(ctx,64,218,952,880,10);ctx.strokeStyle=p.accent;ctx.lineWidth=3;ctx.strokeRect(82,236,916,844);
      paragraph(ctx,item.title,540,310,820,54,2,p.accent,'center');paragraph(ctx,dated,540,430,820,30,2,p.ink,'center');
      bodyArea(ctx,item.text,930,510,780,430,47,p.ink);paragraph(ctx,item.ref,540,1045,820,25,2,p.accent,'center');return;
    }
    if(index===2){
      ctx.fillStyle=p.accent;rounded(ctx,58,218,964,154,24);paragraph(ctx,item.title,540,281,870,51,2,p.bg,'center');
      text(ctx,'❝',957,480,90,p.accent);bodyArea(ctx,item.text,940,495,810,405,49,p.ink);
      ctx.fillStyle=p.card;rounded(ctx,58,956,964,156,18);paragraph(ctx,item.ref,540,1007,870,26,2,p.ink,'center');paragraph(ctx,dated,540,1076,900,30,2,p.accent,'center');return;
    }
    if(index===3){
      paragraph(ctx,item.title,540,245,900,54,2,p.accent,'center');ctx.fillStyle=p.card;rounded(ctx,58,380,964,500,24);
      bodyArea(ctx,item.text,948,420,820,410,47,p.ink);
      ctx.fillStyle=p.card;rounded(ctx,58,910,964,192,24);paragraph(ctx,dated,540,970,880,32,2,p.accent,'center');paragraph(ctx,item.ref,540,1050,880,26,2,p.ink,'center');return;
    }
    if(index===4){
      ctx.fillStyle=p.card;rounded(ctx,100,218,880,200,95);paragraph(ctx,item.title,540,294,780,51,2,p.accent,'center');
      ctx.strokeStyle=p.accent;ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(140,475);ctx.lineTo(940,475);ctx.moveTo(140,910);ctx.lineTo(940,910);ctx.stroke();
      bodyArea(ctx,item.text,540,505,800,375,48,p.ink,'center');paragraph(ctx,item.ref,540,990,880,26,2,p.ink,'center');paragraph(ctx,dated,540,1090,930,31,2,p.accent,'center');return;
    }
    ctx.fillStyle=p.ink;rounded(ctx,58,218,964,222,12);paragraph(ctx,item.title,540,298,850,52,2,p.bg,'center');
    ctx.fillStyle=p.card;rounded(ctx,58,466,964,500,12);bodyArea(ctx,item.text,947,510,814,410,48,p.ink);
    paragraph(ctx,item.ref,540,1020,880,26,2,p.ink,'center');paragraph(ctx,dated,540,1100,930,31,2,p.accent,'center');
  }
  async function render(kind,topicId,now=new Date(),design='weekly',targetDate='',color='0'){
    await font();const index=window.AoqatCommunityPostsCore.themeIndex(now,design),p=palettes[Number(color)]||palettes[0],canvas=document.createElement('canvas');canvas.width=1080;canvas.height=1350;
    const ctx=canvas.getContext('2d');ctx.direction='rtl';ctx.fillStyle=p.bg;ctx.fillRect(0,0,1080,1350);
    ctx.strokeStyle=p.accent;ctx.lineWidth=2;ctx.strokeRect(24,24,1032,1302);
    text(ctx,'أوقات الصلاة في الحويجة',540,63,25,p.ink,'center');
    text(ctx,kind==='friday'?'سنن يوم الجمعة وآدابها':'صيام التطوع',540,132,64,p.ink,'center');
    if(kind==='friday'){
      text(ctx,'تذكير نافع ليوم الجمعة',540,171,29,p.accent,'center');fridayLayout(ctx,p,index);
      text(ctx,'خلاصة للسنن والآداب؛ التفاصيل والأدلة داخل حقيبة المسلم.',540,1183,27,p.ink,'center');
      text(ctx,'الغسل والإنصات من الآداب المؤكدة؛ ليست كل البنود نوافل.',540,1224,24,p.ink,'center');
    }else{
      const item=window.AoqatFastingPostsCalendar.topic(topicId);if(!item)throw Error('No fasting occasion selected');
      fastingLayout(ctx,p,index,item,targetDate);
      text(ctx,'لا صيام في العيدين أو أيام التشريق تطوعاً.',540,1175,28,p.ink,'center');
      text(ctx,'البخاري 1990؛ مسلم 1141 • يُراعى ثبوت الهلال محلياً.',540,1219,24,p.ink,'center');
    }
    ctx.fillStyle=p.accent;ctx.fillRect(340,1252,400,2);
    text(ctx,'aoqat.vercel.app',540,1295,26,p.ink,'center');
    return {canvas,index,palette:p.name,layout:layouts[index],color:String(palettes.indexOf(p))};
  }
  window.AoqatPostRenderer={render,palettes,layouts};
})();


;

/* js/community-posts.js */
(function(){'use strict';
  
  const C=window.AoqatCommunityPostsCore,KEY='aoqatCommunityPostsV1',SENT='aoqatCommunityPostsSentV1';
  if(!C)return;
  function read(){
    let raw;try{raw=JSON.parse(localStorage.getItem(KEY)||'{}');}catch(_){raw={};}if(!raw||typeof raw!=='object'||Array.isArray(raw))raw={};
    let changed=false;for(const kind of ['friday','fasting'])if(raw[kind]?.layoutSchema!==1){
      const old=raw[kind]||{};raw[kind]={...old,color:String(C.themeIndex(new Date(),old.design)),design:'weekly',layoutSchema:1};changed=true;
    }
    const all={friday:C.normalize(raw.friday),fasting:C.normalize(raw.fasting)};
    if(changed)try{localStorage.setItem(KEY,JSON.stringify(all));}catch(_){}return all;
  }
  function save(kind,next){const all=read();all[kind]=C.normalize(next);try{localStorage.setItem(KEY,JSON.stringify(all));}catch(_){}return all[kind];}
  function button(label){const b=document.createElement('button');b.type='button';b.className='main-action';b.textContent=label;return b;}
  function label(title,input){const l=document.createElement('label');l.append(document.createTextNode(title),input);return l;}
  function designSelect(value){const input=document.createElement('select');for(const [id,name] of [['weekly','يتبدّل تلقائياً كل أسبوع'],...window.AoqatPostRenderer.layouts.map((name,i)=>[String(i),name])]){const o=new Option(name,id);input.append(o);}input.value=value;return input;}
  function colorSelect(value){const input=document.createElement('select');window.AoqatPostRenderer.palettes.forEach((p,i)=>input.append(new Option(p.name,String(i))));input.value=value;return input;}
  function row(now){const d=window.AoqatFridayRemindersCore.dateParts(now);return typeof cachedAnnualPrayer==='function'?cachedAnnualPrayer(d.month,d.day):null;}
  async function permission(){if(window.AndroidNative?.communityReminderPermissions){window.AndroidNative.communityReminderPermissions();return;}if(typeof Notification!=='undefined'&&Notification.permission==='default')try{await Notification.requestPermission();}catch(_){}}
  function mount(kind,host){
    if(!host||host.querySelector('#communityPostControls-'+kind))return;
    const box=document.createElement('section');box.id='communityPostControls-'+kind;box.className='community-post-controls';box.dataset.postControls=kind;box.dir='rtl';
    const title=document.createElement('h4');title.textContent=kind==='friday'?'نشر بوست سنن الجمعة':'نشر بوست صيام التطوع';
    const open=button('↗ '+title.textContent);open.dataset.openCommunityPost=kind;open.onclick=()=>window.aoqatOpenCommunityPost?.(kind);
    const toggle=button('');toggle.dataset.postReminder=kind;toggle.setAttribute('aria-controls','postReminderSettings-'+kind);
    const body=document.createElement('div');body.id='postReminderSettings-'+kind;
    const mode=document.createElement('select');mode.dataset.postMode=kind;mode.append(new Option('بعد المغرب بعدد دقائق','after'),new Option('وقت أحدده بين المغرب والعشاء','clock'));
    const delay=document.createElement('input');delay.type='number';delay.min='1';delay.max='120';delay.step='1';delay.dataset.postDelay=kind;
    const time=document.createElement('input');time.type='time';time.step='60';time.dataset.postTime=kind;
    const delayLabel=label('بعد أذان المغرب (دقيقة)',delay),timeLabel=label('وقت التنبيه بتوقيت العراق',time);
    const status=document.createElement('p');status.className='post-status';status.setAttribute('role','status');
    const days=document.createElement('fieldset');days.className='post-topic-options';
    if(kind==='fasting'){
      const legend=document.createElement('legend');legend.textContent='ذكّرني بالنشر قبل هذه الأيام';days.append(legend);
      for(const item of window.AoqatFastingPostsCalendar.idList.map(id=>window.AoqatFastingPostsCalendar.topic(id)).filter(Boolean)){
        const input=document.createElement('input');input.type='checkbox';input.dataset.postTopic=item.id;
        input.onchange=()=>{const s=read()[kind];s.topics=[...days.querySelectorAll('input:checked')].map(x=>x.dataset.postTopic);save(kind,s);draw();};days.append(label(item.title,input));
      }
      const note=document.createElement('p');note.textContent='كل مناسبة لها بوست مستقل في موعدها، بحسب التاريخ الهجري المعتمد في التطبيق.';days.append(note);
    }
    const permissionButton=button('السماح بإشعارات الهاتف');permissionButton.onclick=permission;
    body.append(label('طريقة تحديد موعد النشر',mode),delayLabel,timeLabel);if(kind==='fasting')body.append(days);body.append(status,permissionButton);
    const design=designSelect(read()[kind].design);design.dataset.postDesign=kind;
    const color=colorSelect(read()[kind].color);color.dataset.postColor=kind;
    const note=document.createElement('p');note.textContent='النشر يتم باختيارك عبر تطبيقات الهاتف، وليس تلقائياً. تنبيه النشر منفصل عن تذكيرات العبادة، ويعمل دون إنترنت وبالخلفية بعد منح أذونات الهاتف.';
    box.append(title,open,label('ترتيب البوست',design),label('لون البوست',color),toggle,body,note);host.append(box);
    function draw(){
      const s=read()[kind];if(kind==='fasting'){const available=window.AoqatFastingPostsCalendar.candidates(new Date()).filter(x=>s.topics.includes(x.id));open.disabled=!available.length;open.textContent=available.length?'↗ نشر بوست صيام التطوع':'لا يوجد بوست صيام مجدول للنشر اليوم';}toggle.textContent='🔔 تنبيه نشر البوست: '+(s.enabled?'تشغيل':'إيقاف');toggle.setAttribute('aria-pressed',String(s.enabled));toggle.setAttribute('aria-expanded',String(s.enabled));body.hidden=!s.enabled;
      mode.value=s.mode;delay.value=s.delay;time.value=s.time;delayLabel.hidden=s.mode!=='after';timeLabel.hidden=s.mode!=='clock';design.value=s.design;color.value=s.color;
      days.querySelectorAll('input').forEach(i=>i.checked=s.topics.includes(i.dataset.postTopic));
      const now=new Date(),at=C.schedule(now,s,row(now));
      status.textContent=at===null?'الموعد المحدد خارج الفترة بين المغرب والعشاء، أو مواقيت اليوم غير متوفرة؛ لن يُرسل تنبيه خارج هذه الفترة.':
        'موعد التنبيه حسب مواقيت اليوم: '+new Intl.DateTimeFormat('ar-IQ',{timeZone:'Asia/Baghdad',hour:'numeric',minute:'2-digit'}).format(new Date(at))+
        (kind==='friday'?' يوم الخميس فقط.':' في الليلة السابقة للأيام المحددة. لا يحدد لك ستة أيام بعينها من شوال؛ يذكّرك ببدايتها.');
      if(kind==='fasting'&&!s.topics.length)status.textContent+=' لم تُحدد أي أيام للتذكير.';
    }
    toggle.onclick=()=>{const s=read()[kind];s.enabled=!s.enabled;save(kind,s);draw();if(s.enabled)permission();};
    mode.onchange=()=>{const s=read()[kind];s.mode=mode.value;save(kind,s);draw();};
    delay.onchange=()=>{const n=Number(delay.value);if(!Number.isInteger(n)||n<1||n>120){delay.setCustomValidity('اختر من 1 إلى 120 دقيقة.');delay.reportValidity();return;}delay.setCustomValidity('');const s=read()[kind];s.delay=n;save(kind,s);draw();};
    time.onchange=()=>{if(!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(time.value))return;const s=read()[kind];s.time=time.value;save(kind,s);draw();};
    design.onchange=()=>{const s=read()[kind];s.design=design.value;save(kind,s);draw();};
    color.onchange=()=>{const s=read()[kind];s.color=color.value;save(kind,s);draw();};
    box.aoqatRefresh=draw;draw();
  }
  function createShareView(kind,initialTopic='',initialDate=''){
    const panel=document.createElement('section');panel.id='communityPostView';panel.className='community-post-share';panel.dir='rtl';
    const preview=document.createElement('img');preview.id='communityPostPreview';preview.alt=kind==='friday'?'بوست سنن يوم الجمعة وآدابها':'بوست صيام التطوع';preview.hidden=true;
    const design=designSelect(read()[kind].design);design.id='communityPostDesign';
    const color=colorSelect(read()[kind].color);color.id='communityPostColor';
    const topic=document.createElement('select');topic.id='communityPostTopic';
    let choices=[];
    function options(){
      const keep=topic.value;choices=kind==='fasting'?window.AoqatFastingPostsCalendar.candidates(new Date()).filter(x=>read().fasting.topics.includes(x.id)):[];
      const today=window.AoqatFastingPostsCalendar.key(new Date());
      if(initialTopic&&initialDate>=today&&window.AoqatFastingPostsCalendar.topic(initialTopic)&&!choices.some(x=>x.id===initialTopic)){
        const remaining=Date.parse(initialDate+'T12:00:00+03:00')-Date.parse(today+'T12:00:00+03:00');
        if(remaining>=0&&remaining<=2*86400000)choices.push({id:initialTopic,topicId:initialTopic,title:window.AoqatFastingPostsCalendar.topic(initialTopic).title,targetDate:initialDate});
      }
      topic.replaceChildren();for(const item of choices)topic.append(new Option(item.title,item.id));
      topic.value=choices.some(x=>x.id===keep)?keep:choices.some(x=>x.id===initialTopic)?initialTopic:choices[0]?.id||'';
    }
    options();
    const share=button('↗ مشاركة عبر تطبيقات الهاتف'),download=button('📥 حفظ على الجهاز'),retry=button('إعادة المحاولة');
    share.id='communityPostShare';download.id='communityPostSave';retry.id='communityPostRetry';share.disabled=true;download.disabled=true;retry.hidden=true;
    const status=document.createElement('p');status.id='communityPostStatus';status.setAttribute('role','status');status.textContent='جاري تجهيز البوست…';
    panel.append(label('ترتيب البوست',design),label('لون البوست',color));if(kind==='fasting')panel.append(label('محتوى البوست',topic));panel.append(preview,share,download,retry,status);
    let file=null,url=null,disposed=false,serial=0,sharing=false;
    panel.aoqatDispose=()=>{disposed=true;serial++;if(url)URL.revokeObjectURL(url);url=null;file=null;};
    async function prepare(){
      const version=++serial;share.disabled=true;download.disabled=true;retry.hidden=true;status.textContent='جاري تجهيز البوست…';
      try{
        options();let id=topic.value,date='';
        if(kind==='fasting'){
          const item=choices.find(x=>x.id===id);
          if(!item){if(url)URL.revokeObjectURL(url);url=null;file=null;preview.removeAttribute('src');preview.hidden=true;status.textContent='لا يوجد بوست صيام متاح في هذا الموعد.';return;}
          date=item.targetDate;
        }
        const rendered=await window.AoqatPostRenderer.render(kind,id,new Date(),design.value,date,color.value);
        const blob=await new Promise(resolve=>rendered.canvas.toBlob(resolve,'image/jpeg',.96));
        if(disposed||version!==serial)return;if(!blob)throw Error('Image unavailable');
        if(url)URL.revokeObjectURL(url);
        const name='aoqat-'+kind+'-'+window.AoqatFridayRemindersCore.dateParts(new Date()).key+'.jpg';
        file=new File([blob],name,{type:'image/jpeg'});url=URL.createObjectURL(file);preview.src=url;preview.hidden=false;download.disabled=false;
        panel.dataset.postTheme=String(rendered.index);panel.dataset.postTopic=id;panel.dataset.postColor=rendered.color;
        const supported=!!window.AndroidNative?.sharePrayerImage||!!navigator.share&&!!navigator.canShare&&navigator.canShare({files:[file]});share.disabled=!supported;
        status.textContent=(design.value==='weekly'?'ترتيب هذا الأسبوع: ':'الترتيب: ')+rendered.layout+' • '+rendered.palette+'. '+(supported?'الصورة جاهزة للمشاركة والحفظ.':'مشاركة الصور غير متاحة في هذا المتصفح؛ يمكنك حفظ البوست.');
      }catch(error){if(disposed||version!==serial)return;status.textContent='تعذر تجهيز البوست. أعد المحاولة.';retry.hidden=false;}
    }
    design.onchange=()=>{const s=read()[kind];s.design=design.value;save(kind,s);prepare();};topic.onchange=prepare;color.onchange=()=>{const s=read()[kind];s.color=color.value;save(kind,s);prepare();};
    share.onclick=async()=>{
      if(!file||sharing)return;sharing=true;share.disabled=true;
      try{if(window.AndroidNative?.sharePrayerImage)await window.aoqatNativeImageAction('sharePrayerImage',file);else await navigator.share({files:[file],title:kind==='friday'?'سنن يوم الجمعة وآدابها':'صيام التطوع'});if(!disposed)status.textContent='يمكنك مشاركة البوست مرة أخرى أو حفظه على الجهاز.';}
      catch(error){if(!disposed)status.textContent=error?.name==='AbortError'?'البوست جاهز للمشاركة والحفظ.':'تعذرت المشاركة. أعد المحاولة أو احفظ البوست.';}
      finally{sharing=false;if(!disposed)share.disabled=false;}
    };
    download.onclick=async()=>{if(!file||!url)return;if(window.AndroidNative?.savePrayerImage){download.disabled=true;try{await window.aoqatNativeImageAction('savePrayerImage',file);if(!disposed)status.textContent='تم حفظ البوست على الجهاز.';}catch(_){if(!disposed)status.textContent='تعذر الحفظ. أعد المحاولة.';}finally{if(!disposed)download.disabled=false;}return;}const a=document.createElement('a');a.href=url;a.download=file.name;document.body.append(a);a.click();a.remove();status.textContent='تم طلب حفظ البوست على الجهاز.';};
    retry.onclick=prepare;panel.aoqatRefresh=prepare;Promise.resolve().then(prepare);return panel;
  }
  async function notify(event){
    const entry=window.AoqatReminderInbox?.add(event);if(!entry)return;
    document.getElementById('communityPostBanner')?.remove();const banner=document.createElement('aside');banner.id='communityPostBanner';banner.dir='rtl';banner.setAttribute('role','alert');
    const title=document.createElement('strong');title.textContent=event.title;
    const open=button('معاينة البوست ونشره');open.onclick=()=>{window.aoqatOpenCommunityPost?.(event.section,event.topicId,event.targetDate);banner.remove();};
    const close=button('إغلاق');close.onclick=()=>banner.remove();banner.append(title,open,close);document.body.append(banner);
    if(typeof Notification==='undefined'||Notification.permission!=='granted')return;
    const options={body:event.body,icon:'/assets/icons/app-icon.svg',tag:event.key,data:{kind:'community-post-reminder',id:entry.id,entry,url:'/?reminder='+encodeURIComponent(entry.id)}};
    try{const reg=await navigator.serviceWorker?.getRegistration();if(reg)await reg.showNotification(event.title,options);else{const n=new Notification(event.title,options);n.onclick=()=>{window.focus();window.aoqatOpenCommunityPost?.(event.section,event.topicId,event.targetDate);n.close();};}}catch(_){}
  }
  function tick(now=new Date()){if(window.AndroidNative?.configureAdhan)return;
    let sent;try{sent=JSON.parse(localStorage.getItem(SENT)||'{}');}catch(_){sent={};}if(!sent||typeof sent!=='object'||Array.isArray(sent))sent={};
    for(const event of C.events(now,read(),row(now))){
      const age=+now-event.at;if(age<0||age>120000||sent[event.key])continue;
      // Do not deliver a delayed alert once Isha has begun.
      const d=window.AoqatFridayRemindersCore.dateParts(now),r=row(now),isha=window.AoqatFridayRemindersCore.prayerMinutes(r?.isha,'maghrib');
      if(isha===null||+now>=d.start+isha*60000)continue;
      sent[event.key]=+now;for(const key of Object.keys(sent))if(+now-sent[key]>15*86400000)delete sent[key];
      try{localStorage.setItem(SENT,JSON.stringify(sent));}catch(_){}notify(event);
    }
  }
  const style=document.createElement('style');style.textContent=
    '.community-post-controls{direction:rtl;margin-top:20px;padding:14px;border:1px solid var(--wt-border,#d9c8a8);border-radius:12px;line-height:1.8}.community-post-controls h4{margin:0 0 12px}.community-post-controls button{width:100%;margin:8px 0}.community-post-controls label,.community-post-share label{display:flex;flex-wrap:wrap;align-items:center;gap:10px;margin:14px 0}.community-post-controls select,.community-post-share select{max-width:100%;width:100%}.community-post-controls input[type="number"],.community-post-controls input[type="time"]{width:140px}.community-post-controls p{font-size:14px!important}.community-post-controls [hidden]{display:none!important}.post-topic-options input{width:22px!important;height:22px!important}.post-topic-options label{flex-wrap:nowrap}.post-topic-options{border:1px solid var(--wt-border,#ddd);border-radius:10px;padding:10px}.community-post-share{line-height:1.8}.community-post-share>button{width:100%;margin:8px 0}.community-post-share img{display:block;max-width:100%;width:360px;height:auto;margin:12px auto;border-radius:12px}.community-post-share img[hidden]{display:none}body.design-menu-open #settingsContentDialog #webDrawerSub #webSubBody .community-post-controls [data-post-reminder]{background:#7f9191!important;background-image:none!important;color:#fff!important}body.design-menu-open #settingsContentDialog #webDrawerSub #webSubBody .community-post-controls [data-post-reminder][aria-pressed="true"]{background:#12854c!important;background-image:none!important}#communityPostBanner{position:fixed;inset:auto 12px 20px;z-index:2147483000;padding:16px;border:1px solid #ccb15a;border-radius:12px;background:#fffaf0;color:#182c34}#communityPostBanner button{margin:8px;padding:10px}';
  document.head.append(style);window.AoqatCommunityPosts={read,mount,createShareView,tick};
  let dayKey=window.AoqatFastingPostsCalendar.key(new Date());
  function refresh(){document.querySelectorAll('[data-post-controls],#communityPostView').forEach(x=>x.aoqatRefresh?.());}
  setInterval(()=>{tick();const next=window.AoqatFastingPostsCalendar.key(new Date());if(next!==dayKey){dayKey=next;refresh();}},1000);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden){tick();refresh();}});
})();


;

/* js/muslim-bag.js */
(function(){'use strict';
  const topics=[
    {id:'monday-thursday',title:'صيام الاثنين والخميس',text:'يُستحب صيام الاثنين والخميس؛ ورد أن الأعمال تُعرض فيهما، وكان النبي ﷺ يحب أن يُعرض عمله وهو صائم.',ref:'جامع الترمذي 747؛ حسن',url:'https://sunnah.com/tirmidhi:747'},
    {id:'white-days',title:'ثلاثة أيام من كل شهر — الأيام البيض',text:'يُستحب صيام ثلاثة أيام من كل شهر. ومن السنة اختيار 13 و14 و15 من الشهر الهجري. يُراعى عدم صيام 13 ذي الحجة تطوعاً لأنه من أيام التشريق؛ ويمكن إكمال الأيام الثلاثة في يوم آخر.',ref:'جامع الترمذي 761؛ صحيح البخاري 1976',url:'https://sunnah.com/tirmidhi:761'},
    {id:'arafah',title:'يوم عرفة',text:'يوم عرفة هو 9 ذي الحجة. يُستحب صيامه لغير الحاج؛ ورد في فضله تكفير السنة الماضية والسنة المقبلة.',ref:'صحيح مسلم 1162؛ وللحاج: صحيح البخاري 1988',url:'https://sunnah.com/muslim:1162b'},
    {id:'ashura',title:'عاشوراء وتاسوعاء',text:'عاشوراء هو 10 محرم، وورد أن صيامه يكفّر السنة الماضية. ويُستحب صيام 9 محرم معه؛ لقول النبي ﷺ إنه سيصوم التاسع في العام المقبل.',ref:'صحيح مسلم 1162 و1134',url:'https://sunnah.com/muslim:1134a'},
    {id:'shawwal',title:'ستة أيام من شوال',text:'يُستحب صيام ستة أيام من شوال بعد رمضان؛ ورد فضل صيام رمضان ثم إتباعه بست من شوال.',ref:'صحيح مسلم 1164',url:'https://sunnah.com/muslim:1164a'},
    {id:'muharram',title:'الإكثار من الصيام في محرم',text:'ورد أن أفضل الصيام بعد رمضان صيام شهر الله المحرم؛ فيُستحب الإكثار من الصيام فيه.',ref:'صحيح مسلم 1163',url:'https://sunnah.com/muslim:1163a'},
    {id:'dawud',title:'صيام داود عليه السلام',text:'صيام يوم وإفطار يوم؛ وصفه النبي ﷺ بأنه أفضل الصيام. وهو لمن يستطيع المحافظة عليه مع أداء واجباته.',ref:'صحيح البخاري 1976',url:'https://sunnah.com/bukhari:1976'}
    ,{id:'dhul-hijjah',title:'صيام التسعة الأولى من ذي الحجة',text:'يُستحب الصيام في الأيام التسعة الأولى من ذي الحجة، وآكدها يوم عرفة لغير الحاج. أمّا اليوم العاشر فهو عيد الأضحى ولا يجوز صيامه.',ref:'سنن أبي داود 2437؛ صحيح البخاري 1990',url:'https://sunnah.com/abudawud:2437'}
  ];
  function createFastingView(topicId){const root=document.createElement('section');root.id='muslimBagFasting';root.className='muslim-bag-content';
    const intro=document.createElement('p');intro.textContent='صيام التطوع عبادة مستحبة. افتح القسم لقراءة الشرح ومصدره.';root.appendChild(intro);
    for(const item of topics){const details=document.createElement('details');details.dataset.fastingTopic=item.id;details.open=item.id===topicId;const summary=document.createElement('summary');summary.textContent=item.title;const text=document.createElement('p');text.textContent=item.text;const source=document.createElement('a');source.textContent=item.ref+' — المصدر';source.href=item.url;source.target='_blank';source.rel='noopener noreferrer';details.append(summary,text,source);if(item.id==='arafah'||item.id==='ashura'){const extra=document.createElement('a');extra.href=item.id==='arafah'?'https://sunnah.com/bukhari:1988':'https://sunnah.com/muslim:1162b';extra.textContent=item.id==='arafah'?' — هدي النبي ﷺ بعرفة في الحج':' — فضل صيام عاشوراء';extra.target='_blank';extra.rel='noopener noreferrer';details.appendChild(extra);}root.appendChild(details);}
    const note=document.createElement('aside');note.className='ad-note';note.textContent='لا يُصام يوم عيد الفطر أو عيد الأضحى، ولا أيام التشريق تطوعاً (11 و12 و13 ذي الحجة).';
    for(const [label,url] of [['النهي عن صيام العيدين','https://sunnah.com/bukhari:1990'],['أيام التشريق','https://sunnah.com/muslim:1141a']]){const a=document.createElement('a');a.textContent=' '+label+' ';a.href=url;a.target='_blank';a.rel='noopener noreferrer';note.appendChild(a);}root.appendChild(note);if(window.AoqatFastingReminders)root.appendChild(window.AoqatFastingReminders.createControls());if(window.AoqatCommunityPosts)window.AoqatCommunityPosts.mount('fasting',root);return root;}
  const style=document.createElement('style');style.textContent='#muslimBagMenu button{display:flex;align-items:center;gap:10px;text-align:right}#muslimBagMenu button span:last-child{margin-inline-start:auto}.muslim-bag-content{direction:rtl;line-height:1.9;color:var(--wt-text,#182c34)}.muslim-bag-content details{margin:12px 0;padding:12px;border:1px solid var(--wt-border,#d9c8a8);border-radius:10px;background:var(--wt-surface,#fffaf0)}.muslim-bag-content summary{font-size:18px;font-weight:700;cursor:pointer}.muslim-bag-content p{font-size:17px;margin:12px 0}.muslim-bag-content a{color:var(--wt-accent,#137985);text-decoration:underline}.muslim-bag-content aside{padding:12px;border-radius:10px;background:var(--wt-surface2,#f8efd9)}';document.head.appendChild(style);
  window.AoqatMuslimBag={topics,createFastingView};
})();

;

/* js/web-menu-order.js */
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





;

/* js/web-menu-button-theme.js */
"use strict";
(function(){

 const roots='#settingsContentDialog,#adhanServicesDialog';
 const switches='[data-global-mode],[data-prayer][data-mode],.pa-switch,.interface-visibility-btn,#manualEditToggle,#adEnable,#autoTomorrowToggle,#tomorrowNotifyToggle,#tomorrowAlarmEnable,#iqamaNotificationToggle,button[data-enabled],[data-time-mode]';
 const skip='[data-azkar-toggle],[data-azkar-mode],[data-post-reminder],#frReminderToggle,#fastingReminderToggle,.wt-card,.color-swatch,.palette-color,[data-color],.web-drawer-row,[data-drawer],#aqReader button';
 function blend(hex,t){const n=parseInt(hex.slice(1),16),rgb=[n>>16,(n>>8)&255,n&255].map(v=>Math.round(t>=0?v*(1-t):v+(255-v)*(-t)));return '#'+rgb.map(v=>v.toString(16).padStart(2,'0')).join('');}
 function lum(hex){const n=parseInt(hex.slice(1),16);return [n>>16,(n>>8)&255,n&255].map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4}).reduce((s,v,i)=>s+v*[.2126,.7152,.0722][i],0);}
 function palette(){const accent=getComputedStyle(document.documentElement).getPropertyValue('--wt-button-accent').trim()||'#137985',a=blend(accent,.40),b=blend(accent,-.15),l=[lum(a),lum(b)];const white=Math.min(...l.map(v=>1.05/(v+.05))),black=Math.min(...l.map(v=>(v+.05)/.05));return {background:document.body.dataset.buttonStyle==='solid'?accent:'linear-gradient(135deg,'+a+','+b+')',color:(document.body.dataset.buttonStyle==='solid'?lum(accent)<.18:white>=black)?'#fff':'#10212a'};}
 function on(button){const pressed=button.getAttribute('aria-pressed');if(pressed==='true'||pressed==='false')return pressed==='true';if(button.hasAttribute('data-enabled'))return button.dataset.enabled==='true';return button.matches('.pa-on,.is-on,.enabled,.on');}
 // Selection is a state, so it must remain distinct from decorative button palettes.
 const modeStyle=document.createElement('style');modeStyle.id='webAdhanModeSelectionStyle';
 modeStyle.textContent=':is(#settingsContentDialog,#adhanServicesDialog) button[data-prayer][data-mode] small{color:inherit!important}:is(#settingsContentDialog,#adhanServicesDialog) button[data-prayer][data-mode][aria-pressed="true"] small::after{content:" ✓";font-weight:900}:is(#settingsContentDialog,#adhanServicesDialog) button[data-global-mode][aria-pressed="true"]::after{content:" ✓";font-weight:900}';
 document.head.appendChild(modeStyle);
 let queued=false;
 function paint(){queued=false;const p=palette();document.querySelectorAll(roots).forEach(root=>root.querySelectorAll('button').forEach(button=>{
  if(button.matches(skip)||button.closest('#aqReader,#monthlyCalendars'))return;
  if(button.matches('[data-global-mode]')){
   const selected=[...(button.closest('#adSection-modes')?.querySelectorAll('[data-prayer][data-mode][aria-pressed="true"]')||[])];
   const active=selected.length===5&&new Set(selected.map(b=>b.dataset.prayer)).size===5&&selected.every(b=>b.dataset.mode===button.dataset.globalMode);
   if(button.getAttribute('aria-pressed')!==String(active))button.setAttribute('aria-pressed',String(active));
  }
  const toggle=button.matches(switches);
  const bg=toggle?(on(button)?'#278052':'#858e8b'):p.background;
  button.style.setProperty('background',bg,'important');
  button.style.setProperty('color',toggle?'#fff':p.color,'important');
  button.style.setProperty('border-color',toggle?(on(button)?'#167043':'#859593'):'var(--wt-border)','important');
  button.querySelectorAll('span,strong,b').forEach(x=>x.style.setProperty('color',toggle?'#fff':p.color,'important'));
 }));}
 function schedule(){if(!queued){queued=true;requestAnimationFrame(paint);}}
 function start(){
  const observer=new MutationObserver(records=>{if(records.some(r=>r.target===document.body&&r.attributeName==='data-web-theme'||r.target.closest?.(roots)||[...r.addedNodes].some(n=>n.nodeType===1&&(n.matches?.(roots)||n.querySelector?.(roots)))))schedule();});
  observer.observe(document.body,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['class','aria-pressed','data-enabled','data-web-theme']});
  window.addEventListener('aoqatButtonAppearanceChanged',schedule);document.addEventListener('click',schedule,true);window.addEventListener('pageshow',schedule);schedule();
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
;

/* js/web-back-navigation.js */
(function () {
  'use strict';
  // Android's APK already delegates the native back gesture to its own bridge.
  if (window.AndroidNative?.configureAdhan) return;
  const visible = e => !!e && !e.hidden && getComputedStyle(e).display !== 'none' && e.getClientRects().length > 0;
  const byId = id => document.getElementById(id);
  const leaves = () => [...document.querySelectorAll('.ad-leaf-window')].filter(visible)
    .sort((a, b) => Number(a.style.getPropertyValue('--leaf-level')) - Number(b.style.getPropertyValue('--leaf-level')));
  // Reuse each screen's existing back handler, including saving and cleanup.
  function back() {
    if (visible(byId('adAzkarPage'))&&window.aoqatCloseAzkarCategory?.())return true;
    if (visible(byId('aqSheet'))) { byId('aqCloseSheet')?.click(); return true; }
    for (const leaf of leaves().reverse()) {
      const button = leaf.querySelector(':scope > header [data-subwindow-back]');
      if (button) { button.click(); return true; }
    }
    if (visible(byId('adhanServicesDialog'))) { byId('adhanServicesBack')?.click(); return true; }
    if (visible(byId('settingsContentDialog'))) {
      const button = document.querySelector('#webDrawerSub.open .web-back');
      if (button) { button.click(); return true; }
    }
    if (document.body.classList.contains('design-menu-open')) { byId('designSideMenuBtn')?.click(); return true; }
    return false;
  }
  window.aoqatHandleBack = back;
  function screen() {
    return JSON.stringify([
      document.body.classList.contains('design-menu-open'),
      visible(byId('settingsContentDialog')) ? byId('webSubTitle')?.textContent : '',
      visible(byId('adhanServicesDialog')),
      leaves().map(e => e.id || e.querySelector('h3')?.textContent || 'editor'),
      visible(byId('aqSheet')),
      visible(byId('adAzkarPage'))?window.aoqatAzkarCategory||'':''
    ]);
  }
  const key = 'aoqatWebBack', session = Date.now() + '-' + Math.random();
  let index = 0, moving = false;
  const screens = [screen()];
  const state = n => ({...history.state, [key]: {session, index: n}});
  history.replaceState(state(0), '');
  function reconcile() {
    if (moving) return;
    const current = screen();
    if (current === screens[index]) return;
    // On-screen back buttons also remove their browser-history entry.
    const previous = screens.slice(0, index).lastIndexOf(current);
    if (previous >= 0) { moving = true; history.go(previous - index); return; }
    screens.splice(index + 1);
    screens.push(current);
    history.pushState(state(++index), '');
  }
  new MutationObserver(reconcile).observe(document.body, {
    childList: true, subtree: true, attributes: true, attributeFilter: ['hidden', 'class']
  });
  window.addEventListener('popstate', event => {
    const target = event.state?.[key];
    if (target?.session !== session || !screens[target.index]) { moving = false; return; }
    const fromButton = moving;
    moving = true;
    // UI buttons have already performed their cleanup. A browser back gesture
    // performs one cleanup only; never close a newly opened screen during an
    // asynchronous history update from an on-screen back button.
    if (!fromButton && target.index < index && screen() !== screens[target.index]) back();
    const actual=screen(), earlier=screens.slice(0,target.index+1).lastIndexOf(actual);
    // A completed share page returns straight to the preview, closing its menu
    // parents too. Remove those parents from history without another UI back.
    if(!fromButton&&earlier>=0&&earlier<target.index){index=target.index;history.go(earlier-target.index);return;}
    index = target.index;
    if (!fromButton) screens[index] = screen();
    history.replaceState(state(index), '');
    moving = false;
    reconcile();
  });
})();

;

/* js/web-quiet-core.js */
/* Web-only quiet previews; Android ringer control is implemented separately. */
(function(root){'use strict';
 if(root.AndroidNative?.configureAdhan)return;
 const C=root.AoqatAdhanCore;if(!C)return;
 const normalize=C.normalize,defaults=C.defaults,iqamaWindow=C.afterIqamaSilentWindow;
 const fresh=()=>({enabled:false,minutes:Object.fromEntries(C.ids.map(id=>[id,20]))});
 C.defaults=()=>({...defaults(),afterAdhanSilent:fresh()});
 C.normalize=raw=>{const s=normalize(raw),v=raw?.afterAdhanSilent,d=fresh();d.enabled=v?.enabled===true;for(const id of C.ids){const n=Number(v?.minutes?.[id]);if(Number.isFinite(n))d.minutes[id]=Math.max(0,Math.min(120,Math.floor(n)));}s.afterAdhanSilent=d;return s;};
 C.afterAdhanSilentWindow=(rows,now,raw)=>{const s=C.normalize(raw);if(!s.afterAdhanSilent.enabled)return null;const yesterday=new Date(now.getFullYear(),now.getMonth(),now.getDate()-1),active=[],seen=new Set();
  for(const e of [...C.events(rows,yesterday),...C.events(rows,now)]){const key=e.id+':'+e.at;if(seen.has(key)||e.friday&&s.friday.enabled)continue;seen.add(key);const end=e.at+s.afterAdhanSilent.minutes[e.id]*60000;if(+now>=e.at&&+now<end)active.push({prayerId:e.id,start:e.at,end,source:'adhan'});}
  if(!active.length)return null;active.sort((a,b)=>b.start-a.start);return {...active[0],end:Math.max(...active.map(e=>e.end))};
 };
 C.afterIqamaSilentWindow=(rows,now,raw,iqama={})=>{const s=C.normalize(raw),a=iqamaWindow(rows,now,{...s,enabled:true},iqama),b=C.afterAdhanSilentWindow(rows,now,s);const active=[a&&{...a,source:'iqama'},b].filter(Boolean);if(!active.length)return null;active.sort((a,b)=>b.start-a.start);return {...active[0],end:Math.max(...active.map(e=>e.end))};};
 if(typeof module!=='undefined')module.exports=C;
})(typeof window==='undefined'?globalThis:window);

;

/* js/web-quiet-settings.js */
(function(){'use strict';if(window.AndroidNative?.configureAdhan)return;
 const names={fajr:'الفجر',dhuhr:'الظهر',asr:'العصر',maghrib:'المغرب',isha:'العشاء'},ids=Object.keys(names),$=id=>document.getElementById(id);
 let adhanOpen=false,queued=false;
 function build(body,kind){const api=window.AoqatWebQuietSettings;if(!api||body.dataset.webQuiet===kind)return;body.dataset.webQuiet=kind;
  const key=kind==='adhan'?'afterAdhanSilent':'afterIqamaSilent',title=kind==='adhan'?'الصامت عند الأذان':'الصامت عند الإقامة',s=api.read()[key];
  body.replaceChildren();const master=document.createElement('button');master.type='button';master.className='pa-switch';master.dataset.webQuietToggle=kind;master.setAttribute('aria-pressed',String(s.enabled));master.textContent=title+': '+(s.enabled?'مفعّل':'متوقف');master.style.cssText='width:100%;background:'+(s.enabled?'#278052':'#858e8b')+'!important;color:#fff!important';master.onclick=()=>api.save({[key]:{...s,enabled:!s.enabled}});body.append(master);
  const hint=document.createElement('p');hint.className='ad-note';hint.textContent='مدة الصامت لكل صلاة بالدقائق. صفر يوقفه لهذه الصلاة.';body.append(hint);
  const field=document.createElement('fieldset');field.disabled=!s.enabled;field.className='web-quiet-durations';
  for(const id of ids){const label=document.createElement('label'),text=document.createElement('span'),input=document.createElement('input'),badge=document.createElement('small');text.textContent=names[id];input.type='number';input.min='0';input.max='120';input.step='1';input.value=s.minutes[id];input.dataset.webQuietMinutes=id;input.dataset.quietKind=kind;input.setAttribute('aria-label','مدة '+title+' لصلاة '+names[id]);badge.textContent=s.enabled&&s.minutes[id]>0?'مفعّل':'متوقف';badge.dataset.active=String(s.enabled&&s.minutes[id]>0);input.onchange=()=>{if(!input.checkValidity()||input.value===''){input.reportValidity();input.value=s.minutes[id];return;}api.save({[key]:{...s,minutes:{...s.minutes,[id]:Number(input.value)}}});};label.append(text,badge,input);field.append(label);}
  const all=document.createElement('label');all.textContent='مدة موحدة';const value=document.createElement('input');value.type='number';value.min='0';value.max='120';value.step='1';value.value='20';value.setAttribute('aria-label','مدة موحدة لجميع الصلوات');const apply=document.createElement('button');apply.type='button';apply.textContent='تطبيق للجميع';apply.dataset.quietAll=kind;apply.onclick=()=>{if(!value.checkValidity()||value.value===''){value.reportValidity();return;}api.save({[key]:{...s,minutes:Object.fromEntries(ids.map(id=>[id,Number(value.value)]))}});};all.append(value,apply);field.append(all);body.append(field);
  const status=document.createElement('p');status.setAttribute('role','status');status.textContent=!s.enabled?'الصامت متوقف.':ids.every(id=>!s.minutes[id])?'حدّد مدة لصلاة واحدة على الأقل.':'المدد محفوظة وتُحسب من مواقيت الصلاة وتخصيص المستخدم.';body.append(status);
  const note=document.createElement('p');note.className='ad-note';note.textContent='نسخة الويب تعاين فترة الصامت وتكتم صوت الموقع فقط. تغيير وضع الهاتف نفسه يحتاج نسخة Android.';body.append(note);
 }
 function mount(){queued=false;const p=$('adhanPanel'),api=window.AoqatWebQuietSettings;if(!p||!api||!$('paAlertMenu'))return;
  const iqama=$('adSilentSettings');if(iqama){const body=iqama.querySelector(':scope > .ad-leaf-body');if(body)build(body,'iqama');$('adSilentSettingsToggle').disabled=false;}
  let button=$('adAdhanSilentSettingsToggle');if(!button){button=document.createElement('button');button.id='adAdhanSilentSettingsToggle';button.type='button';button.className='ad-section-toggle';button.setAttribute('aria-controls','adAdhanSilentSettings');button.innerHTML='<span>🤫</span><span>تفعيل وضع صامت عند الأذان</span><span>‹</span>';$('paAlertMenu').append(button);const panel=document.createElement('section');panel.id='adAdhanSilentSettings';panel.className='ad-leaf-window';panel.hidden=!adhanOpen;panel.style.setProperty('--leaf-level',1);panel.innerHTML='<header class="ad-leaf-head"><button type="button" class="ad-leaf-back" data-subwindow-back>‹ رجوع</button><h3>الصامت عند الأذان</h3></header><div class="ad-leaf-body"></div>';p.append(panel);button.onclick=()=>{adhanOpen=true;panel.hidden=false;button.setAttribute('aria-expanded','true');panel.querySelector('button').focus({preventScroll:true});};panel.querySelector('header button').onclick=()=>{adhanOpen=false;panel.hidden=true;button.setAttribute('aria-expanded','false');button.focus({preventScroll:true});};panel.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();panel.querySelector('header button').click();}});}
  button.setAttribute('aria-expanded',String(adhanOpen));build($('adAdhanSilentSettings').querySelector('.ad-leaf-body'),'adhan');
 }
 function schedule(){if(!queued){queued=true;requestAnimationFrame(mount);}}
 const old=window.aoqatCloseSettingsLeaves;window.aoqatCloseSettingsLeaves=()=>{old?.();$('adAdhanSilentSettings')?.querySelector('header button')?.click();};
 const style=document.createElement('style');style.textContent='.web-quiet-durations{border:0;margin:12px 0;padding:0}.web-quiet-durations label{display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid var(--wt-border,#ddd)}.web-quiet-durations label>span{flex:1}.web-quiet-durations input{width:75px;min-height:42px;font:inherit;text-align:center}.web-quiet-durations small{padding:3px 6px;border-radius:7px;background:#858e8b;color:white}.web-quiet-durations small[data-active="true"]{background:#278052}.web-quiet-durations button{font:inherit;min-height:42px}';document.head.append(style);
 new MutationObserver(schedule).observe(document.body,{childList:true,subtree:true});window.addEventListener('aoqatAdhanChanged',schedule);schedule();
})();

;

/* js/web-settings-search-calendar.js */
(function(){'use strict';if(window.AndroidNative?.configureAdhan)return;
 const $=id=>document.getElementById(id),normal=s=>String(s).normalize('NFKD').replace(/[\u064B-\u065F\u0670\u0640]/g,'').replace(/[أإآٱ]/g,'ا').replace(/ة/g,'ه').replace(/ى/g,'ي').toLowerCase().replace(/\s+/g,' ').trim();
 const catalog=new Map();let queued=false,calendarDate=new Date(),calendarMonth=new Date(calendarDate.getFullYear(),calendarDate.getMonth(),1),calendarToken=0;
 const nav=()=>window.AoqatWebSettingsNavigation;
 function add(id,title,path,words,run){catalog.set(id,{title,path,words:normal(title+' '+path+' '+words),run});}
 function reveal(selector){requestAnimationFrame(()=>requestAnimationFrame(()=>{const e=document.querySelector(selector);if(e){e.scrollIntoView({block:'center'});e.classList.add('web-search-highlight');setTimeout(()=>e.classList.remove('web-search-highlight'),1600);if(e.matches('input,select,textarea,button')&&!e.disabled)e.focus({preventScroll:true});}}));}
 function openAdhan(section,selector){nav().adhan();if(section==='quiet-iqama')$('adSilentSettingsToggle')?.click();else if(section==='quiet-adhan')$('adAdhanSilentSettingsToggle')?.click();else if(section){$('paMethodOpen')?.click();const b=section==='alarm'?$('paOpen'):section==='notice'?$('pnOpen'):document.querySelector('[data-ad-section="'+(section==='sound'?'modes':section)+'"]');if(b?.disabled){$('adEnable')?.focus();return;}b?.click();if(section==='sound')document.querySelector('[data-ad-section="sound"]')?.click();}if(selector)reveal(selector);}
 function buildIndex(){
  for(const b of document.querySelectorAll('#webDrawerMain [data-drawer]')){const id=b.dataset.drawer;add('drawer:'+id,b.querySelector('.txt')?.textContent||b.textContent,'القائمة الرئيسية','',()=>nav().drawer(id));}
  const panels={backgroundPanel:'واجهة البرنامج',fontPanel:'تنسيق الخط',footerPanel:'النص السفلي',datePanel:'التاريخ الهجري والميلادي',prayerPanel:'أوقات الصلاة',iqamaPanel:'أوقات الإقامة',afterIqamaPanel:'أوقات بعد الإقامة',switchPanel:'التبديل التلقائي وتنبيه النشر'};
  for(const [id,title] of Object.entries(panels)){add('panel:'+id,title,'إعدادات التطبيق','',()=>nav().panel(id,title));const root=$(id);if(!root)continue;for(const e of root.querySelectorAll('label,button')){const clone=e.cloneNode(true);clone.querySelectorAll('input,select,textarea').forEach(n=>n.remove());const text=clone.textContent.trim().replace(/\s+/g,' '),control=e.matches('button')?e:e.querySelector('input,select,textarea'),target=control?.id||e.id;if(!text||text.length>150||!target)continue;add('control:'+target,text,title,'',()=>{nav().panel(id,title);reveal('#'+CSS.escape(target));});}}
  for(const [id,title,words] of [['quiet-adhan','الصامت عند الأذان','صمت صامت الهاتف مدة تفعيل'],['quiet-iqama','الصامت عند الإقامة','صامت بعد الاقامة مدة'],['modes','وضع الأذان لكل صلاة','عام صوت هزاز صامت'],['sound','صوت الأذان','المؤذن قباء السريحي مكة المدينة القطامي مستوى الصوت كامل جزئي تكبيرات ملف الهاتف'],['alarm','منبه أوقات الصلاة','منبه رنين غفوة تكرار ايام نغمة'],['notice','إشعار أوقات الصلاة','اشعار صوت قصير'],['notifications','التنبيهات','سحور تذكير قبل الصلاة اهتزاز']])add('adhan:'+id,title,'الأذان والتنبيه',words,()=>openAdhan(id));
  for(const [kind,title] of [['quiet-adhan','الصامت عند الأذان'],['quiet-iqama','الصامت عند الإقامة']])for(const [id,name] of Object.entries({fajr:'الفجر',dhuhr:'الظهر',asr:'العصر',maghrib:'المغرب',isha:'العشاء'}))add(kind+':'+id,'مدة الصامت لصلاة '+name,title,'دقائق وقت',()=>openAdhan(kind,'[data-quiet-kind="'+(kind==='quiet-adhan'?'adhan':'iqama')+'"][data-web-quiet-minutes="'+id+'"]'));
  for(const [id,title] of [['morning','أذكار الصباح'],['evening','أذكار المساء'],['prayer','أذكار بعد الصلاة'],['sleep','أذكار النوم'],['waking','أذكار الاستيقاظ'],['adhan','أذكار الأذان'],['wudu','أذكار الوضوء'],['mosque','أذكار المسجد'],['home','أذكار المنزل'],['food','أذكار الطعام'],['bathroom','أذكار الخلاء'],['travel','أذكار السفر'],['distress','أدعية الهم والكرب'],['illness','الرقية وأدعية المريض'],['weather','أذكار المطر والريح'],['tasbih','التسبيح والاستغفار والصلاة على النبي']])add('azkar:'+id,title,'حقيبة المسلم › الأذكار','تنبيه تذكير الوقت تخصيص المستخدم افتراضي تشغيل ايقاف',()=>{nav().bag('azkar');window.aoqatOpenAzkarCategory?.(id);});
  add('friday','سنن يوم الجمعة وآدابها','حقيبة المسلم','الكهف الصلاة على النبي تنبيه تذكير نشر بوست وقت',()=>nav().bag('friday'));
  add('fasting','صيام التطوع','حقيبة المسلم','الاثنين الخميس الأيام البيض عاشوراء تاسوعاء شوال عرفة ذي الحجة تذكير نشر بوست تنبيه',()=>nav().bag('fasting'));
  for(const [id,title,words] of [['elements','إظهار عناصر واجهة البرنامج','الساعة التاريخ باقي على الصلاة باقي على الاقامة'],['designs','إظهار وإخفاء التصاميم','التصميم الاول الثاني الثالث الرابع'],['tools','أدوات تعديل التصميم','تحريك حجم الخلفية الوان النص السفلي']])add('interface:'+id,title,'إعدادات التصميم',words,()=>{nav().panel('backgroundPanel','واجهة البرنامج');nav().interface(id,title);});
  add('appearance','الثيمات وألوان الأزرار','شكل التطبيق','ثيم لون الوان خلفية فاتح داكن ليلي تدرج ثابت الخطوط',()=>nav().drawer('appearance'));
  add('quran-settings','إعدادات القرآن الكريم','القرآن الكريم','حجم خط القراءة المصحف صفحة صفحات حفظ علامة البحث سورة صوت القارئ التلاوة',()=>nav().drawer('quran'));
  add('friday-prayer','تخصيص صلاة الجمعة','الأذان والتنبيه','الأذان الاول الثاني الخطبة مدة صامت تذكير وقت',()=>{nav().adhan();document.querySelector('[data-ad-section="friday"]')?.click();});
  add('choice','طريقة اختيار أوقات الصلاة','بيانات التاريخ والصلاة','قاعدة البيانات تخصيص المستخدم افتراضيا تعديل تقديم تاخير دقائق',()=>{nav().drawer('datePrayer');document.querySelector('[data-time-choice-open]')?.click();});
  add('calendar-format','تنسيق الخط للتقويم','التقاويم','حجم لون النص خلفية العناصر المواقيت الخط الشهر سنة هجري ميلادي',()=>{const n=window.AoqatMonthlyCalendarsCore?.baghdad();if(n)window.AoqatCalendars?.format(n.year,n.month);});
  add('calendar-reminder','تنبيه نشر تقويم الشهر','التقاويم','نهاية الشهر نشر الهاتف تذكير',()=>window.AoqatCalendars?.reminder());
  add('calendar','التقاويم','القائمة الرئيسية','تقويم هجري ميلادي شهر سنة يوم مواقيت',openCalendar);
 }
 function clearSearch(){const input=$('webSettingsSearch');if(input)input.value='';const r=$('webSettingsSearchResults');if(r){r.hidden=true;r.replaceChildren();}$('webDrawerMain')?.style.removeProperty('display');}
 function search(){buildIndex();const q=normal($('webSettingsSearch').value),box=$('webSettingsSearchResults');box.replaceChildren();if(!q){clearSearch();return;}box.hidden=false;$('webDrawerMain').style.display='none';const words=q.split(' '),matches=[...catalog.values()].filter(e=>words.every(w=>e.words.includes(w)));const status=document.createElement('p');status.setAttribute('role','status');status.textContent=matches.length?'نتائج البحث: '+matches.length:'لا توجد نتائج مطابقة.';box.append(status);
  for(const e of matches){const b=document.createElement('button');b.type='button';b.className='web-settings-result';const t=document.createElement('strong'),p=document.createElement('small');t.textContent=e.title;p.textContent=e.path;b.append(t,p);b.onclick=()=>{clearSearch();e.run();};box.append(b);}
 }
 const dayKey=d=>d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
 function openCalendar(){clearSearch();if(window.AoqatCalendars){window.AoqatCalendars.open();return;}openDailyCalendar();}
 window.aoqatOpenDailyCalendar=openDailyCalendar;window.aoqatMountDailyCalendar=mountDailyCalendar;
 function openDailyCalendar(){clearSearch();const host=document.createElement('div');nav().sub('التقويم اليومي',host,'main');mountDailyCalendar(host);}
 function mountDailyCalendar(host){const page=document.createElement('section');page.id='webCalendar';page.innerHTML='<section id="webCalendarDetail" aria-live="polite"></section><div class="web-calendar-toolbar"><button type="button" data-calendar-step="-1" aria-label="الشهر السابق">‹</button><label>الشهر<input type="month" id="webCalendarMonth" aria-label="شهر التقويم"></label><button type="button" data-calendar-step="1" aria-label="الشهر التالي">›</button><button type="button" id="webCalendarToday">اليوم</button></div><h3 id="webCalendarTitle"></h3><div id="webCalendarGrid" class="web-calendar-grid"></div>';
  host.append(page);page.querySelectorAll('[data-calendar-step]').forEach(b=>b.onclick=()=>{calendarMonth=new Date(calendarMonth.getFullYear(),calendarMonth.getMonth()+Number(b.dataset.calendarStep),1);drawCalendar();});$('webCalendarMonth').onchange=e=>{if(!/^\d{4}-\d{2}$/.test(e.target.value))return;const [y,m]=e.target.value.split('-').map(Number);if(y<1900||y>2200||m<1||m>12)return;calendarMonth=new Date(y,m-1,1);drawCalendar();};$('webCalendarToday').onclick=()=>{calendarDate=new Date();calendarMonth=new Date(calendarDate.getFullYear(),calendarDate.getMonth(),1);drawCalendar();};drawCalendar();
 }
 function drawCalendar(){if(!$('webCalendar'))return;if(calendarDate.getMonth()!==calendarMonth.getMonth()||calendarDate.getFullYear()!==calendarMonth.getFullYear())calendarDate=new Date(calendarMonth.getFullYear(),calendarMonth.getMonth(),1,12);const grid=$('webCalendarGrid');grid.replaceChildren();$('webCalendarMonth').value=dayKey(calendarMonth).slice(0,7);$('webCalendarTitle').textContent=new Intl.DateTimeFormat('ar-IQ',{year:'numeric',month:'long',calendar:'gregory'}).format(calendarMonth);
  for(const day of ['الأحد','الاثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت']){const h=document.createElement('span');h.className='web-calendar-weekday';h.textContent=day;grid.append(h);}
  for(let i=0;i<calendarMonth.getDay();i++){const blank=document.createElement('span');blank.setAttribute('aria-hidden','true');grid.append(blank);}
  const count=new Date(calendarMonth.getFullYear(),calendarMonth.getMonth()+1,0).getDate(),today=dayKey(new Date());for(let n=1;n<=count;n++){const d=new Date(calendarMonth.getFullYear(),calendarMonth.getMonth(),n,12),key=dayKey(d),b=document.createElement('button'),main=document.createElement('strong'),h=document.createElement('small');b.type='button';b.dataset.calendarDate=key;b.setAttribute('aria-pressed',String(key===dayKey(calendarDate)));if(key===today)b.setAttribute('aria-current','date');main.textContent=n;h.textContent=new Intl.DateTimeFormat('ar-IQ-u-ca-islamic-umalqura',{day:'numeric'}).format(d);b.setAttribute('aria-label',d.toLocaleDateString('ar-IQ',{calendar:'gregory',dateStyle:'full'})+'، '+d.toLocaleDateString('ar-IQ-u-ca-islamic-umalqura',{dateStyle:'long'}));b.append(main,h);b.onclick=()=>{calendarDate=d;drawCalendar();};grid.append(b);}
  showDay(calendarDate);
 }
 async function showDay(d){const token=++calendarToken,detail=$('webCalendarDetail');detail.replaceChildren();const title=document.createElement('h4');title.textContent=d.toLocaleDateString('ar-IQ',{dateStyle:'full',calendar:'gregory'})+' — '+d.toLocaleDateString('ar-IQ-u-ca-islamic-umalqura',{dateStyle:'long'});detail.append(title);try{let row=typeof cachedAnnualPrayer==='function'?cachedAnnualPrayer(d.getMonth()+1,d.getDate()):null;if(!row&&typeof fetchAnnualPrayer==='function')row=await fetchAnnualPrayer(d.getMonth()+1,d.getDate());if(token!==calendarToken||!detail.isConnected)return;if(!row){detail.append('مواقيت هذا اليوم غير متاحة حالياً.');return;}row=window.AoqatPrayerTimeChoice?.applyRow(row)||row;const table=document.createElement('table');for(const [id,name] of Object.entries({fajr:'الفجر',sunrise:'الشروق',dhuhr:'الظهر',asr:'العصر',maghrib:'المغرب',isha:'العشاء'})){const tr=document.createElement('tr'),a=document.createElement('th'),b=document.createElement('td');a.textContent=name;b.textContent=row[id]||'—';tr.append(a,b);table.append(tr);}detail.append(table);}catch(_){if(token===calendarToken)detail.append('تعذر قراءة مواقيت هذا اليوم.');}}
 function mount(){queued=false;const heading=$('webSettingsHeading'),drawer=$('webExactDrawer'),list=$('webDrawerMain');if(!heading||!drawer||!list||!nav())return;
  if(!heading.querySelector('#webSettingsSearch')){heading.classList.add('web-settings-header');heading.replaceChildren();const title=document.createElement('span');title.textContent='الإعدادات';title.className='web-settings-title';const label=document.createElement('label');label.className='web-settings-search-box';const input=document.createElement('input');input.id='webSettingsSearch';input.type='search';input.placeholder='بحث…';input.autocomplete='off';input.setAttribute('aria-label','البحث في جميع إعدادات التطبيق');const icon=document.createElementNS("http://www.w3.org/2000/svg","svg");icon.setAttribute("viewBox","0 0 24 24");icon.setAttribute("aria-hidden","true");icon.classList.add("web-search-icon");icon.innerHTML='<circle cx="10.5" cy="10.5" r="6.5"/><path d="m15.5 15.5 4.5 4.5"/>';label.append(input,icon);heading.append(title,label);input.oninput=search;input.addEventListener('keydown',e=>{if(e.key==='Escape'&&input.value){e.preventDefault();e.stopPropagation();clearSearch();}});const results=document.createElement('div');results.id='webSettingsSearchResults';results.hidden=true;drawer.prepend(results);}
  if(!list.querySelector('[data-drawer="calendar"]')){const b=document.createElement('button');b.type='button';b.dataset.drawer='calendar';b.className='web-drawer-row';b.innerHTML='<span class="ico"><svg viewBox="0 0 32 32" width="28" height="28" fill="none" aria-hidden="true"><rect x="4" y="6" width="24" height="23" rx="4" stroke="currentColor" stroke-width="2"/><path d="M4 13h24M10 3v7M22 3v7M10 18h3m6 0h3m-12 6h3m6 0h3" stroke="currentColor" stroke-width="2"/></svg></span><span class="txt">التقاويم</span>';b.onclick=e=>{e.stopPropagation();openCalendar();};list.insertBefore(b,list.querySelector('[data-drawer="datePrayer"]'));}
 }
 const style=document.createElement('style');style.textContent='body.design-menu-open .sidebar .main-panel>h2#webSettingsHeading.web-settings-header{display:grid!important;grid-template-columns:minmax(0,1fr)!important;grid-template-rows:24px 32px!important;justify-content:stretch!important;gap:6px!important;padding:8px 18px!important;font-size:17px!important;direction:rtl!important}.web-settings-header .web-settings-title{grid-row:1;justify-self:start;margin-right:40px;white-space:nowrap;line-height:24px}.web-settings-header .web-settings-search-box{position:relative;min-width:0;display:block;grid-row:2;width:100%}.web-settings-header .web-search-icon{position:absolute;right:9px;top:7px;width:18px;height:18px;fill:none;stroke:#65818b;stroke-width:2;stroke-linecap:round;pointer-events:none}.web-settings-header .web-settings-search-box input{box-sizing:border-box;width:100%;min-width:0;height:32px;min-height:32px;border:1px solid var(--wt-border,#b8c9cc);border-radius:12px;padding:6px 29px 6px 8px;font:inherit;font-size:13px;background:var(--wt-surface,#f7faf9);color:var(--wt-text,#153642);outline-offset:2px;box-shadow:inset 0 1px 2px #15364208}.web-settings-header .web-settings-search-box input:focus{outline:2px solid var(--wt-accent,#299eb8);border-color:transparent}body.design-menu-open #designSideMenuBtn{top:10px!important;right:12px!important;width:24px!important;height:24px!important;min-width:0!important;min-height:0!important;gap:2px!important;border-radius:7px!important}body.design-menu-open #designSideMenuBtn .menu-bar{transform:none!important;opacity:1!important;width:11px!important;height:1.2px!important}#webSettingsSearchResults{height:100%;overflow:auto;padding:10px;box-sizing:border-box;background:var(--wt-surface,#fff)}#webSettingsSearchResults[hidden]{display:none!important}.web-settings-result{display:flex;flex-direction:column;gap:5px;text-align:right;width:100%;min-height:60px;margin:0 0 8px;padding:10px 12px;border:1px solid var(--wt-border,#ccd9d8);border-radius:10px;background:var(--wt-panel,#f6faf7);color:var(--wt-text,#153642);font:inherit}.web-settings-result small{opacity:.75}.web-search-highlight{outline:3px solid #d8aa36!important;outline-offset:3px}#webCalendar{padding:10px;direction:rtl}.web-calendar-toolbar{display:flex;gap:6px;flex-wrap:wrap;align-items:center}.web-calendar-toolbar label{flex:1;min-width:130px}.web-calendar-toolbar input{width:100%;box-sizing:border-box;font:inherit;min-height:40px}.web-calendar-toolbar button{min-width:36px;min-height:40px;font:inherit}.web-calendar-grid{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:4px}.web-calendar-weekday{font-size:10px;text-align:center;padding:6px 0}.web-calendar-grid button{min-width:0;min-height:55px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;background:var(--wt-panel,#fff);color:var(--wt-text,#153642);border:1px solid var(--wt-border,#d3ddda);border-radius:8px;font:inherit}.web-calendar-grid button small{font-size:11px;opacity:.75}.web-calendar-grid [aria-current="date"]{border:2px solid var(--wt-accent,#278052)}.web-calendar-grid [aria-pressed="true"]{outline:2px solid #c59828;outline-offset:-3px}#webCalendarDetail table{width:100%;border-collapse:collapse}#webCalendarDetail th,#webCalendarDetail td{padding:8px;border-bottom:1px solid var(--wt-border,#ddd);text-align:right}';document.head.append(style);
 function schedule(){if(!queued){queued=true;requestAnimationFrame(mount);}}
 new MutationObserver(schedule).observe(document.body,{childList:true,subtree:true});window.addEventListener('aoqatModulesReady',schedule);schedule();
})();

;

/* js/monthly-calendars-core.js */
/* Annual database values are copied verbatim; only calendar dates depend on year. */
(function(root){'use strict';
 const months=['كانون الثاني','شباط','آذار','نيسان','أيار','حزيران','تموز','آب','أيلول','تشرين الأول','تشرين الثاني','كانون الأول'];
 const weekdays=['الأحد','الاثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت'],fields=['fajr','sunrise','dhuhr','asr','maghrib','isha'];
 const groups={title:{name:'مواقيت الصلاة لمدينة الحويجة وضواحيها لشهر',size:37},month:{name:'اسم الشهر ورقمه',size:43},hijri:{name:'التاريخ الهجري',size:42},gregorian:{name:'التاريخ الميلادي',size:48},yearLabel:{name:'لسنة',size:30},headers:{name:'أسماء أوقات الصلاة',size:30},weekday:{name:'أيام الأسبوع',size:33},date:{name:'أرقام التاريخ',size:34},times:{name:'مواقيت الصلاة',size:31}};
 const designs=[{id:'navy-gold',number:1,name:'كحلي وذهبي',palette:4},{id:'iraqi-paper',number:2,name:'ورقة تقويم عراقية',palette:5},{id:'minimal-modern',number:3,name:'عصري بسيط',palette:6},{id:'islamic-corners',number:4,name:'زخرفة إسلامية خفيفة',palette:7},{id:'reference',number:5,name:'التقويم الكلاسيكي',palette:0},{id:'geometric',number:6,name:'التقويم العصري',palette:2},{id:'landscape',number:7,name:'تقويم أفقي بجدولين',palette:3},{id:'ledger',number:8,name:'دفتر المواعيد',palette:2},{id:'architectural',number:9,name:'الإطار المعماري',palette:1}];
 const palettes=[{name:'ألوان التقويم الأصلي',page:'#ffffff',ink:'#172b24',title:'#24763b',head:'#fff777',headInk:'#172b24',times:'#b4d6ad',day:'#efc3a5',date:'#fffaaa',border:'#55715d'},{name:'أخضر وذهبي',page:'#f8f6ef',ink:'#183f38',title:'#185b4c',head:'#1d5c4d',headInk:'#ffffff',times:'#eff5ee',day:'#e4eee4',date:'#eee3c4',border:'#b5c9bd'}, {name:'أزرق وفضي',page:'#f3f7fb',ink:'#18354d',title:'#1f5479',head:'#244f70',headInk:'#ffffff',times:'#edf4fa',day:'#dde9f3',date:'#e7edf3',border:'#b4c8d8'}, {name:'بنفسجي ورملي',page:'#fcf8f3',ink:'#4c3857',title:'#6d476e',head:'#694969',headInk:'#ffffff',times:'#f5eef5',day:'#e9dfe9',date:'#f0e5d5',border:'#ccbccc'}];
 palettes.push(
 {name:'كحلي وذهبي',page:'#ffffff',ink:'#102e45',title:'#ffffff',head:'#112f47',headInk:'#ffffff',times:'#f0f4f8',day:'#f0f4f8',date:'#f0f4f8',border:'#cfdae2'},
 {name:'ورقة عراقية',page:'#fffdf6',ink:'#203f35',title:'#203f35',head:'#f8eaa5',headInk:'#203f35',times:'#d8e7ce',day:'#f0d9bd',date:'#fbf1b4',border:'#78957d'},
 {name:'عصري بسيط',page:'#ffffff',ink:'#173a43',title:'#173a43',head:'#167f84',headInk:'#ffffff',times:'#f2f7f7',day:'#f2f7f7',date:'#f2f7f7',border:'#d5e2e3'},
 {name:'زخرفة إسلامية',page:'#fffdf7',ink:'#16463e',title:'#16463e',head:'#164c42',headInk:'#fffbec',times:'#f4f4e9',day:'#f4f4e9',date:'#f4f4e9',border:'#c9c9ab'}
 );
 function designDefaults(id){const design=designs.find(d=>d.id===id)||designs.find(d=>d.id==='reference'),s=defaults(design.palette);s.design=design.id;if(design.id==='navy-gold'){const sizes={title:42,month:42,hijri:45,gregorian:45,yearLabel:30,headers:32,weekday:31,date:33,times:34};for(const key of Object.keys(s.styles)){s.styles[key].font=['times','date'].includes(key)?'Times New Roman':'AoqatCalendar';s.styles[key].size=sizes[key];}for(const key of ['title','month','hijri','gregorian','yearLabel']){s.styles[key].bg='#112f47';s.styles[key].color=['title','month'].includes(key)?'#ffffff':'#ead9b1';}}if(['iraqi-paper','minimal-modern','islamic-corners'].includes(design.id)){const sizes={title:42,month:42,hijri:45,gregorian:45,yearLabel:30,headers:32,weekday:31,date:33,times:34},accent={'iraqi-paper':'#317955','minimal-modern':'#167f84','islamic-corners':'#b39859'}[design.id];for(const key of Object.keys(s.styles)){s.styles[key].font=['times','date'].includes(key)?'Times New Roman':'AoqatCalendar';s.styles[key].size=sizes[key];}for(const key of ['hijri','gregorian','yearLabel'])s.styles[key].color=accent;if(design.id==='minimal-modern')s.styles.date.color=accent;}if(design.id==='iraqi-paper')for(const key of ['title','month','hijri','gregorian','yearLabel'])s.styles[key].bg='#f2f3df';return s;}
 const color=(x,f)=>/^#[0-9a-f]{6}$/i.test(x||'')?x:f,fonts=['AoqatCalendar','Arial','Times New Roman'];
 function defaults(index=0){const p=palettes[index]||palettes[0],styles={};for(const [id,g] of Object.entries(groups))styles[id]={font:'Times New Roman',size:g.size,color:id==='headers'?p.headInk:id==='title'||id==='month'?p.title:p.ink,bg:id==='headers'?p.head:id==='times'?p.times:id==='weekday'?p.day:id==='date'?p.date:p.page};return {referenceLayoutVersion:1,navyLayoutVersion:2,typographyVersion:2,design:'reference',page:p.page,border:p.border,styles,reminder:{enabled:false,time:'18:00'},years:[]};}
 function normalize(raw){raw=raw&&typeof raw==='object'?raw:{};const d=defaults();d.design=designs.some(v=>v.id===raw.design)?raw.design:d.design;d.page=color(raw.page,d.page);d.border=color(raw.border,d.border);for(const id of Object.keys(groups)){const v=raw.styles?.[id]||{},s=d.styles[id];s.font=fonts.includes(v.font)?v.font:s.font;if(raw.typographyVersion!==2&&s.font==='AoqatCalendar')s.font='Times New Roman';s.size=Number.isFinite(Number(v.size))?Math.max(16,Math.min(64,Math.round(Number(v.size)))):s.size;s.color=color(v.color,s.color);s.bg=color(v.bg,s.bg);}if(d.design==='navy-gold'&&raw.navyLayoutVersion!==2){const preset=designDefaults('navy-gold');if(d.border==='#bb9850')d.border=preset.border;for(const id of Object.keys(groups)){d.styles[id].font=preset.styles[id].font;d.styles[id].size=preset.styles[id].size;if(['title','month','headers'].includes(id))d.styles[id].color='#ffffff';if(['times','weekday','date'].includes(id)&&d.styles[id].bg==='#ffffff')d.styles[id].bg=preset.styles[id].bg;}}if(['iraqi-paper','minimal-modern','islamic-corners'].includes(d.design)&&raw.referenceLayoutVersion!==1){const preset=designDefaults(d.design);d.styles=preset.styles;d.page=preset.page;d.border=preset.border;}d.reminder.enabled=raw.reminder?.enabled===true;d.reminder.time=/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(raw.reminder?.time||'')?raw.reminder.time:d.reminder.time;d.years=Array.isArray(raw.years)?[...new Set(raw.years.filter(y=>Number.isInteger(y)&&y>=2026&&y<=2200))].sort((a,b)=>a-b):[];return d;}
 function baghdad(now=new Date()){const p={};for(const v of new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Baghdad',year:'numeric',month:'numeric',day:'numeric',hour:'numeric',minute:'numeric',hourCycle:'h23'}).formatToParts(now))if(v.type!=='literal')p[v.type]=Number(v.value);return {year:p.year,month:p.month,day:p.day,hour:p.hour,minute:p.minute};}
 function hijri(date){const p={};for(const x of new Intl.DateTimeFormat('en-US-u-ca-islamic-umalqura',{timeZone:'UTC',year:'numeric',month:'numeric',day:'numeric'}).formatToParts(date))p[x.type]=x.value;return {year:Number(p.year),month:Number(p.month),day:Number(p.day),monthName:new Intl.DateTimeFormat('ar-IQ-u-ca-islamic-umalqura',{timeZone:'UTC',month:'long'}).format(date)};}
 function build(year,month,rows){if(!Number.isInteger(year)||year<2026||year>2200||!Number.isInteger(month)||month<1||month>12)throw Error('اختر سنة من 2026 إلى 2200 وشهراً صحيحاً.');const count=new Date(Date.UTC(year,month,0)).getUTCDate(),data=[],missing=[];
  for(let day=1;day<=count;day++){const row=rows.find(r=>Number(r.gregorian_month)===month&&Number(r.gregorian_day)===day),date=new Date(Date.UTC(year,month-1,day,12)),times={};if(!row||!fields.every(id=>/^(?:[01]?\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/.test(String(row[id]||''))))missing.push(day);for(const id of fields)times[id]=row?.[id]||'—';data.push({day,weekday:weekdays[date.getUTCDay()],hijri:hijri(date),times});}
  const start=data[0].hijri,end=data.at(-1).hijri;return {year,month,monthName:months[month-1],days:data,missing,hijriYear:start.year===end.year?String(start.year):start.year+' – '+end.year,hijriMonths:start.month===end.month?start.monthName:start.monthName+' – '+end.monthName};
 }
 function reminderEvent(now,raw){const s=normalize(raw);if(!s.reminder.enabled)return null;const p=baghdad(now),last=new Date(Date.UTC(p.year,p.month,0)).getUTCDate(),[h,m]=s.reminder.time.split(':').map(Number);if(p.day!==last||p.hour*60+p.minute<h*60+m)return null;const next=new Date(Date.UTC(p.year,p.month,1)),y=next.getUTCFullYear(),month=next.getUTCMonth()+1;return {key:'calendar-publish-'+p.year+'-'+p.month,kind:'calendar-post-reminder',section:'calendar',action:'post',title:'تذكير بنشر تقويم '+months[month-1]+' '+y,body:'اقترب انتهاء شهر '+months[p.month-1]+'. تقويم الشهر القادم جاهز للمعاينة والمشاركة على الهاتف.',targetDate:y+'-'+String(month).padStart(2,'0')+'-01',year:y,month};}
 const api={months,weekdays,fields,groups,palettes,designs,fonts,defaults,designDefaults,normalize,baghdad,hijri,build,reminderEvent};root.AoqatMonthlyCalendarsCore=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window==='undefined'?globalThis:window);

;

/* js/monthly-calendars-renderer.js */
/* Embedded Aoqat Navy Numerals subset of DejaVu Serif.
Copyright: Copyright (c) 2003 by Bitstream, Inc. All Rights Reserved.
 Bitstream Vera is a trademark of Bitstream, Inc.
 DejaVu changes are in public domain.
License: bitstream-vera
 Permission is hereby granted, free of charge, to any person obtaining a copy
 of the fonts accompanying this license ("Fonts") and associated
 documentation files (the "Font Software"), to reproduce and distribute the
 Font Software, including without limitation the rights to use, copy, merge,
 publish, distribute, and/or sell copies of the Font Software, and to permit
 persons to whom the Font Software is furnished to do so, subject to the
 following conditions:
 .
 The above copyright and trademark notices and this permission notice shall
 be included in all copies of one or more of the Font Software typefaces.
 .
 The Font Software may be modified, altered, or added to, and in particular
 the designs of glyphs or characters in the Fonts may be modified and
 additional glyphs or characters may be added to the Fonts, only if the fonts
 are renamed to names not containing either the words "Bitstream" or the word
 "Vera".
 .
 This License becomes null and void to the extent applicable to Fonts or Font
 Software that has been modified and is distributed under the "Bitstream
 Vera" names.
 .
 The Font Software may be sold as part of a larger software package but no
 copy of one or more of the Font Software typefaces may be sold by itself.
 .
 THE FONT SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
 OR IMPLIED, INCLUDING BUT NOT LIMITED TO ANY WARRANTIES OF MERCHANTABILITY,
 FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT OF COPYRIGHT, PATENT,
 TRADEMARK, OR OTHER RIGHT. IN NO EVENT SHALL BITSTREAM OR THE GNOME
 FOUNDATION BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, INCLUDING
 ANY GENERAL, SPECIAL, INDIRECT, INCIDENTAL, OR CONSEQUENTIAL DAMAGES,
 WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF
 THE USE OR INABILITY TO USE THE FONT SOFTWARE OR FROM OTHER DEALINGS IN THE
 FONT SOFTWARE.
 .
 Except as contained in this notice, the names of Gnome, the Gnome
 Foundation, and Bitstream Inc., shall not be used in advertising or
 otherwise to promote the sale, use or other dealings in this Font Software
 without prior written authorization from the Gnome Foundation or Bitstream
 Inc., respectively. For further information, contact: fonts at gnome dot
 org.

*/
(function(){'use strict';if(window.AndroidNative?.configureAdhan)return;const C=window.AoqatMonthlyCalendarsCore;if(!C)return;
 let loaded;function font(){if(!loaded)loaded=(async()=>{const f=new FontFace('AoqatCalendar','url("/assets/fonts/amiri-quran.ttf")');await f.load();document.fonts.add(f);const numerals=new FontFace('AoqatNavyNumerals','url(data:font/woff;base64,d09GRgABAAAAABBwABIAAAAAFVgAAl64AAAAAAAAAAAAAAAAAAAAAAAAAABHREVGAAAPmAAAABYAAAAWABEADEdQT1MAAA+wAAAAIAAAACBEdkx1R1NVQgAAD9AAAAA7AAAAPACs9pZNQVRIAAAQDAAAAGIAAAD2CT8ykU9TLzIAAAIMAAAASgAAAFZsAnBRY21hcAAAAoQAAAAsAAAANAAMAI1jdnQgAAAGqAAAAScAAAGUjzOr9GZwZ20AAAKwAAAAZgAAAIvngPHEZ2FzcAAAD4wAAAAMAAAADAAHAAdnbHlmAAAH7AAABpkAAAgovHfSPmhlYWQAAAGUAAAANgAAADYr2kxBaGhlYQAAAcwAAAAgAAAAJBIgC7dobXR4AAACWAAAACkAAAAwOmUHD2xvY2EAAAfQAAAAGgAAABoNNAsdbWF4cAAAAewAAAAgAAAAIARqBTNuYW1lAAAOiAAAAO0AAAGYIW0503Bvc3QAAA94AAAAEwAAACD/2wBacHJlcAAAAxgAAAOPAAAFXnV5BvYAAQAAAAJeuMPC4k5fDzz1AB8IAAAAAADg+tE5AAAAAOD60Tn52P06ENgI4AAAAAgAAgAAAAAAAHicY2BkYGDP/SfLwCAo+/PGnwKBGwxAERTAAwCO8wXxAAEAAAAMAgkAKwCYAAgAAgAQAJkABwAABAsB8wAIAAR4nGNgZJFinMDAysDAasw6k4GBUQ5CM19nSGMSYmBgYmNjZmVjZWJiYQBKMiCBgDTXFAYHBgMGKzaRfyKMs9hzGR/D1AAAaJ8JKAAAeJxjOcuQxirO0A7Ev4C4G4jnALE9EK8D4k4gXgOlG5k2MVwFAOHuCa0AAAB4nGNgYGBiYGBgBmIRIMkIplkYFIA0CxCC+Fb//wNJg////18E8xkAUdwGlnic28bGysLMxMigoyCwgUnVM2WDQ2CEwolIRV0dNK6CALvCBoaADbyVCjv+/w+IYJFmjdzAKrOBWZVjA4uq8kNckg91dbwDIhQ2nHR1gZrqmuACFAuOADJBPKAwUNzVRRcADHApAgAAeJzNkftXVFUUx8XP2crcYZ73ooPpgMKEigzjVUsR6YIYGZUWq3eTVldBB1/lq3R0LF0iKALaiI/KR2tV2kNrVei0Vmha/0Z/Bz8cO61+79fav+yz1/m+zj7jUwven39ofrd5cL9OHvg88NT9On4Lce9uvdzzuVvPRJZf8/wSpBTkzm1H7rjcdhh3+Vnzk+ZHzQ+a7zW3bnbKrUludvKd5ts832i+DnPjeoXccLhewVcuX/p8keRzl2tXfbmmuepzpRiWKyku77fkcorPuvg0yidpLvUn5ZLm4oWoXJzDhSjnx8JyPsWYwY2FGfPUOUM853CuoIphip76OMXZoxk5qzkzasuZFKMjIRm1GR0v87yAGhm2ZCTEyHjZFG+tGrYYnlCnd+TldImhI0EZijHkqVPmdKqZk4MlOakZHMjKYInBgho4kZKBLAOeOmFynUjRfzwm/Un6xx9OeA/V8RjHjPUxn6MZPprBh0WOBCn4vhQ0h/uicriKQ/mwHHLJhzl4ICIHbQ5E+KDI+zH2W+zbWyP7Jtm7Z7bsrWHPbHYb0u4k72ne1ezaGZJdmp0hdnpqR57t21ple45trfTlKqQvSl9B5SrIeWqrsdw6yZbekmzR9PZkpbdEb0H1bE5JT5YeT21OscmANk3i+7xTyduatzQbN6Rlo2ZDmjc1Wc0bXbye5zXNqx28onlZ81KJFzXdPi84PO+yfl1E1udZF+G5Nq+dZ4I87bN2XrmsLfKUSydR6bR5Ms6aqZasqaJjtS0dOVa3R2W1TXtbUNqjtHkBaQviBfD+3mO3eqJIq2qU1mdZ1eLIqi5aVlrS4tDiqZUWzSvi0pxlxfKYrIizPMbjIR7TLFvqyDLN0iW2LHVY4lqyxMZdHBDXwv3nfxYHyDQlJNNBU7pSmhI0Tah00pJ0JemCagz40lhkUYMji7poMI9ocGjw1EITfaHPgvkZWdDGfBNsfoZ60+o1jzaTCiUklaWuNi513dQaWm2cWk/NK2duTULmZqmpjklNgpoJVW3MqmNUF1TSIumpObXMjvBIHbOqMjKrmyqjWpUhoZlpTGdqZkSpdBypzOHYtjgOjqdsm7jBxUvEzHpjmqhp0XYiJn+kSNjchTUhIxBKEPJUhSZohqC3PIdlMFaegE/59JiUO0yPMU1cmZZHDE9clBFTjRjRqRZl3UzRlI2X+cdOlTX8b2vKfx3gX2vOXyvHNBIAeJwtTy1rw1AUPfe9l3SEypqJ6hI1UTlqxkQJo5RSMVERKiLiRsVEiBpjqnaiKqIqvyCMMagOUSWU/oCKuempnfcyDpd337kf51wJsIFChZo4MntAiie8oWB+Qeb4g7myIHP2bO8RlYTsUxZyA/D94p4xaxf2J/wXWLv6r24cdrpRz1B6zmzuJgpU+tYY3XThpmpM8IHS5l6Dd/YtcCLuuD3CJ87ygr20yLHFxrCMoQReSy8p1l7r8IOVU7Zc6rX+gEqpBJyuse94CWWhY53IIy9UUuop2VekJiZGDvfuvu4GpTLq/9+LRq1UaEZSUsdqNNxfYkK/CZ1OGcr6198odJ8Or70Dol7k98Xv5Viymumx7PwhYuR6yQ0zclvM5EQVDPAH/udREwAAAAAAAEEAlADsAVABxAJOAr0DDANyA98EFAAAeJxVlX9sE+cZx9/n3rvXufM59yO+2HWwzz/isJSVmASDLWXMtFO6NTir1qiiZW7TNrcRGn6NMMhabV35IyERAbo2MRUlpesfG6UhmShilYiqNOsPVV26LsAo05AWthXJZNHq0Yglb/aeHa9Mp7NO7z2yvt/n+3meQxzqWZrhDwtzyIk8KJKqQJZMLL1DbvNiYrhFoji9aj6Xz61B6vV8Tp2NRet1TeUiYU5TdU8YaSpqqLd/uf5j2ewx+/6C/hO0L/Kg0rkmeBAeglZ4kI7S0/RNOvoUZGEH7IQs3UqP0hfoVgToNkI4zxRIaH9qBd8uEAG3EyGNCQ8C6SiDPUh0aDzinOr05OTC5BpUl6vPT2pJLRlrfmizg7/pUPmbj4SheVRq3XyBGUmxP3Ui59I7CW194pGUGERBqBPrJD7DapyFmqV3ijUoVagJxUOaEI82aCEDIsDTP0JnH/Db+M/ePZC7/ZNtiBX3I8S3MJUrUDoVkt1IcaEurt1nCR2ufZrbJXuQBB5SVi6poDv9an5yOjfN+qUlk0mmePbWLJ1VmehkLOVskpqcTXKTu8kQIAMRbQM01POGG4gDQnGmIQ4bIL62JhImQHY9fWXrDSinv/fKtIfbuXfhG/C7wede6Tt8nN8NUrLxrxNX6ZSHvTtPX98Ok4P/6Rs6NWDrPc5y/RnTezfTu0r0W2ZFl255LFOp7UJWjYU7lLZVwYDoj9RKKEKIj8huCencKqY895X0ZDH3hZz6nm1gNhmrsNVWGm7iCIDh5kPhmpVaQ4CdrWOSV0G8+MC0OyLv77382NVbp46f/4j+g87vvbZjlzRy4tjYudHH68+cOdLT85JrlzD49dUXftXzVtB3+Y0/XKtvgPCRF8deHn3rB0dfOND/3E8Rh77J+j7KfHBIQ8OpKNcuSiK0S5KYBklGe8odqrBH6sBcGU+Q5sKKs4zT1fx0I0OlkfWb9f76QuN0Y65+GRfV5kVgvPymTgTInAuKQVewHBfRaB6VW7c0j7rsH6V1CyNFL5Cis6tISsrrBB8k4DvAE66S+5q0jktI93PflhwZlAFNLCVooxTSGriPKIfPLW6eW+ziBt4DP52Zg9vYt/B3SrZBdDvOL0hP06t2XiMsr27hIjLRm6koJv79PouoXYrltogM+9CTclvQr3FSAHmIGNAkhQuyuWSQTdpBLU9nISN6XU/GmBux1Xb0PyPBghE2CstGWIXOKiqKLwszE7SLii5rFKzwiqAQxaGUKXcpPqVKWaH4lYCsIAVMZEIdqgNie2Y2bSSQ4Ub/D0OBAY0ni61r+x/+F3jp35bQD/+0e7f4y1+cOPXr4UcPxh8WLr5OW6uraf7zm/RLO/2BwU/enZhK3cfNIpb4QdaTwcJuiqKnUmEZEUtBlmF2BrojVlWH0VYTlAKVmOiGTETB66xhLcl9ta0YtbOXWHdiqagoiy6NVwWVqA6trEKucKnlqqKqmlYr17pazJZgS0jPREu6DXclLpmKFJZcqL7SY0RWA1t83IlD2eyhw4PZ337rdOc1wPTGjUU6B/dC9LsjW3bLz++YGG+ampiY+uDC+5e4ueYHmLsZthK74THohZFA4Ja1jX7G2n2akX2AJV6GfpTyY8xOOAyA0gLgfY4nAXOAES8hwon2TGoem+V8roSxsIxxIWkWoVjIV2TXHfna54VoRft94fysB7yYy4hsz4WMiBbiDyyef4m7Z7FlL74s7Lx9VFhzHr6PcKH3h5a/C3VoQypc7cWWIVoBxbq7I9AWq/bKurBSFu5BpMogZGXIGbNl5kuro/TBuDTLdh6UusrIwHc8F3dIJFwdX7tu/Wq29NYVdwt+e/jIkWH7ru179pn+/mee7es8NU5vzX9J/z3+xtDJ+StX5k9C9tWxsVdPjo3hH/dms70Hs9kPPR8Pfzoz8+nwx56qM71np6bO9p6xOfr5spe7GEeZVDXyBS1c0al3eywF+yyRrcIat6QjEhFkw0/0SmKTdJ15YfqLPtiU2evPZqnKBJMzscmbghkwTTNohszwxoqN7o2GKwPljBAUX7v8UbQHIl4YCB1KnhlhePy+ke1/oUvgubEICh2nf2bk7HI9v31inI4PDA0NDAxluVeaHwD58xnQaA99je6n3wsE5q1OiPJhBtcnHzK4mLOLSzNwDXcXUjJTCn5CNJ5QxDavTpCMvKq992wDdiax9aXuRsI12h3PF9OJRHpTMrkpnUhu2pRMpLcmWlrYUZqbXD5H/wVA+HJ/AAAAeJxdjrtOw0AQRY+JeeULUlCsKBBICKGkoObR0KQgEgWdE0wwkDjEIRI/x9dQ8hEcbwyKotHunNm9c2eAXR5okaT7wJdnxQlHViveYo/vhlt0+Gk4XdNs00nShnc4TA64pmTGJ3MKxjyzIHDMiBNzl3OjJw1VBK7ULKg8c3IyJpz6estU/Zl0yZsRuPv3qmKVm3N7lt6PKtvcSC863POhYqQ202UclUGu/YMuU++ZmqG+hbpgf+ncLP61nVjyblVv3Tcv4559OyZxYmZf5d6l8boxdRAVBU/WNVVyGSd23bHHxZr7n/eG8y+ozT1fAAAAeJxjYGYAg/83GKIYsAAAMy8CNQAAAAACAAgAAv//AAMAAQAAAAwAAAAAAAAAAgABAAEACwABAAAAAQAAAAoAHAAeAAFERkxUAAgABAAAAAD//wAAAAAAAHicY2BkYGDgYrBgsGJgdXHzCWFQSK4symHQSi9KzWbQykksyWPQyk0syWDQYmABqmT4/58BDgBUQgszAHicY2BkYGDgYnjA8IIhgMGGh4H9LpDPwNTEwMCizsDAepUBDEBsZADjM2ZA2aEMBAEjH9DcMsLqGKIgakE0nI1kBop4FBI/GcFmsmBg+N0PZNvAtWoAfckFMYSBAQDCfw0AAAA=)',{unicodeRange:'U+0030-003A'});await numerals.load();document.fonts.add(numerals);await document.fonts.ready;})().catch(e=>{loaded=null;throw e;});return loaded;}
 async function render(model,raw,scale=1){
  await font();if(raw?.design==='navy-gold')return renderNavy(model,C.normalize(raw),scale);if(['iraqi-paper','minimal-modern','islamic-corners'].includes(raw?.design))return renderReference(model,C.normalize(raw),scale);const s=C.normalize(raw),wide=s.design==='landscape',navy=s.design==='navy-gold',iraqi=s.design==='iraqi-paper',minimal=s.design==='minimal-modern',islamic=s.design==='islamic-corners',newDesign=navy||iraqi||minimal||islamic,titleOffset=navy?39:newDesign?40:s.design==='architectural'?30:18,canvas=document.createElement('canvas'),ctx=canvas.getContext('2d'),fractions=navy?[.16,.1,...Array(6).fill(.74/6)]:[.165,.11,...Array(6).fill(.725/6)],labels=['الأيام','التاريخ','الفجر','الشروق','الظهر','العصر','المغرب','العشاء'];
  // Reserve real space for the chosen font instead of silently shrinking it.
  const columnMin=labels.map((label,i)=>{const id=i===0?'weekday':i===1?'date':'times',samples=i===0?model.days.map(r=>r.weekday):i===1?model.days.map(r=>String(r.day)):model.days.map(r=>r.times[C.fields[i-2]]);
   ctx.font=s.styles[id].size+'px "'+s.styles[id].font+'", serif';const body=Math.max(...samples.map(v=>ctx.measureText(v).width));
   ctx.font=s.styles.headers.size+'px "'+s.styles.headers.font+'", serif';return Math.ceil(Math.max(body,ctx.measureText(label).width)+16);
  }),edge=islamic?54:newDesign?40:s.design==='architectural'?28:20,minTable=columnMin.reduce((a,b)=>a+b,0),W=Math.max(wide?1580:newDesign?1200:1080,Math.ceil((navy?Math.max(...columnMin.map((v,i)=>v/fractions[i])):minTable)*(wide?2:1)+(wide?20:0)+edge*2)),yearHeight=Math.max(64,Math.ceil(Math.max(s.styles.hijri.size,s.styles.gregorian.size,s.styles.yearLabel.size)*1.35)),tableTop=titleOffset+92+6+yearHeight+(navy?21:12),rowCount=Math.ceil(model.days.length/(wide?2:1)),rowMinimum=Math.ceil(Math.max(s.styles.weekday.size,s.styles.date.size,s.styles.times.size)*1.2),H=Math.max(wide?1080:newDesign?1720:1580,tableTop+Math.max(44,Math.ceil(s.styles.headers.size*1.5))+rowMinimum*rowCount+28);
  canvas.width=Math.round(W*scale);canvas.height=Math.round(H*scale);ctx.scale(scale,scale);ctx.fillStyle=s.page;ctx.fillRect(0,0,W,H);ctx.direction='rtl';ctx.textBaseline='middle';

  function box(x,y,w,h,fill){ctx.fillStyle=fill;ctx.fillRect(x,y,w,h);}
  function text(value,x,y,w,id,height){const g=s.styles[id];let n=g.size;ctx.save();ctx.beginPath();ctx.rect(x,y-(height||90)/2,w,height||90);ctx.clip();ctx.textAlign='center';ctx.fillStyle=g.color;ctx.font=n+'px "'+g.font+'", serif';ctx.fillText(String(value),x+w/2,y);ctx.restore();}
  const geometric=s.design==='geometric',ledger=s.design==='ledger',architectural=s.design==='architectural',inner=W-edge*2;
  if(navy){box(0,0,W,tableTop-32,s.styles.title.bg);box(0,tableTop-32,W,3,s.border);}
  if(minimal){box(edge-10,titleOffset,6,yearHeight+92,s.border);}
  if(iraqi)box(edge-12,titleOffset-12,inner+24,yearHeight+110,s.styles.title.bg);
  if(islamic){ctx.strokeStyle=s.border;ctx.lineWidth=2;ctx.strokeRect(20,20,W-40,H-40);ctx.lineWidth=1;ctx.strokeRect(29,29,W-58,H-58);for(const [x,y,sx,sy] of [[32,32,1,1],[W-32,32,-1,1],[32,H-32,1,-1],[W-32,H-32,-1,-1]]){ctx.save();ctx.translate(x,y);ctx.scale(sx*.3,sy*.3);ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(0,60);ctx.lineTo(0,0);ctx.lineTo(60,0);for(const radius of [26,18]){ctx.moveTo(32-radius,32);ctx.lineTo(32,32-radius);ctx.lineTo(32+radius,32);ctx.lineTo(32,32+radius);ctx.closePath();}ctx.stroke();ctx.restore();}}
  if(geometric)box(0,0,W,10,s.border);
  if(ledger){box(0,0,10,H,s.border);box(W-10,0,10,H,s.border);}
  if(architectural){ctx.strokeStyle=s.border;ctx.lineWidth=3;ctx.strokeRect(8,8,W-16,H-16);ctx.lineWidth=1;ctx.strokeRect(16,16,W-32,H-32);for(const x of [edge,W-edge]){ctx.beginPath();ctx.moveTo(x,22);ctx.lineTo(x===edge?x+80:x-80,22);ctx.stroke();}}
  // A single RTL line, with independently styled runs and uniform font fitting.
  // Letter proportions stay natural: there is no horizontal canvas scaling.
  const titleTop=titleOffset,titleH=92,titleY=titleTop+titleH/2;
  const runs=[{id:'title',value:'مواقيت الصلاة لمدينة الحويجة و ضواحيها لشهر'},{id:'month',value:model.monthName+' ['+model.month+']'}];
  let factor=1;
  function widths(){return runs.map(r=>{const g=s.styles[r.id];ctx.font=(g.size*factor)+'px "'+g.font+'", serif';return ctx.measureText(r.value).width;});}
  let sizes=widths(),gap=14,total=sizes[0]+sizes[1]+gap;
  factor=Math.min(1,(inner-24)/total,64/Math.max(...runs.map(r=>s.styles[r.id].size)));
  sizes=widths();total=sizes[0]+sizes[1]+gap*factor;
  box(edge,titleTop,inner,titleH,s.styles.title.bg);
  ctx.save();ctx.beginPath();ctx.rect(edge,titleTop,inner,titleH);ctx.clip();ctx.textAlign='right';let right=(W+total)/2;
  runs.forEach((r,i)=>{const g=s.styles[r.id],width=sizes[i];if(i)box(right-width-4,titleTop,width+8,titleH,g.bg);ctx.font=(g.size*factor)+'px "'+g.font+'", serif';ctx.fillStyle=g.color;ctx.fillText(r.value,right,titleY);right-=width+gap*factor;});ctx.restore();
  const yearsY=titleTop+titleH+(navy?-11:6),yearH=yearHeight;
  for(const [id,value,x,w] of [['gregorian',model.year+' م',edge,inner*.34],['yearLabel','لسنة',edge+inner*.34,inner*.32],['hijri',model.hijriYear+' هـ',edge+inner*.66,inner*.34]]){box(x,yearsY,w,yearH,s.styles[id].bg);text(value,x+6,yearsY+yearH/2,w-12,id,yearH);}
  const top=navy?tableTop:yearsY+yearH+12,bottom=H-edge;
  if(ledger||architectural){box(edge,top-6,inner,2,s.border);}
  function table(rows,left,width){const header=Math.max(navy?51:44,Math.ceil(s.styles.headers.size*1.5)),rowH=(bottom-top-header)/Math.ceil(wide?model.days.length/2:model.days.length),columns=[{id:'weekday',label:'الأيام'},{id:'date',label:'التاريخ'},...C.fields.map((id,i)=>({id,label:['الفجر','الشروق','الظهر','العصر','المغرب','العشاء'][i]}))];let right=left+width;
   columns.forEach((col,i)=>{col.width=navy?Math.max(columnMin[i],width*fractions[i]):columnMin[i]+(width-minTable)*fractions[i];col.x=right-col.width;right=col.x;box(col.x,top,col.width,header,s.styles.headers.bg);text(col.label,col.x+4,top+header/2,col.width-8,'headers',header);});
   rows.forEach((row,i)=>{const y=top+header+i*rowH;for(const col of columns){const id=col.id==='weekday'?'weekday':col.id==='date'?'date':'times',value=id==='weekday'?row.weekday:id==='date'?row.day:row.times[col.id];box(col.x,y+(ledger?2:0),col.width,rowH-(ledger?4:0),s.styles[id].bg);if((geometric||ledger||navy||minimal||islamic)&&i%2===0){ctx.save();ctx.globalAlpha=navy?1:.65;box(col.x,y,col.width,rowH,s.page);ctx.restore();}if(row.weekday==='الجمعة'){ctx.fillStyle=s.border;ctx.globalAlpha=.12;ctx.fillRect(col.x,y,col.width,rowH);ctx.globalAlpha=1;}text(value,col.x+4,y+rowH/2,col.width-8,id,rowH);}});
   const end=top+header+rows.length*rowH;ctx.strokeStyle=s.border;ctx.lineWidth=1;for(const x of ((geometric||ledger||navy||minimal)?[]:[left,...columns.map(c=>c.x+c.width)])){ctx.beginPath();ctx.moveTo(x,top);ctx.lineTo(x,end);ctx.stroke();}for(const y of ((ledger||minimal)?[top,top+header]:[top,top+header,...rows.map((_,i)=>top+header+(i+1)*rowH)])){ctx.beginPath();ctx.moveTo(left,y);ctx.lineTo(left+width,y);ctx.stroke();}if(geometric){box(left+width-5,top,5,end-top,s.border);}if(navy)box(left,end+12,width,3,s.border);
  }
  if(wide){const count=Math.ceil(model.days.length/2),gap=20,width=(inner-gap)/2;table(model.days.slice(0,count),edge+width+gap,width);table(model.days.slice(count),edge,width);}else table(model.days,edge,inner);
  canvas.calendarFontSizes={title:s.styles.title.size*factor,month:s.styles.month.size*factor};return canvas;
 }
 // The approved conversation mockup has its own renderer; unrelated layouts are untouched.
 function renderNavy(model,s,scale){
  const canvas=document.createElement('canvas'),c=canvas.getContext('2d'),ratio=[.16,.1,...Array(6).fill(.74/6)],labels=['الأيام','التاريخ','الفجر','الشروق','الظهر','العصر','المغرب','العشاء'],margin=40;
  const setFont=(g,size=g.size)=>{c.textRendering=g.font==='Times New Roman'?'geometricPrecision':'auto';c.font=size+'px "'+(g.font==='Times New Roman'?'AoqatNavyNumerals':g.font)+'", serif';};
  let W=1200;for(let i=0;i<8;i++){const id=i===0?'weekday':i===1?'date':'times',values=i===0?model.days.map(r=>r.weekday):i===1?model.days.map(r=>String(r.day)):model.days.map(r=>r.times[C.fields[i-2]]);setFont(s.styles[id]);const body=Math.max(...values.map(v=>c.measureText(v).width));setFont(s.styles.headers);W=Math.max(W,Math.ceil((Math.max(body,c.measureText(labels[i]).width)+8)/ratio[i]+margin*2));}
  const yearExtra=Math.max(0,Math.max(s.styles.hijri.size,s.styles.gregorian.size,s.styles.yearLabel.size)-48),top=222+yearExtra,header=Math.max(51,s.styles.headers.size*1.5),rowMin=Math.max(s.styles.weekday.size,s.styles.date.size,s.styles.times.size)*1.2,H=Math.max(1720,Math.ceil(top+header+rowMin*model.days.length+40)),tw=W-margin*2,bottom=H-40,rh=(bottom-top-header)/model.days.length;
  canvas.width=Math.round(W*scale);canvas.height=Math.round(H*scale);c.scale(scale,scale);c.direction='rtl';c.textBaseline='middle';
  const rect=(x,y,w,h,col)=>{c.fillStyle=col;c.fillRect(x,y,w,h);};
  const line=(x,y,x2,y2,col,width=1)=>{c.strokeStyle=col;c.lineWidth=width;c.beginPath();c.moveTo(x,y);c.lineTo(x2,y2);c.stroke();};
  function text(t,x,y,width,id){c.save();c.fillStyle=s.styles[id].color;c.textAlign='center';setFont(s.styles[id]);c.fillText(String(t),x+width/2,y);c.restore();}
  rect(0,0,W,H,s.page);rect(0,0,W,190+yearExtra,s.styles.title.bg);rect(0,190+yearExtra,W,4,'#bb9850');
  const title='مواقيت الصلاة لمدينة الحويجة و ضواحيها لشهر',month=model.monthName+' ['+model.month+']',a=s.styles.title,b=s.styles.month;
  setFont(a);const aw=c.measureText(title+' ').width;setFont(b);const bw=c.measureText(month).width;
  const factor=Math.min(1,(tw-12)/(aw+bw));
  if(a.font===b.font&&a.size===b.size&&a.color===b.color){c.save();c.fillStyle=a.color;c.textAlign='center';setFont(a,a.size*factor);c.fillText(title+' '+month,W/2,85);c.restore();}
  else{c.save();c.textAlign='right';let right=(W+(aw+bw)*factor)/2;for(const [v,g,width] of [[title+' ',a,aw],[month,b,bw]]){c.fillStyle=g.color;setFont(g,g.size*factor);c.fillText(v,right,85);right-=width*factor;}c.restore();}
  text(model.year+' م',margin,152+yearExtra,tw*.32,'gregorian');text('لسنة',margin+tw*.36,152+yearExtra,tw*.28,'yearLabel');text(model.hijriYear+' هـ',margin+tw*.68,152+yearExtra,tw*.32,'hijri');
  let right=W-margin;const columns=ratio.map((f,i)=>{const w=tw*f,col={i,x:right-w,w};right-=w;return col;});
  for(const col of columns){rect(col.x,top,col.w,header,s.styles.headers.bg);text(labels[col.i],col.x+4,top+header/2,col.w-8,'headers');}
  for(const [i,row] of model.days.entries()){const y=top+header+i*rh,friday=row.weekday==='الجمعة';for(const col of columns){const id=col.i===0?'weekday':col.i===1?'date':'times',bg=friday?'#f3e7cb':i%2?s.styles[id].bg:s.page;rect(col.x,y,col.w,rh,bg);const value=col.i===0?row.weekday:col.i===1?String(row.day):row.times[C.fields[col.i-2]];text(value,col.x+4,y+rh/2,col.w-8,id);}line(margin,y+rh,W-margin,y+rh,s.border,.8);}
  rect(margin,bottom+13,tw,3,'#bb9850');canvas.calendarFontSizes={title:a.size*factor,month:b.size*factor};return canvas;
 }
 function renderReference(model,s,scale){
  const canvas=document.createElement('canvas'),c=canvas.getContext('2d'),ratio=[.16,.1,...Array(6).fill(.74/6)],labels=['الأيام','التاريخ','الفجر','الشروق','الظهر','العصر','المغرب','العشاء'],iraqi=s.design==='iraqi-paper',modern=s.design==='minimal-modern',ornate=s.design==='islamic-corners',margin=ornate?54:40;
  const setFont=(g,size=g.size)=>{c.textRendering=g.font==='Times New Roman'?'geometricPrecision':'auto';c.font=size+'px "'+(g.font==='Times New Roman'?'AoqatNavyNumerals':g.font)+'", serif';};
  let W=1200;for(let i=0;i<8;i++){const id=i===0?'weekday':i===1?'date':'times',values=i===0?model.days.map(r=>r.weekday):i===1?model.days.map(r=>String(r.day)):model.days.map(r=>r.times[C.fields[i-2]]);setFont(s.styles[id]);const body=Math.max(...values.map(v=>c.measureText(v).width));setFont(s.styles.headers);W=Math.max(W,Math.ceil((Math.max(body,c.measureText(labels[i]).width)+8)/ratio[i]+margin*2));}
  const yearExtra=Math.max(0,Math.max(s.styles.hijri.size,s.styles.gregorian.size,s.styles.yearLabel.size)-48),top=222+yearExtra,header=Math.max(51,s.styles.headers.size*1.5),rowMin=Math.max(s.styles.weekday.size,s.styles.date.size,s.styles.times.size)*1.2,H=Math.max(1720,Math.ceil(top+header+rowMin*model.days.length+(ornate?55:40))),tw=W-margin*2,bottom=H-(ornate?55:40),rh=(bottom-top-header)/model.days.length;
  canvas.width=Math.round(W*scale);canvas.height=Math.round(H*scale);c.scale(scale,scale);c.direction='rtl';c.textBaseline='middle';
  const rect=(x,y,w,h,col)=>{c.fillStyle=col;c.fillRect(x,y,w,h);};
  const line=(x,y,x2,y2,col,width=1)=>{c.strokeStyle=col;c.lineWidth=width;c.beginPath();c.moveTo(x,y);c.lineTo(x2,y2);c.stroke();};
  function text(t,x,y,width,id){c.save();c.fillStyle=s.styles[id].color;c.textAlign='center';setFont(s.styles[id]);c.fillText(String(t),x+width/2,y);c.restore();}
  rect(0,0,W,H,s.page);const accent=s.styles.yearLabel.color;
  if(iraqi){rect(24,24,W-48,170+yearExtra,s.styles.title.bg);line(40,194+yearExtra,W-40,194+yearExtra,accent,3);}
  if(modern){rect(40,30,7,138+yearExtra,accent);line(40,190+yearExtra,W-40,190+yearExtra,s.border,2);}
  if(ornate){c.strokeStyle=accent;c.lineWidth=2;c.strokeRect(20,20,W-40,H-40);c.lineWidth=1;c.strokeRect(29,29,W-58,H-58);for(const [x,y,sx,sy] of [[40,40,1,1],[W-40,40,-1,1],[40,H-40,1,-1],[W-40,H-40,-1,-1]]){c.save();c.translate(x,y);c.scale(sx,sy);c.lineWidth=2;c.beginPath();c.moveTo(0,60);c.lineTo(0,0);c.lineTo(60,0);c.moveTo(6,32);c.lineTo(32,6);c.lineTo(58,32);c.lineTo(32,58);c.closePath();c.moveTo(14,32);c.lineTo(32,14);c.lineTo(50,32);c.lineTo(32,50);c.closePath();c.stroke();c.restore();}}
  const title='مواقيت الصلاة لمدينة الحويجة و ضواحيها لشهر',month=model.monthName+' ['+model.month+']',a=s.styles.title,b=s.styles.month;
  setFont(a);const aw=c.measureText(title+' ').width;setFont(b);const bw=c.measureText(month).width;
  const factor=Math.min(1,(tw-12)/(aw+bw));
  if(a.font===b.font&&a.size===b.size&&a.color===b.color){c.save();c.fillStyle=a.color;c.textAlign='center';setFont(a,a.size*factor);c.fillText(title+' '+month,W/2,85);c.restore();}
  else{c.save();c.textAlign='right';let right=(W+(aw+bw)*factor)/2;for(const [v,g,width] of [[title+' ',a,aw],[month,b,bw]]){c.fillStyle=g.color;setFont(g,g.size*factor);c.fillText(v,right,85);right-=width*factor;}c.restore();}
  text(model.year+' م',margin,152+yearExtra,tw*.32,'gregorian');text('لسنة',margin+tw*.36,152+yearExtra,tw*.28,'yearLabel');text(model.hijriYear+' هـ',margin+tw*.68,152+yearExtra,tw*.32,'hijri');
  let right=W-margin;const columns=ratio.map((f,i)=>{const w=tw*f,col={i,x:right-w,w};right-=w;return col;});
  for(const col of columns){rect(col.x,top,col.w,header,s.styles.headers.bg);text(labels[col.i],col.x+4,top+header/2,col.w-8,'headers');}
  for(const [i,row] of model.days.entries()){const y=top+header+i*rh,friday=row.weekday==='الجمعة';for(const col of columns){const id=col.i===0?'weekday':col.i===1?'date':'times',bg=iraqi?(col.i===0?(friday?'#e1c69d':s.styles.weekday.bg):col.i===1?s.styles.date.bg:friday?'#c5dcb6':i%2?s.styles.times.bg:'#e6efdf'):(friday?(modern?'#deeeeb':'#e5ebd8'):i%2?s.styles[id].bg:s.page);rect(col.x,y,col.w,rh,bg);const value=col.i===0?row.weekday:col.i===1?String(row.day):row.times[C.fields[col.i-2]];text(value,col.x+4,y+rh/2,col.w-8,id);}if(modern&&friday)rect(W-margin-5,y,5,rh,accent);if(!modern)line(margin,y+rh,W-margin,y+rh,s.border,.8);}
  if(!modern)for(const x of [margin,...columns.map(col=>col.x+col.w)])line(x,top,x,bottom,s.border,.8);canvas.calendarFontSizes={title:a.size*factor,month:b.size*factor};return canvas;
 }
 function blob(canvas,type='image/png'){return new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(Error('تعذر تجهيز صورة التقويم.')),type));}
 window.AoqatMonthlyCalendarRenderer={render,blob};
})();

;

/* js/monthly-calendars.js */
(function(){'use strict';if(window.AndroidNative?.configureAdhan)return;
 const C=window.AoqatMonthlyCalendarsCore,R=window.AoqatMonthlyCalendarRenderer,KEY='aoqatMonthlyCalendarsV1',SENT='aoqatMonthlyCalendarsSentV1';if(!C||!R)return;
 const $=id=>document.getElementById(id);let sequence=0,backAction=null,fallbackNotification=null;
 function read(){try{return C.normalize(JSON.parse(localStorage.getItem(KEY)||'{}'));}catch(_){return C.defaults();}}
 function save(s){const value=C.normalize(s);localStorage.setItem(KEY,JSON.stringify(value));return value;}
 const button=(label,fn)=>{const b=document.createElement('button');b.type='button';b.className='main-action';b.textContent=label;b.onclick=fn;return b;};
 function text(tag,value){const e=document.createElement(tag);e.textContent=value;return e;}
 function label(name,input){const e=document.createElement('label');e.append(text('span',name),input);return e;}
 function show(title,back){if($('adhanServicesDialog')&&!$('adhanServicesDialog').hidden)$('adhanServicesBack')?.click();sequence++;const page=document.createElement('section');page.id='monthlyCalendars';page.className='mc-page';backAction=back;window.AoqatWebSettingsNavigation.sub(title,page,'main');return page;}
 function rawRows(){return typeof availablePrayerRows==='function'?availablePrayerRows(false):window.AoqatPrayerBackupRows||[];}
 function model(year,month){const m=C.build(year,month,rawRows());if(m.missing.length)throw Error('مواقيت غير متاحة للأيام: '+m.missing.join('، ')+'. لا يمكن مشاركة تقويم ناقص.');return m;}
 function current(){return C.baghdad(new Date());}
 function open(){const p=show('التقاويم',null),now=current(),s=read();p.classList.add('mc-home');window.aoqatMountDailyCalendar?.(p);p.append(text('h3','التقاويم الشهرية'),text('p','اختر السنة ثم الشهر للمعاينة والمشاركة.'));
  const actions=document.createElement('div');actions.className='mc-actions';actions.append(button('تغيير التصميم',()=>designs(now.year,now.month,open)),button('تنسيق الخط للتقويم',()=>format(now.year,now.month,open)),button('تنبيه نشر تقويم الشهر',reminder));p.append(actions);
  const years=[...new Set([...Array.from({length:5},(_,i)=>now.year+i),...s.years])].sort((a,b)=>a-b),grid=document.createElement('div');grid.className='mc-years';for(const year of years){const b=button('📁 '+year+' م',()=>yearView(year));b.dataset.calendarYear=year;b.append(text('small','12 تقويماً شهرياً'));grid.append(b);}p.append(grid);
  const form=document.createElement('form');form.className='mc-add-year';const input=document.createElement('input');input.type='number';input.min='2026';input.max='2200';input.step='1';input.value=now.year+5;input.setAttribute('aria-label','سنة تقاويم إضافية');const add=button('فتح سنة أخرى',()=>{});add.type='submit';form.append(label('السنة الميلادية',input),add);form.onsubmit=e=>{e.preventDefault();if(!input.reportValidity()||!input.value)return;const year=Number(input.value),settings=read();settings.years.push(year);save(settings);yearView(year);};p.append(form);
 }
 function yearView(year){
  const p=show('تقاويم سنة '+year,open),token=sequence;
  p.classList.add('mc-year-view','mc-year-v5');
  const themes=[
    {id:'luxgrid',name:'1 الشبكة الفاخرة',desc:'شبكة بطاقات مذهبة مع البحث'},
    {id:'arch',name:'2 الشرائح الأنيقة',desc:'قوس إسلامي وفوانيس وتنقل بالسحب'},
    {id:'modernlist',name:'3 القائمة الحديثة',desc:'قائمة بيضاء مصغرة لكل شهر'},
    {id:'seasons',name:'4 الخلفيات الشهرية',desc:'مناظر طبيعية موسمية مختلفة'},
    {id:'colorcards',name:'5 البطاقات الملونة',desc:'أرقام سداسية وألوان متدرجة'},
    {id:'timeline',name:'6 الخط الزمني',desc:'بطاقات متتابعة مع خط زمني'},
    {id:'shelf',name:'7 الرف الجميل',desc:'رف خشبي مع التقاويم ككتب'},
    {id:'flip',name:'8 التقويم التفاعلي',desc:'تقويم معلّق بحلقات مع تقليب'},
    {id:'circles',name:'9 الدوائر العصرية',desc:'دوائر أنيقة بصور الأشهر'},
    {id:'fullscreen',name:'10 العرض الكامل',desc:'إطار مصوّر وشريط معاينات'}
  ];

  // Decorative SVG illustrations are self-contained: no remote image requests and no effect on calendar data.
  const illustration=(kind,n=1)=>{
    const winter=n<=2||n===12, spring=n>=3&&n<=5, summer=n>=6&&n<=8;
    const sky=winter?['#a4d4ee','#e3f2fa']:spring?['#b9dbed','#ffe2c7']:summer?['#67c9df','#f7d7a4']:['#f7b58b','#e7d7b9'];
    const svgStart='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 520" preserveAspectRatio="xMidYMid slice"><defs><linearGradient id="s" x2="0" y2="1"><stop stop-color="'+sky[0]+'"/><stop offset="1" stop-color="'+sky[1]+'"/></linearGradient><linearGradient id="g" x2="0" y2="1"><stop stop-color="#1b7467"/><stop offset="1" stop-color="#062e34"/></linearGradient></defs>';
    let art='';
    if(kind==='seasons'){
      art='<rect width="400" height="520" fill="url(#s)"/><circle cx="300" cy="88" r="45" fill="#fff1b5" opacity=".9"/>';
      if(winter)art+='<path d="M-30 345L105 120 180 255 254 94 440 351Z" fill="#759cb1"/><path d="M54 209L105 120 156 213 130 199 110 182 91 201ZM207 169L254 94 309 190 278 178 254 151 232 184Z" fill="#fff9f1"/><path d="M0 360Q150 310 400 360V520H0" fill="#2f6279"/>';
      else if(spring)art+='<path d="M0 365Q95 280 200 340T400 325V520H0" fill="#74a879"/><path d="M0 435Q170 310 400 430V520H0" fill="#377a68"/><path d="M68 405V270M325 404V254" stroke="#624b40" stroke-width="13"/><g fill="#f4b4c9"><circle cx="65" cy="263" r="52"/><circle cx="330" cy="251" r="55"/><circle cx="102" cy="292" r="31"/></g>';
      else if(summer)art+='<path d="M0 340Q140 300 400 338V520H0" fill="#128eab"/><path d="M0 435Q180 390 400 422V520H0" fill="#e6d49e"/><path d="M315 410Q290 285 305 202" stroke="#795b35" stroke-width="17" fill="none"/><g stroke="#2d8562" stroke-width="16" stroke-linecap="round"><path d="M305 208Q240 154 177 184M305 208Q355 143 415 174M305 208Q263 124 272 105M305 208Q366 196 395 241"/></g>';
      else art+='<path d="M0 370Q100 290 230 340T400 306V520H0" fill="#b28e68"/><path d="M0 430Q220 345 400 420V520H0" fill="#587b63"/><path d="M96 405V242M290 398V210" stroke="#6b5341" stroke-width="12"/><g fill="#d7a453"><circle cx="98" cy="240" r="52"/><circle cx="285" cy="207" r="59"/></g>';
      art+='<path d="M0 505Q150 458 400 501" fill="none" stroke="#fff7e0" stroke-width="3" opacity=".55"/>';
    }else if(kind==='arch'){
      art='<rect width="400" height="520" fill="#073f40"/><path d="M20 520V180Q200 -95 380 180V520" fill="#19685e" stroke="#e6cb88" stroke-width="8"/><path d="M36 520V185Q200 -58 364 185V520" fill="none" stroke="#e4c88c" stroke-width="2"/><g stroke="#d5b16d" stroke-width="2" fill="none" opacity=".35"><path d="M0 360Q200 200 400 360M0 420Q200 260 400 420"/></g><g stroke="#d5b16d" stroke-width="2"><path d="M58 0V90M342 0V90"/></g><g fill="#edca7b" stroke="#fce9b1" stroke-width="3"><path d="M37 91H79L72 143H44Z"/><path d="M321 91H363L356 143H328Z"/></g><g fill="#ffedaa" opacity=".65"><ellipse cx="58" cy="119" rx="36" ry="55"/><ellipse cx="342" cy="119" rx="36" ry="55"/></g>';
    }else if(kind==='shelf'){
      art='<rect width="400" height="520" fill="#2b1a12"/><g fill="#674026" stroke="#b18450" stroke-width="3">';
      for(let y=128;y<540;y+=128)art+='<rect x="0" y="'+y+'" width="400" height="19" rx="3"/><rect x="0" y="'+(y+18)+'" width="400" height="8" fill="#26170f"/>';
      art+='</g><path d="M16 0V520M384 0V520" stroke="#b37e45" stroke-width="14"/><g fill="#f5c76c"><circle cx="40" cy="24" r="4"/><circle cx="360" cy="24" r="4"/></g>';
    }else if(kind==='fullscreen'){
      art='<rect width="400" height="520" fill="url(#s)"/><circle cx="322" cy="72" r="42" fill="#ffe0a0"/><path d="M0 390Q170 330 400 390V520H0" fill="#149db1"/><path d="M0 470Q220 398 400 466V520H0" fill="#eddaa8"/><path d="M40 520Q95 385 80 260" stroke="#725339" stroke-width="16" fill="none"/><g stroke="#367e59" stroke-width="16" stroke-linecap="round"><path d="M80 262Q18 207 -20 228M80 262Q123 194 191 204M80 262Q70 191 40 170"/></g><path d="M205 450V320L235 295V450M270 450V335L299 312V450" fill="#f8edcf" opacity=".55"/>';
    }else if(kind==='flip'){
      art='<rect width="400" height="520" fill="#0c5b56"/><g fill="#fff5d9" opacity=".15"><circle cx="50" cy="70" r="30"/><circle cx="350" cy="110" r="46"/></g><path d="M0 520Q200 445 400 520" fill="#d8b873" opacity=".25"/>';
    }
    return 'url("data:image/svg+xml,'+encodeURIComponent(svgStart+art+'</svg>')+'")';
  };
  const storageKey='aoqatYearGalleryStylesV5';
  let settings={};try{settings=JSON.parse(localStorage.getItem(storageKey)||'{}')||{};}catch(_){}
  let enabled=Array.isArray(settings.enabled)?settings.enabled.filter(id=>themes.some(t=>t.id===id)):themes.map(t=>t.id);
  // New presets should also appear for people who previously enabled all seven presets.
  if(Array.isArray(settings.enabled)&&settings.enabled.length===7&&['modernlist','timeline','circles'].every(id=>!settings.enabled.includes(id)))enabled=themes.map(t=>t.id);
  if(!enabled.length)enabled=themes.map(t=>t.id);
  let active=enabled.includes(settings.active)?settings.active:enabled[0],focused=1,search='';
  const saveStyles=()=>{try{localStorage.setItem(storageKey,JSON.stringify({enabled,active}));}catch(_){}};
  const intro=text('p','اختر الشهر لعرض تصاميمه وحفظه أو مشاركته.');
  const toggleThemes=button('☷ تغيير نمط العرض',()=>{const open=toolbar.dataset.expanded!=='true';toolbar.dataset.expanded=String(open);toggleThemes.setAttribute('aria-expanded',String(open));});toggleThemes.className='mc-theme-toggle';toggleThemes.setAttribute('aria-expanded','false');
  const toolbar=document.createElement('div');toolbar.className='mc-year-themes';
  const choices=document.createElement('div');choices.className='mc-year-theme-choices';
  const manage=button('⚙ الأنماط',()=>{manager.hidden=!manager.hidden;manage.setAttribute('aria-expanded',String(!manager.hidden));});
  manage.classList.add('mc-theme-manage');manage.setAttribute('aria-expanded','false');
  const manager=document.createElement('div');manager.className='mc-year-theme-manager';manager.hidden=true;
  const currentTheme=text('div','');currentTheme.className='mc-current-theme';currentTheme.setAttribute('role','status');
  const stage=document.createElement('div');stage.className='mc-gallery-stage';
  const scene=document.createElement('div');scene.className='mc-scene';scene.setAttribute('aria-hidden','true');
  const decoration=document.createElement('div');decoration.className='mc-decor';decoration.setAttribute('aria-hidden','true');scene.append(decoration);
  const grid=document.createElement('div');grid.className='mc-months';grid.setAttribute('aria-label','أشهر السنة');
  const searchBar=document.createElement('div');searchBar.className='mc-gallery-search';
  const searchInput=document.createElement('input');searchInput.type='search';searchInput.placeholder='ابحث عن شهر...';searchInput.setAttribute('aria-label','ابحث عن شهر');
  searchInput.oninput=()=>{search=searchInput.value.trim();filterMonths();};
  searchBar.append(searchInput);
  const monthNav=document.createElement('div');monthNav.className='mc-month-nav';
  const previous=button('❮',()=>focusMonth(focused-1));previous.setAttribute('aria-label','الشهر السابق');
  const next=button('❯',()=>focusMonth(focused+1));next.setAttribute('aria-label','الشهر التالي');
  const navNumbers=document.createElement('div');navNumbers.className='mc-month-nav-numbers';
  for(let month=1;month<=12;month++){
    const b=button(String(month).padStart(2,'0'),()=>focusMonth(month));b.setAttribute('aria-label',C.months[month-1]);
    const thumb=document.createElement('img');thumb.alt='';thumb.loading='lazy';b.append(thumb);
    navNumbers.append(b);
  }
  monthNav.append(previous,navNumbers,next);
  const filterMonths=()=>{
    grid.querySelectorAll('[data-calendar-month]').forEach(el=>{
      const n=Number(el.dataset.calendarMonth);
      el.hidden=!!search&&!C.months[n-1].includes(search)&&!String(n).includes(search);
    });
  };
  const focusMonth=n=>{
    focused=(n+11)%12+1;
    stage.style.setProperty('--mc-scene-art',illustration(active,focused));
    grid.querySelectorAll('[data-calendar-month]').forEach(el=>el.classList.toggle('mc-featured',Number(el.dataset.calendarMonth)===focused));
    Array.from(navNumbers.children).forEach((b,i)=>b.setAttribute('aria-pressed',String(i+1===focused)));
    const selected=navNumbers.children[focused-1];
    if(selected&&monthNav.contains(selected)){navNumbers.scrollTo({left:selected.offsetLeft-navNumbers.offsetLeft-navNumbers.clientWidth/2+selected.clientWidth/2,behavior:'smooth'});}
  };
  const paint=()=>{
    p.dataset.galleryTheme=active;
    decoration.textContent='';
    stage.style.setProperty('--mc-scene-art',illustration(active,focused));
    // Explicit, gallery-owned paint for the reference's dark emerald month cards.
    // The hosting app has highly specific button/theme styles; setting these on
    // the isolated annual gallery is safer than affecting the other nine templates.
    const palettes={
       luxgrid:['linear-gradient(150deg,#073c3d,#07534b)','#fff9e9','1px solid #c8a76b'],
       arch:['#fff9e9','#143a3e','3px solid #d5b06c'],
       modernlist:['#fffdf8','#153f3f','1px solid #cbd6cf'],
       seasons:['linear-gradient(0deg,#092c34b8,transparent 85%),var(--mc-month-landscape)','#fff','2px solid #f5e6c0'],
       colorcards:['#fffdf8','#153f3f','1px solid #cbd6cf'],
       timeline:['#fffdf8','#153f3f','1px solid #cbd6cf'],
       shelf:['#f6ead3','#352719','3px ridge #bc935c'],
       flip:['#fff9ea','#153e3a','1px solid #d5c7a8'],
       circles:['transparent','#143a3e','none'],
       fullscreen:['#fff9ee','#123e3e','3px solid #d3ad67']
     };
     const palette=palettes[active]||palettes.luxgrid;
     grid.querySelectorAll('[data-calendar-month]').forEach(card=>{
       const set=(el,key,value)=>el.style.setProperty(key,value,'important');
       const background=palette[0];
       set(card,'background',background);
       set(card,'background-image',background.includes('gradient(')||background.includes('var(')?background:'none');
       set(card,'color',palette[1]);set(card,'border',palette[2]);
       set(card,'box-shadow',active==='shelf'?'0 8px 0 #704021':'none');
       if(active==='luxgrid')set(card,'border-radius','9px');
       else card.style.removeProperty('border-radius');
       for(const el of card.querySelectorAll('.mc-month-info,.mc-month-info span,.mc-month-info strong,.mc-month-info small'))set(el,'color',palette[1]);
       if(active==='luxgrid'){
         const date=card.querySelector('.mc-month-info small');
         if(date)set(date,'color','#dbcba0');
       }
     });
     const chosen=themes.find(t=>t.id===active);
    currentTheme.textContent='✓ '+chosen.name+' — '+chosen.desc;
    choices.replaceChildren();
    for(const theme of themes.filter(t=>enabled.includes(t.id))){
      const b=button((active===theme.id?'✓ ':'')+theme.name,()=>{
        active=theme.id;search='';searchInput.value='';filterMonths();saveStyles();paint();focusMonth(focused);
      });
      b.classList.add('mc-theme-option');b.setAttribute('aria-pressed',String(active===theme.id));
      choices.append(b);
    }
    manager.replaceChildren(text('p','أخفِ الأنماط غير المرغوبة ويمكنك إعادتها بأي وقت.'));
    for(const theme of themes){
      const line=document.createElement('label');line.className='mc-theme-check';
      const check=document.createElement('input');check.type='checkbox';check.checked=enabled.includes(theme.id);
      check.onchange=()=>{
        if(!check.checked&&enabled.length===1){check.checked=true;return;}
        enabled=check.checked?[...enabled,theme.id]:enabled.filter(id=>id!==theme.id);
        if(!enabled.includes(active))active=enabled[0];
        saveStyles();paint();focusMonth(focused);
      };
      line.append(check,text('span',theme.name+' — '+theme.desc));manager.append(line);
    }
    manager.append(button('إظهار جميع الأنماط',()=>{enabled=themes.map(t=>t.id);saveStyles();paint();}));
    monthNav.hidden=!['arch','flip','fullscreen'].includes(active);
    searchBar.hidden=active!=='luxgrid';
  };
  toolbar.append(choices,manage);stage.append(scene,searchBar,grid,monthNav);
  p.append(toggleThemes,toolbar,currentTheme,manager,stage);
  // The annual gallery uses its own consistent navy/gold preview, independent of
  // the user's editable monthly template and palette. Opening a month still uses
  // the original saved settings, so no monthly design/export behavior is changed.
  const galleryPreviewSettings=C.designDefaults('navy-gold');
  for(let month=1;month<=12;month++){
    const b=button('',()=>preview(year,month)),img=document.createElement('img');
    img.alt='تقويم '+C.months[month-1]+' '+year;img.loading='lazy';b.dataset.calendarMonth=month;
    const art=document.createElement('span');art.className='mc-month-art';art.append(img);
    const info=document.createElement('span');info.className='mc-month-info';
    const num=text('span',String(month).padStart(2,'0'));num.className='mc-month-number';
    info.append(num,text('strong',C.months[month-1]),text('small',year+' / '+String(month).padStart(2,'0')),text('em','فتح التقويم ›'));
    b.append(art,info);b.style.setProperty('--mc-month-landscape',illustration('seasons',month));grid.append(b);
  }
  let startX=0,startY=0;
  stage.addEventListener('touchstart',e=>{if(e.touches.length!==1)return;startX=e.touches[0].clientX;startY=e.touches[0].clientY;},{passive:true});
  stage.addEventListener('touchend',e=>{
    if(!['arch','flip','fullscreen'].includes(active)||!e.changedTouches.length)return;
    const dx=e.changedTouches[0].clientX-startX,dy=e.changedTouches[0].clientY-startY;
    if(Math.abs(dx)>55&&Math.abs(dx)>Math.abs(dy)*1.4)focusMonth(focused+(dx>0?1:-1));
  },{passive:true});
  paint();focusMonth(1);
  (async()=>{for(let month=1;month<=12;month++){
    if(token!==sequence||!p.isConnected)return;
    const b=grid.querySelector('[data-calendar-month="'+month+'"]');
    try{
      const canvas=await R.render(model(year,month),galleryPreviewSettings,.25);
      if(token!==sequence||!p.isConnected)return;
      const src=canvas.toDataURL('image/png');
      b.querySelector('img').src=src;
      navNumbers.children[month-1].querySelector('img').src=src;
    }catch(e){b.append(text('small',e.message));}
  }})();
 }
 function preview(year,month){const p=show(C.months[month-1]+' '+year,()=>yearView(year)),token=sequence,actions=document.createElement('div'),img=document.createElement('img'),status=text('p','جاري تجهيز التقويم…');let file,url,sharing=false;actions.className='mc-actions';img.className='mc-preview';img.alt='مواقيت الصلاة لمدينة الحويجة وضواحيها لشهر '+C.months[month-1]+' '+year;const share=button('مشاركة التقويم',async()=>{if(!file||sharing)return;sharing=true;share.disabled=true;try{await navigator.share({files:[file],title:img.alt});status.textContent='التقويم جاهز للمشاركة والحفظ.';}catch(e){status.textContent=e.name==='AbortError'?'تم إلغاء المشاركة.':'تعذرت المشاركة؛ يمكنك حفظ الصورة ومشاركتها من الصور.';}finally{sharing=false;share.disabled=false;}}),download=button('حفظ الصورة على الهاتف',()=>{if(!file||!url)return;const a=document.createElement('a');a.href=url;a.download=file.name;document.body.append(a);a.click();a.remove();status.textContent='تم طلب حفظ صورة التقويم.';});share.disabled=download.disabled=true;actions.append(share,download,button('تغيير التصميم',()=>designs(year,month,()=>preview(year,month))),button('تنسيق الخط للتقويم',()=>format(year,month,()=>preview(year,month))));const chosen=C.designs.find(d=>d.id===read().design);p.append(actions,text('small','التصميم '+chosen.number+' — '+chosen.name),img,status);status.setAttribute('role','status');
  let activeUrl;const release=()=>{if(activeUrl){URL.revokeObjectURL(activeUrl);activeUrl=null;}};const observer=new MutationObserver(()=>{if(!p.isConnected){release();observer.disconnect();}});observer.observe(document.body,{childList:true,subtree:true});
  (async()=>{try{const canvas=await R.render(model(year,month),read()),blob=await R.blob(canvas);if(token!==sequence||!p.isConnected)return;file=new File([blob],'aoqat-hawija-'+year+'-'+String(month).padStart(2,'0')+'.png',{type:'image/png'});activeUrl=url=URL.createObjectURL(blob);img.src=url;download.disabled=false;const can=!!navigator.share&&(!navigator.canShare||navigator.canShare({files:[file]}));share.hidden=!can;share.disabled=!can;status.textContent=can?'الصورة جاهزة للمشاركة والحفظ.':'الصورة جاهزة للحفظ؛ المشاركة المباشرة غير متاحة في هذا المتصفح.';}catch(e){if(p.isConnected)status.textContent=e.message||'تعذر تجهيز التقويم.';}})();
 }
 function designs(year,month,back=open){const p=show('تغيير التصميم',back),token=sequence,grid=document.createElement('div');grid.className='mc-designs';p.append(text('p','اختر تصميم التقويم بألوانه الجاهزة. يمكنك تعديل الخط والألوان لاحقاً، والمواقيت لا تتغير.'),grid);let s=read();const cards=[];for(const design of C.designs){const b=button('',()=>{s=read();const preset=C.designDefaults(design.id);if(!['navy-gold','iraqi-paper','minimal-modern','islamic-corners'].includes(design.id))for(const id of Object.keys(C.groups))preset.styles[id]={...preset.styles[id],font:s.styles[id].font,size:s.styles[id].size};s=save({...preset,design:design.id,reminder:s.reminder,years:s.years});designs(year,month,back);}),img=document.createElement('img'),name=text('strong','');b.dataset.calendarDesign=design.id;img.alt='التصميم '+design.number+' — '+design.name;b.append(img,name);grid.append(b);cards.push({b,img,name,design});}function paint(){for(const {b,name,design} of cards){const active=s.design===design.id;b.dataset.enabled=String(active);b.setAttribute('aria-pressed',String(active));name.textContent=(active?'✓ ':'')+'التصميم '+design.number+' — '+design.name;}}paint();(async()=>{for(const {img,design} of cards){try{const canvas=await R.render(model(year,month),design.id===s.design?s:{...C.designDefaults(design.id),styles:Object.fromEntries(Object.entries(C.designDefaults(design.id).styles).map(([id,v])=>[id,{...v,font:['navy-gold','iraqi-paper','minimal-modern','islamic-corners'].includes(design.id)?v.font:s.styles[id].font,size:['navy-gold','iraqi-paper','minimal-modern','islamic-corners'].includes(design.id)?v.size:s.styles[id].size}])),design:design.id},.3);if(token!==sequence||!p.isConnected)return;img.src=canvas.toDataURL('image/png');}catch(e){if(p.isConnected)p.append(text('p',e.message));}}})();}
 function format(year,month,back=open){const p=show('تنسيق الخط للتقويم',back),form=document.createElement('div'),img=document.createElement('img'),status=text('p','');form.className='mc-format';img.className='mc-preview';img.alt='معاينة تنسيق التقويم';status.setAttribute('role','status');let s=read(),drawId=0,timer;
  const group=document.createElement('select');group.id='mcElement';for(const [id,g] of Object.entries(C.groups))group.append(new Option(g.name,id));const font=document.createElement('select');font.id='mcFont';for(const [id,name] of [['Times New Roman','Times New Roman'],['AoqatCalendar','أميري'],['Arial','Arial']])font.append(new Option(name,id));const size=document.createElement('input');size.id='mcFontSize';size.type='number';size.min='16';size.max='64';const color=document.createElement('input');color.id='mcTextColor';color.type='color';const bg=document.createElement('input');bg.id='mcElementBackground';bg.type='color';const pageBg=document.createElement('input');pageBg.id='mcPageBackground';pageBg.type='color';pageBg.value=s.page;const border=document.createElement('input');border.type='color';border.id='mcBorderColor';border.value=s.border;const palette=document.createElement('select');palette.id='mcPalette';palette.append(new Option('اختيار ألوان جاهزة',''));C.palettes.forEach((v,i)=>palette.append(new Option(v.name,String(i))));
  const sizeRange=document.createElement('input');sizeRange.type='range';sizeRange.min='16';sizeRange.max='64';sizeRange.step='1';sizeRange.id='mcFontSizeRange';sizeRange.setAttribute('aria-label','تغيير حجم خط العنصر');const sizeBox=document.createElement('div');sizeBox.className='mc-size-controls';const stepSize=amount=>{size.value=Math.max(16,Math.min(64,Number(size.value||s.styles[group.value].size)+amount));size.dispatchEvent(new Event('input'));};const smaller=button('−',()=>stepSize(-1)),larger=button('+',()=>stepSize(1));smaller.id='mcFontSmaller';larger.id='mcFontLarger';smaller.setAttribute('aria-label','تصغير حجم الخط');larger.setAttribute('aria-label','تكبير حجم الخط');sizeBox.append(smaller,size,larger,sizeRange);sizeRange.oninput=()=>{size.value=sizeRange.value;size.dispatchEvent(new Event('input'));};
  form.append(label('العنصر المراد تنسيقه',group),label('نوع الخط',font),label('حجم الخط',sizeBox),label('لون الخط / النص',color),label('لون خلفية العنصر',bg),label('لون خلفية التقويم',pageBg),label('لون حدود الجدول',border),label('تناسق الألوان',palette));p.append(text('p','التنسيق يخص التقاويم فقط ويُطبّق على جميع الشهور والسنوات. المواقيت لا تتغير. يتوسع الجدول عند تكبير الخط حتى يُطبّق الحجم المختار. يبقى العنوان بسطر واحد ضمن الإطار.'),form,img,status);
  function fill(){const g=s.styles[group.value];font.value=g.font;size.value=g.size;sizeRange.value=g.size;color.value=g.color;bg.value=g.bg;}
  async function draw(){const id=++drawId;try{const canvas=await R.render(model(year,month),s,.65);if(id===drawId&&p.isConnected){img.src=canvas.toDataURL('image/png');const applied=canvas.calendarFontSizes?.[group.value],requested=s.styles[group.value].size;status.textContent=applied&&applied<requested-.5?'التنسيق محفوظ. حجم هذا الجزء المعروض '+Math.round(applied)+' بدلاً من '+requested+' لإبقاء العنوان واسم الشهر بسطر واحد داخل الإطار.':'التنسيق محفوظ تلقائياً. حجم الخط '+requested+'.';}}catch(e){if(p.isConnected)status.textContent=e.message;}}
  function persist(){sizeRange.value=s.styles[group.value].size;s=save(s);status.textContent='جاري تحديث المعاينة…';clearTimeout(timer);timer=setTimeout(draw,100);}
  group.onchange=()=>{fill();status.textContent='تعديل: '+C.groups[group.value].name;};
  const updateStyle=(key,input)=>{const update=()=>{if(key==='size'&&(!input.value||!input.checkValidity())){status.textContent='اختر حجم خط من 16 إلى 64.';return;}s.styles[group.value][key]=key==='size'?Number(input.value):input.value;persist();};input.oninput=update;input.onchange=update;};
  updateStyle('font',font);updateStyle('size',size);updateStyle('color',color);updateStyle('bg',bg);
  for(const [input,key] of [[pageBg,'page'],[border,'border']]){const update=()=>{s[key]=input.value;persist();};input.oninput=update;input.onchange=update;}
  palette.onchange=()=>{if(palette.value==='')return;const base=C.defaults(Number(palette.value));for(const id of Object.keys(C.groups))base.styles[id]={...base.styles[id],font:s.styles[id].font,size:s.styles[id].size};s=save({...base,design:s.design,reminder:s.reminder,years:s.years});pageBg.value=s.page;border.value=s.border;fill();draw();};fill();draw();
  p.append(button('إرجاع تنسيق التقاويم الافتراضي',()=>{s=save({...C.designDefaults(s.design),design:s.design,reminder:s.reminder,years:s.years});pageBg.value=s.page;border.value=s.border;palette.value='';fill();draw();}));
 }
 function reminder(){const p=show('تنبيه نشر تقويم الشهر',open),s=read(),toggle=button('',async()=>{s.reminder.enabled=!s.reminder.enabled;save(s);paint();if(s.reminder.enabled&&typeof Notification!=='undefined'&&Notification.permission==='default')try{await Notification.requestPermission();}catch(_){}if(!s.reminder.enabled)clearReminder();else tick();}),time=document.createElement('input');time.type='time';time.value=s.reminder.time;time.id='mcReminderTime';const info=text('p','يظهر التذكير في آخر يوم من كل شهر لتجهيز تقويم الشهر القادم ومشاركته. لا ينشر تلقائياً.');function paint(){toggle.textContent='تنبيه نهاية الشهر: '+(s.reminder.enabled?'مفعّل':'متوقف');toggle.setAttribute('aria-pressed',String(s.reminder.enabled));toggle.classList.add('mc-toggle');time.disabled=!s.reminder.enabled;}time.onchange=()=>{if(!time.checkValidity()||!time.value)return;s.reminder.time=time.value;save(s);tick();};paint();p.append(toggle,info,label('وقت التنبيه بتوقيت العراق',time),text('p','تنبيه الويب يعمل أثناء تشغيل الصفحة. إذا كانت الصفحة مغلقة بالكامل، يحتاج التنبيه المضمون بالخلفية إلى نسخة Android.'));}
 function openDate(value){const m=String(value||'').match(/^(\d{4})-(\d{2})/),now=current();const year=m?Number(m[1]):now.year,month=m?Number(m[2]):now.month;if(year<2026||year>2200||month<1||month>12)return;document.body.classList.add('design-menu-open');preview(year,month);}
 async function clearReminder(){fallbackNotification?.close();fallbackNotification=null;$('monthlyCalendarBanner')?.remove();try{const reg=await navigator.serviceWorker?.getRegistration();const notifications=await reg?.getNotifications();notifications?.filter(n=>n.data?.kind==='calendar-post-reminder').forEach(n=>n.close());}catch(_){}}
 async function deliver(event){const entry=window.AoqatReminderInbox?.add(event);$('monthlyCalendarBanner')?.remove();const banner=document.createElement('aside');banner.id='monthlyCalendarBanner';banner.setAttribute('role','alert');banner.dir='rtl';banner.append(text('strong',event.title),button('معاينة التقويم ومشاركته',()=>{openDate(event.targetDate);banner.remove();}),button('إغلاق',()=>banner.remove()));document.body.append(banner);if(typeof Notification==='undefined'||Notification.permission!=='granted')return;const options={body:event.body,icon:'/assets/icons/app-icon.svg',tag:event.key,data:{kind:'calendar-post-reminder',id:entry?.id,entry,url:'/?calendar='+event.targetDate.slice(0,7)}};try{const reg=await navigator.serviceWorker?.getRegistration();if(!read().reminder.enabled)return;if(reg)await reg.showNotification(event.title,options);else {const n=fallbackNotification=new Notification(event.title,options);n.onclick=()=>{window.focus();openDate(event.targetDate);n.close();};}}catch(_){}}
 function tick(now=new Date()){const event=C.reminderEvent(now,read());if(!event)return;let sent;try{sent=JSON.parse(localStorage.getItem(SENT)||'{}');}catch(_){sent={};}if(!sent||typeof sent!=='object'||Array.isArray(sent))sent={};if(sent[event.key])return;sent[event.key]=+now;for(const key of Object.keys(sent))if(+now-sent[key]>400*86400000)delete sent[key];localStorage.setItem(SENT,JSON.stringify(sent));deliver(event);}
 document.addEventListener('click',e=>{if(!e.target.closest('.web-back'))return;if($('webCalendar')?.dataset.monthlyParent==='true'){e.preventDefault();e.stopImmediatePropagation();open();return;}if(!$('monthlyCalendars')||!backAction)return;e.preventDefault();e.stopImmediatePropagation();backAction();},true);
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)tick();});window.addEventListener('storage',e=>{if(e.key===KEY&&!read().reminder.enabled)clearReminder();});setInterval(()=>tick(),30000);
 window.AoqatCalendars={open,openDate,yearView,preview,format,designs,reminder,read,tick};
 function ready(){if(!window.aoqatUIReady||!window.AoqatWebSettingsNavigation){setTimeout(ready,150);return;}const target=new URLSearchParams(location.search).get('calendar');if(target)openDate(target);tick();}ready();
})();

;

/* js/hide-legacy-design.js */
"use strict";
(function(){
  function apply(){
    const legacy=document.getElementById("design");
    if(!legacy) return;
    legacy.dataset.legacyPreview="true";
    legacy.style.display="none";

    const track=document.querySelector(".design-carousel-track");
    if(track){
      const slide=legacy.closest(".design-slide");
      if(slide){
        slide.style.display="none";
        slide.dataset.legacySlide="true";
      }
    }
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",apply,{once:true});else apply();
  window.addEventListener("load",()=>{apply();setTimeout(apply,1200);setTimeout(apply,2500)},{once:true});
})();
;

/* js/second-design.js */
"use strict";

(function(){
  const WIDTH=1024;
  const HEIGHT=1448;
  let activeIndex=0;

  function injectStyles(){
    if(document.getElementById("secondDesignStyles")) return;
    const style=document.createElement("style");
    style.id="secondDesignStyles";
    style.textContent=`
      .previewBox{position:relative!important;overflow:hidden!important;display:block!important}
      .design-carousel{position:relative;width:100%;overflow:hidden}
      .design-carousel-track{display:flex;width:100%;direction:ltr;transition:transform .35s ease;will-change:transform}
      .design-slide{flex:0 0 100%;width:100%;display:flex;justify-content:center;align-items:flex-start;direction:rtl}
      .design-carousel-controls{display:flex;align-items:center;justify-content:center;gap:10px;margin:10px 0 2px}
      .design-carousel-btn{border:1px solid rgba(255,255,255,.22);background:#0c2230;color:#fff;width:42px;height:38px;border-radius:8px;font-size:22px;cursor:pointer}
      .design-carousel-status{font-size:13px;color:#d7e2e8;min-width:105px;text-align:center}
      .design-carousel-dots{display:flex;gap:6px;justify-content:center;margin:6px 0}
      .design-carousel-dot{width:9px;height:9px;border:0;border-radius:50%;background:#667782;padding:0;cursor:pointer}
      .design-carousel-dot.active{background:#e8bd58;transform:scale(1.2)}

      .second-design{position:relative;width:1024px;height:1448px;flex:0 0 1024px;overflow:hidden;direction:rtl;color:#fff;background:radial-gradient(circle at 50% 13%,rgba(213,165,77,.28),transparent 28%),linear-gradient(180deg,#071a31 0%,#0a2239 42%,#09141f 100%);box-shadow:inset 0 0 120px rgba(0,0,0,.38);transform-origin:top center}
      .second-design:before{content:"";position:absolute;inset:40px;border:3px solid #d6a64f;border-radius:52px;pointer-events:none}
      .second-design:after{content:"";position:absolute;left:120px;right:120px;top:76px;height:330px;border:3px solid rgba(230,186,96,.8);border-bottom:0;border-radius:260px 260px 0 0/220px 220px 0 0;pointer-events:none}
      .sd2-stars{position:absolute;inset:0;background-image:radial-gradient(circle,#fff 0 1px,transparent 1.6px);background-size:92px 92px;opacity:.11;pointer-events:none}
      .sd2-title{position:absolute;top:108px;left:150px;right:150px;text-align:center;font-size:58px;font-weight:800;color:#f7e4b2;text-shadow:0 3px 8px #000}
      .sd2-location{position:absolute;top:186px;left:170px;right:170px;text-align:center;font-size:24px;color:#d7e5ef}
      .sd2-day{position:absolute;top:265px;left:352px;width:320px;height:104px;display:flex;align-items:center;justify-content:center;border:2px solid #d6a64f;border-radius:55px;background:rgba(3,18,32,.72);font-size:42px;font-weight:800;color:#ffe4a5}
      .sd2-date-card{position:absolute;top:400px;width:310px;height:165px;border:2px solid rgba(230,186,96,.78);border-radius:26px;background:rgba(7,27,47,.78);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:5px;box-shadow:0 10px 30px rgba(0,0,0,.25)}
      .sd2-date-card.greg{left:142px}.sd2-date-card.hijri{right:142px}
      .sd2-date-number{font-size:52px;font-weight:800;color:#fff;line-height:1}.sd2-date-month{font-size:25px;color:#f1cf84}.sd2-date-year{font-size:21px;color:#c9d7df}
      .sd2-prayers{position:absolute;top:620px;left:118px;right:118px;display:flex;flex-direction:column;gap:17px}
      .sd2-prayer-row{height:92px;border:2px solid rgba(230,186,96,.75);border-radius:24px;background:linear-gradient(90deg,rgba(8,25,42,.94),rgba(14,47,68,.78));display:flex;align-items:center;justify-content:space-between;padding:0 42px;box-shadow:0 9px 24px rgba(0,0,0,.25)}
      .sd2-prayer-label{font-size:34px;font-weight:700;color:#f9e7bb}.sd2-prayer-time{font-size:42px;font-weight:800;color:#fff;direction:ltr}
      .sd2-divider{position:absolute;left:180px;right:180px;bottom:130px;height:1px;background:linear-gradient(90deg,transparent,#d6a64f,transparent)}
      .sd2-footer{position:absolute;bottom:64px;left:135px;right:135px;text-align:center;font-size:25px;color:#e7d49f}

      .third-design{position:relative;width:1024px;height:1448px;flex:0 0 1024px;overflow:hidden;direction:rtl;color:#193a2d;background:linear-gradient(180deg,#f7f3e8 0%,#e7efe2 36%,#cfdcc8 100%);box-shadow:inset 0 0 120px rgba(50,80,55,.12);transform-origin:top center}
      .third-design:before{content:"";position:absolute;inset:34px;border:3px solid #476f4b;border-radius:34px;box-shadow:inset 0 0 0 10px rgba(255,255,255,.35);pointer-events:none}
      .third-design:after{content:"";position:absolute;left:-80px;right:-80px;bottom:-180px;height:520px;border-radius:50% 50% 0 0;background:radial-gradient(circle at 50% 0,#6e9468 0,#486c4c 44%,#294738 100%);opacity:.28;pointer-events:none}
      .sd3-leaves{position:absolute;inset:0;pointer-events:none;background:radial-gradient(ellipse at 10% 8%,rgba(80,130,73,.18),transparent 22%),radial-gradient(ellipse at 92% 16%,rgba(56,105,58,.16),transparent 24%),radial-gradient(ellipse at 18% 82%,rgba(101,136,78,.14),transparent 25%)}
      .sd3-kicker{position:absolute;top:92px;left:120px;right:120px;text-align:center;font-size:23px;letter-spacing:1px;color:#6b7d61}
      .sd3-title{position:absolute;top:138px;left:120px;right:120px;text-align:center;font-size:78px;font-weight:800;color:#244c35;line-height:1.1}
      .sd3-subtitle{position:absolute;top:238px;left:150px;right:150px;text-align:center;font-size:28px;color:#6b705e}
      .sd3-line{position:absolute;top:300px;left:300px;right:300px;height:2px;background:linear-gradient(90deg,transparent,#668163,transparent)}
      .sd3-day{position:absolute;top:334px;left:365px;width:294px;height:86px;border-radius:22px;background:#355f3f;color:#fff;display:flex;align-items:center;justify-content:center;font-size:40px;font-weight:800;box-shadow:0 10px 25px rgba(44,78,50,.18)}
      .sd3-date-wrap{position:absolute;top:458px;left:92px;right:92px;display:grid;grid-template-columns:1fr 1fr;gap:22px}
      .sd3-date-card{height:158px;border:1px solid rgba(64,94,64,.28);border-radius:24px;background:rgba(255,255,255,.78);display:flex;align-items:center;justify-content:center;gap:24px;box-shadow:0 10px 24px rgba(53,83,58,.10)}
      .sd3-date-number{font-size:64px;font-weight:800;color:#355f3f;line-height:1}.sd3-date-text{display:flex;flex-direction:column;gap:5px}.sd3-date-month{font-size:27px;font-weight:700;color:#36523e}.sd3-date-year{font-size:21px;color:#72806e}
      .sd3-prayers{position:absolute;top:660px;left:92px;right:92px;display:grid;grid-template-columns:1fr 1fr;gap:18px}
      .sd3-prayer-row{height:142px;border-radius:26px;background:rgba(255,255,255,.86);border:1px solid rgba(61,92,64,.22);box-shadow:0 12px 28px rgba(52,78,56,.10);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:9px}
      .sd3-prayer-label{font-size:28px;font-weight:800;color:#2c563a}.sd3-prayer-time{font-size:48px;font-weight:800;color:#557f4f;direction:ltr}
      .sd3-footer-card{position:absolute;left:112px;right:112px;bottom:78px;min-height:112px;border-radius:24px;background:#2f563b;color:#f8f3e6;display:flex;align-items:center;justify-content:center;text-align:center;padding:20px 38px;font-size:25px;box-shadow:0 14px 32px rgba(40,69,45,.2)}

      .second-design .draggable,.third-design .draggable{cursor:move;touch-action:none;user-select:none}
      .second-design .dragging{outline:2px dashed #f0c764;outline-offset:4px}
      .third-design .dragging{outline:2px dashed #355f3f;outline-offset:4px}
      @media(max-width:800px){
        .design-carousel-controls{margin-top:6px}.design-carousel-btn{width:38px;height:34px;font-size:19px}.design-carousel-status{font-size:12px}
      }
    `;
    document.head.appendChild(style);
  }

  function value(id){return document.getElementById(id)?.value||"";}

  function createSecondDesign(){
    const design=document.createElement("div");
    design.id="design2";
    design.className="second-design";
    design.innerHTML=`
      <div class="sd2-stars"></div>
      <div class="sd2-title draggable">مواقيت الصلاة</div>
      <div class="sd2-location draggable" data-field="footer"></div>
      <div class="sd2-day draggable" data-field="day"></div>
      <div class="sd2-date-card greg draggable"><div class="sd2-date-number" data-field="gday"></div><div class="sd2-date-month" data-field="gmonth"></div><div class="sd2-date-year" data-field="gyear"></div></div>
      <div class="sd2-date-card hijri draggable"><div class="sd2-date-number" data-field="hday"></div><div class="sd2-date-month" data-field="hmonth"></div><div class="sd2-date-year" data-field="hyear"></div></div>
      <div class="sd2-prayers">
        <div class="sd2-prayer-row draggable"><span class="sd2-prayer-label">الفجر</span><b class="sd2-prayer-time" data-field="fajr"></b></div>
        <div class="sd2-prayer-row draggable"><span class="sd2-prayer-label">الشروق</span><b class="sd2-prayer-time" data-field="sunrise"></b></div>
        <div class="sd2-prayer-row draggable"><span class="sd2-prayer-label">الظهر</span><b class="sd2-prayer-time" data-field="dhuhr"></b></div>
        <div class="sd2-prayer-row draggable"><span class="sd2-prayer-label">العصر</span><b class="sd2-prayer-time" data-field="asr"></b></div>
        <div class="sd2-prayer-row draggable"><span class="sd2-prayer-label">المغرب</span><b class="sd2-prayer-time" data-field="maghrib"></b></div>
        <div class="sd2-prayer-row draggable"><span class="sd2-prayer-label">العشاء</span><b class="sd2-prayer-time" data-field="isha"></b></div>
      </div>
      <div class="sd2-divider"></div>
      <div class="sd2-footer draggable">حسب التوقيت المحلي لمدينة الحويجة وضواحيها</div>
    `;
    return design;
  }

  function createThirdDesign(){
    const design=document.createElement("div");
    design.id="design3";
    design.className="third-design";
    design.innerHTML=`
      <div class="sd3-leaves"></div>
      <div class="sd3-kicker draggable">يومك يبدأ بالسكينة</div>
      <div class="sd3-title draggable">الصلاة</div>
      <div class="sd3-subtitle draggable">راحة للقلوب ونورٌ لليوم</div>
      <div class="sd3-line"></div>
      <div class="sd3-day draggable" data-field="day"></div>
      <div class="sd3-date-wrap">
        <div class="sd3-date-card draggable"><div class="sd3-date-number" data-field="gday"></div><div class="sd3-date-text"><div class="sd3-date-month" data-field="gmonth"></div><div class="sd3-date-year" data-field="gyear"></div></div></div>
        <div class="sd3-date-card draggable"><div class="sd3-date-number" data-field="hday"></div><div class="sd3-date-text"><div class="sd3-date-month" data-field="hmonth"></div><div class="sd3-date-year" data-field="hyear"></div></div></div>
      </div>
      <div class="sd3-prayers">
        <div class="sd3-prayer-row draggable"><span class="sd3-prayer-label">الفجر</span><b class="sd3-prayer-time" data-field="fajr"></b></div>
        <div class="sd3-prayer-row draggable"><span class="sd3-prayer-label">الشروق</span><b class="sd3-prayer-time" data-field="sunrise"></b></div>
        <div class="sd3-prayer-row draggable"><span class="sd3-prayer-label">الظهر</span><b class="sd3-prayer-time" data-field="dhuhr"></b></div>
        <div class="sd3-prayer-row draggable"><span class="sd3-prayer-label">العصر</span><b class="sd3-prayer-time" data-field="asr"></b></div>
        <div class="sd3-prayer-row draggable"><span class="sd3-prayer-label">المغرب</span><b class="sd3-prayer-time" data-field="maghrib"></b></div>
        <div class="sd3-prayer-row draggable"><span class="sd3-prayer-label">العشاء</span><b class="sd3-prayer-time" data-field="isha"></b></div>
      </div>
      <div class="sd3-footer-card draggable" data-field="footer"></div>
    `;
    return design;
  }

  function dataMap(){
    return {
      day:value("dayName"),gday:value("gregorianDay"),gmonth:value("gregorianMonth"),gyear:value("gregorianYear")?value("gregorianYear")+"م":"",
      hday:value("hijriDay"),hmonth:value("hijriMonth"),hyear:value("hijriYear")?value("hijriYear")+"هـ":"",
      fajr:value("fajr"),sunrise:value("sunrise"),dhuhr:value("dhuhr"),asr:value("asr"),maghrib:value("maghrib"),isha:value("isha"),footer:value("footerText")||"حسب التوقيت المحلي لمدينة الحويجة وضواحيها"
    };
  }

  function syncDesign(designId){
    const d=document.getElementById(designId);if(!d)return;
    Object.entries(dataMap()).forEach(([key,val])=>d.querySelectorAll(`[data-field="${key}"]`).forEach(el=>el.textContent=val));
    if(designId==="design2"){
      const footer=d.querySelector(".sd2-footer");if(footer)footer.textContent=dataMap().footer;
    }
  }

  function syncExtraDesigns(){syncDesign("design2");syncDesign("design3");}

  function setupDragging(design){
    design.querySelectorAll(".draggable").forEach(el=>{
      let dragging=false,startX=0,startY=0,baseX=0,baseY=0,scale=1;
      const point=e=>e.touches?e.touches[0]:e;
      const start=e=>{if(e.button!==undefined&&e.button!==0)return;const p=point(e),rect=design.getBoundingClientRect();scale=rect.width/design.offsetWidth||1;startX=p.clientX;startY=p.clientY;baseX=parseFloat(el.dataset.x)||0;baseY=parseFloat(el.dataset.y)||0;dragging=true;el.classList.add("dragging");e.preventDefault()};
      const move=e=>{if(!dragging)return;const p=point(e),x=baseX+(p.clientX-startX)/scale,y=baseY+(p.clientY-startY)/scale;el.dataset.x=x;el.dataset.y=y;el.style.transform=`translate(${x}px, ${y}px)`;e.preventDefault()};
      const end=()=>{dragging=false;el.classList.remove("dragging")};
      el.addEventListener("mousedown",start);window.addEventListener("mousemove",move,{passive:false});window.addEventListener("mouseup",end);
      el.addEventListener("touchstart",start,{passive:false});window.addEventListener("touchmove",move,{passive:false});window.addEventListener("touchend",end);
    });
  }

  function restoreSavedExtraDesigns(){
    try{
      const saved=JSON.parse(localStorage.getItem("prayerDesignerSavedAdjustmentsV1")||"null");if(!Array.isArray(saved))return;
      const elements=Array.from(document.querySelectorAll(".draggable"));
      saved.forEach(item=>{const el=elements[item.index];if(!el)return;const isExtra=document.getElementById("design2")?.contains(el)||document.getElementById("design3")?.contains(el);if(!isExtra)return;el.dataset.x=String(item.x??0);el.dataset.y=String(item.y??0);if(item.style)el.setAttribute("style",item.style)});
    }catch(e){console.error(e)}
  }

  function setupSync(){
    ["dayName","hijriDay","gregorianDay","hijriMonth","gregorianMonth","hijriYear","gregorianYear","fajr","sunrise","dhuhr","asr","maghrib","isha"].forEach(id=>document.getElementById(id)?.addEventListener("change",()=>setTimeout(syncExtraDesigns,0)));
    document.getElementById("footerText")?.addEventListener("input",syncExtraDesigns);
    const primary=document.getElementById("design");if(primary)new MutationObserver(syncExtraDesigns).observe(primary,{subtree:true,childList:true,characterData:true});
  }

  function setupCarousel(previewBox,primary,secondary,third){
    const carousel=document.createElement("div");carousel.className="design-carousel";
    const track=document.createElement("div");track.className="design-carousel-track";
    const slides=[primary,secondary,third].map(node=>{const slide=document.createElement("div");slide.className="design-slide";slide.appendChild(node);return slide});
    previewBox.insertBefore(carousel,previewBox.firstChild);carousel.appendChild(track);slides.forEach(s=>track.appendChild(s));

    const controls=document.createElement("div");controls.className="design-carousel-controls";
    controls.innerHTML=`<button class="design-carousel-btn" data-prev aria-label="السابق">‹</button><span class="design-carousel-status">التصميم 1 من 3</span><button class="design-carousel-btn" data-next aria-label="التالي">›</button>`;
    const dots=document.createElement("div");dots.className="design-carousel-dots";dots.innerHTML=`<button class="design-carousel-dot active" data-dot="0"></button><button class="design-carousel-dot" data-dot="1"></button><button class="design-carousel-dot" data-dot="2"></button>`;
    previewBox.append(controls,dots);

    const render=()=>{track.style.transform=`translateX(-${activeIndex*100}%)`;controls.querySelector(".design-carousel-status").textContent=`التصميم ${activeIndex+1} من 3`;dots.querySelectorAll(".design-carousel-dot").forEach((d,i)=>d.classList.toggle("active",i===activeIndex));resizeDesigns()};
    controls.querySelector("[data-prev]").onclick=()=>{activeIndex=(activeIndex+2)%3;render()};
    controls.querySelector("[data-next]").onclick=()=>{activeIndex=(activeIndex+1)%3;render()};
    dots.querySelectorAll("[data-dot]").forEach(d=>d.onclick=()=>{activeIndex=Number(d.dataset.dot);render()});

    let sx=null;
    carousel.addEventListener("touchstart",e=>{if(e.target.closest(".draggable"))return;sx=e.touches[0].clientX},{passive:true});
    carousel.addEventListener("touchend",e=>{if(sx===null)return;const dx=e.changedTouches[0].clientX-sx;sx=null;if(Math.abs(dx)>45){activeIndex=dx<0?Math.min(2,activeIndex+1):Math.max(0,activeIndex-1);render()}},{passive:true});
    render();
  }

  function resizeDesigns(){
    const preview=document.querySelector(".previewBox"),d1=document.getElementById("design"),d2=document.getElementById("design2"),d3=document.getElementById("design3"),carousel=document.querySelector(".design-carousel");
    if(!preview||!d1||!d2||!d3||!carousel)return;
    if(window.innerWidth>800){d1.style.zoom="1";d2.style.zoom="1";d3.style.zoom="1";carousel.style.height=HEIGHT+"px";return;}
    const cs=getComputedStyle(preview),padding=parseFloat(cs.paddingLeft||0)+parseFloat(cs.paddingRight||0),available=Math.max(220,preview.clientWidth-padding-2),scale=Math.min(1,available/WIDTH);
    d1.style.zoom=String(scale);d2.style.zoom=String(scale);d3.style.zoom=String(scale);carousel.style.height=Math.ceil(HEIGHT*scale)+"px";
  }

  function rectInDesign(el,design){const r=el.getBoundingClientRect(),dr=design.getBoundingClientRect(),s=dr.width/design.offsetWidth||1;return{x:(r.left-dr.left)/s,y:(r.top-dr.top)/s,w:r.width/s,h:r.height/s}}
  function rounded(ctx,r,radius=24){if(typeof roundRect==="function"){roundRect(ctx,r.x,r.y,r.w,r.h,radius);return}ctx.beginPath();ctx.rect(r.x,r.y,r.w,r.h)}

  function downloadCanvas(canvas,format,name){
    const mime=format==="jpg"?"image/jpeg":format==="webp"?"image/webp":"image/png",quality=format==="png"?undefined:.98;
    canvas.toBlob(blob=>{if(!blob)return alert("تعذر إنشاء الصورة.");const url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download=`${name}.${format}`;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),2000)},mime,quality);
  }

  async function exportSecondDesign(format){
    const design=document.getElementById("design2");if(!design)return;if(document.fonts?.ready){try{await document.fonts.ready}catch(e){}}
    const canvas=document.createElement("canvas"),S=2;canvas.width=WIDTH*S;canvas.height=HEIGHT*S;const ctx=canvas.getContext("2d");ctx.scale(S,S);
    const g=ctx.createLinearGradient(0,0,0,HEIGHT);g.addColorStop(0,"#071a31");g.addColorStop(.42,"#0a2239");g.addColorStop(1,"#09141f");ctx.fillStyle=g;ctx.fillRect(0,0,WIDTH,HEIGHT);
    const glow=ctx.createRadialGradient(512,180,20,512,180,360);glow.addColorStop(0,"rgba(213,165,77,.25)");glow.addColorStop(1,"rgba(213,165,77,0)");ctx.fillStyle=glow;ctx.fillRect(0,0,WIDTH,500);
    ctx.strokeStyle="#d6a64f";ctx.lineWidth=3;rounded(ctx,{x:40,y:40,w:944,h:1368},52);ctx.stroke();
    design.querySelectorAll(".sd2-date-card,.sd2-prayer-row,.sd2-day").forEach(el=>{const r=rectInDesign(el,design);ctx.save();ctx.fillStyle="rgba(7,27,47,.90)";ctx.strokeStyle="#d6a64f";ctx.lineWidth=2;rounded(ctx,r,el.classList.contains("sd2-day")?50:24);ctx.fill();ctx.stroke();ctx.restore()});
    [".sd2-title",".sd2-location",".sd2-day",".sd2-footer"].forEach(sel=>{const el=design.querySelector(sel);if(el&&typeof drawElement==="function")drawElement(ctx,el,design)});
    design.querySelectorAll(".sd2-date-card").forEach(card=>card.querySelectorAll("div").forEach(el=>{if(typeof drawElement==="function")drawElement(ctx,el,design)}));
    design.querySelectorAll(".sd2-prayer-row").forEach(row=>row.querySelectorAll("span,b").forEach(el=>{if(typeof drawElement==="function")drawElement(ctx,el,design)}));
    downloadCanvas(canvas,format,"prayer-design-2");
  }

  async function exportThirdDesign(format){
    const design=document.getElementById("design3");if(!design)return;if(document.fonts?.ready){try{await document.fonts.ready}catch(e){}}
    const canvas=document.createElement("canvas"),S=2;canvas.width=WIDTH*S;canvas.height=HEIGHT*S;const ctx=canvas.getContext("2d");ctx.scale(S,S);
    const g=ctx.createLinearGradient(0,0,0,HEIGHT);g.addColorStop(0,"#f7f3e8");g.addColorStop(.36,"#e7efe2");g.addColorStop(1,"#cfdcc8");ctx.fillStyle=g;ctx.fillRect(0,0,WIDTH,HEIGHT);
    ctx.strokeStyle="#476f4b";ctx.lineWidth=3;rounded(ctx,{x:34,y:34,w:956,h:1380},34);ctx.stroke();
    design.querySelectorAll(".sd3-day,.sd3-date-card,.sd3-prayer-row,.sd3-footer-card").forEach(el=>{const r=rectInDesign(el,design);ctx.save();ctx.fillStyle=el.classList.contains("sd3-day")||el.classList.contains("sd3-footer-card")?"#355f3f":"rgba(255,255,255,.9)";ctx.strokeStyle="rgba(61,92,64,.25)";ctx.lineWidth=1.5;rounded(ctx,r,24);ctx.fill();ctx.stroke();ctx.restore()});
    [".sd3-kicker",".sd3-title",".sd3-subtitle",".sd3-day",".sd3-footer-card"].forEach(sel=>{const el=design.querySelector(sel);if(el&&typeof drawElement==="function")drawElement(ctx,el,design)});
    design.querySelectorAll(".sd3-date-card").forEach(card=>card.querySelectorAll(".sd3-date-number,.sd3-date-month,.sd3-date-year").forEach(el=>{if(typeof drawElement==="function")drawElement(ctx,el,design)}));
    design.querySelectorAll(".sd3-prayer-row").forEach(row=>row.querySelectorAll("span,b").forEach(el=>{if(typeof drawElement==="function")drawElement(ctx,el,design)}));
    downloadCanvas(canvas,format,"prayer-design-3");
  }

  function routeExportToActiveDesign(){
    document.querySelectorAll("[data-export-format]").forEach(btn=>btn.addEventListener("click",e=>{if(activeIndex===0)return;e.preventDefault();e.stopImmediatePropagation();if(activeIndex===1)exportSecondDesign(btn.dataset.exportFormat||"png");else exportThirdDesign(btn.dataset.exportFormat||"png")},true));
    document.getElementById("exportBtn")?.addEventListener("click",e=>{if(activeIndex===0)return;e.preventDefault();e.stopImmediatePropagation();if(activeIndex===1)exportSecondDesign("png");else exportThirdDesign("png")},true);
  }

  function initSecondDesign(){
    const preview=document.querySelector(".previewBox"),primary=document.getElementById("design");
    if(!preview||!primary||document.getElementById("design2")||document.getElementById("design3"))return;
    injectStyles();
    const second=createSecondDesign(),third=createThirdDesign();
    setupCarousel(preview,primary,second,third);
    setupDragging(second);setupDragging(third);
    setupSync();syncExtraDesigns();restoreSavedExtraDesigns();routeExportToActiveDesign();resizeDesigns();
    window.addEventListener("resize",resizeDesigns,{passive:true});
    window.addEventListener("orientationchange",()=>setTimeout(resizeDesigns,150),{passive:true});
  }

  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",()=>initSecondDesign());
  else initSecondDesign();
})();
;

/* js/additional-designs.js */
"use strict";

(function(){
  const WIDTH=1024, HEIGHT=1448, TOTAL=4;
  let activeIndex=0;
  let originalDots=[];

  const value=id=>document.getElementById(id)?.value||"";
  const data=()=>({
    day:value("dayName"),gday:value("gregorianDay"),gmonth:value("gregorianMonth"),gyear:value("gregorianYear")?value("gregorianYear")+"م":"",
    hday:value("hijriDay"),hmonth:value("hijriMonth"),hyear:value("hijriYear")?value("hijriYear")+"هـ":"",
    fajr:value("fajr"),sunrise:value("sunrise"),dhuhr:value("dhuhr"),asr:value("asr"),maghrib:value("maghrib"),isha:value("isha"),footer:value("footerText")
  });

  function injectStyles(){
    if(document.getElementById("finalDesignStyles"))return;
    const s=document.createElement("style");
    s.id="finalDesignStyles";
    s.textContent=`
      .removed-design-storage{display:none!important}
      .fourth-design,.reference-design{position:relative;width:1024px;height:1448px;flex:0 0 1024px;overflow:hidden;direction:rtl;transform-origin:top center}
      .fourth-design{color:#183b57;background:linear-gradient(180deg,#ddecf7 0%,#f8fbfd 32%,#eef5f7 100%);box-shadow:inset 0 0 120px rgba(35,78,106,.12)}
      .fourth-design:before{content:"";position:absolute;left:64px;right:64px;top:46px;bottom:46px;border:3px solid #c8a95c;border-radius:48% 48% 34px 34px/18% 18% 34px 34px;pointer-events:none}
      .fourth-design:after{content:"";position:absolute;left:110px;right:110px;top:100px;height:330px;border:2px solid rgba(200,169,92,.55);border-bottom:0;border-radius:420px 420px 0 0/250px 250px 0 0;pointer-events:none}
      .sd4-sky{position:absolute;inset:0;background:radial-gradient(circle at 14% 20%,rgba(255,255,255,.85),transparent 13%),radial-gradient(circle at 82% 17%,rgba(255,255,255,.78),transparent 15%),linear-gradient(180deg,rgba(99,169,207,.18),transparent 38%);pointer-events:none}
      .sd4-title{position:absolute;top:118px;left:130px;right:130px;text-align:center;font-size:54px;font-weight:800;color:#163f60}
      .sd4-verse{position:absolute;top:192px;left:150px;right:150px;text-align:center;font-size:25px;color:#557287}
      .sd4-day{position:absolute;top:292px;left:357px;width:310px;height:102px;border-radius:52px;background:#163f60;color:#fff;display:flex;align-items:center;justify-content:center;font-size:41px;font-weight:800;box-shadow:0 12px 30px rgba(31,73,104,.22)}
      .sd4-date-card{position:absolute;top:438px;width:300px;height:165px;border:2px solid #d4b76d;border-radius:28px;background:rgba(255,255,255,.88);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;box-shadow:0 12px 28px rgba(38,80,106,.12)}
      .sd4-date-card.greg{left:145px}.sd4-date-card.hijri{right:145px}
      .sd4-date-number{font-size:56px;font-weight:800;color:#173f5d;line-height:1}.sd4-date-month{font-size:25px;font-weight:700;color:#365f77}.sd4-date-year{font-size:21px;color:#758793}
      .sd4-prayers{position:absolute;top:650px;left:112px;right:112px;display:flex;flex-direction:column;gap:17px}
      .sd4-prayer-row{height:92px;border:1px solid rgba(53,92,116,.22);border-radius:46px;background:rgba(255,255,255,.92);display:flex;align-items:center;justify-content:space-between;padding:0 48px;box-shadow:0 8px 20px rgba(36,77,102,.10)}
      .sd4-prayer-label{font-size:33px;font-weight:800;color:#183f5c}.sd4-prayer-time{font-size:42px;font-weight:800;color:#2d719a;direction:ltr}
      .sd4-footer{position:absolute;left:120px;right:120px;bottom:74px;min-height:112px;border:2px solid #d4b76d;border-radius:28px;background:rgba(255,255,255,.88);display:flex;align-items:center;justify-content:center;text-align:center;padding:18px 32px;font-size:25px;color:#345b70}

      .reference-design{background:linear-gradient(180deg,#5d95b6 0%,#bcd5e3 25%,#f7f4ea 47%,#d8e5df 72%,#82bdd1 100%);color:#082849;box-shadow:inset 0 0 120px rgba(18,61,88,.15)}
      .ref-sky{position:absolute;inset:0;background:radial-gradient(circle at 20% 20%,rgba(255,255,255,.35),transparent 18%),linear-gradient(180deg,rgba(23,91,130,.12),transparent 45%);pointer-events:none}
      .ref-water{position:absolute;left:0;right:0;bottom:0;height:340px;background:repeating-linear-gradient(180deg,rgba(255,255,255,.24) 0 3px,rgba(37,124,160,.13) 3px 8px),linear-gradient(180deg,#9ed0de,#61a9c3);pointer-events:none}
      .ref-mosque{position:absolute;left:0;right:0;bottom:300px;height:330px;pointer-events:none;opacity:.96}
      .ref-mosque:before{content:"";position:absolute;left:40px;bottom:0;width:430px;height:230px;background:radial-gradient(ellipse at 50% 100%,#f0eadf 0 58%,transparent 59%),linear-gradient(90deg,transparent 0 18%,#ece5d8 18% 28%,transparent 28% 72%,#ece5d8 72% 82%,transparent 82%);filter:drop-shadow(0 8px 4px rgba(25,59,71,.18))}
      .ref-mosque:after{content:"";position:absolute;right:18px;bottom:0;width:430px;height:250px;background:radial-gradient(ellipse at 50% 100%,#f2ecdf 0 58%,transparent 59%),linear-gradient(90deg,transparent 0 18%,#eee7da 18% 28%,transparent 28% 72%,#eee7da 72% 82%,transparent 82%);filter:drop-shadow(0 8px 4px rgba(25,59,71,.18))}
      .ref-minaret{position:absolute;bottom:250px;width:36px;height:280px;background:linear-gradient(90deg,#e9e3d9,#fff7e9,#dfd7ca);border-radius:18px 18px 6px 6px;box-shadow:0 4px 8px rgba(30,70,90,.18)}
      .ref-minaret:before{content:"";position:absolute;left:-9px;top:56px;width:54px;height:18px;border-radius:10px;background:#ddd4c7}.ref-minaret:after{content:"";position:absolute;left:10px;top:-55px;width:16px;height:70px;background:#eee7dc;clip-path:polygon(50% 0,100% 55%,82% 100%,18% 100%,0 55%)}
      .ref-minaret.a{left:54px}.ref-minaret.b{left:166px;height:230px}.ref-minaret.c{right:54px}.ref-minaret.d{right:166px;height:235px}
      .ref-arch{position:absolute;left:62px;right:62px;top:70px;bottom:72px;background:#fbfaf5;border:4px solid #f0d59a;border-radius:48% 48% 32px 32px/13% 13% 32px 32px;box-shadow:inset 0 0 0 10px rgba(255,255,255,.75),0 14px 40px rgba(23,71,97,.16);opacity:.97}
      .ref-arch:before{content:"";position:absolute;left:40px;right:40px;top:20px;height:150px;border:2px solid rgba(232,204,144,.55);border-bottom:0;border-radius:50% 50% 0 0/100% 100% 0 0}
      .ref-verse{position:absolute;top:160px;left:120px;right:120px;text-align:center;font-size:42px;font-weight:700;color:#102a49;line-height:1.45}
      .ref-verse-source{position:absolute;top:238px;left:0;right:0;text-align:center;font-size:19px;font-weight:700;color:#1b354e}
      .ref-date-area{position:absolute;top:315px;left:145px;right:145px;height:190px}
      .ref-date-card{position:absolute;top:0;width:210px;height:165px;border:2px solid #d9bd80;border-radius:18px;background:rgba(255,255,255,.93);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;box-shadow:0 8px 18px rgba(20,58,75,.11)}
      .ref-date-card.greg{left:0}.ref-date-card.hijri{right:0}.ref-date-num{font-size:54px;font-weight:800;line-height:1;color:#0b2948}.ref-date-month{font-size:24px;font-weight:700}.ref-date-year{font-size:21px;font-weight:700;color:#233d51}
      .ref-day{position:absolute;top:330px;left:360px;width:304px;height:132px;display:flex;align-items:center;justify-content:center;text-align:center;background:#073554;color:#f4d598;font-size:44px;font-weight:800;border:3px solid #d5b16a;clip-path:polygon(50% 0,62% 12%,80% 8%,88% 25%,100% 37%,91% 52%,100% 68%,84% 78%,79% 96%,59% 90%,50% 100%,39% 89%,20% 96%,15% 78%,0 68%,9% 52%,0 37%,12% 25%,20% 8%,38% 12%);text-shadow:0 2px 2px #0008}
      .ref-prayers{position:absolute;top:550px;left:205px;right:205px;display:flex;flex-direction:column;gap:13px}
      .ref-prayer-row{height:88px;border:1px solid #d9d6cb;border-radius:44px;background:rgba(255,255,255,.92);display:grid;grid-template-columns:150px 1fr 76px;align-items:center;padding:0 16px 0 28px;box-shadow:0 5px 12px rgba(30,69,85,.08)}
      .ref-prayer-time{font-size:39px;font-weight:800;direction:ltr;text-align:left;color:#092949}.ref-prayer-label{font-size:34px;font-weight:800;text-align:right;color:#0a2949}.ref-prayer-icon{width:66px;height:66px;border-radius:50%;background:linear-gradient(180deg,#0a4367,#062b49);display:flex;align-items:center;justify-content:center;color:#f3d488;font-size:31px;border:2px solid #d9c58d}
      .ref-footer{position:absolute;left:118px;right:118px;bottom:92px;min-height:142px;background:rgba(255,255,255,.94);border:3px solid #d7b86f;border-radius:55px 55px 24px 24px;display:flex;align-items:flex-start;justify-content:center;text-align:center;padding:28px 28px 18px;font-size:28px;font-weight:700;color:#092949;box-shadow:0 10px 20px rgba(16,65,88,.12)}
      .ref-footer:after{content:"♜  ♜  ♜  ♜  ♜  ♜  ♜";position:absolute;left:20px;right:20px;bottom:6px;text-align:center;color:#0a4a70;font-size:29px;letter-spacing:14px}
      .fourth-design .draggable,.reference-design .draggable{cursor:move;touch-action:none;user-select:none}.fourth-design .dragging{outline:2px dashed #2d719a;outline-offset:4px}.reference-design .dragging{outline:2px dashed #d7b86f;outline-offset:4px}
    `;
    document.head.appendChild(s);
  }

  function rows(prefix,icons=false){
    const arr=[["fajr","الفجر","🕌"],["sunrise","الشروق","☀️"],["dhuhr","الظهر","☀️"],["asr","العصر","🕌"],["maghrib","المغرب","🌅"],["isha","العشاء","🌙"]];
    return arr.map(([f,l,i])=>icons?`<div class="ref-prayer-row draggable"><b class="ref-prayer-time" data-field="${f}"></b><span class="ref-prayer-label">${l}</span><span class="ref-prayer-icon">${i}</span></div>`:`<div class="${prefix}-prayer-row draggable"><span class="${prefix}-prayer-label">${l}</span><b class="${prefix}-prayer-time" data-field="${f}"></b></div>`).join("");
  }

  function createFourth(){
    const d=document.createElement("div");d.id="design4";d.className="fourth-design";
    d.innerHTML=`<div class="sd4-sky"></div><div class="sd4-title draggable">مواقيت الصلاة</div><div class="sd4-verse draggable">﴿ إِنَّ الصَّلَاةَ كَانَتْ عَلَى الْمُؤْمِنِينَ كِتَابًا مَوْقُوتًا ﴾</div><div class="sd4-day draggable" data-field="day"></div><div class="sd4-date-card greg draggable"><div class="sd4-date-number" data-field="gday"></div><div class="sd4-date-month" data-field="gmonth"></div><div class="sd4-date-year" data-field="gyear"></div></div><div class="sd4-date-card hijri draggable"><div class="sd4-date-number" data-field="hday"></div><div class="sd4-date-month" data-field="hmonth"></div><div class="sd4-date-year" data-field="hyear"></div></div><div class="sd4-prayers">${rows("sd4")}</div><div class="sd4-footer draggable" data-field="footer"></div>`;return d;
  }

  function createReference(){
    const d=document.createElement("div");d.id="designRef";d.className="reference-design";
    d.innerHTML=`<div class="ref-sky"></div><div class="ref-water"></div><div class="ref-mosque"></div><div class="ref-minaret a"></div><div class="ref-minaret b"></div><div class="ref-minaret c"></div><div class="ref-minaret d"></div><div class="ref-arch"></div><div class="ref-verse draggable">﴿ إِنَّ الصَّلَاةَ تَنْهَى عَنِ الْفَحْشَاءِ وَالْمُنكَرِ ﴾</div><div class="ref-verse-source draggable">(العنكبوت: 45)</div><div class="ref-date-area"><div class="ref-date-card greg draggable"><div class="ref-date-num" data-field="gday"></div><div class="ref-date-month" data-field="gmonth"></div><div class="ref-date-year" data-field="gyear"></div></div><div class="ref-date-card hijri draggable"><div class="ref-date-num" data-field="hday"></div><div class="ref-date-month" data-field="hmonth"></div><div class="ref-date-year" data-field="hyear"></div></div></div><div class="ref-day draggable" data-field="day"></div><div class="ref-prayers">${rows("ref",true)}</div><div class="ref-footer draggable" data-field="footer"></div>`;
    return d;
  }

  function sync(){
    const m=data();[document.getElementById("design4"),document.getElementById("designRef")].forEach(d=>{if(!d)return;Object.entries(m).forEach(([k,v])=>d.querySelectorAll(`[data-field="${k}"]`).forEach(el=>el.textContent=v));});
  }

  function setupDragging(design){design.querySelectorAll(".draggable").forEach(el=>{let drag=false,sx=0,sy=0,bx=0,by=0,scale=1;const p=e=>e.touches?e.touches[0]:e;const start=e=>{if(e.button!==undefined&&e.button!==0)return;const q=p(e),r=design.getBoundingClientRect();scale=r.width/design.offsetWidth||1;sx=q.clientX;sy=q.clientY;bx=parseFloat(el.dataset.x)||0;by=parseFloat(el.dataset.y)||0;drag=true;el.classList.add("dragging");e.preventDefault()};const move=e=>{if(!drag)return;const q=p(e),x=bx+(q.clientX-sx)/scale,y=by+(q.clientY-sy)/scale;el.dataset.x=x;el.dataset.y=y;el.style.transform=`translate(${x}px,${y}px)`;e.preventDefault()};const end=()=>{drag=false;el.classList.remove("dragging")};el.addEventListener("mousedown",start);window.addEventListener("mousemove",move,{passive:false});window.addEventListener("mouseup",end);el.addEventListener("touchstart",start,{passive:false});window.addEventListener("touchmove",move,{passive:false});window.addEventListener("touchend",end)});}

  function rebuild(){
    const track=document.querySelector(".design-carousel-track"),carousel=document.querySelector(".design-carousel");if(!track||!carousel)return false;
    if(document.getElementById("designRef"))return true;

    originalDots=Array.from(document.querySelectorAll(".design-carousel-dot"));
    const primarySlide=document.getElementById("design")?.closest(".design-slide");
    const storage=document.createElement("div");storage.className="removed-design-storage";storage.id="removedDesignStorage";document.body.appendChild(storage);
    if(primarySlide)storage.appendChild(primarySlide);
    document.getElementById("design5")?.closest(".design-slide")?.remove();

    const d4existing=document.getElementById("design4");
    if(d4existing?.closest(".design-slide"))d4existing.closest(".design-slide").remove();
    const d4=createFourth(),ref=createReference();
    [d4,ref].forEach(d=>{const slide=document.createElement("div");slide.className="design-slide";slide.appendChild(d);track.appendChild(slide);setupDragging(d)});
    sync();

    const oldControls=document.querySelector(".design-carousel-controls"),oldDots=document.querySelector(".design-carousel-dots");
    if(oldControls)oldControls.style.display="none";
    if(oldDots)oldDots.style.display="none";
    const controls=document.createElement("div");controls.className="design-carousel-controls final-carousel-controls";controls.innerHTML=`<button class="design-carousel-btn" data-prev>‹</button><span class="design-carousel-status">التصميم 1 من ${TOTAL}</span><button class="design-carousel-btn" data-next>›</button>`;
    const dots=document.createElement("div");dots.className="design-carousel-dots final-carousel-dots";dots.innerHTML=Array.from({length:TOTAL},(_,i)=>`<button class="design-carousel-dot${i===0?" active":""}" data-dot="${i}"></button>`).join("");
    carousel.parentElement.append(controls,dots);

    const render=()=>{
      track.style.transform=`translateX(-${activeIndex*100}%)`;
      controls.querySelector(".design-carousel-status").textContent=`التصميم ${activeIndex+1} من ${TOTAL}`;
      dots.querySelectorAll(".design-carousel-dot").forEach((x,i)=>x.classList.toggle("active",i===activeIndex));
      if(activeIndex===0)originalDots[1]?.click();else if(activeIndex===1)originalDots[2]?.click();else originalDots[0]?.click();
      requestAnimationFrame(()=>track.style.transform=`translateX(-${activeIndex*100}%)`);
      resize();
    };
    controls.querySelector("[data-prev]").onclick=()=>{activeIndex=(activeIndex-1+TOTAL)%TOTAL;render()};controls.querySelector("[data-next]").onclick=()=>{activeIndex=(activeIndex+1)%TOTAL;render()};dots.querySelectorAll("[data-dot]").forEach(x=>x.onclick=()=>{activeIndex=Number(x.dataset.dot);render()});
    let sx=null;carousel.addEventListener("touchstart",e=>{if(e.target.closest(".draggable"))return;sx=e.touches[0].clientX},{passive:true});carousel.addEventListener("touchend",e=>{if(sx===null)return;const dx=e.changedTouches[0].clientX-sx;sx=null;if(Math.abs(dx)>45){activeIndex=dx<0?Math.min(TOTAL-1,activeIndex+1):Math.max(0,activeIndex-1);render()}},{passive:true});
    render();return true;
  }

  function resize(){const p=document.querySelector(".previewBox"),car=document.querySelector(".design-carousel"),designs=["design2","design3","design4","designRef"].map(id=>document.getElementById(id)).filter(Boolean);if(!p||!car||!designs.length)return;if(window.innerWidth>800){designs.forEach(d=>d.style.zoom="1");car.style.height=HEIGHT+"px";return}const cs=getComputedStyle(p),pad=parseFloat(cs.paddingLeft||0)+parseFloat(cs.paddingRight||0),avail=Math.max(220,p.clientWidth-pad-2),sc=Math.min(1,avail/WIDTH);designs.forEach(d=>d.style.zoom=String(sc));car.style.height=Math.ceil(HEIGHT*sc)+"px";}

  function rr(ctx,r,rad=24){ctx.beginPath();if(ctx.roundRect)ctx.roundRect(r.x,r.y,r.w,r.h,rad);else ctx.rect(r.x,r.y,r.w,r.h)}
  function rect(el,d){const r=el.getBoundingClientRect(),dr=d.getBoundingClientRect(),s=dr.width/d.offsetWidth||1;return{x:(r.left-dr.left)/s,y:(r.top-dr.top)/s,w:r.width/s,h:r.height/s}}
  function text(ctx,el,d){
    if(!el)return;
    const r=rect(el,d),st=getComputedStyle(el),fs=parseFloat(st.fontSize)||16,w=st.fontWeight||"400",fam=st.fontFamily||"Arial";
    const content=el.textContent.trim();if(!content)return;
    ctx.save();
    ctx.font=`${w} ${fs}px ${fam}`;
    ctx.fillStyle=st.color||"#fff";
    ctx.textAlign=st.textAlign||"left";
    ctx.textBaseline="middle";
    if("direction" in ctx)ctx.direction=st.direction==="ltr"?"ltr":"rtl";
    let x=r.x;
    if(st.textAlign==="center")x+=r.w/2;else if(st.textAlign==="right")x+=r.w;
    const y=r.y+r.h/2;
    ctx.fillText(content,x,y);
    ctx.restore();
  }
  function download(c,format,name){const mime=format==="jpg"?"image/jpeg":format==="webp"?"image/webp":"image/png";c.toBlob(b=>{if(!b)return;const u=URL.createObjectURL(b),a=document.createElement("a");a.href=u;a.download=`${name}.${format}`;a.click();setTimeout(()=>URL.revokeObjectURL(u),1500)},mime,format==="png"?undefined:.98)}

  async function exportCustom(id,format){
    const d=document.getElementById(id);if(!d)return;try{await document.fonts?.ready}catch(e){}const c=document.createElement("canvas"),S=2;c.width=WIDTH*S;c.height=HEIGHT*S;const ctx=c.getContext("2d");ctx.scale(S,S);
    if(id==="design4"){
      const g=ctx.createLinearGradient(0,0,0,HEIGHT);g.addColorStop(0,"#ddecf7");g.addColorStop(.32,"#f8fbfd");g.addColorStop(1,"#eef5f7");ctx.fillStyle=g;ctx.fillRect(0,0,WIDTH,HEIGHT);ctx.strokeStyle="#c8a95c";ctx.lineWidth=3;rr(ctx,{x:64,y:46,w:896,h:1356},34);ctx.stroke();d.querySelectorAll(".sd4-day,.sd4-date-card,.sd4-prayer-row,.sd4-footer").forEach(el=>{const r=rect(el,d);ctx.fillStyle=el.classList.contains("sd4-day")?"#163f60":"rgba(255,255,255,.95)";ctx.strokeStyle="#d4b76d";rr(ctx,r,el.classList.contains("sd4-prayer-row")?46:26);ctx.fill();ctx.stroke()});d.querySelectorAll(".sd4-title,.sd4-verse,.sd4-day,.sd4-footer,.sd4-date-card div,.sd4-prayer-row span,.sd4-prayer-row b").forEach(el=>text(ctx,el,d));download(c,format,"prayer-design-4");return;
    }
    const g=ctx.createLinearGradient(0,0,0,HEIGHT);g.addColorStop(0,"#5d95b6");g.addColorStop(.35,"#f7f4ea");g.addColorStop(.72,"#d8e5df");g.addColorStop(1,"#82bdd1");ctx.fillStyle=g;ctx.fillRect(0,0,WIDTH,HEIGHT);ctx.fillStyle="#fbfaf5";rr(ctx,{x:62,y:70,w:900,h:1306},55);ctx.fill();ctx.strokeStyle="#f0d59a";ctx.lineWidth=4;ctx.stroke();
    d.querySelectorAll(".ref-date-card,.ref-prayer-row,.ref-footer").forEach(el=>{const r=rect(el,d);ctx.fillStyle="rgba(255,255,255,.95)";ctx.strokeStyle="#d7c28d";ctx.lineWidth=1.5;rr(ctx,r,el.classList.contains("ref-prayer-row")?44:22);ctx.fill();ctx.stroke()});const day=d.querySelector(".ref-day");if(day){const r=rect(day,d);ctx.fillStyle="#073554";rr(ctx,r,28);ctx.fill();ctx.strokeStyle="#d5b16a";ctx.lineWidth=3;ctx.stroke()}
    d.querySelectorAll(".ref-verse,.ref-verse-source,.ref-day,.ref-date-card div,.ref-prayer-row b,.ref-prayer-row .ref-prayer-label,.ref-footer").forEach(el=>text(ctx,el,d));download(c,format,"prayer-design-reference");
  }

  function setupExport(){
    document.querySelectorAll("[data-export-format]").forEach(btn=>btn.addEventListener("click",e=>{if(activeIndex<2)return;e.preventDefault();e.stopImmediatePropagation();exportCustom(activeIndex===2?"design4":"designRef",btn.dataset.exportFormat||"png")},true));
    document.getElementById("exportBtn")?.addEventListener("click",e=>{if(activeIndex<2)return;e.preventDefault();e.stopImmediatePropagation();exportCustom(activeIndex===2?"design4":"designRef","png")},true);
  }

  function setupSync(){["dayName","hijriDay","gregorianDay","hijriMonth","gregorianMonth","hijriYear","gregorianYear","fajr","sunrise","dhuhr","asr","maghrib","isha"].forEach(id=>document.getElementById(id)?.addEventListener("change",()=>setTimeout(sync,0)));document.getElementById("footerText")?.addEventListener("input",sync);const p=document.getElementById("design");if(p)new MutationObserver(sync).observe(p,{subtree:true,childList:true,characterData:true})}

  function init(){injectStyles();if(rebuild()){setupSync();setupExport();sync();resize();window.addEventListener("resize",resize,{passive:true});window.addEventListener("orientationchange",()=>setTimeout(resize,150),{passive:true});return;}let tries=0;const timer=setInterval(()=>{tries++;if(rebuild()||tries>50){clearInterval(timer);if(document.getElementById("designRef")){setupSync();setupExport();sync();resize();window.addEventListener("resize",resize,{passive:true});window.addEventListener("orientationchange",()=>setTimeout(resize,150),{passive:true})}}},150)}
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});else init();
})();

;

/* js/design-order.js */
"use strict";

(function(){
  let ordered=false;

  function setActive(index){
    const slides=Array.from(document.querySelectorAll('.design-carousel-track > .design-slide')).filter(s=>getComputedStyle(s).display!=="none");
    const i=Math.max(0,Math.min(Number(index)||0,slides.length-1));
    window.__prayerActiveDesignIndex=i;
    window.__prayerActiveDesignElement=slides[i]?.firstElementChild||null;
    window.dispatchEvent(new CustomEvent('prayerDesignChanged',{detail:{index:i,design:window.__prayerActiveDesignElement}}));
  }

  function applyPreferredDesignOrder(){
    if(ordered)return true;
    const track=document.querySelector(".design-carousel-track");
    const ref=document.getElementById("designRef")?.closest(".design-slide");
    const d2=document.getElementById("design2")?.closest(".design-slide");
    const d3=document.getElementById("design3")?.closest(".design-slide");
    const d4=document.getElementById("design4")?.closest(".design-slide");
    if(!track||!ref||!d2||!d3||!d4)return false;

    // يرتب التصاميم مرة واحدة فقط عند بداية التشغيل.
    [ref,d2,d3,d4].forEach(slide=>track.appendChild(slide));
    ordered=true;
    setActive(0);
    return true;
  }

  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",applyPreferredDesignOrder,{once:true});else applyPreferredDesignOrder();
  let tries=0;
  const timer=setInterval(()=>{
    tries++;
    if(applyPreferredDesignOrder()||tries>60)clearInterval(timer);
  },100);
})();

;

/* js/night-design.js */
"use strict";
(function(){
  /* التصميم الليلي (حافظ على صلاتك) تم إلغاؤه من المعاينة. */
  function cleanup(){
    const night=document.getElementById('designNight');
    if(night){
      const slide=night.closest('.design-slide');
      if(slide)slide.remove();
      else night.remove();
    }
    document.querySelectorAll('.night-carousel-controls,.night-carousel-dots').forEach(el=>el.remove());
    const finalControls=document.querySelector('.final-carousel-controls');
    const finalDots=document.querySelector('.final-carousel-dots');
    if(finalControls)finalControls.style.removeProperty('display');
    if(finalDots)finalDots.style.removeProperty('display');
    const style=document.getElementById('nightDesignStyles');
    if(style)style.remove();
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',cleanup,{once:true});
  else cleanup();
  window.addEventListener('load',()=>{cleanup();setTimeout(cleanup,400);setTimeout(cleanup,1200);},{once:true});
})();
;

/* js/reference-date-order-fix.js */
"use strict";
(function(){
  const CARD_SELECTOR='#designRef .ref-date-card.greg, #designRef .ref-date-card.hijri';
  const DATE_ROLES={
    '#gregorianDayP':'gday','#gregorianMonthP':'gmonth','#gregorianYearP':'gyear',
    '#hijriDayP':'hday','#hijriMonthP':'hmonth','#hijriYearP':'hyear'
  };

  function orderCard(card,fields){
    const wanted=fields.map(field=>card.querySelector(`[data-field="${field}"]`)).filter(Boolean);
    if(wanted.every((el,i)=>card.children[i]===el))return;
    wanted.forEach(el=>card.appendChild(el));
  }

  function firstDesignActive(){
    return window.__prayerActiveDesignElement?.id==='designRef';
  }

  function selectedDateTarget(){
    if(!firstDesignActive())return null;
    const value=document.getElementById('elementSelect')?.value||'';
    const field=DATE_ROLES[value];
    return field?document.querySelector(`#designRef [data-field="${field}"]`):null;
  }

  function fitCard(card){
    if(card)window.PrayerAdaptiveBoxes?.fit(card);
  }

  function fitAll(){document.querySelectorAll(CARD_SELECTOR).forEach(fitCard);}

  function forceDateFontSize(){
    const target=selectedDateTarget();
    const size=document.getElementById('fontSize');
    if(!target||!size)return;
    const n=parseFloat(size.value);
    if(!Number.isFinite(n)||n<=0)return;
    target.style.setProperty('font-size',`${n}px`,'important');
    requestAnimationFrame(()=>fitCard(target.closest('.ref-date-card')));
    window.dispatchEvent(new CustomEvent('prayerFontChanged',{detail:{design:document.getElementById('designRef'),target}}));
  }

  function apply(){
    const design=document.getElementById('designRef');if(!design)return false;
    const greg=design.querySelector('.ref-date-card.greg'),hijri=design.querySelector('.ref-date-card.hijri');
    if(greg)orderCard(greg,['gday','gmonth','gyear']);
    if(hijri)orderCard(hijri,['hday','hmonth','hyear']);
    fitAll();return true;
  }

  function bindSize(){
    const size=document.getElementById('fontSize');
    if(!size||size.dataset.refDateSizeBound==='1')return;
    size.dataset.refDateSizeBound='1';
    ['input','change'].forEach(ev=>size.addEventListener(ev,()=>requestAnimationFrame(forceDateFontSize)));
  }

  function init(){
    let tries=0;
    const timer=setInterval(()=>{tries++;apply();bindSize();if((document.getElementById('designRef')&&document.getElementById('fontSize'))||tries>50)clearInterval(timer);},120);
    bindSize();
    window.addEventListener('prayerFontChanged',()=>requestAnimationFrame(fitAll));
    window.addEventListener('resize',()=>requestAnimationFrame(fitAll));
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
;

/* js/footer-placement-guard.js */
"use strict";
(function(){
  const FOOTER_TEXT="حسب التوقيت المحلي لمدينة الحويجة وضواحيها";
  const DESIGN_SELECTOR='.design-carousel-track > .design-slide > *, #design';
  const CANDIDATE_SELECTOR='[data-field="footer"],#footerP,.footer,.sd2-footer,.sd2-location,.sd3-footer-card,.sd4-footer,.ref-footer,.nd-footer,.nf-footer';

  function isDesign(el){
    if(!el||el.nodeType!==1)return false;
    return !!(el.matches?.('#design,.second-design,.third-design,.fourth-design,.reference-design,.night-design,[data-design-id]')||el.closest?.('.design-slide'));
  }

  function normalizeDesign(design){
    if(!isDesign(design))return;
    const candidates=Array.from(design.querySelectorAll(CANDIDATE_SELECTOR)).filter((el,i,a)=>a.indexOf(el)===i);
    if(!candidates.length)return;

    // نحتفظ بالنص السفلي الأدنى فقط، ونخفي أي نسخة مكررة تظهر أعلى التصميم.
    let keeper=candidates[0],best=-Infinity;
    candidates.forEach(el=>{
      const top=el.offsetTop+(el.offsetHeight||0)/2;
      if(top>best){best=top;keeper=el;}
    });

    candidates.forEach(el=>{
      if(el===keeper){
        el.style.removeProperty('display');
        el.removeAttribute('aria-hidden');
        if(el.matches('[data-field="footer"]')||/footer/i.test(el.className||'')||el.id==='footerP'){
          if(!String(el.textContent||'').trim())el.textContent=document.getElementById('footerText')?.value||FOOTER_TEXT;
        }
      }else{
        el.style.setProperty('display','none','important');
        el.setAttribute('aria-hidden','true');
      }
    });
  }

  function normalizeAll(){
    const designs=[];
    document.querySelectorAll(DESIGN_SELECTOR).forEach(el=>{
      const design=el.closest('.design-slide')?.firstElementChild||el;
      if(design&&!designs.includes(design))designs.push(design);
    });
    designs.forEach(normalizeDesign);
  }

  function init(){
    normalizeAll();
    setTimeout(normalizeAll,500);
    setTimeout(normalizeAll,1600);
    const root=document.querySelector('.previewBox')||document.body;
    new MutationObserver(()=>requestAnimationFrame(normalizeAll)).observe(root,{childList:true,subtree:true});
    document.getElementById('footerText')?.addEventListener('input',()=>setTimeout(normalizeAll,0));
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
;

/* js/manual-edit-toggle.js */
"use strict";
(function(){
  let enabled=false;
  function injectStyle(){
    if(document.getElementById("manualEditToggleStyle"))return;
    const s=document.createElement("style");s.id="manualEditToggleStyle";
    s.textContent=`
      .manual-edit-toggle-wrap{display:flex;align-items:center;justify-content:center;margin:0}
      #manualEditToggle{width:100%;min-height:34px;border:1px solid rgba(255,255,255,.16);border-radius:8px;padding:7px 10px;font-family:inherit;font-size:13px;font-weight:700;cursor:pointer;transition:.2s;background:#263746;color:#fff;box-shadow:none;display:flex;align-items:center;justify-content:space-between;gap:8px}
      #manualEditToggle.is-on{background:#147c49;color:#fff}
      #manualEditToggle .manual-label{white-space:nowrap}
      #manualEditToggle .state{display:inline-flex;align-items:center;justify-content:center;min-width:48px;padding:2px 7px;border-radius:999px;background:rgba(255,255,255,.12);font-size:11px;font-weight:800}
      body.manual-edit-off .previewBox .draggable,body.manual-edit-off .previewBox .drag,body.manual-edit-off .previewBox [data-preview-movable="1"]{cursor:default!important;touch-action:auto!important;user-select:none!important}
      body.manual-edit-on .previewBox .draggable,body.manual-edit-on .previewBox .drag,body.manual-edit-on .previewBox [data-preview-movable="1"]{cursor:move!important;touch-action:none!important}
    `;document.head.appendChild(s);
  }
  function setState(on){
    enabled=!!on;
    window.__manualPreviewEditingEnabled=enabled;
    document.body.classList.toggle("manual-edit-on",enabled);
    document.body.classList.toggle("manual-edit-off",!enabled);
    const b=document.getElementById("manualEditToggle");if(!b)return;
    b.classList.toggle("is-on",enabled);b.setAttribute("aria-pressed",String(enabled));
    b.innerHTML=enabled?'<span class="manual-label">✋ التعديل اليدوي</span><span class="state">تشغيل</span>':'<span class="manual-label">🔒 التعديل اليدوي</span><span class="state">إيقاف</span>';
  }
  function blockWhenOff(e){
    if(enabled)return;
    if(!e.target.closest?.('.previewBox'))return;
    if(e.type==='pointerdown'||e.type==='mousedown'||e.type==='touchstart'){
      e.stopImmediatePropagation();
      e.stopPropagation();
    }
  }
  function init(){
    injectStyle();setState(false);
    let b=document.getElementById("manualEditToggle");
    if(!b){
      const preview=document.querySelector(".previewBox");if(!preview)return;
      const wrap=document.createElement("div");wrap.className="manual-edit-toggle-wrap";
      b=document.createElement("button");b.id="manualEditToggle";b.type="button";wrap.appendChild(b);
      const header=document.querySelector(".preview-header");if(header&&header.parentNode)header.insertAdjacentElement("afterend",wrap);else preview.parentNode.insertBefore(wrap,preview);
    }
    if(!b.dataset.manualBound){b.dataset.manualBound='1';b.addEventListener("click",()=>setState(!enabled));}
    setState(false);
    document.addEventListener('pointerdown',blockWhenOff,true);
    document.addEventListener('mousedown',blockWhenOff,true);
    document.addEventListener('touchstart',blockWhenOff,{capture:true,passive:true});
  }
  window.PrayerManualEdit={isEnabled:()=>enabled,set:setState};
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});else init();
})();
;

/* js/background-tools-organizer.js */
"use strict";
(function(){
  function addStyles(){
    if(document.getElementById("backgroundToolsStyles"))return;
    const s=document.createElement("style");
    s.id="backgroundToolsStyles";
    s.textContent=`
      #backgroundDesignTools{margin-top:10px;padding-top:10px;border-top:1px solid rgba(255,255,255,.10)}
      #backgroundDesignTools .bg-tools-title{font-size:13px;font-weight:800;margin:0 0 7px;color:#e7eef3}
      #backgroundDesignTools .bg-tools-grid{display:grid;grid-template-columns:1fr;gap:5px}
      #backgroundDesignTools button{width:100%!important;min-width:0!important;margin:0!important;min-height:34px!important;border-radius:8px!important;padding:7px 10px!important;font-size:13px!important;font-weight:700!important;box-shadow:none!important}
      #backgroundDesignTools .manual-edit-toggle-wrap{margin:0!important;width:100%!important}
      #backgroundDesignTools #manualEditToggle{width:100%!important}
      #backgroundDesignTools #saveDesignAdjustments,#backgroundDesignTools #resetPositions{display:flex!important;align-items:center!important;justify-content:center!important;gap:6px!important;background:#263746!important;color:#fff!important;border:1px solid rgba(255,255,255,.16)!important}
      #backgroundDesignTools #saveDesignAdjustments:hover,#backgroundDesignTools #resetPositions:hover{filter:brightness(1.08)}
    `;
    document.head.appendChild(s);
  }

  function moveTools(){
    const panel=document.getElementById("backgroundPanel");
    if(!panel)return false;
    addStyles();

    let box=document.getElementById("backgroundDesignTools");
    if(!box){
      box=document.createElement("div");
      box.id="backgroundDesignTools";
      box.innerHTML='<div class="bg-tools-title">🛠 أدوات تعديل التصميم</div><div class="bg-tools-grid"></div>';
      panel.appendChild(box);
    }
    const grid=box.querySelector(".bg-tools-grid");
    const manualWrap=document.querySelector(".manual-edit-toggle-wrap");
    let save=document.getElementById("saveDesignAdjustments");
    if(!save){save=document.createElement('button');save.id='saveDesignAdjustments';save.type='button';grid.appendChild(save);}
    const reset=document.getElementById("resetPositions");

    if(manualWrap&&manualWrap.parentElement!==grid)grid.appendChild(manualWrap);
    if(save&&save.parentElement!==grid)grid.appendChild(save);
    if(reset&&reset.parentElement!==grid)grid.appendChild(reset);

    if(save) save.textContent="💾 حفظ التعديلات";
    if(reset) reset.textContent="↻ إعادة التموضع";

    return !!(manualWrap&&save&&reset);
  }

  function init(){
    let tries=0;
    const timer=setInterval(()=>{
      tries++;
      const done=moveTools();
      if(done||tries>80)clearInterval(timer);
    },150);
    moveTools();
  }

  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});else init();
})();
;

/* js/footer-background-organizer.js */
"use strict";
(function(){
  function addStyles(){
    if(document.getElementById("footerBackgroundOrganizerStyles")) return;
    const s=document.createElement("style");
    s.id="footerBackgroundOrganizerStyles";
    s.textContent=`
      /* النص السفلي له مكان واحد فقط داخل الإعدادات؛ لا يُنشأ داخل واجهة البرنامج. */
    `;
    document.head.appendChild(s);
  }

  function organize(){
    const mainPanel=document.querySelector('.sidebar .main-panel');
    const footerPanel=document.getElementById('footerPanel');
    if(!mainPanel||!footerPanel) return false;

    addStyles();

    /* إزالة النسخة القديمة التي كانت تُضاف داخل واجهة البرنامج. */
    const oldWrap=document.getElementById('backgroundFooterControl');
    if(oldWrap){
      if(footerPanel.parentElement===oldWrap) mainPanel.appendChild(footerPanel);
      oldWrap.remove();
    }

    footerPanel.classList.remove('footer-inside-open');
    return true;
  }

  function init(){
    let tries=0;
    const timer=setInterval(()=>{
      tries++;
      if(organize()||tries>80) clearInterval(timer);
    },150);
    organize();
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
})();
;

/* js/interface-clock.js */
"use strict";
(function(){
  const STYLE_KEY="prayerDesignerInterfaceClockStylesV3",POS_KEY="prayerDesignerInterfaceHeaderPositionsV1";
  const TARGETS=["#liveClockTime","#liveClockDate"];
  function pad(v){return String(v).padStart(2,"0");}
  function injectStyles(){if(document.getElementById("interfaceClockStyles"))return;const s=document.createElement("style");s.id="interfaceClockStyles";s.textContent=`
    .topbar.web-interface-header{direction:ltr!important;display:flex!important;align-items:center!important;justify-content:center!important;gap:10px!important;padding:8px 12px!important;min-height:48px!important;position:relative!important;overflow:visible!important}
    .interface-clock-card,.interface-date-card{min-width:0;display:flex!important;align-items:center!important;gap:5px!important;padding:6px 9px!important;border:1px solid rgba(255,255,255,.14)!important;border-radius:10px!important;background:linear-gradient(145deg,rgba(20,39,51,.94),rgba(8,24,35,.94))!important;box-shadow:0 4px 14px rgba(0,0,0,.14)!important;user-select:none!important;position:relative;z-index:3}
    body.manual-edit-on .header-draggable{cursor:grab!important;touch-action:none!important}
    body.manual-edit-on .header-draggable:active{cursor:grabbing!important}
    body.manual-edit-off .header-draggable{cursor:default!important;touch-action:auto!important}
    .topbar.web-interface-header #saveToPhoneBtn{margin:0!important;flex:0 0 auto!important;padding:6px 8px!important;min-height:30px!important;position:relative;z-index:2}
    .interface-clock-icon,.interface-date-icon{font-size:13px!important;line-height:1!important;opacity:.9;pointer-events:none}
    #liveClockTime{display:flex!important;align-items:baseline!important;gap:4px!important;direction:ltr!important;color:#f8fbfd;font-size:17px;font-weight:800;line-height:1.1;font-variant-numeric:tabular-nums;white-space:nowrap}
    #liveClockDate{display:flex!important;align-items:center!important;gap:4px!important;direction:ltr!important;color:#dfe8ed;font-size:14px;font-weight:700;line-height:1.1;font-variant-numeric:tabular-nums;white-space:nowrap}
    #liveClockTime *,#liveClockDate *{font-family:inherit!important;font-size:inherit!important;font-weight:inherit!important;color:inherit!important;text-shadow:inherit!important}
    #liveClockDate .interface-date-sep{opacity:.52}
    @media(max-width:600px){.topbar.web-interface-header{gap:5px!important;padding:6px 4px!important}.interface-clock-card,.interface-date-card{padding:5px 6px!important;gap:3px!important}.interface-clock-icon,.interface-date-icon{display:none!important}#liveClockTime{font-size:16px}#liveClockDate{font-size:14px}.topbar.web-interface-header #saveToPhoneBtn{padding:5px 6px!important;font-size:10.5px!important}}
  `;document.head.appendChild(s);}
  function clockEl(){const d=document.createElement("div");d.className="interface-clock-card header-draggable";d.dataset.headerItem="clock";d.innerHTML='<div class="interface-clock-icon">◷</div><div id="liveClockTime"><div id="liveClockDigits">12:00:00</div><div id="liveClockPeriod">ص</div></div>';return d;}
  function dateEl(){const d=document.createElement("div");d.className="interface-date-card header-draggable";d.dataset.headerItem="date";d.innerHTML='<div class="interface-date-icon">▣</div><div id="liveClockDate"><div id="liveDateDay">01</div><div class="interface-date-sep">/</div><div id="liveDateMonth">01</div><div class="interface-date-sep">/</div><div id="liveDateYear">2026</div></div>';return d;}
  function build(){const h=document.querySelector(".topbar");if(!h)return false;h.classList.add("web-interface-header");h.querySelectorAll(".brand,.interface-clock-card,.interface-date-card").forEach(x=>x.remove());const save=h.querySelector("#saveToPhoneBtn,#exportBtn"),date=dateEl(),clock=clockEl();h.append(date);if(save)h.append(save);h.append(clock);return true;}
  function renameSave(){const b=document.querySelector("#saveToPhoneBtn");if(!b)return;b.title="حفظ الصورة";const span=b.querySelector("span");if(span)span.textContent="حفظ الصورة";else b.textContent="حفظ الصورة";}
  function update(){const n=new Date();let h=n.getHours(),p=h<12?"ص":"م";h=((h+11)%12)+1;const q=id=>document.getElementById(id);if(q("liveClockDigits"))q("liveClockDigits").textContent=`${pad(h)}:${pad(n.getMinutes())}:${pad(n.getSeconds())}`;if(q("liveClockPeriod"))q("liveClockPeriod").textContent=p;if(q("liveDateDay"))q("liveDateDay").textContent=pad(n.getDate());if(q("liveDateMonth"))q("liveDateMonth").textContent=pad(n.getMonth()+1);if(q("liveDateYear"))q("liveDateYear").textContent=n.getFullYear();}
  function addOptions(){const sel=document.getElementById("elementSelect");if(!sel)return;[["#liveClockTime","الساعة"],["#liveClockDate","التاريخ"]].forEach(([v,t])=>{const o=Array.from(sel.options).find(x=>x.value===v);if(o)o.textContent=t;else sel.add(new Option(t,v));});}
  function state(){try{return JSON.parse(localStorage.getItem(STYLE_KEY)||"{}")||{};}catch(_){return {};}}
  function setImportant(el,prop,value){if(value!==undefined&&value!==null&&value!=="")el.style.setProperty(prop,value,"important");}
  function applySaved(sel,st){const el=document.querySelector(sel);if(!el||!st)return;setImportant(el,"font-family",st.family);setImportant(el,"font-size",st.size);setImportant(el,"font-weight",st.weight);setImportant(el,"color",st.color);setImportant(el,"text-align",st.align);setImportant(el,"text-shadow",st.shadow);}
  function restoreStyles(){const all=state();TARGETS.forEach(sel=>applySaved(sel,all[sel]));}
  function selected(){const v=document.getElementById("elementSelect")?.value;return TARGETS.includes(v)?v:null;}
  function shadowValue(v){return({none:"none",black:"0 2px 4px rgba(0,0,0,.85)",gold:"0 2px 5px #b98a28",green:"0 2px 5px #1f8a55"})[v]||v||"none";}
  function applyOne(id){const sel=selected(),el=sel&&document.querySelector(sel);if(!el)return;let prop,value;if(id==="fontFamily"){prop="font-family";value=document.getElementById(id)?.value;}else if(id==="fontSize"){prop="font-size";value=(document.getElementById(id)?.value||"")+"px";}else if(id==="fontWeight"){prop="font-weight";value=document.getElementById(id)?.value;}else if(id==="fontColor"){prop="color";value=document.getElementById(id)?.value;}else if(id==="textAlign"){prop="text-align";value=document.getElementById(id)?.value;}else if(id==="textShadow"){prop="text-shadow";value=shadowValue(document.getElementById(id)?.value);}else return;setImportant(el,prop,value);const cs=getComputedStyle(el),all=state();all[sel]={family:cs.fontFamily,size:cs.fontSize,weight:cs.fontWeight,color:cs.color,align:cs.textAlign,shadow:cs.textShadow};try{localStorage.setItem(STYLE_KEY,JSON.stringify(all));}catch(_){}}
  function syncControls(){const sel=selected(),el=sel&&document.querySelector(sel);if(!el)return;const cs=getComputedStyle(el),q=id=>document.getElementById(id);if(q("fontSize"))q("fontSize").value=parseFloat(cs.fontSize)||14;if(q("fontWeight"))q("fontWeight").value=cs.fontWeight;if(q("fontColor")){const m=cs.color.match(/\d+/g);if(m&&m.length>=3)q("fontColor").value="#"+m.slice(0,3).map(n=>(+n).toString(16).padStart(2,"0")).join("");}}
  function bindFormatting(){if(document.documentElement.dataset.headerFormatBound)return;document.documentElement.dataset.headerFormatBound="1";const ids=["fontFamily","fontSize","fontWeight","fontColor","textAlign","textShadow"];
    document.addEventListener("input",e=>{if(ids.includes(e.target?.id)&&selected())applyOne(e.target.id);},true);
    document.addEventListener("change",e=>{if(e.target?.id==="elementSelect")setTimeout(syncControls,0);if(ids.includes(e.target?.id)&&selected())applyOne(e.target.id);},true);
    document.addEventListener("click",e=>{const sw=e.target?.closest?.("#designColorPalette .palette-color,.palette-color");const sel=selected();if(!sw||!sel)return;const color=sw.dataset.color||sw.dataset.value;if(!color)return;const el=document.querySelector(sel);setImportant(el,"color",color);const input=document.getElementById("fontColor");if(input)input.value=color;const all=state(),cs=getComputedStyle(el);all[sel]={...(all[sel]||{}),color:cs.color};try{localStorage.setItem(STYLE_KEY,JSON.stringify(all));}catch(_){}},true);
  }
  function readPos(){try{return JSON.parse(localStorage.getItem(POS_KEY)||"{}")||{};}catch(_){return {};}}
  function savePos(el){const p=readPos();p[el.dataset.headerItem]={x:Number(el.dataset.x||0),y:Number(el.dataset.y||0)};try{localStorage.setItem(POS_KEY,JSON.stringify(p));}catch(_){}}
  function setPos(el,x,y){el.dataset.x=x;el.dataset.y=y;el.style.transform=`translate(${x}px,${y}px)`;}
  function manualOn(){return window.PrayerManualEdit?.isEnabled?.()===true||window.__manualPreviewEditingEnabled===true;}
  function bindDrag(el){if(el.dataset.dragBound)return;el.dataset.dragBound="1";const old=readPos()[el.dataset.headerItem];if(old)setPos(el,old.x||0,old.y||0);let active=false,sx=0,sy=0,bx=0,by=0;el.addEventListener("pointerdown",e=>{if(!manualOn())return;if(e.button!==undefined&&e.button!==0)return;active=true;sx=e.clientX;sy=e.clientY;bx=Number(el.dataset.x||0);by=Number(el.dataset.y||0);el.setPointerCapture?.(e.pointerId);e.preventDefault();});el.addEventListener("pointermove",e=>{if(!active)return;if(!manualOn()){active=false;return;}setPos(el,bx+e.clientX-sx,by+e.clientY-sy);});const end=()=>{if(!active)return;active=false;savePos(el);};el.addEventListener("pointerup",end);el.addEventListener("pointercancel",end);}
  function ensure(){renameSave();document.querySelectorAll(".header-draggable").forEach(bindDrag);}
  function init(){injectStyles();if(!build())return;addOptions();restoreStyles();bindFormatting();update();ensure();setTimeout(ensure,150);setTimeout(ensure,800);setInterval(update,1000);window.addEventListener("aoqatModulesReady",ensure);document.addEventListener("visibilitychange",()=>{if(!document.hidden)update();});}
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});else init();
})();
;

/* js/font-controls-core.js */
"use strict";
(function(){
  const ROLE_BY_VALUE={'.quran':'quran','#dayP':'day','#hijriDayP':'hday','#gregorianDayP':'gday','#hijriMonthP':'hmonth','#gregorianMonthP':'gmonth','#hijriYearP':'hyear','#gregorianYearP':'gyear','.prayer-row:nth-child(1)':'fajr','.prayer-row:nth-child(2)':'sunrise','.prayer-row:nth-child(3)':'dhuhr','.prayer-row:nth-child(4)':'asr','.prayer-row:nth-child(5)':'maghrib','.prayer-row:nth-child(6)':'isha','#footerP':'footer'};
  const ALIASES={
    quran:['[data-field="quran"]','.quran','.verse','.sd2-verse','.sd3-verse','.sd4-verse','.nd-verse','.nf-verse','.ref-verse','.or-verse'],
    day:['[data-field="day"]','#dayP','.weekday','.sd2-day','.sd3-day','.sd4-day','.nd-day','.nf-day','.ref-day','.or-day'],
    hday:['[data-field="hday"]','#hijriDayP','.hijri-day','.sd2-date-card.hijri .sd2-date-number','.sd3-date-card.hijri .sd3-date-number','.sd4-date-card.hijri .sd4-date-number','.ref-date-card.hijri .ref-date-num'],
    gday:['[data-field="gday"]','#gregorianDayP','.gregorian-day','.sd2-date-card.greg .sd2-date-number','.sd3-date-card.greg .sd3-date-number','.sd4-date-card.greg .sd4-date-number','.ref-date-card.greg .ref-date-num'],
    hmonth:['[data-field="hmonth"]','#hijriMonthP','.hijri-month','.sd2-date-card.hijri .sd2-date-month','.sd3-date-card.hijri .sd3-date-month','.sd4-date-card.hijri .sd4-date-month','.ref-date-card.hijri .ref-date-month'],
    gmonth:['[data-field="gmonth"]','#gregorianMonthP','.gregorian-month','.sd2-date-card.greg .sd2-date-month','.sd3-date-card.greg .sd3-date-month','.sd4-date-card.greg .sd4-date-month','.ref-date-card.greg .ref-date-month'],
    hyear:['[data-field="hyear"]','#hijriYearP','.hijri-year','.sd2-date-card.hijri .sd2-date-year','.sd3-date-card.hijri .sd3-date-year','.sd4-date-card.hijri .sd4-date-year','.ref-date-card.hijri .ref-date-year'],
    gyear:['[data-field="gyear"]','#gregorianYearP','.gregorian-year','.sd2-date-card.greg .sd2-date-year','.sd3-date-card.greg .sd3-date-year','.sd4-date-card.greg .sd4-date-year','.ref-date-card.greg .ref-date-year'],
    footer:['[data-field="footer"]','#footerP','.footer','.sd2-footer','.sd3-footer-card','.sd4-footer','.nd-footer','.nf-footer','.ref-footer','.or-footer']
  };
  const PRAYERS=['fajr','sunrise','dhuhr','asr','maghrib','isha'];
  const ROW_SELECTOR='.prayer-row,.sd2-prayer-row,.sd3-prayer-row,.sd4-prayer-row,.nd-prayer-row,.nf-row,.ref-prayer-row,.or-row,[data-prayer-row]';
  function slides(){const t=document.querySelector('.design-carousel-track');return t?Array.from(t.children).filter(s=>s.classList.contains('design-slide')&&getComputedStyle(s).display!=='none'):[];}
  function statusIndex(){const s=document.querySelector('.final-carousel-controls .design-carousel-status')?.textContent||'';const m=s.match(/(\d+)\s*من\s*(\d+)/);return m?Number(m[1])-1:null;}
  function activeRoot(){
    const list=slides();if(!list.length)return document.getElementById('design');
    const pinned=window.__prayerActiveDesignElement;if(list.some(s=>s.firstElementChild===pinned))return pinned;
    let i=statusIndex();
    if(i===null){const car=document.querySelector('.design-carousel'),cr=car?.getBoundingClientRect();if(cr?.width){const cx=cr.left+cr.width/2;let best=0,dist=Infinity;list.forEach((s,n)=>{const r=s.getBoundingClientRect(),d=Math.abs(r.left+r.width/2-cx);if(r.width&&d<dist){dist=d;best=n;}});i=best;}else i=0;}
    i=Math.max(0,Math.min(i,list.length-1));return list[i]?.firstElementChild||null;
  }
  function role(){const v=document.getElementById('elementSelect')?.value||'';if(ROLE_BY_VALUE[v])return ROLE_BY_VALUE[v];const m=v.match(/data-(?:field|f)=["']?([^"'\]]+)/i);return m?m[1]:null;}
  const unique=a=>Array.from(new Set(a.filter(Boolean)));
  function targetsFor(r,root=activeRoot()){
    if(!root||!r)return [];
    if(PRAYERS.includes(r)){
      let rows=[];root.querySelectorAll(`[data-field="${r}"],[data-f="${r}"]`).forEach(el=>{rows.push(el.closest(ROW_SELECTOR)||el);});
      if(!rows.length){const all=Array.from(root.querySelectorAll(ROW_SELECTOR)),p=PRAYERS.indexOf(r);if(all[p])rows=[all[p]];}
      const out=[];rows.forEach(row=>{out.push(row);row.querySelectorAll('*').forEach(el=>{if(el.matches('.ref-prayer-icon,[data-icon]'))return;if(el.children.length===0&&(el.textContent||'').trim())out.push(el);});});return unique(out);
    }
    const out=[];[`[data-field="${r}"]`,`[data-f="${r}"]`,...(ALIASES[r]||[])].forEach(sel=>{try{root.querySelectorAll(sel).forEach(el=>out.push(el));}catch(_){}});return unique(out);
  }
  function shadow(v){if(v==='black')return '4px 4px 3px #000';if(v==='gold')return '4px 4px 3px #000,0 0 10px #ffd45c';if(v==='green')return '4px 4px 3px #000,0 0 10px #26ff00';return 'none';}
  function designKey(root){return root?.id||root?.dataset?.designId||'design';}
  function remember(root,r,kind,value){if(!root||!r)return;const k=`aoqat-font:${designKey(root)}:${r}:${kind}`;try{localStorage.setItem(k,String(value));}catch(_){}}
  function apply(kind){
    const root=activeRoot(),r=role();if(!root||!r)return;const targets=targetsFor(r);if(!targets.length)return;
    const vals={fontFamily:document.getElementById('fontFamily')?.value,fontSize:parseFloat(document.getElementById('fontSize')?.value||''),fontWeight:document.getElementById('fontWeight')?.value,fontColor:document.getElementById('fontColor')?.value,textAlign:document.getElementById('textAlign')?.value,textShadow:document.getElementById('textShadow')?.value};
    targets.forEach(el=>{if((!kind||kind==='fontFamily')&&vals.fontFamily)el.style.setProperty('font-family',`"${vals.fontFamily}", Arial, sans-serif`,'important');if((!kind||kind==='fontSize')&&Number.isFinite(vals.fontSize)&&vals.fontSize>0)el.style.setProperty('font-size',`${vals.fontSize}px`,'important');if((!kind||kind==='fontWeight')&&vals.fontWeight)el.style.setProperty('font-weight',vals.fontWeight,'important');if((!kind||kind==='fontColor')&&vals.fontColor)el.style.setProperty('color',vals.fontColor,'important');if((!kind||kind==='textAlign')&&vals.textAlign)el.style.setProperty('text-align',vals.textAlign,'important');if((!kind||kind==='textShadow')&&vals.textShadow!=null)el.style.setProperty('text-shadow',shadow(vals.textShadow),'important');});
    if(kind&&kind in vals)remember(root,r,kind,vals[kind]);window.dispatchEvent(new CustomEvent('prayerFontChanged',{detail:{design:root,role:r,targets}}));
  }
  function restore(root=activeRoot()){
    if(!root)return;
    const kinds={fontFamily:'font-family',fontSize:'font-size',fontWeight:'font-weight',fontColor:'color',textAlign:'text-align',textShadow:'text-shadow'};
    for(const r of new Set([...Object.values(ROLE_BY_VALUE),...PRAYERS]))for(const [kind,property] of Object.entries(kinds)){
      let value;try{value=localStorage.getItem(`aoqat-font:${designKey(root)}:${r}:${kind}`);}catch(_){continue;}
      if(value===null)continue;
      if(kind==='fontSize'){if(!Number.isFinite(Number(value))||Number(value)<=0)continue;value=Number(value)+'px';}
      else if(kind==='fontFamily')value=`"${value}", Arial, sans-serif`;
      else if(kind==='textShadow')value=shadow(value);
      targetsFor(r,root).forEach(el=>el.style.setProperty(property,value,'important'));
    }
  }
  function restoreAll(){slides().forEach(s=>restore(s.firstElementChild));}
  function load(){const t=targetsFor(role())[0];if(!t)return;const s=getComputedStyle(t),size=document.getElementById('fontSize');if(size)size.value=Math.round(parseFloat(s.fontSize)||40);const w=document.getElementById('fontWeight');if(w){const x=String(parseInt(s.fontWeight)||400);if(Array.from(w.options).some(o=>o.value===x))w.value=x;}const c=document.getElementById('fontColor');if(c&&/^rgb/.test(s.color)){const m=s.color.match(/\d+/g);if(m?.length>=3)c.value='#'+m.slice(0,3).map(n=>(+n).toString(16).padStart(2,'0')).join('');}}
  function init(){
    ['fontFamily','fontSize','fontWeight','fontColor','textAlign','textShadow'].forEach(id=>{const el=document.getElementById(id);if(!el)return;const ev=(id==='fontSize'||id==='fontColor')?'input':'change';el.addEventListener(ev,()=>apply(id),true);if(ev!=='change')el.addEventListener('change',()=>apply(id),true);});
    document.getElementById('elementSelect')?.addEventListener('change',()=>setTimeout(load,0),true);
    const sync=()=>setTimeout(()=>{restoreAll();const root=activeRoot();window.__prayerActiveDesignElement=root;const list=slides();window.__prayerActiveDesignIndex=Math.max(0,list.findIndex(s=>s.firstElementChild===root));load();},20);
    document.addEventListener('click',e=>{if(e.target.closest('.final-carousel-controls,.final-carousel-dots,.design-carousel-btn,.design-carousel-dot'))sync();},true);window.addEventListener('prayerDesignChanged',sync);
  }
  window.addEventListener('aoqatModulesReady',()=>{restoreAll();load();});
  window.PrayerFontCore={activeRoot,targetsFor,apply,load,restore,restoreAll};if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
;

/* js/universal-font-controls.js */
"use strict";
/*
 * واجهة مساعدة فقط لنظام الخطوط.
 * مصدر الحقيقة الوحيد لتحديد التصميم النشط وتطبيق التنسيق هو PrayerFontCore.
 * هذا يمنع أي مستمع قديم من تعديل تصميم آخر بعد إعادة ترتيب الكاروسيل.
 */
(function(){
  function core(){return window.PrayerFontCore||null;}
  function activeDesign(){return core()?.activeRoot?.()||null;}
  function roleTargets(role){return core()?.targetsFor?.(role)||[];}
  function load(){core()?.load?.();}

  function rgbToHex(rgb){
    const m=String(rgb||'').match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
    if(!m)return '#ffffff';
    return '#'+[m[1],m[2],m[3]].map(n=>Number(n).toString(16).padStart(2,'0')).join('');
  }
  function collectDesignColors(){
    const root=activeDesign();if(!root)return [];
    const colors=new Set();
    [root,...root.querySelectorAll('*')].forEach(el=>{
      const c=getComputedStyle(el).color;
      if(c&&c!=='rgba(0, 0, 0, 0)')colors.add(rgbToHex(c));
    });
    return Array.from(colors).filter(c=>/^#[0-9a-f]{6}$/i.test(c));
  }
  function markSelected(c){
    document.querySelectorAll('#designColorPalette .palette-color').forEach(b=>b.classList.toggle('selected',(b.dataset.color||'').toLowerCase()===String(c||'').toLowerCase()));
  }
  function applyColor(c){
    const input=document.getElementById('fontColor');if(!input)return;
    input.value=c;markSelected(c);
    input.dispatchEvent(new Event('input',{bubbles:true}));
    input.dispatchEvent(new Event('change',{bubbles:true}));
  }
  function addSwatch(parent,color,cls=''){
    const b=document.createElement('button');b.type='button';b.className=`palette-color ${cls}`.trim();b.dataset.color=color;b.style.setProperty('--aoqat-swatch-color',color);b.style.setProperty('background-color',color,'important');b.style.setProperty('background-image','none','important');b.title=color;b.addEventListener('click',()=>applyColor(color));parent.appendChild(b);
  }
  function renderDesignColors(){
    const sw=document.querySelector('#designColorPalette .design-color-swatches');if(!sw)return;
    sw.innerHTML='';collectDesignColors().forEach(c=>addSwatch(sw,c,'design-swatch'));markSelected(document.getElementById('fontColor')?.value);
  }
  function buildColorPalette(){
    const input=document.getElementById('fontColor');if(!input||document.getElementById('designColorPalette'))return;
    input.style.display='none';
    const wrap=document.createElement('div');wrap.id='designColorPaletteWrap';
    const toggle=document.createElement('button');toggle.type='button';toggle.id='designColorPaletteToggle';toggle.setAttribute('aria-expanded','false');toggle.innerHTML='<span>🎨 الألوان</span><span class="palette-toggle-arrow">▼</span>';
    const box=document.createElement('div');box.id='designColorPalette';box.hidden=true;box.innerHTML='<div class="palette-title">ألوان النسق</div><div class="theme-base-row"></div><div class="theme-shade-grid"></div><div class="palette-title standard-title">ألوان قياسية</div><div class="standard-colors"></div><div class="palette-title design-title">ألوان التصميم الحالي</div><div class="design-color-swatches"></div>';
    wrap.append(toggle,box);
    const st=document.createElement('style');st.id='officeLikeColorPaletteStyles';st.textContent='#fontPanel .font-controls{gap:1px!important;row-gap:1px!important}#fontPanel .font-controls>label,#fontPanel.inline-control-panel label{margin:0!important;padding:0!important;line-height:1.05!important;font-size:12px!important}#fontPanel .font-controls select,#fontPanel .font-controls input[type="number"]{min-height:30px!important;height:30px!important;margin:1px 0!important;padding-top:1px!important;padding-bottom:1px!important;font-size:13px!important}#fontPanel .font-upload{min-height:30px!important;height:30px!important;margin:1px 0!important;padding:3px 6px!important;display:flex!important;align-items:center!important;justify-content:center!important}#designColorPaletteWrap{margin:1px 0!important}#designColorPaletteToggle{width:100%;min-height:30px;height:30px;padding:3px 7px;border:1px solid rgba(255,255,255,.16);border-radius:7px;background:rgba(31,58,75,.9);color:#fff;font:inherit;font-weight:800;display:flex;align-items:center;justify-content:space-between;cursor:pointer}#designColorPaletteToggle .palette-toggle-arrow{font-size:10px;opacity:.8;transition:transform .18s ease}#designColorPaletteWrap.palette-open #designColorPaletteToggle .palette-toggle-arrow{transform:rotate(180deg)}#designColorPalette[hidden]{display:none!important}#designColorPalette{margin-top:2px;padding:4px 7px;border:1px solid rgba(255,255,255,.12);border-radius:8px;background:rgba(3,16,24,.28)}#designColorPalette .palette-title{font-size:12px;font-weight:800;line-height:1.1;margin:0 0 2px}#designColorPalette .theme-base-row{display:grid;grid-template-columns:repeat(10,minmax(20px,1fr));gap:3px;margin-bottom:2px}#designColorPalette .theme-shade-grid{display:grid;grid-template-columns:repeat(10,minmax(20px,1fr));gap:3px;margin-bottom:4px}#designColorPalette .theme-shade-column{display:grid;grid-template-rows:repeat(5,18px);gap:1px}#designColorPalette .theme-shade-column .palette-color{height:18px}#designColorPalette .standard-title{margin:0 0 2px!important}#designColorPalette .standard-colors{display:grid;grid-template-columns:repeat(10,minmax(20px,1fr));gap:3px;margin-bottom:2px}#designColorPalette .design-title{margin:0 0 2px!important}#designColorPalette .design-color-swatches{display:flex;flex-wrap:wrap;gap:3px}#fontPanel .inline-back-btn,#fontPanel .panel-back-btn,#fontPanel button[class*="back"],#fontPanel button[aria-label*="رجوع"]{display:none!important}.palette-color{background-color:var(--aoqat-swatch-color)!important;background-image:none!important;width:100%;height:24px;min-width:0;padding:0;border:1px solid rgba(255,255,255,.28);border-radius:3px;cursor:pointer}.theme-base-row .palette-color{height:25px}.design-color-swatches .palette-color{width:23px;height:23px;border-radius:4px}.palette-color.selected{outline:2px solid #fff;outline-offset:1px}@media(max-width:800px){#fontPanel.inline-control-panel label{margin:0!important;padding:0!important}#fontPanel .font-controls{gap:1px!important;row-gap:1px!important}#fontPanel .font-controls select,#fontPanel .font-controls input[type="number"]{min-height:30px!important;height:30px!important}#fontPanel .font-upload{min-height:30px!important;height:30px!important}}';document.head.appendChild(st);
    input.insertAdjacentElement('afterend',wrap);
    const base=['#70ad47','#4472c4','#ffc000','#a5a5a5','#ed7d31','#5b9bd5','#44546a','#e7e6e6','#000000','#ffffff'];
    const shadeColumns=[
      ['#e2f0d9','#c6e0b4','#a9d18e','#548235','#375623'],
      ['#d9e2f3','#b4c6e7','#8eaadb','#2f5597','#203864'],
      ['#fff2cc','#ffe699','#ffd966','#bf9000','#7f6000'],
      ['#ededed','#dbdbdb','#bfbfbf','#7f7f7f','#595959'],
      ['#fce4d6','#f8cbad','#f4b183','#c65911','#833c0c'],
      ['#ddebf7','#bdd7ee','#9dc3e6','#2e75b6','#1f4e78'],
      ['#d9e1f2','#b4c6e7','#8497b0','#323f4f','#222a35'],
      ['#f2f2f2','#d9d9d9','#bfbfbf','#7f7f7f','#3f3f3f'],
      ['#d9d9d9','#a6a6a6','#737373','#404040','#171717'],
      ['#f2f2f2','#d9d9d9','#bfbfbf','#a6a6a6','#7f7f7f']
    ];
    const standard=['#7030a0','#002060','#0070c0','#00b0f0','#00b050','#92d050','#ffff00','#ffc000','#ff0000','#c00000'];
    base.forEach(c=>addSwatch(box.querySelector('.theme-base-row'),c));
    const shadeGrid=box.querySelector('.theme-shade-grid');
    shadeColumns.forEach(col=>{
      const column=document.createElement('div');column.className='theme-shade-column';
      col.forEach(c=>addSwatch(column,c,'theme-shade'));
      shadeGrid.appendChild(column);
    });
    standard.forEach(c=>addSwatch(box.querySelector('.standard-colors'),c));
    renderDesignColors();
    toggle.addEventListener('click',()=>{const open=box.hidden;box.hidden=!open;wrap.classList.toggle('palette-open',open);toggle.setAttribute('aria-expanded',String(open));if(open)renderDesignColors();});
  }
  function init(){
    buildColorPalette();
    window.addEventListener('prayerDesignChanged',()=>setTimeout(()=>{load();renderDesignColors();},100));
    document.getElementById('elementSelect')?.addEventListener('change',()=>setTimeout(load,0));
  }
  window.PrayerUniversalFonts={activeDesign,roleTargets,load,renderDesignColors};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
;

/* js/adaptive-design-boxes.js */
"use strict";
/* تمديد الحاويات النصية تلقائياً عند تغيير تنسيق الخط، بدون تغيير شكلها الأصلي كحد أدنى. */
(function(){
  const CARD_SELECTORS=[
    '.ref-date-card','.sd4-date-card','.sd3-date-card','.sd2-date-card',
    '.date-card','.hijri-card','.gregorian-card','[data-date-card]',
    '.nd-date-card','.nf-date-card','.or-date-card'
  ].join(',');
  const TEXT_SELECTORS='[data-field],[data-f],.ref-date-num,.ref-date-month,.ref-date-year,.sd4-date-number,.sd4-date-month,.sd4-date-year,.sd3-date-number,.sd3-date-month,.sd3-date-year,.sd2-date-number,.sd2-date-month,.sd2-date-year';

  function rememberBase(card){
    if(card.dataset.adaptiveBoxReady==='1')return;
    const s=getComputedStyle(card);
    card.dataset.adaptiveBoxReady='1';
    card.dataset.adaptiveMinW=String(card.offsetWidth||parseFloat(s.width)||0);
    card.dataset.adaptiveMinH=String(card.offsetHeight||parseFloat(s.height)||0);
    card.style.setProperty('box-sizing','border-box');
  }
  function fit(card){
    if(!card||!card.offsetWidth)return;rememberBase(card);
    const minW=parseFloat(card.dataset.adaptiveMinW)||0,minH=parseFloat(card.dataset.adaptiveMinH)||0;
    const items=Array.from(card.querySelectorAll(TEXT_SELECTORS)).filter(el=>(el.textContent||'').trim());
    if(!items.length)return;
    const cs=getComputedStyle(card),px=(parseFloat(cs.paddingLeft)||0)+(parseFloat(cs.paddingRight)||0),py=(parseFloat(cs.paddingTop)||0)+(parseFloat(cs.paddingBottom)||0);
    let widest=0,total=0;
    items.forEach(el=>{
      el.style.setProperty('white-space','nowrap','important');
      widest=Math.max(widest,el.scrollWidth);total+=el.offsetHeight;
    });
    const gap=Math.max(0,items.length-1)*(parseFloat(cs.rowGap)||0);
    const borderX=(parseFloat(cs.borderLeftWidth)||0)+(parseFloat(cs.borderRightWidth)||0),borderY=(parseFloat(cs.borderTopWidth)||0)+(parseFloat(cs.borderBottomWidth)||0);
    const needW=Math.ceil(widest+px+borderX),needH=Math.ceil(total+py+gap+borderY);
    card.style.setProperty('width',Math.max(minW,needW)+'px','important');
    card.style.setProperty('min-width',Math.max(minW,needW)+'px','important');
    card.style.setProperty('height',Math.max(minH,needH)+'px','important');
    card.style.setProperty('min-height',Math.max(minH,needH)+'px','important');
    card.style.setProperty('overflow','visible','important');
  }
  function fitRoot(root){(root||document).querySelectorAll(CARD_SELECTORS).forEach(fit);}
  function fitAll(){document.querySelectorAll(CARD_SELECTORS).forEach(fit);}
  let fitQueued=false;const fitRoots=new Set();function schedule(root){fitRoots.add(root||document);if(fitQueued)return;fitQueued=true;requestAnimationFrame(()=>{fitQueued=false;for(const node of fitRoots)fitRoot(node);fitRoots.clear();});}
  function init(){
    fitAll();
    window.addEventListener('prayerFontChanged',e=>schedule(e.detail?.design||window.PrayerFontCore?.activeRoot?.()));
    window.addEventListener('prayerDesignChanged',e=>schedule(e.detail?.design));
    window.addEventListener('resize',()=>schedule(document));
    new MutationObserver(m=>{
      if(m.some(x=>x.target.closest?.(CARD_SELECTORS)||[...x.addedNodes,...x.removedNodes].some(n=>n.nodeType===1)))schedule(document.querySelector(".previewBox"));
    }).observe(document.querySelector(".previewBox")||document.body,{subtree:true,childList:true});
  }
  function restoreStyle(el,style){
    if(style)el.setAttribute('style',style);else el.removeAttribute('style');
    if(el.matches('.ref-date-card')){
      // These dimensions came from the old auto-fit routines, not user controls.
      // Recalculate from the original card and the preserved font/position.
      ['width','height','min-width','min-height','max-width','max-height','padding','overflow'].forEach(p=>el.style.removeProperty(p));
      delete el.dataset.adaptiveBoxReady;
    }
  }
  window.PrayerAdaptiveBoxes={fit,fitRoot,fitAll,restoreStyle};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
;

/* js/font-design-manager.js */
"use strict";
(function(){
  const STORE_KEY="prayerDesignerFontStylesByDesignV2";
  let dirty=false,pendingTarget=null,bypass=false;

  function activeDesign(){return window.PrayerUniversalFonts?.activeDesign?.()||document.getElementById('design');}
  function designKey(design){
    if(!design)return '';
    if(design.dataset.fontDesignKey)return design.dataset.fontDesignKey;
    const slide=design.closest('.design-slide');
    const slides=Array.from(document.querySelectorAll('.design-carousel-track > .design-slide')).filter(s=>getComputedStyle(s).display!=="none");
    const idx=Math.max(0,slides.indexOf(slide));
    const cls=Array.from(design.classList).find(c=>/design|reference|ornate|night|^sd|^nd|^nf/i.test(c));
    return design.dataset.fontDesignKey=design.id||cls||`preview-design-${idx}`;
  }
  function path(el,root){if(el===root)return 'root';const a=[];let n=el;while(n&&n!==root){const p=n.parentElement;if(!p)break;a.push(Array.prototype.indexOf.call(p.children,n));n=p;}return a.reverse().join('.');}
  function find(root,p){if(p==='root')return root;let n=root;for(const x of String(p).split('.')){const i=Number(x);if(!n?.children?.[i])return null;n=n.children[i];}return n;}
  function props(el){const s=el.style,o={};['fontFamily','fontSize','fontWeight','color','textAlign','textShadow'].forEach(k=>{if(s[k])o[k]=s[k];});return o;}
  function read(){try{return JSON.parse(localStorage.getItem(STORE_KEY)||'{}')||{};}catch(_){return {};}}
  function write(v){try{localStorage.setItem(STORE_KEY,JSON.stringify(v));}catch(e){console.error(e);}}
  function snapshot(d){const items={};[d,...d.querySelectorAll('*')].forEach(el=>{const p=props(el);if(Object.keys(p).length)items[path(el,d)]=p;});return {items};}
  function saveCurrent(){const d=activeDesign();if(!d)return false;const st=read();st[designKey(d)]=snapshot(d);write(st);dirty=false;badge();return true;}
  function applySaved(d){if(!d)return;const saved=read()[designKey(d)];if(saved?.items)Object.entries(saved.items).forEach(([p,pr])=>{const el=find(d,p);if(el)Object.entries(pr).forEach(([k,v])=>el.style[k]=v);});window.PrayerFontCore?.restore?.(d);}
  function restoreAll(){document.querySelectorAll('.design-carousel-track > .design-slide').forEach(s=>{if(getComputedStyle(s).display!=="none")applySaved(s.firstElementChild);});}
  function mark(){dirty=true;badge();}
  function badge(){const b=document.querySelector('[data-open-panel="fontPanel"]');if(!b)return;let x=b.querySelector('.font-save-badge');if(dirty&&!x){x=document.createElement('span');x.className='font-save-badge';x.textContent='غير محفوظ';b.appendChild(x);}if(x)x.style.display=dirty?'inline-flex':'none';}
  function styles(){if(document.getElementById('fontDesignManagerStyles'))return;const s=document.createElement('style');s.id='fontDesignManagerStyles';s.textContent=`.font-save-badge{margin-inline-start:auto;padding:2px 7px;border-radius:999px;background:#c87820;color:#fff;font-size:10px;font-weight:800}#fontSaveWarning{position:fixed;inset:0;z-index:100000;display:none;align-items:center;justify-content:center;padding:18px;background:rgba(2,12,20,.72)}#fontSaveWarning.open{display:flex}#fontSaveWarning .font-warning-card{width:min(390px,94vw);border-radius:15px;background:#102733;color:#fff;padding:18px}#fontSaveWarning .font-warning-actions{display:grid;grid-template-columns:1fr 1fr;gap:8px}#fontSaveWarning button{border:0;border-radius:9px;padding:10px 12px;font-family:inherit;font-weight:800}#fontSaveWarningSave{background:#178b52;color:#fff}#fontSaveWarningStay{background:#314b59;color:#fff}`;document.head.appendChild(s);}
  function modal(){let m=document.getElementById('fontSaveWarning');if(m)return m;m=document.createElement('div');m.id='fontSaveWarning';m.innerHTML=`<div class="font-warning-card"><h3>💾 حفظ تعديلات تنسيق الخط</h3><p>لديك تعديلات غير محفوظة على هذا التصميم.</p><div class="font-warning-actions"><button id="fontSaveWarningSave" type="button">حفظ التعديلات</button><button id="fontSaveWarningStay" type="button">البقاء هنا</button></div></div>`;document.body.appendChild(m);m.querySelector('#fontSaveWarningStay').onclick=()=>{pendingTarget=null;m.classList.remove('open');};m.querySelector('#fontSaveWarningSave').onclick=()=>{saveCurrent();document.getElementById('saveDesignAdjustments')?.click();m.classList.remove('open');const t=pendingTarget;pendingTarget=null;if(t){bypass=true;setTimeout(()=>{t.click();setTimeout(()=>bypass=false,0);},0);}};return m;}
  function shouldGuard(t){if(!dirty||bypass)return false;if(t.closest('.design-carousel-btn,.design-carousel-dot'))return true;const a=t.closest('.main-action[data-open-panel]');return !!a&&a.dataset.openPanel!=='fontPanel';}
  function init(){styles();modal();restoreAll();setTimeout(restoreAll,800);setTimeout(restoreAll,1800);
    window.addEventListener('prayerFontChanged',mark);
    document.addEventListener('click',e=>{if(shouldGuard(e.target)){e.preventDefault();e.stopImmediatePropagation();pendingTarget=e.target.closest('.design-carousel-btn,.design-carousel-dot,.main-action[data-open-panel]');modal().classList.add('open');}},true);
    document.addEventListener('click',e=>{if(e.target.closest('.design-carousel-btn,.design-carousel-dot'))setTimeout(()=>applySaved(activeDesign()),220);});
    const save=document.getElementById('saveDesignAdjustments');if(save)save.addEventListener('click',()=>{if(dirty)saveCurrent();},true);
    window.addEventListener('beforeunload',e=>{if(dirty){e.preventDefault();e.returnValue='';}});
  }
  window.PrayerFontDesignManager={save:saveCurrent,restore:restoreAll,isDirty:()=>dirty};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
;

/* js/design-history.js */
"use strict";
(function(){
  const STORE_KEY="prayerDesignerUniversalSavedStateV2";
  const HISTORY_LIMIT=40;
  let history=[];
  let lastState="";
  let restoring=false;
  let ready=false;

  function slides(){return Array.from(document.querySelectorAll('.design-carousel-track > .design-slide'));}
  function editableIn(slide){
    return Array.from(slide.querySelectorAll('[style],[data-x],[data-y],.draggable,.drag,.quran,.weekday,.hijri-month,.gregorian-month,.hijri-year,.gregorian-year,.prayer-row,.footer,.nf-title,.nf-sub,.nf-day,.nf-date,.nf-row,.nf-footer'));
  }
  function identity(el,slide){
    const classes=Array.from(el.classList).filter(c=>!['draggable','drag','dragging','preview-moving'].includes(c)).sort().join('.');
    const field=el.dataset.field||el.dataset.f||'';
    const card=el.closest('.greg,.hijri');
    const row=el.closest('[data-prayer-row],.ref-prayer-row,.or-row');
    const prayer=row?.dataset.prayerRow||row?.querySelector('[data-field]')?.dataset.field||'';
    return el.id?'id:'+el.id:[el.tagName,classes,field,card?.classList.contains('greg')?'greg':card?'hijri':'',prayer].join('|');
  }
  function snapshot(){
    return JSON.stringify(slides().map((slide,si)=>({
      si,
      designId:slide.firstElementChild?.id||'',
      items:editableIn(slide).map((el,ei)=>({
        ei,
        key:identity(el,slide),
        id:el.id||"",
        cls:el.className||"",
        style:el.getAttribute('style')||"",
        x:el.dataset.x??null,
        y:el.dataset.y??null
      }))
    })));
  }
  function applyState(raw){
    if(!raw)return;
    let state;
    try{state=typeof raw==='string'?JSON.parse(raw):raw;}catch(_){return;}
    restoring=true;
    const currentSlides=slides();
    if(!Array.isArray(state)){restoring=false;return;}
    state.forEach(s=>{
      let slide=s.designId?currentSlides.find(x=>x.firstElementChild?.id===s.designId):null;
      if(!slide&&!s.designId){
        // Older records identify their root in the first item. Never attach a
        // removed design's styles to the slide that later occupies its index.
        const rootId=s.items?.find(item=>item.id&&document.getElementById(item.id)?.closest('.design-slide')?.firstElementChild?.id===item.id)?.id;
        if(rootId)slide=currentSlides.find(x=>x.firstElementChild?.id===rootId);
        if(!slide){const candidate=currentSlides[s.si];const root=candidate?.firstElementChild;
          if(root&&s.items?.some(item=>item.cls&&String(root.className)===item.cls))slide=candidate;}
      }
      if(!slide)return;
      const els=editableIn(slide);
      s.items.forEach(item=>{
        let el=null;
        if(item.id)el=slide.querySelector('#'+CSS.escape(item.id));
        if(!el&&item.key){const matches=Array.from(slide.querySelectorAll('*')).filter(x=>identity(x,slide)===item.key);if(matches.length===1)el=matches[0];}
        if(!el&&!item.key&&item.cls){
          const matches=Array.from(slide.querySelectorAll('*')).filter(x=>String(x.className)===item.cls);
          if(matches.length===1)el=matches[0];
          else if(matches.includes(els[item.ei]))el=els[item.ei];
        }
        if(!el)return;
        if(window.PrayerAdaptiveBoxes)window.PrayerAdaptiveBoxes.restoreStyle(el,item.style);else {if(item.style)el.setAttribute('style',item.style);else el.removeAttribute('style');}
        if(item.x===null)delete el.dataset.x;else el.dataset.x=String(item.x);
        if(item.y===null)delete el.dataset.y;else el.dataset.y=String(item.y);
      });
    });
    requestAnimationFrame(()=>{window.PrayerAdaptiveBoxes?.fitAll();restoring=false;lastState=snapshot();});
  }
  function ensureUndoButton(){
    let btn=document.getElementById('undoDesignChange');
    if(btn)return btn;
    const grid=document.querySelector('#backgroundDesignTools .bg-tools-grid');
    if(!grid)return null;
    btn=document.createElement('button');
    btn.id='undoDesignChange';
    btn.type='button';
    btn.textContent='↶ الرجوع إلى الوراء';
    btn.style.cssText='display:none;border:0;border-radius:8px;padding:10px 14px;font-size:14px;font-weight:700;color:#fff;background:#8b5d1e;cursor:pointer;width:100%';
    grid.appendChild(btn);
    btn.addEventListener('click',()=>{
      if(!history.length)return;
      const prev=history.pop();
      applyState(prev);
      updateUndo();
    });
    return btn;
  }
  function updateUndo(){const b=ensureUndoButton();if(b)b.style.display=history.length?'block':'none';}
  function recordBeforeChange(){
    if(restoring||!ready)return;
    const now=snapshot();
    if(!lastState){lastState=now;return;}
    if(now!==lastState){
      history.push(lastState);
      if(history.length>HISTORY_LIMIT)history.shift();
      lastState=now;
      updateUndo();
    }
  }
  function commitCurrent(){if(!restoring)lastState=snapshot();}
  function watchUserChanges(){
    const controls=['fontFamily','fontSize','fontWeight','fontColor','textAlign','textShadow'];
    controls.forEach(id=>{
      const el=document.getElementById(id);if(!el)return;
      ['mousedown','touchstart','focus'].forEach(ev=>el.addEventListener(ev,recordBeforeChange,{passive:true}));
      ['input','change'].forEach(ev=>el.addEventListener(ev,()=>setTimeout(commitCurrent,0)));
    });
    document.addEventListener('mousedown',e=>{if(e.target.closest('.draggable,.drag'))recordBeforeChange();},true);
    document.addEventListener('touchstart',e=>{if(e.target.closest('.draggable,.drag'))recordBeforeChange();},{capture:true,passive:true});
    document.addEventListener('mouseup',()=>setTimeout(commitCurrent,0),true);
    document.addEventListener('touchend',()=>setTimeout(commitCurrent,0),true);
  }
  function connectSave(){
    const btn=document.getElementById('saveDesignAdjustments');
    if(!btn)return false;
    btn.addEventListener('click',()=>{
      const state=snapshot();
      localStorage.setItem(STORE_KEY,state);
      history=[];
      lastState=state;
      updateUndo();
    },true);
    return true;
  }
  function restoreSaved(){const saved=localStorage.getItem(STORE_KEY);if(saved)applyState(saved);}
  function init(){
    let tries=0;
    const timer=setInterval(()=>{
      tries++;
      const track=document.querySelector('.design-carousel-track');
      const tools=document.querySelector('#backgroundDesignTools .bg-tools-grid');
      if(!track||!tools){if(tries>100)clearInterval(timer);return;}
      clearInterval(timer);
      ensureUndoButton();
      restoreSaved();
      setTimeout(()=>{
        lastState=snapshot();
        ready=true;
        watchUserChanges();
        connectSave();
        updateUndo();
      },500);
    },120);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();

;

/* js/universal-preview-editor.js */
"use strict";
(function(){
  const STORE_KEY="prayerDesignerFullPreviewStateV3";
  const MOVE_ATTR="data-preview-movable";
  let drag=null;
  function injectStyles(){if(document.getElementById("universalPreviewEditorStyles"))return;const s=document.createElement("style");s.id="universalPreviewEditorStyles";s.textContent=`.reference-design .ref-prayer-row{display:grid!important;grid-template-columns:150px minmax(0,1fr) 76px!important;grid-template-areas:"time label icon"!important;direction:ltr!important;column-gap:22px!important;padding:0 24px!important;align-items:center!important}.reference-design .ref-prayer-time{grid-area:time!important;text-align:left!important;direction:ltr!important;margin:0!important}.reference-design .ref-prayer-label{grid-area:label!important;text-align:center!important;direction:rtl!important;margin:0!important;white-space:nowrap!important}.reference-design .ref-prayer-icon{grid-area:icon!important;justify-self:end!important;margin:0!important}body.manual-edit-on .previewBox [${MOVE_ATTR}="1"]{cursor:move!important;touch-action:none!important;user-select:none!important}.preview-moving{outline:2px dashed rgba(235,181,68,.95)!important;outline-offset:3px!important;z-index:9999!important}`;document.head.appendChild(s);}
  function meaningfulLeaf(el){if(!el||el.closest('.removed-design-storage'))return false;if(el.matches('.ref-sky,.ref-water,.ref-mosque,.ref-minaret,.ref-arch,.sd4-sky,.border,.ornament'))return false;const text=(el.textContent||'').trim();return !!(text||el.hasAttribute('data-field')||el.hasAttribute('data-f'));}
  function markMovables(){const root=document.querySelector('.previewBox');if(!root)return;root.querySelectorAll('.draggable,.drag').forEach(el=>el.setAttribute(MOVE_ATTR,'1'));root.querySelectorAll('[data-field],[data-f],.prayer-row span,.prayer-row b,.sd2-prayer-row span,.sd2-prayer-row b,.sd3-prayer-row span,.sd3-prayer-row b,.sd4-prayer-row span,.sd4-prayer-row b,.nd-prayer-row span,.nd-prayer-row b,.ref-prayer-row span,.ref-prayer-row b,.nf-row span,.nf-row b,.sd2-date-card > *, .sd4-date-card > *, .ref-date-card > *').forEach(el=>{if(meaningfulLeaf(el))el.setAttribute(MOVE_ATTR,'1');});root.querySelectorAll('.reference-design .ref-prayer-row').forEach(row=>{row.removeAttribute(MOVE_ATTR);row.classList.remove('draggable','drag');row.querySelectorAll('.ref-prayer-icon,.ref-prayer-label,.ref-prayer-time').forEach(el=>{el.setAttribute(MOVE_ATTR,'1');el.classList.add('draggable');});});assignKeys();}
  function designKey(design,index){return design.id||Array.from(design.classList).find(c=>/design|^sd|^nd|^nf|reference/.test(c))||`design-${index}`;}
  function assignKeys(){
    const designs=Array.from(document.querySelectorAll('.previewBox .design-slide > *, .previewBox > #design'));
    designs.forEach((design,di)=>{
      const counts=new Map();
      Array.from(design.querySelectorAll(`[${MOVE_ATTR}="1"]`)).forEach(el=>{
        const semantic=el.getAttribute('data-field')||el.getAttribute('data-f')||el.id||Array.from(el.classList).filter(c=>!['draggable','drag','dragging','preview-moving'].includes(c)).slice(0,2).join('.')||'item';
        const ordinal=counts.get(semantic)||0;counts.set(semantic,ordinal+1);
        el.dataset.previewSaveKey=`${designKey(design,di)}::${semantic}::v4-${ordinal}`;
      });
    });
  }
  function getScale(el){const design=el.closest('.design,.second-design,.third-design,.fourth-design,.reference-design,.night-design,.ornate-design,[id^="design"]')||el.closest('.design-slide')?.firstElementChild;if(!design)return 1;const rect=design.getBoundingClientRect(),logical=design.offsetWidth||1024;return rect.width?rect.width/logical:1;}
  function editEnabled(){return window.__manualPreviewEditingEnabled===true&&document.body.classList.contains('manual-edit-on');}
  function startDrag(e){if(!editEnabled())return;const target=e.target.closest?.(`[${MOVE_ATTR}="1"]`);if(!target||!target.closest('.previewBox'))return;e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();const scale=getScale(target)||1,x=Number(target.dataset.previewX||0),y=Number(target.dataset.previewY||0);drag={el:target,id:e.pointerId,startX:e.clientX,startY:e.clientY,baseX:x,baseY:y,scale};target.classList.add('preview-moving');try{target.setPointerCapture(e.pointerId)}catch(_){}}
  function moveDrag(e){if(!drag||e.pointerId!==drag.id||!editEnabled())return;e.preventDefault();const dx=(e.clientX-drag.startX)/drag.scale,dy=(e.clientY-drag.startY)/drag.scale,x=Math.round(drag.baseX+dx),y=Math.round(drag.baseY+dy);drag.el.dataset.previewX=String(x);drag.el.dataset.previewY=String(y);drag.el.style.transform=`translate(${x}px, ${y}px)`;}
  function endDrag(e){if(!drag||e.pointerId!==drag.id)return;drag.el.classList.remove('preview-moving');try{drag.el.releasePointerCapture(e.pointerId)}catch(_){}drag=null;}
  function captureState(){assignKeys();const out={version:3,items:{}};document.querySelectorAll(`.previewBox [${MOVE_ATTR}="1"]`).forEach(el=>{const key=el.dataset.previewSaveKey;if(!key)return;out.items[key]={style:el.getAttribute('style')||'',x:el.dataset.previewX||'',y:el.dataset.previewY||'',dataX:el.dataset.x||'',dataY:el.dataset.y||''};});return out;}
  function applyState(state){if(!state?.items)return;assignKeys();document.querySelectorAll(`.previewBox [${MOVE_ATTR}="1"]`).forEach(el=>{let saved=state.items[el.dataset.previewSaveKey];
    if(!saved){const prefix=el.dataset.previewSaveKey.split('::').slice(0,2).join('::')+'::';
      const old=Object.keys(state.items).filter(k=>k.startsWith(prefix)&&!k.includes('::v4-'));
      // Migrate an unambiguous old semantic key, regardless of its old list index.
      if(old.length===1)saved=state.items[old[0]];}
    if(!saved)return;if(window.PrayerAdaptiveBoxes)window.PrayerAdaptiveBoxes.restoreStyle(el,saved.style);else {if(saved.style)el.setAttribute('style',saved.style);else el.removeAttribute('style');}if(saved.x)el.dataset.previewX=saved.x;else delete el.dataset.previewX;if(saved.y)el.dataset.previewY=saved.y;else delete el.dataset.previewY;if(saved.dataX)el.dataset.x=saved.dataX;else delete el.dataset.x;if(saved.dataY)el.dataset.y=saved.dataY;else delete el.dataset.y;});}
  function saveNow(){try{localStorage.setItem(STORE_KEY,JSON.stringify(captureState()));}catch(e){console.error(e);}}
  function restoreNow(){try{const raw=localStorage.getItem(STORE_KEY);if(raw)applyState(JSON.parse(raw));}catch(e){console.error(e);}}
  function bindSave(){const btn=document.getElementById('saveDesignAdjustments');if(!btn||btn.dataset.fullPreviewSaveBound==='1')return;btn.dataset.fullPreviewSaveBound='1';btn.addEventListener('click',()=>{markMovables();saveNow();},true);}
  function init(){injectStyles();markMovables();restoreNow();bindSave();setTimeout(()=>{markMovables();restoreNow();bindSave();},900);document.addEventListener('pointerdown',startDrag,true);document.addEventListener('pointermove',moveDrag,true);document.addEventListener('pointerup',endDrag,true);document.addEventListener('pointercancel',endDrag,true);let queued=false;const obs=new MutationObserver(records=>{if(queued||!records.some(r=>[...r.addedNodes,...r.removedNodes].some(n=>n.nodeType===1)))return;queued=true;requestAnimationFrame(()=>{queued=false;markMovables();bindSave();});});const preview=document.querySelector(".previewBox");if(preview)obs.observe(preview,{childList:true,subtree:true});}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
;

/* js/prayer-countdown-mobile-fix.js */
"use strict";
(function(){
  function fix(){
    const next=document.getElementById("nextPrayerLabel");
    const iqama=document.getElementById("iqamaLabel");
    [next,iqama].forEach(el=>{
      if(!el||el.tagName!=="SPAN") return;
      const d=document.createElement("div");
      d.id=el.id;
      d.className="prayer-countdown-label";
      d.textContent=el.textContent;
      el.replaceWith(d);
    });
    const iq=document.getElementById("iqamaStatus");
    if(iq?.hidden) iq.style.setProperty("display","none","important");
  }
  const style=document.createElement("style");
  style.id="prayerCountdownMobileFixStyles";
  style.textContent=`
    #nextPrayerLabel,#iqamaLabel{display:block!important;line-height:1.4!important;direction:rtl!important;white-space:nowrap!important}
    #iqamaStatus[hidden]{display:none!important}
    #iqamaStatus:not([hidden]){display:flex!important}
    @media(max-width:600px){.next-prayer{max-width:100%!important;flex-wrap:nowrap!important}}
  `;
  document.head.appendChild(style);
  fix();
  setTimeout(fix,100);
  setTimeout(fix,700);
  window.addEventListener("aoqatModulesReady",fix);
  const obs=new MutationObserver(()=>{
    const iq=document.getElementById("iqamaStatus");
    if(iq?.hidden) iq.style.setProperty("display","none","important");
    else if(iq) iq.style.removeProperty("display");
  });
  setTimeout(()=>{const iq=document.getElementById("iqamaStatus");if(iq)obs.observe(iq,{attributes:true,attributeFilter:["hidden"]});},150);
})();
;

/* js/prayer-countdown-edit-bridge.js */
"use strict";
(function(){
  const ADHAN_VALUE="__livePrayerAdhan__",IQAMA_VALUE="__livePrayerIqama__",ADHAN_STYLE_KEY="aoqat-live-adhan-style-v1",IQAMA_STYLE_KEY="aoqat-live-iqama-style-v1",LEGACY_STYLE_KEY="aoqat-live-countdown-style-v2",POS_KEY="aoqat-live-countdown-position-v1";
  let drag=null;
  const status=()=>document.querySelector('.preview-header .live-prayer-status');
  const targets=(value)=>{const s=status();if(!s)return[];return value===IQAMA_VALUE?Array.from(s.querySelectorAll('#iqamaLabel,#iqamaCountdown')):Array.from(s.querySelectorAll('#nextPrayerLabel,#nextPrayerCountdown'));};
  const selected=()=>document.getElementById('elementSelect')?.value;
  const styleKey=(value)=>value===IQAMA_VALUE?IQAMA_STYLE_KEY:ADHAN_STYLE_KEY;
  function shadow(v){if(v==='black')return '4px 4px 3px #000';if(v==='gold')return '4px 4px 3px #000,0 0 10px #ffd45c';if(v==='green')return '4px 4px 3px #000,0 0 10px #26ff00';return 'none';}
  function read(k){try{return JSON.parse(localStorage.getItem(k)||'{}');}catch(_){return {};}}
  function write(k,v){try{localStorage.setItem(k,JSON.stringify(v));}catch(_){}}
  function applySaved(){const legacy=read(LEGACY_STYLE_KEY);[ADHAN_VALUE,IQAMA_VALUE].forEach(value=>{const own=read(styleKey(value)),v=Object.assign({},legacy,own);targets(value).forEach(el=>{if(v.fontFamily)el.style.setProperty('font-family',`"${v.fontFamily}",Arial,sans-serif`,'important');if(v.fontSize)el.style.setProperty('font-size',`${v.fontSize}px`,'important');if(v.fontWeight)el.style.setProperty('font-weight',v.fontWeight,'important');if(v.fontColor)el.style.setProperty('color',v.fontColor,'important');if(v.textAlign)el.style.setProperty('text-align',v.textAlign,'important');if(v.textShadow!=null)el.style.setProperty('text-shadow',shadow(v.textShadow),'important');});});}
  function apply(kind){const value=selected();if(value!==ADHAN_VALUE&&value!==IQAMA_VALUE)return;const el=document.getElementById(kind);if(!el)return;const key=styleKey(value),v=read(key);v[kind]=kind==='fontSize'?parseFloat(el.value):el.value;write(key,v);applySaved();}
  function loadControls(){const value=selected();if(value!==ADHAN_VALUE&&value!==IQAMA_VALUE)return;const t=targets(value)[0];if(!t)return;const v=Object.assign({},read(LEGACY_STYLE_KEY),read(styleKey(value))),s=getComputedStyle(t);const fam=document.getElementById('fontFamily');if(fam&&v.fontFamily&&[...fam.options].some(o=>o.value===v.fontFamily))fam.value=v.fontFamily;const sz=document.getElementById('fontSize');if(sz)sz.value=v.fontSize||Math.round(parseFloat(s.fontSize)||14);const w=document.getElementById('fontWeight');if(w&&v.fontWeight&&[...w.options].some(o=>o.value===String(v.fontWeight)))w.value=String(v.fontWeight);const c=document.getElementById('fontColor');if(c)c.value=v.fontColor||rgbToHex(s.color)||'#ffffff';const a=document.getElementById('textAlign');if(a&&v.textAlign)a.value=v.textAlign;const sh=document.getElementById('textShadow');if(sh&&v.textShadow!=null)sh.value=v.textShadow;}
  function rgbToHex(x){const m=String(x).match(/\d+/g);return m?.length>=3?'#'+m.slice(0,3).map(n=>(+n).toString(16).padStart(2,'0')).join(''):null;}
  function addChoice(){const sel=document.getElementById('elementSelect');if(!sel)return;const legacy=sel.querySelector('option[value="__livePrayerCountdown__"]');if(legacy)legacy.remove();[[ADHAN_VALUE,'العداد المتبقي للأذان'],[IQAMA_VALUE,'العداد المتبقي للإقامة']].forEach(([value,label])=>{if(!sel.querySelector(`option[value="${value}"]`)){const o=document.createElement('option');o.value=value;o.textContent=label;sel.appendChild(o);}});if(sel.dataset.countdownSplit!=='1'){sel.dataset.countdownSplit='1';sel.addEventListener('change',()=>{if(sel.value===ADHAN_VALUE||sel.value===IQAMA_VALUE)setTimeout(loadControls,0);},true);}}
  function bindControls(){['fontFamily','fontSize','fontWeight','fontColor','textAlign','textShadow'].forEach(id=>{const el=document.getElementById(id);if(!el||el.dataset.countdownV2==='1')return;el.dataset.countdownV2='1';['input','change'].forEach(ev=>el.addEventListener(ev,()=>{const v=selected();if(v===ADHAN_VALUE||v===IQAMA_VALUE)apply(id);},true));});}
  function restorePos(){const s=status();if(!s)return;const p=read(POS_KEY);if(Number.isFinite(p.x)&&Number.isFinite(p.y)){s.dataset.countdownX=p.x;s.dataset.countdownY=p.y;s.style.setProperty('transform',`translate(${p.x}px,${p.y}px)`,'important');}}
  function canDrag(){return window.__manualPreviewEditingEnabled===true&&document.body.classList.contains('manual-edit-on');}
  function down(e){const s=e.target.closest?.('.live-prayer-status');if(!s||s!==status()||!canDrag())return;e.preventDefault();e.stopPropagation();const p=read(POS_KEY),r=s.getBoundingClientRect();drag={s,id:e.pointerId,startX:e.clientX,startY:e.clientY,x:Number(p.x)||0,y:Number(p.y)||0,w:r.width};s.classList.add('countdown-moving');try{s.setPointerCapture(e.pointerId)}catch(_){}}
  function move(e){if(!drag||drag.id!==e.pointerId||!canDrag())return;e.preventDefault();const x=Math.round(drag.x+e.clientX-drag.startX),y=Math.round(drag.y+e.clientY-drag.startY);drag.s.dataset.countdownX=x;drag.s.dataset.countdownY=y;drag.s.style.setProperty('transform',`translate(${x}px,${y}px)`,'important');}
  function up(e){if(!drag||drag.id!==e.pointerId)return;const x=Number(drag.s.dataset.countdownX)||0,y=Number(drag.s.dataset.countdownY)||0;write(POS_KEY,{x,y});drag.s.classList.remove('countdown-moving');drag=null;}
  function style(){if(document.getElementById('countdownEditBridgeStyle'))return;const x=document.createElement('style');x.id='countdownEditBridgeStyle';x.textContent=`body.manual-edit-on .live-prayer-status{cursor:move!important;touch-action:none!important;user-select:none!important}body.manual-edit-off .live-prayer-status{cursor:default!important;touch-action:auto!important}.live-prayer-status.countdown-moving{outline:2px dashed rgba(235,181,68,.95)!important;outline-offset:3px!important;z-index:9999!important}`;document.head.appendChild(x);}
  function refresh(){style();addChoice();bindControls();applySaved();restorePos();}
  function init(){refresh();setTimeout(refresh,350);setTimeout(refresh,1100);document.addEventListener('pointerdown',down,true);document.addEventListener('pointermove',move,true);document.addEventListener('pointerup',up,true);document.addEventListener('pointercancel',up,true);window.addEventListener('aoqatModulesReady',refresh);}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
;

/* js/carousel-unified-fix.js */
"use strict";
(function(){
  const W=1024,H=1448;
  const ACTIVE_KEY='aoqatActiveDesignIdV1';
  let savedDesignId='';try{savedDesignId=localStorage.getItem(ACTIVE_KEY)||'';}catch(_){}
  let active=0,busy=false,firstInstall=true,activeDesignId=savedDesignId;

  function styles(){
    if(document.getElementById('compactCarouselNavStyles'))return;
    const s=document.createElement('style');s.id='compactCarouselNavStyles';
    s.textContent=`
      .previewBox{min-height:0!important;height:auto!important;padding-bottom:0!important}
      .previewBox .design-carousel{margin-bottom:0!important}
      .previewBox .design-carousel-track{transform:none!important;transition:none!important}
      .previewBox .unified-preview-controls{width:min(100%,360px)!important;min-height:28px!important;height:28px!important;margin:0 auto!important;padding:0!important;display:flex!important;align-items:center!important;justify-content:center!important;gap:6px!important}
      .previewBox .unified-preview-controls .design-carousel-btn{width:28px!important;height:28px!important;min-width:28px!important;min-height:28px!important;margin:0!important;padding:0!important;border-radius:7px!important;font-size:20px!important;line-height:1!important;display:flex!important;align-items:center!important;justify-content:center!important}
      .previewBox .unified-preview-controls .design-carousel-status{min-width:108px!important;margin:0!important;font-size:13px!important;line-height:1!important;text-align:center!important;white-space:nowrap!important}
      .previewBox .unified-preview-dots{height:8px!important;min-height:8px!important;margin:0 auto!important;padding:0!important;display:flex!important;align-items:center!important;justify-content:center!important;gap:4px!important}
      .previewBox .unified-preview-dots .design-carousel-dot{width:7px!important;height:7px!important;min-width:7px!important;min-height:7px!important;margin:0!important;padding:0!important}
      @media(max-width:800px){
        .app{gap:5px!important;padding-top:5px!important}.workspace{margin-bottom:0!important;padding-bottom:0!important}.sidebar{margin-top:0!important;padding-top:0!important}.previewBox{min-height:0!important;height:auto!important;padding-top:4px!important;padding-bottom:0!important;margin-bottom:0!important}.previewBox .design-carousel{margin-bottom:0!important}.previewBox .unified-preview-controls{min-height:25px!important;height:25px!important;margin:0 auto!important;gap:5px!important;padding:0!important}.previewBox .unified-preview-controls .design-carousel-btn{width:25px!important;height:25px!important;min-width:25px!important;min-height:25px!important;border-radius:6px!important;font-size:18px!important}.previewBox .unified-preview-controls .design-carousel-status{min-width:104px!important;font-size:12px!important}.previewBox .unified-preview-dots{height:7px!important;min-height:7px!important;margin:0 auto!important;padding:0!important}.previewBox .unified-preview-dots .design-carousel-dot{width:6px!important;height:6px!important;min-width:6px!important;min-height:6px!important}
      }
    `;document.head.appendChild(s);
  }

  function allSlides(track){return Array.from(track.querySelectorAll(':scope > .design-slide')).filter(slide=>{if(slide.dataset.legacySlide==='true'||slide.querySelector('#design'))return false;if(slide.classList.contains('removed-design-storage')||slide.closest('.removed-design-storage'))return false;if(slide.dataset.designDisabled==='true')return false;return true;});}
  function resize(car){const p=document.querySelector('.previewBox');let scale=1;if(innerWidth<=800&&p){const cs=getComputedStyle(p);const avail=Math.max(220,p.clientWidth-parseFloat(cs.paddingLeft||0)-parseFloat(cs.paddingRight||0)-2);scale=Math.min(1,avail/W);}car.style.height=Math.ceil(H*scale)+'px';}
  function compactParent(car){const parent=car.parentElement;if(!parent)return;parent.style.setProperty('padding-bottom','0','important');parent.style.setProperty('margin-bottom','0','important');parent.style.setProperty('min-height','0','important');parent.style.setProperty('height','auto','important');const next=parent.nextElementSibling;if(next)next.style.setProperty('margin-top','0','important');}

  function install(){
    if(busy)return false;busy=true;
    try{
      styles();const track=document.querySelector('.design-carousel-track'),car=document.querySelector('.design-carousel');if(!track||!car)return false;
      if(firstInstall&&(['designRef','design2','design3','design4'].some(id=>!document.getElementById(id)?.closest('.design-slide'))||track.firstElementChild?.firstElementChild?.id!=='designRef'))return false;
      compactParent(car);const slides=allSlides(track);if(!slides.length)return false;const parent=car.parentElement;
      parent.querySelectorAll('.design-carousel-controls,.design-carousel-dots,.night-carousel-controls,.night-carousel-dots,.ornate-carousel-controls,.ornate-carousel-dots,.final-carousel-controls,.final-carousel-dots').forEach(el=>{if(!el.classList.contains('unified-preview-controls')&&!el.classList.contains('unified-preview-dots'))el.remove();});
      let controls=parent.querySelector('.unified-preview-controls'),dots=parent.querySelector('.unified-preview-dots');
      if(!controls){controls=document.createElement('div');controls.className='design-carousel-controls unified-preview-controls';controls.innerHTML='<button class="design-carousel-btn" type="button" data-unified-prev>‹</button><span class="design-carousel-status"></span><button class="design-carousel-btn" type="button" data-unified-next>›</button>';dots=document.createElement('div');dots.className='design-carousel-dots unified-preview-dots';parent.append(controls,dots);}
      dots.innerHTML=slides.map((_,i)=>`<button class="design-carousel-dot" type="button" data-unified-dot="${i}"></button>`).join('');
      const byId=slides.findIndex(s=>s.firstElementChild?.id===activeDesignId);
      active=byId>=0?byId:Math.max(0,Math.min(firstInstall?0:active,slides.length-1));firstInstall=false;
      function render(){const current=allSlides(track);if(!current.length)return;active=((active%current.length)+current.length)%current.length;Array.from(track.querySelectorAll(':scope > .design-slide')).forEach(slide=>{slide.style.setProperty('display','none','important');slide.hidden=true;slide.setAttribute('aria-hidden','true');});current.forEach((slide,i)=>{if(i===active){slide.style.setProperty('display','flex','important');slide.hidden=false;slide.setAttribute('aria-hidden','false');}});track.style.setProperty('transform','none','important');window.__prayerActiveDesignIndex=active;window.__prayerActiveVisibleIndex=active;window.__prayerActiveDesignElement=current[active]?.firstElementChild||null;activeDesignId=window.__prayerActiveDesignElement?.id||'';if(activeDesignId){try{localStorage.setItem(ACTIVE_KEY,activeDesignId);}catch(_){}}controls.querySelector('.design-carousel-status').textContent=`التصميم ${active+1} من ${current.length}`;dots.querySelectorAll('[data-unified-dot]').forEach((b,i)=>b.classList.toggle('active',i===active));resize(car);compactParent(car);window.dispatchEvent(new CustomEvent('prayerDesignChanged',{detail:{index:active,domIndex:active,design:window.__prayerActiveDesignElement}}));}
      controls.querySelector('[data-unified-prev]').onclick=e=>{e.preventDefault();e.stopPropagation();active--;render();};controls.querySelector('[data-unified-next]').onclick=e=>{e.preventDefault();e.stopPropagation();active++;render();};dots.querySelectorAll('[data-unified-dot]').forEach(b=>b.onclick=e=>{e.preventDefault();e.stopPropagation();active=Number(b.dataset.unifiedDot)||0;render();});render();return true;
    }finally{busy=false;}
  }
  function init(){install();let tries=0;const t=setInterval(()=>{tries++;if(install()||tries>100)clearInterval(t);},120);setTimeout(install,700);setTimeout(install,1600);window.addEventListener('resize',()=>install(),{passive:true});window.addEventListener('prayerDesignVisibilityChanged',()=>{setTimeout(install,0);});}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
;

/* js/native-reminders.js */
(function(){'use strict';
 const N=window.AndroidNative;if(!N?.configureCommunityReminders)return;
 const keys=['aoqatFridayRemindersV1','aoqatFastingRemindersV1','aoqatCommunityPostsV1','aoqatAzkarRemindersV1','aoqatIqamaMinutesV1','aoqatAfterIqamaMinutesV1'];
 let timer;const original=Storage.prototype.setItem;
 function sync(){clearTimeout(timer);N.configureCommunityReminders(JSON.stringify({friday:AoqatFridayReminders.read(),fasting:AoqatFastingReminders.read(),posts:AoqatCommunityPosts.read(),azkar:AoqatAzkarReminders.read()}));}
 Storage.prototype.setItem=function(key,value){original.call(this,key,value);if(this===localStorage&&keys.includes(key)){clearTimeout(timer);timer=setTimeout(sync,100);}};
 function refresh(){if(!window.aoqatUIReady){setTimeout(refresh,100);return;}try{for(const row of JSON.parse(N.readCommunityReminderInbox()))AoqatReminderInbox.add(row);const id=N.consumeCommunityReminderId();if(id)window.aoqatOpenNotification?.(id);}catch(_){} }
 window.aoqatRefreshNativeReminders=refresh;
 function init(){sync();refresh();}
 window.addEventListener('aoqatPrayerRowsUpdated',()=>{sync();});
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh();});
})();

;
document.addEventListener('DOMContentLoaded',()=>requestAnimationFrame(()=>window.dispatchEvent(new CustomEvent('aoqatModulesReady'))),{once:true});