"use strict";
(function(){
  const STORE_KEY="prayerDesignerFullPreviewStateV3";
  const MOVE_ATTR="data-preview-movable";
  let drag=null;

  function injectStyles(){
    if(document.getElementById("universalPreviewEditorStyles"))return;
    const s=document.createElement("style");
    s.id="universalPreviewEditorStyles";
    s.textContent=`
      /* ترتيب مواقيت الصلاة في التصميم الرابع فقط: الرسم يمين، الاسم وسط، الوقت يسار */
      .reference-design .ref-prayer-row{
        display:grid!important;
        grid-template-columns:150px minmax(0,1fr) 76px!important;
        grid-template-areas:"time label icon"!important;
        direction:ltr!important;
        column-gap:22px!important;
        padding:0 24px!important;
        align-items:center!important;
      }
      .reference-design .ref-prayer-time{grid-area:time!important;text-align:left!important;direction:ltr!important;margin:0!important}
      .reference-design .ref-prayer-label{grid-area:label!important;text-align:center!important;direction:rtl!important;margin:0!important;white-space:nowrap!important}
      .reference-design .ref-prayer-icon{grid-area:icon!important;justify-self:end!important;margin:0!important}

      body.manual-edit-on .previewBox [${MOVE_ATTR}="1"]{cursor:move!important;touch-action:none!important;user-select:none!important;pointer-events:auto!important}
      body.manual-edit-off .previewBox [${MOVE_ATTR}="1"]{cursor:default!important;touch-action:auto!important;pointer-events:none!important}
      .preview-moving{outline:2px dashed rgba(235,181,68,.95)!important;outline-offset:3px!important;z-index:9999!important}
    `;
    document.head.appendChild(s);
  }

  function meaningfulLeaf(el){
    if(!el||el.closest('.removed-design-storage'))return false;
    if(el.matches('.ref-sky,.ref-water,.ref-mosque,.ref-minaret,.ref-arch,.sd4-sky,.border,.ornament'))return false;
    const text=(el.textContent||'').trim();
    return !!(text||el.hasAttribute('data-field')||el.hasAttribute('data-f'));
  }

  function markMovables(){
    const root=document.querySelector('.previewBox');
    if(!root)return;

    /* العناصر الموجودة أصلاً كعناصر قابلة للسحب */
    root.querySelectorAll('.draggable,.drag').forEach(el=>el.setAttribute(MOVE_ATTR,'1'));

    /* كل جزء نصي/رقمي داخل التصميم يكون قابلاً للتحريك منفرداً */
    root.querySelectorAll('[data-field],[data-f],.prayer-row span,.prayer-row b,.sd2-prayer-row span,.sd2-prayer-row b,.sd3-prayer-row span,.sd3-prayer-row b,.sd4-prayer-row span,.sd4-prayer-row b,.nd-prayer-row span,.nd-prayer-row b,.ref-prayer-row span,.ref-prayer-row b,.nf-row span,.nf-row b,.sd2-date-card > *, .sd4-date-card > *, .ref-date-card > *').forEach(el=>{
      if(meaningfulLeaf(el))el.setAttribute(MOVE_ATTR,'1');
    });

    /* في التصميم الرابع: الرسم والاسم والتوقيت تتحرك كل واحدة لوحدها */
    root.querySelectorAll('.reference-design .ref-prayer-row').forEach(row=>{
      row.removeAttribute(MOVE_ATTR);
      row.classList.remove('draggable','drag');
      row.querySelectorAll('.ref-prayer-icon,.ref-prayer-label,.ref-prayer-time').forEach(el=>{
        el.setAttribute(MOVE_ATTR,'1');
        el.classList.add('draggable');
      });
    });

    assignKeys();
  }

  function designKey(design,index){
    return design.id||Array.from(design.classList).find(c=>/design|^sd|^nd|^nf|reference/.test(c))||`design-${index}`;
  }

  function assignKeys(){
    const designs=Array.from(document.querySelectorAll('.previewBox .design-slide > *, .previewBox > #design'));
    designs.forEach((design,di)=>{
      const dkey=designKey(design,di);
      const items=Array.from(design.querySelectorAll(`[${MOVE_ATTR}="1"]`));
      items.forEach((el,ei)=>{
        if(!el.dataset.previewSaveKey){
          const semantic=el.getAttribute('data-field')||el.getAttribute('data-f')||el.id||Array.from(el.classList).filter(c=>c!=='draggable'&&c!=='drag').slice(0,2).join('.');
          el.dataset.previewSaveKey=`${dkey}::${semantic||'item'}::${ei}`;
        }
      });
    });
  }

  function getScale(el){
    const design=el.closest('.design,.second-design,.third-design,.fourth-design,.reference-design,.night-design,.ornate-design,[id^="design"]')||el.closest('.design-slide')?.firstElementChild;
    if(!design)return 1;
    const rect=design.getBoundingClientRect();
    const logical=design.offsetWidth||1024;
    return rect.width?rect.width/logical:1;
  }

  function startDrag(e){
    if(!document.body.classList.contains('manual-edit-on'))return;
    const target=e.target.closest?.(`[${MOVE_ATTR}="1"]`);
    if(!target||!target.closest('.previewBox'))return;
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    const scale=getScale(target)||1;
    const x=Number(target.dataset.previewX||0),y=Number(target.dataset.previewY||0);
    drag={el:target,id:e.pointerId,startX:e.clientX,startY:e.clientY,baseX:x,baseY:y,scale};
    target.classList.add('preview-moving');
    try{target.setPointerCapture(e.pointerId)}catch(_){ }
  }

  function moveDrag(e){
    if(!drag||e.pointerId!==drag.id)return;
    e.preventDefault();
    const dx=(e.clientX-drag.startX)/drag.scale,dy=(e.clientY-drag.startY)/drag.scale;
    const x=Math.round(drag.baseX+dx),y=Math.round(drag.baseY+dy);
    drag.el.dataset.previewX=String(x);drag.el.dataset.previewY=String(y);
    drag.el.style.setProperty('--preview-move-x',`${x}px`);
    drag.el.style.setProperty('--preview-move-y',`${y}px`);
    drag.el.style.transform=`translate(${x}px, ${y}px)`;
  }

  function endDrag(e){
    if(!drag||e.pointerId!==drag.id)return;
    drag.el.classList.remove('preview-moving');
    try{drag.el.releasePointerCapture(e.pointerId)}catch(_){ }
    drag=null;
  }

  function captureState(){
    assignKeys();
    const out={version:3,items:{}};
    document.querySelectorAll(`.previewBox [${MOVE_ATTR}="1"]`).forEach(el=>{
      const key=el.dataset.previewSaveKey;if(!key)return;
      out.items[key]={
        style:el.getAttribute('style')||'',
        x:el.dataset.previewX||'',
        y:el.dataset.previewY||'',
        dataX:el.dataset.x||'',
        dataY:el.dataset.y||''
      };
    });
    return out;
  }

  function applyState(state){
    if(!state?.items)return;
    assignKeys();
    document.querySelectorAll(`.previewBox [${MOVE_ATTR}="1"]`).forEach(el=>{
      const saved=state.items[el.dataset.previewSaveKey];if(!saved)return;
      if(saved.style)el.setAttribute('style',saved.style);
      else el.removeAttribute('style');
      if(saved.x){el.dataset.previewX=saved.x;el.style.setProperty('--preview-move-x',`${saved.x}px`);}else delete el.dataset.previewX;
      if(saved.y){el.dataset.previewY=saved.y;el.style.setProperty('--preview-move-y',`${saved.y}px`);}else delete el.dataset.previewY;
      if(saved.dataX)el.dataset.x=saved.dataX;else delete el.dataset.x;
      if(saved.dataY)el.dataset.y=saved.dataY;else delete el.dataset.y;
    });
  }

  function saveNow(){
    try{localStorage.setItem(STORE_KEY,JSON.stringify(captureState()));}catch(error){console.error('تعذر حفظ تعديلات المعاينة',error);}
  }

  function restoreNow(){
    try{const raw=localStorage.getItem(STORE_KEY);if(raw)applyState(JSON.parse(raw));}catch(error){console.error('تعذر استعادة تعديلات المعاينة',error);}
  }

  function bindSave(){
    const btn=document.getElementById('saveDesignAdjustments');
    if(!btn||btn.dataset.fullPreviewSaveBound==='1')return false;
    btn.dataset.fullPreviewSaveBound='1';
    btn.addEventListener('click',()=>{
      markMovables();
      saveNow();
    },true);
    return true;
  }

  function init(){
    injectStyles();
    let tries=0;
    const timer=setInterval(()=>{
      tries++;
      if(document.querySelector('.previewBox .design-carousel-track')||document.querySelector('.previewBox #design')){
        markMovables();
        restoreNow();
        bindSave();
        setTimeout(()=>{markMovables();restoreNow();bindSave();},700);
        setTimeout(()=>{markMovables();restoreNow();bindSave();},1800);
        if(tries>12)clearInterval(timer);
      }
      if(tries>40)clearInterval(timer);
    },150);

    document.addEventListener('pointerdown',startDrag,true);
    document.addEventListener('pointermove',moveDrag,true);
    document.addEventListener('pointerup',endDrag,true);
    document.addEventListener('pointercancel',endDrag,true);

    const obs=new MutationObserver(()=>{markMovables();bindSave();});
    obs.observe(document.body,{childList:true,subtree:true});
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();