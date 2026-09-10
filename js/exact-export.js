"use strict";

(function(){
  const WIDTH=1024;
  const HEIGHT=1448;

  function activeDesign(){
    const track=document.querySelector(".design-carousel-track");
    if(!track) return document.getElementById("design");

    const slides=Array.from(track.querySelectorAll(":scope > .design-slide"));
    if(!slides.length) return document.getElementById("design");

    let index=0;
    const dot=document.querySelector(".night-carousel-dots .design-carousel-dot.active[data-dot]") ||
              document.querySelector(".final-carousel-dots .design-carousel-dot.active[data-dot]") ||
              document.querySelector(".design-carousel-dots .design-carousel-dot.active[data-dot]");
    if(dot) index=Number(dot.dataset.dot)||0;

    const slide=slides[Math.max(0,Math.min(index,slides.length-1))];
    return slide?.firstElementChild || document.getElementById("design");
  }

  function collectCss(){
    let css="";
    for(const sheet of Array.from(document.styleSheets)){
      try{
        for(const rule of Array.from(sheet.cssRules||[])) css+=rule.cssText+"\n";
      }catch(e){}
    }
    return css;
  }

  function copyFormValues(source,clone){
    const src=source.querySelectorAll("input,textarea,select");
    const dst=clone.querySelectorAll("input,textarea,select");
    src.forEach((el,i)=>{
      const c=dst[i]; if(!c) return;
      if(el.tagName==="TEXTAREA") c.textContent=el.value;
      else if(el.tagName==="SELECT") Array.from(c.options).forEach((o,n)=>o.selected=el.options[n]?.selected||false);
      else {c.setAttribute("value",el.value); if(el.checked)c.setAttribute("checked","");}
    });
  }

  function inlineRuntimeStyles(source,clone){
    const src=[source,...source.querySelectorAll("*")];
    const dst=[clone,...clone.querySelectorAll("*")];
    src.forEach((el,i)=>{
      const c=dst[i]; if(!c) return;
      const st=getComputedStyle(el);
      c.style.fontFamily=st.fontFamily;
      c.style.fontSize=st.fontSize;
      c.style.fontWeight=st.fontWeight;
      c.style.fontStyle=st.fontStyle;
      c.style.lineHeight=st.lineHeight;
      c.style.letterSpacing=st.letterSpacing;
      c.style.color=st.color;
      c.style.textAlign=st.textAlign;
      c.style.textShadow=st.textShadow;
      c.style.direction=st.direction;
      c.style.boxSizing=st.boxSizing;
    });
  }

  async function renderExact(design){
    if(document.fonts?.ready){try{await document.fonts.ready}catch(e){}}

    const clone=design.cloneNode(true);
    copyFormValues(design,clone);
    inlineRuntimeStyles(design,clone);

    clone.style.zoom="1";
    clone.style.transform="none";
    clone.style.transformOrigin="top left";
    clone.style.width=WIDTH+"px";
    clone.style.height=HEIGHT+"px";
    clone.style.margin="0";
    clone.style.position="relative";

    const css=collectCss().replace(/<\/style/gi,"<\\/style");
    const wrapper=`<div xmlns="http://www.w3.org/1999/xhtml" style="width:${WIDTH}px;height:${HEIGHT}px;margin:0;padding:0;overflow:hidden;">\n<style>${css}</style>\n${clone.outerHTML}\n</div>`;
    const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}"><foreignObject x="0" y="0" width="100%" height="100%">${wrapper}</foreignObject></svg>`;

    const blob=new Blob([svg],{type:"image/svg+xml;charset=utf-8"});
    const url=URL.createObjectURL(blob);
    try{
      const img=new Image();
      await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=reject;img.src=url;});
      const canvas=document.createElement("canvas");
      const scale=2;
      canvas.width=WIDTH*scale;
      canvas.height=HEIGHT*scale;
      const ctx=canvas.getContext("2d");
      ctx.setTransform(scale,0,0,scale,0,0);
      ctx.drawImage(img,0,0,WIDTH,HEIGHT);
      return canvas;
    }finally{URL.revokeObjectURL(url);}
  }

  function download(canvas,format){
    const f=(format||"png").toLowerCase();
    const mime=f==="jpg"||f==="jpeg"?"image/jpeg":f==="webp"?"image/webp":"image/png";
    const ext=f==="jpeg"?"jpg":f;
    canvas.toBlob(blob=>{
      if(!blob){alert("تعذر إنشاء الصورة");return;}
      const url=URL.createObjectURL(blob);
      const a=document.createElement("a");
      a.href=url;
      a.download=`prayer-preview.${ext}`;
      document.body.appendChild(a);
      a.click();a.remove();
      setTimeout(()=>URL.revokeObjectURL(url),2000);
    },mime,mime==="image/png"?undefined:.98);
  }

  async function exportExact(format){
    const design=activeDesign();
    if(!design) return;
    try{
      const canvas=await renderExact(design);
      download(canvas,format);
    }catch(error){
      console.error("Exact export failed",error);
      alert("تعذر تصدير المعاينة كما هي. أعد المحاولة بعد لحظة.");
    }
  }

  window.addEventListener("click",function(event){
    const btn=event.target.closest?.("[data-export-format],#exportBtn");
    if(!btn) return;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    exportExact(btn.dataset.exportFormat||"png");
  },true);
})();
