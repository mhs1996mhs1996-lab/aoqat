(function(){
  'use strict';
  const KEY='aoqatPrayerTimeChoiceV1',ids=['fajr','dhuhr','asr','maghrib','isha'];
  const names={fajr:'الفجر',dhuhr:'الظهر',asr:'العصر',maghrib:'المغرب',isha:'العشاء'};
  function normalize(raw={}){return {mode:raw?.mode==='custom'?'custom':'database',offsets:Object.fromEntries(ids.map(id=>{const n=Number(raw?.offsets?.[id]);return [id,Number.isInteger(n)&&n>=-40&&n<=40?n:0];}))};}
  function read(){try{return normalize(JSON.parse(localStorage.getItem(KEY)||'{}'));}catch(_){return normalize();}}
  function shift(value,id,offset){
    if(!offset)return value;
    const m=String(value||'').match(/^(\d{1,2}):([0-5]\d)(?::([0-5]\d))?$/);if(!m||+m[1]>23)return value;
    let h=+m[1];if(['asr','maghrib','isha'].includes(id)&&h<12)h+=12;if(id==='fajr'&&h===12)h=0;
    const t=((h*60+Number(m[2])+offset)%1440+1440)%1440;
    // Keep afternoon database conventions, so all existing preview formatting stays intact.
    let hour=Math.floor(t/60);if(['asr','maghrib','isha'].includes(id)&&hour>=13)hour-=12;
    return hour+':'+String(t%60).padStart(2,'0')+(m[3]?':'+m[3]:'');
  }
  function transform(row,direction){if(!row)return row;const s=read();if(s.mode!=='custom'||window.AndroidNative?.configureAdhan)return {...row};const result={...row};for(const id of ids)result[id]=shift(row[id],id,direction*s.offsets[id]);return result;}
  function save(raw){const s=normalize(raw);localStorage.setItem(KEY,JSON.stringify(s));window.dispatchEvent(new Event('aoqatPrayerRowsUpdated'));if(typeof loadPrayerFromDatabase==='function')loadPrayerFromDatabase(true);return s;}
  window.AoqatPrayerTimeChoice={read,normalize,shift,save,applyRow:row=>transform(row,1),unapplyRow:row=>transform(row,-1)};
  window.aoqatPrayerTimeChoiceView=function(){
    if(!document.getElementById('prayerTimeChoiceStyles')){const css=document.createElement('style');css.id='prayerTimeChoiceStyles';css.textContent=`
      .ptc-panel{max-width:620px;margin:auto;direction:rtl;padding:4px;color:var(--wt-text,#33452b)}
      .ptc-modes{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px}
      .ptc-mode{font-family:inherit;font-weight:600;font-size:14px;border:0;border-radius:10px;padding:8px 6px;min-height:42px;background:#878e8b;color:white;cursor:pointer}
      .ptc-mode[aria-pressed=true]{background:#258454}
      .ptc-fields[hidden],.ptc-note[hidden]{display:none!important}
      .ptc-fields{margin:0;border:1px solid var(--wt-border,#d0d6b8);border-radius:14px;padding:10px 14px}
      .ptc-fields label{display:grid;grid-template-columns:1fr 145px;align-items:center;gap:12px;padding:12px 0;margin:0;font-size:17px}
      .ptc-fields label+label{border-top:1px solid var(--wt-border,#d0d6b8)}
      .ptc-fields select{width:100%;min-height:42px;border-radius:10px;border:1px solid var(--wt-border,#bdcbbd);background:var(--wt-surface2,#edf4e9);color:inherit;font:inherit;padding:6px 10px}
      .ptc-fields:disabled{color:#808783;background:#f0f1ee}.ptc-fields:disabled select{background:#e5e7e5;color:#808783;opacity:1}
      .ptc-note{font-size:14px;line-height:1.9;margin:14px 2px 0;color:var(--wt-text,#33452b)}
    `;document.head.appendChild(css);}
    const panel=document.createElement('section');panel.className='ptc-panel';panel.id='prayerTimeChoicePanel';
    panel.innerHTML='<div class="ptc-modes" role="group" aria-label="طريقة اختيار الأوقات"><button type="button" class="ptc-mode" data-time-mode="database">افتراضياً</button><button type="button" class="ptc-mode" data-time-mode="custom">تخصيص المستخدم</button></div><fieldset class="ptc-fields"><legend>تعديل الوقت بالدقائق</legend></fieldset><p class="ptc-note">السالب يقدّم وقت الصلاة، والموجب يؤخّره. يُحفظ الاختيار تلقائياً على هذا الجهاز، ويُطبّق على المواقيت والعدادات والتنبيهات. الشروق يبقى كما هو، وأوقات قاعدة البيانات الأصلية لا تتغير.</p><p id="ptcStatus" role="status" class="ptc-note"></p>';
    const fields=panel.querySelector('fieldset');for(const id of ids){const label=document.createElement('label');label.textContent=names[id];const select=document.createElement('select');select.id='ptc-'+id;select.dataset.timePrayer=id;select.setAttribute('aria-label','تعديل وقت '+names[id]+' بالدقائق');for(let n=-40;n<=40;n++){const o=document.createElement('option');o.value=String(n);o.textContent=n===0?'٠ — بدون تعديل':(n>0?'+':'−')+Math.abs(n);select.appendChild(o);}label.appendChild(select);fields.appendChild(label);}
    function draw(){const s=read();fields.disabled=s.mode!=='custom';fields.hidden=s.mode!=='custom';panel.querySelector('.ptc-note').hidden=s.mode!=='custom';panel.querySelectorAll('[data-time-mode]').forEach(b=>{const selected=b.dataset.timeMode===s.mode;b.setAttribute('aria-pressed',String(selected));b.style.setProperty('background',selected?'#278052':'#858e8b','important');b.style.setProperty('color','#fff','important');let mark=b.querySelector('[data-time-state]');if(!mark){mark=document.createElement('small');mark.dataset.timeState='true';mark.style.cssText='display:block;margin-top:3px;font-size:11px';b.appendChild(mark);}mark.textContent=selected?'✓ مفعّل':'غير مفعّل';});for(const id of ids)panel.querySelector('#ptc-'+id).value=String(s.offsets[id]);}
    panel.addEventListener('click',e=>{const b=e.target.closest('[data-time-mode]');if(!b)return;const s=read();s.mode=b.dataset.timeMode;save(s);draw();panel.querySelector('#ptcStatus').textContent='تم حفظ طريقة اختيار الأوقات';});
    panel.addEventListener('change',e=>{const id=e.target.dataset.timePrayer;if(!ids.includes(id))return;const s=read();if(s.mode!=='custom')return;s.offsets[id]=Number(e.target.value);save(s);draw();panel.querySelector('#ptcStatus').textContent='تم حفظ تعديل وقت '+names[id];});draw();return panel;
  };
})();
