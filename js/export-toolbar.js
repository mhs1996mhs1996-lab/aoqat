"use strict";
(function(){
  function addStyles(){
    if(document.getElementById("exportToolbarStyles"))return;
    const s=document.createElement("style");
    s.id="exportToolbarStyles";
    s.textContent=`
      .top-export-actions{
        display:flex;align-items:center;justify-content:flex-end;gap:6px;
        flex:0 0 auto;margin-inline-start:auto;padding:3px;
        border:1px solid rgba(255,255,255,.10);border-radius:10px;
        background:rgba(255,255,255,.045);box-shadow:0 2px 8px rgba(0,0,0,.10)
      }
      .top-export-actions button{
        display:inline-flex;align-items:center;justify-content:center;gap:5px;
        width:auto!important;min-width:0!important;min-height:32px!important;
        margin:0!important;padding:6px 10px!important;border:1px solid rgba(255,255,255,.12)!important;
        border-radius:7px!important;font:inherit;font-size:12px!important;font-weight:700!important;
        line-height:1.1;cursor:pointer;color:#fff;white-space:nowrap;
        box-shadow:none!important;transition:background .15s ease,transform .15s ease,border-color .15s ease
      }
      .top-export-actions button:active{transform:translateY(1px)}
      #topExportJpg{background:#176f9f!important}
      #topExportJpg:hover{background:#1b7daf!important}
      #saveToPhoneBtn{background:#168b52!important}
      #saveToPhoneBtn:hover{background:#19975a!important}
      .workspace>.export-buttons{display:none!important}
      @media(max-width:800px){
        .topbar{display:flex!important;align-items:center!important;gap:7px!important;flex-wrap:wrap!important}
        .topbar .brand{min-width:0;flex:1 1 190px}
        .top-export-actions{width:auto!important;max-width:100%;margin-inline-start:auto;gap:4px;padding:2px}
        .top-export-actions button{flex:0 0 auto!important;min-height:30px!important;padding:5px 7px!important;font-size:11px!important;border-radius:6px!important}
      }
      @media(max-width:430px){
        .top-export-actions{flex-basis:100%;justify-content:flex-end;margin-top:1px}
        .top-export-actions button{min-height:29px!important;padding:5px 8px!important}
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
    wrap.setAttribute('aria-label','خيارات حفظ التصميم');
    wrap.innerHTML=`
      <button id="topExportJpg" type="button" data-export-format="jpg" title="تصدير الصورة بصيغة JPG">📷 <span>تصدير JPG</span></button>
      <button id="saveToPhoneBtn" type="button" data-save-phone="true" title="حفظ الصورة على الهاتف">📱 <span>حفظ على الهاتف</span></button>`;
    old.replaceWith(wrap);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();