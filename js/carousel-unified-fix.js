"use strict";
(function(){
  const W=1024,H=1448;
  let active=0, busy=false;

  function visibleSlides(track){
    return Array.from(track.querySelectorAll(':scope > .design-slide')).filter(slide=>{
      if(slide.dataset.legacySlide==='true'||slide.querySelector('#design')) return false;
      if(slide.classList.contains('removed-design-storage')||slide.closest('.removed-design-storage')) return false;
      slide.style.removeProperty('display');
      slide.hidden=false;
      slide.removeAttribute('aria-hidden');
      return true;
    });
  }

  function resize(car){
    const p=document.querySelector('.previewBox');
    let scale=1;
    if(innerWidth<=800&&p){
      const cs=getComputedStyle(p);
      const avail=Math.max(220,p.clientWidth-parseFloat(cs.paddingLeft||0)-parseFloat(cs.paddingRight||0)-2);
      scale=Math.min(1,avail/W);
    }
    car.style.height=Math.ceil(H*scale)+'px';
  }

  function install(){
    if(busy)return false;busy=true;
    try{
      const track=document.querySelector('.design-carousel-track');
      const car=document.querySelector('.design-carousel');
      if(!track||!car)return false;
      const slides=visibleSlides(track);if(!slides.length)return false;

      // إزالة/إخفاء جميع أنظمة التنقل القديمة لمنع تكرار الأسهم والعدادات.
      const parent=car.parentElement;
      parent.querySelectorAll('.design-carousel-controls,.design-carousel-dots,.night-carousel-controls,.night-carousel-dots,.ornate-carousel-controls,.ornate-carousel-dots,.final-carousel-controls,.final-carousel-dots').forEach(el=>{
        if(!el.classList.contains('unified-preview-controls')&&!el.classList.contains('unified-preview-dots')) el.remove();
      });

      let controls=parent.querySelector('.unified-preview-controls');
      let dots=parent.querySelector('.unified-preview-dots');
      if(!controls){
        controls=document.createElement('div');
        controls.className='design-carousel-controls unified-preview-controls';
        controls.innerHTML='<button class="design-carousel-btn" type="button" data-unified-prev>‹</button><span class="design-carousel-status"></span><button class="design-carousel-btn" type="button" data-unified-next>›</button>';
        dots=document.createElement('div');dots.className='design-carousel-dots unified-preview-dots';
        parent.append(controls,dots);
      }
      dots.innerHTML=slides.map((_,i)=>`<button class="design-carousel-dot" type="button" data-unified-dot="${i}"></button>`).join('');

      const oldElement=window.__prayerActiveDesignElement;
      const oldIndex=Number(window.__prayerActiveDesignIndex);
      const byElement=oldElement?slides.findIndex(s=>s.firstElementChild===oldElement):-1;
      if(byElement>=0)active=byElement;
      else if(Number.isFinite(oldIndex))active=Math.max(0,Math.min(oldIndex,slides.length-1));
      else active=0;

      function render(){
        const current=visibleSlides(track);
        if(!current.length)return;
        active=((active%current.length)+current.length)%current.length;
        // index داخل جميع شرائح DOM لاستخدام التصدير القديم بدقة.
        const all=Array.from(track.querySelectorAll(':scope > .design-slide'));
        const domIndex=all.indexOf(current[active]);
        window.__prayerActiveDesignIndex=domIndex>=0?domIndex:active;
        window.__prayerActiveVisibleIndex=active;
        window.__prayerActiveDesignElement=current[active]?.firstElementChild||null;
        track.style.transform=`translateX(-${active*100}%)`;
        controls.querySelector('.design-carousel-status').textContent=`التصميم ${active+1} من ${current.length}`;
        dots.querySelectorAll('[data-unified-dot]').forEach((b,i)=>b.classList.toggle('active',i===active));
        resize(car);
        window.dispatchEvent(new CustomEvent('prayerDesignChanged',{detail:{index:active,domIndex,design:window.__prayerActiveDesignElement}}));
      }

      controls.querySelector('[data-unified-prev]').onclick=e=>{e.preventDefault();active--;render();};
      controls.querySelector('[data-unified-next]').onclick=e=>{e.preventDefault();active++;render();};
      dots.querySelectorAll('[data-unified-dot]').forEach(b=>b.onclick=e=>{e.preventDefault();active=Number(b.dataset.unifiedDot)||0;render();});
      render();
      return true;
    } finally {busy=false;}
  }

  function init(){
    let tries=0;
    const t=setInterval(()=>{tries++;if(install()||tries>100)clearInterval(t);},120);
    setTimeout(install,700);setTimeout(install,1600);
    window.addEventListener('resize',()=>install(),{passive:true});
    const root=document.querySelector('.previewBox');
    if(root){const ob=new MutationObserver(()=>setTimeout(install,0));ob.observe(root,{childList:true,subtree:true});}
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();