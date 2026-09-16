"use strict";

(function(){
  const FIRST_ID="designRef";

  function visibleSlides(){
    return Array.from(document.querySelectorAll('.design-carousel-track > .design-slide'))
      .filter(s=>getComputedStyle(s).display!=="none" && !s.closest('.removed-design-storage'));
  }

  function setActive(index){
    const slides=visibleSlides();
    const i=Math.max(0,Math.min(Number(index)||0,slides.length-1));
    window.__prayerActiveDesignIndex=i;
    window.__prayerActiveVisibleIndex=i;
    window.__prayerActiveDesignElement=slides[i]?.firstElementChild||null;
    window.dispatchEvent(new CustomEvent('prayerDesignChanged',{detail:{index:i,design:window.__prayerActiveDesignElement}}));
  }

  function updateUi(count,index=0){
    document.querySelectorAll('.final-carousel-controls .design-carousel-status,.design-carousel-status').forEach(status=>{
      if(status.closest('.removed-design-storage'))return;
      status.textContent=`التصميم ${index+1} من ${count}`;
    });
    document.querySelectorAll('.final-carousel-dots .design-carousel-dot').forEach((dot,i)=>dot.classList.toggle('active',i===index));
  }

  function applyPreferredDesignOrder(forceFirst=false){
    const track=document.querySelector('.design-carousel-track');
    const ref=document.getElementById(FIRST_ID)?.closest('.design-slide');
    if(!track||!ref)return false;

    const current=Array.from(track.children).filter(x=>x.classList?.contains('design-slide'));
    const others=current.filter(slide=>slide!==ref);
    track.insertBefore(ref,current[0]||null);
    others.forEach(slide=>track.appendChild(slide));

    if(forceFirst){
      track.style.setProperty('transform','translateX(0%)','important');
      const count=visibleSlides().length;
      updateUi(count,0);
      setActive(0);
    }
    return true;
  }

  function bindNavigation(){
    const controls=document.querySelector('.final-carousel-controls');
    const dots=document.querySelector('.final-carousel-dots');
    if(controls&&controls.dataset.orderSync!=="1"){
      controls.dataset.orderSync="1";
      controls.addEventListener('click',()=>setTimeout(()=>{
        const text=controls.querySelector('.design-carousel-status')?.textContent||'';
        const m=text.match(/(\d+)\s*من/);
        if(m)setActive(Number(m[1])-1);
      },0));
    }
    if(dots&&dots.dataset.orderSync!=="1"){
      dots.dataset.orderSync="1";
      dots.addEventListener('click',e=>{
        const dot=e.target.closest('[data-dot]');
        if(dot)setTimeout(()=>setActive(Number(dot.dataset.dot)),0);
      });
    }
  }

  let tries=0;
  const timer=setInterval(()=>{
    tries++;
    const ready=applyPreferredDesignOrder(true);
    bindNavigation();
    if(ready||tries>100)clearInterval(timer);
  },100);

  // بعض وحدات التصميم تُضاف بعد التحميل؛ بعد اكتمالها نثبت ترتيب البداية مرة أخيرة.
  window.addEventListener('aoqatModulesReady',()=>setTimeout(()=>applyPreferredDesignOrder(true),120));
  window.addEventListener('load',()=>setTimeout(()=>applyPreferredDesignOrder(true),700),{once:true});

  document.addEventListener('click',e=>{
    if(e.target.closest('.final-carousel-controls,.final-carousel-dots'))setTimeout(bindNavigation,0);
  });
})();
