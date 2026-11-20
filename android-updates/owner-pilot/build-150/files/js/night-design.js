"use strict";
(function(){
  /* التصميم الليلي (حافظ على صلاتك) تم إلغاؤه من المعاينة. */
  function cleanup(){
    const night=document.getElementById('designNight');
    if(night){
      const slide=night.closest('.design-slide');
      if(slide)slide.remove();
      else night.remove();
    }
    document.querySelectorAll('.night-carousel-controls,.night-carousel-dots').forEach(el=>el.remove());
    const finalControls=document.querySelector('.final-carousel-controls');
    const finalDots=document.querySelector('.final-carousel-dots');
    if(finalControls)finalControls.style.removeProperty('display');
    if(finalDots)finalDots.style.removeProperty('display');
    const style=document.getElementById('nightDesignStyles');
    if(style)style.remove();
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',cleanup,{once:true});
  else cleanup();
  window.addEventListener('load',()=>{cleanup();setTimeout(cleanup,400);setTimeout(cleanup,1200);},{once:true});
})();