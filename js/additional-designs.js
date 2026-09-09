"use strict";

(function(){
  const WIDTH=1024, HEIGHT=1448, TOTAL=5;
  let activeIndex=0;

  function value(id){return document.getElementById(id)?.value||"";}
  function mapData(){return {
    day:value("dayName"),gday:value("gregorianDay"),gmonth:value("gregorianMonth"),gyear:value("gregorianYear")?value("gregorianYear")+"م":"",
    hday:value("hijriDay"),hmonth:value("hijriMonth"),hyear:value("hijriYear")?value("hijriYear")+"هـ":"",
    fajr:value("fajr"),sunrise:value("sunrise"),dhuhr:value("dhuhr"),asr:value("asr"),maghrib:value("maghrib"),isha:value("isha"),footer:value("footerText")
  };}

  function injectStyles(){
    if(document.getElementById("additionalDesignStyles"))return;
    const s=document.createElement("style");
    s.id="additionalDesignStyles";
    s.textContent=`
      .fourth-design,.fifth-design{position:relative;width:1024px;height:1448px;flex:0 0 1024px;overflow:hidden;direction:rtl;transform-origin:top center}
      .fourth-design{color:#183b57;background:linear-gradient(180deg,#ddecf7 0%,#f8fbfd 32%,#eef5f7 100%);box-shadow:inset 0 0 120px rgba(35,78,106,.12)}
      .fourth-design:before{content:"";position:absolute;left:64px;right:64px;top:46px;bottom:46px;border:3px solid #c8a95c;border-radius:48% 48% 34px 34px/18% 18% 34px 34px;pointer-events:none}
      .fourth-design:after{content:"";position:absolute;left:110px;right:110px;top:100px;height:330px;border:2px solid rgba(200,169,92,.55);border-bottom:0;border-radius:420px 420px 0 0/250px 250px 0 0;pointer-events:none}
      .sd4-sky{position:absolute;inset:0;background:radial-gradient(circle at 14% 20%,rgba(255,255,255,.85),transparent 13%),radial-gradient(circle at 82% 17%,rgba(255,255,255,.78),transparent 15%),linear-gradient(180deg,rgba(99,169,207,.18),transparent 38%);pointer-events:none}
      .sd4-title{position:absolute;top:118px;left:130px;right:130px;text-align:center;font-size:54px;font-weight:800;color:#163f60}
      .sd4-verse{position:absolute;top:192px;left:150px;right:150px;text-align:center;font-size:25px;color:#557287}
      .sd4-day{position:absolute;top:292px;left:357px;width:310px;height:102px;border-radius:52px;background:#163f60;color:#fff;display:flex;align-items:center;justify-content:center;font-size:41px;font-weight:800;box-shadow:0 12px 30px rgba(31,73,104,.22)}
      .sd4-date-card{position:absolute;top:438px;width:300px;height:165px;border:2px solid #d4b76d;border-radius:28px;background:rgba(255,255,255,.88);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;box-shadow:0 12px 28px rgba(38,80,106,.12)}
      .sd4-date-card.greg{left:145px}.sd4-date-card.hijri{right:145px}
      .sd4-date-number{font-size:56px;font-weight:800;color:#173f5d;line-height:1}.sd4-date-month{font-size:25px;font-weight:700;color:#365f77}.sd4-date-year{font-size:21px;color:#758793}
      .sd4-prayers{position:absolute;top:650px;left:112px;right:112px;display:flex;flex-direction:column;gap:17px}
      .sd4-prayer-row{height:92px;border:1px solid rgba(53,92,116,.22);border-radius:46px;background:rgba(255,255,255,.92);display:flex;align-items:center;justify-content:space-between;padding:0 48px;box-shadow:0 8px 20px rgba(36,77,102,.10)}
      .sd4-prayer-label{font-size:33px;font-weight:800;color:#183f5c}.sd4-prayer-time{font-size:42px;font-weight:800;color:#2d719a;direction:ltr}
      .sd4-footer{position:absolute;left:120px;right:120px;bottom:74px;min-height:112px;border:2px solid #d4b76d;border-radius:28px;background:rgba(255,255,255,.88);display:flex;align-items:center;justify-content:center;text-align:center;padding:18px 32px;font-size:25px;color:#345b70}

      .fifth-design{color:#fff7e8;background:linear-gradient(160deg,#5a241f 0%,#7d3d2d 43%,#b47a4b 100%);box-shadow:inset 0 0 140px rgba(31,10,9,.32)}
      .fifth-design:before{content:"";position:absolute;inset:44px;border:3px solid #efcf91;border-radius:26px;box-shadow:inset 0 0 0 8px rgba(93,36,30,.22);pointer-events:none}
      .fifth-design:after{content:"◆ ◇ ◆ ◇ ◆";position:absolute;top:40px;left:0;right:0;text-align:center;font-size:34px;letter-spacing:28px;color:rgba(247,214,153,.65);pointer-events:none}
      .sd5-pattern{position:absolute;inset:0;background:linear-gradient(45deg,rgba(255,255,255,.025) 25%,transparent 25%,transparent 75%,rgba(255,255,255,.025) 75%),linear-gradient(-45deg,rgba(255,255,255,.02) 25%,transparent 25%,transparent 75%,rgba(255,255,255,.02) 75%);background-size:54px 54px;pointer-events:none}
      .sd5-badge{position:absolute;top:108px;left:340px;width:344px;height:116px;border:2px solid #efcf91;border-radius:16px 54px 16px 54px;background:rgba(67,25,24,.52);display:flex;align-items:center;justify-content:center;font-size:47px;font-weight:800;color:#fff2cf;box-shadow:0 12px 34px rgba(31,8,8,.24)}
      .sd5-subtitle{position:absolute;top:252px;left:140px;right:140px;text-align:center;font-size:30px;color:#f4d9aa}
      .sd5-date-strip{position:absolute;top:330px;left:92px;right:92px;display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px}
      .sd5-mini{height:150px;border:1px solid rgba(250,217,157,.55);border-radius:22px;background:rgba(75,27,25,.45);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px}
      .sd5-mini.day{background:#f0d39b;color:#642d25}.sd5-mini-num{font-size:48px;font-weight:800;line-height:1}.sd5-mini-text{font-size:22px;font-weight:700}.sd5-mini-year{font-size:18px;opacity:.84}
      .sd5-prayers{position:absolute;top:550px;left:86px;right:86px;display:grid;grid-template-columns:1fr 1fr;gap:18px}
      .sd5-prayer-row{height:150px;border-radius:26px;background:rgba(67,24,23,.62);border:1px solid rgba(245,211,151,.55);display:flex;align-items:center;justify-content:space-between;padding:0 34px;box-shadow:0 10px 24px rgba(38,9,9,.18)}
      .sd5-prayer-label{font-size:29px;font-weight:800;color:#ffe4ad}.sd5-prayer-time{font-size:44px;font-weight:800;color:#fff;direction:ltr}
      .sd5-quote{position:absolute;left:130px;right:130px;bottom:190px;text-align:center;font-size:32px;font-weight:700;color:#ffe6b3}
      .sd5-footer{position:absolute;left:105px;right:105px;bottom:72px;text-align:center;font-size:23px;color:#f3d6a5;border-top:1px solid rgba(245,211,151,.45);padding-top:24px}
      .fourth-design .draggable,.fifth-design .draggable{cursor:move;touch-action:none;user-select:none}
      .fourth-design .dragging{outline:2px dashed #2d719a;outline-offset:4px}.fifth-design .dragging{outline:2px dashed #efcf91;outline-offset:4px}
    `;
    document.head.appendChild(s);
  }

  function design4(){
    const d=document.createElement("div");d.id="design4";d.className="fourth-design";
    d.innerHTML=`<div class="sd4-sky"></div><div class="sd4-title draggable">مواقيت الصلاة</div><div class="sd4-verse draggable">﴿ إِنَّ الصَّلَاةَ كَانَتْ عَلَى الْمُؤْمِنِينَ كِتَابًا مَوْقُوتًا ﴾</div><div class="sd4-day draggable" data-field="day"></div>
    <div class="sd4-date-card greg draggable"><div class="sd4-date-number" data-field="gday"></div><div class="sd4-date-month" data-field="gmonth"></div><div class="sd4-date-year" data-field="gyear"></div></div>
    <div class="sd4-date-card hijri draggable"><div class="sd4-date-number" data-field="hday"></div><div class="sd4-date-month" data-field="hmonth"></div><div class="sd4-date-year" data-field="hyear"></div></div>
    <div class="sd4-prayers">${rows("sd4")}</div><div class="sd4-footer draggable" data-field="footer"></div>`;return d;
  }
  function design5(){
    const d=document.createElement("div");d.id="design5";d.className="fifth-design";
    d.innerHTML=`<div class="sd5-pattern"></div><div class="sd5-badge draggable" data-field="day"></div><div class="sd5-subtitle draggable">الصلاة موعدٌ للسكينة</div>
    <div class="sd5-date-strip"><div class="sd5-mini draggable"><div class="sd5-mini-num" data-field="gday"></div><div class="sd5-mini-text" data-field="gmonth"></div><div class="sd5-mini-year" data-field="gyear"></div></div><div class="sd5-mini day draggable"><div class="sd5-mini-text">التاريخ</div><div class="sd5-mini-num">✦</div></div><div class="sd5-mini draggable"><div class="sd5-mini-num" data-field="hday"></div><div class="sd5-mini-text" data-field="hmonth"></div><div class="sd5-mini-year" data-field="hyear"></div></div></div>
    <div class="sd5-prayers">${rows("sd5")}</div><div class="sd5-quote draggable">حافظ على صلاتك، فهي نور يومك</div><div class="sd5-footer draggable" data-field="footer"></div>`;return d;
  }
  function rows(prefix){return [["fajr","الفجر"],["sunrise","الشروق"],["dhuhr","الظهر"],["asr","العصر"],["maghrib","المغرب"],["isha","العشاء"]].map(([f,l])=>`<div class="${prefix}-prayer-row draggable"><span class="${prefix}-prayer-label">${l}</span><b class="${prefix}-prayer-time" data-field="${f}"></b></div>`).join("");}

  function sync(){const m=mapData();[document.getElementById("design4"),document.getElementById("design5")].forEach(d=>{if(!d)return;Object.entries(m).forEach(([k,v])=>d.querySelectorAll(`[data-field="${k}"]`).forEach(el=>el.textContent=v));});}

  function setupDragging(design){design.querySelectorAll(".draggable").forEach(el=>{let drag=false,sx=0,sy=0,bx=0,by=0,scale=1;const p=e=>e.touches?e.touches[0]:e;const start=e=>{if(e.button!==undefined&&e.button!==0)return;const q=p(e),r=design.getBoundingClientRect();scale=r.width/design.offsetWidth||1;sx=q.clientX;sy=q.clientY;bx=parseFloat(el.dataset.x)||0;by=parseFloat(el.dataset.y)||0;drag=true;el.classList.add("dragging");e.preventDefault()};const move=e=>{if(!drag)return;const q=p(e),x=bx+(q.clientX-sx)/scale,y=by+(q.clientY-sy)/scale;el.dataset.x=x;el.dataset.y=y;el.style.transform=`translate(${x}px, ${y}px)`;e.preventDefault()};const end=()=>{drag=false;el.classList.remove("dragging")};el.addEventListener("mousedown",start);window.addEventListener("mousemove",move,{passive:false});window.addEventListener("mouseup",end);el.addEventListener("touchstart",start,{passive:false});window.addEventListener("touchmove",move,{passive:false});window.addEventListener("touchend",end)});}

  function restore(){try{const saved=JSON.parse(localStorage.getItem("prayerDesignerSavedAdjustmentsV1")||"null");if(!Array.isArray(saved))return;const all=Array.from(document.querySelectorAll(".draggable"));saved.forEach(item=>{const el=all[item.index];if(!el||(!document.getElementById("design4")?.contains(el)&&!document.getElementById("design5")?.contains(el)))return;el.dataset.x=String(item.x??0);el.dataset.y=String(item.y??0);if(item.style)el.setAttribute("style",item.style)})}catch(e){console.error(e)}}

  function rebuildCarousel(){
    const carousel=document.querySelector(".design-carousel"),track=document.querySelector(".design-carousel-track");if(!carousel||!track)return false;
    if(document.getElementById("design4")||document.getElementById("design5"))return true;
    const d4=design4(),d5=design5();[d4,d5].forEach(d=>{const slide=document.createElement("div");slide.className="design-slide";slide.appendChild(d);track.appendChild(slide)});setupDragging(d4);setupDragging(d5);sync();restore();

    const oldControls=document.querySelector(".design-carousel-controls"),oldDots=document.querySelector(".design-carousel-dots");
    if(oldControls){const c=oldControls.cloneNode(false);c.className="design-carousel-controls";c.innerHTML=`<button class="design-carousel-btn" data-prev aria-label="السابق">‹</button><span class="design-carousel-status">التصميم 1 من 5</span><button class="design-carousel-btn" data-next aria-label="التالي">›</button>`;oldControls.replaceWith(c)}
    if(oldDots){const d=oldDots.cloneNode(false);d.className="design-carousel-dots";d.innerHTML=Array.from({length:TOTAL},(_,i)=>`<button class="design-carousel-dot${i===0?" active":""}" data-dot="${i}"></button>`).join("");oldDots.replaceWith(d)}
    const controls=document.querySelector(".design-carousel-controls"),dots=document.querySelector(".design-carousel-dots");
    const render=()=>{track.style.transform=`translateX(-${activeIndex*100}%)`;controls.querySelector(".design-carousel-status").textContent=`التصميم ${activeIndex+1} من ${TOTAL}`;dots.querySelectorAll(".design-carousel-dot").forEach((x,i)=>x.classList.toggle("active",i===activeIndex));resize()};
    controls.querySelector("[data-prev]").onclick=()=>{activeIndex=(activeIndex-1+TOTAL)%TOTAL;render()};controls.querySelector("[data-next]").onclick=()=>{activeIndex=(activeIndex+1)%TOTAL;render()};dots.querySelectorAll("[data-dot]").forEach(x=>x.onclick=()=>{activeIndex=Number(x.dataset.dot);render()});
    carousel.addEventListener("touchstart",e=>{if(e.target.closest(".draggable"))return;carousel.dataset.swipeX=e.touches[0].clientX},{capture:true,passive:true});
    carousel.addEventListener("touchend",e=>{if(carousel.dataset.swipeX==="")return;const dx=e.changedTouches[0].clientX-Number(carousel.dataset.swipeX);carousel.dataset.swipeX="";if(Math.abs(dx)>45){e.stopImmediatePropagation();activeIndex=dx<0?Math.min(TOTAL-1,activeIndex+1):Math.max(0,activeIndex-1);render()}},{capture:true,passive:true});
    render();return true;
  }

  function resize(){const p=document.querySelector(".previewBox"),car=document.querySelector(".design-carousel"),designs=["design","design2","design3","design4","design5"].map(id=>document.getElementById(id));if(!p||!car||designs.some(x=>!x))return;if(window.innerWidth>800){designs.forEach(d=>d.style.zoom="1");car.style.height=HEIGHT+"px";return}const cs=getComputedStyle(p),pad=parseFloat(cs.paddingLeft||0)+parseFloat(cs.paddingRight||0),avail=Math.max(220,p.clientWidth-pad-2),sc=Math.min(1,avail/WIDTH);designs.forEach(d=>d.style.zoom=String(sc));car.style.height=Math.ceil(HEIGHT*sc)+"px";}

  function rr(ctx,r,rad=24){ctx.beginPath();if(ctx.roundRect)ctx.roundRect(r.x,r.y,r.w,r.h,rad);else ctx.rect(r.x,r.y,r.w,r.h)}
  function rect(el,d){const r=el.getBoundingClientRect(),dr=d.getBoundingClientRect(),s=dr.width/d.offsetWidth||1;return{x:(r.left-dr.left)/s,y:(r.top-dr.top)/s,w:r.width/s,h:r.height/s}}
  function text(ctx,el,d){if(!el)return;const r=rect(el,d),st=getComputedStyle(el),fs=parseFloat(st.fontSize)||16,w=st.fontWeight||"400",fam=st.fontFamily||"Arial";ctx.save();ctx.font=`${w} ${fs}px ${fam}`;ctx.fillStyle=st.color||"#fff";ctx.textBaseline="top";ctx.textAlign=st.textAlign||"left";let x=r.x;if(st.textAlign==="center")x+=r.w/2;else if(st.textAlign==="right")x+=r.w;ctx.fillText(el.textContent.trim(),x,r.y);ctx.restore()}
  function download(canvas,format,name){const mime=format==="jpg"?"image/jpeg":format==="webp"?"image/webp":"image/png";canvas.toBlob(b=>{if(!b)return;const u=URL.createObjectURL(b),a=document.createElement("a");a.href=u;a.download=`${name}.${format}`;a.click();setTimeout(()=>URL.revokeObjectURL(u),1500)},mime,format==="png"?undefined:.98)}
  async function exportNew(id,format){const d=document.getElementById(id);if(!d)return;try{await document.fonts?.ready}catch(e){}const c=document.createElement("canvas"),S=2;c.width=WIDTH*S;c.height=HEIGHT*S;const ctx=c.getContext("2d");ctx.scale(S,S);if(id==="design4"){const g=ctx.createLinearGradient(0,0,0,HEIGHT);g.addColorStop(0,"#ddecf7");g.addColorStop(.32,"#f8fbfd");g.addColorStop(1,"#eef5f7");ctx.fillStyle=g;ctx.fillRect(0,0,WIDTH,HEIGHT);ctx.strokeStyle="#c8a95c";ctx.lineWidth=3;rr(ctx,{x:64,y:46,w:896,h:1356},34);ctx.stroke();d.querySelectorAll(".sd4-day,.sd4-date-card,.sd4-prayer-row,.sd4-footer").forEach(el=>{const r=rect(el,d);ctx.fillStyle=el.classList.contains("sd4-day")?"#163f60":"rgba(255,255,255,.94)";ctx.strokeStyle="#d4b76d";ctx.lineWidth=1.5;rr(ctx,r,el.classList.contains("sd4-prayer-row")?46:26);ctx.fill();ctx.stroke()});[".sd4-title",".sd4-verse",".sd4-day",".sd4-footer"].forEach(s=>text(ctx,d.querySelector(s),d));d.querySelectorAll(".sd4-date-card div,.sd4-prayer-row span,.sd4-prayer-row b").forEach(el=>text(ctx,el,d));}else{const g=ctx.createLinearGradient(0,0,WIDTH,HEIGHT);g.addColorStop(0,"#5a241f");g.addColorStop(.43,"#7d3d2d");g.addColorStop(1,"#b47a4b");ctx.fillStyle=g;ctx.fillRect(0,0,WIDTH,HEIGHT);ctx.strokeStyle="#efcf91";ctx.lineWidth=3;rr(ctx,{x:44,y:44,w:936,h:1360},26);ctx.stroke();d.querySelectorAll(".sd5-badge,.sd5-mini,.sd5-prayer-row").forEach(el=>{const r=rect(el,d);ctx.fillStyle=el.classList.contains("day")?"#f0d39b":"rgba(67,24,23,.72)";ctx.strokeStyle="rgba(245,211,151,.7)";ctx.lineWidth=1.5;rr(ctx,r,22);ctx.fill();ctx.stroke()});[".sd5-badge",".sd5-subtitle",".sd5-quote",".sd5-footer"].forEach(s=>text(ctx,d.querySelector(s),d));d.querySelectorAll(".sd5-mini div,.sd5-prayer-row span,.sd5-prayer-row b").forEach(el=>text(ctx,el,d));}download(c,format,id==="design4"?"prayer-design-4":"prayer-design-5")}

  function setupExport(){document.querySelectorAll("[data-export-format]").forEach(btn=>btn.addEventListener("click",e=>{if(activeIndex<3)return;e.preventDefault();e.stopImmediatePropagation();exportNew(activeIndex===3?"design4":"design5",btn.dataset.exportFormat||"png")},true));document.getElementById("exportBtn")?.addEventListener("click",e=>{if(activeIndex<3)return;e.preventDefault();e.stopImmediatePropagation();exportNew(activeIndex===3?"design4":"design5","png")},true)}
  function setupSync(){["dayName","hijriDay","gregorianDay","hijriMonth","gregorianMonth","hijriYear","gregorianYear","fajr","sunrise","dhuhr","asr","maghrib","isha"].forEach(id=>document.getElementById(id)?.addEventListener("change",()=>setTimeout(sync,0)));document.getElementById("footerText")?.addEventListener("input",sync);const p=document.getElementById("design");if(p)new MutationObserver(sync).observe(p,{subtree:true,childList:true,characterData:true})}

  function init(){injectStyles();let tries=0;const timer=setInterval(()=>{tries++;if(rebuildCarousel()||tries>40){clearInterval(timer);if(document.getElementById("design4")){setupSync();setupExport();resize();window.addEventListener("resize",resize,{passive:true});window.addEventListener("orientationchange",()=>setTimeout(resize,150),{passive:true})}}},150)}
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});else init();
})();
