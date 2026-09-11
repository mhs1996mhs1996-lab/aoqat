"use strict";
(function(){
  function apply(){
    const design=document.getElementById('designRef');
    if(!design)return false;

    const greg=design.querySelector('.ref-date-card.greg');
    const hijri=design.querySelector('.ref-date-card.hijri');

    if(greg){
      const day=greg.querySelector('[data-field="gday"]');
      const month=greg.querySelector('[data-field="gmonth"]');
      const year=greg.querySelector('[data-field="gyear"]');
      [day,month,year].forEach(el=>{if(el)greg.appendChild(el);});
    }

    if(hijri){
      const day=hijri.querySelector('[data-field="hday"]');
      const month=hijri.querySelector('[data-field="hmonth"]');
      const year=hijri.querySelector('[data-field="hyear"]');
      [day,month,year].forEach(el=>{if(el)hijri.appendChild(el);});
    }
    return true;
  }

  function init(){
    let tries=0;
    const timer=setInterval(()=>{
      tries++;
      if(apply()||tries>50)clearInterval(timer);
    },120);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
})();