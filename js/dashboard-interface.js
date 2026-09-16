"use strict";

/* واجهة لوحة التحكم الجديدة: تغيّر ترتيب وشكل الواجهة فقط ولا تمس منطق التصاميم أو التصدير */
(function(){
  function init(){
    if(document.getElementById("dashboardInterfaceStyles")) return;
    const app=document.querySelector("main.app");
    const sidebar=document.querySelector(".sidebar");
    const workspace=document.querySelector(".workspace");
    const topbar=document.querySelector(".topbar");
    if(!app||!sidebar||!workspace||!topbar) return;

    document.body.classList.add("dashboard-interface-v1");

    /* هوية الشريط العلوي */
    let brand=topbar.querySelector(".dashboard-brand");
    if(!brand){
      brand=document.createElement("div");
      brand.className="dashboard-brand";
      brand.innerHTML='<div class="dashboard-logo">🕌</div><div><strong>أوقات الصلاة في الحويجة</strong><small>تصميم · معاينة · تصدير</small></div>';
      topbar.prepend(brand);
    }

    let tools=topbar.querySelector(".dashboard-top-tools");
    if(!tools){
      tools=document.createElement("div");
      tools.className="dashboard-top-tools";
      tools.innerHTML='<button type="button" data-dash-action="new">جديد　▱</button><button type="button" data-dash-action="open">فتح　▰</button><button type="button" data-dash-action="save">حفظ　▣</button>';
      const exportBtn=document.getElementById("exportBtn");
      if(exportBtn) topbar.insertBefore(tools,exportBtn);
      else topbar.appendChild(tools);
    }

    /* العمود الأيمن: عرض سريع لنفس حقول المشروع الأصلية بدون نسخها أو تغيير IDs */
    let quick=document.getElementById("dashboardQuickPanel");
    if(!quick){
      quick=document.createElement("aside");
      quick.id="dashboardQuickPanel";
      quick.className="dashboard-quick-panel";
      quick.innerHTML='<h2>إعدادات سريعة</h2><div class="quick-summary"><b>اليوم والتاريخ</b><div id="quickDateText">—</div><b>أوقات الصلاة</b><div id="quickPrayerText">—</div></div><button type="button" class="quick-preview-btn">◉ معاينة فورية</button>';
      app.appendChild(quick);
    }

    function val(id){const e=document.getElementById(id);return e?e.value:"";}
    function refreshQuick(){
      const date=document.getElementById("quickDateText");
      const prayer=document.getElementById("quickPrayerText");
      if(date) date.innerHTML=`<span>${val("dayName")}</span><span>${val("gregorianDay")} ${val("gregorianMonth")} ${val("gregorianYear")}</span><span>${val("hijriDay")} ${val("hijriMonth")} ${val("hijriYear")}</span>`;
      if(prayer) prayer.innerHTML=[["الفجر","fajr"],["الشروق","sunrise"],["الظهر","dhuhr"],["العصر","asr"],["المغرب","maghrib"],["العشاء","isha"]].map(([n,id])=>`<span><i>${n}</i><em>${val(id)}</em></span>`).join("");
    }
    document.addEventListener("change",refreshQuick,true);
    document.addEventListener("prayerPreviewDateChanged",refreshQuick);
    setTimeout(refreshQuick,500);

    quick.querySelector(".quick-preview-btn")?.addEventListener("click",()=>document.querySelector(".previewBox")?.scrollIntoView({behavior:"smooth",block:"start"}));
    tools.querySelector('[data-dash-action="new"]')?.addEventListener("click",()=>document.getElementById("resetPositions")?.click());
    tools.querySelector('[data-dash-action="save"]')?.addEventListener("click",()=>document.getElementById("exportBtn")?.click());
    tools.querySelector('[data-dash-action="open"]')?.addEventListener("click",()=>document.getElementById("bgFile")?.click());

    const style=document.createElement("style");
    style.id="dashboardInterfaceStyles";
    style.textContent=`
      body.dashboard-interface-v1{background:#06192b!important;color:#fff!important}
      .dashboard-interface-v1 .topbar{min-height:64px!important;height:auto!important;padding:7px 14px!important;background:linear-gradient(180deg,#0b2947,#071d33)!important;border-bottom:1px solid #315575!important;display:flex!important;direction:ltr!important;gap:12px!important}
      .dashboard-brand{display:flex;align-items:center;gap:10px;direction:rtl;min-width:280px}.dashboard-logo{width:44px;height:44px;border:1px solid #b98b35;border-radius:8px;display:grid;place-items:center;background:#102d47;font-size:25px}.dashboard-brand strong{display:block;font-size:19px}.dashboard-brand small{display:block;color:#aebed0;font-size:11px;margin-top:2px}
      .dashboard-top-tools{display:flex;gap:9px;margin:auto}.dashboard-top-tools button,.dashboard-interface-v1 .top-export{height:42px!important;min-width:108px!important;border:1px solid #365d7e!important;border-radius:8px!important;background:#102d49!important;color:#fff!important;font-weight:700!important;padding:0 15px!important}.dashboard-interface-v1 .top-export{background:#123858!important;margin:0!important}
      .dashboard-interface-v1 .app{direction:ltr!important;grid-template-columns:300px minmax(430px,1fr) 300px!important;max-width:1900px!important;gap:14px!important;padding:12px!important;align-items:start!important}.dashboard-interface-v1 .sidebar,.dashboard-interface-v1 .workspace,.dashboard-quick-panel{direction:rtl!important}
      .dashboard-interface-v1 .panel,.dashboard-interface-v1 .font-panel,.dashboard-quick-panel{background:linear-gradient(180deg,#0d2c48,#081e32)!important;border:1px solid #315574!important;border-radius:8px!important;box-shadow:0 8px 22px rgba(0,0,0,.18)!important}.dashboard-interface-v1 .main-panel h2,.dashboard-quick-panel h2{font-size:17px!important;border-bottom:1px solid #315574;margin:-13px -13px 12px!important;padding:12px!important;text-align:center!important}
      .dashboard-interface-v1 .main-action{background:#0b2740!important;border:1px solid #294d6b!important;border-radius:0!important;margin:0!important;height:48px!important;justify-content:flex-start!important;padding:0 14px!important}.dashboard-interface-v1 .main-action:hover,.dashboard-interface-v1 .main-action.inline-active{background:#123b5d!important}
      .dashboard-interface-v1 .preview-header{display:none!important}.dashboard-interface-v1 .previewBox{background:#07192a!important;border:1px solid #315574!important;border-radius:0!important;padding:0!important;overflow:hidden!important;display:flex!important;justify-content:center!important}.dashboard-interface-v1 .previewBox>*{transform-origin:top center}
      .dashboard-quick-panel{padding:13px;position:sticky;top:76px;min-height:520px}.quick-summary>b{display:block;margin:15px 0 7px;color:#e9eef4}.quick-summary>div{display:grid;gap:6px}.quick-summary #quickDateText span,.quick-summary #quickPrayerText span{border:1px solid #315574;background:#071a2b;border-radius:6px;padding:8px 10px;font-style:normal}.quick-summary #quickPrayerText span{display:flex;justify-content:space-between}.quick-summary i,.quick-summary em{font-style:normal}.quick-preview-btn{width:100%;height:48px;border:0;border-radius:7px;margin-top:18px;background:linear-gradient(180deg,#169bf1,#0877d4);color:white;font-size:16px;font-weight:700}
      .dashboard-interface-v1 .font-panel,.dashboard-interface-v1 .export-buttons,.dashboard-interface-v1 .drag-info{margin-top:10px!important}
      @media(max-width:1100px){.dashboard-interface-v1 .app{grid-template-columns:260px minmax(0,1fr)!important}.dashboard-quick-panel{display:none!important}.dashboard-brand{min-width:220px}.dashboard-top-tools button{min-width:80px!important}}
      @media(max-width:760px){.dashboard-interface-v1 .topbar{direction:rtl!important;flex-wrap:wrap!important;justify-content:center!important}.dashboard-brand{width:100%;justify-content:center;min-width:0}.dashboard-top-tools{order:3;width:100%;justify-content:center}.dashboard-top-tools button{min-width:0!important;flex:1}.dashboard-interface-v1 .top-export{min-width:95px!important}.dashboard-interface-v1 .app{display:flex!important;flex-direction:column!important;padding:6px!important}.dashboard-interface-v1 .sidebar,.dashboard-interface-v1 .workspace{width:100%!important}.dashboard-interface-v1 .sidebar{order:2}.dashboard-interface-v1 .workspace{order:1}.dashboard-interface-v1 .main-panel{display:grid!important;grid-template-columns:1fr 1fr!important}.dashboard-interface-v1 .main-panel h2{grid-column:1/-1}.dashboard-interface-v1 .main-action{font-size:13px!important;padding:0 8px!important}.dashboard-interface-v1 .previewBox{max-height:none!important}}
    `;
    document.head.appendChild(style);
  }
  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",init,{once:true}); else init();
  window.addEventListener("aoqatModulesReady",init,{once:true});
})();
