"use strict";
(function(){
  const APK_FIX_ID = "aoqatAndroidUiFixesV115";
  if (window[APK_FIX_ID]) return;
  window[APK_FIX_ID] = true;

  function injectAndroidStyles(){
    if(document.getElementById("androidV115CompactHeader")) return;
    const s=document.createElement("style");
    s.id="androidV115CompactHeader";
    s.textContent=`
      .topbar .brand{gap:7px!important;min-width:0!important}
      .topbar .brand-icon{font-size:18px!important;line-height:1!important}
      .topbar .brand h1{font-size:15px!important;line-height:1.15!important;margin:0!important;font-weight:800!important;letter-spacing:0!important}
      .topbar .brand p{font-size:9px!important;line-height:1.25!important;margin-top:2px!important;opacity:.82!important}
      .topbar .top-export,.topbar #exportBtn,.topbar button[id*="save" i],.topbar button[class*="save" i]{font-size:11px!important;line-height:1.1!important;padding:7px 10px!important;min-height:32px!important;border-radius:9px!important;gap:5px!important;white-space:nowrap!important}
      .topbar .top-export span,.topbar #exportBtn span{font-size:12px!important}
      @media(max-width:430px){
        .topbar .brand h1{font-size:14px!important}
        .topbar .brand p{font-size:8.5px!important}
        .topbar .top-export,.topbar #exportBtn,.topbar button[id*="save" i],.topbar button[class*="save" i]{font-size:10.5px!important;padding:6px 9px!important;min-height:30px!important}
      }
    `;
    document.head.appendChild(s);
  }

  function visibleDesignRoots(){
    const roots=[];
    document.querySelectorAll('.design-carousel-track > .design-slide').forEach(slide=>{
      if(slide.dataset.legacySlide==='true'||slide.closest('.removed-design-storage')) return;
      const root=slide.firstElementChild;
      if(root) roots.push(root);
    });
    const legacy=document.querySelector('.previewBox > #design');
    if(legacy&&!roots.includes(legacy)&&!legacy.closest('.removed-design-storage')) roots.push(legacy);
    return roots;
  }

  function activeDesign(){
    const pinned=window.__prayerActiveDesignElement;
    if(pinned&&document.body.contains(pinned)&&!pinned.closest('.removed-design-storage')) return pinned;
    const roots=visibleDesignRoots();
    const idx=Number(window.__prayerActiveDesignIndex);
    if(Number.isFinite(idx)&&roots[idx]) return roots[idx];
    const car=document.querySelector('.design-carousel');
    const cr=car?.getBoundingClientRect();
    if(cr&&cr.width){
      const center=cr.left+cr.width/2;
      let best=null,dist=Infinity;
      roots.forEach(root=>{
        const r=root.closest('.design-slide')?.getBoundingClientRect()||root.getBoundingClientRect();
        if(!r.width) return;
        const d=Math.abs((r.left+r.width/2)-center);
        if(d<dist){dist=d;best=root;}
      });
      if(best) return best;
    }
    return roots[0]||document.getElementById('design');
  }

  const roleAliases={
    day:['day','weekday'],hday:['hday','hd','hijriday','hijri-day'],gday:['gday','gd','gregorianday','gregorian-day'],
    hmonth:['hmonth','hm','hijrimonth','hijri-month'],gmonth:['gmonth','gm','gregorianmonth','gregorian-month'],
    hyear:['hyear','hy','hijriyear','hijri-year'],gyear:['gyear','gy','gregorianyear','gregorian-year'],
    footer:['footer','footertext'],quran:['quran','verse'],
    fajr:['fajr'],sunrise:['sunrise'],dhuhr:['dhuhr'],asr:['asr'],maghrib:['maghrib'],isha:['isha']
  };
  const arabicPrayer={fajr:'الفجر',sunrise:'الشروق',dhuhr:'الظهر',asr:'العصر',maghrib:'المغرب',isha:'العشاء'};
  const rowSelector='.prayer-row,.sd2-prayer-row,.sd3-prayer-row,.sd4-prayer-row,.nd-prayer-row,.nf-row,.ref-prayer-row,.or-row,[data-prayer-row]';

  function normalizedTokens(el){
    const a=[];
    ['data-field','data-f','id'].forEach(k=>{const v=el.getAttribute?.(k);if(v)a.push(v);});
    if(el.classList) el.classList.forEach(c=>a.push(c));
    return a.map(x=>String(x).toLowerCase().replace(/[_\s]/g,'-'));
  }

  function elementMatchesRole(el,role){
    const aliases=roleAliases[role]||[];
    const tokens=normalizedTokens(el);
    return aliases.some(a=>tokens.some(t=>t===a||t.includes(a)));
  }

  function roleTargets(root,role){
    if(!root||!role) return [];
    const out=[];
    const seen=new Set();
    const add=el=>{if(el&&!seen.has(el)){seen.add(el);out.push(el);}};

    if(arabicPrayer[role]){
      root.querySelectorAll(`[data-field="${role}"],[data-f="${role}"]`).forEach(el=>add(el.closest(rowSelector)||el));
      root.querySelectorAll(rowSelector).forEach(row=>{
        if((row.textContent||'').includes(arabicPrayer[role])) add(row);
      });
      const expanded=[];
      out.forEach(row=>{
        expanded.push(row);
        row.querySelectorAll('span,b,strong,em,i,div,time').forEach(el=>{
          if(el.matches('.ref-prayer-icon,[data-icon]')) return;
          if((el.textContent||'').trim()) expanded.push(el);
        });
      });
      return Array.from(new Set(expanded));
    }

    [root,...root.querySelectorAll('*')].forEach(el=>{if(elementMatchesRole(el,role)) add(el);});
    return out;
  }

  function roleFromSelectValue(value){
    const map={
      '.quran':'quran','#dayP':'day','#hijriDayP':'hday','#gregorianDayP':'gday','#hijriMonthP':'hmonth','#gregorianMonthP':'gmonth',
      '#hijriYearP':'hyear','#gregorianYearP':'gyear','#footerP':'footer',
      '.prayer-row:nth-child(1)':'fajr','.prayer-row:nth-child(2)':'sunrise','.prayer-row:nth-child(3)':'dhuhr',
      '.prayer-row:nth-child(4)':'asr','.prayer-row:nth-child(5)':'maghrib','.prayer-row:nth-child(6)':'isha'
    };
    if(map[value]) return map[value];
    const v=String(value||'').toLowerCase();
    for(const [role,aliases] of Object.entries(roleAliases)) if(aliases.some(a=>v.includes(a))) return role;
    return null;
  }

  function shadowValue(v){
    if(v==='black') return '2px 2px 6px rgba(0,0,0,.85)';
    if(v==='gold') return '2px 2px 8px rgba(212,168,63,.9)';
    if(v==='green') return '2px 2px 8px rgba(25,130,75,.9)';
    return 'none';
  }

  function applyFontControl(controlId){
    const root=activeDesign();
    const role=roleFromSelectValue(document.getElementById('elementSelect')?.value);
    const targets=roleTargets(root,role);
    if(!targets.length) return;
    const v=document.getElementById(controlId)?.value;
    if(v==null) return;
    targets.forEach(t=>{
      if(controlId==='fontFamily'&&v) t.style.fontFamily=`"${v}", Arial, sans-serif`;
      else if(controlId==='fontSize'&&v) t.style.fontSize=`${v}px`;
      else if(controlId==='fontWeight'&&v) t.style.fontWeight=v;
      else if(controlId==='fontColor'&&v) t.style.color=v;
      else if(controlId==='textAlign'&&v) t.style.textAlign=v;
      else if(controlId==='textShadow') t.style.textShadow=shadowValue(v);
    });
    window.dispatchEvent(new CustomEvent('prayerFontChanged',{detail:{design:root,role}}));
  }

  const valueMap={
    day:['dayName',v=>v],hday:['hijriDay',v=>v],gday:['gregorianDay',v=>v],
    hmonth:['hijriMonth',v=>v],gmonth:['gregorianMonth',v=>v],
    hyear:['hijriYear',v=>v?`${v}هـ`:v],gyear:['gregorianYear',v=>v?`${v}م`:v],footer:['footerText',v=>v],
    fajr:['fajr',v=>v],sunrise:['sunrise',v=>v],dhuhr:['dhuhr',v=>v],asr:['asr',v=>v],maghrib:['maghrib',v=>v],isha:['isha',v=>v]
  };

  function setRoleText(root,role,value){
    const targets=roleTargets(root,role);
    if(!targets.length) return;
    if(arabicPrayer[role]){
      targets.forEach(el=>{
        const cls=(el.className||'').toString();
        const data=(el.getAttribute?.('data-field')||el.getAttribute?.('data-f')||'');
        const txt=(el.textContent||'').trim();
        const looksTime=/time|clock/i.test(cls)||data===role||/^\d{1,2}:\d{2}$/.test(txt);
        if(looksTime&&!txt.includes(arabicPrayer[role])) el.textContent=value;
      });
      return;
    }
    targets.forEach(el=>{if(el.children.length===0||el.matches('[data-field],[data-f]')) el.textContent=value;});
  }

  function syncDataToRoot(root){
    if(!root) return;
    Object.entries(valueMap).forEach(([role,[id,format]])=>{
      const ctl=document.getElementById(id);
      if(ctl) setRoleText(root,role,format(ctl.value));
    });
  }

  function syncAllData(){visibleDesignRoots().forEach(syncDataToRoot);}

  function applyBackgroundToAll(){
    const type=document.getElementById('bgType')?.value;
    if(type!=='gradient') return;
    const c1=document.getElementById('color1')?.value;
    const c2=document.getElementById('color2')?.value;
    if(!c1||!c2) return;
    visibleDesignRoots().forEach(root=>{
      root.style.backgroundImage=`radial-gradient(circle at 50% 47%,rgba(20,91,82,.45),transparent 36%),radial-gradient(circle at 50% 55%,rgba(4,30,30,.35),transparent 65%),linear-gradient(145deg,${c1},${c2} 55%,#031b1b)`;
    });
  }

  function applyImageBackground(file){
    if(!file) return;
    const r=new FileReader();
    r.onload=()=>visibleDesignRoots().forEach(root=>{
      root.style.backgroundImage=`url("${r.result}")`;
      root.style.backgroundSize='cover';root.style.backgroundPosition='center';
    });
    r.readAsDataURL(file);
  }

  function bindUniversalEvents(){
    if(document.documentElement.dataset.androidUniversalBound==='1') return;
    document.documentElement.dataset.androidUniversalBound='1';
    const fontIds=new Set(['fontFamily','fontSize','fontWeight','fontColor','textAlign','textShadow']);
    const dataIds=new Set(Object.values(valueMap).map(x=>x[0]));
    document.addEventListener('input',e=>{
      const id=e.target?.id;
      if(fontIds.has(id)) setTimeout(()=>applyFontControl(id),0);
      if(dataIds.has(id)) setTimeout(syncAllData,0);
      if(id==='color1'||id==='color2') setTimeout(applyBackgroundToAll,0);
    },true);
    document.addEventListener('change',e=>{
      const id=e.target?.id;
      if(fontIds.has(id)) setTimeout(()=>applyFontControl(id),0);
      if(dataIds.has(id)) setTimeout(syncAllData,0);
      if(id==='bgType'||id==='color1'||id==='color2') setTimeout(applyBackgroundToAll,0);
      if(id==='bgFile') applyImageBackground(e.target.files?.[0]);
    },true);
    window.addEventListener('prayerDesignChanged',()=>setTimeout(()=>syncDataToRoot(activeDesign()),30));
  }

  function refreshAndroidDesignVisibility(){
    window.dispatchEvent(new CustomEvent('aoqatModulesReady'));
  }

  function watchAndroidDesignSlides(){
    const root=document.querySelector('.design-carousel-track')||document.body;
    let lastCount=-1;
    const refresh=()=>{
      const count=document.querySelectorAll('.design-carousel-track > .design-slide').length;
      if(count!==lastCount){lastCount=count;setTimeout(refreshAndroidDesignVisibility,40);}
    };
    refresh();
    new MutationObserver(refresh).observe(root,{childList:true,subtree:true});
    [350,800,1400,2400].forEach(ms=>setTimeout(refreshAndroidDesignVisibility,ms));
  }

  function fixAndroidColorSwatches(){
    if(document.getElementById("androidColorSwatchFix")) return;
    const s=document.createElement("style");
    s.id="androidColorSwatchFix";
    s.textContent=`
      #designColorPalette .palette-color{
        background-color:var(--aoqat-swatch-color)!important;
        background-image:none!important;
      }
    `;
    document.head.appendChild(s);
    const paint=()=>{
      document.querySelectorAll("#designColorPalette .palette-color").forEach(b=>{
        const color=b.dataset.color;
        if(!color) return;
        b.style.setProperty("--aoqat-swatch-color",color);
        b.style.setProperty("background-color",color,"important");
        b.style.setProperty("background-image","none","important");
      });
    };
    paint();
    const host=document.getElementById("designColorPalette")||document.body;
    new MutationObserver(paint).observe(host,{childList:true,subtree:true});
    window.addEventListener("prayerDesignChanged",()=>setTimeout(paint,120));
  }

  function organizeAndroidBackgroundTools(){
    const panel=document.getElementById('backgroundPanel');
    const tools=document.getElementById('backgroundDesignTools');
    if(!panel||!tools) return false;
    const grid=tools.querySelector('.bg-tools-grid');
    if(!grid) return false;
    let toggle=tools.querySelector('.bg-tools-toggle');
    if(!toggle){
      const oldTitle=tools.querySelector('.bg-tools-title');
      toggle=document.createElement('button');
      toggle.type='button';toggle.className='bg-tools-toggle';toggle.setAttribute('aria-expanded','false');
      toggle.innerHTML='<span>🛠 أدوات تعديل التصميم</span><span class="bg-tools-arrow">▼</span>';
      if(oldTitle) oldTitle.replaceWith(toggle); else tools.insertBefore(toggle,grid);
      toggle.addEventListener('click',()=>{
        const open=!tools.classList.contains('is-open');
        tools.classList.toggle('is-open',open);
        toggle.setAttribute('aria-expanded',String(open));
      });
    }

    const bgType=document.getElementById('bgType');
    const gradientBox=document.getElementById('gradientBox');
    const imageBox=document.getElementById('imageBox');
    if(bgType) bgType.closest('label')?.style.setProperty('display','none','important');
    if(gradientBox) gradientBox.style.setProperty('display','none','important');
    if(imageBox) imageBox.style.setProperty('display','none','important');

    let changeBtn=document.getElementById('androidChangeBackgroundBtn');
    if(!changeBtn){
      changeBtn=document.createElement('button');
      changeBtn.type='button';
      changeBtn.id='androidChangeBackgroundBtn';
      changeBtn.textContent='🖼️ تغيير الخلفية';
      changeBtn.addEventListener('click',event=>{
        event.preventDefault();
        const input=document.getElementById('bgFile');
        if(input){
          if(bgType) bgType.value='image';
          input.click();
        }
      });
    }
    if(changeBtn.parentElement!==grid) grid.appendChild(changeBtn);

    const manual=document.querySelector('.manual-edit-toggle-wrap');
    const save=document.getElementById('saveDesignAdjustments');
    let footer=document.getElementById('backgroundFooterControl');
    if(!footer){
      const footerPanel=document.getElementById('footerPanel');
      if(footerPanel){
        footer=document.createElement('div');footer.id='backgroundFooterControl';
        const btn=document.createElement('button');btn.type='button';btn.id='backgroundFooterToggle';btn.innerHTML='✍ <span>النص السفلي</span>';
        footer.appendChild(btn);footer.appendChild(footerPanel);
        btn.addEventListener('click',event=>{
          event.preventDefault();event.stopPropagation();
          const open=!footerPanel.classList.contains('footer-inside-open');
          footerPanel.classList.toggle('footer-inside-open',open);btn.classList.toggle('is-open',open);
        });
      }
    }
    const reset=document.getElementById('resetPositions');
    [manual,save,footer,reset].forEach(el=>{if(el&&el.parentElement!==grid) grid.appendChild(el);});

    let s=document.getElementById('androidBackgroundToolsLayout');
    if(!s){
      s=document.createElement('style');s.id='androidBackgroundToolsLayout';
      s.textContent=`
        #backgroundDesignTools{margin-top:0!important;padding-top:0!important;border-top:0!important}
        #backgroundDesignTools .bg-tools-toggle{width:100%!important;display:flex!important;align-items:center!important;justify-content:space-between!important;min-height:42px!important;background:#176f9f!important;color:#fff!important;border:1px solid rgba(255,255,255,.18)!important;border-radius:9px!important;padding:9px 12px!important;font-weight:800!important}
        #backgroundDesignTools .bg-tools-grid{display:none!important;gap:7px!important;margin-top:7px!important}
        #backgroundDesignTools.is-open .bg-tools-grid{display:grid!important}
        #backgroundDesignTools .bg-tools-arrow{transition:transform .18s ease}
        #backgroundDesignTools.is-open .bg-tools-arrow{transform:rotate(180deg)}
        #androidChangeBackgroundBtn{background:#176f9f!important;color:#fff!important;border:1px solid rgba(255,255,255,.18)!important}
        #backgroundDesignTools #backgroundFooterControl{margin:0!important;padding:0!important;border:0!important;width:100%!important}
        #backgroundDesignTools #backgroundFooterToggle{margin:0!important;width:100%!important}
      `;
      document.head.appendChild(s);
    }
    return true;
  }

  function watchAndroidBackgroundTools(){
    let tries=0;
    const timer=setInterval(()=>{
      tries++;
      if(organizeAndroidBackgroundTools()||tries>100) clearInterval(timer);
    },120);
    organizeAndroidBackgroundTools();
    window.addEventListener('aoqatModulesReady',()=>setTimeout(organizeAndroidBackgroundTools,80));
  }

  function enableNativeNotificationBridge(){
    if(window.AndroidNative && typeof window.Notification==="undefined"){
      window.Notification={
        permission:"granted",
        requestPermission:async function(){return "granted";}
      };
    }
  }

  function init(){
    enableNativeNotificationBridge();
    injectAndroidStyles();
    fixAndroidColorSwatches();
    bindUniversalEvents();
    watchAndroidDesignSlides();
    watchAndroidBackgroundTools();
    setTimeout(syncAllData,350);
    setTimeout(syncAllData,1100);
    setTimeout(syncAllData,2200);
    window.AoqatAndroidUniversal={activeDesign,roleTargets,syncAllData,applyFontControl};
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init,{once:true}); else init();
})();
