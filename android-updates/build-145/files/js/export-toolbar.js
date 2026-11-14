"use strict";
(function(){
  function addStyles(){
    if(document.getElementById("exportToolbarStyles"))return;
    const s=document.createElement("style");
    s.id="exportToolbarStyles";
    s.textContent=`
      #saveToPhoneBtn{
        display:inline-flex;align-items:center;justify-content:center;gap:5px;
        width:auto!important;min-width:0!important;min-height:32px!important;
        margin:0 0 0 auto!important;padding:6px 10px!important;
        border:1px solid rgba(255,255,255,.14)!important;border-radius:7px!important;
        background:#168b52!important;color:#fff!important;font:inherit;font-size:12px!important;
        font-weight:700!important;line-height:1.1;cursor:pointer;white-space:nowrap;
        box-shadow:0 2px 7px rgba(0,0,0,.12)!important;transition:.15s ease
      }
      #saveToPhoneBtn:hover{background:#19975a!important}
      #saveToPhoneBtn:active{transform:translateY(1px)}
      #topExportJpg{
        width:100%!important;min-height:42px!important;margin:7px 0 0!important;
        padding:9px 12px!important;border:0!important;border-radius:9px!important;
        background:#176f9f!important;color:#fff!important;font:inherit;font-size:14px!important;
        font-weight:800!important;cursor:pointer;box-shadow:none!important
      }
      #topExportJpg:hover{background:#1b7daf!important}
      .workspace>.export-buttons{display:none!important}
      @media(max-width:800px){
        .topbar{display:flex!important;align-items:center!important;gap:7px!important;flex-wrap:nowrap!important}
        .topbar .brand{min-width:0;flex:1 1 auto}
        #saveToPhoneBtn{flex:0 0 auto!important;min-height:30px!important;padding:5px 7px!important;font-size:11px!important}
      }
      @media(max-width:430px){
        .topbar .brand p{display:none!important}
        #saveToPhoneBtn{padding:5px 7px!important;font-size:10.5px!important}
      }
    `;
    document.head.appendChild(s);
  }

  function init(){
    addStyles();
    document.querySelectorAll('.workspace .export-buttons').forEach(x=>x.remove());
    document.querySelectorAll('[data-export-format="png"],[data-export-format="webp"]').forEach(x=>x.remove());
    document.getElementById('topExportActions')?.remove();

    const old=document.getElementById('exportBtn');
    if(old){
      const phone=document.createElement('button');
      phone.id='saveToPhoneBtn';
      phone.type='button';
      phone.setAttribute('data-save-phone','true');
      phone.title='حفظ الصورة على الهاتف';
      phone.innerHTML='📱 <span>حفظ على الهاتف</span>';
      old.replaceWith(phone);
    }else if(!document.getElementById('saveToPhoneBtn')){
      const topbar=document.querySelector('.topbar');
      if(topbar){
        const phone=document.createElement('button');
        phone.id='saveToPhoneBtn';phone.type='button';phone.setAttribute('data-save-phone','true');
        phone.innerHTML='📱 <span>حفظ على الهاتف</span>';
        topbar.appendChild(phone);
      }
    }

    if(!document.getElementById('topExportJpg')){
      const mainPanel=document.querySelector('.sidebar .main-panel');
      if(mainPanel){
        const jpg=document.createElement('button');
        jpg.id='topExportJpg';jpg.type='button';jpg.setAttribute('data-export-format','jpg');
        jpg.title='تصدير الصورة بصيغة JPG';
        jpg.innerHTML='📷 <span>تصدير JPG</span>';
        mainPanel.appendChild(jpg);
      }
    }
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();