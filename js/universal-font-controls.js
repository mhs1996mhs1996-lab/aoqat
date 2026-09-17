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
    const wrap=document.createElement('div');wrap.id='designColorPaletteWrap';
    const toggle=document.createElement('button');toggle.type='button';toggle.id='designColorPaletteToggle';toggle.setAttribute('aria-expanded','false');toggle.innerHTML='<span>🎨 الألوان</span><span class="palette-toggle-arrow">▼</span>';
    const box=document.createElement('div');box.id='designColorPalette';box.hidden=true;box.innerHTML='<div class="palette-title">ألوان النسق</div><div class="theme-base-row"></div><div class="theme-shade-grid"></div><div class="palette-title standard-title">ألوان قياسية</div><div class="standard-colors"></div><div class="palette-title design-title">ألوان التصميم الحالي</div><div class="design-color-swatches"></div>';
    wrap.append(toggle,box);
    const st=document.createElement('style');st.id='officeLikeColorPaletteStyles';st.textContent='#designColorPaletteWrap{margin-top:8px}#designColorPaletteToggle{width:100%;min-height:38px;padding:7px 10px;border:1px solid rgba(255,255,255,.16);border-radius:9px;background:rgba(31,58,75,.9);color:#fff;font:inherit;font-weight:800;display:flex;align-items:center;justify-content:space-between;cursor:pointer}#designColorPaletteToggle .palette-toggle-arrow{font-size:11px;opacity:.8;transition:transform .18s ease}#designColorPaletteWrap.palette-open #designColorPaletteToggle .palette-toggle-arrow{transform:rotate(180deg)}#designColorPalette[hidden]{display:none!important}#designColorPalette{margin-top:6px;padding:8px 10px;border:1px solid rgba(255,255,255,.12);border-radius:10px;background:rgba(3,16,24,.28)}#designColorPalette .palette-title{font-size:13px;font-weight:800;margin:1px 0 5px}#designColorPalette .theme-base-row{display:grid;grid-template-columns:repeat(10,minmax(22px,1fr));gap:4px;margin-bottom:6px}#designColorPalette .theme-shade-grid:empty{display:none!important;height:0!important;min-height:0!important;margin:0!important;padding:0!important}#designColorPalette .standard-title{margin-top:0!important}#designColorPalette .standard-colors{display:grid;grid-template-columns:repeat(10,minmax(22px,1fr));gap:4px;margin-bottom:6px}#designColorPalette .design-title{margin-top:2px!important}#designColorPalette .design-color-swatches{display:flex;flex-wrap:wrap;gap:5px}.palette-color{width:100%;height:30px;min-width:0;padding:0;border:1px solid rgba(255,255,255,.28);border-radius:3px;cursor:pointer}.theme-base-row .palette-color{height:34px}.design-color-swatches .palette-color{width:28px;height:28px;border-radius:5px}.palette-color.selected{outline:2px solid #fff;outline-offset:2px}';document.head.appendChild(st);
    input.insertAdjacentElement('afterend',wrap);
    const base=['#70ad47','#4472c4','#ffc000','#a5a5a5','#ed7d31','#5b9bd5','#44546a','#e7e6e6','#000000','#ffffff'];
    const standard=['#7030a0','#002060','#0070c0','#00b0f0','#00b050','#92d050','#ffff00','#ffc000','#ff0000','#c00000'];
    base.forEach(c=>addSwatch(box.querySelector('.theme-base-row'),c));
    standard.forEach(c=>addSwatch(box.querySelector('.standard-colors'),c));
    renderDesignColors();
    toggle.addEventListener('click',()=>{const open=box.hidden;box.hidden=!open;wrap.classList.toggle('palette-open',open);toggle.setAttribute('aria-expanded',String(open));if(open)renderDesignColors();});
  }
  function init(){
    buildColorPalette();
    window.addEventListener('prayerDesignChanged',()=>setTimeout(()=>{load();renderDesignColors();},100));
    document.getElementById('elementSelect')?.addEventListener('change',()=>setTimeout(load,0));
  }
  window.PrayerUniversalFonts={activeDesign,roleTargets,load,renderDesignColors};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();