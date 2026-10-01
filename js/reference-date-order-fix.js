"use strict";
(function(){
  const CARD_SELECTOR='#designRef .ref-date-card.greg, #designRef .ref-date-card.hijri';
  const DATE_ROLES={
    '#gregorianDayP':'gday','#gregorianMonthP':'gmonth','#gregorianYearP':'gyear',
    '#hijriDayP':'hday','#hijriMonthP':'hmonth','#hijriYearP':'hyear'
  };

  function orderCard(card,fields){
    const wanted=fields.map(field=>card.querySelector(`[data-field="${field}"]`)).filter(Boolean);
    if(wanted.every((el,i)=>card.children[i]===el))return;
    wanted.forEach(el=>card.appendChild(el));
  }

  function firstDesignActive(){
    return window.__prayerActiveDesignElement?.id==='designRef';
  }

  function selectedDateTarget(){
    if(!firstDesignActive())return null;
    const value=document.getElementById('elementSelect')?.value||'';
    const field=DATE_ROLES[value];
    return field?document.querySelector(`#designRef [data-field="${field}"]`):null;
  }

  function fitCard(card){
    if(card)window.PrayerAdaptiveBoxes?.fit(card);
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