"use strict";
(function(){
  const WIDTH=1024,HEIGHT=1448;
  let active=0;
  let ready=false;

  function visibleSlides(){
    const track=document.querySelector('.design-carousel-track');
    if(!track)return [];
    return Array.from(track.querySelectorAll(':scope > .design-slide')).filter(slide=>{
      if(slide.dataset.legacySlide==='true')return false;
      if(slide.querySelector('#design'))return false;
      return true;
    });
  }

  function ensureSlidesVisible(){
    visibleSlides().forEach(slide=>{
      slide.style.removeProperty('display');
      slide.style.display='flex';
      slide.style.flex='0 0 100%';
      slide.style.width='100%';
    });
  }

  function resize(){
    const car=document.querySelector('.design-carousel'),preview=document.querySelector('.previewBox');
    if(!car||!preview)return;
    if(innerWidth>800){car.style.height=HEIGHT+'px';return;}
    const cs=getComputedStyle(preview);
    const pad=(parseFloat(cs.paddingLeft)||0)+(parseFloat(cs.paddingRight)||0);
    const avail=Math.max(220,preview.clientWidth-pad-2);
    const scale=Math.min(1,avail/WIDTH);
    car.style.height=Math.ceil(HEIGHT*scale)+'px';
  }

  function render(){
    const track=document.querySelector('.design-carousel-track');
    const slides=visibleSlides();
    if(!track||!slides.length)return;
    ensureSlidesVisible();
    active=Math.max(0,Math.min(active,slides.length-1));
    window.__prayerActiveDesignIndex=active;
    track.style.transform=`translateX(-${active*100}%)`;
    const controls=document.getElementById('stableCarouselControls');
    const dots=document.getElementById('stableCarouselDots');
    if(controls){
      const status=controls.querySelector('.design-carousel-status');
      if(status)status.textContent=`التصميم ${active+1} من ${slides.length}`;
    }
    if(dots){
      dots.querySelectorAll('[data-stable-dot]').forEach((el,i)=>el.classList.toggle('active',i===active));
    }
    resize();
    window.dispatchEvent(new CustomEvent('prayerDesignChanged',{detail:{index:active,design:slides[active]?.firstElementChild||null}}));
  }

  function buildControls(){
    const car=document.querySelector('.design-carousel');
    const track=document.querySelector('.design-carousel-track');
    if(!car||!track)return false;
    const slides=visibleSlides();
    if(slides.length<5)return false;

    document.querySelectorAll('.design-carousel-controls,.design-carousel-dots').forEach(el=>{
      if(el.id!=='stableCarouselControls'&&el.id!=='stableCarouselDots')el.style.display='none';
    });

    let controls=document.getElementById('stableCarouselControls');
    let dots=document.getElementById('stableCarouselDots');
    if(!controls){
      controls=document.createElement('div');
      controls.id='stableCarouselControls';
      controls.className='design-carousel-controls stable-carousel-controls';
      controls.innerHTML='<button class="design-carousel-btn" type="button" data-stable-prev>‹</button><span class="design-carousel-status"></span><button class="design-carousel-btn" type="button" data-stable-next>›</button>';
      car.parentElement.appendChild(controls);
      controls.querySelector('[data-stable-prev]').addEventListener('click',()=>{active=(active-1+visibleSlides().length)%visibleSlides().length;render();});
      controls.querySelector('[data-stable-next]').addEventListener('click',()=>{active=(active+1)%visibleSlides().length;render();});
    }
    if(!dots){
      dots=document.createElement('div');
      dots.id='stableCarouselDots';
      dots.className='design-carousel-dots stable-carousel-dots';
      car.parentElement.appendChild(dots);
    }
    dots.innerHTML=slides.map((_,i)=>`<button class="design-carousel-dot${i===active?' active':''}" type="button" data-stable-dot="${i}"></button>`).join('');
    dots.querySelectorAll('[data-stable-dot]').forEach(btn=>btn.addEventListener('click',()=>{active=Number(btn.dataset.stableDot)||0;render();}));

    if(!car.dataset.stableSwipeBound){
      car.dataset.stableSwipeBound='1';
      let sx=null;
      car.addEventListener('touchstart',e=>{
        if(e.target.closest('.draggable,.drag,[data-preview-movable="1"]'))return;
        sx=e.touches?.[0]?.clientX??null;
        if(sx!==null){e.stopPropagation();e.stopImmediatePropagation();}
      },true);
      car.addEventListener('touchend',e=>{
        if(sx===null)return;
        const ex=e.changedTouches?.[0]?.clientX??sx;
        const dx=ex-sx;sx=null;
        e.stopPropagation();e.stopImmediatePropagation();
        if(Math.abs(dx)>45){active=dx<0?Math.min(visibleSlides().length-1,active+1):Math.max(0,active-1);render();}
      },true);
    }

    ready=true;
    render();
    return true;
  }

  function repair(){
    const slides=visibleSlides();
    if(!slides.length)return;
    ensureSlidesVisible();
    const fourth=document.getElementById('designRef')?.closest('.design-slide');
    if(fourth){
      fourth.style.removeProperty('display');
      fourth.style.display='flex';
      fourth.hidden=false;
    }
    if(ready){
      const max=Math.max(0,slides.length-1);
      if(active>max)active=max;
      render();
    }
  }

  function init(){
    let tries=0;
    const timer=setInterval(()=>{
      tries++;
      repair();
      if(buildControls()||tries>60)clearInterval(timer);
    },150);
    window.addEventListener('resize',resize,{passive:true});
    const obs=new MutationObserver(()=>{repair();if(ready)buildControls();});
    obs.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['style','class','hidden']});
  }

  window.PrayerCarousel={
    getIndex:()=>active,
    getDesign:()=>visibleSlides()[active]?.firstElementChild||null,
    goTo:index=>{active=Number(index)||0;render();}
  };

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();