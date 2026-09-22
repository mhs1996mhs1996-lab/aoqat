"use strict";
(function(){
  const W=1024,H=1448;
  let active=0,busy=false,firstInstall=true;

  function styles(){
    if(document.getElementById('compactCarouselNavStyles'))return;
    const s=document.createElement('style');s.id='compactCarouselNavStyles';
    s.textContent=`
      .previewBox{min-height:0!important;height:auto!important;padding-bottom:0!important}
      .previewBox .design-carousel{margin-bottom:0!important}
      .previewBox .design-carousel-track{transform:none!important;transition:none!important}
      .previewBox .unified-preview-controls{width:min(100%,360px)!important;min-height:28px!important;height:28px!important;margin:0 auto!important;padding:0!important;display:flex!important;align-items:center!important;justify-content:center!important;gap:6px!important}
      .previewBox .unified-preview-controls .design-carousel-btn{width:28px!important;height:28px!important;min-width:28px!important;min-height:28px!important;margin:0!important;padding:0!important;border-radius:7px!important;font-size:20px!important;line-height:1!important;display:flex!important;align-items:center!important;justify-content:center!important}
      .previewBox .unified-preview-controls .design-carousel-status{min-width:108px!important;margin:0!important;font-size:13px!important;line-height:1!important;text-align:center!important;white-space:nowrap!important}
      .previewBox .unified-preview-dots{height:8px!important;min-height:8px!important;margin:0 auto!important;padding:0!important;display:flex!important;align-items:center!important;justify-content:center!important;gap:4px!important}
      .previewBox .unified-preview-dots .design-carousel-dot{width:7px!important;height:7px!important;min-width:7px!important;min-height:7px!important;margin:0!important;padding:0!important}
      @media(max-width:800px){
        .app{gap:5px!important;padding-top:5px!important}.workspace{margin-bottom:0!important;padding-bottom:0!important}.sidebar{margin-top:0!important;padding-top:0!important}.previewBox{min-height:0!important;height:auto!important;padding-top:4px!important;padding-bottom:0!important;margin-bottom:0!important}.previewBox .design-carousel{margin-bottom:0!important}.previewBox .unified-preview-controls{min-height:25px!important;height:25px!important;margin:0 auto!important;gap:5px!important;padding:0!important}.previewBox .unified-preview-controls .design-carousel-btn{width:25px!important;height:25px!important;min-width:25px!important;min-height:25px!important;border-radius:6px!important;font-size:18px!important}.previewBox .unified-preview-controls .design-carousel-status{min-width:104px!important;font-size:12px!important}.previewBox .unified-preview-dots{height:7px!important;min-height:7px!important;margin:0 auto!important;padding:0!important}.previewBox .unified-preview-dots .design-carousel-dot{width:6px!important;height:6px!important;min-width:6px!important;min-height:6px!important}
      }
    `;document.head.appendChild(s);
  }

  function allSlides(track){return Array.from(track.querySelectorAll(':scope > .design-slide')).filter(slide=>{if(slide.dataset.legacySlide==='true'||slide.querySelector('#design'))return false;if(slide.classList.contains('removed-design-storage')||slide.closest('.removed-design-storage'))return false;if(slide.dataset.designDisabled==='true')return false;return true;});}
  function resize(car){const p=document.querySelector('.previewBox');let scale=1;if(innerWidth<=800&&p){const cs=getComputedStyle(p);const avail=Math.max(220,p.clientWidth-parseFloat(cs.paddingLeft||0)-parseFloat(cs.paddingRight||0)-2);scale=Math.min(1,avail/W);}car.style.height=Math.ceil(H*scale)+'px';}
  function compactParent(car){const parent=car.parentElement;if(!parent)return;parent.style.setProperty('padding-bottom','0','important');parent.style.setProperty('margin-bottom','0','important');parent.style.setProperty('min-height','0','important');parent.style.setProperty('height','auto','important');const next=parent.nextElementSibling;if(next)next.style.setProperty('margin-top','0','important');}

  function install(){
    if(busy)return false;busy=true;
    try{
      styles();const track=document.querySelector('.design-carousel-track'),car=document.querySelector('.design-carousel');if(!track||!car)return false;
      compactParent(car);const slides=allSlides(track);if(!slides.length)return false;const parent=car.parentElement;
      parent.querySelectorAll('.design-carousel-controls,.design-carousel-dots,.night-carousel-controls,.night-carousel-dots,.ornate-carousel-controls,.ornate-carousel-dots,.final-carousel-controls,.final-carousel-dots').forEach(el=>{if(!el.classList.contains('unified-preview-controls')&&!el.classList.contains('unified-preview-dots'))el.remove();});
      let controls=parent.querySelector('.unified-preview-controls'),dots=parent.querySelector('.unified-preview-dots');
      if(!controls){controls=document.createElement('div');controls.className='design-carousel-controls unified-preview-controls';controls.innerHTML='<button class="design-carousel-btn" type="button" data-unified-prev>‹</button><span class="design-carousel-status"></span><button class="design-carousel-btn" type="button" data-unified-next>›</button>';dots=document.createElement('div');dots.className='design-carousel-dots unified-preview-dots';parent.append(controls,dots);}
      dots.innerHTML=slides.map((_,i)=>`<button class="design-carousel-dot" type="button" data-unified-dot="${i}"></button>`).join('');
      if(firstInstall){active=0;firstInstall=false;}else{const oldElement=window.__prayerActiveDesignElement,byElement=oldElement?slides.findIndex(s=>s.firstElementChild===oldElement):-1;if(byElement>=0)active=byElement;else active=Math.max(0,Math.min(active,slides.length-1));}
      function render(){const current=allSlides(track);if(!current.length)return;active=((active%current.length)+current.length)%current.length;Array.from(track.querySelectorAll(':scope > .design-slide')).forEach(slide=>{slide.style.setProperty('display','none','important');slide.hidden=true;slide.setAttribute('aria-hidden','true');});current.forEach((slide,i)=>{if(i===active){slide.style.setProperty('display','flex','important');slide.hidden=false;slide.setAttribute('aria-hidden','false');}});track.style.setProperty('transform','none','important');window.__prayerActiveDesignIndex=active;window.__prayerActiveVisibleIndex=active;window.__prayerActiveDesignElement=current[active]?.firstElementChild||null;controls.querySelector('.design-carousel-status').textContent=`التصميم ${active+1} من ${current.length}`;dots.querySelectorAll('[data-unified-dot]').forEach((b,i)=>b.classList.toggle('active',i===active));resize(car);compactParent(car);window.dispatchEvent(new CustomEvent('prayerDesignChanged',{detail:{index:active,domIndex:active,design:window.__prayerActiveDesignElement}}));}
      controls.querySelector('[data-unified-prev]').onclick=e=>{e.preventDefault();e.stopPropagation();active--;render();};controls.querySelector('[data-unified-next]').onclick=e=>{e.preventDefault();e.stopPropagation();active++;render();};dots.querySelectorAll('[data-unified-dot]').forEach(b=>b.onclick=e=>{e.preventDefault();e.stopPropagation();active=Number(b.dataset.unifiedDot)||0;render();});render();return true;
    }finally{busy=false;}
  }
  function init(){let tries=0;const t=setInterval(()=>{tries++;if(install()||tries>100)clearInterval(t);},120);setTimeout(install,700);setTimeout(install,1600);window.addEventListener('resize',()=>install(),{passive:true});window.addEventListener('prayerDesignVisibilityChanged',()=>{setTimeout(install,0);});}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();