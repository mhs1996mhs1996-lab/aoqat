"use strict";
(function(){
 const W=1024,H=1448,TOTAL=2; let active=0;
 function init(){
  let tries=0;
  const timer=setInterval(()=>{
   tries++;
   const track=document.querySelector('.design-carousel-track');
   const car=document.querySelector('.design-carousel');
   if(!track||!car){if(tries>80)clearInterval(timer);return;}
   let slides=Array.from(track.querySelectorAll(':scope > .design-slide'));
   if(slides.length<6)return;
   clearInterval(timer);

   // بعد الترتيب السابق لدينا 6 تصاميم. المطلوب الآن حذف 2 و4 و5 و6 والإبقاء على 1 و3 فقط.
   const keep=[slides[0],slides[2]].filter(Boolean);
   slides.forEach(slide=>{if(!keep.includes(slide))slide.remove();});
   keep.forEach(slide=>track.appendChild(slide));

   document.querySelectorAll('.design-carousel-controls,.design-carousel-dots').forEach(el=>el.style.display='none');
   const wrap=car.parentElement;
   const controls=document.createElement('div');
   const dots=document.createElement('div');
   controls.className='design-carousel-controls final-two-carousel-controls';
   dots.className='design-carousel-dots final-two-carousel-dots';
   controls.style.display='flex';
   dots.style.display='flex';
   controls.innerHTML=`<button class="design-carousel-btn" data-prev>‹</button><span class="design-carousel-status">التصميم 1 من ${TOTAL}</span><button class="design-carousel-btn" data-next>›</button>`;
   dots.innerHTML=Array.from({length:TOTAL},(_,i)=>`<button class="design-carousel-dot${i?'':' active'}" data-dot="${i}"></button>`).join('');
   wrap.append(controls,dots);

   const render=()=>{
    active=Math.max(0,Math.min(active,TOTAL-1));
    window.__prayerActiveDesignIndex=active;
    track.style.transform=`translateX(-${active*100}%)`;
    controls.querySelector('.design-carousel-status').textContent=`التصميم ${active+1} من ${TOTAL}`;
    dots.querySelectorAll('[data-dot]').forEach((el,i)=>el.classList.toggle('active',i===active));
    const p=document.querySelector('.previewBox');
    let scale=1;
    if(innerWidth<=800&&p)scale=Math.min(1,Math.max(220,p.clientWidth-14)/W);
    car.style.height=Math.ceil(H*scale)+'px';
   };
   controls.querySelector('[data-prev]').onclick=()=>{active=(active-1+TOTAL)%TOTAL;render();};
   controls.querySelector('[data-next]').onclick=()=>{active=(active+1)%TOTAL;render();};
   dots.querySelectorAll('[data-dot]').forEach(el=>el.onclick=()=>{active=Number(el.dataset.dot)||0;render();});
   window.addEventListener('resize',render,{passive:true});
   render();
  },150);
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();