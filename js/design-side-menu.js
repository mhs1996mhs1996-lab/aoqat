"use strict";
(function(){
  function install(){
    if(document.getElementById('designSideMenuBtn')) return true;
    const sidebar=document.querySelector('.sidebar');
    if(!sidebar) return false;

    const style=document.createElement('style');
    style.id='designSideMenuStyles';
    style.textContent=`
      #designSideMenuBtn{position:fixed;top:11px;right:12px;z-index:10020;width:34px;height:34px;border:1px solid rgba(255,255,255,.14);border-radius:9px;background:linear-gradient(145deg,#1b5147,#123c35);color:#fff;font-size:20px;font-weight:700;line-height:1;display:flex;align-items:center;justify-content:center;box-shadow:0 3px 10px #0003;cursor:pointer;padding:0}
      body.design-menu-open #designSideMenuBtn{top:5px;right:7px;width:24px;height:24px;border-radius:6px;font-size:14px;box-shadow:0 2px 5px #0003}
      #designSideMenuBackdrop{position:fixed;inset:0;z-index:10000;background:rgba(0,0,0,.38);opacity:0;pointer-events:none;transition:opacity .22s ease}
      body.design-menu-open #designSideMenuBackdrop{opacity:1;pointer-events:auto}
      .preview-header{display:none!important}
      .drag-info{display:none!important}
      .sidebar{position:fixed!important;top:0!important;right:0!important;bottom:auto!important;z-index:10010!important;width:min(74vw,312px)!important;max-width:312px!important;height:auto!important;min-height:0!important;max-height:100dvh!important;overflow-y:auto!important;overscroll-behavior:contain;background:transparent!important;padding:0!important;margin:0!important;box-sizing:border-box!important;transform:translateX(105%)!important;transition:transform .24s ease!important;box-shadow:none!important}
      body.design-menu-open .sidebar{transform:translateX(0)!important;padding:0!important}
      body.design-menu-open{overflow:hidden!important}
      body.design-menu-open .sidebar>.panel:not(.main-panel){display:none!important}
      body.design-menu-open .sidebar .main-panel{width:max-content!important;max-width:calc(100% - 6px)!important;margin:28px 3px 0 auto!important;padding:3px!important;height:auto!important;min-height:0!important}
      body.design-menu-open .sidebar .main-panel>h2{margin:0 0 2px!important;font-size:14px!important;line-height:1!important}
      body.design-menu-open .sidebar .main-panel>.main-action,body.design-menu-open .sidebar .main-panel>#topExportJpg,body.design-menu-open #datePrayerGroup>.main-action,body.design-menu-open #backgroundFontGroup>.main-action{width:var(--design-action-width,auto)!important;min-width:var(--design-action-width,0)!important;max-width:100%!important;min-height:25px!important;height:25px!important;margin:0 0 1px auto!important;padding:2px 5px!important;font-size:11.5px!important;line-height:1!important;border-radius:6px!important;white-space:nowrap!important}
      body.design-menu-open #datePrayerGroup,body.design-menu-open #backgroundFontGroup{width:var(--design-action-width,auto)!important;max-width:100%!important;margin:0 0 1px auto!important}
      body.design-menu-open .sidebar .main-panel>.inline-control-panel{margin:0 0 1px!important;padding:3px!important}
      body.design-menu-open .sidebar .main-panel>.inline-control-panel:empty{display:none!important}
      body.design-menu-open #datePrayerSubmenu,body.design-menu-open #backgroundFontSubmenu{width:100%!important;margin:1px 0 0!important;padding:2px!important}
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
    btn.id='designSideMenuBtn';btn.type='button';btn.setAttribute('aria-label','بيانات التصميم');btn.setAttribute('aria-expanded','false');btn.innerHTML='☰';
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

    function setOpen(open){document.body.classList.toggle('design-menu-open',open);btn.setAttribute('aria-expanded',String(open));btn.innerHTML=open?'×':'☰';if(open)setTimeout(()=>{syncActionWidth();hideEmptyStrips();},30);}
    btn.addEventListener('click',()=>setOpen(!document.body.classList.contains('design-menu-open')));
    backdrop.addEventListener('click',()=>setOpen(false));
    document.addEventListener('keydown',e=>{if(e.key==='Escape')setOpen(false);});
    window.addEventListener('aoqatModulesReady',()=>setTimeout(()=>{syncActionWidth();hideEmptyStrips();},80));
    setTimeout(()=>{syncActionWidth();hideEmptyStrips();},1200);
    return true;
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{let n=0,t=setInterval(()=>{if(install()||++n>40)clearInterval(t)},100)},{once:true});else install();
})();
