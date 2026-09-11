"use strict";
(function(){
  const W=1024,H=1448;
  const ids=["dayName","gregorianDay","gregorianMonth","gregorianYear","hijriDay","hijriMonth","hijriYear","fajr","sunrise","dhuhr","asr","maghrib","isha","footerText"];
  const value=id=>document.getElementById(id)?.value||"";

  function addStyles(){
    if(document.getElementById('ornateRefStyles'))return;
    const s=document.createElement('style');s.id='ornateRefStyles';s.textContent=`
      .ornate-ref-design{position:relative;width:${W}px;height:${H}px;flex:0 0 ${W}px;overflow:hidden;direction:rtl;transform-origin:top center;background:linear-gradient(180deg,#08272b 0%,#0a3437 48%,#0b3538 100%);color:#f8d98c;font-family:inherit;box-shadow:inset 0 0 150px #001416}
      .ornate-ref-design:before{content:"";position:absolute;inset:-90px;background:repeating-radial-gradient(circle at 50% 48%,rgba(41,99,91,.13) 0 2px,transparent 2px 58px),repeating-conic-gradient(from 0deg at 50% 48%,rgba(31,94,87,.08) 0 5deg,transparent 5deg 12deg);opacity:.62;pointer-events:none}
      .ornate-ref-design:after{content:"";position:absolute;left:250px;right:250px;top:335px;height:760px;border-radius:50%;background:radial-gradient(circle,rgba(18,72,68,.27),transparent 65%);pointer-events:none}
      .or-frame{position:absolute;left:50px;right:50px;top:52px;bottom:52px;border:3px solid #e0b354;border-radius:42px;pointer-events:none;box-shadow:0 0 0 1px rgba(255,231,166,.18)}
      .or-frame:before{content:"❋ ✦ ❋ ✦ ❋";position:absolute;top:-25px;left:50%;transform:translateX(-50%);padding:0 18px;background:#08282b;color:#dcb157;font-size:28px;letter-spacing:8px;white-space:nowrap}
      .or-frame:after{content:"";position:absolute;left:-3px;right:-3px;top:140px;height:2px;background:linear-gradient(90deg,#d7a948,transparent 30%,transparent 70%,#d7a948)}
      .or-side{position:absolute;top:445px;width:365px;height:610px;border-radius:50%;background:repeating-conic-gradient(from 0deg,#d9a94d 0 5deg,#0a3a3d 5deg 11deg);box-shadow:inset 0 0 0 15px #e1b35d,inset 0 0 0 31px #082d31,inset 0 0 0 36px #d7a649;opacity:.99;filter:drop-shadow(0 3px 4px #0006)}
      .or-side:before{content:"";position:absolute;inset:35px;border-radius:50%;background:repeating-conic-gradient(from 10deg,#0a3437 0 6deg,#d8a64a 6deg 10deg,#0a3437 10deg 18deg);box-shadow:inset 0 0 0 8px #d9a84d}
      .or-side:after{content:"";position:absolute;inset:92px;border-radius:50%;background:repeating-conic-gradient(#e1b45c 0 9deg,#0a3034 9deg 20deg);box-shadow:inset 0 0 0 6px #dbab50}
      .or-side.left{left:-238px}.or-side.right{right:-238px}
      .or-side-leaf{position:absolute;top:1060px;width:22px;height:165px;background:linear-gradient(#e5ba61,#c99436);clip-path:polygon(45% 0,58% 0,58% 32%,100% 24%,62% 47%,62% 100%,40% 100%,40% 47%,0 24%,42% 32%);opacity:.95}.or-side-leaf.left{left:42px}.or-side-leaf.right{right:42px}
      .or-verse{position:absolute;top:72px;left:115px;right:115px;text-align:center;color:#00e234;font-size:43px;font-weight:800;line-height:1.55;text-shadow:0 3px 2px #000,0 0 9px #001c06}
      .or-day{position:absolute;top:245px;left:330px;right:330px;text-align:center;font-size:62px;font-weight:900;color:#ffe3ca;text-shadow:0 4px 1px #111,0 10px 0 #0008;-webkit-text-stroke:.5px #4b2c20}
      .or-date{position:absolute;top:274px;width:235px;text-align:center;color:#15ee39;font-weight:900;text-shadow:0 3px 2px #000}.or-date.greg{left:32px}.or-date.hijri{right:32px}
      .or-date-day{display:flex;align-items:center;justify-content:center;margin:auto;width:90px;height:90px;clip-path:polygon(50% 0,62% 18%,84% 13%,82% 36%,100% 50%,82% 64%,84% 87%,62% 82%,50% 100%,38% 82%,16% 87%,18% 64%,0 50%,18% 36%,16% 13%,38% 18%);background:#45ae65;color:#e8b747;font-size:50px;-webkit-text-stroke:1px #203326;text-shadow:0 2px 2px #000}
      .or-date-monthnum{display:flex;align-items:center;justify-content:center;margin:8px auto 0;width:84px;height:76px;clip-path:polygon(25% 0,75% 0,100% 50%,75% 100%,25% 100%,0 50%);background:#08797a;color:#edbd49;font-size:46px;-webkit-text-stroke:1px #101010;text-shadow:0 2px 2px #000}
      .or-date-month{margin-top:0;font-size:41px;line-height:1.15;color:#0ae432}.or-year{position:absolute;top:575px;font-size:48px;color:#ffe2a2;font-weight:800;text-shadow:0 3px 3px #000}.or-year.greg{left:185px}.or-year.hijri{right:162px}
      .or-prayers{position:absolute;top:662px;left:316px;right:316px;display:flex;flex-direction:column;gap:18px}.or-row{height:100px;display:grid;grid-template-columns:1fr 176px;align-items:center;column-gap:24px}.or-label{font-size:47px;font-weight:900;text-align:right;color:#ffe496;text-shadow:0 3px 2px #000}.or-time{font-size:55px;font-weight:900;text-align:left;color:#ffc000;direction:ltr;-webkit-text-stroke:1px #151515;text-shadow:0 4px 3px #000}
      .or-footer{position:absolute;left:145px;right:145px;bottom:18px;text-align:center;color:#baff36;font-size:34px;font-weight:900;text-shadow:0 3px 3px #000;white-space:nowrap}
      .ornate-ref-design .draggable{cursor:move;touch-action:none;user-select:none}.ornate-ref-design .dragging{outline:2px dashed #e0b354;outline-offset:4px}
      .ornate-carousel-controls{display:flex;align-items:center;justify-content:center;gap:10px;margin:10px 0 2px}.ornate-carousel-btn{border:1px solid rgba(255,255,255,.22);background:#0c2230;color:#fff;width:42px;height:38px;border-radius:8px;font-size:22px;cursor:pointer}.ornate-carousel-status{font-size:13px;color:#d7e2e8;min-width:110px;text-align:center}.ornate-carousel-dots{display:flex;gap:6px;justify-content:center;margin:6px 0}.ornate-carousel-dot{width:9px;height:9px;border:0;border-radius:50%;background:#667782;padding:0}.ornate-carousel-dot.active{background:#e8bd58;transform:scale(1.2)}
    `;document.head.appendChild(s);
  }

  function monthNumber(id){const el=document.getElementById(id);if(!el)return '';return String(Math.max(1,el.selectedIndex+1));}
  function make(){
    const d=document.createElement('div');d.id='designOrnateRef';d.className='ornate-ref-design';d.dataset.designKey='ornate-reference-v2';
    const rows=[['fajr','الفجر'],['sunrise','الشروق'],['dhuhr','الظهر'],['asr','العصر'],['maghrib','المغرب'],['isha','العشاء']].map(([f,l])=>`<div class="or-row draggable" data-prayer-row="${f}"><span class="or-label">${l}</span><b class="or-time" data-field="${f}"></b></div>`).join('');
    d.innerHTML=`<div class="or-frame"></div><div class="or-side left"></div><div class="or-side right"></div><div class="or-side-leaf left"></div><div class="or-side-leaf right"></div><div class="or-verse draggable" data-field="quran">﴿إِنَّ الصَّلَاةَ كَانَتْ عَلَى الْمُؤْمِنِينَ كِتَابًا مَوْقُوتًا﴾</div><div class="or-day draggable" data-field="day"></div><div class="or-date greg draggable" data-save-key="ornate-greg-date"><div class="or-date-day" data-field="gday"></div><div class="or-date-monthnum" data-num="gmonth"></div><div class="or-date-month" data-field="gmonth"></div></div><div class="or-date hijri draggable" data-save-key="ornate-hijri-date"><div class="or-date-day" data-field="hday"></div><div class="or-date-monthnum" data-num="hmonth"></div><div class="or-date-month" data-field="hmonth"></div></div><div class="or-year greg draggable" data-field="gyear"></div><div class="or-year hijri draggable" data-field="hyear"></div><div class="or-prayers">${rows}</div><div class="or-footer draggable" data-field="footer"></div>`;
    return d;
  }

  function sync(){
    const d=document.getElementById('designOrnateRef');if(!d)return;
    const map={day:value('dayName'),gday:value('gregorianDay'),gmonth:value('gregorianMonth'),gyear:value('gregorianYear')?value('gregorianYear')+'م':'',hday:value('hijriDay'),hmonth:value('hijriMonth'),hyear:value('hijriYear')?value('hijriYear')+'هـ':'',fajr:value('fajr'),sunrise:value('sunrise'),dhuhr:value('dhuhr'),asr:value('asr'),maghrib:value('maghrib'),isha:value('isha'),footer:value('footerText')||'حسب التوقيت المحلي لمدينة الحويجة وضواحيها'};
    Object.entries(map).forEach(([k,v])=>d.querySelectorAll(`[data-field="${k}"]`).forEach(el=>el.textContent=v));
    const q=d.querySelector('[data-field="quran"]');if(q&&!q.textContent.trim())q.textContent='﴿إِنَّ الصَّلَاةَ كَانَتْ عَلَى الْمُؤْمِنِينَ كِتَابًا مَوْقُوتًا﴾';
    const gm=d.querySelector('[data-num="gmonth"]'),hm=d.querySelector('[data-num="hmonth"]');if(gm)gm.textContent=monthNumber('gregorianMonth');if(hm)hm.textContent=monthNumber('hijriMonth');
  }

  function applyOwnBackground(){
    const d=document.getElementById('designOrnateRef');if(!d)return;
    const type=document.getElementById('bgType')?.value;
    if(type==='gradient'){
      const a=document.getElementById('color1')?.value||'#08272b',b=document.getElementById('color2')?.value||'#0a3437';
      d.style.backgroundImage=`linear-gradient(180deg,${a} 0%,${b} 55%,${a} 100%)`;
      d.style.backgroundSize='cover';d.style.backgroundPosition='center';
    }
  }
  function bindBackground(){
    ['color1','color2'].forEach(id=>document.getElementById(id)?.addEventListener('input',applyOwnBackground));
    document.getElementById('bgType')?.addEventListener('change',()=>{if(document.getElementById('bgType')?.value==='gradient')applyOwnBackground();});
    document.getElementById('bgFile')?.addEventListener('change',e=>{const file=e.target.files?.[0];if(!file)return;const r=new FileReader();r.onload=()=>{const d=document.getElementById('designOrnateRef');if(d){d.style.backgroundImage=`url("${r.result}")`;d.style.backgroundSize='cover';d.style.backgroundPosition='center';}};r.readAsDataURL(file);});
  }

  function controls(){
    const track=document.querySelector('.design-carousel-track'),car=document.querySelector('.design-carousel');if(!track||!car)return;
    const slides=Array.from(track.children).filter(x=>x.classList.contains('design-slide')&&getComputedStyle(x).display!=='none'),total=slides.length,parent=car.parentElement;
    parent.querySelectorAll('.design-carousel-controls,.design-carousel-dots,.night-carousel-controls,.night-carousel-dots,.final-carousel-controls,.final-carousel-dots,.unified-preview-controls,.unified-preview-dots').forEach(el=>el.style.display='none');
    let c=parent.querySelector('.ornate-carousel-controls'),dots=parent.querySelector('.ornate-carousel-dots');if(!c){c=document.createElement('div');c.className='ornate-carousel-controls';c.innerHTML='<button class="ornate-carousel-btn" data-prev>‹</button><span class="ornate-carousel-status"></span><button class="ornate-carousel-btn" data-next>›</button>';dots=document.createElement('div');dots.className='ornate-carousel-dots';parent.append(c,dots)}
    c.style.display='flex';dots.style.display='flex';
    dots.innerHTML=Array.from({length:total},(_,i)=>`<button class="ornate-carousel-dot" data-dot="${i}"></button>`).join('');let active=Math.min(Number(window.__prayerActiveVisibleIndex ?? window.__prayerActiveDesignIndex)||0,total-1);
    function render(){active=(active+total)%total;track.style.transform=`translateX(-${active*100}%)`;window.__prayerActiveDesignIndex=active;window.__prayerActiveVisibleIndex=active;c.querySelector('.ornate-carousel-status').textContent=`التصميم ${active+1} من ${total}`;dots.querySelectorAll('[data-dot]').forEach((x,i)=>x.classList.toggle('active',i===active));window.__prayerActiveDesignElement=slides[active]?.firstElementChild||null;window.dispatchEvent(new CustomEvent('prayerDesignChanged',{detail:{index:active,design:window.__prayerActiveDesignElement}}));resize()}
    c.querySelector('[data-prev]').onclick=()=>{active--;render()};c.querySelector('[data-next]').onclick=()=>{active++;render()};dots.querySelectorAll('[data-dot]').forEach(x=>x.onclick=()=>{active=Number(x.dataset.dot)||0;render()});render();
  }

  function resize(){const p=document.querySelector('.previewBox'),car=document.querySelector('.design-carousel'),d=document.getElementById('designOrnateRef');if(!p||!car||!d)return;let sc=1;if(innerWidth<=800){const cs=getComputedStyle(p),avail=Math.max(220,p.clientWidth-parseFloat(cs.paddingLeft||0)-parseFloat(cs.paddingRight||0)-2);sc=Math.min(1,avail/W)}d.style.zoom=String(sc);car.style.height=Math.ceil(H*sc)+'px'}
  function init(){let tries=0;const t=setInterval(()=>{tries++;const track=document.querySelector('.design-carousel-track');if(!track){if(tries>100)clearInterval(t);return}clearInterval(t);addStyles();if(!document.getElementById('designOrnateRef')){const slide=document.createElement('div');slide.className='design-slide';slide.dataset.designKey='ornate-reference-v2';slide.appendChild(make());track.appendChild(slide)}sync();controls();bindBackground();ids.forEach(id=>{document.getElementById(id)?.addEventListener('change',sync);document.getElementById(id)?.addEventListener('input',sync)});document.addEventListener('prayerPreviewDateChanged',sync);window.addEventListener('resize',resize,{passive:true});resize()},150)}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();