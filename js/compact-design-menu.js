"use strict";
(function(){
  const ORDER=[
    '[data-open-panel="fontPanel"]',
    '[data-open-panel="datePanel"]',
    '[data-open-panel="backgroundPanel"]',
    '[data-open-panel="switchPanel"]',
    '[data-open-panel="prayerPanel"]',
    '#topExportJpg'
  ];

  function addStyles(){
    if(document.getElementById('compactDesignMenuStyles'))return;
    const s=document.createElement('style');
    s.id='compactDesignMenuStyles';
    s.textContent=`
      .sidebar .main-panel{
        padding:8px!important;
      }
      .sidebar .main-panel>h2{
        margin:0 0 6px!important;
        font-size:15px!important;
        line-height:1.2!important;
      }
      .sidebar .main-panel>.main-action,
      .sidebar .main-panel>#topExportJpg{
        width:100%!important;
        min-height:34px!important;
        height:34px!important;
        margin:0 0 4px!important;
        padding:5px 9px!important;
        border-radius:8px!important;
        font-size:12.5px!important;
        line-height:1!important;
        display:flex!important;
        align-items:center!important;
        justify-content:flex-start!important;
        gap:7px!important;
        box-shadow:none!important;
      }
      .sidebar .main-panel>.main-action span,
      .sidebar .main-panel>#topExportJpg span{
        line-height:1!important;
      }
      .sidebar .main-panel>.inline-control-panel{
        margin:0 0 4px!important;
        padding:9px!important;
      }
      .sidebar .main-panel>#topExportJpg{
        background:#176f9f!important;
      }
      @media(max-width:800px){
        .sidebar .main-panel{padding:7px!important}
        .sidebar .main-panel>.main-action,
        .sidebar .main-panel>#topExportJpg{
          min-height:32px!important;
          height:32px!important;
          margin-bottom:3px!important;
          padding:4px 8px!important;
          font-size:12px!important;
          border-radius:7px!important;
        }
      }
    `;
    document.head.appendChild(s);
  }

  function arrange(){
    const main=document.querySelector('.sidebar .main-panel');
    if(!main)return false;
    addStyles();

    ORDER.forEach(selector=>{
      const button=main.querySelector(selector) || document.querySelector(selector);
      if(!button)return;
      main.appendChild(button);

      const panelId=button.dataset?.openPanel;
      if(panelId){
        const panel=document.getElementById(panelId);
        if(panel && panel.parentElement===main) main.appendChild(panel);
      }
    });
    return ORDER.every(selector=>!!document.querySelector(selector));
  }

  function init(){
    let tries=0;
    arrange();
    const timer=setInterval(()=>{
      tries++;
      if(arrange()||tries>=30)clearInterval(timer);
    },150);
    window.addEventListener('aoqatModulesReady',()=>setTimeout(arrange,50),{once:true});
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
})();
