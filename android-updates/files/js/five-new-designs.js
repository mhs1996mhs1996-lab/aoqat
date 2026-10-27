"use strict";
(function(){
  function keepAllDesigns(){
    const track=document.querySelector('.design-carousel-track');
    if(!track)return;
    Array.from(track.querySelectorAll(':scope > .design-slide')).forEach(slide=>{
      if(slide.dataset.legacySlide==='true'||slide.querySelector('#design'))return;
      slide.style.removeProperty('display');
      slide.hidden=false;
      slide.removeAttribute('aria-hidden');
    });
  }
  function init(){
    keepAllDesigns();
    setTimeout(keepAllDesigns,300);setTimeout(keepAllDesigns,900);setTimeout(keepAllDesigns,1800);
    const track=document.querySelector('.design-carousel-track');
    if(track){
      const obs=new MutationObserver(()=>keepAllDesigns());
      obs.observe(track,{childList:true,subtree:false,attributes:true,attributeFilter:['style','hidden','aria-hidden']});
    }
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();