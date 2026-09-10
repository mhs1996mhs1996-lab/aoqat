"use strict";

(function(){
  function init(){
    const carousel=document.querySelector(".design-carousel");
    const track=document.querySelector(".design-carousel-track");
    const ornate=document.getElementById("designOrnate");
    if(!carousel||!track||!ornate) return false;

    const ornateSlide=ornate.closest(".design-slide");
    if(!ornateSlide) return false;

    // المشروع كان يحتوي فعلياً على 4 تصاميم قبل إضافة التصميم الجديد.
    // نحتفظ بأول 4 تصاميم فعلية فقط، ثم نضع التصميم الجديد خامساً.
    const existing=Array.from(track.querySelectorAll(":scope > .design-slide"))
      .filter(slide=>slide!==ornateSlide)
      .slice(0,4);

    const wanted=[...existing,ornateSlide];
    Array.from(track.querySelectorAll(":scope > .design-slide")).forEach(slide=>{
      slide.style.display=wanted.includes(slide)?"":"none";
    });

    wanted.forEach(slide=>track.appendChild(slide));

    document.querySelectorAll(".design-carousel-controls,.design-carousel-dots").forEach(el=>{
      el.style.display="none";
    });

    document.querySelector(".master-carousel-controls")?.remove();
    document.querySelector(".master-carousel-dots")?.remove();

    const total=wanted.length;
    let active=0;

    const controls=document.createElement("div");
    controls.className="design-carousel-controls master-carousel-controls";
    controls.style.display="flex";
    controls.innerHTML=`<button class="design-carousel-btn" data-prev>‹</button><span class="design-carousel-status">التصميم 1 من ${total}</span><button class="design-carousel-btn" data-next>›</button>`;

    const dots=document.createElement("div");
    dots.className="design-carousel-dots master-carousel-dots";
    dots.style.display="flex";
    dots.innerHTML=Array.from({length:total},(_,i)=>`<button class="design-carousel-dot${i===0?" active":""}" data-dot="${i}"></button>`).join("");

    carousel.parentElement.append(controls,dots);

    function render(){
      track.style.transform=`translateX(-${active*100}%)`;
      controls.querySelector(".design-carousel-status").textContent=`التصميم ${active+1} من ${total}`;
      dots.querySelectorAll(".design-carousel-dot").forEach((dot,i)=>dot.classList.toggle("active",i===active));
      window.__prayerActiveDesignIndex=active;
      window.dispatchEvent(new Event("resize"));
    }

    controls.querySelector("[data-prev]").onclick=()=>{active=(active-1+total)%total;render();};
    controls.querySelector("[data-next]").onclick=()=>{active=(active+1)%total;render();};
    dots.querySelectorAll("[data-dot]").forEach(dot=>dot.onclick=()=>{active=Number(dot.dataset.dot)||0;render();});

    let sx=null;
    carousel.addEventListener("touchstart",e=>{if(e.target.closest(".draggable"))return;sx=e.touches[0].clientX;},{passive:true});
    carousel.addEventListener("touchend",e=>{
      if(sx===null)return;
      const dx=e.changedTouches[0].clientX-sx;sx=null;
      if(Math.abs(dx)>45){active=dx<0?Math.min(total-1,active+1):Math.max(0,active-1);render();}
    },{passive:true});

    render();
    return true;
  }

  let tries=0;
  const timer=setInterval(()=>{
    tries++;
    if(init()||tries>40)clearInterval(timer);
  },150);
})();
