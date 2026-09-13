"use strict";

(function(){
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
    return true;
  }

  let tries=0;
  const timer=setInterval(()=>{
    tries++;
    if(applyPreferredDesignOrder()||tries>60)clearInterval(timer);
  },100);
})();
