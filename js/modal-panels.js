"use strict";

(function(){
  function initModalPanels(){
    if(document.getElementById("controlPanelsModal")) return;

    const sidebar=document.querySelector(".sidebar");
    if(!sidebar) return;

    const panelIds=["datePanel","prayerPanel","backgroundPanel","footerPanel"];
    const panels=panelIds.map(id=>document.getElementById(id)).filter(Boolean);
    if(!panels.length) return;

    const style=document.createElement("style");
    style.id="controlPanelsModalStyles";
    style.textContent=`
      .modal-panel-storage{display:none!important}
      .control-modal{position:fixed;inset:0;z-index:99999;display:none;align-items:center;justify-content:center;padding:18px;background:rgba(0,8,14,.76);backdrop-filter:blur(5px)}
      .control-modal.open{display:flex}
      .control-modal-card{width:min(560px,100%);max-height:min(86vh,820px);display:flex;flex-direction:column;border:1px solid rgba(255,255,255,.18);border-radius:18px;background:linear-gradient(155deg,#102a38,#071722 72%);box-shadow:0 24px 70px rgba(0,0,0,.55);overflow:hidden;animation:controlModalIn .18s ease-out}
      .control-modal-head{min-height:58px;padding:10px 14px;display:flex;align-items:center;justify-content:space-between;gap:12px;border-bottom:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.035)}
      .control-modal-title{font-size:19px;font-weight:800;color:#fff}
      .control-modal-close{width:42px;height:42px;border:1px solid rgba(255,255,255,.18);border-radius:10px;background:#152e3d;color:#fff;font-size:26px;line-height:1;cursor:pointer}
      .control-modal-body{overflow-y:auto;overscroll-behavior:contain;padding:12px}
      .control-modal-body>.panel{margin:0!important;width:100%!important;display:block!important;border:0!important;box-shadow:none!important;background:transparent!important;padding:2px!important}
      .control-modal-body>.panel>.panel-title{display:none!important}
      .control-modal-body>.panel.collapsed>*:not(.panel-title){display:revert!important}
      body.modal-controls-open{overflow:hidden!important}
      @keyframes controlModalIn{from{opacity:0;transform:translateY(16px) scale(.985)}to{opacity:1;transform:none}}
      @media(max-width:800px){
        .sidebar{gap:8px!important}
        .sidebar>.main-panel{margin:0!important}
        .control-modal{padding:8px;align-items:flex-end}
        .control-modal-card{width:100%;max-height:88dvh;border-radius:18px 18px 0 0}
        .control-modal-head{min-height:54px;padding:8px 12px}
        .control-modal-title{font-size:17px}
        .control-modal-close{width:40px;height:40px}
        .control-modal-body{padding:10px 12px 18px}
        .control-modal-body label{margin-bottom:11px!important}
        .control-modal-body select,.control-modal-body input[type="text"],.control-modal-body input[type="number"],.control-modal-body textarea{min-height:42px!important;font-size:15px!important}
      }
    `;
    document.head.appendChild(style);

    const storage=document.createElement("div");
    storage.className="modal-panel-storage";
    storage.id="modalPanelStorage";
    sidebar.appendChild(storage);
    panels.forEach(panel=>storage.appendChild(panel));

    const modal=document.createElement("div");
    modal.id="controlPanelsModal";
    modal.className="control-modal";
    modal.setAttribute("aria-hidden","true");
    modal.innerHTML=`
      <div class="control-modal-card" role="dialog" aria-modal="true" aria-labelledby="controlModalTitle">
        <div class="control-modal-head">
          <div id="controlModalTitle" class="control-modal-title"></div>
          <button type="button" class="control-modal-close" aria-label="إغلاق">×</button>
        </div>
        <div class="control-modal-body"></div>
      </div>`;
    document.body.appendChild(modal);

    const title=modal.querySelector(".control-modal-title");
    const body=modal.querySelector(".control-modal-body");
    const closeBtn=modal.querySelector(".control-modal-close");
    let activePanel=null;

    const titles={
      datePanel:"📅 بيانات التاريخ",
      prayerPanel:"🕌 أوقات الصلاة",
      backgroundPanel:"🎨 الخلفية",
      footerPanel:"✍ النص السفلي"
    };

    function closeModal(){
      if(activePanel){
        activePanel.classList.remove("active-panel","collapsed");
        storage.appendChild(activePanel);
      }
      activePanel=null;
      modal.classList.remove("open");
      modal.setAttribute("aria-hidden","true");
      document.body.classList.remove("modal-controls-open");
    }

    function openPanel(id){
      const panel=document.getElementById(id);
      if(!panel) return;
      if(activePanel&&activePanel!==panel) storage.appendChild(activePanel);
      activePanel=panel;
      panel.classList.add("active-panel");
      panel.classList.remove("collapsed");
      body.replaceChildren(panel);
      title.textContent=titles[id]||"بيانات التصميم";
      modal.classList.add("open");
      modal.setAttribute("aria-hidden","false");
      document.body.classList.add("modal-controls-open");
      body.scrollTop=0;
    }

    document.querySelectorAll("[data-open-panel]").forEach(button=>{
      button.addEventListener("click",event=>{
        event.preventDefault();
        event.stopImmediatePropagation();
        openPanel(button.dataset.openPanel);
      },true);
    });

    closeBtn.addEventListener("click",closeModal);
    modal.addEventListener("click",event=>{if(event.target===modal) closeModal();});
    document.addEventListener("keydown",event=>{if(event.key==="Escape"&&modal.classList.contains("open")) closeModal();});
  }

  if(document.readyState==="loading"){
    document.addEventListener("DOMContentLoaded",initModalPanels,{once:true});
  }else{
    initModalPanels();
  }
})();
