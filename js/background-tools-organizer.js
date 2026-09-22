"use strict";
(function(){
  function addStyles(){
    if(document.getElementById("backgroundToolsStyles"))return;
    const s=document.createElement("style");
    s.id="backgroundToolsStyles";
    s.textContent=`
      #backgroundDesignTools{margin-top:10px;padding-top:10px;border-top:1px solid rgba(213,198,170,.75)}
      #backgroundDesignTools .bg-tools-toggle{width:100%!important;min-height:46px!important;margin:0!important;padding:9px 12px!important;border:1px solid #2f7680!important;border-radius:10px!important;background:linear-gradient(135deg,#174b55,#226572)!important;color:#fff!important;font-family:inherit!important;font-size:15px!important;font-weight:800!important;display:flex!important;align-items:center!important;justify-content:space-between!important;gap:8px!important;cursor:pointer!important}
      #backgroundDesignTools .bg-tools-toggle span{color:#fff!important}
      #backgroundDesignTools .bg-tools-arrow{font-size:12px!important;transition:transform .18s ease}
      #backgroundDesignTools.tools-open .bg-tools-arrow{transform:rotate(180deg)}
      #backgroundDesignTools .bg-tools-grid{display:none;grid-template-columns:1fr;gap:7px;padding-top:8px}
      #backgroundDesignTools.tools-open .bg-tools-grid{display:grid}
      #backgroundDesignTools .bg-tools-grid>button,#backgroundDesignTools .bg-tools-grid>.main-action{width:100%!important;min-width:0!important;margin:0!important;min-height:34px!important;height:34px!important;border-radius:7px!important;padding:4px 10px!important;font-size:12.5px!important;font-weight:750!important;box-shadow:0 1px 3px rgba(20,45,55,.12)!important;display:flex!important;align-items:center!important;justify-content:center!important;gap:6px!important}
      #backgroundDesignTools .manual-edit-toggle-wrap{margin:0!important;width:100%!important}
      #backgroundDesignTools #changeBackgroundBtn{background:linear-gradient(135deg,#176f9f,#2489bb)!important;border:1px solid #2d91bd!important;color:#fff!important}
      #backgroundDesignTools #manualEditToggle{width:100%!important;min-height:34px!important;height:34px!important;padding:4px 10px!important;border-radius:7px!important;font-size:12.5px!important;background:#70817f!important;border:1px solid #859593!important;color:#fff!important;box-shadow:0 1px 3px rgba(20,45,55,.12)!important}
      #backgroundDesignTools #manualEditToggle.is-on,#backgroundDesignTools #manualEditToggle[aria-pressed="true"]{background:linear-gradient(135deg,#078b46,#10a95b)!important;border-color:#08753e!important;color:#fff!important}
      #backgroundDesignTools #saveDesignAdjustments{background:linear-gradient(135deg,#6b3fa0,#8c55b4)!important;border:1px solid #9a68bc!important;color:#fff!important}
      #backgroundDesignTools #resetPositions{background:linear-gradient(135deg,#b36a18,#d08a2e)!important;border:1px solid #d89843!important;color:#fff!important}
      #backgroundDesignTools [data-open-panel="footerPanel"]{background:linear-gradient(135deg,#a74468,#c75b7f)!important;border:1px solid #d06d8d!important;color:#fff!important}
      #backgroundDesignTools #changeBackgroundBtn *,#backgroundDesignTools #manualEditToggle *,#backgroundDesignTools #saveDesignAdjustments *,#backgroundDesignTools #resetPositions *,#backgroundDesignTools [data-open-panel="footerPanel"] *{color:#fff!important}
      #backgroundDesignTools #changeBackgroundBtn:hover,#backgroundDesignTools #manualEditToggle:hover,#backgroundDesignTools #saveDesignAdjustments:hover,#backgroundDesignTools #resetPositions:hover,#backgroundDesignTools [data-open-panel="footerPanel"]:hover{filter:brightness(1.07)}
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
      box.innerHTML='<button type="button" class="bg-tools-toggle" aria-expanded="false"><span>🛠️ أدوات تعديل التصميم</span><span class="bg-tools-arrow">▼</span></button><div class="bg-tools-grid"></div>';
      panel.appendChild(box);
      const toggle=box.querySelector(".bg-tools-toggle");
      toggle.addEventListener("click",event=>{
        event.preventDefault();
        event.stopPropagation();
        const open=!box.classList.contains("tools-open");
        box.classList.toggle("tools-open",open);
        toggle.setAttribute("aria-expanded",String(open));
      });
    }else if(!box.querySelector(".bg-tools-toggle")){
      const oldTitle=box.querySelector(".bg-tools-title");
      if(oldTitle)oldTitle.remove();
      const toggle=document.createElement("button");
      toggle.type="button";toggle.className="bg-tools-toggle";toggle.setAttribute("aria-expanded","false");
      toggle.innerHTML='<span>🛠️ أدوات تعديل التصميم</span><span class="bg-tools-arrow">▼</span>';
      box.prepend(toggle);
      toggle.addEventListener("click",event=>{event.preventDefault();event.stopPropagation();const open=!box.classList.contains("tools-open");box.classList.toggle("tools-open",open);toggle.setAttribute("aria-expanded",String(open));});
    }

    const grid=box.querySelector(".bg-tools-grid");
    const changeBackground=document.getElementById("changeBackgroundBtn");
    const manualWrap=document.querySelector(".manual-edit-toggle-wrap");
    const save=document.getElementById("saveDesignAdjustments");
    const reset=document.getElementById("resetPositions");
    const footerButton=document.querySelector('[data-open-panel="footerPanel"]');

    [changeBackground,manualWrap,save,reset,footerButton].forEach(el=>{
      if(el&&el.parentElement!==grid)grid.appendChild(el);
    });

    if(save)save.textContent="💾 حفظ التعديلات";
    if(reset)reset.textContent="↻ إعادة التموضع";
    if(footerButton)footerButton.innerHTML="✍️ <span>النص السفلي</span>";

    return !!(changeBackground&&manualWrap&&save&&reset&&footerButton);
  }

  function init(){
    let tries=0;
    const timer=setInterval(()=>{tries++;const done=moveTools();if(done||tries>80)clearInterval(timer);},150);
    moveTools();
    window.addEventListener("aoqatModulesReady",()=>setTimeout(moveTools,80));
    /* Keep footer control inside Design Edit Tools even if another module reorders menu items later. */
    const observer=new MutationObserver(()=>{const footer=document.querySelector('[data-open-panel="footerPanel"]');const grid=document.querySelector("#backgroundDesignTools .bg-tools-grid");if(footer&&grid&&footer.parentElement!==grid)grid.appendChild(footer);});
    observer.observe(document.querySelector(".sidebar .main-panel")||document.body,{childList:true,subtree:true});
  }

  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});else init();
})();