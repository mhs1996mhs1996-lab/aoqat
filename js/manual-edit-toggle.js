"use strict";
(function(){
  let enabled=false;
  function injectStyle(){
    if(document.getElementById("manualEditToggleStyle"))return;
    const s=document.createElement("style");s.id="manualEditToggleStyle";
    s.textContent=`
      .manual-edit-toggle-wrap{display:flex;align-items:center;justify-content:center;margin:12px 0 8px}
      #manualEditToggle{width:min(100%,420px);border:0;border-radius:12px;padding:13px 18px;font-family:inherit;font-size:16px;font-weight:800;cursor:pointer;transition:.2s;background:#233746;color:#fff;box-shadow:0 5px 16px rgba(0,0,0,.18)}
      #manualEditToggle.is-on{background:#168b52;color:#fff}
      #manualEditToggle .state{display:inline-block;min-width:58px;margin-right:8px}
      body.manual-edit-off .previewBox .draggable,body.manual-edit-off .previewBox .drag{pointer-events:none!important;cursor:default!important;touch-action:auto!important;user-select:none!important}
      body.manual-edit-on .previewBox .draggable,body.manual-edit-on .previewBox .drag{pointer-events:auto!important;cursor:move!important;touch-action:none!important}
    `;document.head.appendChild(s);
  }
  function setState(on){
    enabled=!!on;
    document.body.classList.toggle("manual-edit-on",enabled);
    document.body.classList.toggle("manual-edit-off",!enabled);
    const b=document.getElementById("manualEditToggle");if(!b)return;
    b.classList.toggle("is-on",enabled);
    b.setAttribute("aria-pressed",String(enabled));
    b.innerHTML=enabled?'✋ التعديل اليدوي <span class="state">مُشغّل</span>':'🔒 التعديل اليدوي <span class="state">مُطفأ</span>';
  }
  function init(){
    injectStyle();setState(false);
    if(document.getElementById("manualEditToggle"))return;
    const preview=document.querySelector(".previewBox");if(!preview)return;
    const wrap=document.createElement("div");wrap.className="manual-edit-toggle-wrap";
    const b=document.createElement("button");b.id="manualEditToggle";b.type="button";wrap.appendChild(b);
    const header=document.querySelector(".preview-header");
    if(header&&header.parentNode)header.insertAdjacentElement("afterend",wrap);else preview.parentNode.insertBefore(wrap,preview);
    b.addEventListener("click",()=>setState(!enabled));setState(false);
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});else init();
})();