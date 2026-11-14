"use strict";
(function(){
  function apply(){
    const legacy=document.getElementById("design");
    if(!legacy) return;
    legacy.dataset.legacyPreview="true";
    legacy.style.display="none";

    const track=document.querySelector(".design-carousel-track");
    if(track){
      const slide=legacy.closest(".design-slide");
      if(slide){
        slide.style.display="none";
        slide.dataset.legacySlide="true";
      }
    }
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",apply,{once:true});else apply();
  window.addEventListener("load",()=>{apply();setTimeout(apply,1200);setTimeout(apply,2500)},{once:true});
})();