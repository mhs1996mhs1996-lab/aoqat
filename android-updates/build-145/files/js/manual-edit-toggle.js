"use strict";
(function(){
  let enabled=false;
  function injectStyle(){
    if(document.getElementById("manualEditToggleStyle"))return;
    const s=document.createElement("style");s.id="manualEditToggleStyle";
    s.textContent=`
      .manual-edit-toggle-wrap{display:flex;align-items:center;justify-content:center;margin:0}
      #manualEditToggle{width:100%;min-height:34px;border:1px solid rgba(255,255,255,.16);border-radius:8px;padding:7px 10px;font-family:inherit;font-size:13px;font-weight:700;cursor:pointer;transition:.2s;background:#263746;color:#fff;box-shadow:none;display:flex;align-items:center;justify-content:space-between;gap:8px}
      #manualEditToggle.is-on{background:#147c49;color:#fff}
      #manualEditToggle .manual-label{white-space:nowrap}
      #manualEditToggle .state{display:inline-flex;align-items:center;justify-content:center;min-width:48px;padding:2px 7px;border-radius:999px;background:rgba(255,255,255,.12);font-size:11px;font-weight:800}
      body.manual-edit-off .previewBox .draggable,body.manual-edit-off .previewBox .drag,body.manual-edit-off .previewBox [data-preview-movable="1"]{cursor:default!important;touch-action:auto!important;user-select:none!important}
      body.manual-edit-on .previewBox .draggable,body.manual-edit-on .previewBox .drag,body.manual-edit-on .previewBox [data-preview-movable="1"]{cursor:move!important;touch-action:none!important}
    `;document.head.appendChild(s);
  }
  function setState(on){
    enabled=!!on;
    window.__manualPreviewEditingEnabled=enabled;
    document.body.classList.toggle("manual-edit-on",enabled);
    document.body.classList.toggle("manual-edit-off",!enabled);
    const b=document.getElementById("manualEditToggle");if(!b)return;
    b.classList.toggle("is-on",enabled);b.setAttribute("aria-pressed",String(enabled));
    b.innerHTML=enabled?'<span class="manual-label">✋ التعديل اليدوي</span><span class="state">تشغيل</span>':'<span class="manual-label">🔒 التعديل اليدوي</span><span class="state">إيقاف</span>';
  }
  function blockWhenOff(e){
    if(enabled)return;
    if(!e.target.closest?.('.previewBox'))return;
    if(e.type==='pointerdown'||e.type==='mousedown'||e.type==='touchstart'){
      e.stopImmediatePropagation();
      e.stopPropagation();
    }
  }
  function init(){
    injectStyle();setState(false);
    let b=document.getElementById("manualEditToggle");
    if(!b){
      const preview=document.querySelector(".previewBox");if(!preview)return;
      const wrap=document.createElement("div");wrap.className="manual-edit-toggle-wrap";
      b=document.createElement("button");b.id="manualEditToggle";b.type="button";wrap.appendChild(b);
      const header=document.querySelector(".preview-header");if(header&&header.parentNode)header.insertAdjacentElement("afterend",wrap);else preview.parentNode.insertBefore(wrap,preview);
    }
    if(!b.dataset.manualBound){b.dataset.manualBound='1';b.addEventListener("click",()=>setState(!enabled));}
    setState(false);
    document.addEventListener('pointerdown',blockWhenOff,true);
    document.addEventListener('mousedown',blockWhenOff,true);
    document.addEventListener('touchstart',blockWhenOff,{capture:true,passive:true});
  }
  window.PrayerManualEdit={isEnabled:()=>enabled,set:setState};
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});else init();
})();