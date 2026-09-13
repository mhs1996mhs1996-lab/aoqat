"use strict";
(function(){
  const CARD_SELECTOR='#designRef .ref-date-card.greg, #designRef .ref-date-card.hijri';

  function orderCard(card,fields){
    fields.map(field=>card.querySelector(`[data-field="${field}"]`)).forEach(el=>{if(el)card.appendChild(el);});
  }

  function fitCard(card){
    if(!card)return;
    // نحافظ على القياس الأصلي كحد أدنى، ونسمح للمربع بالتمدد فقط عند الحاجة.
    card.style.boxSizing='border-box';
    card.style.width='max-content';
    card.style.height='max-content';
    card.style.minWidth='210px';
    card.style.minHeight='165px';
    card.style.maxWidth='330px';
    card.style.padding='14px 20px';
    card.style.overflow='visible';

    const children=Array.from(card.querySelectorAll('[data-field]'));
    children.forEach(el=>{
      el.style.maxWidth='100%';
      el.style.whiteSpace='nowrap';
      el.style.flexShrink='0';
      el.style.lineHeight='1.15';
    });

    // إذا احتاج الخط مساحة إضافية عمودياً نزيد ارتفاع الحاوية تلقائياً.
    requestAnimationFrame(()=>{
      const neededHeight=Math.ceil(children.reduce((sum,el)=>sum+el.getBoundingClientRect().height,0)+28+Math.max(0,children.length-1)*3);
      card.style.minHeight=Math.max(165,neededHeight)+'px';
    });
  }

  function fitAll(){
    document.querySelectorAll(CARD_SELECTOR).forEach(fitCard);
  }

  function apply(){
    const design=document.getElementById('designRef');
    if(!design)return false;
    const greg=design.querySelector('.ref-date-card.greg');
    const hijri=design.querySelector('.ref-date-card.hijri');
    if(greg)orderCard(greg,['gday','gmonth','gyear']);
    if(hijri)orderCard(hijri,['hday','hmonth','hyear']);
    fitAll();
    return true;
  }

  function init(){
    let tries=0;
    const timer=setInterval(()=>{
      tries++;
      if(apply()||tries>50)clearInterval(timer);
    },120);

    // تنسيق الخط العام يطلق هذا الحدث بعد كل تعديل للحجم/الخط/الوزن.
    window.addEventListener('prayerFontChanged',()=>requestAnimationFrame(fitAll));
    window.addEventListener('resize',()=>requestAnimationFrame(fitAll));
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
})();