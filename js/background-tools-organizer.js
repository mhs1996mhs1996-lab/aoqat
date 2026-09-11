"use strict";
(function(){
  function addStyles(){
    if(document.getElementById("backgroundToolsStyles"))return;
    const s=document.createElement("style");
    s.id="backgroundToolsStyles";
    s.textContent=`
      #backgroundDesignTools{margin-top:14px;padding-top:14px;border-top:1px solid rgba(255,255,255,.12)}
      #backgroundDesignTools .bg-tools-title{font-size:14px;font-weight:800;margin:0 0 10px;color:#e7eef3}
      #backgroundDesignTools .bg-tools-grid{display:grid;grid-template-columns:1fr;gap:8px}
      #backgroundDesignTools button{width:100%!important;min-width:0!important;margin:0!important}
      #backgroundDesignTools .manual-edit-toggle-wrap{margin:0!important;width:100%!important}
      #backgroundDesignTools #manualEditToggle{width:100%!important}
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