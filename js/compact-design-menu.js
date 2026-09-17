"use strict";
(function(){
  const ORDER=[
    '#backgroundFontGroup',
    '#datePrayerGroup',
    '[data-open-panel="switchPanel"]',
    '#topExportJpg'
  ];

  function addStyles(){
    if(document.getElementById('compactDesignMenuStyles'))return;
    const s=document.createElement('style');
    s.id='compactDesignMenuStyles';
    s.textContent=`
      .sidebar .main-panel{padding:8px!important;text-align:right!important}
      .sidebar .main-panel>h2{margin:0 0 6px!important;font-size:15px!important;line-height:1.2!important}
      .sidebar .main-panel>.main-action,.sidebar .main-panel>#topExportJpg,#datePrayerGroup>.main-action,#backgroundFontGroup>.main-action{width:max-content!important;max-width:100%!important;min-width:0!important;min-height:34px!important;height:34px!important;margin:0 0 4px auto!important;padding:5px 10px!important;border-radius:8px!important;font-size:12.5px!important;line-height:1!important;display:flex!important;align-items:center!important;justify-content:flex-start!important;gap:7px!important;box-shadow:none!important;white-space:nowrap!important}
      .sidebar .main-panel>.main-action span,.sidebar .main-panel>#topExportJpg span,#datePrayerGroup>.main-action span,#backgroundFontGroup>.main-action span{line-height:1!important;white-space:nowrap!important}
      .sidebar .main-panel>.inline-control-panel{margin:0 0 4px!important;padding:9px!important}
      .sidebar .main-panel>#topExportJpg{background:#176f9f!important}
      #datePrayerGroup,#backgroundFontGroup{width:100%;margin:0 0 4px!important;padding:0!important}
      #datePrayerGroup>#datePrayerMainBtn{margin:0 0 0 auto!important;background:linear-gradient(135deg,#167f76,#176f9f)!important}
      #backgroundFontGroup>#backgroundFontMainBtn{margin:0 0 0 auto!important;background:linear-gradient(135deg,#0f8b8d,#6d568f)!important}
      #datePrayerSubmenu,#backgroundFontSubmenu{display:none;width:max-content;max-width:100%;padding:5px;margin:4px 0 0 auto;border:1px solid rgba(255,255,255,.12);border-radius:8px;background:rgba(5,20,30,.72)}
      #datePrayerGroup.group-open>#datePrayerSubmenu,#backgroundFontGroup.group-open>#backgroundFontSubmenu{display:block}
      #datePrayerSubmenu>.main-action,#backgroundFontSubmenu>.main-action{width:max-content!important;max-width:100%!important;min-width:0!important;min-height:31px!important;height:31px!important;margin:0 0 4px auto!important;padding:4px 8px!important;border-radius:7px!important;font-size:11.5px!important;display:flex!important;align-items:center!important;justify-content:flex-start!important;gap:6px!important;box-shadow:none!important;white-space:nowrap!important}
      #datePrayerSubmenu>.main-action:last-child,#backgroundFontSubmenu>.main-action:last-child{margin-bottom:0!important}
      #datePrayerMainBtn .group-arrow,#backgroundFontMainBtn .group-arrow{margin-right:4px!important;font-size:10px;opacity:.8;transition:transform .18s ease}
      #datePrayerGroup.group-open #datePrayerMainBtn .group-arrow,#backgroundFontGroup.group-open #backgroundFontMainBtn .group-arrow{transform:rotate(180deg)}
      @media(max-width:800px){.sidebar .main-panel{padding:7px!important}.sidebar .main-panel>.main-action,.sidebar .main-panel>#topExportJpg,#datePrayerGroup>.main-action,#backgroundFontGroup>.main-action{width:max-content!important;max-width:100%!important;min-width:0!important;min-height:32px!important;height:32px!important;margin:0 0 3px auto!important;padding:4px 8px!important;font-size:12px!important;border-radius:7px!important}#datePrayerSubmenu,#backgroundFontSubmenu{width:max-content!important;max-width:100%!important;margin-left:0!important;margin-right:auto!important}#datePrayerSubmenu>.main-action,#backgroundFontSubmenu>.main-action{width:max-content!important;max-width:100%!important;min-width:0!important;min-height:30px!important;height:30px!important;font-size:11px!important}}
    `;
    document.head.appendChild(s);
  }

  function createGroup(id,buttonId,submenuId,label,icon){
    const main=document.querySelector('.sidebar .main-panel');
    let group=document.getElementById(id);
    if(group)return group;
    group=document.createElement('div');
    group.id=id;
    const mainBtn=document.createElement('button');
    mainBtn.type='button';
    mainBtn.id=buttonId;
    mainBtn.className='main-action';
    mainBtn.innerHTML=`${icon} <span>${label}</span><span class="group-arrow">▼</span>`;
    const submenu=document.createElement('div');
    submenu.id=submenuId;
    group.append(mainBtn,submenu);
    mainBtn.addEventListener('click',event=>{
      event.preventDefault();
      event.stopPropagation();
      group.classList.toggle('group-open');
    });
    main.appendChild(group);
    return group;
  }

  function consolidateDataPrayer(){
    const dateBtn=document.querySelector('[data-open-panel="datePanel"]');
    const prayerBtn=document.querySelector('[data-open-panel="prayerPanel"]');
    const iqamaBtn=document.querySelector('[data-open-panel="iqamaPanel"]');
    if(!dateBtn||!prayerBtn||!iqamaBtn)return false;
    createGroup('datePrayerGroup','datePrayerMainBtn','datePrayerSubmenu','بيانات التاريخ والصلاة','🕌');
    const submenu=document.getElementById('datePrayerSubmenu');
    [dateBtn,prayerBtn,iqamaBtn].forEach(btn=>{if(btn.parentElement!==submenu)submenu.appendChild(btn);});
    return true;
  }

  function consolidateBackgroundFont(){
    const fontBtn=document.querySelector('[data-open-panel="fontPanel"]');
    const backgroundBtn=document.querySelector('[data-open-panel="backgroundPanel"]');
    if(!fontBtn||!backgroundBtn)return false;
    createGroup('backgroundFontGroup','backgroundFontMainBtn','backgroundFontSubmenu','الخلفية و تنسيق الخط','🎨');
    const submenu=document.getElementById('backgroundFontSubmenu');
    [backgroundBtn,fontBtn].forEach(btn=>{if(btn.parentElement!==submenu)submenu.appendChild(btn);});
    return true;
  }

  function arrange(){
    const main=document.querySelector('.sidebar .main-panel');
    if(!main)return false;
    addStyles();
    const dataMerged=consolidateDataPrayer();
    const styleMerged=consolidateBackgroundFont();
    ORDER.forEach(selector=>{
      const item=main.querySelector(selector)||document.querySelector(selector);
      if(!item)return;
      main.appendChild(item);
      const panelId=item.dataset?.openPanel;
      if(panelId){
        const panel=document.getElementById(panelId);
        if(panel&&panel.parentElement===main)main.appendChild(panel);
      }
    });
    return dataMerged&&styleMerged&&ORDER.every(selector=>!!document.querySelector(selector));
  }

  function init(){
    let tries=0;
    arrange();
    const timer=setInterval(()=>{
      tries++;
      if(arrange()||tries>=60)clearInterval(timer);
    },150);
    window.addEventListener('aoqatModulesReady',()=>setTimeout(arrange,50));
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
})();
