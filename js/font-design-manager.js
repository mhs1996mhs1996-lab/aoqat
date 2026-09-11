"use strict";
(function(){
  const STORE_KEY="prayerDesignerFontStylesByDesignV1";
  const FONT_IDS=["fontFamily","fontSize","fontWeight","fontColor","textAlign","textShadow"];
  let dirty=false;
  let dirtyDesignKey="";
  let bypassLeaveGuard=false;
  let pendingTarget=null;

  function visibleSlides(){
    const track=document.querySelector('.design-carousel-track');
    if(!track)return [];
    return Array.from(track.querySelectorAll(':scope > .design-slide')).filter(slide=>getComputedStyle(slide).display!=="none");
  }

  function activeDesign(){
    const slides=visibleSlides();
    if(slides.length){
      let index=Number(window.__prayerActiveDesignIndex);
      if(!Number.isFinite(index)||index<0||index>=slides.length){
        const dot=document.querySelector('.design-carousel-dot.active[data-dot]');
        index=dot?Number(dot.dataset.dot)||0:0;
      }
      return slides[Math.max(0,Math.min(index,slides.length-1))]?.firstElementChild||null;
    }
    return document.getElementById('design');
  }

  function designKey(design){
    if(!design)return "";
    if(design.dataset.fontDesignKey)return design.dataset.fontDesignKey;
    const usefulClass=Array.from(design.classList).find(c=>/design|reference|ornate|night|^sd|^nd|^nf/i.test(c));
    const slide=design.closest('.design-slide');
    const index=visibleSlides().indexOf(slide);
    const key=design.id||usefulClass||`preview-design-${Math.max(index,0)}`;
    design.dataset.fontDesignKey=key;
    return key;
  }

  function elementPath(el,root){
    if(el===root)return "root";
    const parts=[];let node=el;
    while(node&&node!==root){
      const parent=node.parentElement;if(!parent)break;
      const index=Array.prototype.indexOf.call(parent.children,node);
      parts.push(index);node=parent;
    }
    return parts.reverse().join('.');
  }

  function findByPath(root,path){
    if(path==="root")return root;
    let node=root;
    for(const raw of String(path||'').split('.')){
      const index=Number(raw);
      if(!node||!Number.isInteger(index)||!node.children[index])return null;
      node=node.children[index];
    }
    return node;
  }

  function fontProps(el){
    const s=el.style;
    const out={};
    if(s.fontFamily)out.fontFamily=s.fontFamily;
    if(s.fontSize)out.fontSize=s.fontSize;
    if(s.fontWeight)out.fontWeight=s.fontWeight;
    if(s.color)out.color=s.color;
    if(s.textAlign)out.textAlign=s.textAlign;
    if(s.textShadow)out.textShadow=s.textShadow;
    return out;
  }

  function hasProps(obj){return obj&&Object.keys(obj).length>0;}
  function readStore(){try{return JSON.parse(localStorage.getItem(STORE_KEY)||'{}')||{};}catch(_){return {};}}
  function writeStore(store){try{localStorage.setItem(STORE_KEY,JSON.stringify(store));}catch(error){console.error('تعذر حفظ تنسيق الخط',error);}}

  function snapshotDesign(design){
    const items={};
    [design,...design.querySelectorAll('*')].forEach(el=>{
      const props=fontProps(el);
      if(hasProps(props))items[elementPath(el,design)]=props;
    });
    return {savedAt:Date.now(),items};
  }

  function applySavedToDesign(design){
    if(!design)return;
    const key=designKey(design),saved=readStore()[key];
    if(!saved?.items)return;
    Object.entries(saved.items).forEach(([path,props])=>{
      const el=findByPath(design,path);if(!el)return;
      Object.entries(props).forEach(([name,value])=>{if(value!=null)el.style[name]=value;});
    });
  }

  function restoreAll(){
    visibleSlides().forEach(slide=>applySavedToDesign(slide.firstElementChild));
    const legacy=document.getElementById('design');if(legacy)applySavedToDesign(legacy);
  }

  function saveCurrentDesignFonts(){
    const design=activeDesign();if(!design)return false;
    const store=readStore();store[designKey(design)]=snapshotDesign(design);writeStore(store);
    dirty=false;dirtyDesignKey="";updateDirtyBadge();
    return true;
  }

  function markDirty(){
    const design=activeDesign();if(!design)return;
    dirty=true;dirtyDesignKey=designKey(design);updateDirtyBadge();
  }

  function updateDirtyBadge(){
    const btn=document.querySelector('[data-open-panel="fontPanel"]');if(!btn)return;
    btn.classList.toggle('font-unsaved',dirty);
    let badge=btn.querySelector('.font-save-badge');
    if(dirty&&!badge){badge=document.createElement('span');badge.className='font-save-badge';badge.textContent='غير محفوظ';btn.appendChild(badge);}
    if(badge)badge.style.display=dirty?'inline-flex':'none';
  }

  function injectStyles(){
    if(document.getElementById('fontDesignManagerStyles'))return;
    const s=document.createElement('style');s.id='fontDesignManagerStyles';
    s.textContent=`
      .font-save-badge{margin-inline-start:auto;padding:2px 7px;border-radius:999px;background:#c87820;color:#fff;font-size:10px;font-weight:800}
      .main-action.font-unsaved{box-shadow:0 0 0 2px rgba(235,174,64,.55)!important}
      #fontSaveWarning{position:fixed;inset:0;z-index:100000;display:none;align-items:center;justify-content:center;padding:18px;background:rgba(2,12,20,.72);backdrop-filter:blur(3px)}
      #fontSaveWarning.open{display:flex}
      #fontSaveWarning .font-warning-card{width:min(390px,94vw);border:1px solid rgba(255,255,255,.16);border-radius:15px;background:#102733;color:#fff;padding:18px;box-shadow:0 18px 55px rgba(0,0,0,.35);text-align:right}
      #fontSaveWarning h3{margin:0 0 8px;font-size:18px}#fontSaveWarning p{margin:0 0 15px;font-size:13px;line-height:1.7;color:#d9e5ea}
      #fontSaveWarning .font-warning-actions{display:grid;grid-template-columns:1fr 1fr;gap:8px}
      #fontSaveWarning button{border:0;border-radius:9px;padding:10px 12px;font-family:inherit;font-size:13px;font-weight:800;cursor:pointer}
      #fontSaveWarningSave{background:#178b52;color:#fff}#fontSaveWarningStay{background:#314b59;color:#fff}
    `;document.head.appendChild(s);
  }

  function ensureModal(){
    let modal=document.getElementById('fontSaveWarning');if(modal)return modal;
    modal=document.createElement('div');modal.id='fontSaveWarning';
    modal.innerHTML=`<div class="font-warning-card"><h3>💾 حفظ تعديلات تنسيق الخط</h3><p>لديك تعديلات غير محفوظة خاصة بهذا التصميم. احفظها قبل مغادرة تنسيق الخط أو الانتقال إلى تصميم آخر حتى تبقى عند إغلاق البرنامج وفتحه مرة ثانية.</p><div class="font-warning-actions"><button type="button" id="fontSaveWarningSave">حفظ التعديلات</button><button type="button" id="fontSaveWarningStay">البقاء هنا</button></div></div>`;
    document.body.appendChild(modal);
    modal.querySelector('#fontSaveWarningStay').addEventListener('click',()=>{pendingTarget=null;modal.classList.remove('open');});
    modal.querySelector('#fontSaveWarningSave').addEventListener('click',()=>{
      saveCurrentDesignFonts();
      const globalSave=document.getElementById('saveDesignAdjustments');
      if(globalSave)globalSave.click();
      modal.classList.remove('open');
      const target=pendingTarget;pendingTarget=null;
      if(target){bypassLeaveGuard=true;setTimeout(()=>{target.click();setTimeout(()=>{bypassLeaveGuard=false;},0);},0);}
    });
    return modal;
  }

  function fontPanelOpen(){return document.getElementById('fontPanel')?.classList.contains('inline-open');}
  function isLeavingTrigger(target){
    if(!target)return false;
    if(target.closest('.design-carousel-btn,.design-carousel-dot'))return true;
    const main=target.closest('.main-action[data-open-panel]');
    if(!main)return false;
    const panel=main.dataset.openPanel;
    return fontPanelOpen()&&(panel!=='fontPanel'||panel==='fontPanel');
  }

  function guardClick(event){
    if(bypassLeaveGuard||!dirty)return;
    const target=event.target;
    if(!isLeavingTrigger(target))return;
    event.preventDefault();event.stopPropagation();event.stopImmediatePropagation();
    pendingTarget=target.closest('.design-carousel-btn,.design-carousel-dot,.main-action[data-open-panel]')||target;
    ensureModal().classList.add('open');
  }

  function bindDirtyWatch(){
    FONT_IDS.forEach(id=>{
      const el=document.getElementById(id);if(!el||el.dataset.fontDirtyBound==='1')return;
      el.dataset.fontDirtyBound='1';
      el.addEventListener('input',markDirty);el.addEventListener('change',markDirty);
    });
    document.addEventListener('click',e=>{if(e.target.closest('.design-color-swatch'))setTimeout(markDirty,0);});
  }

  function bindSaveButton(){
    const btn=document.getElementById('saveDesignAdjustments');if(!btn||btn.dataset.fontManagerSaveBound==='1')return;
    btn.dataset.fontManagerSaveBound='1';
    btn.addEventListener('click',()=>{if(dirty)saveCurrentDesignFonts();},true);
  }

  function init(){
    injectStyles();ensureModal();
    let tries=0;
    const timer=setInterval(()=>{
      tries++;restoreAll();bindDirtyWatch();bindSaveButton();
      if(document.querySelector('.design-carousel-track')&&document.getElementById('fontPanel')&&tries>12)clearInterval(timer);
      if(tries>50)clearInterval(timer);
    },160);
    document.addEventListener('click',guardClick,true);
    document.addEventListener('click',e=>{if(e.target.closest('.design-carousel-btn,.design-carousel-dot'))setTimeout(()=>{applySavedToDesign(activeDesign());},100);});
    window.addEventListener('beforeunload',e=>{if(!dirty)return;e.preventDefault();e.returnValue='';});
    const obs=new MutationObserver(()=>{restoreAll();bindDirtyWatch();bindSaveButton();});
    obs.observe(document.body,{childList:true,subtree:true});
  }

  window.PrayerFontDesignManager={save:saveCurrentDesignFonts,restore:restoreAll,isDirty:()=>dirty};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();