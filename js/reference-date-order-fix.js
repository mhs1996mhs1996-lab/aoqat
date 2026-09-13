"use strict";
(function(){
  const CARD_SELECTOR='#designRef .ref-date-card.greg, #designRef .ref-date-card.hijri';
  const DATE_ROLES={
    '#gregorianDayP':'gday','#gregorianMonthP':'gmonth','#gregorianYearP':'gyear',
    '#hijriDayP':'hday','#hijriMonthP':'hmonth','#hijriYearP':'hyear'
  };

  function orderCard(card,fields){
    fields.map(field=>card.querySelector(`[data-field="${field}"]`)).forEach(el=>{if(el)card.appendChild(el);});
  }

  function firstDesignActive(){
    /* حالة الكاروسيل الظاهرة هي المرجع الأدق. المتغير القديم قد يبقى على تصميم سابق. */
    const status=document.querySelector('.final-carousel-controls .design-carousel-status')?.textContent||document.querySelector('.design-carousel-status')?.textContent||'';
    if(/التصميم\s*1\s*من\s*4/.test(status))return true;
    if(/التصميم\s*[234]\s*من\s*4/.test(status))return false;
    const active=window.__prayerActiveDesignElement;
    return !!active&&active.id==='designRef';
  }

  function selectedDateTarget(){
    if(!firstDesignActive())return null;
    const value=document.getElementById('elementSelect')?.value||'';
    const field=DATE_ROLES[value];
    return field?document.querySelector(`#designRef [data-field="${field}"]`):null;
  }

  function fitCard(card){
    if(!card)return;
    card.style.boxSizing='border-box';
    card.style.width='max-content';
    card.style.height='max-content';
    card.style.minWidth='210px';
    card.style.minHeight='165px';
    card.style.maxWidth='none';
    card.style.padding='14px 20px';
    card.style.overflow='visible';
    const children=Array.from(card.querySelectorAll('[data-field]'));
    children.forEach(el=>{el.style.maxWidth='none';el.style.whiteSpace='nowrap';el.style.flexShrink='0';el.style.lineHeight='1.15';});
    requestAnimationFrame(()=>{
      const widest=Math.max(0,...children.map(el=>el.scrollWidth));
      const neededWidth=Math.ceil(widest+40);
      const neededHeight=Math.ceil(children.reduce((sum,el)=>sum+el.getBoundingClientRect().height,0)+28+Math.max(0,children.length-1)*3);
      card.style.minWidth=Math.max(210,neededWidth)+'px';
      card.style.minHeight=Math.max(165,neededHeight)+'px';
    });
  }

  function fitAll(){document.querySelectorAll(CARD_SELECTOR).forEach(fitCard);}

  function forceDateFontSize(){
    const target=selectedDateTarget();
    const size=document.getElementById('fontSize');
    if(!target||!size)return;
    const n=parseFloat(size.value);
    if(!Number.isFinite(n)||n<=0)return;
    target.style.setProperty('font-size',`${n}px`,'important');
    requestAnimationFrame(()=>fitCard(target.closest('.ref-date-card')));
    window.dispatchEvent(new CustomEvent('prayerFontChanged',{detail:{design:document.getElementById('designRef'),target}}));
  }

  function apply(){
    const design=document.getElementById('designRef');if(!design)return false;
    const greg=design.querySelector('.ref-date-card.greg'),hijri=design.querySelector('.ref-date-card.hijri');
    if(greg)orderCard(greg,['gday','gmonth','gyear']);
    if(hijri)orderCard(hijri,['hday','hmonth','hyear']);
    fitAll();return true;
  }

  function bindSize(){
    const size=document.getElementById('fontSize');
    if(!size||size.dataset.refDateSizeBound==='1')return;
    size.dataset.refDateSizeBound='1';
    ['input','change'].forEach(ev=>size.addEventListener(ev,()=>requestAnimationFrame(forceDateFontSize)));
  }

  function init(){
    let tries=0;
    const timer=setInterval(()=>{tries++;apply();bindSize();if((document.getElementById('designRef')&&document.getElementById('fontSize'))||tries>50)clearInterval(timer);},120);
    bindSize();
    window.addEventListener('prayerFontChanged',()=>requestAnimationFrame(fitAll));
    window.addEventListener('resize',()=>requestAnimationFrame(fitAll));
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();