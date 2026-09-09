"use strict";

(function(){
  function initInlinePanels(){
    if(document.getElementById("inlinePanelStyles")) return;

    const sidebar=document.querySelector(".sidebar");
    const mainPanel=sidebar?.querySelector(".main-panel");
    if(!sidebar||!mainPanel) return;

    /* نقل تنسيق الخط من أسفل المعاينة إلى نفس مجموعة بيانات التصميم */
    const fontPanel=document.querySelector(".font-panel");
    if(fontPanel && !fontPanel.id){
      fontPanel.id="fontPanel";
    }

    let fontButton=mainPanel.querySelector('[data-open-panel="fontPanel"]');
    if(fontPanel && !fontButton){
      fontButton=document.createElement("button");
      fontButton.type="button";
      fontButton.className="main-action font-action";
      fontButton.dataset.openPanel="fontPanel";
      fontButton.innerHTML="🔤 <span>تنسيق الخط</span>";
      mainPanel.appendChild(fontButton);
    }

    const pairs=[
      {button:'[data-open-panel="datePanel"]',panel:"datePanel"},
      {button:'[data-open-panel="prayerPanel"]',panel:"prayerPanel"},
      {button:'[data-open-panel="backgroundPanel"]',panel:"backgroundPanel"},
      {button:'[data-open-panel="footerPanel"]',panel:"footerPanel"},
      {button:'[data-open-panel="fontPanel"]',panel:"fontPanel"}
    ];

    const style=document.createElement("style");
    style.id="inlinePanelStyles";
    style.textContent=`
      .main-action.font-action{background:#0f8b8d}

      .inline-control-panel{
        display:none!important;
        width:100%!important;
        margin:7px 0 3px!important;
        padding:12px!important;
        border:1px solid rgba(255,255,255,.14)!important;
        border-radius:9px!important;
        background:rgba(5,20,30,.78)!important;
        box-shadow:inset 0 1px 0 rgba(255,255,255,.04)!important;
      }

      .inline-control-panel.inline-open{display:block!important}
      .inline-control-panel>.panel-title,
      .inline-control-panel>.font-title{display:none!important}
      .inline-control-panel.collapsed>*:not(.panel-title):not(.font-title){display:revert!important}
      .main-action.inline-active{filter:brightness(1.12);box-shadow:0 0 0 2px rgba(255,255,255,.16)}

      #fontPanel .font-controls{
        display:grid!important;
        grid-template-columns:1fr!important;
        gap:8px!important;
      }

      #fontPanel label{margin-bottom:4px!important}

      /* أدوات تحريك/حفظ التصميم تنتقل للشريط الجانبي حتى تبقى التصديرات فقط أسفل المعاينة */
      .sidebar>.drag-info{
        width:100%!important;
        margin:0!important;
        display:flex!important;
        flex-direction:column!important;
        gap:7px!important;
        padding:10px!important;
      }
      .sidebar>.drag-info span{display:none!important}
      .sidebar>.drag-info button{width:100%!important;min-width:0!important}

      @media(max-width:800px){
        .sidebar{gap:8px!important}
        .sidebar>.main-panel{padding:10px!important}
        .inline-control-panel{padding:10px!important;margin:6px 0 2px!important}
        .inline-control-panel label{margin-bottom:10px!important;font-size:13px!important}
        .inline-control-panel select,
        .inline-control-panel input[type="text"],
        .inline-control-panel input[type="number"],
        .inline-control-panel textarea{min-height:40px!important;font-size:14px!important}
        .inline-control-panel textarea{min-height:76px!important}
        #fontPanel .font-controls{grid-template-columns:1fr!important}
      }
    `;
    document.head.appendChild(style);

    const closeAll=except=>{
      pairs.forEach(item=>{
        const button=mainPanel.querySelector(item.button);
        const panel=document.getElementById(item.panel);
        if(!panel||panel===except) return;
        panel.classList.remove("inline-open","active-panel","collapsed");
        button?.classList.remove("inline-active");
      });
    };

    pairs.forEach(item=>{
      const button=mainPanel.querySelector(item.button);
      const panel=document.getElementById(item.panel);
      if(!button||!panel) return;

      panel.classList.add("inline-control-panel");
      panel.classList.remove("active-panel","collapsed");
      button.insertAdjacentElement("afterend",panel);

      button.addEventListener("click",event=>{
        event.preventDefault();
        event.stopImmediatePropagation();

        const willOpen=!panel.classList.contains("inline-open");
        closeAll(panel);
        panel.classList.toggle("inline-open",willOpen);
        panel.classList.toggle("active-panel",willOpen);
        button.classList.toggle("inline-active",willOpen);

        if(willOpen && window.innerWidth<=800){
          setTimeout(()=>button.scrollIntoView({behavior:"smooth",block:"start"}),40);
        }
      },true);
    });

    /* تحت صورة المعاينة تبقى فقط أزرار التصدير */
    const dragInfo=document.querySelector(".workspace .drag-info");
    if(dragInfo){
      sidebar.appendChild(dragInfo);
    }
  }

  if(document.readyState==="loading"){
    document.addEventListener("DOMContentLoaded",initInlinePanels,{once:true});
  }else{
    initInlinePanels();
  }
})();
