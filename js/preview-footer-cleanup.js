"use strict";

(function(){
  function cleanUpperFooterCopies(){
    const designs=document.querySelectorAll('.previewBox #design, .previewBox #design2, .previewBox #design3, .previewBox #design4, .previewBox #designRef, .previewBox #designNight');
    designs.forEach(design=>{
      design.querySelectorAll('[data-field="footer"]').forEach(el=>{
        if(el.className && String(el.className).toLowerCase().includes('footer')) return;
        el.remove();
      });

      design.querySelectorAll('.sd2-location').forEach(el=>el.remove());
    });
  }

  function init(){
    cleanUpperFooterCopies();

    const preview=document.querySelector('.previewBox');
    if(preview){
      const observer=new MutationObserver(cleanUpperFooterCopies);
      observer.observe(preview,{childList:true,subtree:true});
    }

    document.getElementById('footerText')?.addEventListener('input',()=>setTimeout(cleanUpperFooterCopies,0));
    document.addEventListener('prayerPreviewDateChanged',()=>setTimeout(cleanUpperFooterCopies,0));

    setTimeout(cleanUpperFooterCopies,1200);
    setTimeout(cleanUpperFooterCopies,2500);
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
})();
