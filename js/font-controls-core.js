"use strict";
(function(){
  const ROLE_BY_VALUE={'.quran':'quran','#dayP':'day','#hijriDayP':'hday','#gregorianDayP':'gday','#hijriMonthP':'hmonth','#gregorianMonthP':'gmonth','#hijriYearP':'hyear','#gregorianYearP':'gyear','.prayer-row:nth-child(1)':'fajr','.prayer-row:nth-child(2)':'sunrise','.prayer-row:nth-child(3)':'dhuhr','.prayer-row:nth-child(4)':'asr','.prayer-row:nth-child(5)':'maghrib','.prayer-row:nth-child(6)':'isha','#footerP':'footer'};
  const ALIASES={
    quran:['[data-field="quran"]','.quran','.verse','.sd2-verse','.sd3-verse','.sd4-verse','.nd-verse','.nf-verse','.ref-verse','.or-verse'],
    day:['[data-field="day"]','#dayP','.weekday','.sd2-day','.sd3-day','.sd4-day','.nd-day','.nf-day','.ref-day','.or-day'],
    hday:['[data-field="hday"]','#hijriDayP','.hijri-day','.sd2-date-card.hijri .sd2-date-number','.sd3-date-card.hijri .sd3-date-number','.sd4-date-card.hijri .sd4-date-number','.ref-date-card.hijri .ref-date-num'],
    gday:['[data-field="gday"]','#gregorianDayP','.gregorian-day','.sd2-date-card.greg .sd2-date-number','.sd3-date-card.greg .sd3-date-number','.sd4-date-card.greg .sd4-date-number','.ref-date-card.greg .ref-date-num'],
    hmonth:['[data-field="hmonth"]','#hijriMonthP','.hijri-month','.sd2-date-card.hijri .sd2-date-month','.sd3-date-card.hijri .sd3-date-month','.sd4-date-card.hijri .sd4-date-month','.ref-date-card.hijri .ref-date-month'],
    gmonth:['[data-field="gmonth"]','#gregorianMonthP','.gregorian-month','.sd2-date-card.greg .sd2-date-month','.sd3-date-card.greg .sd3-date-month','.sd4-date-card.greg .sd4-date-month','.ref-date-card.greg .ref-date-month'],
    hyear:['[data-field="hyear"]','#hijriYearP','.hijri-year','.sd2-date-card.hijri .sd2-date-year','.sd3-date-card.hijri .sd3-date-year','.sd4-date-card.hijri .sd4-date-year','.ref-date-card.hijri .ref-date-year'],
    gyear:['[data-field="gyear"]','#gregorianYearP','.gregorian-year','.sd2-date-card.greg .sd2-date-year','.sd3-date-card.greg .sd3-date-year','.sd4-date-card.greg .sd4-date-year','.ref-date-card.greg .ref-date-year'],
    footer:['[data-field="footer"]','#footerP','.footer','.sd2-footer','.sd3-footer-card','.sd4-footer','.nd-footer','.nf-footer','.ref-footer','.or-footer']
  };
  const PRAYERS=['fajr','sunrise','dhuhr','asr','maghrib','isha'];
  const ARABIC={fajr:'الفجر',sunrise:'الشروق',dhuhr:'الظهر',asr:'العصر',maghrib:'المغرب',isha:'العشاء'};
  const ROW_SELECTOR='.prayer-row,.sd2-prayer-row,.sd3-prayer-row,.sd4-prayer-row,.nd-prayer-row,.nf-row,.ref-prayer-row,.or-row,[data-prayer-row]';
  function slides(){const t=document.querySelector('.design-carousel-track');return t?Array.from(t.children).filter(s=>s.classList.contains('design-slide')&&getComputedStyle(s).display!=='none'):[];}
  function statusIndex(){const s=document.querySelector('.final-carousel-controls .design-carousel-status')?.textContent||'';const m=s.match(/(\d+)\s*من\s*(\d+)/);return m?Number(m[1])-1:null;}
  function activeRoot(){const list=slides();if(!list.length)return document.getElementById('design');let i=statusIndex();if(i===null){const car=document.querySelector('.design-carousel'),cr=car?.getBoundingClientRect();if(cr?.width){const cx=cr.left+cr.width/2;let best=0,dist=Infinity;list.forEach((s,n)=>{const r=s.getBoundingClientRect(),d=Math.abs(r.left+r.width/2-cx);if(r.width&&d<dist){dist=d;best=n;}});i=best;}else i=0;}i=Math.max(0,Math.min(i,list.length-1));return list[i]?.firstElementChild||null;}
  function role(){const v=document.getElementById('elementSelect')?.value||'';if(ROLE_BY_VALUE[v])return ROLE_BY_VALUE[v];const m=v.match(/data-(?:field|f)=["']?([^"'\]]+)/i);return m?m[1]:null;}
  const unique=a=>Array.from(new Set(a.filter(Boolean)));
  function addCountdownTargets(root,r,out){
    const name=ARABIC[r];if(!name)return;
    const phrases=[`أذان ${name} بعد`,`اذان ${name} بعد`];
    root.querySelectorAll('*').forEach(el=>{
      const txt=(el.textContent||'').replace(/\s+/g,' ').trim();
      if(!txt||!phrases.some(p=>txt.includes(p)))return;
      out.push(el);
      el.querySelectorAll('*').forEach(child=>{if((child.textContent||'').trim())out.push(child);});
      const parent=el.parentElement;
      if(parent&&root.contains(parent))parent.querySelectorAll('span,b,strong,em,time,[class*="count" i],[class*="timer" i]').forEach(child=>{if((child.textContent||'').trim())out.push(child);});
    });
  }
  function targetsFor(r){
    const root=activeRoot();if(!root||!r)return [];
    if(PRAYERS.includes(r)){
      let rows=[];root.querySelectorAll(`[data-field="${r}"],[data-f="${r}"]`).forEach(el=>{rows.push(el.closest(ROW_SELECTOR)||el);});
      if(!rows.length){const all=Array.from(root.querySelectorAll(ROW_SELECTOR)),p=PRAYERS.indexOf(r);if(all[p])rows=[all[p]];}
      const out=[];rows.forEach(row=>{out.push(row);row.querySelectorAll('*').forEach(el=>{if(el.matches('.ref-prayer-icon,[data-icon]'))return;if(el.children.length===0&&(el.textContent||'').trim())out.push(el);});});
      addCountdownTargets(root,r,out);
      return unique(out);
    }
    const out=[];[`[data-field="${r}"]`,`[data-f="${r}"]`,...(ALIASES[r]||[])].forEach(sel=>{try{root.querySelectorAll(sel).forEach(el=>out.push(el));}catch(_){}});return unique(out);
  }
  function shadow(v){if(v==='black')return '4px 4px 3px #000';if(v==='gold')return '4px 4px 3px #000,0 0 10px #ffd45c';if(v==='green')return '4px 4px 3px #000,0 0 10px #26ff00';return 'none';}
  function designKey(root){return root?.id||root?.dataset?.designId||'design';}
  function remember(root,r,kind,value){if(!root||!r)return;const k=`aoqat-font:${designKey(root)}:${r}:${kind}`;try{localStorage.setItem(k,String(value));}catch(_){}}
  function apply(kind){const root=activeRoot(),r=role();if(!root||!r)return;const targets=targetsFor(r);if(!targets.length)return;const vals={fontFamily:document.getElementById('fontFamily')?.value,fontSize:parseFloat(document.getElementById('fontSize')?.value||''),fontWeight:document.getElementById('fontWeight')?.value,fontColor:document.getElementById('fontColor')?.value,textAlign:document.getElementById('textAlign')?.value,textShadow:document.getElementById('textShadow')?.value};targets.forEach(el=>{if((!kind||kind==='fontFamily')&&vals.fontFamily)el.style.setProperty('font-family',`"${vals.fontFamily}", Arial, sans-serif`,'important');if((!kind||kind==='fontSize')&&Number.isFinite(vals.fontSize)&&vals.fontSize>0)el.style.setProperty('font-size',`${vals.fontSize}px`,'important');if((!kind||kind==='fontWeight')&&vals.fontWeight)el.style.setProperty('font-weight',vals.fontWeight,'important');if((!kind||kind==='fontColor')&&vals.fontColor)el.style.setProperty('color',vals.fontColor,'important');if((!kind||kind==='textAlign')&&vals.textAlign)el.style.setProperty('text-align',vals.textAlign,'important');if((!kind||kind==='textShadow')&&vals.textShadow!=null)el.style.setProperty('text-shadow',shadow(vals.textShadow),'important');});if(kind&&kind in vals)remember(root,r,kind,vals[kind]);window.dispatchEvent(new CustomEvent('prayerFontChanged',{detail:{design:root,role:r,targets}}));}
  function load(){const t=targetsFor(role())[0];if(!t)return;const s=getComputedStyle(t),size=document.getElementById('fontSize');if(size)size.value=Math.round(parseFloat(s.fontSize)||40);const w=document.getElementById('fontWeight');if(w){const x=String(parseInt(s.fontWeight)||400);if(Array.from(w.options).some(o=>o.value===x))w.value=x;}const c=document.getElementById('fontColor');if(c&&/^rgb/.test(s.color)){const m=s.color.match(/\d+/g);if(m?.length>=3)c.value='#'+m.slice(0,3).map(n=>(+n).toString(16).padStart(2,'0')).join('');}}
  function init(){['fontFamily','fontSize','fontWeight','fontColor','textAlign','textShadow'].forEach(id=>{const el=document.getElementById(id);if(!el)return;const ev=(id==='fontSize'||id==='fontColor')?'input':'change';el.addEventListener(ev,()=>apply(id),true);if(ev!=='change')el.addEventListener('change',()=>apply(id),true);});document.getElementById('elementSelect')?.addEventListener('change',()=>setTimeout(load,0),true);const sync=()=>setTimeout(()=>{const root=activeRoot();window.__prayerActiveDesignElement=root;const list=slides();window.__prayerActiveDesignIndex=Math.max(0,list.findIndex(s=>s.firstElementChild===root));load();},20);document.addEventListener('click',e=>{if(e.target.closest('.final-carousel-controls,.final-carousel-dots,.design-carousel-btn,.design-carousel-dot'))sync();},true);window.addEventListener('prayerDesignChanged',sync);}
  window.PrayerFontCore={activeRoot,targetsFor,apply,load};if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();