"use strict";

(function(){
  const WIDTH=1024;
  const HEIGHT=1448;
  let activeIndex=0;

  function injectStyles(){
    if(document.getElementById("secondDesignStyles")) return;
    const style=document.createElement("style");
    style.id="secondDesignStyles";
    style.textContent=`
      .previewBox{position:relative!important;overflow:hidden!important;display:block!important}
      .design-carousel{position:relative;width:100%;overflow:hidden}
      .design-carousel-track{display:flex;width:100%;direction:ltr;transition:transform .35s ease;will-change:transform}
      .design-slide{flex:0 0 100%;width:100%;display:flex;justify-content:center;align-items:flex-start;direction:rtl}
      .design-carousel-controls{display:flex;align-items:center;justify-content:center;gap:10px;margin:10px 0 2px}
      .design-carousel-btn{border:1px solid rgba(255,255,255,.22);background:#0c2230;color:#fff;width:42px;height:38px;border-radius:8px;font-size:22px;cursor:pointer}
      .design-carousel-status{font-size:13px;color:#d7e2e8;min-width:105px;text-align:center}
      .design-carousel-dots{display:flex;gap:6px;justify-content:center;margin:6px 0}
      .design-carousel-dot{width:9px;height:9px;border:0;border-radius:50%;background:#667782;padding:0;cursor:pointer}
      .design-carousel-dot.active{background:#e8bd58;transform:scale(1.2)}

      .second-design{position:relative;width:1024px;height:1448px;flex:0 0 1024px;overflow:hidden;direction:rtl;color:#fff;background:radial-gradient(circle at 50% 13%,rgba(213,165,77,.28),transparent 28%),linear-gradient(180deg,#071a31 0%,#0a2239 42%,#09141f 100%);box-shadow:inset 0 0 120px rgba(0,0,0,.38);transform-origin:top center}
      .second-design:before{content:"";position:absolute;inset:40px;border:3px solid #d6a64f;border-radius:52px;pointer-events:none}
      .second-design:after{content:"";position:absolute;left:120px;right:120px;top:76px;height:330px;border:3px solid rgba(230,186,96,.8);border-bottom:0;border-radius:260px 260px 0 0/220px 220px 0 0;pointer-events:none}
      .sd2-stars{position:absolute;inset:0;background-image:radial-gradient(circle,#fff 0 1px,transparent 1.6px);background-size:92px 92px;opacity:.11;pointer-events:none}
      .sd2-title{position:absolute;top:108px;left:150px;right:150px;text-align:center;font-size:58px;font-weight:800;color:#f7e4b2;text-shadow:0 3px 8px #000}
      .sd2-location{position:absolute;top:186px;left:170px;right:170px;text-align:center;font-size:24px;color:#d7e5ef}
      .sd2-day{position:absolute;top:265px;left:352px;width:320px;height:104px;display:flex;align-items:center;justify-content:center;border:2px solid #d6a64f;border-radius:55px;background:rgba(3,18,32,.72);font-size:42px;font-weight:800;color:#ffe4a5}
      .sd2-date-card{position:absolute;top:400px;width:310px;height:165px;border:2px solid rgba(230,186,96,.78);border-radius:26px;background:rgba(7,27,47,.78);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:5px;box-shadow:0 10px 30px rgba(0,0,0,.25)}
      .sd2-date-card.greg{left:142px}.sd2-date-card.hijri{right:142px}
      .sd2-date-number{font-size:52px;font-weight:800;color:#fff;line-height:1}.sd2-date-month{font-size:25px;color:#f1cf84}.sd2-date-year{font-size:21px;color:#c9d7df}
      .sd2-prayers{position:absolute;top:620px;left:118px;right:118px;display:flex;flex-direction:column;gap:17px}
      .sd2-prayer-row{height:92px;border:2px solid rgba(230,186,96,.75);border-radius:24px;background:linear-gradient(90deg,rgba(8,25,42,.94),rgba(14,47,68,.78));display:flex;align-items:center;justify-content:space-between;padding:0 42px;box-shadow:0 9px 24px rgba(0,0,0,.25)}
      .sd2-prayer-label{font-size:34px;font-weight:700;color:#f9e7bb}.sd2-prayer-time{font-size:42px;font-weight:800;color:#fff;direction:ltr}
      .sd2-divider{position:absolute;left:180px;right:180px;bottom:130px;height:1px;background:linear-gradient(90deg,transparent,#d6a64f,transparent)}
      .sd2-footer{position:absolute;bottom:64px;left:135px;right:135px;text-align:center;font-size:25px;color:#e7d49f}
      .second-design .draggable{cursor:move;touch-action:none;user-select:none}
      .second-design .dragging{outline:2px dashed #f0c764;outline-offset:4px}
      @media(max-width:800px){
        .design-carousel-controls{margin-top:6px}.design-carousel-btn{width:38px;height:34px;font-size:19px}.design-carousel-status{font-size:12px}
      }
    `;
    document.head.appendChild(style);
  }

  function value(id){return document.getElementById(id)?.value||"";}

  function createSecondDesign(){
    const design=document.createElement("div");
    design.id="design2";
    design.className="second-design";
    design.innerHTML=`
      <div class="sd2-stars"></div>
      <div class="sd2-title draggable">مواقيت الصلاة</div>
      <div class="sd2-location draggable" data-field="footer"></div>
      <div class="sd2-day draggable" data-field="day"></div>
      <div class="sd2-date-card greg draggable">
        <div class="sd2-date-number" data-field="gday"></div>
        <div class="sd2-date-month" data-field="gmonth"></div>
        <div class="sd2-date-year" data-field="gyear"></div>
      </div>
      <div class="sd2-date-card hijri draggable">
        <div class="sd2-date-number" data-field="hday"></div>
        <div class="sd2-date-month" data-field="hmonth"></div>
        <div class="sd2-date-year" data-field="hyear"></div>
      </div>
      <div class="sd2-prayers">
        <div class="sd2-prayer-row draggable"><span class="sd2-prayer-label">الفجر</span><b class="sd2-prayer-time" data-field="fajr"></b></div>
        <div class="sd2-prayer-row draggable"><span class="sd2-prayer-label">الشروق</span><b class="sd2-prayer-time" data-field="sunrise"></b></div>
        <div class="sd2-prayer-row draggable"><span class="sd2-prayer-label">الظهر</span><b class="sd2-prayer-time" data-field="dhuhr"></b></div>
        <div class="sd2-prayer-row draggable"><span class="sd2-prayer-label">العصر</span><b class="sd2-prayer-time" data-field="asr"></b></div>
        <div class="sd2-prayer-row draggable"><span class="sd2-prayer-label">المغرب</span><b class="sd2-prayer-time" data-field="maghrib"></b></div>
        <div class="sd2-prayer-row draggable"><span class="sd2-prayer-label">العشاء</span><b class="sd2-prayer-time" data-field="isha"></b></div>
      </div>
      <div class="sd2-divider"></div>
      <div class="sd2-footer draggable">حسب التوقيت المحلي لمدينة الحويجة وضواحيها</div>
    `;
    return design;
  }

  function syncSecondDesign(){
    const d=document.getElementById("design2");
    if(!d) return;
    const map={
      day:value("dayName"),gday:value("gregorianDay"),gmonth:value("gregorianMonth"),gyear:value("gregorianYear")?value("gregorianYear")+"م":"",
      hday:value("hijriDay"),hmonth:value("hijriMonth"),hyear:value("hijriYear")?value("hijriYear")+"هـ":"",
      fajr:value("fajr"),sunrise:value("sunrise"),dhuhr:value("dhuhr"),asr:value("asr"),maghrib:value("maghrib"),isha:value("isha"),footer:value("footerText")
    };
    Object.entries(map).forEach(([key,val])=>d.querySelectorAll(`[data-field="${key}"]`).forEach(el=>el.textContent=val));
    const footer=d.querySelector(".sd2-footer");
    if(footer) footer.textContent=value("footerText")||"حسب التوقيت المحلي لمدينة الحويجة وضواحيها";
  }

  function setupSecondDragging(design){
    design.querySelectorAll(".draggable").forEach(el=>{
      let dragging=false,startX=0,startY=0,baseX=0,baseY=0,scale=1;
      const point=e=>e.touches?e.touches[0]:e;
      const start=e=>{
        if(e.button!==undefined&&e.button!==0)return;
        const p=point(e),rect=design.getBoundingClientRect();
        scale=rect.width/design.offsetWidth||1;
        startX=p.clientX;startY=p.clientY;baseX=parseFloat(el.dataset.x)||0;baseY=parseFloat(el.dataset.y)||0;
        dragging=true;el.classList.add("dragging");e.preventDefault();
      };
      const move=e=>{
        if(!dragging)return;
        const p=point(e),x=baseX+(p.clientX-startX)/scale,y=baseY+(p.clientY-startY)/scale;
        el.dataset.x=x;el.dataset.y=y;el.style.transform=`translate(${x}px, ${y}px)`;e.preventDefault();
      };
      const end=()=>{dragging=false;el.classList.remove("dragging")};
      el.addEventListener("mousedown",start);window.addEventListener("mousemove",move,{passive:false});window.addEventListener("mouseup",end);
      el.addEventListener("touchstart",start,{passive:false});window.addEventListener("touchmove",move,{passive:false});window.addEventListener("touchend",end);
    });
  }

  function restoreSavedSecondDesign(){
    try{
      const saved=JSON.parse(localStorage.getItem("prayerDesignerSavedAdjustmentsV1")||"null");
      if(!Array.isArray(saved)) return;
      const elements=Array.from(document.querySelectorAll(".draggable"));
      saved.forEach(item=>{
        const el=elements[item.index];if(!el||!document.getElementById("design2")?.contains(el))return;
        el.dataset.x=String(item.x??0);el.dataset.y=String(item.y??0);
        if(item.style)el.setAttribute("style",item.style);
      });
    }catch(e){console.error(e)}
  }

  function setupSync(){
    ["dayName","hijriDay","gregorianDay","hijriMonth","gregorianMonth","hijriYear","gregorianYear","fajr","sunrise","dhuhr","asr","maghrib","isha"].forEach(id=>document.getElementById(id)?.addEventListener("change",()=>setTimeout(syncSecondDesign,0)));
    document.getElementById("footerText")?.addEventListener("input",syncSecondDesign);
    const primary=document.getElementById("design");
    if(primary)new MutationObserver(syncSecondDesign).observe(primary,{subtree:true,childList:true,characterData:true});
  }

  function setupCarousel(previewBox,primary,secondary){
    const carousel=document.createElement("div");carousel.className="design-carousel";
    const track=document.createElement("div");track.className="design-carousel-track";
    const slide1=document.createElement("div");slide1.className="design-slide";
    const slide2=document.createElement("div");slide2.className="design-slide";
    previewBox.insertBefore(carousel,previewBox.firstChild);carousel.appendChild(track);track.append(slide1,slide2);slide1.appendChild(primary);slide2.appendChild(secondary);

    const controls=document.createElement("div");controls.className="design-carousel-controls";
    controls.innerHTML=`<button class="design-carousel-btn" data-prev aria-label="السابق">‹</button><span class="design-carousel-status">التصميم 1 من 2</span><button class="design-carousel-btn" data-next aria-label="التالي">›</button>`;
    const dots=document.createElement("div");dots.className="design-carousel-dots";dots.innerHTML=`<button class="design-carousel-dot active" data-dot="0"></button><button class="design-carousel-dot" data-dot="1"></button>`;
    previewBox.append(controls,dots);

    const render=()=>{
      track.style.transform=`translateX(-${activeIndex*100}%)`;
      controls.querySelector(".design-carousel-status").textContent=`التصميم ${activeIndex+1} من 2`;
      dots.querySelectorAll(".design-carousel-dot").forEach((d,i)=>d.classList.toggle("active",i===activeIndex));
      resizeDesigns();
    };
    controls.querySelector("[data-prev]").onclick=()=>{activeIndex=(activeIndex+1)%2;render()};
    controls.querySelector("[data-next]").onclick=()=>{activeIndex=(activeIndex+1)%2;render()};
    dots.querySelectorAll("[data-dot]").forEach(d=>d.onclick=()=>{activeIndex=Number(d.dataset.dot);render()});

    let sx=null;
    carousel.addEventListener("touchstart",e=>{if(e.target.closest(".draggable"))return;sx=e.touches[0].clientX},{passive:true});
    carousel.addEventListener("touchend",e=>{if(sx===null)return;const dx=e.changedTouches[0].clientX-sx;sx=null;if(Math.abs(dx)>45){activeIndex=dx<0?1:0;render()}},{passive:true});
    render();
  }

  function resizeDesigns(){
    const preview=document.querySelector(".previewBox"),d1=document.getElementById("design"),d2=document.getElementById("design2"),carousel=document.querySelector(".design-carousel");
    if(!preview||!d1||!d2||!carousel)return;
    if(window.innerWidth>800){d1.style.zoom="1";d2.style.zoom="1";carousel.style.height=HEIGHT+"px";return;}
    const cs=getComputedStyle(preview),padding=parseFloat(cs.paddingLeft||0)+parseFloat(cs.paddingRight||0),available=Math.max(220,preview.clientWidth-padding-2),scale=Math.min(1,available/WIDTH);
    d1.style.zoom=String(scale);d2.style.zoom=String(scale);carousel.style.height=Math.ceil(HEIGHT*scale)+"px";
  }

  function rectInDesign(el,design){
    const r=el.getBoundingClientRect(),dr=design.getBoundingClientRect(),s=dr.width/design.offsetWidth||1;
    return{x:(r.left-dr.left)/s,y:(r.top-dr.top)/s,w:r.width/s,h:r.height/s};
  }

  function rounded(ctx,r,radius=24){
    if(typeof roundRect==="function"){roundRect(ctx,r.x,r.y,r.w,r.h,radius);return;}
    ctx.beginPath();ctx.rect(r.x,r.y,r.w,r.h);
  }

  async function exportSecondDesign(format){
    const design=document.getElementById("design2");if(!design)return;
    if(document.fonts?.ready){try{await document.fonts.ready}catch(e){}}
    const canvas=document.createElement("canvas"),S=2;canvas.width=WIDTH*S;canvas.height=HEIGHT*S;const ctx=canvas.getContext("2d");ctx.scale(S,S);
    const g=ctx.createLinearGradient(0,0,0,HEIGHT);g.addColorStop(0,"#071a31");g.addColorStop(.42,"#0a2239");g.addColorStop(1,"#09141f");ctx.fillStyle=g;ctx.fillRect(0,0,WIDTH,HEIGHT);
    const glow=ctx.createRadialGradient(512,180,20,512,180,360);glow.addColorStop(0,"rgba(213,165,77,.25)");glow.addColorStop(1,"rgba(213,165,77,0)");ctx.fillStyle=glow;ctx.fillRect(0,0,WIDTH,500);
    ctx.strokeStyle="#d6a64f";ctx.lineWidth=3;rounded(ctx,{x:40,y:40,w:944,h:1368},52);ctx.stroke();
    ctx.beginPath();ctx.moveTo(120,406);ctx.lineTo(120,220);ctx.bezierCurveTo(120,120,260,76,512,76);ctx.bezierCurveTo(764,76,904,120,904,220);ctx.lineTo(904,406);ctx.stroke();

    design.querySelectorAll(".sd2-date-card,.sd2-prayer-row,.sd2-day").forEach(el=>{const r=rectInDesign(el,design);ctx.save();ctx.fillStyle="rgba(7,27,47,.90)";ctx.strokeStyle="#d6a64f";ctx.lineWidth=2;rounded(ctx,r,el.classList.contains("sd2-day")?50:24);ctx.fill();ctx.stroke();ctx.restore()});

    [".sd2-title",".sd2-location",".sd2-day",".sd2-footer"].forEach(sel=>{const el=design.querySelector(sel);if(el&&typeof drawElement==="function")drawElement(ctx,el,design)});
    design.querySelectorAll(".sd2-date-card").forEach(card=>card.querySelectorAll("div").forEach(el=>{if(typeof drawElement==="function")drawElement(ctx,el,design)}));
    design.querySelectorAll(".sd2-prayer-row").forEach(row=>row.querySelectorAll("span,b").forEach(el=>{if(typeof drawElement==="function")drawElement(ctx,el,design)}));

    const mime=format==="jpg"?"image/jpeg":format==="webp"?"image/webp":"image/png",quality=format==="png"?undefined:.98;
    canvas.toBlob(blob=>{if(!blob)return alert("تعذر إنشاء الصورة.");const url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download=`prayer-design-2.${format}`;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),2000)},mime,quality);
  }

  function routeExportToActiveDesign(){
    document.querySelectorAll("[data-export-format]").forEach(btn=>btn.addEventListener("click",e=>{if(activeIndex!==1)return;e.preventDefault();e.stopImmediatePropagation();exportSecondDesign(btn.dataset.exportFormat||"png")},true));
    document.getElementById("exportBtn")?.addEventListener("click",e=>{if(activeIndex!==1)return;e.preventDefault();e.stopImmediatePropagation();exportSecondDesign("png")},true);
  }

  function initSecondDesign(){
    const preview=document.querySelector(".previewBox"),primary=document.getElementById("design");
    if(!preview||!primary||document.getElementById("design2"))return;
    injectStyles();
    const second=createSecondDesign();
    setupCarousel(preview,primary,second);
    setupSecondDragging(second);
    setupSync();
    syncSecondDesign();
    restoreSavedSecondDesign();
    routeExportToActiveDesign();
    resizeDesigns();
    window.addEventListener("resize",resizeDesigns,{passive:true});
    window.addEventListener("orientationchange",()=>setTimeout(resizeDesigns,150),{passive:true});
  }

  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",()=>setTimeout(initSecondDesign,900));
  else setTimeout(initSecondDesign,900);
})();
