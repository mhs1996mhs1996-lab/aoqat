"use strict";

(function(){
  const WIDTH=1024, HEIGHT=1448, TOTAL=6;
  let activeIndex=0;

  const value=id=>document.getElementById(id)?.value||"";
  const data=()=>({
    day:value("dayName"),
    gday:value("gregorianDay"), gmonth:value("gregorianMonth"), gyear:value("gregorianYear")?value("gregorianYear")+"م":"",
    hday:value("hijriDay"), hmonth:value("hijriMonth"), hyear:value("hijriYear")?value("hijriYear")+"هـ":"",
    fajr:value("fajr"), sunrise:value("sunrise"), dhuhr:value("dhuhr"), asr:value("asr"), maghrib:value("maghrib"), isha:value("isha"),
    footer:value("footerText")||"حسب التوقيت المحلي لمدينة الحويجة وضواحيها"
  });

  function injectStyles(){
    if(document.getElementById("ornateDesignStyles"))return;
    const s=document.createElement("style");
    s.id="ornateDesignStyles";
    s.textContent=`
      .ornate-design{position:relative;width:1024px;height:1448px;overflow:hidden;direction:rtl;transform-origin:top center;background:linear-gradient(180deg,#061427 0%,#081827 44%,#07131f 100%);color:#fff;box-shadow:inset 0 0 120px rgba(0,0,0,.55)}
      .ornate-design:before{content:"";position:absolute;inset:16px;border:3px solid #b87729;border-radius:18px;box-shadow:inset 0 0 0 6px rgba(206,144,53,.18);pointer-events:none}
      .od-lattice{position:absolute;top:18px;bottom:18px;width:76px;background:repeating-linear-gradient(45deg,rgba(208,143,47,.25) 0 2px,transparent 2px 13px),repeating-linear-gradient(-45deg,rgba(208,143,47,.18) 0 2px,transparent 2px 13px);border-inline:2px solid rgba(186,121,38,.48)}
      .od-lattice.left{left:20px}.od-lattice.right{right:20px}
      .od-inner{position:absolute;left:102px;right:102px;top:18px;bottom:22px}
      .od-arch{position:absolute;left:18px;right:18px;top:0;height:430px;border:5px solid #c98a35;border-bottom:0;border-radius:50% 50% 0 0/76% 76% 0 0;box-shadow:inset 0 0 0 4px rgba(212,153,62,.18);pointer-events:none}
      .od-title{position:absolute;top:78px;left:100px;right:100px;text-align:center;font-size:66px;font-weight:800;color:#fff7e2;text-shadow:0 4px 12px #000;z-index:3}
      .od-subtitle{position:absolute;top:165px;left:100px;right:100px;text-align:center;font-size:33px;color:#f0e6d6;z-index:3}
      .od-stars{position:absolute;left:80px;right:80px;top:45px;height:220px;background-image:radial-gradient(circle,#f5d28a 0 1.5px,transparent 1.8px);background-size:78px 72px;opacity:.18}
      .od-moon{position:absolute;top:238px;left:220px;width:380px;height:245px;border-radius:50%;background:radial-gradient(circle at 50% 50%,#f6e8cc 0 47%,#d4b579 68%,transparent 70%);filter:drop-shadow(0 0 24px rgba(255,214,132,.28));opacity:.95}
      .od-mosque{position:absolute;left:110px;right:110px;top:320px;height:230px;z-index:2;filter:drop-shadow(0 8px 8px #0009)}
      .od-mosque:before{content:"";position:absolute;left:170px;bottom:0;width:260px;height:124px;background:#071321;border-radius:145px 145px 10px 10px;box-shadow:-150px 18px 0 -42px #071321,150px 18px 0 -42px #071321}
      .od-mosque:after{content:"";position:absolute;left:285px;bottom:116px;width:28px;height:82px;background:#071321;clip-path:polygon(50% 0,100% 42%,70% 100%,30% 100%,0 42%)}
      .od-minaret{position:absolute;bottom:0;width:26px;height:172px;background:#071321}.od-minaret:before{content:"";position:absolute;left:-9px;top:45px;width:44px;height:11px;border-radius:9px;background:#071321}.od-minaret:after{content:"";position:absolute;left:7px;top:-44px;width:12px;height:53px;background:#071321;clip-path:polygon(50% 0,100% 55%,75% 100%,25% 100%,0 55%)}
      .od-minaret.a{left:38px}.od-minaret.b{right:38px}
      .od-date{position:absolute;top:530px;width:214px;height:190px;border:3px solid #c9a062;border-radius:18px;background:linear-gradient(180deg,#fffdf8,#e9dfcf);color:#09233f;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;box-shadow:0 10px 24px #0006;z-index:3}
      .od-date.greg{left:94px}.od-date.hijri{right:94px}
      .od-date-num{font-size:62px;font-weight:900;line-height:1}.od-date-month{font-size:27px;font-weight:800}.od-date-year{font-size:22px;font-weight:800}
      .od-day{position:absolute;top:552px;left:50%;transform:translateX(-50%);width:250px;height:148px;display:flex;align-items:center;justify-content:center;text-align:center;color:#f3c96b;font-size:47px;font-weight:900;background:#0b2945;border:3px solid #c99f58;clip-path:polygon(50% 0,61% 10%,78% 7%,88% 22%,100% 34%,92% 50%,100% 66%,86% 77%,79% 94%,61% 89%,50% 100%,39% 89%,21% 94%,14% 77%,0 66%,8% 50%,0 34%,12% 22%,22% 7%,39% 10%);z-index:3}
      .od-prayers{position:absolute;top:755px;left:145px;right:145px;display:flex;flex-direction:column;gap:11px;z-index:3}
      .od-row{height:86px;border:3px solid #cba25b;border-radius:28px;background:linear-gradient(90deg,#081625,#0a2237 52%,#071625);display:grid;grid-template-columns:82px 1fr 180px;align-items:center;padding:0 22px;box-shadow:0 7px 15px #0005}
      .od-icon{width:62px;height:62px;border-radius:50%;border:2px solid #cba25b;display:flex;align-items:center;justify-content:center;font-size:29px;background:#0b3654}.od-label{font-size:33px;font-weight:900;color:#f4d99d;text-align:center}.od-time{font-size:42px;font-weight:900;color:#fff;direction:ltr;text-align:left}
      .od-book{position:absolute;left:38px;bottom:140px;font-size:88px;transform:rotate(-12deg);filter:drop-shadow(0 8px 8px #0009);z-index:3}
      .od-lantern{position:absolute;right:36px;bottom:126px;font-size:102px;filter:drop-shadow(0 0 16px rgba(255,153,25,.45));z-index:3}
      .od-footer{position:absolute;left:150px;right:150px;bottom:40px;min-height:122px;border:3px solid #cba25b;border-radius:30px;background:#081b2d;color:#fff4d1;display:flex;align-items:center;justify-content:center;text-align:center;padding:16px 30px;font-size:33px;font-weight:800;box-shadow:0 10px 26px #0007;z-index:3}
      .ornate-design .draggable{cursor:move;touch-action:none;user-select:none}.ornate-design .dragging{outline:2px dashed #e7bf6f;outline-offset:4px}
    `;
    document.head.appendChild(s);
  }

  function rows(){
    const arr=[["fajr","الفجر","🕌"],["sunrise","الشروق","🌅"],["dhuhr","الظهر","🕌"],["asr","العصر","🕌"],["maghrib","المغرب","🌇"],["isha","العشاء","🌙"]];
    return arr.map(([f,l,i])=>`<div class="od-row draggable"><span class="od-icon">${i}</span><span class="od-label">${l}</span><b class="od-time" data-field="${f}"></b></div>`).join("");
  }

  function createDesign(){
    const d=document.createElement("div"); d.id="designOrnate"; d.className="ornate-design";
    d.innerHTML=`<div class="od-lattice left"></div><div class="od-lattice right"></div><div class="od-inner"><div class="od-arch"></div><div class="od-stars"></div><div class="od-title draggable">حافظ على صلاتك</div><div class="od-subtitle draggable">فهي نور لك في الدنيا والآخرة</div><div class="od-moon"></div><div class="od-mosque"><div class="od-minaret a"></div><div class="od-minaret b"></div></div><div class="od-date greg draggable"><div class="od-date-year" data-field="gyear"></div><div class="od-date-num" data-field="gday"></div><div class="od-date-month" data-field="gmonth"></div></div><div class="od-day draggable" data-field="day"></div><div class="od-date hijri draggable"><div class="od-date-num" data-field="hday"></div><div class="od-date-month" data-field="hmonth"></div><div class="od-date-year" data-field="hyear"></div></div><div class="od-prayers">${rows()}</div><div class="od-book">📖</div><div class="od-lantern">🏮</div><div class="od-footer draggable" data-field="footer"></div></div>`;
    return d;
  }

  function sync(){const m=data(),d=document.getElementById("designOrnate");if(!d)return;Object.entries(m).forEach(([k,v])=>d.querySelectorAll(`[data-field="${k}"]`).forEach(el=>el.textContent=v));}

  function setupDragging(design){design.querySelectorAll(".draggable").forEach(el=>{let dragging=false,sx=0,sy=0,bx=0,by=0,scale=1;const point=e=>e.touches?e.touches[0]:e;const start=e=>{if(e.button!==undefined&&e.button!==0)return;const p=point(e),r=design.getBoundingClientRect();scale=r.width/design.offsetWidth||1;sx=p.clientX;sy=p.clientY;bx=parseFloat(el.dataset.x)||0;by=parseFloat(el.dataset.y)||0;dragging=true;el.classList.add("dragging");e.preventDefault()};const move=e=>{if(!dragging)return;const p=point(e),x=bx+(p.clientX-sx)/scale,y=by+(p.clientY-sy)/scale;el.dataset.x=x;el.dataset.y=y;el.style.transform=`translate(${x}px,${y}px)`;e.preventDefault()};const end=()=>{dragging=false;el.classList.remove("dragging")};el.addEventListener("mousedown",start);window.addEventListener("mousemove",move,{passive:false});window.addEventListener("mouseup",end);el.addEventListener("touchstart",start,{passive:false});window.addEventListener("touchmove",move,{passive:false});window.addEventListener("touchend",end)});}

  function resize(){const p=document.querySelector(".previewBox"),car=document.querySelector(".design-carousel"),d=document.getElementById("designOrnate");if(!p||!car||!d)return;if(window.innerWidth>800){d.style.zoom="1";car.style.height=HEIGHT+"px";return}const cs=getComputedStyle(p),pad=parseFloat(cs.paddingLeft||0)+parseFloat(cs.paddingRight||0),avail=Math.max(220,p.clientWidth-pad-2),sc=Math.min(1,avail/WIDTH);d.style.zoom=String(sc);car.style.height=Math.ceil(HEIGHT*sc)+"px";}

  function rebuildControls(){
    const track=document.querySelector(".design-carousel-track"),carousel=document.querySelector(".design-carousel");if(!track||!carousel)return false;if(document.getElementById("designOrnate"))return true;
    injectStyles();const d=createDesign(),slide=document.createElement("div");slide.className="design-slide";slide.appendChild(d);track.appendChild(slide);setupDragging(d);sync();
    const oldControls=document.querySelector(".night-carousel-controls"),oldDots=document.querySelector(".night-carousel-dots");if(!oldControls||!oldDots)return false;oldControls.style.display="none";oldDots.style.display="none";
    const oldDotButtons=Array.from(oldDots.querySelectorAll("[data-dot]"));
    const controls=document.createElement("div");controls.className="design-carousel-controls ornate-carousel-controls";controls.innerHTML=`<button class="design-carousel-btn" data-prev>‹</button><span class="design-carousel-status">التصميم 1 من ${TOTAL}</span><button class="design-carousel-btn" data-next>›</button>`;
    const dots=document.createElement("div");dots.className="design-carousel-dots ornate-carousel-dots";dots.innerHTML=Array.from({length:TOTAL},(_,i)=>`<button class="design-carousel-dot${i===0?" active":""}" data-dot="${i}"></button>`).join("");carousel.parentElement.append(controls,dots);
    const render=()=>{if(activeIndex<5)oldDotButtons[activeIndex]?.click();else oldDotButtons[0]?.click();window.__prayerActiveDesignIndex=activeIndex;requestAnimationFrame(()=>{track.style.transform=`translateX(-${activeIndex*100}%)`;controls.querySelector(".design-carousel-status").textContent=`التصميم ${activeIndex+1} من ${TOTAL}`;dots.querySelectorAll(".design-carousel-dot").forEach((x,i)=>x.classList.toggle("active",i===activeIndex));resize()})};
    controls.querySelector("[data-prev]").onclick=()=>{activeIndex=(activeIndex-1+TOTAL)%TOTAL;render()};controls.querySelector("[data-next]").onclick=()=>{activeIndex=(activeIndex+1)%TOTAL;render()};dots.querySelectorAll("[data-dot]").forEach(x=>x.onclick=()=>{activeIndex=Number(x.dataset.dot);render()});
    let sx=null;carousel.addEventListener("touchstart",e=>{if(e.target.closest(".draggable"))return;sx=e.touches[0].clientX},{passive:true});carousel.addEventListener("touchend",e=>{if(sx===null)return;const dx=e.changedTouches[0].clientX-sx;sx=null;if(Math.abs(dx)>45){activeIndex=dx<0?Math.min(TOTAL-1,activeIndex+1):Math.max(0,activeIndex-1);render()}},{passive:true});render();return true;
  }

  function setupSync(){["dayName","hijriDay","gregorianDay","hijriMonth","gregorianMonth","hijriYear","gregorianYear","fajr","sunrise","dhuhr","asr","maghrib","isha"].forEach(id=>document.getElementById(id)?.addEventListener("change",()=>setTimeout(sync,0)));document.getElementById("footerText")?.addEventListener("input",sync);const p=document.getElementById("design");if(p)new MutationObserver(sync).observe(p,{subtree:true,childList:true,characterData:true})}

  function init(){let tries=0;const timer=setInterval(()=>{tries++;if(rebuildControls()||tries>60){clearInterval(timer);if(document.getElementById("designOrnate")){setupSync();sync();resize();window.addEventListener("resize",resize,{passive:true});window.addEventListener("orientationchange",()=>setTimeout(resize,150),{passive:true})}}},150)}
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});else init();
})();