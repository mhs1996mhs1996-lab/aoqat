"use strict";
(function(){
  /*
    ملف توافق فقط.
    لا نحذف أو نعيد ترتيب أي تصميم من شريط المعاينة.
    كانت النسخة السابقة تنتظر وصول الشرائح إلى 6 ثم تحذف معظمها،
    وهذا تسبب باختفاء التصميم الخامس عند تغيّر توقيت تحميل ملفات المعاينة.
  */
  function keepAllDesigns(){
    const track=document.querySelector('.design-carousel-track');
    if(!track)return;
    Array.from(track.querySelectorAll(':scope > .design-slide')).forEach(slide=>{
      if(slide.dataset.legacySlide==='true')return;
      if(slide.style.display==='none' && !slide.querySelector('#design')) slide.style.removeProperty('display');
    });
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',keepAllDesigns,{once:true});
  else keepAllDesigns();
  window.addEventListener('load',()=>{keepAllDesigns();setTimeout(keepAllDesigns,500);setTimeout(keepAllDesigns,1500);},{once:true});
})();