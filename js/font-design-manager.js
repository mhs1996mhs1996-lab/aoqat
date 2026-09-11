"use strict";
(function(){
  const STORE_KEY="prayerDesignerFontStylesByDesignV2";
  let dirty=false,pendingTarget=null,bypass=false;

  function activeDesign(){return window.PrayerUniversalFonts?.activeDesign?.()||document.getElementById('design');}
  function designKey(design){
    if(!design)return '';
    if(design.dataset.fontDesignKey)return design.dataset.fontDesignKey;
    const slide=design.closest('.design-slide');
    const slides=Array.from(document.querySelectorAll('.design-carousel-track > .design-slide')).filter(s=>getComputedStyle(s).display!=="none");
    const idx=Math.max(0,slides.indexOf(slide));
    const cls=Array.from(design.classList).find(c=>/design|reference|ornate|night|^sd|^nd|^nf/i.test(c));
    return design.dataset.fontDesignKey=design.id||cls||`preview-design-${idx}`;
  }
  function path(el,root){if(el===root)return 'root';const a=[];let n=el;while(n&&n!==root){const p=n.parentElement;if(!p)break;a.push(Array.prototype.indexOf.call(p.children,n));n=p;}return a.reverse().join('.');}
  function find(root,p){if(p==='root')return root;let n=root;for(const x of String(p).split('.')){const i=Number(x);if(!n?.children?.[i])return null;n=n.children[i];}return n;}
  function props(el){const s=el.style,o={};['fontFamily','fontSize','fontWeight','color','textAlign','textShadow'].forEach(k=>{if(s[k])o[k]=s[k];});return o;}
  function read(){try{return JSON.parse(localStorage.getItem(STORE_KEY)||'{}')||{};}catch(_){return {};}}
  function write(v){try{localStorage.setItem(STORE_KEY,JSON.stringify(v));}catch(e){console.error(e);}}
  function snapshot(d){const items={};[d,...d.querySelectorAll('*')].forEach(el=>{const p=props(el);if(Object.keys(p).length)items[path(el,d)]=p;});return {items};}
  function saveCurrent(){const d=activeDesign();if(!d)return false;const st=read();st[designKey(d)]=snapshot(d);write(st);dirty=false;badge();return true;}
  function applySaved(d){if(!d)return;const saved=read()[designKey(d)];if(!saved?.items)return;Object.entries(saved.items).forEach(([p,pr])=>{const el=find(d,p);if(el)Object.entries(pr).forEach(([k,v])=>el.style[k]=v);});}
  function restoreAll(){document.querySelectorAll('.design-carousel-track > .design-slide').forEach(s=>{if(getComputedStyle(s).display!=="none")applySaved(s.firstElementChild);});}
  function mark(){dirty=true;badge();}
  function badge(){const b=document.querySelector('[data-open-panel="fontPanel"]');if(!b)return;let x=b.querySelector('.font-save-badge');if(dirty&&!x){x=document.createElement('span');x.className='font-save-badge';x.textContent='غير محفوظ';b.appendChild(x);}if(x)x.style.display=dirty?'inline-flex':'none';}
  function styles(){if(document.getElementById('fontDesignManagerStyles'))return;const s=document.createElement('style');s.id='fontDesignManagerStyles';s.textContent=`.font-save-badge{margin-inline-start:auto;padding:2px 7px;border-radius:999px;background:#c87820;color:#fff;font-size:10px;font-weight:800}#fontSaveWarning{position:fixed;inset:0;z-index:100000;display:none;align-items:center;justify-content:center;padding:18px;background:rgba(2,12,20,.72)}#fontSaveWarning.open{display:flex}#fontSaveWarning .font-warning-card{width:min(390px,94vw);border-radius:15px;background:#102733;color:#fff;padding:18px}#fontSaveWarning .font-warning-actions{display:grid;grid-template-columns:1fr 1fr;gap:8px}#fontSaveWarning button{border:0;border-radius:9px;padding:10px 12px;font-family:inherit;font-weight:800}#fontSaveWarningSave{background:#178b52;color:#fff}#fontSaveWarningStay{background:#314b59;color:#fff}`;document.head.appendChild(s);}
  function modal(){let m=document.getElementById('fontSaveWarning');if(m)return m;m=document.createElement('div');m.id='fontSaveWarning';m.innerHTML=`<div class="font-warning-card"><h3>💾 حفظ تعديلات تنسيق الخط</h3><p>لديك تعديلات غير محفوظة على هذا التصميم.</p><div class="font-warning-actions"><button id="fontSaveWarningSave" type="button">حفظ التعديلات</button><button id="fontSaveWarningStay" type="button">البقاء هنا</button></div></div>`;document.body.appendChild(m);m.querySelector('#fontSaveWarningStay').onclick=()=>{pendingTarget=null;m.classList.remove('open');};m.querySelector('#fontSaveWarningSave').onclick=()=>{saveCurrent();document.getElementById('saveDesignAdjustments')?.click();m.classList.remove('open');const t=pendingTarget;pendingTarget=null;if(t){bypass=true;setTimeout(()=>{t.click();setTimeout(()=>bypass=false,0);},0);}};return m;}
  function shouldGuard(t){if(!dirty||bypass)return false;if(t.closest('.design-carousel-btn,.design-carousel-dot'))return true;const a=t.closest('.main-action[data-open-panel]');return !!a&&a.dataset.openPanel!=='fontPanel';}
  function init(){styles();modal();restoreAll();setTimeout(restoreAll,800);setTimeout(restoreAll,1800);
    window.addEventListener('prayerFontChanged',mark);
    document.addEventListener('click',e=>{if(shouldGuard(e.target)){e.preventDefault();e.stopImmediatePropagation();pendingTarget=e.target.closest('.design-carousel-btn,.design-carousel-dot,.main-action[data-open-panel]');modal().classList.add('open');}},true);
    document.addEventListener('click',e=>{if(e.target.closest('.design-carousel-btn,.design-carousel-dot'))setTimeout(()=>applySaved(activeDesign()),220);});
    const save=document.getElementById('saveDesignAdjustments');if(save)save.addEventListener('click',()=>{if(dirty)saveCurrent();},true);
    window.addEventListener('beforeunload',e=>{if(dirty){e.preventDefault();e.returnValue='';}});
  }
  window.PrayerFontDesignManager={save:saveCurrent,restore:restoreAll,isDirty:()=>dirty};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();