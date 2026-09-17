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
      .sidebar{position:fixed!important;top:0!important;right:0!important;bottom:auto!important;z-index:10010!important;width:min(86vw,362px)!important;max-width:362px!important;height:auto!important;max-height:calc(100dvh - 4px)!important;overflow-y:auto!important;overscroll-behavior:contain;background:#f5f6f7!important;padding:62px 6px 18px!important;margin:0!important;box-sizing:border-box!important;transform:translateX(105%)!important;transition:transform .24s ease!important;box-shadow:-8px 0 24px #0003!important}
      body.design-menu-open .sidebar{transform:translateX(0)!important;padding:3px 5px!important}
      body.design-menu-open{overflow:hidden!important}
      body.design-menu-open .sidebar .main-panel{margin-top:24px!important;margin-bottom:0!important;padding:3px!important}
      body.design-menu-open .sidebar .main-panel>h2{margin:0 0 2px!important;font-size:14px!important;line-height:1!important}
      body.design-menu-open .sidebar .main-panel>.main-action,body.design-menu-open .sidebar .main-panel>#topExportJpg,body.design-menu-open #datePrayerGroup>.main-action,body.design-menu-open #backgroundFontGroup>.main-action{min-height:25px!important;height:25px!important;margin:0 0 1px!important;padding:2px 6px!important;font-size:11.5px!important;line-height:1!important;border-radius:6px!important}
      body.design-menu-open #datePrayerGroup,body.design-menu-open #backgroundFontGroup{margin:0 0 1px!important}
      body.design-menu-open .sidebar .main-panel>.inline-control-panel{margin:0 0 1px!important;padding:3px!important}
      body.design-menu-open #datePrayerSubmenu,body.design-menu-open #backgroundFontSubmenu{margin:1px 0 0!important;padding:2px!important}
      body.design-menu-open #datePrayerSubmenu>.main-action,body.design-menu-open #backgroundFontSubmenu>.main-action{min-height:24px!important;height:24px!important;margin:0 0 1px!important;padding:2px 5px!important;font-size:11px!important}
      @media(max-width:800px){
        .topbar.web-interface-header{margin-top:50px!important;margin-bottom:5px!important}
        .topbar.web-interface-header #saveToPhoneBtn,.topbar.web-interface-header #exportBtn{position:fixed!important;top:11px!important;left:12px!important;right:auto!important;transform:none!important;z-index:9990!important;margin:0!important}
        body.design-menu-open .topbar.web-interface-header #saveToPhoneBtn,body.design-menu-open .topbar.web-interface-header #exportBtn{z-index:9990!important}
        .workspace{padding-top:0!important}
      }
      @media(max-width:420px){.sidebar{width:86vw!important;max-width:362px!important}}
      @media(min-width:801px){#designSideMenuBtn{top:12px;right:12px}body.design-menu-open #designSideMenuBtn{top:5px;right:7px}}
    `;
    document.head.appendChild(style);

    const btn=document.createElement('button');
    btn.id='designSideMenuBtn';btn.type='button';btn.setAttribute('aria-label','بيانات التصميم');btn.setAttribute('aria-expanded','false');btn.innerHTML='☰';
    const backdrop=document.createElement('div');backdrop.id='designSideMenuBackdrop';
    document.body.append(backdrop,btn);

    function setOpen(open){document.body.classList.toggle('design-menu-open',open);btn.setAttribute('aria-expanded',String(open));btn.innerHTML=open?'×':'☰';}
    btn.addEventListener('click',()=>setOpen(!document.body.classList.contains('design-menu-open')));
    backdrop.addEventListener('click',()=>setOpen(false));
    document.addEventListener('keydown',e=>{if(e.key==='Escape')setOpen(false);});
    return true;
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{let n=0,t=setInterval(()=>{if(install()||++n>40)clearInterval(t)},100)},{once:true});else install();
})();
