"use strict";
(function(){
  const STORE_KEY="prayerDesignerUniversalSavedStateV2";
  const HISTORY_LIMIT=40;
  let history=[];
  let lastState="";
  let restoring=false;
  let ready=false;

  function slides(){return Array.from(document.querySelectorAll('.design-carousel-track > .design-slide'));}
  function editableIn(slide){
    return Array.from(slide.querySelectorAll('[style],[data-x],[data-y],.draggable,.drag,.quran,.weekday,.hijri-month,.gregorian-month,.hijri-year,.gregorian-year,.prayer-row,.footer,.nf-title,.nf-sub,.nf-day,.nf-date,.nf-row,.nf-footer'));
  }
  function identity(el,slide){
    const classes=Array.from(el.classList).filter(c=>!['draggable','drag','dragging','preview-moving'].includes(c)).sort().join('.');
    const field=el.dataset.field||el.dataset.f||'';
    const card=el.closest('.greg,.hijri');
    const row=el.closest('[data-prayer-row],.ref-prayer-row,.or-row');
    const prayer=row?.dataset.prayerRow||row?.querySelector('[data-field]')?.dataset.field||'';
    return el.id?'id:'+el.id:[el.tagName,classes,field,card?.classList.contains('greg')?'greg':card?'hijri':'',prayer].join('|');
  }
  function snapshot(){
    return JSON.stringify(slides().map((slide,si)=>({
      si,
      designId:slide.firstElementChild?.id||'',
      items:editableIn(slide).map((el,ei)=>({
        ei,
        key:identity(el,slide),
        id:el.id||"",
        cls:el.className||"",
        style:el.getAttribute('style')||"",
        x:el.dataset.x??null,
        y:el.dataset.y??null
      }))
    })));
  }
  function applyState(raw){
    if(!raw)return;
    let state;
    try{state=typeof raw==='string'?JSON.parse(raw):raw;}catch(_){return;}
    restoring=true;
    const currentSlides=slides();
    if(!Array.isArray(state)){restoring=false;return;}
    state.forEach(s=>{
      let slide=s.designId?currentSlides.find(x=>x.firstElementChild?.id===s.designId):null;
      if(!slide&&!s.designId){
        // Older records identify their root in the first item. Never attach a
        // removed design's styles to the slide that later occupies its index.
        const rootId=s.items?.find(item=>item.id&&document.getElementById(item.id)?.closest('.design-slide')?.firstElementChild?.id===item.id)?.id;
        if(rootId)slide=currentSlides.find(x=>x.firstElementChild?.id===rootId);
        if(!slide){const candidate=currentSlides[s.si];const root=candidate?.firstElementChild;
          if(root&&s.items?.some(item=>item.cls&&String(root.className)===item.cls))slide=candidate;}
      }
      if(!slide)return;
      const els=editableIn(slide);
      s.items.forEach(item=>{
        let el=null;
        if(item.id)el=slide.querySelector('#'+CSS.escape(item.id));
        if(!el&&item.key){const matches=Array.from(slide.querySelectorAll('*')).filter(x=>identity(x,slide)===item.key);if(matches.length===1)el=matches[0];}
        if(!el&&!item.key&&item.cls){
          const matches=Array.from(slide.querySelectorAll('*')).filter(x=>String(x.className)===item.cls);
          if(matches.length===1)el=matches[0];
          else if(matches.includes(els[item.ei]))el=els[item.ei];
        }
        if(!el)return;
        if(window.PrayerAdaptiveBoxes)window.PrayerAdaptiveBoxes.restoreStyle(el,item.style);else {if(item.style)el.setAttribute('style',item.style);else el.removeAttribute('style');}
        if(item.x===null)delete el.dataset.x;else el.dataset.x=String(item.x);
        if(item.y===null)delete el.dataset.y;else el.dataset.y=String(item.y);
      });
    });
    requestAnimationFrame(()=>{window.PrayerAdaptiveBoxes?.fitAll();restoring=false;lastState=snapshot();});
  }
  function ensureUndoButton(){
    let btn=document.getElementById('undoDesignChange');
    if(btn)return btn;
    const grid=document.querySelector('#backgroundDesignTools .bg-tools-grid');
    if(!grid)return null;
    btn=document.createElement('button');
    btn.id='undoDesignChange';
    btn.type='button';
    btn.textContent='↶ الرجوع إلى الوراء';
    btn.style.cssText='display:none;border:0;border-radius:8px;padding:10px 14px;font-size:14px;font-weight:700;color:#fff;background:#8b5d1e;cursor:pointer;width:100%';
    grid.appendChild(btn);
    btn.addEventListener('click',()=>{
      if(!history.length)return;
      const prev=history.pop();
      applyState(prev);
      updateUndo();
    });
    return btn;
  }
  function updateUndo(){const b=ensureUndoButton();if(b)b.style.display=history.length?'block':'none';}
  function recordBeforeChange(){
    if(restoring||!ready)return;
    const now=snapshot();
    if(!lastState){lastState=now;return;}
    if(now!==lastState){
      history.push(lastState);
      if(history.length>HISTORY_LIMIT)history.shift();
      lastState=now;
      updateUndo();
    }
  }
  function commitCurrent(){if(!restoring)lastState=snapshot();}
  function watchUserChanges(){
    const controls=['fontFamily','fontSize','fontWeight','fontColor','textAlign','textShadow'];
    controls.forEach(id=>{
      const el=document.getElementById(id);if(!el)return;
      ['mousedown','touchstart','focus'].forEach(ev=>el.addEventListener(ev,recordBeforeChange,{passive:true}));
      ['input','change'].forEach(ev=>el.addEventListener(ev,()=>setTimeout(commitCurrent,0)));
    });
    document.addEventListener('mousedown',e=>{if(e.target.closest('.draggable,.drag'))recordBeforeChange();},true);
    document.addEventListener('touchstart',e=>{if(e.target.closest('.draggable,.drag'))recordBeforeChange();},{capture:true,passive:true});
    document.addEventListener('mouseup',()=>setTimeout(commitCurrent,0),true);
    document.addEventListener('touchend',()=>setTimeout(commitCurrent,0),true);
  }
  function connectSave(){
    const btn=document.getElementById('saveDesignAdjustments');
    if(!btn)return false;
    btn.addEventListener('click',()=>{
      const state=snapshot();
      localStorage.setItem(STORE_KEY,state);
      history=[];
      lastState=state;
      updateUndo();
    },true);
    return true;
  }
  function restoreSaved(){const saved=localStorage.getItem(STORE_KEY);if(saved)applyState(saved);}
  function init(){
    let tries=0;
    const timer=setInterval(()=>{
      tries++;
      const track=document.querySelector('.design-carousel-track');
      const tools=document.querySelector('#backgroundDesignTools .bg-tools-grid');
      if(!track||!tools){if(tries>100)clearInterval(timer);return;}
      clearInterval(timer);
      ensureUndoButton();
      restoreSaved();
      setTimeout(()=>{
        lastState=snapshot();
        ready=true;
        watchUserChanges();
        connectSave();
        updateUndo();
      },500);
    },120);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
