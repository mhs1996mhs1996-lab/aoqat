"use strict";

(function(){
  const WIDTH=1024, HEIGHT=1448, TOTAL=4;
  let activeIndex=0;
  let originalDots=[];

  const value=id=>document.getElementById(id)?.value||"";
  const data=()=>({
    day:value("dayName"),gday:value("gregorianDay"),gmonth:value("gregorianMonth"),gyear:value("gregorianYear")?value("gregorianYear")+"م":"",
    hday:value("hijriDay"),hmonth:value("hijriMonth"),hyear:value("hijriYear")?value("hijriYear")+"هـ":"",
    fajr:value("fajr"),sunrise:value("sunrise"),dhuhr:value("dhuhr"),asr:value("asr"),maghrib:value("maghrib"),isha:value("isha"),footer:value("footerText")
  });

  function injectStyles(){
    if(document.getElementById("finalDesignStyles"))return;
    const s=document.createElement("style");
    s.id="finalDesignStyles";
    s.textContent=`
      .removed-design-storage{display:none!important}
      .fourth-design,.reference-design{position:relative;width:1024px;height:1448px;flex:0 0 1024px;overflow:hidden;direction:rtl;transform-origin:top center}
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

      .reference-design{background:linear-gradient(180deg,#5d95b6 0%,#bcd5e3 25%,#f7f4ea 47%,#d8e5df 72%,#82bdd1 100%);color:#082849;box-shadow:inset 0 0 120px rgba(18,61,88,.15)}
      .ref-sky{position:absolute;inset:0;background:radial-gradient(circle at 20% 20%,rgba(255,255,255,.35),transparent 18%),linear-gradient(180deg,rgba(23,91,130,.12),transparent 45%);pointer-events:none}
      .ref-water{position:absolute;left:0;right:0;bottom:0;height:340px;background:repeating-linear-gradient(180deg,rgba(255,255,255,.24) 0 3px,rgba(37,124,160,.13) 3px 8px),linear-gradient(180deg,#9ed0de,#61a9c3);pointer-events:none}
      .ref-mosque{position:absolute;left:0;right:0;bottom:300px;height:330px;pointer-events:none;opacity:.96}
      .ref-mosque:before{content:"";position:absolute;left:40px;bottom:0;width:430px;height:230px;background:radial-gradient(ellipse at 50% 100%,#f0eadf 0 58%,transparent 59%),linear-gradient(90deg,transparent 0 18%,#ece5d8 18% 28%,transparent 28% 72%,#ece5d8 72% 82%,transparent 82%);filter:drop-shadow(0 8px 4px rgba(25,59,71,.18))}
      .ref-mosque:after{content:"";position:absolute;right:18px;bottom:0;width:430px;height:250px;background:radial-gradient(ellipse at 50% 100%,#f2ecdf 0 58%,transparent 59%),linear-gradient(90deg,transparent 0 18%,#eee7da 18% 28%,transparent 28% 72%,#eee7da 72% 82%,transparent 82%);filter:drop-shadow(0 8px 4px rgba(25,59,71,.18))}
      .ref-minaret{position:absolute;bottom:250px;width:36px;height:280px;background:linear-gradient(90deg,#e9e3d9,#fff7e9,#dfd7ca);border-radius:18px 18px 6px 6px;box-shadow:0 4px 8px rgba(30,70,90,.18)}
      .ref-minaret:before{content:"";position:absolute;left:-9px;top:56px;width:54px;height:18px;border-radius:10px;background:#ddd4c7}.ref-minaret:after{content:"";position:absolute;left:10px;top:-55px;width:16px;height:70px;background:#eee7dc;clip-path:polygon(50% 0,100% 55%,82% 100%,18% 100%,0 55%)}
      .ref-minaret.a{left:54px}.ref-minaret.b{left:166px;height:230px}.ref-minaret.c{right:54px}.ref-minaret.d{right:166px;height:235px}
      .ref-arch{position:absolute;left:62px;right:62px;top:70px;bottom:72px;background:#fbfaf5;border:4px solid #f0d59a;border-radius:48% 48% 32px 32px/13% 13% 32px 32px;box-shadow:inset 0 0 0 10px rgba(255,255,255,.75),0 14px 40px rgba(23,71,97,.16);opacity:.97}
      .ref-arch:before{content:"";position:absolute;left:40px;right:40px;top:20px;height:150px;border:2px solid rgba(232,204,144,.55);border-bottom:0;border-radius:50% 50% 0 0/100% 100% 0 0}
      .ref-verse{position:absolute;top:160px;left:120px;right:120px;text-align:center;font-size:42px;font-weight:700;color:#102a49;line-height:1.45}
      .ref-verse-source{position:absolute;top:238px;left:0;right:0;text-align:center;font-size:19px;font-weight:700;color:#1b354e}
      .ref-date-area{position:absolute;top:315px;left:145px;right:145px;height:190px}
      .ref-date-card{position:absolute;top:0;width:210px;height:165px;border:2px solid #d9bd80;border-radius:18px;background:rgba(255,255,255,.93);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;box-shadow:0 8px 18px rgba(20,58,75,.11)}
      .ref-date-card.greg{left:0}.ref-date-card.hijri{right:0}.ref-date-num{font-size:54px;font-weight:800;line-height:1;color:#0b2948}.ref-date-month{font-size:24px;font-weight:700}.ref-date-year{font-size:21px;font-weight:700;color:#233d51}
      .ref-day{position:absolute;top:330px;left:360px;width:304px;height:132px;display:flex;align-items:center;justify-content:center;text-align:center;background:#073554;color:#f4d598;font-size:44px;font-weight:800;border:3px solid #d5b16a;clip-path:polygon(50% 0,62% 12%,80% 8%,88% 25%,100% 37%,91% 52%,100% 68%,84% 78%,79% 96%,59% 90%,50% 100%,39% 89%,20% 96%,15% 78%,0 68%,9% 52%,0 37%,12% 25%,20% 8%,38% 12%);text-shadow:0 2px 2px #0008}
      .ref-prayers{position:absolute;top:550px;left:205px;right:205px;display:flex;flex-direction:column;gap:13px}
      .ref-prayer-row{height:88px;border:1px solid #d9d6cb;border-radius:44px;background:rgba(255,255,255,.92);display:grid;grid-template-columns:150px 1fr 76px;align-items:center;padding:0 16px 0 28px;box-shadow:0 5px 12px rgba(30,69,85,.08)}
      .ref-prayer-time{font-size:39px;font-weight:800;direction:ltr;text-align:left;color:#092949}.ref-prayer-label{font-size:34px;font-weight:800;text-align:right;color:#0a2949}.ref-prayer-icon{width:66px;height:66px;border-radius:50%;background:linear-gradient(180deg,#0a4367,#062b49);display:flex;align-items:center;justify-content:center;color:#f3d488;font-size:31px;border:2px solid #d9c58d}
      .ref-footer{position:absolute;left:118px;right:118px;bottom:92px;min-height:142px;background:rgba(255,255,255,.94);border:3px solid #d7b86f;border-radius:55px 55px 24px 24px;display:flex;align-items:flex-start;justify-content:center;text-align:center;padding:28px 28px 18px;font-size:28px;font-weight:700;color:#092949;box-shadow:0 10px 20px rgba(16,65,88,.12)}
      .ref-footer:after{content:"♜  ♜  ♜  ♜  ♜  ♜  ♜";position:absolute;left:20px;right:20px;bottom:6px;text-align:center;color:#0a4a70;font-size:29px;letter-spacing:14px}
      .fourth-design .draggable,.reference-design .draggable{cursor:move;touch-action:none;user-select:none}.fourth-design .dragging{outline:2px dashed #2d719a;outline-offset:4px}.reference-design .dragging{outline:2px dashed #d7b86f;outline-offset:4px}
    `;
    document.head.appendChild(s);
  }

  function rows(prefix,icons=false){
    const arr=[["fajr","الفجر","🕌"],["sunrise","الشروق","☀️"],["dhuhr","الظهر","☀️"],["asr","العصر","🕌"],["maghrib","المغرب","🌅"],["isha","العشاء","🌙"]];
    return arr.map(([f,l,i])=>icons?`<div class="ref-prayer-row draggable"><b class="ref-prayer-time" data-field="${f}"></b><span class="ref-prayer-label">${l}</span><span class="ref-prayer-icon">${i}</span></div>`:`<div class="${prefix}-prayer-row draggable"><span class="${prefix}-prayer-label">${l}</span><b class="${prefix}-prayer-time" data-field="${f}"></b></div>`).join("");
  }

  function createFourth(){
    const d=document.createElement("div");d.id="design4";d.className="fourth-design";
    d.innerHTML=`<div class="sd4-sky"></div><div class="sd4-title draggable">مواقيت الصلاة</div><div class="sd4-verse draggable">﴿ إِنَّ الصَّلَاةَ كَانَتْ عَلَى الْمُؤْمِنِينَ كِتَابًا مَوْقُوتًا ﴾</div><div class="sd4-day draggable" data-field="day"></div><div class="sd4-date-card greg draggable"><div class="sd4-date-number" data-field="gday"></div><div class="sd4-date-month" data-field="gmonth"></div><div class="sd4-date-year" data-field="gyear"></div></div><div class="sd4-date-card hijri draggable"><div class="sd4-date-number" data-field="hday"></div><div class="sd4-date-month" data-field="hmonth"></div><div class="sd4-date-year" data-field="hyear"></div></div><div class="sd4-prayers">${rows("sd4")}</div><div class="sd4-footer draggable" data-field="footer"></div>`;return d;
  }

  function createReference(){
    const d=document.createElement("div");d.id="designRef";d.className="reference-design";
    d.innerHTML=`<div class="ref-sky"></div><div class="ref-water"></div><div class="ref-mosque"></div><div class="ref-minaret a"></div><div class="ref-minaret b"></div><div class="ref-minaret c"></div><div class="ref-minaret d"></div><div class="ref-arch"></div><div class="ref-verse draggable">﴿ إِنَّ الصَّلَاةَ تَنْهَى عَنِ الْفَحْشَاءِ وَالْمُنكَرِ ﴾</div><div class="ref-verse-source draggable">(العنكبوت: 45)</div><div class="ref-date-area"><div class="ref-date-card greg draggable"><div class="ref-date-year" data-field="gyear"></div><div class="ref-date-num" data-field="gday"></div><div class="ref-date-month" data-field="gmonth"></div></div><div class="ref-date-card hijri draggable"><div class="ref-date-num" data-field="hday"></div><div class="ref-date-month" data-field="hmonth"></div><div class="ref-date-year" data-field="hyear"></div></div></div><div class="ref-day draggable" data-field="day"></div><div class="ref-prayers">${rows("ref",true)}</div><div class="ref-footer draggable" data-field="footer"></div>`;
    return d;
  }

  function sync(){
    const m=data();[document.getElementById("design4"),document.getElementById("designRef")].forEach(d=>{if(!d)return;Object.entries(m).forEach(([k,v])=>d.querySelectorAll(`[data-field="${k}"]`).forEach(el=>el.textContent=v));});
  }

  function setupDragging(design){design.querySelectorAll(".draggable").forEach(el=>{let drag=false,sx=0,sy=0,bx=0,by=0,scale=1;const p=e=>e.touches?e.touches[0]:e;const start=e=>{if(e.button!==undefined&&e.button!==0)return;const q=p(e),r=design.getBoundingClientRect();scale=r.width/design.offsetWidth||1;sx=q.clientX;sy=q.clientY;bx=parseFloat(el.dataset.x)||0;by=parseFloat(el.dataset.y)||0;drag=true;el.classList.add("dragging");e.preventDefault()};const move=e=>{if(!drag)return;const q=p(e),x=bx+(q.clientX-sx)/scale,y=by+(q.clientY-sy)/scale;el.dataset.x=x;el.dataset.y=y;el.style.transform=`translate(${x}px,${y}px)`;e.preventDefault()};const end=()=>{drag=false;el.classList.remove("dragging")};el.addEventListener("mousedown",start);window.addEventListener("mousemove",move,{passive:false});window.addEventListener("mouseup",end);el.addEventListener("touchstart",start,{passive:false});window.addEventListener("touchmove",move,{passive:false});window.addEventListener("touchend",end)});}

  function rebuild(){
    const track=document.querySelector(".design-carousel-track"),carousel=document.querySelector(".design-carousel");if(!track||!carousel)return false;
    if(document.getElementById("designRef"))return true;

    originalDots=Array.from(document.querySelectorAll(".design-carousel-dot"));
    const primarySlide=document.getElementById("design")?.closest(".design-slide");
    const storage=document.createElement("div");storage.className="removed-design-storage";storage.id="removedDesignStorage";document.body.appendChild(storage);
    if(primarySlide)storage.appendChild(primarySlide);
    document.getElementById("design5")?.closest(".design-slide")?.remove();

    const d4existing=document.getElementById("design4");
    if(d4existing?.closest(".design-slide"))d4existing.closest(".design-slide").remove();
    const d4=createFourth(),ref=createReference();
    [d4,ref].forEach(d=>{const slide=document.createElement("div");slide.className="design-slide";slide.appendChild(d);track.appendChild(slide);setupDragging(d)});
    sync();

    const oldControls=document.querySelector(".design-carousel-controls"),oldDots=document.querySelector(".design-carousel-dots");
    if(oldControls)oldControls.style.display="none";
    if(oldDots)oldDots.style.display="none";
    const controls=document.createElement("div");controls.className="design-carousel-controls final-carousel-controls";controls.innerHTML=`<button class="design-carousel-btn" data-prev>‹</button><span class="design-carousel-status">التصميم 1 من ${TOTAL}</span><button class="design-carousel-btn" data-next>›</button>`;
    const dots=document.createElement("div");dots.className="design-carousel-dots final-carousel-dots";dots.innerHTML=Array.from({length:TOTAL},(_,i)=>`<button class="design-carousel-dot${i===0?" active":""}" data-dot="${i}"></button>`).join("");
    carousel.parentElement.append(controls,dots);

    const render=()=>{
      track.style.transform=`translateX(-${activeIndex*100}%)`;
      controls.querySelector(".design-carousel-status").textContent=`التصميم ${activeIndex+1} من ${TOTAL}`;
      dots.querySelectorAll(".design-carousel-dot").forEach((x,i)=>x.classList.toggle("active",i===activeIndex));
      if(activeIndex===0)originalDots[1]?.click();else if(activeIndex===1)originalDots[2]?.click();else originalDots[0]?.click();
      requestAnimationFrame(()=>track.style.transform=`translateX(-${activeIndex*100}%)`);
      resize();
    };
    controls.querySelector("[data-prev]").onclick=()=>{activeIndex=(activeIndex-1+TOTAL)%TOTAL;render()};controls.querySelector("[data-next]").onclick=()=>{activeIndex=(activeIndex+1)%TOTAL;render()};dots.querySelectorAll("[data-dot]").forEach(x=>x.onclick=()=>{activeIndex=Number(x.dataset.dot);render()});
    let sx=null;carousel.addEventListener("touchstart",e=>{if(e.target.closest(".draggable"))return;sx=e.touches[0].clientX},{passive:true});carousel.addEventListener("touchend",e=>{if(sx===null)return;const dx=e.changedTouches[0].clientX-sx;sx=null;if(Math.abs(dx)>45){activeIndex=dx<0?Math.min(TOTAL-1,activeIndex+1):Math.max(0,activeIndex-1);render()}},{passive:true});
    render();return true;
  }

  function resize(){const p=document.querySelector(".previewBox"),car=document.querySelector(".design-carousel"),designs=["design2","design3","design4","designRef"].map(id=>document.getElementById(id));if(!p||!car||designs.some(x=>!x))return;if(window.innerWidth>800){designs.forEach(d=>d.style.zoom="1");car.style.height=HEIGHT+"px";return}const cs=getComputedStyle(p),pad=parseFloat(cs.paddingLeft||0)+parseFloat(cs.paddingRight||0),avail=Math.max(220,p.clientWidth-pad-2),sc=Math.min(1,avail/WIDTH);designs.forEach(d=>d.style.zoom=String(sc));car.style.height=Math.ceil(HEIGHT*sc)+"px";}

  function rr(ctx,r,rad=24){ctx.beginPath();if(ctx.roundRect)ctx.roundRect(r.x,r.y,r.w,r.h,rad);else ctx.rect(r.x,r.y,r.w,r.h)}
  function rect(el,d){const r=el.getBoundingClientRect(),dr=d.getBoundingClientRect(),s=dr.width/d.offsetWidth||1;return{x:(r.left-dr.left)/s,y:(r.top-dr.top)/s,w:r.width/s,h:r.height/s}}
  function text(ctx,el,d){
    if(!el)return;
    const r=rect(el,d),st=getComputedStyle(el),fs=parseFloat(st.fontSize)||16,w=st.fontWeight||"400",fam=st.fontFamily||"Arial";
    const content=el.textContent.trim();if(!content)return;
    ctx.save();
    ctx.font=`${w} ${fs}px ${fam}`;
    ctx.fillStyle=st.color||"#fff";
    ctx.textAlign=st.textAlign||"left";
    ctx.textBaseline="middle";
    if("direction" in ctx)ctx.direction=st.direction==="ltr"?"ltr":"rtl";
    let x=r.x;
    if(st.textAlign==="center")x+=r.w/2;else if(st.textAlign==="right")x+=r.w;
    const y=r.y+r.h/2;
    ctx.fillText(content,x,y);
    ctx.restore();
  }
  function download(c,format,name){const mime=format==="jpg"?"image/jpeg":format==="webp"?"image/webp":"image/png";c.toBlob(b=>{if(!b)return;const u=URL.createObjectURL(b),a=document.createElement("a");a.href=u;a.download=`${name}.${format}`;a.click();setTimeout(()=>URL.revokeObjectURL(u),1500)},mime,format==="png"?undefined:.98)}

  async function exportCustom(id,format){
    const d=document.getElementById(id);if(!d)return;try{await document.fonts?.ready}catch(e){}const c=document.createElement("canvas"),S=2;c.width=WIDTH*S;c.height=HEIGHT*S;const ctx=c.getContext("2d");ctx.scale(S,S);
    if(id==="design4"){
      const g=ctx.createLinearGradient(0,0,0,HEIGHT);g.addColorStop(0,"#ddecf7");g.addColorStop(.32,"#f8fbfd");g.addColorStop(1,"#eef5f7");ctx.fillStyle=g;ctx.fillRect(0,0,WIDTH,HEIGHT);ctx.strokeStyle="#c8a95c";ctx.lineWidth=3;rr(ctx,{x:64,y:46,w:896,h:1356},34);ctx.stroke();d.querySelectorAll(".sd4-day,.sd4-date-card,.sd4-prayer-row,.sd4-footer").forEach(el=>{const r=rect(el,d);ctx.fillStyle=el.classList.contains("sd4-day")?"#163f60":"rgba(255,255,255,.95)";ctx.strokeStyle="#d4b76d";rr(ctx,r,el.classList.contains("sd4-prayer-row")?46:26);ctx.fill();ctx.stroke()});d.querySelectorAll(".sd4-title,.sd4-verse,.sd4-day,.sd4-footer,.sd4-date-card div,.sd4-prayer-row span,.sd4-prayer-row b").forEach(el=>text(ctx,el,d));download(c,format,"prayer-design-4");return;
    }
    const g=ctx.createLinearGradient(0,0,0,HEIGHT);g.addColorStop(0,"#5d95b6");g.addColorStop(.35,"#f7f4ea");g.addColorStop(.72,"#d8e5df");g.addColorStop(1,"#82bdd1");ctx.fillStyle=g;ctx.fillRect(0,0,WIDTH,HEIGHT);ctx.fillStyle="#fbfaf5";rr(ctx,{x:62,y:70,w:900,h:1306},55);ctx.fill();ctx.strokeStyle="#f0d59a";ctx.lineWidth=4;ctx.stroke();
    d.querySelectorAll(".ref-date-card,.ref-prayer-row,.ref-footer").forEach(el=>{const r=rect(el,d);ctx.fillStyle="rgba(255,255,255,.95)";ctx.strokeStyle="#d7c28d";ctx.lineWidth=1.5;rr(ctx,r,el.classList.contains("ref-prayer-row")?44:22);ctx.fill();ctx.stroke()});const day=d.querySelector(".ref-day");if(day){const r=rect(day,d);ctx.fillStyle="#073554";rr(ctx,r,28);ctx.fill();ctx.strokeStyle="#d5b16a";ctx.lineWidth=3;ctx.stroke()}
    d.querySelectorAll(".ref-verse,.ref-verse-source,.ref-day,.ref-date-card div,.ref-prayer-row b,.ref-prayer-row .ref-prayer-label,.ref-footer").forEach(el=>text(ctx,el,d));download(c,format,"prayer-design-reference");
  }

  function setupExport(){
    document.querySelectorAll("[data-export-format]").forEach(btn=>btn.addEventListener("click",e=>{if(activeIndex<2)return;e.preventDefault();e.stopImmediatePropagation();exportCustom(activeIndex===2?"design4":"designRef",btn.dataset.exportFormat||"png")},true));
    document.getElementById("exportBtn")?.addEventListener("click",e=>{if(activeIndex<2)return;e.preventDefault();e.stopImmediatePropagation();exportCustom(activeIndex===2?"design4":"designRef","png")},true);
  }

  function setupSync(){["dayName","hijriDay","gregorianDay","hijriMonth","gregorianMonth","hijriYear","gregorianYear","fajr","sunrise","dhuhr","asr","maghrib","isha"].forEach(id=>document.getElementById(id)?.addEventListener("change",()=>setTimeout(sync,0)));document.getElementById("footerText")?.addEventListener("input",sync);const p=document.getElementById("design");if(p)new MutationObserver(sync).observe(p,{subtree:true,childList:true,characterData:true})}

  function init(){injectStyles();let tries=0;const timer=setInterval(()=>{tries++;if(rebuild()||tries>50){clearInterval(timer);if(document.getElementById("designRef")){setupSync();setupExport();sync();resize();window.addEventListener("resize",resize,{passive:true});window.addEventListener("orientationchange",()=>setTimeout(resize,150),{passive:true})}}},150)}
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});else init();
})();
