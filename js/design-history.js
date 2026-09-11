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
  function snapshot(){
    return JSON.stringify(slides().map((slide,si)=>({
      si,
      items:editableIn(slide).map((el,ei)=>({
        ei,
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
    state.forEach(s=>{
      const slide=currentSlides[s.si]; if(!slide)return;
      const els=editableIn(slide);
      s.items.forEach(item=>{
        let el=null;
        if(item.id)el=slide.querySelector('#'+CSS.escape(item.id));
        if(!el)el=els[item.ei];
        if(!el)return;
        if(item.style)el.setAttribute('style',item.style);else el.removeAttribute('style');
        if(item.x===null)delete el.dataset.x;else el.dataset.x=String(item.x);
        if(item.y===null)delete el.dataset.y;else el.dataset.y=String(item.y);
      });
    });
    requestAnimationFrame(()=>{restoring=false;lastState=snapshot();});
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