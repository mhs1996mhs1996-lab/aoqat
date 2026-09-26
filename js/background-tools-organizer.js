"use strict";
(function(){
  function addStyles(){
    if(document.getElementById("backgroundToolsStyles"))return;
    const s=document.createElement("style");
    s.id="backgroundToolsStyles";
    s.textContent=`
      #backgroundDesignTools{margin-top:10px;padding-top:10px;border-top:1px solid rgba(255,255,255,.10)}
      #backgroundDesignTools .bg-tools-title{font-size:13px;font-weight:800;margin:0 0 7px;color:#e7eef3}
      #backgroundDesignTools .bg-tools-grid{display:grid;grid-template-columns:1fr;gap:5px}
      #backgroundDesignTools button{width:100%!important;min-width:0!important;margin:0!important;min-height:34px!important;border-radius:8px!important;padding:7px 10px!important;font-size:13px!important;font-weight:700!important;box-shadow:none!important}
      #backgroundDesignTools .manual-edit-toggle-wrap{margin:0!important;width:100%!important}
      #backgroundDesignTools #manualEditToggle{width:100%!important}
      #backgroundDesignTools #saveDesignAdjustments,#backgroundDesignTools #resetPositions{display:flex!important;align-items:center!important;justify-content:center!important;gap:6px!important;background:#263746!important;color:#fff!important;border:1px solid rgba(255,255,255,.16)!important}
      #backgroundDesignTools #saveDesignAdjustments:hover,#backgroundDesignTools #resetPositions:hover{filter:brightness(1.08)}
    `;
    document.head.appendChild(s);
  }

  function moveTools(){
    const panel=document.getElementById("backgroundPanel");
    if(!panel)return false;
    addStyles();

    let box=document.getElementById("backgroundDesignTools");
    if(!box){
      box=document.createElement("div");
      box.id="backgroundDesignTools";
      box.innerHTML='<div class="bg-tools-title">🛠 أدوات تعديل التصميم</div><div class="bg-tools-grid"></div>';
      panel.appendChild(box);
    }
    const grid=box.querySelector(".bg-tools-grid");
    const manualWrap=document.querySelector(".manual-edit-toggle-wrap");
    const save=document.getElementById("saveDesignAdjustments");
    const reset=document.getElementById("resetPositions");

    if(manualWrap&&manualWrap.parentElement!==grid)grid.appendChild(manualWrap);
    if(save&&save.parentElement!==grid)grid.appendChild(save);
    if(reset&&reset.parentElement!==grid)grid.appendChild(reset);

    if(save) save.textContent="💾 حفظ التعديلات";
    if(reset) reset.textContent="↻ إعادة التموضع";

    return !!(manualWrap&&save&&reset);
  }

  function init(){
    let tries=0;
    const timer=setInterval(()=>{
      tries++;
      const done=moveTools();
      if(done||tries>80)clearInterval(timer);
    },150);
    moveTools();
  }

  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});else init();
})();