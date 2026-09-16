"use strict";

(function(){
  let ordered=false;

  function setActive(index){
    const slides=Array.from(document.querySelectorAll('.design-carousel-track > .design-slide')).filter(s=>getComputedStyle(s).display!=="none");
    const i=Math.max(0,Math.min(Number(index)||0,slides.length-1));
    window.__prayerActiveDesignIndex=i;
    window.__prayerActiveDesignElement=slides[i]?.firstElementChild||null;
    window.dispatchEvent(new CustomEvent('prayerDesignChanged',{detail:{index:i,design:window.__prayerActiveDesignElement}}));
  }

  function applyPreferredDesignOrder(){
    if(ordered)return true;
    const track=document.querySelector(".design-carousel-track");
    const ref=document.getElementById("designRef")?.closest(".design-slide");
    const d2=document.getElementById("design2")?.closest(".design-slide");
    const d3=document.getElementById("design3")?.closest(".design-slide");
    const d4=document.getElementById("design4")?.closest(".design-slide");
    if(!track||!ref||!d2||!d3||!d4)return false;

    // يرتب التصاميم مرة واحدة فقط عند بداية التشغيل.
    [ref,d2,d3,d4].forEach(slide=>track.appendChild(slide));
    ordered=true;
    setActive(0);
    return true;
  }

  let tries=0;
  const timer=setInterval(()=>{
    tries++;
    if(applyPreferredDesignOrder()||tries>60)clearInterval(timer);
  },100);
})();
