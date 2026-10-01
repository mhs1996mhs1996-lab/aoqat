"use strict";
/* تمديد الحاويات النصية تلقائياً عند تغيير تنسيق الخط، بدون تغيير شكلها الأصلي كحد أدنى. */
(function(){
  const CARD_SELECTORS=[
    '.ref-date-card','.sd4-date-card','.sd3-date-card','.sd2-date-card',
    '.date-card','.hijri-card','.gregorian-card','[data-date-card]',
    '.nd-date-card','.nf-date-card','.or-date-card'
  ].join(',');
  const TEXT_SELECTORS='[data-field],[data-f],.ref-date-num,.ref-date-month,.ref-date-year,.sd4-date-number,.sd4-date-month,.sd4-date-year,.sd3-date-number,.sd3-date-month,.sd3-date-year,.sd2-date-number,.sd2-date-month,.sd2-date-year';

  function rememberBase(card){
    if(card.dataset.adaptiveBoxReady==='1')return;
    const s=getComputedStyle(card);
    card.dataset.adaptiveBoxReady='1';
    card.dataset.adaptiveMinW=String(card.offsetWidth||parseFloat(s.width)||0);
    card.dataset.adaptiveMinH=String(card.offsetHeight||parseFloat(s.height)||0);
    card.style.setProperty('box-sizing','border-box');
  }
  function fit(card){
    if(!card||!card.offsetWidth)return;rememberBase(card);
    const minW=parseFloat(card.dataset.adaptiveMinW)||0,minH=parseFloat(card.dataset.adaptiveMinH)||0;
    const items=Array.from(card.querySelectorAll(TEXT_SELECTORS)).filter(el=>(el.textContent||'').trim());
    if(!items.length)return;
    const cs=getComputedStyle(card),px=(parseFloat(cs.paddingLeft)||0)+(parseFloat(cs.paddingRight)||0),py=(parseFloat(cs.paddingTop)||0)+(parseFloat(cs.paddingBottom)||0);
    let widest=0,total=0;
    items.forEach(el=>{
      el.style.setProperty('white-space','nowrap','important');
      widest=Math.max(widest,el.scrollWidth);total+=el.offsetHeight;
    });
    const gap=Math.max(0,items.length-1)*(parseFloat(cs.rowGap)||0);
    const borderX=(parseFloat(cs.borderLeftWidth)||0)+(parseFloat(cs.borderRightWidth)||0),borderY=(parseFloat(cs.borderTopWidth)||0)+(parseFloat(cs.borderBottomWidth)||0);
    const needW=Math.ceil(widest+px+borderX),needH=Math.ceil(total+py+gap+borderY);
    card.style.setProperty('width',Math.max(minW,needW)+'px','important');
    card.style.setProperty('min-width',Math.max(minW,needW)+'px','important');
    card.style.setProperty('height',Math.max(minH,needH)+'px','important');
    card.style.setProperty('min-height',Math.max(minH,needH)+'px','important');
    card.style.setProperty('overflow','visible','important');
  }
  function fitRoot(root){(root||document).querySelectorAll(CARD_SELECTORS).forEach(fit);}
  function fitAll(){document.querySelectorAll(CARD_SELECTORS).forEach(fit);}
  function schedule(root){requestAnimationFrame(()=>requestAnimationFrame(()=>fitRoot(root||document)));}
  function init(){
    fitAll();
    window.addEventListener('prayerFontChanged',e=>schedule(e.detail?.design||window.PrayerFontCore?.activeRoot?.()));
    window.addEventListener('prayerDesignChanged',e=>schedule(e.detail?.design));
    window.addEventListener('resize',()=>schedule(document));
    new MutationObserver(m=>{
      if(m.some(x=>x.type==='childList'))schedule(document);
    }).observe(document.body,{subtree:true,childList:true});
  }
  function restoreStyle(el,style){
    if(style)el.setAttribute('style',style);else el.removeAttribute('style');
    if(el.matches('.ref-date-card')){
      // These dimensions came from the old auto-fit routines, not user controls.
      // Recalculate from the original card and the preserved font/position.
      ['width','height','min-width','min-height','max-width','max-height','padding','overflow'].forEach(p=>el.style.removeProperty(p));
      delete el.dataset.adaptiveBoxReady;
    }
  }
  window.PrayerAdaptiveBoxes={fit,fitRoot,fitAll,restoreStyle};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();