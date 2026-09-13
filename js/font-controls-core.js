"use strict";
(function(){
  const ROLE_BY_VALUE={
    '.quran':'quran','#dayP':'day','#hijriDayP':'hday','#gregorianDayP':'gday',
    '#hijriMonthP':'hmonth','#gregorianMonthP':'gmonth','#hijriYearP':'hyear','#gregorianYearP':'gyear',
    '.prayer-row:nth-child(1)':'fajr','.prayer-row:nth-child(2)':'sunrise','.prayer-row:nth-child(3)':'dhuhr',
    '.prayer-row:nth-child(4)':'asr','.prayer-row:nth-child(5)':'maghrib','.prayer-row:nth-child(6)':'isha','#footerP':'footer'
  };
  const ALIASES={
    quran:['[data-field="quran"]','.quran','.verse','.sd4-verse','.nd-verse','.ref-verse','.or-verse'],
    day:['[data-field="day"]','#dayP','.weekday','.sd2-day','.sd3-day','.sd4-day','.nd-day','.ref-day','.or-day'],
    hday:['[data-field="hday"]','#hijriDayP','.hijri-day','.sd2-date-card.hijri .sd2-date-number','.sd4-date-card.hijri .sd4-date-number','.ref-date-card.hijri .ref-date-num'],
    gday:['[data-field="gday"]','#gregorianDayP','.gregorian-day','.sd2-date-card.greg .sd2-date-number','.sd4-date-card.greg .sd4-date-number','.ref-date-card.greg .ref-date-num'],
    hmonth:['[data-field="hmonth"]','#hijriMonthP','.hijri-month','.sd2-date-card.hijri .sd2-date-month','.sd4-date-card.hijri .sd4-date-month','.ref-date-card.hijri .ref-date-month'],
    gmonth:['[data-field="gmonth"]','#gregorianMonthP','.gregorian-month','.sd2-date-card.greg .sd2-date-month','.sd4-date-card.greg .sd4-date-month','.ref-date-card.greg .ref-date-month'],
    hyear:['[data-field="hyear"]','#hijriYearP','.hijri-year','.sd2-date-card.hijri .sd2-date-year','.sd4-date-card.hijri .sd4-date-year','.ref-date-card.hijri .ref-date-year'],
    gyear:['[data-field="gyear"]','#gregorianYearP','.gregorian-year','.sd2-date-card.greg .sd2-date-year','.sd4-date-card.greg .sd4-date-year','.ref-date-card.greg .ref-date-year'],
    footer:['[data-field="footer"]','#footerP','.footer','.sd2-footer','.sd3-footer-card','.sd4-footer','.nd-footer','.nf-footer','.ref-footer','.or-footer']
  };
  const PRAYERS=['fajr','sunrise','dhuhr','asr','maghrib','isha'];
  const ROW_SELECTOR='.prayer-row,.sd2-prayer-row,.sd3-prayer-row,.sd4-prayer-row,.nd-prayer-row,.nf-row,.ref-prayer-row,.or-row,[data-prayer-row]';

  function slides(){
    const track=document.querySelector('.design-carousel-track');
    return track?Array.from(track.children).filter(s=>s.classList.contains('design-slide')&&getComputedStyle(s).display!=='none'):[];
  }
  function activeRoot(){
    const list=slides();
    if(!list.length)return document.getElementById('design');
    const status=document.querySelector('.final-carousel-controls .design-carousel-status,.design-carousel-status')?.textContent||'';
    const match=status.match(/(?:التصميم\s*)?(\d+)\s*من\s*\d+/);
    let index=match?Number(match[1])-1:Number(window.__prayerActiveDesignIndex||0);
    if(!Number.isFinite(index))index=0;
    index=Math.max(0,Math.min(index,list.length-1));
    return list[index]?.firstElementChild||null;
  }
  function role(){
    const value=document.getElementById('elementSelect')?.value||'';
    if(ROLE_BY_VALUE[value])return ROLE_BY_VALUE[value];
    const m=value.match(/data-(?:field|f)=["']?([^"'\]]+)/i);
    return m?m[1]:null;
  }
  function unique(items){return Array.from(new Set(items.filter(Boolean)));}
  function targetsFor(r){
    const root=activeRoot();if(!root||!r)return [];
    if(PRAYERS.includes(r)){
      let rows=[];
      root.querySelectorAll(`[data-field="${r}"],[data-f="${r}"]`).forEach(el=>{const row=el.closest(ROW_SELECTOR);if(row)rows.push(row);else rows.push(el);});
      if(!rows.length){const pos=PRAYERS.indexOf(r);const all=Array.from(root.querySelectorAll(ROW_SELECTOR));if(all[pos])rows=[all[pos]];}
      const out=[];
      rows.forEach(row=>{
        out.push(row);
        row.querySelectorAll('*').forEach(el=>{
          if(el.matches('.ref-prayer-icon,[data-icon]'))return;
          if((el.textContent||'').trim()&&el.children.length===0)out.push(el);
        });
      });
      return unique(out);
    }
    const out=[];
    const selectors=[`[data-field="${r}"]`,`[data-f="${r}"]`,...(ALIASES[r]||[])];
    selectors.forEach(sel=>{try{root.querySelectorAll(sel).forEach(el=>out.push(el));}catch(_){}});
    return unique(out);
  }
  function shadow(v){
    if(v==='black')return '4px 4px 3px #000';
    if(v==='gold')return '4px 4px 3px #000, 0 0 10px #ffd45c';
    if(v==='green')return '4px 4px 3px #000, 0 0 10px #26ff00';
    return 'none';
  }
  function apply(kind){
    const r=role(),targets=targetsFor(r);if(!targets.length)return;
    const family=document.getElementById('fontFamily')?.value;
    const size=parseFloat(document.getElementById('fontSize')?.value||'');
    const weight=document.getElementById('fontWeight')?.value;
    const color=document.getElementById('fontColor')?.value;
    const align=document.getElementById('textAlign')?.value;
    const sh=document.getElementById('textShadow')?.value;
    targets.forEach(el=>{
      if((!kind||kind==='fontFamily')&&family)el.style.setProperty('font-family',`"${family}", Arial, sans-serif`,'important');
      if((!kind||kind==='fontSize')&&Number.isFinite(size)&&size>0)el.style.setProperty('font-size',`${size}px`,'important');
      if((!kind||kind==='fontWeight')&&weight)el.style.setProperty('font-weight',weight,'important');
      if((!kind||kind==='fontColor')&&color)el.style.setProperty('color',color,'important');
      if((!kind||kind==='textAlign')&&align)el.style.setProperty('text-align',align,'important');
      if((!kind||kind==='textShadow')&&sh!=null)el.style.setProperty('text-shadow',shadow(sh),'important');
    });
    window.dispatchEvent(new CustomEvent('prayerFontChanged',{detail:{design:activeRoot(),role:r,targets}}));
  }
  function load(){
    const t=targetsFor(role())[0];if(!t)return;
    const s=getComputedStyle(t);
    const size=document.getElementById('fontSize');if(size)size.value=Math.round(parseFloat(s.fontSize)||40);
    const weight=document.getElementById('fontWeight');if(weight&&Array.from(weight.options).some(o=>o.value===String(s.fontWeight)))weight.value=String(s.fontWeight);
  }
  function init(){
    const ids=['fontFamily','fontSize','fontWeight','fontColor','textAlign','textShadow'];
    ids.forEach(id=>{
      const el=document.getElementById(id);if(!el)return;
      const event=id==='fontSize'||id==='fontColor'?'input':'change';
      el.addEventListener(event,()=>apply(id),true);
      if(event!=='change')el.addEventListener('change',()=>apply(id),true);
    });
    document.getElementById('elementSelect')?.addEventListener('change',()=>setTimeout(load,0),true);
    window.addEventListener('prayerDesignChanged',()=>setTimeout(load,80));
    document.addEventListener('click',e=>{if(e.target.closest('.design-carousel-btn,.design-carousel-dot'))setTimeout(load,180);},true);
  }
  window.PrayerFontCore={activeRoot,targetsFor,apply,load};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();