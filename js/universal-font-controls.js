"use strict";
/*
 * واجهة مساعدة فقط لنظام الخطوط.
 * مصدر الحقيقة الوحيد لتحديد التصميم النشط وتطبيق التنسيق هو PrayerFontCore.
 * هذا يمنع أي مستمع قديم من تعديل تصميم آخر بعد إعادة ترتيب الكاروسيل.
 */
(function(){
  function core(){return window.PrayerFontCore||null;}
  function activeDesign(){return core()?.activeRoot?.()||null;}
  function roleTargets(role){return core()?.targetsFor?.(role)||[];}
  function load(){core()?.load?.();}

  function rgbToHex(rgb){
    const m=String(rgb||'').match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
    if(!m)return '#ffffff';
    return '#'+[m[1],m[2],m[3]].map(n=>Number(n).toString(16).padStart(2,'0')).join('');
  }
  function collectDesignColors(){
    const root=activeDesign();if(!root)return [];
    const colors=new Set();
    [root,...root.querySelectorAll('*')].forEach(el=>{
      const c=getComputedStyle(el).color;
      if(c&&c!=='rgba(0, 0, 0, 0)')colors.add(rgbToHex(c));
    });
    return Array.from(colors).filter(c=>/^#[0-9a-f]{6}$/i.test(c));
  }
  function markSelected(c){
    document.querySelectorAll('#designColorPalette .palette-color').forEach(b=>b.classList.toggle('selected',(b.dataset.color||'').toLowerCase()===String(c||'').toLowerCase()));
  }
  function applyColor(c){
    const input=document.getElementById('fontColor');if(!input)return;
    input.value=c;markSelected(c);core()?.apply?.('fontColor');
  }
  function addSwatch(parent,color,cls=''){
    const b=document.createElement('button');b.type='button';b.className=`palette-color ${cls}`.trim();b.dataset.color=color;b.style.background=color;b.title=color;b.addEventListener('click',()=>applyColor(color));parent.appendChild(b);
  }
  function renderDesignColors(){
    const sw=document.querySelector('#designColorPalette .design-color-swatches');if(!sw)return;
    sw.innerHTML='';collectDesignColors().forEach(c=>addSwatch(sw,c,'design-swatch'));markSelected(document.getElementById('fontColor')?.value);
  }
  function buildColorPalette(){
    const input=document.getElementById('fontColor');if(!input||document.getElementById('designColorPalette'))return;
    input.style.display='none';
    const box=document.createElement('div');box.id='designColorPalette';box.innerHTML='<div class="palette-title">ألوان النسق</div><div class="theme-base-row"></div><div class="theme-shade-grid"></div><div class="palette-title standard-title">ألوان قياسية</div><div class="standard-colors"></div><div class="palette-title design-title">ألوان التصميم الحالي</div><div class="design-color-swatches"></div>';
    const st=document.createElement('style');st.id='officeLikeColorPaletteStyles';st.textContent='#designColorPalette{margin-top:8px;padding:10px;border:1px solid rgba(255,255,255,.12);border-radius:10px;background:rgba(3,16,24,.28)}#designColorPalette .palette-title{font-size:13px;font-weight:800;margin:2px 0 8px}#designColorPalette .theme-base-row,#designColorPalette .theme-shade-grid{display:grid;grid-template-columns:repeat(10,minmax(22px,1fr));gap:4px}#designColorPalette .theme-base-row{margin-bottom:5px}#designColorPalette .theme-shade-grid{grid-auto-flow:column;grid-template-rows:repeat(5,28px);margin-bottom:12px}#designColorPalette .standard-colors{display:grid;grid-template-columns:repeat(10,minmax(22px,1fr));gap:4px;margin-bottom:12px}#designColorPalette .design-color-swatches{display:flex;flex-wrap:wrap;gap:5px}.palette-color{width:100%;height:30px;min-width:0;padding:0;border:1px solid rgba(255,255,255,.28);border-radius:3px;cursor:pointer}.theme-base-row .palette-color{height:34px}.design-color-swatches .palette-color{width:28px;height:28px;border-radius:5px}.palette-color.selected{outline:2px solid #fff;outline-offset:2px}';document.head.appendChild(st);
    input.insertAdjacentElement('afterend',box);
    const base=['#70ad47','#4472c4','#ffc000','#a5a5a5','#ed7d31','#5b9bd5','#44546a','#e7e6e6','#000000','#ffffff'];
    const standard=['#7030a0','#002060','#0070c0','#00b0f0','#00b050','#92d050','#ffff00','#ffc000','#ff0000','#c00000'];
    base.forEach(c=>addSwatch(box.querySelector('.theme-base-row'),c));
    standard.forEach(c=>addSwatch(box.querySelector('.standard-colors'),c));
    renderDesignColors();
  }
  function init(){
    buildColorPalette();
    window.addEventListener('prayerDesignChanged',()=>setTimeout(()=>{load();renderDesignColors();},100));
    document.getElementById('elementSelect')?.addEventListener('change',()=>setTimeout(load,0));
  }
  window.PrayerUniversalFonts={activeDesign,roleTargets,load,renderDesignColors};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();