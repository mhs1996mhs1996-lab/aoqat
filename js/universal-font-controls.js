"use strict";
(function(){
  const CONTROL_IDS=["fontFamily","fontSize","fontWeight","fontColor","textAlign","textShadow"];
  const roleFromValue=value=>({
    ".quran":"quran","#dayP":"day","#hijriDayP":"hday","#gregorianDayP":"gday",
    "#hijriMonthP":"hmonth","#gregorianMonthP":"gmonth","#hijriYearP":"hyear","#gregorianYearP":"gyear",
    ".prayer-row:nth-child(1)":"fajr",".prayer-row:nth-child(2)":"sunrise",".prayer-row:nth-child(3)":"dhuhr",
    ".prayer-row:nth-child(4)":"asr",".prayer-row:nth-child(5)":"maghrib",".prayer-row:nth-child(6)":"isha","#footerP":"footer"
  })[value]||null;

  function activeDesign(){
    const track=document.querySelector('.design-carousel-track');
    if(track){
      const slides=Array.from(track.querySelectorAll(':scope > .design-slide')).filter(s=>getComputedStyle(s).display!=="none");
      let index=Number(window.__prayerActiveDesignIndex);
      if(!Number.isFinite(index)||index<0||index>=slides.length) index=0;
      const d=slides[index]?.firstElementChild;
      if(d) return d;
    }
    return document.getElementById('design');
  }

  const fieldSelectors={
    day:['[data-field="day"]','[data-f="day"]','#dayP','.weekday','.sd2-day','.sd3-day','.sd4-day','.nd-day'],
    hday:['[data-field="hday"]','[data-f="hd"]','#hijriDayP','.hijri-day','.sd2-date-card.hijri .sd2-date-number'],
    gday:['[data-field="gday"]','[data-f="gd"]','#gregorianDayP','.gregorian-day','.sd2-date-card.greg .sd2-date-number'],
    hmonth:['[data-field="hmonth"]','[data-f="hm"]','#hijriMonthP','.hijri-month','.sd2-date-card.hijri .sd2-date-month'],
    gmonth:['[data-field="gmonth"]','[data-f="gm"]','#gregorianMonthP','.gregorian-month','.sd2-date-card.greg .sd2-date-month'],
    hyear:['[data-field="hyear"]','[data-f="hy"]','#hijriYearP','.hijri-year','.sd2-date-card.hijri .sd2-date-year'],
    gyear:['[data-field="gyear"]','[data-f="gy"]','#gregorianYearP','.gregorian-year','.sd2-date-card.greg .sd2-date-year'],
    footer:['[data-field="footer"]','[data-f="footer"]','#footerP','.footer','.sd2-footer','.sd3-footer-card','.sd4-footer','.nd-footer','.nf-footer'],
    quran:['[data-field="quran"]','[data-f="quran"]','.quran','.verse','.sd4-verse','.nd-verse']
  };

  const prayerLabels={fajr:'الفجر',sunrise:'الشروق',dhuhr:'الظهر',asr:'العصر',maghrib:'المغرب',isha:'العشاء'};

  function unique(items){return Array.from(new Set(items.filter(Boolean)));}

  function roleTargets(role){
    const root=activeDesign();
    if(!root||!role) return [];
    if(prayerLabels[role]){
      const direct=Array.from(root.querySelectorAll(`[data-field="${role}"],[data-f="${role}"]`));
      const rows=[];
      direct.forEach(el=>{
        const row=el.closest('.prayer-row,.sd2-prayer-row,.sd3-prayer-row,.sd4-prayer-row,.nd-prayer-row,.nf-row,[data-prayer-row]');
        if(row) rows.push(row);
      });
      if(!rows.length){
        Array.from(root.querySelectorAll('.prayer-row,.sd2-prayer-row,.sd3-prayer-row,.sd4-prayer-row,.nd-prayer-row,.nf-row,[data-prayer-row]')).forEach(row=>{
          if((row.textContent||'').includes(prayerLabels[role])) rows.push(row);
        });
      }
      const out=[];
      rows.forEach(row=>{
        out.push(row);
        row.querySelectorAll('span,b,strong,em,i,div').forEach(el=>{
          if(el.children.length===0 && (el.textContent||'').trim()) out.push(el);
        });
      });
      direct.forEach(el=>out.push(el));
      return unique(out);
    }
    const selectors=fieldSelectors[role]||[];
    const out=[];
    selectors.forEach(sel=>{try{root.querySelectorAll(sel).forEach(el=>out.push(el));}catch(_){}});
    return unique(out);
  }

  function shadowValue(value){
    if(value==='black') return '2px 2px 6px rgba(0,0,0,.85)';
    if(value==='gold') return '2px 2px 8px rgba(212,168,63,.9)';
    if(value==='green') return '2px 2px 8px rgba(25,130,75,.9)';
    return 'none';
  }

  function apply(){
    const select=document.getElementById('elementSelect');
    const role=roleFromValue(select?.value||'');
    const targets=roleTargets(role);
    if(!targets.length) return;
    const family=document.getElementById('fontFamily')?.value;
    const size=document.getElementById('fontSize')?.value;
    const weight=document.getElementById('fontWeight')?.value;
    const color=document.getElementById('fontColor')?.value;
    const align=document.getElementById('textAlign')?.value;
    const shadow=document.getElementById('textShadow')?.value;
    targets.forEach(el=>{
      if(family) el.style.fontFamily=`"${family}", Arial, sans-serif`;
      if(size) el.style.fontSize=`${size}px`;
      if(weight) el.style.fontWeight=weight;
      if(color) el.style.color=color;
      if(align) el.style.textAlign=align;
      if(shadow!=null) el.style.textShadow=shadowValue(shadow);
    });
  }

  function rgbToHex(rgb){
    const m=String(rgb||'').match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i);if(!m)return '#ffffff';
    return '#'+[m[1],m[2],m[3]].map(n=>Number(n).toString(16).padStart(2,'0')).join('');
  }

  function load(){
    const select=document.getElementById('elementSelect');
    const role=roleFromValue(select?.value||'');
    const target=roleTargets(role)[0];
    if(!target)return;
    const s=getComputedStyle(target);
    const family=(s.fontFamily.split(',')[0]||'').replace(/["']/g,'').trim();
    const familySelect=document.getElementById('fontFamily');
    if(familySelect){
      let option=Array.from(familySelect.options).find(o=>o.value===family);
      if(!option&&family){option=new Option(family,family);familySelect.add(option);}
      if(family)familySelect.value=family;
    }
    const size=document.getElementById('fontSize');if(size)size.value=Math.round(parseFloat(s.fontSize)||40);
    const weight=document.getElementById('fontWeight');if(weight){const w=String(Math.round((parseInt(s.fontWeight)||400)/100)*100);if(Array.from(weight.options).some(o=>o.value===w))weight.value=w;}
    const color=document.getElementById('fontColor');if(color)color.value=rgbToHex(s.color);
    const align=document.getElementById('textAlign');if(align&&['right','center','left'].includes(s.textAlign))align.value=s.textAlign;
  }

  function bind(){
    const select=document.getElementById('elementSelect');
    if(!select||select.dataset.universalFontBound==='1')return;
    select.dataset.universalFontBound='1';
    select.addEventListener('change',()=>setTimeout(load,0));
    CONTROL_IDS.forEach(id=>{
      const el=document.getElementById(id);if(!el)return;
      el.addEventListener(id==='fontSize'||id==='fontColor'?'input':'change',()=>setTimeout(apply,0));
    });
    document.querySelector('.design-carousel-controls')?.addEventListener('click',()=>setTimeout(load,80));
    document.addEventListener('click',e=>{if(e.target.closest('.design-carousel-btn,.design-carousel-dot'))setTimeout(load,100);});
    window.addEventListener('prayerDesignChanged',()=>setTimeout(load,0));
  }

  function futureProof(){
    // أي تصميم جديد يستخدم data-field أو data-f القياسية سيعمل تلقائياً بدون تعديل هذا الملف.
    const observer=new MutationObserver(()=>bind());
    observer.observe(document.body,{childList:true,subtree:true});
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{bind();futureProof();},{once:true});
  else {bind();futureProof();}
})();