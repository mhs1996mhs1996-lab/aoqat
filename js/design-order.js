"use strict";

(function(){
  function setActive(index){
    const slides=Array.from(document.querySelectorAll('.design-carousel-track > .design-slide')).filter(s=>getComputedStyle(s).display!=="none");
    const i=Math.max(0,Math.min(Number(index)||0,slides.length-1));
    window.__prayerActiveDesignIndex=i;
    window.__prayerActiveDesignElement=slides[i]?.firstElementChild||null;
    window.dispatchEvent(new CustomEvent('prayerDesignChanged',{detail:{index:i,design:window.__prayerActiveDesignElement}}));
  }

  function applyPreferredDesignOrder(){
    const track=document.querySelector(".design-carousel-track");
    const ref=document.getElementById("designRef")?.closest(".design-slide");
    const d2=document.getElementById("design2")?.closest(".design-slide");
    const d3=document.getElementById("design3")?.closest(".design-slide");
    const d4=document.getElementById("design4")?.closest(".design-slide");
    if(!track||!ref||!d2||!d3||!d4)return false;

    // الترتيب المطلوب: التصميم الرابع السابق أولاً، ثم الأول والثاني والثالث.
    [ref,d2,d3,d4].forEach(slide=>track.appendChild(slide));
    track.style.transform="translateX(0%)";

    const status=document.querySelector(".final-carousel-controls .design-carousel-status");
    if(status)status.textContent="التصميم 1 من 4";
    document.querySelectorAll(".final-carousel-dots .design-carousel-dot").forEach((dot,index)=>{
      dot.classList.toggle("active",index===0);
    });
    setActive(0);
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
    const ready=applyPreferredDesignOrder();
    bindNavigation();
    if(ready||tries>60)clearInterval(timer);
  },100);

  document.addEventListener('click',e=>{
    if(e.target.closest('.final-carousel-controls,.final-carousel-dots'))setTimeout(bindNavigation,0);
  });
})();
