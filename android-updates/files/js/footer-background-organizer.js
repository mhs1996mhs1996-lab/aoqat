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