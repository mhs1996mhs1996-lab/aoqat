"use strict";
(function(){
  function addStyles(){
    if(document.getElementById("footerBackgroundOrganizerStyles")) return;
    const s=document.createElement("style");
    s.id="footerBackgroundOrganizerStyles";
    s.textContent=`
      #backgroundFooterControl{margin-top:12px;padding-top:12px;border-top:1px solid rgba(255,255,255,.12)}
      #backgroundFooterToggle{width:100%;min-height:42px;border:0;border-radius:9px;padding:10px 12px;background:#b86a1d;color:#fff;font-family:inherit;font-size:14px;font-weight:800;cursor:pointer}
      #backgroundFooterToggle.is-open{filter:brightness(1.12);box-shadow:0 0 0 2px rgba(255,255,255,.12)}
      #backgroundFooterControl #footerPanel{display:none!important;width:100%!important;margin:8px 0 0!important;padding:10px!important;border:1px solid rgba(255,255,255,.14)!important;border-radius:9px!important;background:rgba(5,20,30,.58)!important}
      #backgroundFooterControl #footerPanel.footer-inside-open{display:block!important}
      #backgroundFooterControl #footerPanel>.panel-title{display:none!important}
      #backgroundFooterControl #footerPanel textarea{width:100%!important;min-height:82px!important}
    `;
    document.head.appendChild(s);
  }

  function organize(){
    const mainPanel=document.querySelector('.sidebar .main-panel');
    const backgroundPanel=document.getElementById('backgroundPanel');
    const footerPanel=document.getElementById('footerPanel');
    if(!mainPanel||!backgroundPanel||!footerPanel) return false;

    addStyles();

    const oldButton=mainPanel.querySelector('[data-open-panel="footerPanel"]');
    if(oldButton) oldButton.remove();

    let wrap=document.getElementById('backgroundFooterControl');
    if(!wrap){
      wrap=document.createElement('div');
      wrap.id='backgroundFooterControl';
      const btn=document.createElement('button');
      btn.type='button';
      btn.id='backgroundFooterToggle';
      btn.innerHTML='✍ <span>النص السفلي</span>';
      wrap.appendChild(btn);
      backgroundPanel.appendChild(wrap);
      btn.addEventListener('click',event=>{
        event.preventDefault();
        event.stopPropagation();
        const open=!footerPanel.classList.contains('footer-inside-open');
        footerPanel.classList.toggle('footer-inside-open',open);
        btn.classList.toggle('is-open',open);
      });
    }

    footerPanel.classList.remove('inline-open','active-panel','collapsed');
    if(footerPanel.parentElement!==wrap) wrap.appendChild(footerPanel);
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