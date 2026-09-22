"use strict";
(function(){
  const ORDER=['#backgroundFontGroup','#datePrayerGroup','[data-open-panel="switchPanel"]','#topExportJpg'];

  function addStyles(){
    if(document.getElementById('compactDesignMenuStyles'))return;
    const s=document.createElement('style');s.id='compactDesignMenuStyles';
    s.textContent=`
      .sidebar .main-panel{padding:8px!important;text-align:right!important}.sidebar .main-panel>h2{margin:0 0 6px!important;font-size:15px!important;line-height:1.2!important}
      .sidebar .main-panel>.main-action,.sidebar .main-panel>#topExportJpg,#datePrayerGroup>.main-action,#backgroundFontGroup>.main-action{width:max-content!important;max-width:100%!important;min-width:0!important;min-height:34px!important;height:34px!important;margin:0 0 4px auto!important;padding:5px 10px!important;border-radius:8px!important;font-size:12.5px!important;line-height:1!important;display:flex!important;align-items:center!important;justify-content:flex-start!important;gap:7px!important;box-shadow:none!important;white-space:nowrap!important}
      .sidebar .main-panel>.main-action span,.sidebar .main-panel>#topExportJpg span,#datePrayerGroup>.main-action span,#backgroundFontGroup>.main-action span{line-height:1!important;white-space:nowrap!important}.sidebar .main-panel>.inline-control-panel{margin:0 0 4px!important;padding:9px!important}.sidebar .main-panel>#topExportJpg{background:#176f9f!important}
      #datePrayerGroup,#backgroundFontGroup{width:100%;margin:0 0 4px!important;padding:0!important}#datePrayerGroup>#datePrayerMainBtn{margin:0 0 0 auto!important;background:linear-gradient(135deg,#167f76,#176f9f)!important}#backgroundFontGroup>#backgroundFontMainBtn{margin:0 0 0 auto!important;background:linear-gradient(135deg,#0f8b8d,#6d568f)!important}
      #datePrayerSubmenu,#backgroundFontSubmenu{display:none!important;position:static!important;z-index:auto!important;top:auto!important;left:auto!important;right:auto!important;transform:none!important;width:100%!important;min-width:0!important;max-width:100%!important;padding:3px 0 0!important;margin:0!important;border:0!important;border-radius:0!important;background:transparent!important;box-shadow:none!important}
      #datePrayerGroup.group-open>#datePrayerSubmenu,#backgroundFontGroup.group-open>#backgroundFontSubmenu{display:block!important}#datePrayerSubmenu>.main-action,#backgroundFontSubmenu>.main-action{width:100%!important;max-width:100%!important;min-width:0!important;min-height:34px!important;height:34px!important;margin:0 0 5px!important;padding:5px 9px!important;border-radius:7px!important;font-size:11.5px!important;display:flex!important;align-items:center!important;justify-content:flex-start!important;gap:6px!important;box-shadow:none!important;white-space:nowrap!important}#datePrayerSubmenu>.main-action:last-child,#backgroundFontSubmenu>.main-action:last-child{margin-bottom:0!important}
      #datePrayerMainBtn .group-arrow,#backgroundFontMainBtn .group-arrow{margin-right:4px!important;font-size:10px;opacity:.8;transition:transform .18s ease}#datePrayerGroup.group-open #datePrayerMainBtn .group-arrow,#backgroundFontGroup.group-open #backgroundFontMainBtn .group-arrow{transform:rotate(180deg)}
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
      #interfaceVisibilityControls,#designVisibilityControls{margin:10px 0 0!important}
      .visibility-section-toggle{width:100%!important;min-height:46px!important;margin:0!important;padding:9px 12px!important;border:1px solid #2f7680!important;border-radius:10px!important;background:linear-gradient(135deg,#174b55,#226572)!important;color:#fff!important;font-weight:800!important;font-size:15px!important;display:flex!important;align-items:center!important;justify-content:space-between!important;gap:8px!important;cursor:pointer!important}
      .visibility-section-toggle span{color:#fff!important}.visibility-section-toggle .visibility-arrow{font-size:12px!important;transition:transform .18s ease}.visibility-section-toggle[aria-expanded="true"] .visibility-arrow{transform:rotate(180deg)}
      .visibility-section-body{display:none!important;padding-top:7px!important}.visibility-section-open>.visibility-section-body{display:block!important}
      .design-popup-close{position:absolute!important;top:7px!important;left:7px!important;z-index:2!important;width:27px!important;height:27px!important;min-width:27px!important;min-height:27px!important;margin:0!important;padding:0!important;border:1px solid rgba(255,255,255,.2)!important;border-radius:7px!important;background:#16594f!important;color:#fff!important;font-size:18px!important;font-weight:800!important;line-height:1!important;display:flex!important;align-items:center!important;justify-content:center!important;cursor:pointer!important}
      body.design-detail-open .sidebar .main-panel>h2,body.design-detail-open .sidebar .main-panel>#backgroundFontGroup,body.design-detail-open .sidebar .main-panel>#datePrayerGroup,body.design-detail-open .sidebar .main-panel>[data-open-panel="switchPanel"],body.design-detail-open .sidebar .main-panel>#topExportJpg{visibility:hidden!important;pointer-events:none!important}
      @media(max-width:800px){.sidebar .main-panel{padding:7px!important}.sidebar .main-panel>.main-action,.sidebar .main-panel>#topExportJpg,#datePrayerGroup>.main-action,#backgroundFontGroup>.main-action{width:max-content!important;max-width:100%!important;min-width:0!important;min-height:32px!important;height:32px!important;margin:0 0 3px auto!important;padding:4px 8px!important;font-size:12px!important;border-radius:7px!important}#datePrayerSubmenu,#backgroundFontSubmenu{width:100%!important;min-width:0!important;max-width:100%!important;margin:0!important}#datePrayerSubmenu>.main-action,#backgroundFontSubmenu>.main-action{width:100%!important;max-width:100%!important;min-width:0!important;min-height:32px!important;height:32px!important;font-size:11px!important}}
    `;document.head.appendChild(s);
  }

  function closeGroups(except=null){['datePrayerGroup','backgroundFontGroup'].forEach(id=>{const g=document.getElementById(id);if(g&&g!==except)g.classList.remove('group-open');});}
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

  function consolidateDataPrayer(){const a=document.querySelector('[data-open-panel="datePanel"]'),b=document.querySelector('[data-open-panel="prayerPanel"]'),c=document.querySelector('[data-open-panel="iqamaPanel"]');if(!a||!b||!c)return false;createGroup('datePrayerGroup','datePrayerMainBtn','datePrayerSubmenu','بيانات التاريخ والصلاة','🕌');const s=document.getElementById('datePrayerSubmenu');[a,b,c].forEach(x=>{if(x.parentElement!==s)s.appendChild(x)});return true;}
  function addInterfaceVisibilityControls(){
    const panel=document.getElementById('backgroundPanel');if(!panel||document.getElementById('interfaceVisibilityControls'))return false;
    const box=document.createElement('div');box.id='interfaceVisibilityControls';box.className='visibility-section';box.innerHTML='<button type="button" class="visibility-section-toggle" aria-expanded="false"><span>👁️ إظهار عناصر واجهة البرنامج</span><span class="visibility-arrow">▼</span></button><div class="visibility-section-body"><div class="interface-visibility-grid"></div></div>';
    const sectionToggle=box.querySelector('.visibility-section-toggle');sectionToggle.onclick=()=>{const open=!box.classList.contains('visibility-section-open');document.querySelectorAll('#backgroundPanel .visibility-section').forEach(x=>{if(x!==box){x.classList.remove('visibility-section-open');x.querySelector('.visibility-section-toggle')?.setAttribute('aria-expanded','false');}});box.classList.toggle('visibility-section-open',open);sectionToggle.setAttribute('aria-expanded',String(open));};
    const grid=box.querySelector('.interface-visibility-grid'),KEY='aoqatInterfaceVisibilityV1';
    let state={};try{state=JSON.parse(localStorage.getItem(KEY)||'{}')||{};}catch(_){}
    const items=[['clock','الساعة','.interface-clock-card'],['date','التاريخ','.interface-date-card'],['adhan','باقي على صلاة...','.next-prayer'],['iqama','باقي على الإقامة','.iqama-status']];
    const apply=()=>{items.forEach(([k,,sel])=>{document.querySelectorAll(sel).forEach(el=>el.style.setProperty('display',state[k]===false?'none':'inline-flex','important'));});const sep=document.getElementById('countdownSeparator');if(sep)sep.style.setProperty('display',(state.adhan===false||state.iqama===false)?'none':'block','important');};
    items.forEach(([k,label])=>{const b=document.createElement('button');b.type='button';b.className='interface-visibility-btn';const draw=()=>{const on=state[k]!==false;b.classList.toggle('is-on',on);b.setAttribute('aria-pressed',String(on));b.innerHTML='<span>'+label+'</span><strong>'+(on?'تشغيل':'إيقاف')+'</strong>';};b.onclick=()=>{state[k]=!(state[k]!==false);localStorage.setItem(KEY,JSON.stringify(state));draw();apply();};draw();grid.appendChild(b);});
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
    slides.forEach((slide,i)=>{if(!slide.dataset.visibilityKey)slide.dataset.visibilityKey='design-'+(i+1);});
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
  function consolidateBackgroundFont(){addInterfaceVisibilityControls();addDesignVisibilityControls();const a=document.querySelector('[data-open-panel="fontPanel"]'),b=document.querySelector('[data-open-panel="backgroundPanel"]');if(!a||!b)return false;createGroup('backgroundFontGroup','backgroundFontMainBtn','backgroundFontSubmenu','واجهة البرنامج الرئيسية','🎨');const s=document.getElementById('backgroundFontSubmenu');[b,a].forEach(x=>{if(x.parentElement!==s)s.appendChild(x)});return true;}
  function arrange(){const main=document.querySelector('.sidebar .main-panel');if(!main)return false;addStyles();const d=consolidateDataPrayer(),s=consolidateBackgroundFont();ORDER.forEach(sel=>{const item=main.querySelector(sel)||document.querySelector(sel);if(!item)return;main.appendChild(item);const id=item.dataset?.openPanel;if(id){const p=document.getElementById(id);if(p&&p.parentElement===main)main.appendChild(p);}});document.querySelectorAll('.inline-control-panel').forEach(addClose);return d&&s&&ORDER.every(sel=>!!document.querySelector(sel));}

  function installExclusivePopupBehavior(){
    if(document.documentElement.dataset.exclusiveDesignPopups)return;document.documentElement.dataset.exclusiveDesignPopups='1';
    document.addEventListener('click',e=>{
      const btn=e.target.closest('[data-open-panel]');if(!btn)return;
      const panel=document.getElementById(btn.dataset.openPanel);if(!panel)return;
      closeGroups();closePanels(panel);addClose(panel);document.body.classList.add('design-detail-open');
    },true);
  }
  function init(){let tries=0;arrange();installExclusivePopupBehavior();const timer=setInterval(()=>{tries++;if(arrange()||tries>=60)clearInterval(timer);},150);window.addEventListener('aoqatModulesReady',()=>setTimeout(()=>{arrange();installExclusivePopupBehavior();},50));}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
