"use strict";
(function(){
  const TOTAL=5;
  let active=0;

  function currentSlides(){
    const track=document.querySelector('.design-carousel-track');
    if(!track)return [];
    return Array.from(track.querySelectorAll(':scope > .design-slide')).filter(slide=>{
      if(slide.dataset.legacySlide==='true')return false;
      if(slide.closest('.removed-design-storage'))return false;
      return true;
    });
  }

  function apply(index){
    const track=document.querySelector('.design-carousel-track');
    const controls=document.querySelector('.night-carousel-controls');
    const dots=document.querySelector('.night-carousel-dots');
    if(!track||!controls||!dots)return false;

    const slides=currentSlides();
    if(slides.length<TOTAL)return false;

    active=Math.max(0,Math.min(Number(index)||0,TOTAL-1));
    window.__prayerActiveDesignIndex=active;
    track.style.transform=`translateX(-${active*100}%)`;

    const status=controls.querySelector('.design-carousel-status');
    if(status)status.textContent=`التصميم ${active+1} من ${TOTAL}`;
    dots.querySelectorAll('.design-carousel-dot[data-dot]').forEach((dot,i)=>dot.classList.toggle('active',i===active));

    const activeDesign=slides[active]?.firstElementChild;
    if(activeDesign){
      window.__prayerActiveDesignElement=activeDesign;
      window.dispatchEvent(new CustomEvent('prayerDesignChanged',{detail:{index:active,design:activeDesign}}));
    }
    return true;
  }

  function bind(){
    const controls=document.querySelector('.night-carousel-controls');
    const dots=document.querySelector('.night-carousel-dots');
    const track=document.querySelector('.design-carousel-track');
    if(!controls||!dots||!track)return false;
    if(controls.dataset.fourthFixBound==='1')return true;
    controls.dataset.fourthFixBound='1';

    const prev=controls.querySelector('[data-prev]');
    const next=controls.querySelector('[data-next]');
    if(prev)prev.onclick=function(e){e?.preventDefault();e?.stopPropagation();apply((active-1+TOTAL)%TOTAL);};
    if(next)next.onclick=function(e){e?.preventDefault();e?.stopPropagation();apply((active+1)%TOTAL);};
    dots.querySelectorAll('.design-carousel-dot[data-dot]').forEach(dot=>{
      dot.onclick=function(e){e?.preventDefault();e?.stopPropagation();apply(Number(dot.dataset.dot)||0);};
    });

    const activeDot=dots.querySelector('.design-carousel-dot.active[data-dot]');
    apply(activeDot?Number(activeDot.dataset.dot)||0:0);
    return true;
  }

  function init(){
    let tries=0;
    const timer=setInterval(()=>{
      tries++;
      if(bind()||tries>80)clearInterval(timer);
    },150);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();