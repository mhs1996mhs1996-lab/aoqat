"use strict";

(function(){
  const WIDTH=1024, HEIGHT=1448, TOTAL=5;
  let activeIndex=0;

  const value=id=>document.getElementById(id)?.value||"";
  const currentData=()=>({
    day:value("dayName"),gday:value("gregorianDay"),gmonth:value("gregorianMonth"),gyear:value("gregorianYear")?value("gregorianYear")+"م":"",
    hday:value("hijriDay"),hmonth:value("hijriMonth"),hyear:value("hijriYear")?value("hijriYear")+"هـ":"",
    fajr:value("fajr"),sunrise:value("sunrise"),dhuhr:value("dhuhr"),asr:value("asr"),maghrib:value("maghrib"),isha:value("isha")
  });

  function injectStyles(){
    if(document.getElementById("nightDesignStyles"))return;
    const s=document.createElement("style");
    s.id="nightDesignStyles";
    s.textContent=`
      .night-design{position:relative;width:1024px;height:1448px;flex:0 0 1024px;overflow:hidden;direction:rtl;transform-origin:top center;background:radial-gradient(circle at 50% 26%,rgba(240,181,74,.30) 0 10%,rgba(15,45,76,.40) 29%,transparent 45%),linear-gradient(180deg,#031529 0%,#071d31 42%,#04111e 100%);color:#f8e4b0;box-shadow:inset 0 0 150px rgba(0,0,0,.5)}
      .night-design:before{content:"";position:absolute;inset:18px;border:4px solid #b97828;border-radius:10px;box-shadow:inset 0 0 0 6px #082037, inset 0 0 0 9px rgba(209,151,62,.45);pointer-events:none}
      .night-design:after{content:"";position:absolute;left:84px;right:84px;top:14px;height:430px;border:6px solid #b97828;border-bottom:0;border-radius:52% 52% 0 0/70% 70% 0 0;box-shadow:inset 0 0 0 5px #061b2e;pointer-events:none}
      .nd-pattern{position:absolute;top:0;bottom:0;width:78px;background:repeating-linear-gradient(45deg,rgba(218,157,58,.28) 0 2px,transparent 2px 14px),repeating-linear-gradient(-45deg,rgba(218,157,58,.18) 0 2px,transparent 2px 14px);border-inline:1px solid rgba(219,160,64,.45)}
      .nd-pattern.left{left:20px}.nd-pattern.right{right:20px}
      .nd-stars{position:absolute;inset:0 95px 0;background-image:radial-gradient(circle,#ffe6a6 0 1.5px,transparent 1.8px);background-size:84px 74px;opacity:.18;pointer-events:none}
      .nd-title{position:absolute;top:74px;left:160px;right:160px;text-align:center;font-size:58px;font-weight:800;color:#fff6dc;text-shadow:0 3px 10px #000}
      .nd-subtitle{position:absolute;top:150px;left:170px;right:170px;text-align:center;font-size:28px;color:#eee3ca}
      .nd-moon{position:absolute;top:215px;left:292px;width:440px;height:280px;border-radius:50%;background:radial-gradient(circle at 50% 45%,#f7d99c 0 46%,#d9a956 64%,transparent 66%);opacity:.85;filter:drop-shadow(0 0 24px rgba(243,189,88,.35))}
      .nd-mosque{position:absolute;top:300px;left:190px;right:190px;height:210px;filter:drop-shadow(0 8px 10px rgba(0,0,0,.7))}
      .nd-mosque:before{content:"";position:absolute;left:205px;bottom:0;width:230px;height:128px;background:#06111d;border-radius:120px 120px 6px 6px;box-shadow:-145px 28px 0 -48px #06111d,145px 28px 0 -48px #06111d}
      .nd-mosque:after{content:"";position:absolute;left:312px;bottom:118px;width:18px;height:74px;background:#06111d;clip-path:polygon(50% 0,100% 28%,75% 100%,25% 100%,0 28%)}
      .nd-minaret{position:absolute;bottom:0;width:28px;height:165px;background:#06111d}.nd-minaret:before{content:"";position:absolute;left:-10px;top:32px;width:48px;height:12px;border-radius:10px;background:#06111d}.nd-minaret:after{content:"";position:absolute;left:7px;top:-52px;width:14px;height:60px;background:#06111d;clip-path:polygon(50% 0,100% 40%,72% 100%,28% 100%,0 40%)}
      .nd-minaret.a{left:38px}.nd-minaret.b{right:38px}
      .nd-date{position:absolute;top:500px;width:215px;height:185px;border:2px solid #c99545;border-radius:18px;background:linear-gradient(180deg,#f8f1e5,#e9dfd0);color:#0a2440;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;box-shadow:0 9px 24px rgba(0,0,0,.38)}
      .nd-date.greg{left:126px}.nd-date.hijri{right:126px}.nd-date-num{font-size:58px;font-weight:900;line-height:1}.nd-date-month{font-size:24px;font-weight:800}.nd-date-year{font-size:22px;font-weight:800}
      .nd-day{position:absolute;top:520px;left:372px;width:280px;height:145px;display:flex;align-items:center;justify-content:center;text-align:center;background:#08263d;border:3px solid #c79643;color:#f2cf83;font-size:46px;font-weight:900;clip-path:polygon(50% 0,63% 9%,78% 6%,88% 20%,100% 31%,92% 48%,100% 64%,85% 75%,79% 93%,60% 88%,50% 100%,39% 88%,20% 94%,15% 76%,0 65%,8% 48%,0 31%,12% 20%,21% 7%,38% 10%);text-shadow:0 2px 3px #000}
      .nd-prayers{position:absolute;top:715px;left:178px;right:178px;display:flex;flex-direction:column;gap:14px}
      .nd-prayer-row{height:94px;border:3px solid #c49a51;border-radius:24px;background:linear-gradient(90deg,#061727,#0b2a42 48%,#071a2c);display:grid;grid-template-columns:175px 1fr 82px;align-items:center;padding:0 18px 0 32px;box-shadow:0 8px 16px rgba(0,0,0,.28)}
      .nd-time{direction:ltr;font-size:43px;font-weight:900;color:#fff;text-align:left}.nd-label{font-size:34px;font-weight:800;text-align:center;color:#f5d993}.nd-icon{width:70px;height:70px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:linear-gradient(180deg,#0a4667,#06253d);border:2px solid #c59a50;font-size:32px}
      .nd-book{position:absolute;left:66px;bottom:135px;font-size:86px;transform:rotate(-12deg);filter:drop-shadow(0 8px 7px #0008)}
      .nd-lantern{position:absolute;right:54px;bottom:105px;font-size:96px;filter:drop-shadow(0 0 18px rgba(255,166,36,.6))}
      .nd-footer{position:absolute;left:180px;right:180px;bottom:76px;min-height:128px;border:3px solid #c69b4f;border-radius:28px;background:#071c2e;color:#f6dfa9;display:flex;align-items:center;justify-content:center;text-align:center;padding:18px 30px;font-size:36px;font-weight:800;box-shadow:0 12px 28px rgba(0,0,0,.34)}
      .night-design .draggable{cursor:move;touch-action:none;user-select:none}.night-design .dragging{outline:2px dashed #e6bd68;outline-offset:4px}
    `;
    document.head.appendChild(s);
  }

  function rows(){
    return [["fajr","الفجر","🕌"],["sunrise","الشروق","🌅"],["dhuhr","الظهر","🕌"],["asr","العصر","🕌"],["maghrib","المغرب","🌇"],["isha","العشاء","🌙"]].map(([f,l,i])=>`<div class="nd-prayer-row draggable"><b class="nd-time" data-field="${f}"></b><span class="nd-label">${l}</span><span class="nd-icon">${i}</span></div>`).join("");
  }

  function createDesign(){
    const d=document.createElement("div");d.id="designNight";d.className="night-design";
    d.innerHTML=`<div class="nd-pattern left"></div><div class="nd-pattern right"></div><div class="nd-stars"></div><div class="nd-title draggable">حافظ على صلاتك</div><div class="nd-subtitle draggable">فهي نور لك في الدنيا والآخرة</div><div class="nd-moon"></div><div class="nd-mosque"><div class="nd-minaret a"></div><div class="nd-minaret b"></div></div><div class="nd-date greg draggable"><div class="nd-date-year" data-field="gyear"></div><div class="nd-date-num" data-field="gday"></div><div class="nd-date-month" data-field="gmonth"></div></div><div class="nd-day draggable" data-field="day"></div><div class="nd-date hijri draggable"><div class="nd-date-num" data-field="hday"></div><div class="nd-date-month" data-field="hmonth"></div><div class="nd-date-year" data-field="hyear"></div></div><div class="nd-prayers">${rows()}</div><div class="nd-book">📖</div><div class="nd-lantern">🏮</div><div class="nd-footer draggable">وَأَقِمِ الصَّلَاةَ لِذِكْرِي<br><small>(طه: 14)</small></div>`;
    return d;
  }

  function sync(){const m=currentData(),d=document.getElementById("designNight");if(!d)return;Object.entries(m).forEach(([k,v])=>d.querySelectorAll(`[data-field="${k}"]`).forEach(el=>el.textContent=v));}

  function setupDragging(design){design.querySelectorAll(".draggable").forEach(el=>{let drag=false,sx=0,sy=0,bx=0,by=0,scale=1;const p=e=>e.touches?e.touches[0]:e;const start=e=>{if(e.button!==undefined&&e.button!==0)return;const q=p(e),r=design.getBoundingClientRect();scale=r.width/design.offsetWidth||1;sx=q.clientX;sy=q.clientY;bx=parseFloat(el.dataset.x)||0;by=parseFloat(el.dataset.y)||0;drag=true;el.classList.add("dragging");e.preventDefault()};const move=e=>{if(!drag)return;const q=p(e),x=bx+(q.clientX-sx)/scale,y=by+(q.clientY-sy)/scale;el.dataset.x=x;el.dataset.y=y;el.style.transform=`translate(${x}px,${y}px)`;e.preventDefault()};const end=()=>{drag=false;el.classList.remove("dragging")};el.addEventListener("mousedown",start);window.addEventListener("mousemove",move,{passive:false});window.addEventListener("mouseup",end);el.addEventListener("touchstart",start,{passive:false});window.addEventListener("touchmove",move,{passive:false});window.addEventListener("touchend",end)});}

  function resize(){const p=document.querySelector(".previewBox"),car=document.querySelector(".design-carousel"),d=document.getElementById("designNight");if(!p||!car||!d)return;if(window.innerWidth>800){d.style.zoom="1";car.style.height=HEIGHT+"px";return}const cs=getComputedStyle(p),pad=parseFloat(cs.paddingLeft||0)+parseFloat(cs.paddingRight||0),avail=Math.max(220,p.clientWidth-pad-2),sc=Math.min(1,avail/WIDTH);d.style.zoom=String(sc);car.style.height=Math.ceil(HEIGHT*sc)+"px";}

  function rebuildControls(){
    const track=document.querySelector(".design-carousel-track"),carousel=document.querySelector(".design-carousel");if(!track||!carousel)return false;if(document.getElementById("designNight"))return true;
    injectStyles();const d=createDesign(),slide=document.createElement("div");slide.className="design-slide";slide.appendChild(d);track.appendChild(slide);setupDragging(d);sync();
    const oldControls=document.querySelector(".final-carousel-controls"),oldDots=document.querySelector(".final-carousel-dots");if(!oldControls||!oldDots)return false;oldControls.style.display="none";oldDots.style.display="none";
    const controls=document.createElement("div");controls.className="design-carousel-controls night-carousel-controls";controls.innerHTML=`<button class="design-carousel-btn" data-prev>‹</button><span class="design-carousel-status">التصميم 1 من ${TOTAL}</span><button class="design-carousel-btn" data-next>›</button>`;
    const dots=document.createElement("div");dots.className="design-carousel-dots night-carousel-dots";dots.innerHTML=Array.from({length:TOTAL},(_,i)=>`<button class="design-carousel-dot${i===0?" active":""}" data-dot="${i}"></button>`).join("");carousel.parentElement.append(controls,dots);
    const oldDotButtons=Array.from(oldDots.querySelectorAll("[data-dot]"));
    const render=()=>{if(activeIndex<4)oldDotButtons[activeIndex]?.click();else oldDotButtons[0]?.click();requestAnimationFrame(()=>{track.style.transform=`translateX(-${activeIndex*100}%)`;controls.querySelector(".design-carousel-status").textContent=`التصميم ${activeIndex+1} من ${TOTAL}`;dots.querySelectorAll(".design-carousel-dot").forEach((x,i)=>x.classList.toggle("active",i===activeIndex));resize()})};
    controls.querySelector("[data-prev]").onclick=()=>{activeIndex=(activeIndex-1+TOTAL)%TOTAL;render()};controls.querySelector("[data-next]").onclick=()=>{activeIndex=(activeIndex+1)%TOTAL;render()};dots.querySelectorAll("[data-dot]").forEach(x=>x.onclick=()=>{activeIndex=Number(x.dataset.dot);render()});
    let sx=null;carousel.addEventListener("touchstart",e=>{if(e.target.closest(".draggable"))return;sx=e.touches[0].clientX},{passive:true});carousel.addEventListener("touchend",e=>{if(sx===null)return;const dx=e.changedTouches[0].clientX-sx;sx=null;if(Math.abs(dx)>45){activeIndex=dx<0?Math.min(TOTAL-1,activeIndex+1):Math.max(0,activeIndex-1);render()}},{passive:true});render();return true;
  }

  function rr(ctx,r,rad=24){ctx.beginPath();if(ctx.roundRect)ctx.roundRect(r.x,r.y,r.w,r.h,rad);else ctx.rect(r.x,r.y,r.w,r.h)}
  function rect(el,d){const r=el.getBoundingClientRect(),dr=d.getBoundingClientRect(),s=dr.width/d.offsetWidth||1;return{x:(r.left-dr.left)/s,y:(r.top-dr.top)/s,w:r.width/s,h:r.height/s}}
  function drawText(ctx,el,d,vertical="middle"){if(!el)return;const r=rect(el,d),st=getComputedStyle(el),fs=parseFloat(st.fontSize)||16,w=st.fontWeight||"400",fam=st.fontFamily||"Arial";ctx.save();ctx.font=`${w} ${fs}px ${fam}`;ctx.fillStyle=st.color||"#fff";ctx.direction=st.direction||"rtl";ctx.textAlign=st.textAlign==="center"?"center":st.textAlign==="right"?"right":"left";ctx.textBaseline="middle";let x=r.x;if(ctx.textAlign==="center")x+=r.w/2;else if(ctx.textAlign==="right")x+=r.w;const y=vertical==="top"?r.y+fs/2:r.y+r.h/2;ctx.fillText(el.textContent.trim().replace(/\s+/g," "),x,y);ctx.restore()}
  function download(c,format){const mime=format==="jpg"?"image/jpeg":format==="webp"?"image/webp":"image/png";c.toBlob(b=>{if(!b)return;const u=URL.createObjectURL(b),a=document.createElement("a");a.href=u;a.download=`prayer-design-night.${format}`;a.click();setTimeout(()=>URL.revokeObjectURL(u),1500)},mime,format==="png"?undefined:.98)}
  async function exportNight(format){const d=document.getElementById("designNight");if(!d)return;try{await document.fonts?.ready}catch(e){}const c=document.createElement("canvas"),S=2;c.width=WIDTH*S;c.height=HEIGHT*S;const ctx=c.getContext("2d");ctx.scale(S,S);const g=ctx.createLinearGradient(0,0,0,HEIGHT);g.addColorStop(0,"#031529");g.addColorStop(.42,"#071d31");g.addColorStop(1,"#04111e");ctx.fillStyle=g;ctx.fillRect(0,0,WIDTH,HEIGHT);ctx.strokeStyle="#b97828";ctx.lineWidth=4;ctx.strokeRect(18,18,988,1412);d.querySelectorAll(".nd-date,.nd-prayer-row,.nd-footer").forEach(el=>{const r=rect(el,d);ctx.fillStyle=el.classList.contains("nd-date")?"#efe6d8":"#081f33";ctx.strokeStyle="#c69a4f";ctx.lineWidth=2;rr(ctx,r,el.classList.contains("nd-prayer-row")?24:18);ctx.fill();ctx.stroke()});const day=d.querySelector(".nd-day");if(day){const r=rect(day,d);ctx.fillStyle="#08263d";rr(ctx,r,34);ctx.fill();ctx.strokeStyle="#c79643";ctx.stroke()}d.querySelectorAll(".nd-title,.nd-subtitle,.nd-day,.nd-date div,.nd-prayer-row b,.nd-prayer-row .nd-label,.nd-footer").forEach(el=>drawText(ctx,el,d));download(c,format)}
  function setupExport(){document.querySelectorAll("[data-export-format]").forEach(btn=>btn.addEventListener("click",e=>{if(activeIndex!==4)return;e.preventDefault();e.stopImmediatePropagation();exportNight(btn.dataset.exportFormat||"png")},true));document.getElementById("exportBtn")?.addEventListener("click",e=>{if(activeIndex!==4)return;e.preventDefault();e.stopImmediatePropagation();exportNight("png")},true)}
  function setupSync(){["dayName","hijriDay","gregorianDay","hijriMonth","gregorianMonth","hijriYear","gregorianYear","fajr","sunrise","dhuhr","asr","maghrib","isha"].forEach(id=>document.getElementById(id)?.addEventListener("change",()=>setTimeout(sync,0)));const p=document.getElementById("design");if(p)new MutationObserver(sync).observe(p,{subtree:true,childList:true,characterData:true})}
  function init(){let tries=0;const timer=setInterval(()=>{tries++;if(rebuildControls()||tries>60){clearInterval(timer);if(document.getElementById("designNight")){setupSync();setupExport();sync();resize();window.addEventListener("resize",resize,{passive:true});window.addEventListener("orientationchange",()=>setTimeout(resize,150),{passive:true})}}},150)}
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});else init();
})();