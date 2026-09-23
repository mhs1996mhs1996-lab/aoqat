"use strict";
(function(){
  const MIGRATION_KEY="aoqatStartupCleanupV3";
  const REQUIRED_DESIGNS=["design2","design3","design4","designRef"];

  function addStyle(){
    if(document.getElementById("startupStabilizerStyle"))return;
    const s=document.createElement("style");
    s.id="startupStabilizerStyle";
    s.textContent=`
      body.aoqat-booting .workspace,body.aoqat-booting .sidebar{visibility:hidden!important}
      body.aoqat-ready .workspace,body.aoqat-ready .sidebar{visibility:visible!important}
      .workspace>.export-buttons{display:none!important}
    `;
    document.head.appendChild(s);
  }

  function clearObsoleteSavedStateOnce(){
    if(localStorage.getItem(MIGRATION_KEY)==="1")return;
    try{
      // هذه المفاتيح كانت تعتمد على ترتيب العناصر/التصاميم القديم، وبعد حذف تصاميم
      // صار تطبيقها على عناصر جديدة يسبب مواضع وتنسيقات عشوائية عند بداية التشغيل.
      localStorage.removeItem("prayerDesignerSavedAdjustmentsV1");
      localStorage.removeItem("prayerDesignerUniversalSavedStateV2");
      localStorage.removeItem("prayerDesignerFontStatesV1");
      localStorage.setItem(MIGRATION_KEY,"1");
    }catch(_){ }
  }

  function cleanLegacyExportUi(){
    document.querySelectorAll('.workspace>.export-buttons').forEach(el=>el.remove());
    document.querySelectorAll('[data-export-format="png"],[data-export-format="webp"]').forEach(el=>el.remove());
    const old=document.getElementById("exportBtn");
    if(old&&!document.getElementById("saveToPhoneBtn")){
      old.id="saveToPhoneBtn";
      old.removeAttribute("data-export-format");
      old.setAttribute("data-save-phone","true");
      old.innerHTML='📱 <span>حفظ على الهاتف</span>';
    }
  }

  function currentSlides(){
    const track=document.querySelector('.design-carousel-track');
    if(!track)return [];
    return REQUIRED_DESIGNS.map(id=>document.getElementById(id)?.closest('.design-slide')).filter(Boolean);
  }

  function stabilizeCarousel(){
    const track=document.querySelector('.design-carousel-track');
    const car=document.querySelector('.design-carousel');
    if(!track||!car)return false;

    const slides=currentSlides();
    if(slides.length!==REQUIRED_DESIGNS.length)return false;

    // لا نعيد أي تصميم محذوف، ونُظهر فقط التصاميم الأربعة الحالية.
    slides.forEach(slide=>{
      slide.style.removeProperty('display');
      slide.hidden=false;
      slide.removeAttribute('aria-hidden');
    });

    // التصميم الأول القديم يبقى خارج المعاينة لخدمة منطق البيانات فقط.
    const legacy=document.getElementById('design');
    const legacySlide=legacy?.closest('.design-slide');
    if(legacySlide&&track.contains(legacySlide)){
      let storage=document.getElementById('removedDesignStorage');
      if(!storage){storage=document.createElement('div');storage.id='removedDesignStorage';storage.className='removed-design-storage';document.body.appendChild(storage);}
      storage.appendChild(legacySlide);
    }

    // البداية دائمًا من أول تصميم حالي حقيقي، بدون الاعتماد على حالة قديمة.
    track.style.transform='translateX(0%)';
    window.__prayerActiveDesignIndex=0;
    window.__prayerActiveVisibleIndex=0;
    window.__prayerActiveDesignElement=document.getElementById('design2');

    document.querySelectorAll('.design-carousel-controls,.design-carousel-dots,.night-carousel-controls,.night-carousel-dots,.ornate-carousel-controls,.ornate-carousel-dots').forEach(el=>{
      if(!el.classList.contains('final-carousel-controls')&&!el.classList.contains('final-carousel-dots'))el.style.display='none';
    });
    const controls=document.querySelector('.final-carousel-controls');
    const dots=document.querySelector('.final-carousel-dots');
    if(controls){controls.style.display='flex';const status=controls.querySelector('.design-carousel-status');if(status)status.textContent='التصميم 1 من 4';}
    if(dots){dots.style.display='flex';dots.querySelectorAll('.design-carousel-dot').forEach((d,i)=>d.classList.toggle('active',i===0));}

    const preview=document.querySelector('.previewBox');
    if(preview&&innerWidth<=800){
      const cs=getComputedStyle(preview);
      const avail=Math.max(220,preview.clientWidth-parseFloat(cs.paddingLeft||0)-parseFloat(cs.paddingRight||0)-2);
      const scale=Math.min(1,avail/1024);
      REQUIRED_DESIGNS.forEach(id=>{const d=document.getElementById(id);if(d)d.style.zoom=String(scale);});
      car.style.height=Math.ceil(1448*scale)+'px';
    }
    return true;
  }

  function prayerDataReady(){
    return ["fajr","sunrise","dhuhr","asr","maghrib","isha"].every(id=>{
      const el=document.getElementById(id);
      return el&&String(el.value||'').trim();
    });
  }

  function finish(){
    cleanLegacyExportUi();
    stabilizeCarousel();
    document.body.classList.remove('aoqat-booting');
    document.body.classList.add('aoqat-ready');
  }

  function init(){
    addStyle();
    clearObsoleteSavedStateOnce();
    document.body.classList.add('aoqat-booting');
    cleanLegacyExportUi();

    let tries=0;
    const timer=setInterval(()=>{
      tries++;
      cleanLegacyExportUi();
      const designsOk=stabilizeCarousel();
      if((designsOk&&prayerDataReady())||tries>=80){
        clearInterval(timer);
        finish();
      }
    },100);

    // إعادة تثبيت بسيطة بعد اكتمال كل سكربتات الواجهة فقط، لمنع أي سباق تحميل متأخر.
    window.addEventListener('load',()=>{
      setTimeout(finish,1600);
      setTimeout(finish,3000);
    },{once:true});
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
})();