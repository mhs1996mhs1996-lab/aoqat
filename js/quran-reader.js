(function () {
  'use strict';
  if (window.AndroidNative?.configureAdhan) return;
  const markColors={"blue":["أزرق","#5379c3"],"green":["أخضر","#328663"],"amber":["ذهبي","#bd8b25"],"red":["أحمر","#c55050"],"purple":["بنفسجي","#8d60b3"]};
  const KEY='aoqatQuranReaderV1', TOTAL=604;
  const paths={index:'M4 6h16M4 12h16M4 18h16',wird:'M3 5c4-2 7-1 9 1 2-2 5-3 9-1v14c-4-2-7-1-9 1-2-2-5-3-9-1V5zm9 1v14',profile:'M8 7a4 4 0 1 0 8 0 4 4 0 1 0-8 0M4 22v-4c0-5 16-5 16 0v4',settings:'M3 6h18M3 18h18M8 3v6M16 15v6',mushaf:'M3 5c4-2 7-1 9 1 2-2 5-3 9-1v14c-4-2-7-1-9 1-2-2-5-3-9-1V5zm9 1v14',search:'M17 17l5 5M3 10a7 7 0 1 0 14 0 7 7 0 1 0-14 0',audio:'M3 14v-3a9 9 0 0 1 18 0v3M3 12h4v9H3zM17 12h4v9h-4z',library:'M3 3h18v18H3zM7 8h10M7 13h10M7 17h6',more:'M3 3h6v6H3zM15 3h6v6h-6zM3 15h6v6H3zM15 18h6M18 15v6'};
  const icons=Object.fromEntries(Object.entries(paths).map(([k,d])=>[k,`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${d}"/></svg>`]));
  const titles={index:'الفهرس',wird:'وردي',profile:'ملفاتي',settings:'الإعدادات',mushaf:'المصحف',search:'البحث',audio:'التلاوة',library:'المكتبة',more:'المزيد'};
  const readers=[['ar.alafasy','مشاري راشد العفاسي'],['ar.husary','محمود خليل الحصري'],['ar.minshawi','محمد صديق المنشاوي'],['ar.abdulbasitmurattal','عبد الباسط عبد الصمد']];
  let state={layout:'phone',page:1,theme:'sepia',font:44,reciter:'ar.alafasy',volume:80,goal:20,name:'',bookmarks:[],notes:[],days:{}};
  try {Object.assign(state,JSON.parse(localStorage.getItem(KEY)||'{}'));}catch(_){}
  state.layout='phone';
  state.page=Math.max(1,Math.min(TOTAL,Math.floor(Number(state.page)||1)));
  state.theme=['sepia','ivory','white','night','green','blue','contrast'].includes(state.theme)?state.theme:'sepia';
  state.font=Math.max(22,Math.min(80,Number(state.font)||44));
  if(!state.readingRevision && state.font===32)state.font=36;
  if(state.readingRevision===2 && state.font===36 && !state.fontCustomized)state.font=40;
  if(!state.fontCustomized && (state.readingRevision||0)<4)state.font=44;
  state.readingRevision=4;
  // Web-only reader experiment; Android keeps the approved offline SVG edition.
  const webQcfTrial=!window.AndroidNative?.configureAdhan;
  state.renderEngine=webQcfTrial&&state.renderEngine!=='svg'?'qcf':'svg';
  state.goal=Math.max(1,Math.min(604,Math.floor(Number(state.goal)||20)));
  state.volume=Math.max(0,Math.min(100,Number(state.volume)||80));
  state.reciter=readers.some(r=>r[0]===state.reciter)?state.reciter:readers[0][0];
  for(const key of ['bookmarks','notes'])if(!Array.isArray(state[key]))state[key]=[];
  if(!state.days || typeof state.days!=='object' || Array.isArray(state.days))state.days={};
  let root,host,quran,meta,phone,verses=[],loading,resize,audio,selected=0,audioIndex=-1,audioOn=false,audioSequence=0,audioRepeat=1,repeated=0,returnFocus,pointer,ignoreClickUntil=0,searchLimit=60,query='',request,pressTimer,turnAnimation,incomingAnimation,dragOffset=0,dragFrame=0,warmTask=0;
  const fittedSizes=new Map(),preparedPages=new Map(),phonePages=new Map(),phoneRequests=new Map();
  const phoneMode=()=>Boolean(phone);
  const isQcf=()=>Boolean(phone)&&webQcfTrial&&state.renderEngine==='qcf';
  const hasReadyPage=page=>isQcf()?qcfData.has(page):phonePages.has(page);
  const ensureReadyPage=page=>isQcf()?qcfLoad(page):phonePage(page);
  const mobileTrial=()=>false;
  const pageKey=(paper,page)=>[state.layout,page,paper.clientWidth,paper.clientHeight,state.font,Boolean(state.tajwidScreenFit)].join(':');
  const $=id=>root?.querySelector('#'+id), esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const arabic=n=>String(n).replace(/\d/g,d=>'٠١٢٣٤٥٦٧٨٩'[d]);
  const plain=s=>String(s).normalize('NFKD').replace(/[\u0610-\u061a\u064b-\u065f\u0670\u06d6-\u06ed\u0640]/g,'').replace(/[ٱأإآ]/g,'ا').replace(/ى/g,'ي');
  function save(){try{localStorage.setItem(KEY,JSON.stringify(state));return true;}catch(_){notice('تعذر حفظ إعدادات القرآن على هذا الجهاز');return false;}}
  function today(){const d=new Date();return `${d.getFullYear()}-${d.getMonth()+1}-${d.getDate()}`;}
  function readToday(){const d=state.days[today()];return Array.isArray(d)?d:[];}
  function pageOf(i){if(phoneMode())return phone.versePages[i];let lo=0,hi=603;while(lo<hi){const m=Math.ceil((lo+hi)/2);if(meta.pages[m].start<=i)lo=m;else hi=m-1;}return lo+1;}
  function juzOf(i){return meta.juzs.filter(j=>j.start<=i).at(-1)?.id||1;}
  function pageItems(p=state.page){if(phoneMode())return verses.slice(phone.pages[p-1].start,phone.pages[p-1].end);return verses.slice(meta.pages[p-1].start,p<604?meta.pages[p].start:verses.length);}
  function surahBanner(id){
    const s=quran[id-1],kind=s.type==='meccan'?'مكية':'مدنية';
    // Self-contained frame avoids older Quran heading selectors overriding its border.
    const frame='display:grid!important;grid-template-columns:25% 50% 25%!important;direction:rtl!important;align-items:center!important;width:100%!important;min-height:42px!important;box-sizing:border-box!important;padding:5px 12px!important;margin:0!important;border:3px double #ad916a!important;border-radius:9px!important;background:linear-gradient(90deg,#f2e8d9,#fffbf4 50%,#f2e8d9)!important;box-shadow:inset 0 0 0 3px #fffaf1,inset 0 0 0 4px #d2bda0!important;color:#30444a!important;white-space:nowrap!important;overflow:hidden!important;line-height:1.35!important';
    const cell='display:block!important;min-width:0!important;white-space:nowrap!important;overflow:hidden!important;font-family:Tahoma,Arial,sans-serif!important;font-weight:600!important;line-height:1.35!important';
    return `<div class="aq-surah-info-clean" style="${frame}"><span class="aq-surah-info-count" style="${cell};text-align:right!important;font-size:clamp(11px,3vw,15px)!important">${arabic(s.total_verses)} آية</span><span class="aq-surah-info-name" style="${cell};text-align:center!important;font-size:clamp(14px,3.7vw,19px)!important">سورة ${esc(s.name)}</span><span class="aq-surah-info-kind" style="${cell};text-align:left!important;font-size:clamp(11px,3vw,15px)!important">${kind}</span></div>`;
  }
  function notice(text){if($('aqNotice'))$('aqNotice').textContent=text;}
  function barButton(kind){return `<button type="button" data-qr-panel="${kind}" aria-label="${titles[kind]}"${kind==='mushaf'?' class="aq-active" aria-current="page"':''}><span aria-hidden="true">${icons[kind]}</span><small>${titles[kind]}</small></button>`;}
  async function compressed(url){const r=await fetch(url);if(!r.ok)throw Error('Mushaf resource unavailable');const bytes=new Uint8Array(await r.arrayBuffer());return bytes[0]===31&&bytes[1]===139?new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))).json():JSON.parse(new TextDecoder().decode(bytes));}
  async function loadPhone(){const ready=await fetch('assets/mushaf-phone-hafs-ready.json');if(!ready.ok)throw Error('Phone Mushaf unavailable');const data=await compressed('assets/mushaf-phone-hafs.json.gz');if(data.pages.length!==604||data.versePages.length!==6236)throw Error('Invalid responsive Mushaf');return data;}
  // A QCF-outline page can be hundreds of KB compressed and much larger parsed.
  // Keep a small LRU working set; the service worker retains downloaded pages on disk.
  function trimPhonePages(){
    if(phonePages.size<=18)return;
    for(const p of phonePages.keys()){
      if(phonePages.size<=18)break;
      if(Math.abs(p-state.page)<=3||galleryReady.has(p))continue;
      phonePages.delete(p);
    }
  }
  async function phonePage(page){
    if(phonePages.has(page)){
      const data=phonePages.get(page);phonePages.delete(page);phonePages.set(page,data);
      return data;
    }
    if(!phoneRequests.has(page))phoneRequests.set(page,compressed(`${phone.directory}/${String(page).padStart(3,'0')}.json.gz`).then(data=>{
      if(data.page!==page||!data.lines.length)throw Error('Invalid Mushaf rows');
      phonePages.set(page,data);trimPhonePages();return data;
    }).finally(()=>phoneRequests.delete(page)));
    return phoneRequests.get(page);
  }
  // Store every page on disk for offline turns, without retaining 604 DOM trees in RAM.
  // Adjacent pages still take priority through phonePage() during navigation.
  let offlineWarmStarted=false;
  async function cacheAllPhonePages(){
    if(offlineWarmStarted||!phone?.directory||!('caches' in window))return;
    offlineWarmStarted=true;
    try{
      const cache=await caches.open('aoqat-mushaf-phone-hafs');
      for(let p=1;p<=TOTAL;p++){
        if(!root?.isConnected){offlineWarmStarted=false;return;}
        const url=`${phone.directory}/${String(p).padStart(3,'0')}.json.gz`;
        if(await cache.match(url))continue;
        // Keep the browser responsive and avoid competing with an active page turn.
        while(pointer||phoneRequests.size>0)await new Promise(r=>setTimeout(r,120));
        const response=await fetch(url);
        if(!response.ok)throw Error('Offline Mushaf page '+p+' unavailable');
        await cache.put(url,response);
        await new Promise(r=>setTimeout(r,25));
      }
    }catch(e){
      offlineWarmStarted=false;
      console.warn('Mushaf offline preparation paused:',e);
    }
  }
  async function load(){
    if(!loading)loading=Promise.all([fetch('assets/quran.json').then(r=>{if(!r.ok)throw Error();return r.json();}),fetch('assets/quran-pages.json').then(r=>{if(!r.ok)throw Error();return r.json();}),loadPhone()]).then(async ([q,m,f])=>{phone=f;
      if(q.length!==114||m.pages.length!==604)throw Error();quran=q;meta=m;
      verses=q.flatMap(s=>s.verses.map(v=>({s:s.id,a:v.id,name:s.name,text:v.text,search:plain(v.text)})));
      if(verses.length!==6236)throw Error();
      // The approved phone Mushaf is the only reading edition.
      meta={...m,pages:phone.pages};state.layout='phone';state.mobileTrial=false;state.phoneRevision=1;
      // Start disk prefetch after the reader is mounted; never delay first render.
      // Disable competing full-library download while the user is reading.
    }).catch(e=>{loading=null;throw e;});
    return loading;
  }
  function shell(){
    host.innerHTML=`<section id="aqReader" dir="rtl" aria-label="المصحف الشريف" data-theme="${state.theme}">
      <nav class="aq-top" aria-label="أدوات المصحف">${['index','wird','profile','settings'].map(barButton).join('')}</nav>
      <div class="aq-page-meta"><span id="aqSurahName"></span><span id="aqJuz"></span><button type="button" id="aqBookmark" aria-label="حفظ علامة الصفحة">☆</button></div>
      <main id="aqPaper" class="aq-paper" aria-label="صفحة القرآن"><div id="adVerses" class="aq-page-text"></div></main>
      <div class="aq-folio"><span id="aqFolio" aria-label="رقم الصفحة"></span><button type="button" id="aqQuickSave" aria-label="الحفظ السريع لموضع القراءة">الحفظ السريع</button></div>
      <div class="aq-turn"><button type="button" id="aqPrevious" aria-label="الصفحة السابقة">‹ السابق</button><button type="button" id="aqPageNumber" aria-label="الانتقال إلى صفحة"></button><button type="button" id="aqNext" aria-label="الصفحة التالية">التالي ›</button></div>
      <label class="aq-slider" aria-label="تصفح صفحات المصحف"><input type="range" id="aqPageSlider" min="1" max="604" step="1" value="${state.page}" aria-label="رقم صفحة المصحف"></label>
      <p id="aqNotice" class="aq-notice" role="status" aria-live="polite"></p>
      <nav class="aq-bottom" aria-label="خدمات القرآن">${['mushaf','search','audio','library','more'].map(barButton).join('')}</nav>
      <section id="aqSheet" class="aq-sheet" role="dialog" aria-modal="true" aria-labelledby="aqSheetTitle" hidden><header><h3 id="aqSheetTitle"></h3><button type="button" id="aqCloseSheet" aria-label="إغلاق">×</button></header><div id="aqSheetBody" class="aq-sheet-body"></div></section>
    </section>`;
    root=host.querySelector('#aqReader');root.tabIndex=-1;
    root.addEventListener('click',e=>{const b=e.target.closest('[data-qr-panel]');if(b)openPanel(b.dataset.qrPanel);});
    $('aqCloseSheet').onclick=closeSheet;
    $('aqPrevious').onclick=()=>go(state.page-1);$('aqNext').onclick=()=>go(state.page+1);
    $('aqPageNumber').onclick=()=>openPanel('index');
    $('aqPageSlider').oninput=e=>go(Number(e.target.value),undefined,false);
    $('aqPageSlider').onchange=e=>go(Number(e.target.value));
    $('aqBookmark').onclick=()=>bookmark(meta.pages[state.page-1].start);
    $('aqQuickSave').onclick=quickSave;
    root.addEventListener('contextmenu',e=>{if(e.target.closest('#aqSheet')&&!e.target.matches('input,textarea'))e.preventDefault();});
    $('aqPaper').addEventListener('pointerdown',e=>{
      if(!e.isPrimary)return;
      // Keep the gesture anchored to the permanent paper node. Settling the
      // previous turn removes the SVG element originally hit by this pointer;
      // without capture, Chrome can cancel the new rapid swipe mid-gesture.
      try{e.currentTarget.setPointerCapture(e.pointerId);}catch(_){}
      // A fast second swipe must finish the previous turn instead of being lost.
      if(galleryBusy)gallerySettle?.();
      if(galleryBusy)return;clearTurn();dragOffset=0;pointer={x:e.clientX,y:e.clientY,id:e.pointerId,t:performance.now()};
      const v=e.target.closest('[data-qr-verse]');
      clearTimeout(pressTimer);
      if(v)pressTimer=setTimeout(()=>{pointer=null;ignoreClickUntil=performance.now()+800;versePanel(Number(v.dataset.qrVerse));},400);
    });
    $('aqPaper').addEventListener('pointermove',e=>{
      if(!pointer||pointer.id!==e.pointerId)return;
      const dx=e.clientX-pointer.x,dy=e.clientY-pointer.y;
      if(Math.hypot(dx,dy)>12)clearTimeout(pressTimer);
      if(phoneMode()&&Math.abs(dx)>12&&Math.abs(dx)>Math.abs(dy)*1.4){
        if(isQcf())qcfQueueDrag(dx);
        else galleryDrag(dx);
      }
    });
    $('aqPaper').addEventListener('pointerup',e=>{
      clearTimeout(pressTimer);if(!pointer||pointer.id!==e.pointerId)return;
      const dx=e.clientX-pointer.x,dy=e.clientY-pointer.y,speed=Math.abs(dx)/Math.max(1,performance.now()-pointer.t);
      if(isQcf())qcfFlushDrag(dx);
      pointer=null;
      if((Math.abs(dx)>Math.min(48,$('aqPaper').clientWidth*.12)||(Math.abs(dx)>24&&speed>.35))&&Math.abs(dx)>Math.abs(dy)*1.4){ignoreClickUntil=performance.now()+500;const target=state.page+(dx>0?1:-1);if(target>=1&&target<=TOTAL){if(phoneMode()&&galleryNeighbor){galleryFinish(target,true,speed);}else if(phoneMode()&&(!hasReadyPage(target))){const from=state.page;Promise.all([ensureReadyPage(target)]).then(()=>{if(!root?.isConnected||state.page!==from)return;galleryPrepare(target);galleryDrag((target>from?1:-1)*Math.max(48,$('aqPaper').clientWidth*.15));if(galleryNeighbor)galleryFinish(target,true,speed);else go(target);}).catch(()=>notice('تعذر تجهيز الصفحة التالية؛ حاول مجدداً'));}else {if(phoneMode()&&hasReadyPage(target)){galleryPrepare(target);galleryDrag((target>state.page?1:-1)*Math.max(48,$('aqPaper').clientWidth*.15));if(galleryNeighbor){galleryFinish(target,true,speed);}else go(target);}else go(target);}}else {clearTurn();dragOffset=0;}}
      else {if(Math.hypot(dx,dy)>12)ignoreClickUntil=performance.now()+500;if(galleryNeighbor)galleryFinish(state.page,false);else clearTurn();dragOffset=0;}
    });
    $('aqPaper').addEventListener('pointercancel',()=>{clearTimeout(pressTimer);qcfCancelDrag();pointer=null;clearTurn();dragOffset=0;ignoreClickUntil=performance.now()+500;});
    $('aqPaper').addEventListener('contextmenu',e=>e.preventDefault());
    $('aqPaper').addEventListener('click',e=>{if(performance.now()<ignoreClickUntil||!$('aqSheet').hidden)return;immersive(!document.body.classList.contains('quran-reader-immersive'));});
    root.addEventListener('keydown',e=>{
      if(e.key==='Escape'){e.preventDefault();e.stopPropagation();if(!$('aqSheet').hidden)closeSheet();else immersive(false);return;}
      if(!$('aqSheet').hidden){if(e.key==='Escape'){e.preventDefault();closeSheet();}if(e.key==='Tab'){const f=[...$('aqSheet').querySelectorAll('button,input,select,textarea,a[href]')].filter(x=>!x.disabled&&x.offsetParent);const first=f[0],last=f.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}}return;}
      if(e.key==='Escape'){immersive(false);return;}
      if(e.target.matches('input,select,textarea'))return;
      if(e.key==='ArrowLeft'){e.preventDefault();go(state.page+1);}if(e.key==='ArrowRight'){e.preventDefault();go(state.page-1);}if((e.key==='Enter'||e.key===' ')&&e.target.dataset.qrVerse){e.preventDefault();versePanel(Number(e.target.dataset.qrVerse));}
    });
    resize?.disconnect();resize=new ResizeObserver(()=>fit());resize.observe($('aqPaper'));
    document.fonts?.ready.then(()=>{fittedSizes.clear();preparedPages.clear();if(root?.isConnected){fit();warmAdjacent();}});
  }
  function immersive(on){
    document.body.classList.toggle('quran-reader-immersive',on);
  }
  // Gallery-style horizontal swipe: move two already prepared pages with the finger.
  let galleryNeighbor=null,galleryDirection=0,galleryBusy=false,galleryAdopted=false,gallerySettle=null,gallerySettleTimer=0,galleryAnimationFrame=0;
  // Favor the page ahead of the most recent swipe, while retaining the reverse page.
  let galleryLastDirection=1;
  // Pointer events can arrive far more frequently than display frames.
  // Move the two already-painted QCF pages at most once per animation frame.
  let qcfDragFrame=0,qcfQueuedDx=null;
  function qcfCancelDrag(){
    if(qcfDragFrame)cancelAnimationFrame(qcfDragFrame);
    qcfDragFrame=0;qcfQueuedDx=null;
  }
  function qcfQueueDrag(dx){
    qcfQueuedDx=dx;
    if(qcfDragFrame)return;
    qcfDragFrame=requestAnimationFrame(()=>{
      qcfDragFrame=0;
      const latest=qcfQueuedDx;qcfQueuedDx=null;
      if(pointer&&latest!==null&&!galleryBusy)galleryDrag(latest);
    });
  }
  function qcfFlushDrag(dx){
    qcfCancelDrag();
    if(pointer&&!galleryBusy&&Math.abs(dx)>12)galleryDrag(dx);
  }
  // Build and fit adjacent pages while idle, never in the pointermove handler.
  const galleryReady=new Map();
  let galleryPrepareTimer=0;
  function galleryClearReady(){
    clearTimeout(galleryPrepareTimer);
    for(const entry of galleryReady.values())entry.node.remove();
    galleryReady.clear();
  }
  function galleryPruneReady(){
    const paper=$('aqPaper');if(!paper)return;
    const wanted=new Set(isQcf()?[
      state.page+galleryLastDirection,state.page-galleryLastDirection,
      state.page+galleryLastDirection*2,state.page-galleryLastDirection*2,
      state.page+galleryLastDirection*3
    ]:[state.page+1,state.page-1]);
    for(const [page,entry] of galleryReady){
      if(page===state.page||!wanted.has(page)||
         entry.width!==paper.clientWidth||entry.height!==paper.clientHeight||
         !entry.node.isConnected){
        entry.node.remove();galleryReady.delete(page);
      }
    }
  }
  function galleryPrepare(page){
    const paper=$('aqPaper'),current=$('adVerses');
    if(!paper||!current||!phoneMode()||galleryBusy||page<1||page>TOTAL)return;
    const prior=galleryReady.get(page);
    if(prior){
      if(prior.width===paper.clientWidth&&prior.height===paper.clientHeight&&prior.node.isConnected)return;
      prior.node.remove();galleryReady.delete(page);
    }
    if(!hasReadyPage(page))return;
    const node=document.createElement('div');
    node.className=current.className+' aq-gallery-neighbor';
    node.innerHTML=pageHTML(page);
    node.style.cssText='position:absolute!important;z-index:5;pointer-events:none;visibility:hidden;will-change:transform;';
    node.style.top=current.offsetTop+'px';node.style.left=current.offsetLeft+'px';
    paper.append(node);
    fitText(paper,node,page);
    node.style.visibility='visible';
    node.style.transform='translate3d(-200vw,0,0)';
    galleryReady.set(page,{node,width:paper.clientWidth,height:paper.clientHeight});
  }
  function gallerySchedule(){
    clearTimeout(galleryPrepareTimer);
    const activePage=state.page;
    const prepareIdle=()=>{
      if(!root?.isConnected||pointer||galleryBusy||state.page!==activePage)return;
      const targets=isQcf()
        ?[activePage+galleryLastDirection,activePage-galleryLastDirection,
          activePage+galleryLastDirection*2,activePage-galleryLastDirection*2,
          activePage+galleryLastDirection*3]
        :[activePage+1,activePage-1];
      // One fully fitted page per task; do not monopolize the main thread
      // with multiple layouts between two rapid finger gestures.
      for(const p of targets){
        if(p<1||p>TOTAL||galleryReady.has(p)||!hasReadyPage(p))continue;
        galleryPrepare(p);
        if(isQcf())galleryPrepareTimer=setTimeout(prepareIdle,24);
        else prepareIdle();
        break;
      }
    };
    galleryPrepareTimer=setTimeout(prepareIdle,0);
  }
  function galleryReset(){
    clearTimeout(gallerySettleTimer);gallerySettleTimer=0;
    cancelAnimationFrame(galleryAnimationFrame);galleryAnimationFrame=0;
    gallerySettle=null;galleryBusy=false;
    galleryNeighbor?.remove();galleryNeighbor=null;galleryDirection=0;
    const current=$('adVerses');if(current){current.style.transition='';current.style.transform=isQcf()?'translate3d(0,0,0)':'';current.style.willChange='';}
  }
  function galleryDrag(dx){
    const paper=$('aqPaper'),current=$('adVerses');if(!paper||!current||!phoneMode()||galleryBusy)return;
    const direction=dx>0?1:-1,target=state.page+direction;
    if(target<1||target>604){galleryReset();return;}
    if(galleryDirection!==direction){galleryReset();galleryDirection=direction;}
    if(!galleryNeighbor){
      if(!hasReadyPage(target))return;
      const ready=galleryReady.get(target);
      if(!ready||ready.width!==paper.clientWidth||ready.height!==paper.clientHeight){
        // QCF glyph layout is expensive: NEVER create and measure it while the
        // user's finger moves. Warmup runs between gestures instead.
        if(isQcf())return;
        // Preserve the previous SVG fallback behavior.
        galleryReady.get(target)?.node.remove();galleryReady.delete(target);
        galleryPrepare(target);
        if(!galleryReady.has(target))return;
      }
      const prepared=galleryReady.get(target);
      if(!prepared)return;
      galleryReady.delete(target);
      galleryNeighbor=prepared.node;
    }
    const width=paper.clientWidth,offset=Math.max(-width,Math.min(width,dx));
    current.style.willChange='transform';current.style.transform='translate3d('+offset+'px,0,0)';
    galleryNeighbor.style.transform='translate3d('+(offset-direction*width)+'px,0,0)';
  }
  function galleryFinish(target,commit,swipeSpeed=0){
    const paper=$('aqPaper'),current=$('adVerses'),neighbor=galleryNeighbor;
    if(!paper||!current||!neighbor){galleryReset();if(commit)go(target);return;}
    galleryBusy=true;
    const direction=galleryDirection,width=paper.clientWidth;
    // Prevent the hidden offscreen staging transform from flashing on screen.
    neighbor.style.visibility='visible';
    // A quick finger flick should not be held back by a long fixed 260ms
    // animation. Keep the old timing for SVG; QCF gets a responsive finish.
    const duration=isQcf()?(commit&&swipeSpeed>=1.1?115:commit&&swipeSpeed>=.65?145:commit&&swipeSpeed>=.4?175:210):260;
    current.style.transition='transform '+duration+'ms cubic-bezier(.22,1,.36,1)';
    neighbor.style.transition='transform '+duration+'ms cubic-bezier(.22,1,.36,1)';
    galleryAnimationFrame=requestAnimationFrame(()=>{
      galleryAnimationFrame=0;
      if(!galleryBusy)return;
      current.style.transform='translate3d('+(commit?direction*width:0)+'px,0,0)';
      neighbor.style.transform='translate3d('+(commit?0:-direction*width)+'px,0,0)';
    });
    const settle=()=>{
      // Ignore a delayed transitionend from a previously adopted page: it must
      // never cancel a newer swipe's animation or steal its pending page turn.
      if(!galleryBusy||gallerySettle!==settle)return;
      neighbor.removeEventListener('transitionend',settle);
      clearTimeout(gallerySettleTimer);gallerySettleTimer=0;
      cancelAnimationFrame(galleryAnimationFrame);galleryAnimationFrame=0;
      gallerySettle=null;galleryBusy=false;
      if(commit&&root?.isConnected&&state.page!==target){
        // Keep the already rendered and fitted neighbor; do not rebuild it after the swipe.
        // For QCF, recycle the *previous* rendered page as the reverse-swipe
        // buffer. Removing it and re-creating it after every turn was the main
        // source of reflows during rapid back-and-forth reading.
        if(isQcf()){
          current.removeAttribute('id');
          current.classList.add('aq-gallery-neighbor');
          current.style.setProperty('position','absolute','important');
          current.style.zIndex='5';
          current.style.pointerEvents='none';
          current.style.visibility='visible';
          current.style.transition='none';
          current.style.transform='translate3d(-200vw,0,0)';
          galleryReady.get(state.page)?.node.remove();
          galleryReady.set(state.page,{node:current,width:paper.clientWidth,height:paper.clientHeight});
        }else current.remove();
        neighbor.id='adVerses';
        neighbor.classList.remove('aq-gallery-neighbor');
        neighbor.style.removeProperty('position');neighbor.style.removeProperty('top');neighbor.style.removeProperty('left');
        neighbor.style.removeProperty('z-index');neighbor.style.removeProperty('pointer-events');
        neighbor.style.removeProperty('visibility');neighbor.style.removeProperty('will-change');
        neighbor.style.removeProperty('transition');
        // Keep the QCF page on its existing GPU layer at the *same* zero
        // translation. Switching transform to 'none' at handoff forces font
        // rerasterization and can look like a second tiny move after the swipe.
        if(isQcf())neighbor.style.transform='translate3d(0,0,0)';
        else neighbor.style.removeProperty('transform');
        galleryNeighbor=null;galleryLastDirection=direction;galleryDirection=0;galleryAdopted=true;
        // Do not wipe the pre-fitted QCF neighbors. The next fast swipe needs
        // the already painted pages, not a fresh hundreds-of-spans rebuild.
        if(!isQcf())galleryClearReady();
        go(target);
      }else galleryReset();
    };
    gallerySettle=settle;
    neighbor.addEventListener('transitionend',settle,{once:true});
    gallerySettleTimer=setTimeout(settle,duration+65);
  }
  function clearTurn(){qcfCancelDrag();galleryReset();cancelAnimationFrame(dragFrame);dragFrame=0;turnAnimation?.cancel();incomingAnimation?.cancel();turnAnimation=null;incomingAnimation=null;$('aqPaper')?.querySelectorAll('.aq-leaf').forEach(e=>e.remove());if($('adVerses'))$('adVerses').style.transform=isQcf()?'translate3d(0,0,0)':'';}
  // Web QCF V2 experiment: word glyph codes and verse mappings are bundled,
  // instead of relying on a network API when the user opens a Quran page.
  const qcfData=new Map(),qcfPending=new Map(),qcfFontFaces=new Map(),qcfFitCache=new Map();
  let qcfManifestPromise=null;
  function qcfManifest(){
    if(!qcfManifestPromise)qcfManifestPromise=compressed('experiments/qcf604-web-verse-layouts.json.gz').then(data=>{
      if(data.pageCount!==TOTAL||Object.keys(data.pages||{}).length!==TOTAL)throw Error('Incomplete QCF page manifest');
      return data.pages;
    }).catch(error=>{qcfManifestPromise=null;throw error;});
    return qcfManifestPromise;
  }
  // A 2-page font cache caused repeated FontFace removal/reload on fast turns.
  // Retain a bounded recent set, never all 604 QCF page-specific fonts.
  const QCF_TEXT_CACHE_LIMIT=12,QCF_FONT_CACHE_LIMIT=10;
  function trimQcfCaches(){
    const hot=p=>Math.abs(p-state.page)<=3||galleryReady.has(p)||qcfPending.has(p);
    for(const p of qcfData.keys()){
      if(qcfData.size<=QCF_TEXT_CACHE_LIMIT)break;
      if(!hot(p))qcfData.delete(p);
    }
    for(const [p,font] of qcfFontFaces){
      if(qcfFontFaces.size<=QCF_FONT_CACHE_LIMIT)break;
      if(!hot(p)){
        document.fonts.delete(font);qcfFontFaces.delete(p);
        // Never retain a page layout with its required per-page QCF font gone.
        // renderPage() relies on qcfData.has(page) to decide whether glyphs
        // are display-ready; stale data without FontFace causes font fallback.
        qcfData.delete(p);
      }
    }
  }
  function qcfLoad(page){
    if(qcfData.has(page)&&qcfFontFaces.has(page)){
      // Page 2's Basmala borrows authentic page-1 QCF V2 word glyphs.
      // If its font was evicted, restore it without refetching page 2.
      if(page===2&&(!qcfData.has(1)||!qcfFontFaces.has(1)))
        return qcfLoad(1).catch(()=>null).then(()=>qcfData.get(2));
      // Keep recently used text and its specific font resident for quick
      // consecutive/reverse flips instead of repeated font decoding.
      const rows=qcfData.get(page);qcfData.delete(page);qcfData.set(page,rows);
      const font=qcfFontFaces.get(page);
      if(font){qcfFontFaces.delete(page);qcfFontFaces.set(page,font);}
      return Promise.resolve(rows);
    }
    if(qcfPending.has(page))return qcfPending.get(page);
    const job=(async()=>{
      // Fetch the Fatiha font and this page's font concurrently. Only the
      // opening page 2 needs both. A missing Fatiha font can still fall back
      // to the original readable Basmala rather than blanking the Quran.
      const fatihaReady=page===2?qcfLoad(1).catch(()=>null):null;
      const layouts=await qcfManifest();
      const rows=layouts[String(page)]?.lines;
      if(!Array.isArray(rows)||rows.length<6||rows.length>15||
        rows.some(row=>!row.s&&!row.b&&(!Array.isArray(row.v)||!row.v.length||
          row.v.some(w=>!Array.isArray(w)||w.length!==3||!Number.isInteger(w[0])||w[0]<0||w[0]>=6236||!w[1]))))
        throw Error('Incomplete native QCF rows for page '+page);
      if(!qcfFontFaces.has(page)){
        const font=new FontFace('AqQcfV2Page'+page,
          'url("https://verses.quran.foundation/fonts/quran/hafs/v2/woff2/p'+page+'.woff2")',
          {style:'normal',weight:'400',display:'block'});
        const loaded=await font.load();
        document.fonts.add(loaded);
        qcfFontFaces.set(page,loaded);
      }
      if(fatihaReady)await fatihaReady;
      qcfData.set(page,rows);
      return rows;
    })().finally(()=>qcfPending.delete(page));
    qcfPending.set(page,job);
    return job;
  }
  // One contiguous, ornamented title plaque for the first TWO pages only.
  // The floral pattern is part of the plate itself, never floating rosettes
  // over "مكية" / "مدنية" or the authentic verse count.
  // Style 8 (the selected preview): one unified rounded folio with gilded
  // floral wings at both ends. Called for ALL 114 surahs in the QCF reader.
  // Verse count, Meccan/Medinan classification and full surah name come
  // directly from the bundled Quran DB; never render them as a static image.
  function qcfSurahBanner(id){
    const surah=quran[id-1];
    if(!surah)return surahBanner(id);
    const kind=surah.type==='meccan'?'مكية':'مدنية';
    const titleScale=Math.max(.69,1-Math.max(0,surah.name.length-9)*.045);
    const wing='<g class="aq-qcf-floral" stroke="#986d48" stroke-width="1.8" fill="none" stroke-linejoin="round">'+
      '<path d="M5 60Q20 52 24 33Q32 16 49 16H166Q181 16 192 4" opacity=".7"/>'+
      '<path d="M5 60Q20 68 24 87Q32 104 49 104H166Q181 104 192 116" opacity=".7"/>'+
      '<path d="M34 60Q24 49 34 38Q45 27 61 28M34 60Q24 71 34 82Q45 93 61 92"/>'+
      '<path d="M48 16Q52 34 67 41M48 104Q52 86 67 79M154 22Q143 36 145 45M154 98Q143 84 145 75"/>'+
      '<path d="M105 15Q118 28 136 23Q130 40 149 60Q130 80 136 97Q118 92 105 105Q92 92 74 97Q80 80 61 60Q80 40 74 23Q92 28 105 15Z" fill="#f0dfc4"/>'+
      '<path d="M105 24Q121 39 137 38Q124 53 140 60Q124 67 137 82Q121 81 105 96Q89 81 73 82Q86 67 70 60Q86 53 73 38Q89 39 105 24Z" fill="#fff7e9"/>'+
      '<circle cx="105" cy="60" r="28" stroke="#c4a37c"/>'+
      '<circle cx="105" cy="60" r="20" stroke="#a47c56" stroke-dasharray="2 3"/>'+
      '<path d="M105 33C119 45 119 49 105 60C91 49 91 45 105 33Z" fill="#dfc39a"/>'+
      '<path d="M105 87C91 75 91 71 105 60C119 71 119 75 105 87Z" fill="#dfc39a"/>'+
      '<path d="M78 60C90 46 94 46 105 60C94 74 90 74 78 60Z" fill="#dfc39a"/>'+
      '<path d="M132 60C120 74 116 74 105 60C116 46 120 46 132 60Z" fill="#dfc39a"/>'+
      '<path d="M86 41Q111 44 124 79Q99 76 86 41ZM124 41Q99 44 86 79Q111 76 124 41Z" opacity=".6"/>'+
      '<circle cx="105" cy="60" r="7" fill="#b18a5f"/><circle cx="105" cy="60" r="2.7" fill="#fff8ed" stroke="none"/>'+
      '<path d="M14 60H36M166 60H197" stroke="#b7946d"/>'+
      '</g>';
    const art='<svg class="aq-qcf-opening-art aq-qcf-style8-art" viewBox="0 0 1000 120" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">'+
      '<path d="M37 7H963Q986 7 987 27Q990 46 997 60Q990 74 987 93Q986 113 963 113H37Q14 113 13 93Q10 74 3 60Q10 46 13 27Q14 7 37 7Z" fill="#f8ecda" stroke="#ab825a" stroke-width="3"/>'+
      '<path d="M38 13H962Q979 13 980 31Q984 49 990 60Q984 71 980 89Q979 107 962 107H38Q21 107 20 89Q16 71 10 60Q16 49 20 31Q21 13 38 13Z" fill="none" stroke="#d3b48c" stroke-width="1.6"/>'+
      '<path d="M235 12H765Q781 12 789 26Q797 41 816 49Q822 60 816 71Q797 79 789 94Q781 108 765 108H235Q219 108 211 94Q203 79 184 71Q178 60 184 49Q203 41 211 26Q219 12 235 12Z" fill="#fffaf0" stroke="#b28c65" stroke-width="2.2"/>'+
      '<path d="M237 19H763Q777 19 782 32Q792 46 802 51Q809 60 802 69Q792 74 782 88Q777 101 763 101H237Q223 101 218 88Q208 74 198 69Q191 60 198 51Q208 46 218 32Q223 19 237 19Z" fill="none" stroke="#d0ad83" stroke-width="1.5"/>'+
      '<g class="aq-qcf-ornate-left">'+wing+'</g>'+
      '<g class="aq-qcf-ornate-right" transform="translate(1000 0) scale(-1 1)">'+wing+'</g>'+
      '</svg>';
    return '<div class="aq-qcf-opening-top aq-qcf-surah-plaque aq-native-heading aq-qcf-heading" style="--aq-surah-title-scale:'+titleScale.toFixed(2)+'" role="group" aria-label="معلومات السورة">'+
      art+'<div class="aq-surah-info-clean aq-qcf-opening-info" role="group" aria-label="اسم السورة وعدد آياتها وتصنيفها">'+
      '<span class="aq-surah-info-count">'+arabic(surah.total_verses)+' آية</span>'+
      '<span class="aq-surah-info-name">سورة '+esc(surah.name)+'</span>'+
      '<span class="aq-surah-info-kind">'+kind+'</span></div></div>';
  }
  function qcfOpeningBasmala(){
    // QCF V2 page 1 stores the four genuine Basmala word glyphs as the
    // first four entries of its first verse. The FIFTH glyph is the verse
    // number rosette: never copy that into Al-Baqarah, where Basmala is
    // unnumbered. Reuse the same font, size and weight as Al-Fatiha.
    const words=qcfData.get(1)?.find(row=>row.v?.some(w=>w[0]===0))?.v
      ?.filter(([verseIndex,,end])=>verseIndex===0&&!end);
    if(words?.length===4&&qcfFontFaces.has(1)){
      return '<div class="aq-qcf-line aq-qcf-bismillah aq-qcf-authentic-bismillah" '+
        'style="--aq-qcf-font:AqQcfV2Page1" role="text" aria-label="'+
        esc(quran[0].verses[0].text)+'">'+
        words.map(([,code])=>'<span class="aq-qcf-basmala-word" aria-hidden="true">'+
          esc(code)+'</span>').join('')+'</div>';
    }
    // Graceful offline/web fallback only when the extra font is unavailable.
    return '<div class="aq-native-bismillah aq-qcf-bismillah">'+
      esc(quran[0].verses[0].text)+'</div>';
  }
  // Ayah ornament #1: replace the original QCF rosette with one visible
  // decorative frame and the real verse number. Never add a second rosette.
  function selectedAyahMedallion(verseNumber){
    const numeral=arabic(verseNumber);
    return '<span class="aq-qcf-selected-ayah" aria-hidden="true">'+
      '<svg class="aq-qcf-selected-ayah-frame" viewBox="0 0 100 100" focusable="false" aria-hidden="true">'+
      '<g fill="none" stroke="#aa7c45" stroke-linejoin="round">'+
      '<path stroke-width="2.5" d="M50 3L58 11L70 8L74 20L86 22L87 35L97 42L91 51L97 60L86 67L85 80L73 82L68 94L57 89L49 98L40 89L28 93L25 81L13 78L13 65L3 58L9 49L3 41L14 34L15 21L27 19L33 7L43 11Z"/>'+
      '<path stroke-width="1.5" d="M50 10L59 18L69 15L73 26L83 28L81 40L90 50L81 60L83 72L72 74L68 85L58 82L50 91L42 82L32 85L28 74L17 72L19 60L10 50L19 40L17 28L28 26L32 15L41 18Z"/>'+
      '<circle cx="50" cy="50" r="31" stroke-width="1.7"/>'+
      '<circle cx="50" cy="50" r="27.5" stroke-width="1"/>'+
      '<path stroke-width="1.2" d="M50 3v10M50 87v10M3 50h10M87 50h10M17 17l8 8M75 75l8 8M83 17l-8 8M25 75l-8 8"/>'+
      '</g><g fill="#b38a55"><circle cx="50" cy="6" r="2"/><circle cx="94" cy="50" r="2"/><circle cx="50" cy="94" r="2"/><circle cx="6" cy="50" r="2"/></g></svg>'+
      '<span class="aq-qcf-selected-ayah-number">'+numeral+'</span></span>';
  }
  function qcfHTML(page){
    const rows=qcfData.get(page);
    if(!rows)return '';
    // The first two Mushaf pages keep their original 7 / 286 ayah metadata
    // in the top surah bar. Only the Quran text occupies the centered folio.
    // Do not move or remove the reader's existing surah-information header.
    const html=rows.map((row,n)=>{
      if(row.s)return page<=2?'':'<div class="aq-native-heading aq-qcf-heading aq-qcf-style8-heading">'+qcfSurahBanner(row.s)+'</div>';
      if(row.b)return page===2?qcfOpeningBasmala():
        '<div class="aq-native-bismillah aq-qcf-bismillah">'+esc(quran[0].verses[0].text)+'</div>';
      return '<div class="aq-qcf-line" style="--aq-qcf-font:AqQcfV2Page'+page+
        ';--aq-qcf-row:'+(n+1)+'" aria-label="السطر '+arabic(n+1)+'">'+
        row.v.map(([i,code,end])=>{
          const v=verses[i];
          return '<span class="aq-qcf-word'+(end?' aq-qcf-marker':'')+
            (audioOn&&audioIndex===i?' aq-playing':'')+
            '" role="button" tabindex="0" data-qr-verse="'+i+
            '" aria-label="'+esc(v.name)+' الآية '+v.a+'">'+(end?selectedAyahMedallion(v.a):esc(code))+'</span>';
        }).join('')+'</div>';
    }).join('');
    if(page<=2){
      return qcfSurahBanner(page)+'<div class="aq-qcf-opening-inner">'+html+'</div>';
    }
    return html;
  }
  function pageHTML(page){
    if(isQcf())return qcfHTML(page);
    // Render the bundled original QCF2 outlines, not network-fetched page fonts.
    // The local SVG paths are produced at build time from the original QCF2 glyphs.
    if(phoneMode()||mobileTrial()){
      const p=phonePages.get(page);if(!p)return '<p class="aq-loading">تحميل الصفحة…</p>';
      return p.lines.map(line=>{if(line.s)return `<div class="aq-native-heading">${surahBanner(line.s)}</div>`;if(line.b)return `<div class="aq-native-bismillah">${esc(quran[0].verses[0].text)}</div>`;
        return `<svg class="aq-native-line${line.c?' aq-native-centered':''}" viewBox="${[line.box[0]-line.box[2]*.018,line.box[1],line.box[2]*1.036,line.box[3]].join(' ')}" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg" aria-label="${esc([...new Set(line.v.map(v=>verses[v[0]].text))].join(' '))}">${line.v.map(([i,d])=>`<g role="button" tabindex="0" data-qr-verse="${i}" class="aq-native-verse${audioOn&&audioIndex===i?' aq-playing':''}" aria-label="${esc(verses[i].name)} الآية ${verses[i].a}"><path d="${d}"/><title>${esc(verses[i].text)}</title></g>`).join('')}</svg>`;
      }).join('');
    }
    if(page>2&&meta.lines?.[page-1])return meta.lines[page-1].map(line=>{
      if(line.s)return `<div class="aq-mushaf-line">${surahBanner(line.s)}</div>`;
      if(line.b)return `<div class="aq-mushaf-line aq-centered"><span class="aq-line-ink">${esc(quran[0].verses[0].text)}</span></div>`;
      return `<div class="aq-mushaf-line"><span class="aq-line-ink">${line.v.map(([i,start,end])=>{const v=verses[i],words=v.text.split(/\s+/);return `<span role="button" tabindex="0" data-qr-verse="${i}" class="aq-ayah${audioOn&&audioIndex===i?' aq-playing':''}" aria-label="${esc(v.name)} الآية ${v.a}">${esc(words.slice(start,end).join(' '))}${end===words.length?` <span class="aq-ayah-number" aria-label="نهاية الآية ${v.a}"><span class="aq-ayah-rosette" aria-hidden="true">۝</span><span class="aq-ayah-digits">${arabic(v.a)}</span></span>`:''}</span>`;}).join(' ')}</span></div>`;
    }).join('');
    const items=pageItems(page),start=meta.pages[page-1].start;let html='',group=-1;
    items.forEach((v,n)=>{
      if(group!==v.s){if(group!==-1)html+='</p>';group=v.s;
        if(v.a===1){html+=`${surahBanner(v.s)}`;if(v.s!==1&&v.s!==9)html+=`<div class="aq-bismillah">${esc(quran[0].verses[0].text)}</div>`;}
        html+='<p class="aq-verses">';
      }
      html+=`<span role="button" tabindex="0" data-qr-verse="${start+n}" class="aq-ayah${audioOn&&audioIndex===start+n?' aq-playing':''}" aria-label="${esc(v.name)} الآية ${v.a}">${esc(v.text)} <span class="aq-ayah-number" aria-label="نهاية الآية ${v.a}"><span class="aq-ayah-rosette" aria-hidden="true">۝</span><span class="aq-ayah-digits">${arabic(v.a)}</span></span></span> `;
    });html+='</p>';
    return html;
  }
  function renderPage(animate=false){
    if(isQcf()&&!qcfData.has(state.page)){
      const target=state.page;
      $('adVerses').innerHTML='<p class="aq-loading">جاري تجهيز خط المصحف للصفحة '+arabic(target)+'…</p>';
      root.dataset.ready='false';
      qcfLoad(target).then(()=>{
        if(root?.isConnected&&isQcf()&&state.page===target){preparedPages.clear();renderPage(animate);}
      }).catch(()=>{
        if(root?.isConnected&&isQcf()&&state.page===target){
          // Never leave readers with a blank page when a trial font is unavailable.
          state.renderEngine='svg';save();galleryClearReady();preparedPages.clear();
          renderPage(false);notice('تعذّر تحميل خط QCF V2؛ تم الرجوع إلى عرض المصحف الأصلي.');
        }
      });
      return;
    }
    if(phoneMode()&&!isQcf()&&!phonePages.has(state.page)){
      const target=state.page;
      $('adVerses').innerHTML='<p class="aq-loading">جاري تحميل الصفحة '+arabic(target)+'…</p>';
      root.dataset.ready='false';
      phonePage(target).then(()=>{
        if(root?.isConnected&&!isQcf()&&state.page===target){preparedPages.clear();renderPage(animate);}
      }).catch(()=>{
        if(root?.isConnected&&!isQcf()&&state.page===target){
          $('adVerses').innerHTML='<p class="aq-loading">تعذر تحميل صفحة المصحف؛ حاول مجدداً.</p>';
          root.dataset.ready='error';
        }
      });
      return;
    }
    root.dataset.ready='true';
    $('aqQuickSave').textContent='الحفظ السريع';
    const pageChanged=root.dataset.page!==String(state.page);
    dragOffset=0;
    clearTurn();
    const items=pageItems(),start=meta.pages[state.page-1].start;
    const adopted=galleryAdopted;galleryAdopted=false;const cached=!adopted&&!audioOn&&preparedPages.get(pageKey($('aqPaper'),state.page));if(adopted){/* Reuse the fitted incoming DOM without regenerating SVG paths. */}else if(cached){const ready=cached.cloneNode(true);ready.id='adVerses';$('adVerses').replaceWith(ready);}else{$('adVerses').innerHTML=pageHTML(state.page);$('adVerses').classList.toggle('aq-opening',state.page<=2);}
    $('aqSurahName').textContent=items[0].name;$('aqJuz').textContent='الجزء '+arabic(juzOf(start));
    $('aqFolio').textContent=arabic(state.page);$('aqPageNumber').textContent=`${state.page} / 604`;$('aqPageSlider').value=state.page;
    $('aqPrevious').disabled=state.page===1;$('aqNext').disabled=state.page===604;
    const marked=state.bookmarks.some(b=>b.i===start);$('aqBookmark').textContent=marked?'★':'☆';$('aqBookmark').setAttribute('aria-pressed',String(marked));
    root.dataset.page=state.page;root.dataset.theme=state.theme;root.dataset.edition=isQcf()?'qcf2-font':'qcf2-phone';
    if(Number.isInteger(state.lastVerse))root.querySelectorAll(`[data-qr-verse="${state.lastVerse}"]`).forEach(e=>e.classList.add('aq-selected'));
    if(!adopted)fit();
    // QCF glyphs must remain rasterized in the same compositor layer before,
    // during and after the swipe, including the initial and direct-jump page.
    if(isQcf())$('adVerses').style.transform='translate3d(0,0,0)';
    if(pageChanged)$('aqPaper').scrollTop=0;warmAdjacent(80);
  }

  function fit(){
    const paper=$('aqPaper'),text=$('adVerses');if(!paper||!text||!meta||paper.clientHeight<1)return;
    fitText(paper,text,state.page);
  }
  function fitText(paper,text,page){
    function zoomBanner(zoom){
      for(const selector of ['.aq-surah-info-count','.aq-surah-info-kind'])
        text.querySelectorAll(selector).forEach(el=>{
          if(!el.closest('.aq-qcf-surah-plaque'))el.style.setProperty('font-size','calc(clamp(11px,3vw,15px) * '+zoom+')','important');
        });
      text.querySelectorAll('.aq-surah-info-name').forEach(el=>{
        if(!el.closest('.aq-qcf-surah-plaque'))el.style.setProperty('font-size','calc(clamp(14px,3.7vw,19px) * '+zoom+')','important');
      });
    }

    if(isQcf()){
      text.classList.remove('aq-lined-page','aq-opening','aq-original-page','aq-native-page');
      text.classList.add('aq-qcf-page');
      text.classList.toggle('aq-qcf-opening',page<=2);
      const zoom=Math.max(1,state.font/44);
      const width=Math.max(50,(paper.clientWidth-18)*zoom),height=(paper.clientHeight-12)*zoom;
      text.style.setProperty('width',width+'px','important');
      text.style.height=height+'px';
      text.style.setProperty('--native-zoom',zoom);
      zoomBanner(zoom);
      const rows=qcfData.get(page)?.length||15;
      text.style.setProperty('--native-rows',rows);
      // The opening pair is framed and centered, so its eight authentic rows
      // need a modest font instead of overstretched full-width lines.
      const startingSize=page<=2?Math.min(32*zoom,Math.max(20*zoom,height/15*0.82)):
        Math.min(35*zoom,Math.max(23*zoom,height/Math.max(1,rows)*.9));
      const fitKey=[page,paper.clientWidth,paper.clientHeight,state.font].join(':');
      const lines=text.querySelectorAll('.aq-qcf-line');
      const memo=qcfFitCache.get(fitKey);
      if(memo&&memo.length===lines.length){
        lines.forEach((line,i)=>line.style.setProperty('font-size',memo[i]+'px','important'));
      }else{
        const sizes=[];
        for(const line of lines){
          line.style.setProperty('font-size',startingSize+'px','important');
          // Measure once per page/viewport/zoom, while the page is staged.
          const allowed=Math.max(40,Math.min(width-6,line.clientWidth-4));
          const measured=Math.max(1,line.scrollWidth),fitted=Math.min(startingSize,Math.max(12,startingSize*(allowed-3)/measured));
          line.style.setProperty('font-size',fitted.toFixed(2)+'px','important');
          if(line.scrollWidth>allowed+2){
            const smaller=Math.max(11,fitted*(allowed-3)/line.scrollWidth);
            line.style.setProperty('font-size',smaller.toFixed(2)+'px','important');
          }
          sizes.push(parseFloat(line.style.fontSize));
        }
        if(page<=2&&sizes.length){
          // The previous renderer fit every line separately: some verses
          // appeared larger/darker (especially Fatiha's short verses 2 and
          // 7). Use ONE common fitting size for ALL words on each opening
          // page, including the genuine QCF Basmala of page 2. The minimum
          // already guarantees the widest line still fits on small phones.
          const common=Math.min(...sizes);
          lines.forEach(line=>line.style.setProperty('font-size',common.toFixed(2)+'px','important'));
          sizes.fill(common);
        }
        if(qcfFitCache.size>=36)qcfFitCache.delete(qcfFitCache.keys().next().value);
        qcfFitCache.set(fitKey,sizes);
      }
      return;
    }
    if(phoneMode()||mobileTrial()){
      text.classList.remove('aq-lined-page','aq-opening','aq-original-page','aq-qcf-page','aq-qcf-opening');
      text.classList.add('aq-native-page');
      // Default size remains a fitted, full-screen page. Explicit reading zoom
      // enlarges the whole SVG page, allowing native scrolling without reflowing
      // or regenerating its Quran glyph paths.
      const zoom=Math.max(1,state.font/44);
      text.style.setProperty('width',((paper.clientWidth-18)*zoom)+'px','important');
      text.style.height=((paper.clientHeight-12)*zoom)+'px';
      const rows=phonePages.get(page)?.lines.length||15;
      text.style.setProperty('--native-rows',rows);
      text.style.setProperty('--native-zoom',zoom);
      zoomBanner(zoom);
      text.querySelectorAll('.aq-native-line').forEach(svg=>{svg.querySelectorAll('.aq-native-verse').forEach(g=>{if(g.querySelector('rect'))return;const b=g.querySelector('path').getBBox(),r=document.createElementNS('http://www.w3.org/2000/svg','rect');for(const [k,v] of Object.entries({x:b.x-20,y:b.y-25,width:b.width+40,height:b.height+50}))r.setAttribute(k,v);g.prepend(r);});});return;
    }
    text.classList.remove('aq-native-page');
    const height=paper.clientHeight-28,width=paper.clientWidth-20,key=[page,width,height,state.font].join(':');
    if(page>2&&meta.lines?.[page-1]){
      text.classList.add('aq-lined-page');text.style.height=height+'px';
      const inks=[...text.querySelectorAll('.aq-line-ink')],rows=meta.lines[page-1].length;
      const cached=fittedSizes.get(key);
      if(Array.isArray(cached)){inks.forEach((ink,i)=>{ink.style.setProperty('font-size',cached[i][0]+'px','important');ink.style.transform='scaleX('+cached[i][1]+')';});return;}
      inks.forEach(ink=>{ink.style.setProperty('font-size',state.font+'px','important');ink.style.transform='';});
      const widths=inks.map(ink=>ink.scrollWidth);
      const size=Math.min(state.font,height/rows/1.65);
      const sizes=inks.map((ink,i)=>{ink.style.setProperty('font-size',size+'px','important');const scale=ink.closest('.aq-centered')?1:width/Math.max(1,widths[i]*size/state.font);ink.style.transform='scaleX('+scale+')';return [size,scale];});
      // Diacritics can extend beyond the font's line box, especially on short screens.
      for(let pass=0;pass<3&&text.scrollHeight>height;pass++){
        const factor=height/(height+2*(text.scrollHeight-height)+2);
        inks.forEach((ink,i)=>{sizes[i][0]*=factor;if(!ink.closest('.aq-centered'))sizes[i][1]/=factor;ink.style.setProperty('font-size',sizes[i][0]+'px','important');ink.style.transform='scaleX('+sizes[i][1]+')';});
      }
      if(fittedSizes.size>64)fittedSizes.delete(fittedSizes.keys().next().value);fittedSizes.set(key,sizes);return;
    }
    text.classList.remove('aq-lined-page');text.style.height='';
    if(fittedSizes.has(key)){text.style.fontSize=fittedSizes.get(key)+'px';return;}
    let low=18,high=Math.round(state.font*2),best=18;
    // Binary search half-pixel sizes instead of repeatedly forcing layout for each step.
    while(low<=high){const mid=(low+high)>>1;text.style.fontSize=mid/2+'px';
      if(text.scrollHeight<=height&&text.scrollWidth<=width){best=mid;low=mid+1;}else high=mid-1;}
    const size=best/2;text.style.fontSize=size+'px';
    if(fittedSizes.size>64)fittedSizes.delete(fittedSizes.keys().next().value);fittedSizes.set(key,size);
  }
  function warmAdjacent(delay=80){
    clearTimeout(warmTask);
    if(phoneMode()){
      if(isQcf())galleryPruneReady();
      else galleryClearReady();
      trimQcfCaches();
      const current=state.page;
      const wanted=isQcf()?
        [current+galleryLastDirection,current-galleryLastDirection,
         current+galleryLastDirection*2,current-galleryLastDirection*2,
         current+galleryLastDirection*3]:
        [current+1,current-1];
      for(const p of wanted)if(p>=1&&p<=TOTAL){
        ensureReadyPage(p).then(()=>{
          if(root?.isConnected&&state.page===current)gallerySchedule();
        }).catch(()=>{});
      }
      gallerySchedule();
      // SVG baseline retains its existing small data prefetch window.
      if(!isQcf())warmTask=setTimeout(()=>{
        if(!root?.isConnected||pointer||galleryBusy||state.page!==current)return;
        for(const p of [current+2,current+3,current-2])if(p>=1&&p<=TOTAL)phonePage(p).catch(()=>{});
      },250);
      return;
    }
    const current=state.page;
    warmTask=setTimeout(()=>{
      const paper=$('aqPaper');if(!paper||!root?.isConnected||pointer||state.page!==current)return;
      for(const page of [current+1,current-1]){
        if(page<1||page>TOTAL)continue;
        const leaf=document.createElement('div');leaf.className='aq-leaf';leaf.style.visibility='hidden';leaf.inert=true;
        const front=document.createElement('div');front.className='aq-leaf-front';
        const text=$('adVerses').cloneNode(false);text.removeAttribute('id');text.innerHTML=pageHTML(page);text.classList.toggle('aq-opening',page<=2);text.style.transform='';
        front.append(text);leaf.append(front);paper.append(leaf);fitText(paper,text,page);if(!audioOn){preparedPages.set(pageKey(paper,page),text.cloneNode(true));if(preparedPages.size>6)preparedPages.delete(preparedPages.keys().next().value);}leaf.remove();
      }
    },delay);
  }
  function go(page,highlight,animate=true){
    if(!Number.isInteger(page)||page<1||page>604){notice('اختر صفحة من 1 إلى 604');return;}
    state.page=page;state.lastVerse=Number.isInteger(highlight)?highlight:null;state.surah=Number.isInteger(highlight)?verses[highlight].s:pageItems(page)[0].s;save();closeSheet();renderPage(animate);notice('');
    if(Number.isInteger(highlight))root.querySelectorAll(`[data-qr-verse="${highlight}"]`).forEach(e=>e.classList.add('aq-selected'));
  }
  function sheet(title,html){
    window.getSelection()?.removeAllRanges();
    request?.abort();request=null;returnFocus=document.activeElement;$('aqSheetTitle').textContent=title;$('aqSheetBody').innerHTML=html;$('aqSheet').hidden=false;
    $('aqSheet').dataset.kind=['ملفاتي','علامات','علامة مرجعية'].includes(title)?'personal':'full';$('aqCloseSheet').focus();
  }
  function closeSheet(){window.getSelection()?.removeAllRanges();root?.querySelectorAll('.aq-selected').forEach(e=>e.classList.remove('aq-selected'));request?.abort();request=null;if($('aqSheet'))$('aqSheet').hidden=true;if(returnFocus?.isConnected&&root.contains(returnFocus))returnFocus.focus({preventScroll:true});else root?.focus({preventScroll:true});}
  function surahOptions(id=pageItems().some(v=>v.s===state.surah)?state.surah:pageItems()[0].s){return quran.map(s=>`<option value="${s.id}" ${s.id===id?'selected':''}>${s.id}. ${esc(s.name)}</option>`).join('');}
  function openPanel(kind){
    if(kind==='mushaf'){closeSheet();return;}
    if(kind==='index')indexPanel();else if(kind==='search')searchPanel();else if(kind==='audio')audioPanel();else if(kind==='settings')settingsPanel();else if(kind==='wird')wirdPanel();else if(kind==='profile')profilePanel();else if(kind==='library')libraryPanel();else if(kind==='more')morePanel();
  }
  function indexPanel(){
    sheet('الفهرس',`<div class="aq-tabs"><button type="button" data-index-tab="surahs" class="selected">السور</button><button type="button" data-index-tab="juz">الأجزاء</button></div><label>السورة<select id="adSurah">${surahOptions()}</select></label><form id="aqJumpForm" class="aq-row"><label>رقم الصفحة<input id="aqJump" type="number" min="1" max="604" required value="${state.page}"></label><button type="submit">انتقال</button></form><div id="aqIndexList"></div>`);
    const list=tab=>{$('aqIndexList').innerHTML=tab==='juz'?meta.juzs.map(j=>`<button type="button" class="aq-list-row" data-goto="${pageOf(j.start)}">الجزء ${j.id}<small>صفحة ${pageOf(j.start)}</small></button>`).join(''):quran.map(s=>{const i=verses.findIndex(v=>v.s===s.id);return `<button type="button" class="aq-list-row" data-goto="${pageOf(i)}">${s.id}. سورة ${esc(s.name)}<small>${s.total_verses} آية · صفحة ${pageOf(i)}</small></button>`;}).join('');$('aqIndexList').querySelectorAll('[data-goto]').forEach(b=>b.onclick=()=>go(Number(b.dataset.goto)));};list('surahs');
    $('adSurah').onchange=e=>{const i=verses.findIndex(v=>v.s===Number(e.target.value));go(pageOf(i),i);};
    $('aqJumpForm').onsubmit=e=>{e.preventDefault();go(Number($('aqJump').value));};
    root.querySelectorAll('[data-index-tab]').forEach(b=>b.onclick=()=>{root.querySelectorAll('[data-index-tab]').forEach(x=>x.classList.toggle('selected',x===b));list(b.dataset.indexTab);});
  }
  function searchPanel(){
    searchLimit=60;sheet('البحث في القرآن',`<label>كلمة أو عبارة أو اسم سورة<input id="aqSearch" type="search" placeholder="ابحث في القرآن الكريم" value="${esc(query)}"></label><p id="aqSearchCount" role="status"></p><div id="aqSearchResults"></div><button type="button" id="aqMoreResults" hidden>نتائج أكثر</button>`);
    function draw(){query=$('aqSearch').value;const q=plain(query.trim());if(!q){$('aqSearchResults').innerHTML='';$('aqSearchCount').textContent='اكتب كلمة للبحث في السور والآيات';$('aqMoreResults').hidden=true;return;}
      const results=verses.map((v,i)=>({v,i})).filter(({v})=>v.search.includes(q)||plain(v.name).includes(q));
      $('aqSearchCount').textContent=results.length+' نتيجة';$('aqSearchResults').innerHTML=results.slice(0,searchLimit).map(({v,i})=>`<button type="button" class="aq-result" data-result="${i}"><b>${esc(v.name)} · الآية ${v.a}</b><span>${esc(v.text)}</span><small>صفحة ${pageOf(i)}</small></button>`).join('');
      $('aqMoreResults').hidden=results.length<=searchLimit;$('aqSearchResults').querySelectorAll('[data-result]').forEach(b=>b.onclick=()=>{const i=Number(b.dataset.result);go(pageOf(i),i);});
    }
    $('aqSearch').oninput=()=>{searchLimit=60;draw();};$('aqMoreResults').onclick=()=>{searchLimit+=60;draw();};draw();$('aqSearch').focus();
  }
  function quickSave(){
    if(!meta||root.dataset.ready!=='true')return;
    const start=meta.pages[state.page-1].start,end=state.page<604?meta.pages[state.page].start:verses.length;
    const i=Number.isInteger(state.lastVerse)&&state.lastVerse>=start&&state.lastVerse<end?state.lastVerse:start,v=verses[i];
    const old=state.bookmarks.find(b=>b.i===i);
    if(old){old.quick=true;old.page=state.page;}else state.bookmarks.push({i,page:state.page,label:`${v.name} · الآية ${v.a}`,color:'green',purpose:'الحفظ السريع',quick:true});
    state.lastVerse=i;if(!save()){$('aqQuickSave').textContent='تعذر الحفظ';return;}$('aqQuickSave').textContent='تم الحفظ ✓';notice('تم حفظ موضع القراءة في ملفاتي');
  }
  function bookmark(i){const v=verses[i];if(!v)return;const old=state.bookmarks.findIndex(b=>b.i===i);if(old>=0)state.bookmarks.splice(old,1);else {state.lastVerse=i;state.bookmarks.push({i,page:pageOf(i),label:`${v.name} · الآية ${v.a}`});}save();renderPage();notice(old>=0?'تم حذف العلامة':'تم حفظ العلامة في ملفاتي');}
  function versePanel(i){window.getSelection()?.removeAllRanges();root.querySelectorAll('.aq-selected').forEach(e=>e.classList.remove('aq-selected'));root.querySelectorAll(`[data-qr-verse="${i}"]`).forEach(e=>e.classList.add('aq-selected'));selected=i;state.lastVerse=i;save();const v=verses[i];sheet(`${v.name} · الآية ${v.a}`,`<p class="aq-quote">${esc(v.text)}</p><div class="aq-tools"><button type="button" id="aqVerseBookmark">علامة مرجعية</button><button type="button" id="aqVerseListen">استماع للآية</button><button type="button" id="aqVerseTafsir">التفسير الميسر</button><button type="button" id="aqVerseCopy">نسخ الآية</button></div><label>ملاحظة على الآية<textarea id="aqNote" rows="3" maxlength="2000">${esc(state.notes.find(n=>n.i===i)?.text||'')}</textarea></label><button type="button" id="aqSaveNote">حفظ الملاحظة</button><p id="aqVerseStatus" role="status"></p>`);
    $('aqSheet').dataset.kind='verse';
    const palette=document.createElement('div');palette.className='aq-mark-palette';
    palette.innerHTML=Object.entries(markColors).map(([key,[name,color]])=>`<button type="button" data-mark-color="${key}" style="--qr-mark:${color}" aria-label="علامة مرجعية باللون ${name}"><span aria-hidden="true">⚑</span><small>${name}</small></button>`).join('');
    $('aqSheetBody').append(palette);palette.querySelectorAll('[data-mark-color]').forEach(b=>b.onclick=()=>markPanel(i,b.dataset.markColor));
    $('aqVerseBookmark').onclick=()=>markPanel(i);$('aqVerseListen').onclick=()=>{closeSheet();startAudio(i);};$('aqVerseTafsir').onclick=()=>tafsirPanel(i);
    $('aqSaveNote').onclick=()=>{state.notes=state.notes.filter(n=>n.i!==i);const text=$('aqNote').value.trim();if(text)state.notes.push({i,text});save();$('aqVerseStatus').textContent=text?'تم حفظ الملاحظة':'تم حذف الملاحظة';};
    $('aqVerseCopy').onclick=async()=>{try{await navigator.clipboard.writeText(`${v.text} (${v.name}: ${v.a})`);if($('aqVerseStatus'))$('aqVerseStatus').textContent='تم نسخ الآية';}catch(_){if($('aqVerseStatus'))$('aqVerseStatus').textContent='تعذر النسخ؛ أعد المحاولة بعد السماح بالوصول إلى الحافظة';}};
  }

  function markPanel(i,preset){
    const v=verses[i],old=state.bookmarks.find(b=>b.i===i);
    sheet('علامة مرجعية',`<p>${esc(v.name)} · الآية ${v.a}</p><label>لون العلامة<select id="aqMarkColor">${Object.entries(markColors).map(([key,[name]])=>`<option value="${key}">${name}</option>`).join('')}</select></label><label>اسم العلامة أو معنى اللون (اختياري)<input id="aqMarkLabel" maxlength="80" value="${esc(old?.purpose||'')}"></label><p>اختر اللون وحدّد معناه كما يناسبك.</p><button type="button" id="aqSaveMark">حفظ العلامة</button><p id="aqMarkStatus" role="status"></p>`);
    $('aqMarkColor').value=markColors[preset]?preset:markColors[old?.color]?old.color:'blue';
    $('aqSaveMark').onclick=()=>{const color=$('aqMarkColor').value,purpose=$('aqMarkLabel').value.trim();state.bookmarks=state.bookmarks.filter(b=>b.i!==i);state.bookmarks.push({...(old||{}),i,page:pageOf(i),label:`${v.name} · الآية ${v.a}`,color,purpose});save();renderPage();$('aqMarkStatus').textContent='تم حفظ العلامة';};
  }
  function marksPanel(){
    sheet('علامات','<div id="aqMarks"></div><button type="button" id="aqBackProfile">رجوع إلى ملفاتي</button>');drawMarks();$('aqBackProfile').onclick=profilePanel;
  }
  function drawMarks(){
    $('aqMarks').innerHTML=state.bookmarks.filter(b=>verses[b.i]).map(b=>`<div class="aq-saved"><button type="button" data-saved="${b.i}"><span class="aq-mark-dot" style="--qr-mark:${markColors[b.color]?.[1]||markColors.blue[1]}"></span>${esc(b.label)} · صفحة ${pageOf(b.i)}<small>${esc(b.quick?'الحفظ السريع'+(b.purpose&&b.purpose!=='الحفظ السريع'?' · '+b.purpose:''):b.purpose||markColors[b.color]?.[0]||'أزرق')}</small></button><button type="button" data-edit-mark="${b.i}">تعديل</button><button type="button" data-delete-mark="${b.i}" aria-label="حذف العلامة">×</button></div>`).join('')||'<p>لم تحفظ علامة بعد.</p>';
    root.querySelectorAll('[data-saved]').forEach(b=>b.onclick=()=>go(pageOf(Number(b.dataset.saved)),Number(b.dataset.saved)));
    root.querySelectorAll('[data-edit-mark]').forEach(b=>b.onclick=()=>markPanel(Number(b.dataset.editMark)));
    root.querySelectorAll('[data-delete-mark]').forEach(b=>b.onclick=()=>{state.bookmarks=state.bookmarks.filter(x=>x.i!==Number(b.dataset.deleteMark));save();renderPage();drawMarks();});
  }

  function settingsPanel(){
    sheet('إعدادات المصحف',`${webQcfTrial?'<label>طريقة عرض المصحف<select id="aqRenderingMode"><option value="qcf">خط QCF V2 — تجربة السلاسة</option><option value="svg">عرض SVG الأصلي</option></select></label>':''}<label>مظهر المصحف<select id="aqTheme"><option value="sepia">ورقي — المظهر الحالي</option><option value="ivory">عاجي بخط أسود</option><option value="white">أبيض</option><option value="night">ليلي</option><option value="green">أخضر هادئ</option><option value="blue">أزرق هادئ</option><option value="contrast">تباين عالٍ: أسود وأبيض</option></select></label><label>${phone?'تكبير القراءة':'حجم الخط'}<input id="aqFont" type="range" min="${phone?44:22}" max="${phone?80:46}" value="${state.font}"></label><p>المس الصفحة لإظهار الأدوات أو إخفائها. اضغط مطوّلاً على الآية لفتح خدماتها. تقليب الصفحات بالسحب يميناً ويساراً، أو بزرّي السابق والتالي.</p><p>يحفظ المصحف آخر صفحة وملاحظاتك على هذا الجهاز.</p>`);
    
    if(phone){const button=document.createElement('button');button.type='button';button.textContent='تنزيل صفحات المصحف للقراءة بدون إنترنت';const status=document.createElement('p');status.setAttribute('role','status');$('aqSheetBody').append(button,status);button.onclick=async()=>{button.disabled=true;let next=1,done=0;try{const cache=await caches.open(phone.cacheName||'aoqat-mushaf-phone-hafs');await Promise.all(Array.from({length:4},async()=>{while(next<=604){const n=next++,url=`${phone.directory}/${String(n).padStart(3,'0')}.json.gz`;if(!await cache.match(url)){const response=await fetch(url);if(!response.ok)throw Error();await cache.put(url,response);}status.textContent=`تم تنزيل ${++done} / 604 صفحة`;}}));status.textContent='تم تنزيل المصحف كاملاً للقراءة بدون إنترنت';}catch(_){status.textContent='توقف التنزيل؛ الصفحات المكتملة محفوظة. يمكنك إعادة المحاولة.';}finally{button.disabled=false;}};}
    if(webQcfTrial){$('aqRenderingMode').value=state.renderEngine;$('aqRenderingMode').onchange=e=>{state.renderEngine=e.target.value==='qcf'?'qcf':'svg';save();clearTurn();galleryClearReady();preparedPages.clear();closeSheet();renderPage(false);};}
    $('aqTheme').value=state.theme;$('aqTheme').onchange=e=>{state.theme=e.target.value;save();root.dataset.theme=state.theme;};$('aqFont').oninput=e=>{state.font=Number(e.target.value);state.fontCustomized=true;save();fit();};
  }
  function markRead(){const pages=readToday();if(!pages.includes(state.page))pages.push(state.page);state.days[today()]=pages;const keys=Object.keys(state.days);if(keys.length>90)delete state.days[keys[0]];save();}
  function wirdPanel(){
    const count=readToday().length;sheet('وردي اليومي',`<label>هدف القراءة اليومي (صفحات)<input id="aqGoal" type="number" min="1" max="604" value="${state.goal}"></label><button type="button" id="aqSaveGoal">حفظ الهدف</button><div class="aq-progress"><progress max="${state.goal}" value="${Math.min(count,state.goal)}"></progress><p>${count} من ${state.goal} صفحة اليوم</p></div><button type="button" id="aqMarkRead">قرأت الصفحة ${state.page}</button><button type="button" id="aqContinue">متابعة القراءة من الصفحة ${state.page}</button><p>علّم الصفحات التي قرأتها ليُحسب وردك اليومي.</p><p id="aqGoalStatus" role="status"></p>`);
    $('aqSaveGoal').onclick=()=>{const n=Number($('aqGoal').value);if(!Number.isInteger(n)||n<1||n>604){$('aqGoalStatus').textContent='اختر هدفاً من 1 إلى 604 صفحة';return;}state.goal=n;save();wirdPanel();};$('aqMarkRead').onclick=()=>{markRead();wirdPanel();};$('aqContinue').onclick=closeSheet;
  }
  function profilePanel(){
    sheet('ملفاتي',`<label>الاسم<input id="aqName" maxlength="60" value="${esc(state.name)}"></label><button type="button" id="aqSaveName">حفظ الاسم</button><p id="aqNameStatus" role="status"></p><button type="button" id="aqShowMarks">علامات</button><h4>العلامات المحفوظة</h4><div id="aqMarks"></div><h4>ملاحظاتي</h4><div id="aqNotes"></div>`);
    $('aqSaveName').onclick=()=>{state.name=$('aqName').value.trim();save();$('aqNameStatus').textContent='تم حفظ الاسم';};
    $('aqShowMarks').onclick=marksPanel;drawMarks();
    $('aqNotes').innerHTML=state.notes.length?state.notes.filter(n=>verses[n.i]).map(n=>`<div class="aq-saved"><button type="button" data-note="${n.i}">${esc(verses[n.i].name)} · ${verses[n.i].a}<small>${esc(n.text)}</small></button><button type="button" data-delete-note="${n.i}" aria-label="حذف الملاحظة">×</button></div>`).join(''):'<p>اضغط أي آية لإضافة ملاحظة.</p>';
    root.querySelectorAll('[data-saved]').forEach(b=>b.onclick=()=>go(pageOf(Number(b.dataset.saved)),Number(b.dataset.saved)));
    root.querySelectorAll('[data-note]').forEach(b=>b.onclick=()=>versePanel(Number(b.dataset.note)));
    root.querySelectorAll('[data-delete-mark]').forEach(b=>b.onclick=()=>{state.bookmarks=state.bookmarks.filter(x=>x.i!==Number(b.dataset.deleteMark));save();renderPage();profilePanel();});
    root.querySelectorAll('[data-delete-note]').forEach(b=>b.onclick=()=>{state.notes=state.notes.filter(x=>x.i!==Number(b.dataset.deleteNote));save();profilePanel();});
  }
  function audioPanel(){
    const first=meta.pages[state.page-1].start;
    sheet('التلاوة',`<label>القارئ<select id="aqReciter">${readers.map(([id,name])=>`<option value="${id}">${name}</option>`).join('')}</select></label><label>مستوى الصوت<input id="aqVolume" type="range" min="0" max="100" value="${state.volume}"></label><label>تكرار الآية<select id="aqRepeat"><option value="1">مرة واحدة</option><option value="3">3 مرات</option><option value="5">5 مرات</option></select></label><div class="aq-tools"><button type="button" id="aqAudioPlay">${audioOn?'استئناف / إعادة':'تشغيل من هذه الصفحة'}</button><button type="button" id="aqAudioPause">إيقاف مؤقت</button><button type="button" id="aqAudioStop">إيقاف التلاوة</button></div><p>التلاوة تحتاج اتصالاً بالإنترنت، وتتابع الآيات مع انتقال الصفحات.</p><p id="aqAudioStatus" role="status"></p>`);
    $('aqReciter').value=state.reciter;$('aqRepeat').value=String(audioRepeat);
    $('aqReciter').onchange=e=>{state.reciter=e.target.value;save();stopAudio();};$('aqVolume').oninput=e=>{state.volume=Number(e.target.value);if(audio)audio.volume=state.volume/100;save();};$('aqRepeat').onchange=e=>{audioRepeat=Number(e.target.value);repeated=0;};
    $('aqAudioPlay').onclick=()=>{if(audio&&audioIndex>=0&&audio.error){startAudio(audioIndex);}else if(audio&&audioIndex>=0&&audio.paused){audioOn=true;audio.play().then(()=>audioMessage('التلاوة قيد التشغيل')).catch(()=>audioMessage('تعذر تشغيل التلاوة؛ تحقق من الإنترنت واضغط تشغيل'));}else startAudio(first);};
    $('aqAudioPause').onclick=()=>{audio?.pause();audioOn=false;audioMessage('التلاوة متوقفة مؤقتاً');};$('aqAudioStop').onclick=()=>{stopAudio();audioMessage('توقفت التلاوة');};
    audioMessage(audioOn?'التلاوة قيد التشغيل':'اختر القارئ واضغط تشغيل');
  }
  function audioMessage(msg){if($('aqAudioStatus'))$('aqAudioStatus').textContent=msg;notice(msg);}
  function startAudio(i){
    if(!verses[i])return;audio?.pause();audioSequence++;const seq=audioSequence;audioIndex=i;audioOn=true;repeated=0;
    if(!audio)audio=new Audio();audio.volume=state.volume/100;
    function playVerse(){if(seq!==audioSequence||!audioOn)return;const p=pageOf(audioIndex);if(state.page!==p){state.page=p;save();renderPage(true);}root.querySelectorAll('.aq-playing').forEach(e=>e.classList.remove('aq-playing'));root.querySelectorAll(`[data-qr-verse="${audioIndex}"]`).forEach(e=>e.classList.add('aq-playing'));
      audio.src=`https://cdn.islamic.network/quran/audio/${state.reciter==='ar.abdulbasitmurattal'?192:128}/${state.reciter}/${audioIndex+1}.mp3`;audio.play().then(()=>{if(seq===audioSequence)audioMessage('تلاوة '+verses[audioIndex].name+' · الآية '+verses[audioIndex].a);}).catch(()=>{if(seq===audioSequence){audioOn=false;audioMessage('تعذر تشغيل التلاوة؛ تحقق من الإنترنت واضغط تشغيل');}});
    }
    audio.onended=()=>{if(seq!==audioSequence||!audioOn)return;repeated++;if(repeated<audioRepeat){playVerse();return;}repeated=0;if(audioIndex+1<verses.length){audioIndex++;playVerse();}else{stopAudio();audioMessage('انتهت التلاوة');}};
    audio.onerror=()=>{if(seq===audioSequence){audioOn=false;audioMessage('تعذر تحميل التلاوة؛ تحقق من الإنترنت');}};playVerse();
  }
  function stopAudio(){audioSequence++;audio?.pause();if(audio)audio.currentTime=0;audioOn=false;audioIndex=-1;root?.querySelectorAll('.aq-playing').forEach(e=>e.classList.remove('aq-playing'));}
  function libraryPanel(){
    sheet('المكتبة',`<button type="button" class="aq-list-row" id="aqLibraryTafsir">التفسير الميسر<small>تفسير الآية من الصفحة الحالية</small></button><button type="button" class="aq-list-row" id="aqLibraryGuide">دليل استخدام المصحف<small>القراءة والورد والعلامات</small></button><button type="button" class="aq-list-row" id="aqLibrarySources">مصادر المصحف<small>النص وتقسيم الصفحات والتلاوة</small></button>`);
    $('aqLibraryTafsir').onclick=()=>tafsirPanel(meta.pages[state.page-1].start);$('aqLibraryGuide').onclick=()=>sheet('دليل استخدام المصحف','<p>اسحب الصفحة أفقياً لتقليب المصحف، أو استخدم السابق والتالي. الفهرس ينقلك إلى السور والأجزاء والصفحات.</p><p>اضغط مطوّلاً على الآية لحفظ علامة أو كتابة ملاحظة أو سماعها أو قراءة تفسيرها. تجد العلامات والملاحظات في «ملفاتي».</p><p>حدّد هدفك في «وردي»، واضغط «قرأت الصفحة» بعد القراءة. يمكنك تغيير لون المصحف من إعداداته.</p>');$('aqLibrarySources').onclick=sourcesPanel;
  }
  function sourcesPanel(){sheet('مصادر المصحف',`<p>نص القرآن الموجود بالمشروع: Risan Quran JSON، 114 سورة و6236 آية، دون تغيير النص.</p><a href="https://github.com/risan/quran-json" target="_blank" rel="noopener">مصدر النص وترخيص CC BY-SA 4.0</a><p>حدود صفحات مصحف المدينة والأجزاء: مشروع تنزيل.</p><a href="https://tanzil.net/docs/Quran_Metadata" target="_blank" rel="noopener">بيانات تنزيل · CC BY</a><p>التلاوة والتفسير الميسر: Al Quran Cloud.</p><a href="https://alquran.cloud" target="_blank" rel="noopener">مصدر التلاوة والتفسير</a><p>خط حفص العثماني المستخدم بالمشروع. مرجع المقارنة: مصحف المدينة النبوية برواية حفص، الصادر عن مجمع الملك فهد.</p><a href="https://qurancomplex.gov.sa/quran-hafs/" target="_blank" rel="noopener">مصحف المدينة · المصدر الرسمي</a><p>قراءة الهاتف تعرض أشكال الحروف الأصلية من خطوط مجمع الملك فهد QCF2، مع بيانات الكلمات والأسطر من Quran Foundation. تبقى حدود الأسطر الأصلية، وتتكيّف المسافات بين الأسطر مع الشاشة. خيار الصفحة المصوّرة يعرض طبعة الجيب الأصلية. تم التحقق من تطابق ترتيب السور وحدود الصفحات مع النسخة المصوّرة في جميع الآيات؛ الانتقال بين العرضين يحافظ على موضع الآية. واجهة التطبيق من مشروعنا وليست اعتمادًا رسميًا من المجمع.</p><p>الواجهة مبنية لهذا المشروع؛ الأزرار مستوحاة من ترتيب السكرين المرجعي.</p>`);}
  function tafsirPanel(i){
    selected=i;const v=verses[i];sheet('التفسير الميسر',`<label>السورة<select id="aqTafsirSurah">${surahOptions(v.s)}</select></label><label>الآية<input id="aqTafsirAyah" type="number" min="1" max="${quran[v.s-1].total_verses}" value="${v.a}"></label><button type="button" id="aqLoadTafsir">عرض التفسير</button><p id="aqTafsirVerse" class="aq-quote">${esc(v.text)}</p><p id="aqTafsirText" role="status"></p><p class="aq-caption">التفسير الميسر · يحتاج اتصالاً بالإنترنت</p>`);
    $('aqTafsirSurah').onchange=e=>{$('aqTafsirAyah').value=1;$('aqTafsirAyah').max=quran[Number(e.target.value)-1].total_verses;};
    async function fetchTafsir(){const s=Number($('aqTafsirSurah').value),a=Number($('aqTafsirAyah').value);if(!Number.isInteger(a)||a<1||a>quran[s-1].total_verses){$('aqTafsirText').textContent='اختر رقم آية صحيحاً';return;}
      $('aqTafsirVerse').textContent=quran[s-1].verses[a-1].text;$('aqTafsirText').textContent='تحميل التفسير…';request?.abort();const controller=new AbortController();request=controller;
      try{const r=await fetch(`https://api.alquran.cloud/v1/ayah/${s}:${a}/ar.muyassar`,{signal:controller.signal});if(!r.ok)throw Error();const data=await r.json();if(!data.data?.text)throw Error();if(request===controller&&$('aqTafsirText'))$('aqTafsirText').textContent=data.data.text;}catch(e){if(e.name!=='AbortError'&&request===controller&&$('aqTafsirText'))$('aqTafsirText').textContent='تعذر تحميل التفسير. تحقق من الإنترنت وحاول مرة أخرى.';}
    }
    $('aqLoadTafsir').onclick=fetchTafsir;fetchTafsir();
  }
  function morePanel(){
    sheet('المزيد',`<div class="aq-tools"><button type="button" id="aqMoreMark">حفظ علامة الصفحة</button><button type="button" id="aqMoreRead">قرأت هذه الصفحة</button><button type="button" id="aqSharePage">مشاركة رابط الصفحة</button><button type="button" id="aqMoreSources">مصادر المصحف</button></div><p id="aqMoreStatus" role="status"></p>`);
    $('aqMoreMark').onclick=()=>{bookmark(meta.pages[state.page-1].start);$('aqMoreStatus').textContent='تم تحديث علامة الصفحة';};$('aqMoreRead').onclick=()=>{markRead();$('aqMoreStatus').textContent='تم تسجيل الصفحة ضمن ورد اليوم';};$('aqMoreSources').onclick=sourcesPanel;
    $('aqSharePage').onclick=async()=>{const url=new URL(location.href);url.searchParams.set('quranPage',state.page);url.searchParams.set('quranLayout',state.layout);try{if(navigator.share)await navigator.share({title:'القرآن الكريم · صفحة '+state.page,url:url.href});else{await navigator.clipboard.writeText(url.href);if($('aqMoreStatus'))$('aqMoreStatus').textContent='تم نسخ رابط الصفحة';}}catch(e){if(e.name!=='AbortError'&&$('aqMoreStatus'))$('aqMoreStatus').textContent='تعذر مشاركة الرابط';}};
  }
  async function open(element){
    host=element;const token=element;document.body.classList.add('quran-reader-open');shell();root.inert=true;notice('تحميل المصحف…');
    try{await load();if(host!==token||!token.isConnected)return;
      const url=new URL(location.href),shared=Number(url.searchParams.get('quranPage'));if(Number.isInteger(shared)&&shared>=1&&shared<=604){state.layout='phone';state.page=shared;save();url.searchParams.delete('quranPage');url.searchParams.delete('quranLayout');history.replaceState(history.state,'',url.href);}
      root.inert=false;renderPage();notice('');void Promise.resolve();
    }catch(_){if(host===token&&token.isConnected){root.inert=false;$('adVerses').innerHTML='<p>تعذر تحميل المصحف. اتصل بالإنترنت لأول تحميل.</p><button type="button" id="aqRetry">إعادة المحاولة</button>';$('aqRetry').onclick=()=>open(token);}}
  }
  function close(){clearTimeout(warmTask);save();clearTimeout(pressTimer);pointer=null;clearTurn();immersive(false);host=null;resize?.disconnect();request?.abort();request=null;stopAudio();document.body.classList.remove('quran-reader-open');}
  new MutationObserver(()=>{
    if(!host || !root?.isConnected)return;
    if(!document.body.classList.contains('design-menu-open')){
      immersive(false);clearTurn();clearTimeout(pressTimer);pointer=null;stopAudio();resize?.disconnect();
      if(document.body.classList.contains('quran-reader-open'))document.body.classList.remove('quran-reader-open');
    } else if(root.offsetParent && !document.body.classList.contains('quran-reader-open')){
      document.body.classList.add('quran-reader-open');resize?.observe($('aqPaper'));fit();
    }
  }).observe(document.body,{attributes:true,attributeFilter:['class']});
  const css=document.createElement('link');css.rel='stylesheet';css.href='css/quran-reader.css?v=ivory-2';document.head.appendChild(css);
  window.AoqatQuranReader={open,close};
  // Load the packaged text before the user opens its menu; failures remain retryable.
  load().catch(()=>{});
})();
