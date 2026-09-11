"use strict";
(function(){
  function addStyles(){
    if(document.getElementById("exportToolbarStyles"))return;
    const s=document.createElement("style");
    s.id="exportToolbarStyles";
    s.textContent=`
      .top-export-actions{display:flex;align-items:center;gap:8px;flex-wrap:wrap;justify-content:flex-end}
      .top-export-actions button{border:0;border-radius:9px;padding:10px 14px;min-height:40px;font:inherit;font-weight:800;cursor:pointer;color:#fff;white-space:nowrap}
      #topExportJpg{background:#176f9f}
      #saveToPhoneBtn{background:#168b52}
      .workspace>.export-buttons{display:none!important}
      @media(max-width:800px){
        .topbar{align-items:flex-start!important;gap:8px!important}
        .top-export-actions{width:100%;justify-content:stretch;gap:6px}
        .top-export-actions button{flex:1 1 0;padding:9px 8px;font-size:13px;min-width:0}
      }
    `;
    document.head.appendChild(s);
  }

  function init(){
    addStyles();
    document.querySelectorAll('.workspace .export-buttons').forEach(x=>x.remove());
    document.querySelectorAll('[data-export-format="png"],[data-export-format="webp"]').forEach(x=>x.remove());

    const old=document.getElementById('exportBtn');
    if(!old||document.getElementById('topExportActions'))return;
    const wrap=document.createElement('div');
    wrap.id='topExportActions';
    wrap.className='top-export-actions';
    wrap.innerHTML=`
      <button id="topExportJpg" type="button" data-export-format="jpg">📷 تصدير JPG</button>
      <button id="saveToPhoneBtn" type="button" data-save-phone="true">📱 حفظ على الهاتف</button>`;
    old.replaceWith(wrap);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();