"use strict";
(function(){
  function install(){
    if(document.getElementById('designSideMenuBtn')) return true;
    const sidebar=document.querySelector('.sidebar');
    if(!sidebar) return false;

    const style=document.createElement('style');
    style.id='designSideMenuStyles';
    style.textContent=`
      #designSideMenuBtn{position:fixed;top:10px;right:10px;z-index:10020;width:40px;height:40px;border:0;border-radius:10px;background:#173d35;color:#fff;font-size:25px;line-height:1;display:flex;align-items:center;justify-content:center;box-shadow:0 3px 12px #0003;cursor:pointer}
      #designSideMenuBackdrop{position:fixed;inset:0;z-index:10000;background:rgba(0,0,0,.38);opacity:0;pointer-events:none;transition:opacity .22s ease}
      body.design-menu-open #designSideMenuBackdrop{opacity:1;pointer-events:auto}
      .sidebar{position:fixed!important;top:0!important;right:0!important;bottom:0!important;z-index:10010!important;width:min(88vw,380px)!important;max-width:380px!important;height:100dvh!important;overflow-y:auto!important;overscroll-behavior:contain;background:#f5f6f7!important;padding:62px 10px 18px!important;margin:0!important;box-sizing:border-box!important;transform:translateX(105%)!important;transition:transform .24s ease!important;box-shadow:-8px 0 24px #0003!important}
      body.design-menu-open .sidebar{transform:translateX(0)!important}
      body.design-menu-open{overflow:hidden!important}
      .sidebar .main-panel{margin-top:0!important}
      @media(min-width:801px){#designSideMenuBtn{top:12px;right:12px}}
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
