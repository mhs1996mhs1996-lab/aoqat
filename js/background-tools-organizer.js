"use strict";
(function(){
  function addStyles(){
    if(document.getElementById("backgroundToolsStyles"))return;
    const s=document.createElement("style");
    s.id="backgroundToolsStyles";
    s.textContent=`
      #backgroundDesignTools{margin-top:10px;padding-top:10px;border-top:1px solid rgba(255,255,255,.10)}
      #backgroundDesignTools .bg-tools-toggle{width:100%!important;display:flex!important;align-items:center!important;justify-content:space-between!important;min-height:42px!important;background:#176f9f!important;color:#fff!important;border:1px solid rgba(255,255,255,.16)!important;border-radius:9px!important;padding:9px 12px!important;font-size:14px!important;font-weight:800!important}
      #backgroundDesignTools .bg-tools-arrow{transition:transform .18s ease}
      #backgroundDesignTools.is-open .bg-tools-arrow{transform:rotate(180deg)}
      #backgroundDesignTools .bg-tools-grid{display:none;grid-template-columns:1fr;gap:5px;margin-top:7px}
      #backgroundDesignTools.is-open .bg-tools-grid{display:grid}
      #backgroundDesignTools button{width:100%!important;min-width:0!important;margin:0!important;min-height:34px!important;border-radius:8px!important;padding:7px 10px!important;font-size:13px!important;font-weight:700!important;box-shadow:none!important}
      #backgroundDesignTools .manual-edit-toggle-wrap{margin:0!important;width:100%!important}
      #backgroundDesignTools #manualEditToggle{width:100%!important}
      #backgroundDesignTools #saveDesignAdjustments,#backgroundDesignTools #resetPositions{display:flex!important;align-items:center!important;justify-content:center!important;gap:6px!important;background:#263746!important;color:#fff!important;border:1px solid rgba(255,255,255,.16)!important}
      #backgroundDesignTools #saveDesignAdjustments:hover,#backgroundDesignTools #resetPositions:hover{filter:brightness(1.08)}
      #backgroundDesignTools #webChangeBackgroundBtn{background:#176f9f!important;color:#fff!important;border:1px solid rgba(255,255,255,.16)!important}
      #backgroundPanel>label:has(#bgType),#backgroundPanel>#gradientBox,#backgroundPanel>#imageBox{display:none!important}
      #backgroundDesignTools #backgroundFooterControl{margin:0!important;padding:0!important;border:0!important;width:100%!important}
      #backgroundDesignTools #backgroundFooterToggle{margin:0!important;width:100%!important}
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
      box.innerHTML='<button type="button" class="bg-tools-toggle" aria-expanded="false"><span>🛠 أدوات تعديل التصميم</span><span class="bg-tools-arrow">▼</span></button><div class="bg-tools-grid"></div>';
      panel.appendChild(box);
      const toggle=box.querySelector(".bg-tools-toggle");
      toggle.addEventListener("click",()=>{
        const open=!box.classList.contains("is-open");
        box.classList.toggle("is-open",open);
        toggle.setAttribute("aria-expanded",String(open));
      });
    }
    const grid=box.querySelector(".bg-tools-grid");
    const manualWrap=document.querySelector(".manual-edit-toggle-wrap");
    const save=document.getElementById("saveDesignAdjustments");
    const reset=document.getElementById("resetPositions");
    const bgType=document.getElementById("bgType");
    const bgFile=document.getElementById("bgFile");
    let footer=document.getElementById("backgroundFooterControl");
    if(!footer){
      const footerPanel=document.getElementById("footerPanel");
      if(footerPanel){
        footer=document.createElement("div");
        footer.id="backgroundFooterControl";
        const btn=document.createElement("button");
        btn.type="button";btn.id="backgroundFooterToggle";btn.innerHTML="✍ <span>النص السفلي</span>";
        footer.appendChild(btn);footer.appendChild(footerPanel);
        btn.addEventListener("click",event=>{
          event.preventDefault();event.stopPropagation();
          const open=!footerPanel.classList.contains("footer-inside-open");
          footerPanel.classList.toggle("footer-inside-open",open);
          btn.classList.toggle("is-open",open);
        });
      }
    }

    let changeBtn=document.getElementById("webChangeBackgroundBtn");
    if(!changeBtn){
      changeBtn=document.createElement("button");
      changeBtn.type="button";
      changeBtn.id="webChangeBackgroundBtn";
      changeBtn.textContent="🖼️ تغيير الخلفية";
      changeBtn.addEventListener("click",event=>{
        event.preventDefault();
        if(bgType) bgType.value="image";
        if(bgFile) bgFile.click();
      });
    }

    if(changeBtn.parentElement!==grid)grid.appendChild(changeBtn);
    if(manualWrap&&manualWrap.parentElement!==grid)grid.appendChild(manualWrap);
    if(save&&save.parentElement!==grid)grid.appendChild(save);
    if(footer&&footer.parentElement!==grid)grid.appendChild(footer);
    if(reset&&reset.parentElement!==grid)grid.appendChild(reset);

    if(save) save.textContent="💾 حفظ التعديلات";
    if(reset) reset.textContent="↻ إعادة التموضع";

    return !!(manualWrap&&save&&reset&&bgFile&&footer);
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