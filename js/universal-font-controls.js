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
    input.value=c;markSelected(c);
    input.dispatchEvent(new Event('input',{bubbles:true}));
    input.dispatchEvent(new Event('change',{bubbles:true}));
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
    const st=document.createElement('style');st.id='officeLikeColorPaletteStyles';st.textContent='#fontPanel .font-controls{gap:1px!important;row-gap:1px!important}#fontPanel .font-controls>label,#fontPanel.inline-control-panel label{margin:0!important;padding:0!important;line-height:1.05!important;font-size:12px!important}#fontPanel .font-controls select,#fontPanel .font-controls input[type="number"]{min-height:30px!important;height:30px!important;margin:1px 0!important;padding-top:1px!important;padding-bottom:1px!important;font-size:13px!important}#fontPanel .font-upload{min-height:30px!important;height:30px!important;margin:1px 0!important;padding:3px 6px!important;display:flex!important;align-items:center!important;justify-content:center!important}#designColorPaletteWrap{margin:1px 0!important}#designColorPaletteToggle{width:100%;min-height:30px;height:30px;padding:3px 7px;border:1px solid rgba(255,255,255,.16);border-radius:7px;background:rgba(31,58,75,.9);color:#fff;font:inherit;font-weight:800;display:flex;align-items:center;justify-content:space-between;cursor:pointer}#designColorPaletteToggle .palette-toggle-arrow{font-size:10px;opacity:.8;transition:transform .18s ease}#designColorPaletteWrap.palette-open #designColorPaletteToggle .palette-toggle-arrow{transform:rotate(180deg)}#designColorPalette[hidden]{display:none!important}#designColorPalette{margin-top:2px;padding:4px 7px;border:1px solid rgba(255,255,255,.12);border-radius:8px;background:rgba(3,16,24,.28)}#designColorPalette .palette-title{font-size:12px;font-weight:800;line-height:1.1;margin:0 0 2px}#designColorPalette .theme-base-row{display:grid;grid-template-columns:repeat(10,minmax(20px,1fr));gap:3px;margin-bottom:2px}#designColorPalette .theme-shade-grid:empty{display:none!important;height:0!important;min-height:0!important;margin:0!important;padding:0!important}#designColorPalette .standard-title{margin:0 0 2px!important}#designColorPalette .standard-colors{display:grid;grid-template-columns:repeat(10,minmax(20px,1fr));gap:3px;margin-bottom:2px}#designColorPalette .design-title{margin:0 0 2px!important}#designColorPalette .design-color-swatches{display:flex;flex-wrap:wrap;gap:3px}.palette-color{width:100%;height:24px;min-width:0;padding:0;border:1px solid rgba(255,255,255,.28);border-radius:3px;cursor:pointer}.theme-base-row .palette-color{height:25px}.design-color-swatches .palette-color{width:23px;height:23px;border-radius:4px}.palette-color.selected{outline:2px solid #fff;outline-offset:1px}@media(max-width:800px){#fontPanel.inline-control-panel label{margin:0!important;padding:0!important}#fontPanel .font-controls{gap:1px!important;row-gap:1px!important}#fontPanel .font-controls select,#fontPanel .font-controls input[type="number"]{min-height:30px!important;height:30px!important}#fontPanel .font-upload{min-height:30px!important;height:30px!important}}';document.head.appendChild(st);
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