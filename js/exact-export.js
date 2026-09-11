"use strict";

(function(){
  const WIDTH=1024;
  const HEIGHT=1448;
  let bypass=false;
  let loaderPromise=null;

  function activeDesign(){
    const track=document.querySelector(".design-carousel-track");
    if(!track) return document.getElementById("design");
    const slides=Array.from(track.querySelectorAll(":scope > .design-slide"));
    if(!slides.length) return document.getElementById("design");

    let index=Number(window.__prayerActiveDesignIndex);
    if(!Number.isFinite(index)){
      const dot=document.querySelector(".ornate-carousel-dots .design-carousel-dot.active[data-dot]") ||
                document.querySelector(".night-carousel-dots .design-carousel-dot.active[data-dot]") ||
                document.querySelector(".final-carousel-dots .design-carousel-dot.active[data-dot]") ||
                document.querySelector(".design-carousel-dots .design-carousel-dot.active[data-dot]");
      index=dot?Number(dot.dataset.dot)||0:0;
    }
    index=Math.max(0,Math.min(index,slides.length-1));
    return slides[index]?.firstElementChild || document.getElementById("design");
  }

  function loadHtml2Canvas(){
    if(typeof window.html2canvas==="function") return Promise.resolve(window.html2canvas);
    if(loaderPromise) return loaderPromise;
    loaderPromise=new Promise((resolve,reject)=>{
      const existing=document.querySelector('script[data-html2canvas]');
      if(existing){
        existing.addEventListener("load",()=>typeof window.html2canvas==="function"?resolve(window.html2canvas):reject(new Error("html2canvas missing")),{once:true});
        existing.addEventListener("error",reject,{once:true});
        return;
      }
      const s=document.createElement("script");
      s.src="https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js";
      s.async=true;s.dataset.html2canvas="true";
      s.onload=()=>typeof window.html2canvas==="function"?resolve(window.html2canvas):reject(new Error("html2canvas missing"));
      s.onerror=reject;document.head.appendChild(s);
    });
    return loaderPromise;
  }

  function copyCanvasContent(source,clone){
    const src=source.querySelectorAll("canvas"),dst=clone.querySelectorAll("canvas");
    src.forEach((canvas,i)=>{const target=dst[i];if(!target)return;try{target.width=canvas.width;target.height=canvas.height;target.getContext("2d")?.drawImage(canvas,0,0)}catch(e){}});
  }

  function addExportOnlyStyles(host,source,clone){
    const style=document.createElement("style");
    if(source.classList.contains("night-design")){
      clone.classList.add("export-night-design");
      style.textContent=`.export-night-design{isolation:isolate!important}.export-night-design:after{display:none!important;content:none!important}.export-night-design:before,.export-night-design .nd-pattern,.export-night-design .nd-stars,.export-night-design .nd-moon,.export-night-design .nd-mosque,.export-night-design .nd-export-arch{z-index:0!important}.export-night-design .nd-export-arch{position:absolute!important;left:84px!important;right:84px!important;top:14px!important;height:430px!important;border:6px solid #b97828!important;border-bottom:0!important;border-radius:52% 52% 0 0/70% 70% 0 0!important;box-shadow:inset 0 0 0 5px #061b2e!important;pointer-events:none!important;box-sizing:border-box!important}.export-night-design .nd-title,.export-night-design .nd-subtitle,.export-night-design .nd-date,.export-night-design .nd-day,.export-night-design .nd-prayers,.export-night-design .nd-book,.export-night-design .nd-lantern,.export-night-design .nd-footer{position:absolute;z-index:5!important}.export-night-design .nd-prayers{display:flex!important}.export-night-design .nd-prayer-row{position:relative!important;z-index:6!important}`;
    }
    if(source.classList.contains("ornate-design")){
      clone.classList.add("export-ornate-design");
      style.textContent+=`.export-ornate-design{isolation:isolate!important}.export-ornate-design .od-lattice,.export-ornate-design .od-inner,.export-ornate-design .od-arch,.export-ornate-design .od-stars,.export-ornate-design .od-moon,.export-ornate-design .od-mosque{z-index:0!important}.export-ornate-design .od-title,.export-ornate-design .od-subtitle,.export-ornate-design .od-date,.export-ornate-design .od-day,.export-ornate-design .od-prayers,.export-ornate-design .od-book,.export-ornate-design .od-lantern,.export-ornate-design .od-footer{z-index:5!important}`;
    }
    host.appendChild(style);
  }

  function fixSpecialDesignForExport(source,clone){
    if(source.classList.contains("night-design")){
      const arch=document.createElement("div");arch.className="nd-export-arch";clone.insertBefore(arch,clone.firstChild);
    }
    if(source.classList.contains("fourth-design")){
      clone.style.boxShadow="none";
      const sky=clone.querySelector(".sd4-sky");if(sky){sky.style.background="linear-gradient(180deg, rgba(99,169,207,.16) 0%, rgba(255,255,255,.10) 30%, rgba(255,255,255,0) 55%)";sky.style.filter="none";sky.style.boxShadow="none"}
      const prayers=clone.querySelector(".sd4-prayers");if(prayers){prayers.style.top="630px";prayers.style.gap="14px"}
      clone.querySelectorAll(".sd4-prayer-row").forEach(row=>row.style.height="88px");
      const footer=clone.querySelector(".sd4-footer");if(footer){footer.style.boxSizing="border-box";footer.style.height="96px";footer.style.minHeight="96px";footer.style.bottom="38px";footer.style.padding="12px 28px"}
      clone.querySelectorAll(".sd4-day,.sd4-date-card,.sd4-prayer-row,.sd4-footer").forEach(el=>el.style.filter="none");
    }
  }

  function prepareClone(design){
    const host=document.createElement("div");host.setAttribute("aria-hidden","true");host.style.cssText=`position:fixed;left:-20000px;top:0;width:${WIDTH}px;height:${HEIGHT}px;overflow:hidden;z-index:-2147483647;pointer-events:none;`;
    const clone=design.cloneNode(true);clone.removeAttribute("id");clone.style.zoom="1";clone.style.transform="none";clone.style.transformOrigin="top left";clone.style.width=WIDTH+"px";clone.style.height=HEIGHT+"px";clone.style.margin="0";clone.style.maxWidth="none";clone.style.maxHeight="none";clone.style.flex="0 0 auto";
    addExportOnlyStyles(host,design,clone);fixSpecialDesignForExport(design,clone);host.appendChild(clone);document.body.appendChild(host);copyCanvasContent(design,clone);return{host,clone};
  }

  async function renderPreview(design){
    if(document.fonts?.ready){try{await document.fonts.ready}catch(e){}}
    const html2canvas=await loadHtml2Canvas();const{host,clone}=prepareClone(design);
    try{await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));return await html2canvas(clone,{backgroundColor:null,scale:2,width:WIDTH,height:HEIGHT,windowWidth:WIDTH,windowHeight:HEIGHT,scrollX:0,scrollY:0,useCORS:true,allowTaint:true,logging:false,imageTimeout:8000,foreignObjectRendering:false,removeContainer:true})}finally{host.remove()}
  }

  function canvasBlob(canvas,format="jpg"){
    const f=(format||"jpg").toLowerCase(),isJpg=f==="jpg"||f==="jpeg",mime=isJpg?"image/jpeg":f==="webp"?"image/webp":"image/png";
    return new Promise(resolve=>canvas.toBlob(resolve,mime,mime==="image/png"?undefined:.98));
  }

  function downloadBlob(blob,ext="jpg"){
    if(!blob)return;const url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download=`prayer-preview.${ext}`;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),2500);
  }

  async function download(canvas,format){
    const f=(format||"jpg").toLowerCase(),ext=f==="jpeg"?"jpg":f;
    const blob=await canvasBlob(canvas,f);downloadBlob(blob,ext);
  }

  async function saveToPhone(canvas){
    const blob=await canvasBlob(canvas,"jpg");if(!blob)return;
    const file=new File([blob],"prayer-preview.jpg",{type:"image/jpeg"});
    if(navigator.share&&navigator.canShare&&navigator.canShare({files:[file]})){
      try{await navigator.share({files:[file],title:"مواقيت الصلاة"});return}catch(error){if(error?.name==="AbortError")return;}
    }
    downloadBlob(blob,"jpg");
  }

  function fallbackNative(button){bypass=true;try{button.click()}finally{setTimeout(()=>{bypass=false},0)}}

  async function exportExact(format,button,phoneMode=false){
    const design=activeDesign();if(!design)return;const oldText=button.textContent;button.disabled=true;button.textContent=phoneMode?"جاري الحفظ...":"جاري التصدير...";
    try{const canvas=await renderPreview(design);if(phoneMode)await saveToPhone(canvas);else await download(canvas,format)}catch(error){console.error("Preview export fallback",error);if(!phoneMode)fallbackNative(button)}finally{setTimeout(()=>{button.disabled=false;button.textContent=oldText},150)}
  }

  window.addEventListener("click",function(event){
    if(bypass)return;
    const btn=event.target.closest?.("[data-export-format],[data-save-phone],#exportBtn");
    if(!btn)return;
    event.preventDefault();event.stopPropagation();event.stopImmediatePropagation();
    const phoneMode=btn.hasAttribute("data-save-phone");
    exportExact(phoneMode?"jpg":(btn.dataset.exportFormat||"jpg"),btn,phoneMode);
  },true);
})();