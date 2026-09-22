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
    const backgroundPanel=document.getElementById('backgroundPanel');
    const footerPanel=document.getElementById('footerPanel');
    const footerButton=document.querySelector('[data-open-panel="footerPanel"]');
    const toolsGrid=document.querySelector('#backgroundDesignTools .bg-tools-grid');
    if(!backgroundPanel||!footerPanel||!toolsGrid) return false;

    addStyles();

    /* النص السفلي يبقى كزر أصلي داخل مجموعة أدوات تعديل التصميم فقط. */
    const oldWrap=document.getElementById('backgroundFooterControl');
    if(oldWrap){
      const generatedToggle=oldWrap.querySelector('#backgroundFooterToggle');
      if(generatedToggle) generatedToggle.remove();
      if(footerPanel.parentElement===oldWrap) backgroundPanel.appendChild(footerPanel);
      oldWrap.remove();
    }

    if(footerButton&&footerButton.parentElement!==toolsGrid) toolsGrid.appendChild(footerButton);
    if(footerButton) footerButton.innerHTML='✍️ <span>النص السفلي</span>';

    footerPanel.classList.remove('footer-inside-open');
    return !!footerButton;
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