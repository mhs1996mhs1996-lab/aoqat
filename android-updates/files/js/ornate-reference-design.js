"use strict";
(function(){
  const W=1024,H=1448;
  const ids=["dayName","gregorianDay","gregorianMonth","gregorianYear","hijriDay","hijriMonth","hijriYear","fajr","sunrise","dhuhr","asr","maghrib","isha","footerText"];
  const value=id=>document.getElementById(id)?.value||"";

  function addStyles(){
    if(document.getElementById('ornateRefStyles'))return;
    const s=document.createElement('style');
    s.id='ornateRefStyles';
    s.textContent=`
      .ornate-ref-design{position:relative;width:${W}px;height:${H}px;flex:0 0 ${W}px;overflow:hidden;direction:rtl;transform-origin:top center;background:linear-gradient(180deg,#08272b 0%,#0a3437 48%,#0b3538 100%);color:#f8d98c;font-family:inherit;box-shadow:inset 0 0 150px #001416}
      .or-svg-bg{position:absolute;inset:0;width:100%;height:100%;pointer-events:none}
      .or-verse{position:absolute;top:72px;left:115px;right:115px;text-align:center;color:#00e234;font-size:43px;font-weight:800;line-height:1.55;text-shadow:0 3px 2px #000,0 0 9px #001c06}
      .or-day{position:absolute;top:245px;left:330px;right:330px;text-align:center;font-size:62px;font-weight:900;color:#ffe3ca;text-shadow:0 4px 1px #111,0 10px 0 #0008;-webkit-text-stroke:.5px #4b2c20}
      .or-date{position:absolute;top:274px;width:235px;text-align:center;color:#15ee39;font-weight:900;text-shadow:0 3px 2px #000}.or-date.greg{left:32px}.or-date.hijri{right:32px}
      .or-date-shape{position:relative;width:92px;height:92px;margin:0 auto}.or-date-shape.small{width:86px;height:76px;margin-top:8px}.or-date-shape svg{position:absolute;inset:0;width:100%;height:100%;overflow:visible}.or-date-shape span{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;color:#e8b747;font-size:50px;-webkit-text-stroke:1px #203326;text-shadow:0 2px 2px #000}.or-date-shape.small span{font-size:46px;color:#edbd49;-webkit-text-stroke:1px #101010}
      .or-date-month{margin-top:0;font-size:41px;line-height:1.15;color:#0ae432}.or-year{position:absolute;top:575px;font-size:48px;color:#ffe2a2;font-weight:800;text-shadow:0 3px 3px #000}.or-year.greg{left:185px}.or-year.hijri{right:162px}
      .or-prayers{position:absolute;top:662px;left:316px;right:316px;display:flex;flex-direction:column;gap:18px}.or-row{height:100px;display:grid;grid-template-columns:1fr 176px;align-items:center;column-gap:24px}.or-label{font-size:47px;font-weight:900;text-align:right;color:#ffe496;text-shadow:0 3px 2px #000}.or-time{font-size:55px;font-weight:900;text-align:left;color:#ffc000;direction:ltr;-webkit-text-stroke:1px #151515;text-shadow:0 4px 3px #000}
      .or-footer{position:absolute;left:145px;right:145px;bottom:18px;text-align:center;color:#baff36;font-size:34px;font-weight:900;text-shadow:0 3px 3px #000;white-space:nowrap}
      .ornate-ref-design .draggable{cursor:move;touch-action:none;user-select:none}.ornate-ref-design .dragging{outline:2px dashed #e0b354;outline-offset:4px}
    `;
    document.head.appendChild(s);
  }

  function monthNumber(id){const el=document.getElementById(id);return el?String(Math.max(1,el.selectedIndex+1)):'';}
  function starSvg(fill='#45ae65'){return `<svg viewBox="0 0 100 100" aria-hidden="true"><polygon points="50,1 61,19 82,13 80,36 99,50 80,64 82,87 61,81 50,99 39,81 18,87 20,64 1,50 20,36 18,13 39,19" fill="${fill}" stroke="#1f5137" stroke-width="2"/></svg>`;}
  function hexSvg(){return `<svg viewBox="0 0 100 88" aria-hidden="true"><polygon points="25,2 75,2 98,44 75,86 25,86 2,44" fill="#08797a" stroke="#0b5253" stroke-width="2"/></svg>`;}
  function sideSvg(){let spokes='';for(let i=0;i<24;i++){const a=i*15;spokes+=`<line x1="182" y1="305" x2="182" y2="78" transform="rotate(${a} 182 305)" stroke="#e1b35d" stroke-width="8"/>`;}return `<svg width="365" height="610" viewBox="0 0 365 610"><ellipse cx="182" cy="305" rx="176" ry="296" fill="#0a3336" stroke="#e1b35d" stroke-width="14"/>${spokes}<ellipse cx="182" cy="305" rx="112" ry="188" fill="#0a3033" stroke="#d9a84d" stroke-width="9"/><ellipse cx="182" cy="305" rx="60" ry="102" fill="#0b3839" stroke="#e1b35d" stroke-width="7"/></svg>`;}
  function bgSvg(){return `<svg class="or-svg-bg" viewBox="0 0 1024 1448" preserveAspectRatio="none" aria-hidden="true"><defs><radialGradient id="orGlow" cx="50%" cy="48%" r="65%"><stop offset="0" stop-color="#174d48" stop-opacity=".42"/><stop offset="1" stop-color="#071f22" stop-opacity="0"/></radialGradient><pattern id="orPattern" width="72" height="72" patternUnits="userSpaceOnUse"><circle cx="36" cy="36" r="26" fill="none" stroke="#1f5d58" stroke-opacity=".15" stroke-width="1"/><path d="M0 36H72M36 0V72" stroke="#1f5d58" stroke-opacity=".06"/></pattern></defs><rect width="1024" height="1448" fill="url(#orGlow)"/><rect width="1024" height="1448" fill="url(#orPattern)"/><rect x="50" y="52" width="924" height="1344" rx="42" fill="none" stroke="#e0b354" stroke-width="3"/><line x1="50" y1="192" x2="974" y2="192" stroke="#d7a948" stroke-width="2" opacity=".7"/><rect x="388" y="31" width="248" height="44" rx="4" fill="#08282b"/><text x="512" y="62" text-anchor="middle" font-size="28" fill="#dcb157">❋ ✦ ❋ ✦ ❋</text><g transform="translate(-210 445)">${sideSvg()}</g><g transform="translate(869 445)">${sideSvg()}</g><path d="M52 1055 L63 1080 L52 1105 L52 1218" stroke="#d9a84d" stroke-width="8" fill="none"/><path d="M972 1055 L961 1080 L972 1105 L972 1218" stroke="#d9a84d" stroke-width="8" fill="none"/></svg>`;}

  function make(){
    const d=document.createElement('div');d.id='designOrnateRef';d.className='ornate-ref-design';d.dataset.designKey='ornate-reference-v3';
    const rows=[['fajr','الفجر'],['sunrise','الشروق'],['dhuhr','الظهر'],['asr','العصر'],['maghrib','المغرب'],['isha','العشاء']].map(([f,l])=>`<div class="or-row draggable" data-prayer-row="${f}"><span class="or-label">${l}</span><b class="or-time" data-field="${f}"></b></div>`).join('');
    d.innerHTML=`${bgSvg()}<div class="or-verse draggable" data-field="quran">﴿إِنَّ الصَّلَاةَ كَانَتْ عَلَى الْمُؤْمِنِينَ كِتَابًا مَوْقُوتًا﴾</div><div class="or-day draggable" data-field="day"></div><div class="or-date greg draggable" data-save-key="ornate-greg-date"><div class="or-date-shape">${starSvg()}<span data-field="gday"></span></div><div class="or-date-shape small">${hexSvg()}<span data-num="gmonth"></span></div><div class="or-date-month" data-field="gmonth"></div></div><div class="or-date hijri draggable" data-save-key="ornate-hijri-date"><div class="or-date-shape">${starSvg()}<span data-field="hday"></span></div><div class="or-date-shape small">${hexSvg()}<span data-num="hmonth"></span></div><div class="or-date-month" data-field="hmonth"></div></div><div class="or-year greg draggable" data-field="gyear"></div><div class="or-year hijri draggable" data-field="hyear"></div><div class="or-prayers">${rows}</div><div class="or-footer draggable" data-field="footer"></div>`;
    return d;
  }

  function sync(){
    const d=document.getElementById('designOrnateRef');if(!d)return;
    const map={day:value('dayName'),gday:value('gregorianDay'),gmonth:value('gregorianMonth'),gyear:value('gregorianYear')?value('gregorianYear')+'م':'',hday:value('hijriDay'),hmonth:value('hijriMonth'),hyear:value('hijriYear')?value('hijriYear')+'هـ':'',fajr:value('fajr'),sunrise:value('sunrise'),dhuhr:value('dhuhr'),asr:value('asr'),maghrib:value('maghrib'),isha:value('isha'),footer:value('footerText')||'حسب التوقيت المحلي لمدينة الحويجة وضواحيها'};
    Object.entries(map).forEach(([k,v])=>d.querySelectorAll(`[data-field="${k}"]`).forEach(el=>el.textContent=v));
    const gm=d.querySelector('[data-num="gmonth"]'),hm=d.querySelector('[data-num="hmonth"]');if(gm)gm.textContent=monthNumber('gregorianMonth');if(hm)hm.textContent=monthNumber('hijriMonth');
  }

  function applyOwnBackground(){const d=document.getElementById('designOrnateRef');if(!d)return;if(document.getElementById('bgType')?.value==='gradient'){const a=document.getElementById('color1')?.value||'#08272b',b=document.getElementById('color2')?.value||'#0a3437';d.style.backgroundImage=`linear-gradient(180deg,${a} 0%,${b} 55%,${a} 100%)`;d.style.backgroundSize='cover';d.style.backgroundPosition='center';}}
  function bindBackground(){['color1','color2'].forEach(id=>document.getElementById(id)?.addEventListener('input',applyOwnBackground));document.getElementById('bgType')?.addEventListener('change',()=>{if(document.getElementById('bgType')?.value==='gradient')applyOwnBackground();});document.getElementById('bgFile')?.addEventListener('change',e=>{const file=e.target.files?.[0];if(!file)return;const r=new FileReader();r.onload=()=>{const d=document.getElementById('designOrnateRef');if(d){d.style.backgroundImage=`url("${r.result}")`;d.style.backgroundSize='cover';d.style.backgroundPosition='center';}};r.readAsDataURL(file);});}

  function resize(){const p=document.querySelector('.previewBox'),car=document.querySelector('.design-carousel'),d=document.getElementById('designOrnateRef');if(!p||!car||!d)return;let sc=1;if(innerWidth<=800){const cs=getComputedStyle(p),avail=Math.max(220,p.clientWidth-parseFloat(cs.paddingLeft||0)-parseFloat(cs.paddingRight||0)-2);sc=Math.min(1,avail/W)}d.style.zoom=String(sc);car.style.height=Math.max(parseInt(car.style.height)||0,Math.ceil(H*sc))+'px'}
  function init(){let tries=0;const t=setInterval(()=>{tries++;const track=document.querySelector('.design-carousel-track');if(!track){if(tries>100)clearInterval(t);return}clearInterval(t);addStyles();if(!document.getElementById('designOrnateRef')){const slide=document.createElement('div');slide.className='design-slide';slide.dataset.designKey='ornate-reference-v3';slide.appendChild(make());track.appendChild(slide)}sync();bindBackground();ids.forEach(id=>{document.getElementById(id)?.addEventListener('change',sync);document.getElementById(id)?.addEventListener('input',sync)});document.addEventListener('prayerPreviewDateChanged',sync);window.addEventListener('resize',resize,{passive:true});resize();window.dispatchEvent(new CustomEvent('prayerDesignListChanged'));},150)}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();