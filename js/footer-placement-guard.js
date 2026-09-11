"use strict";
(function(){
  const FOOTER_TEXT="حسب التوقيت المحلي لمدينة الحويجة وضواحيها";
  const DESIGN_SELECTOR='.design-carousel-track > .design-slide > *, #design';
  const CANDIDATE_SELECTOR='[data-field="footer"],#footerP,.footer,.sd2-footer,.sd2-location,.sd3-footer-card,.sd4-footer,.ref-footer,.nd-footer,.nf-footer';

  function isDesign(el){
    if(!el||el.nodeType!==1)return false;
    return !!(el.matches?.('#design,.second-design,.third-design,.fourth-design,.reference-design,.night-design,[data-design-id]')||el.closest?.('.design-slide'));
  }

  function normalizeDesign(design){
    if(!isDesign(design))return;
    const candidates=Array.from(design.querySelectorAll(CANDIDATE_SELECTOR)).filter((el,i,a)=>a.indexOf(el)===i);
    if(!candidates.length)return;

    // نحتفظ بالنص السفلي الأدنى فقط، ونخفي أي نسخة مكررة تظهر أعلى التصميم.
    let keeper=candidates[0],best=-Infinity;
    candidates.forEach(el=>{
      const top=el.offsetTop+(el.offsetHeight||0)/2;
      if(top>best){best=top;keeper=el;}
    });

    candidates.forEach(el=>{
      if(el===keeper){
        el.style.removeProperty('display');
        el.removeAttribute('aria-hidden');
        if(el.matches('[data-field="footer"]')||/footer/i.test(el.className||'')||el.id==='footerP'){
          if(!String(el.textContent||'').trim())el.textContent=document.getElementById('footerText')?.value||FOOTER_TEXT;
        }
      }else{
        el.style.setProperty('display','none','important');
        el.setAttribute('aria-hidden','true');
      }
    });
  }

  function normalizeAll(){
    const designs=[];
    document.querySelectorAll(DESIGN_SELECTOR).forEach(el=>{
      const design=el.closest('.design-slide')?.firstElementChild||el;
      if(design&&!designs.includes(design))designs.push(design);
    });
    designs.forEach(normalizeDesign);
  }

  function init(){
    normalizeAll();
    setTimeout(normalizeAll,500);
    setTimeout(normalizeAll,1600);
    const root=document.querySelector('.previewBox')||document.body;
    new MutationObserver(()=>requestAnimationFrame(normalizeAll)).observe(root,{childList:true,subtree:true});
    document.getElementById('footerText')?.addEventListener('input',()=>setTimeout(normalizeAll,0));
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();