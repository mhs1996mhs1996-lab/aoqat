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
  state.layout=state.layout==='print'?'print':'phone';
  state.page=Math.max(1,Math.min(TOTAL,Math.floor(Number(state.page)||1)));
  state.theme=['sepia','white','night','green','blue','contrast'].includes(state.theme)?state.theme:'sepia';
  state.font=Math.max(22,Math.min(80,Number(state.font)||44));
  if(!state.readingRevision && state.font===32)state.font=36;
  if(state.readingRevision===2 && state.font===36 && !state.fontCustomized)state.font=40;
  if(!state.fontCustomized && (state.readingRevision||0)<4)state.font=44;
  state.readingRevision=4;
  state.goal=Math.max(1,Math.min(604,Math.floor(Number(state.goal)||20)));
  state.volume=Math.max(0,Math.min(100,Number(state.volume)||80));
  state.reciter=readers.some(r=>r[0]===state.reciter)?state.reciter:readers[0][0];
  for(const key of ['bookmarks','notes'])if(!Array.isArray(state[key]))state[key]=[];
  if(!state.days || typeof state.days!=='object' || Array.isArray(state.days))state.days={};
  let root,host,quran,meta,official,phone,printPages,verses=[],loading,resize,audio,selected=0,audioIndex=-1,audioOn=false,audioSequence=0,audioRepeat=1,repeated=0,returnFocus,pointer,ignoreClickUntil=0,searchLimit=60,query='',request,pressTimer,turnAnimation,incomingAnimation,dragOffset=0,dragFrame=0,warmTask=0;
  const fittedSizes=new Map(),preparedPages=new Map(),phonePages=new Map(),phoneRequests=new Map();
  const phoneMode=()=>Boolean(phone&&state.layout==='phone');
  const pageKey=(paper,page)=>[state.layout,page,paper.clientWidth,paper.clientHeight,state.font].join(':');
  const $=id=>root?.querySelector('#'+id), esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const arabic=n=>String(n).replace(/\d/g,d=>'٠١٢٣٤٥٦٧٨٩'[d]);
  const plain=s=>String(s).normalize('NFKD').replace(/[\u0610-\u061a\u064b-\u065f\u0670\u06d6-\u06ed\u0640]/g,'').replace(/[ٱأإآ]/g,'ا').replace(/ى/g,'ي');
  function save(){try{localStorage.setItem(KEY,JSON.stringify(state));}catch(_){notice('تعذر حفظ إعدادات القرآن على هذا الجهاز');}}
  function today(){const d=new Date();return `${d.getFullYear()}-${d.getMonth()+1}-${d.getDate()}`;}
  function readToday(){const d=state.days[today()];return Array.isArray(d)?d:[];}
  function pageOf(i){if(phoneMode())return phone.versePages[i];let lo=0,hi=603;while(lo<hi){const m=Math.ceil((lo+hi)/2);if(meta.pages[m].start<=i)lo=m;else hi=m-1;}return lo+1;}
  function juzOf(i){return meta.juzs.filter(j=>j.start<=i).at(-1)?.id||1;}
  function pageItems(p=state.page){if(phoneMode())return verses.slice(phone.pages[p-1].start,phone.pages[p-1].end);return verses.slice(meta.pages[p-1].start,p<604?meta.pages[p].start:verses.length);}
  function surahBanner(id){
    const s=quran[id-1],kind=s.type==='meccan'?'مكية':'مدنية';
    return `<h2 class="aq-surah-banner aq-surah-details"><span class="aq-surah-count">${arabic(s.total_verses)} آية</span><span class="aq-surah-name">سورة ${esc(s.name)}</span><span class="aq-surah-kind">${kind}</span></h2>`;
  }
  function notice(text){if($('aqNotice'))$('aqNotice').textContent=text;}
  function barButton(kind){return `<button type="button" data-qr-panel="${kind}" aria-label="${titles[kind]}"${kind==='mushaf'?' class="aq-active" aria-current="page"':''}><span aria-hidden="true">${icons[kind]}</span><small>${titles[kind]}</small></button>`;}
  async function compressed(url){const r=await fetch(url);if(!r.ok)throw Error('Mushaf resource unavailable');const bytes=new Uint8Array(await r.arrayBuffer());return bytes[0]===31&&bytes[1]===139?new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))).json():JSON.parse(new TextDecoder().decode(bytes));}
  async function loadPhone(){const ready=await fetch('assets/mushaf-phone-hafs-ready.json');if(!ready.ok)return null;const data=await compressed('assets/mushaf-phone-hafs.json.gz');if(data.pages.length!==604||data.versePages.length!==6236)throw Error('Invalid responsive Mushaf');return data;}
  async function phonePage(page){if(phonePages.has(page))return phonePages.get(page);if(!phoneRequests.has(page))phoneRequests.set(page,compressed(`${phone.directory}/${String(page).padStart(3,'0')}.json.gz`).then(data=>{if(data.page!==page||!data.lines.length)throw Error('Invalid Mushaf rows');phonePages.set(page,data);if(phonePages.size>8)phonePages.delete(phonePages.keys().next().value);return data;}).finally(()=>phoneRequests.delete(page)));return phoneRequests.get(page);}
  function setLayout(layout){const i=meta.pages[state.page-1].start;state.layout=layout;meta.pages=phoneMode()?phone.pages:printPages;state.page=pageOf(i);preparedPages.clear();save();renderPage();}
  async function loadOfficial(){
    const pocket=await fetch('assets/mushaf-hafs-pocket-ready.json');
    const prefix=pocket.ok?'assets/mushaf-hafs-pocket':'assets/mushaf-hafs-1441';
    const ready=pocket.ok?pocket:await fetch(prefix+'-ready.json');
    if(!ready.ok)return null;
    const r=await fetch(prefix+'.json.gz');if(!r.ok)throw Error('Mushaf metadata unavailable');
    const bytes=new Uint8Array(await r.arrayBuffer());
    const data=bytes[0]===31&&bytes[1]===139?await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))).json():JSON.parse(new TextDecoder().decode(bytes));
    if(data.pages.length!==604||data.pages.some((p,i)=>p.id!==i+1||!p.hits.length))throw Error('Invalid original Mushaf pages');return data;
  }
  async function load(){
    if(!loading)loading=Promise.all([fetch('assets/quran.json').then(r=>{if(!r.ok)throw Error();return r.json();}),fetch('assets/quran-pages.json').then(r=>{if(!r.ok)throw Error();return r.json();}),loadOfficial(),loadPhone()]).then(async ([q,m,o,f])=>{official=o;phone=f;
      if(q.length!==114||m.pages.length!==604)throw Error();quran=q;meta=m;
      verses=q.flatMap(s=>s.verses.map(v=>({s:s.id,a:v.id,name:s.name,text:v.text,search:plain(v.text)})));
      if(verses.length!==6236)throw Error();
      if(official){let start=0;meta={...m,pages:official.pages.map(p=>{const entry={id:p.id,start};for(const h of p.hits){const v=verses[start++];if(!v||v.s!==h.surahNumber||v.a!==h.ayahNumber)throw Error('Original page sequence mismatch');}return entry;})};if(start!==6236)throw Error('Original verse coverage mismatch');}
      printPages=meta.pages;if(phoneMode()){const oldStart=printPages[state.page-1].start;if(!state.phoneRevision)state.page=phone.versePages[oldStart];meta={...meta,pages:phone.pages};}state.phoneRevision=1;if(phoneMode())await Promise.all([phonePage(1),phonePage(604)]);
    }).catch(e=>{loading=null;throw e;});
    return loading;
  }
  function shell(){
    host.innerHTML=`<section id="aqReader" dir="rtl" aria-label="المصحف الشريف" data-theme="${state.theme}">
      <nav class="aq-top" aria-label="أدوات المصحف">${['index','wird','profile','settings'].map(barButton).join('')}</nav>
      <div class="aq-page-meta"><span id="aqSurahName"></span><span id="aqJuz"></span><button type="button" id="aqBookmark" aria-label="حفظ علامة الصفحة">☆</button></div>
      <main id="aqPaper" class="aq-paper" aria-label="صفحة القرآن"><div id="adVerses" class="aq-page-text"></div></main>
      <div class="aq-folio"><span id="aqFolio" aria-label="رقم الصفحة"></span></div>
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
    $('aqPaper').addEventListener('pointerdown',e=>{
      if(!e.isPrimary)return;
      clearTurn();dragOffset=0;pointer={x:e.clientX,y:e.clientY,id:e.pointerId,t:performance.now()};
      const v=e.target.closest('[data-qr-verse]');
      clearTimeout(pressTimer);
      if(v)pressTimer=setTimeout(()=>{pointer=null;ignoreClickUntil=performance.now()+800;versePanel(Number(v.dataset.qrVerse));},400);
    });
    $('aqPaper').addEventListener('pointermove',e=>{
      if(!pointer||pointer.id!==e.pointerId)return;
      const dx=e.clientX-pointer.x,dy=e.clientY-pointer.y;
      if(Math.hypot(dx,dy)>12)clearTimeout(pressTimer);
    });
    $('aqPaper').addEventListener('pointerup',e=>{
      clearTimeout(pressTimer);if(!pointer||pointer.id!==e.pointerId)return;
      const dx=e.clientX-pointer.x,dy=e.clientY-pointer.y,speed=Math.abs(dx)/Math.max(1,performance.now()-pointer.t);pointer=null;
      if((Math.abs(dx)>Math.min(48,$('aqPaper').clientWidth*.12)||(Math.abs(dx)>24&&speed>.35))&&Math.abs(dx)>Math.abs(dy)*1.4){ignoreClickUntil=performance.now()+500;const target=state.page+(dx>0?1:-1);if(target>=1&&target<=TOTAL)go(target);else {clearTurn();dragOffset=0;}}
      else {if(Math.hypot(dx,dy)>12)ignoreClickUntil=performance.now()+500;clearTurn();dragOffset=0;}
    });
    $('aqPaper').addEventListener('pointercancel',()=>{clearTimeout(pressTimer);pointer=null;clearTurn();dragOffset=0;ignoreClickUntil=performance.now()+500;});
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
  function clearTurn(){cancelAnimationFrame(dragFrame);dragFrame=0;turnAnimation?.cancel();incomingAnimation?.cancel();turnAnimation=null;incomingAnimation=null;$('aqPaper')?.querySelectorAll('.aq-leaf').forEach(e=>e.remove());if($('adVerses'))$('adVerses').style.transform='';}
  function pageHTML(page){
    if(phoneMode()){
      const p=phonePages.get(page);if(!p)return '<p class="aq-loading">تحميل الصفحة…</p>';
      return p.lines.map(line=>{if(line.s)return `<div class="aq-native-heading">${surahBanner(line.s)}</div>`;if(line.b)return `<div class="aq-native-bismillah">${esc(quran[0].verses[0].text)}</div>`;
        return `<svg class="aq-native-line${line.c?' aq-native-centered':''}" viewBox="${line.box.join(' ')}" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg" aria-label="${esc([...new Set(line.v.map(v=>verses[v[0]].text))].join(' '))}">${line.v.map(([i,d])=>`<g role="button" tabindex="0" data-qr-verse="${i}" class="aq-native-verse${audioOn&&audioIndex===i?' aq-playing':''}" aria-label="${esc(verses[i].name)} الآية ${verses[i].a}"><path d="${d}"/><title>${esc(verses[i].text)}</title></g>`).join('')}</svg>`;
      }).join('');
    }
    if(official){
      const p=official.pages[page-1],start=meta.pages[page-1].start,items=pageItems(page),indices=new Map(items.map((v,n)=>[v.s+':'+v.a,start+n]));
      const hits=p.hits.map(h=>{const i=indices.get(h.surahNumber+':'+h.ayahNumber);if(i===undefined)throw Error('Mushaf ayah mapping mismatch');const v=verses[i];return `<path d="${esc(h.polygon)}" role="button" tabindex="0" data-qr-verse="${i}" class="aq-original-ayah${audioOn&&audioIndex===i?' aq-playing':''}" aria-label="${esc(v.name)} الآية ${v.a}"><title>${esc(v.text)}</title></path>`;}).join('');
      return `<svg class="aq-original-art" xmlns="http://www.w3.org/2000/svg" viewBox="${(p.displayBox||[0,0,p.width,p.height]).join(' ')}" preserveAspectRatio="xMidYMid meet" aria-label="مصحف المدينة برواية حفص، صفحة ${page}"><image href="${official.imageDirectory||'assets/mushaf-hafs-1441'}/${String(page).padStart(3,'0')}.webp" width="${p.width}" height="${p.height}"/><g transform="${p.hitTransform}">${hits}</g></svg>`;
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
    if(phoneMode()&&!phonePages.has(state.page)){
      const target=state.page;$('adVerses').innerHTML='<p class="aq-loading">تحميل الصفحة…</p>';root.dataset.ready='false';
      phonePage(target).then(()=>{if(root?.isConnected&&phoneMode()&&state.page===target)renderPage(animate);}).catch(()=>{if(root?.isConnected&&state.page===target)notice('تعذر تحميل الصفحة؛ اتصل بالإنترنت أو اختر الصفحة المصوّرة من الإعدادات.');});return;
    }
    root.dataset.ready='true';
    const pageChanged=root.dataset.page!==String(state.page);
    dragOffset=0;
    clearTurn();
    const items=pageItems(),start=meta.pages[state.page-1].start,html=pageHTML(state.page);
    const cached=!audioOn&&preparedPages.get(pageKey($('aqPaper'),state.page));if(cached){const ready=cached.cloneNode(true);ready.id='adVerses';$('adVerses').replaceWith(ready);}else{$('adVerses').innerHTML=html;$('adVerses').classList.toggle('aq-opening',state.page<=2);}
    $('aqSurahName').textContent=items[0].name;$('aqJuz').textContent='الجزء '+arabic(juzOf(start));
    $('aqFolio').textContent=arabic(state.page);$('aqPageNumber').textContent=`${state.page} / 604`;$('aqPageSlider').value=state.page;
    $('aqPrevious').disabled=state.page===1;$('aqNext').disabled=state.page===604;
    const marked=state.bookmarks.some(b=>b.i===start);$('aqBookmark').textContent=marked?'★':'☆';$('aqBookmark').setAttribute('aria-pressed',String(marked));
    root.dataset.page=state.page;root.dataset.theme=state.theme;root.dataset.edition=phoneMode()?'qcf2-phone':official?(official.imageDirectory?'hafs-pocket':'hafs-1441'):'text';
    if(Number.isInteger(state.lastVerse))root.querySelectorAll(`[data-qr-verse="${state.lastVerse}"]`).forEach(e=>e.classList.add('aq-selected'));
    fit();if(official&&pageChanged)$('aqPaper').scrollTop=0;warmAdjacent(80);
  }

  function fit(){
    const paper=$('aqPaper'),text=$('adVerses');if(!paper||!text||!meta||paper.clientHeight<1)return;
    fitText(paper,text,state.page);
  }
  function fitText(paper,text,page){
    if(phoneMode()){
      text.classList.remove('aq-lined-page','aq-opening','aq-original-page');text.classList.add('aq-native-page');const zoom=Math.max(1,state.font/44);text.style.setProperty('width',(paper.clientWidth-16)*zoom+'px','important');text.style.height=(paper.clientHeight-12)*zoom+'px';
      const rows=phonePages.get(page)?.lines.length||15;text.style.setProperty('--native-rows',rows);text.style.setProperty('--native-zoom',zoom);
      text.querySelectorAll('.aq-native-line').forEach(svg=>{svg.querySelectorAll('.aq-native-verse').forEach(g=>{if(g.querySelector('rect'))return;const b=g.querySelector('path').getBBox(),r=document.createElementNS('http://www.w3.org/2000/svg','rect');for(const [k,v] of Object.entries({x:b.x-20,y:b.y-25,width:b.width+40,height:b.height+50}))r.setAttribute(k,v);g.prepend(r);});});return;
    }
    text.classList.remove('aq-native-page');
    if(official){text.classList.remove('aq-lined-page','aq-opening');text.classList.add('aq-original-page');const zoom=Math.max(1,state.font/44);const p=official.pages[page-1],box=p.displayBox||[0,0,p.width,p.height],width=(paper.clientWidth-16)*zoom;text.style.height=width*box[3]/box[2]+'px';text.style.setProperty('width',width+'px','important');return;}
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
    if(phoneMode()){for(const p of [state.page+1,state.page-1])if(p>=1&&p<=604)phonePage(p).catch(()=>{});return;}
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
  function bookmark(i){const v=verses[i];if(!v)return;const old=state.bookmarks.findIndex(b=>b.i===i);if(old>=0)state.bookmarks.splice(old,1);else {state.lastVerse=i;state.bookmarks.push({i,page:pageOf(i),label:`${v.name} · الآية ${v.a}`});}save();renderPage();notice(old>=0?'تم حذف العلامة':'تم حفظ العلامة في ملفاتي');}
  function versePanel(i){window.getSelection()?.removeAllRanges();root.querySelectorAll('.aq-selected').forEach(e=>e.classList.remove('aq-selected'));root.querySelectorAll(`[data-qr-verse="${i}"]`).forEach(e=>e.classList.add('aq-selected'));selected=i;const v=verses[i];sheet(`${v.name} · الآية ${v.a}`,`<p class="aq-quote">${esc(v.text)}</p><div class="aq-tools"><button type="button" id="aqVerseBookmark">علامة مرجعية</button><button type="button" id="aqVerseListen">استماع للآية</button><button type="button" id="aqVerseTafsir">التفسير الميسر</button><button type="button" id="aqVerseCopy">نسخ الآية</button></div><label>ملاحظة على الآية<textarea id="aqNote" rows="3" maxlength="2000">${esc(state.notes.find(n=>n.i===i)?.text||'')}</textarea></label><button type="button" id="aqSaveNote">حفظ الملاحظة</button><p id="aqVerseStatus" role="status"></p>`);
    $('aqSheet').dataset.kind='verse';
    const palette=document.createElement('div');palette.className='aq-mark-palette';
    palette.innerHTML=Object.entries(markColors).map(([key,[name,color]])=>`<button type="button" data-mark-color="${key}" style="--qr-mark:${color}" aria-label="علامة مرجعية باللون ${name}"><span aria-hidden="true">⚑</span><small>${name}</small></button>`).join('');
    $('aqSheetBody').append(palette);palette.querySelectorAll('[data-mark-color]').forEach(b=>b.onclick=()=>markPanel(i,b.dataset.markColor));
    $('aqVerseBookmark').onclick=()=>markPanel(i);$('aqVerseListen').onclick=()=>{closeSheet();startAudio(i);};$('aqVerseTafsir').onclick=()=>tafsirPanel(i);
    $('aqSaveNote').onclick=()=>{state.notes=state.notes.filter(n=>n.i!==i);const text=$('aqNote').value.trim();if(text)state.notes.push({i,text});save();$('aqVerseStatus').textContent=text?'تم حفظ الملاحظة':'تم حذف الملاحظة';};
    $('aqVerseCopy').onclick=async()=>{try{await navigator.clipboard.writeText(`${v.text} (${v.name}: ${v.a})`);if($('aqVerseStatus'))$('aqVerseStatus').textContent='تم نسخ الآية';}catch(_){if($('aqVerseStatus'))$('aqVerseStatus').textContent='تعذر النسخ؛ يمكنك تحديد النص ونسخه';}};
  }

  function markPanel(i,preset){
    const v=verses[i],old=state.bookmarks.find(b=>b.i===i);
    sheet('علامة مرجعية',`<p>${esc(v.name)} · الآية ${v.a}</p><label>لون العلامة<select id="aqMarkColor">${Object.entries(markColors).map(([key,[name]])=>`<option value="${key}">${name}</option>`).join('')}</select></label><label>اسم العلامة أو معنى اللون (اختياري)<input id="aqMarkLabel" maxlength="80" value="${esc(old?.purpose||'')}"></label><p>اختر اللون وحدّد معناه كما يناسبك.</p><button type="button" id="aqSaveMark">حفظ العلامة</button><p id="aqMarkStatus" role="status"></p>`);
    $('aqMarkColor').value=markColors[preset]?preset:markColors[old?.color]?old.color:'blue';
    $('aqSaveMark').onclick=()=>{const color=$('aqMarkColor').value,purpose=$('aqMarkLabel').value.trim();state.bookmarks=state.bookmarks.filter(b=>b.i!==i);state.bookmarks.push({i,page:pageOf(i),label:`${v.name} · الآية ${v.a}`,color,purpose});save();renderPage();$('aqMarkStatus').textContent='تم حفظ العلامة';};
  }
  function marksPanel(){
    sheet('علامات','<div id="aqMarks"></div><button type="button" id="aqBackProfile">رجوع إلى ملفاتي</button>');drawMarks();$('aqBackProfile').onclick=profilePanel;
  }
  function drawMarks(){
    $('aqMarks').innerHTML=state.bookmarks.filter(b=>verses[b.i]).map(b=>`<div class="aq-saved"><button type="button" data-saved="${b.i}"><span class="aq-mark-dot" style="--qr-mark:${markColors[b.color]?.[1]||markColors.blue[1]}"></span>${esc(b.label)} · صفحة ${pageOf(b.i)}<small>${esc(b.purpose||markColors[b.color]?.[0]||'أزرق')}</small></button><button type="button" data-edit-mark="${b.i}">تعديل</button><button type="button" data-delete-mark="${b.i}" aria-label="حذف العلامة">×</button></div>`).join('')||'<p>لم تحفظ علامة بعد.</p>';
    root.querySelectorAll('[data-saved]').forEach(b=>b.onclick=()=>go(pageOf(Number(b.dataset.saved)),Number(b.dataset.saved)));
    root.querySelectorAll('[data-edit-mark]').forEach(b=>b.onclick=()=>markPanel(Number(b.dataset.editMark)));
    root.querySelectorAll('[data-delete-mark]').forEach(b=>b.onclick=()=>{state.bookmarks=state.bookmarks.filter(x=>x.i!==Number(b.dataset.deleteMark));save();renderPage();drawMarks();});
  }

  function settingsPanel(){
    sheet('إعدادات المصحف',`${phone?'<label>طريقة العرض<select id="aqLayout"><option value="phone">قراءة الهاتف</option><option value="print">صفحة المصحف المصوّرة</option></select></label>':''}<label>لون المصحف<select id="aqTheme"><option value="sepia">ورقي</option><option value="white">أبيض</option><option value="night">ليلي</option><option value="green">أخضر هادئ</option><option value="blue">أزرق هادئ</option><option value="contrast">تباين عالٍ: أسود وأبيض</option></select></label><label>${official?'تكبير القراءة':'حجم الخط'}<input id="aqFont" type="range" min="${official?44:22}" max="${official?80:46}" value="${state.font}"></label><p>المس الصفحة لإظهار الأدوات أو إخفائها. اضغط مطوّلاً على الآية لفتح خدماتها. تقليب الصفحات بالسحب يميناً ويساراً، أو بزرّي السابق والتالي.</p><p>يحفظ المصحف آخر صفحة وملاحظاتك على هذا الجهاز.</p>`);
    if(phone){$('aqLayout').value=state.layout;$('aqLayout').onchange=e=>setLayout(e.target.value);}
    if(official){const button=document.createElement('button');button.type='button';button.textContent='تنزيل صفحات المصحف للقراءة بدون إنترنت';const status=document.createElement('p');status.setAttribute('role','status');$('aqSheetBody').append(button,status);button.onclick=async()=>{button.disabled=true;const downloadingPhone=phoneMode();let next=1,done=0;try{const cache=await caches.open(downloadingPhone?phone.cacheName:official.cacheName||'aoqat-mushaf-hafs1441');await Promise.all(Array.from({length:4},async()=>{while(next<=604){const n=next++,url=downloadingPhone?`${phone.directory}/${String(n).padStart(3,'0')}.json.gz`:`${official.imageDirectory||'assets/mushaf-hafs-1441'}/${String(n).padStart(3,'0')}.webp`;if(!await cache.match(url)){const r=await fetch(url);if(!r.ok||(!downloadingPhone&&!r.headers.get('content-type')?.includes('image/')))throw Error();await cache.put(url,r);}status.textContent=`تم تنزيل ${++done} / 604 صفحة`;}}));status.textContent='تم تنزيل المصحف كاملاً للقراءة بدون إنترنت';}catch(_){status.textContent='توقف التنزيل؛ الصفحات المكتملة محفوظة. يمكنك إعادة المحاولة.';}finally{button.disabled=false;}};}
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
      const url=new URL(location.href),shared=Number(url.searchParams.get('quranPage'));if(Number.isInteger(shared)&&shared>=1&&shared<=604){if(phone&&['phone','print'].includes(url.searchParams.get('quranLayout'))){state.layout=url.searchParams.get('quranLayout');meta.pages=phoneMode()?phone.pages:printPages;}state.page=shared;save();url.searchParams.delete('quranPage');url.searchParams.delete('quranLayout');history.replaceState(history.state,'',url.href);}
      root.inert=false;renderPage();notice('');
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
  const css=document.createElement('link');css.rel='stylesheet';css.href='css/quran-reader.css?v=phone-hafs-1';document.head.appendChild(css);
  window.AoqatQuranReader={open,close};
  // Load the packaged text before the user opens its menu; failures remain retryable.
  load().catch(()=>{});
})();
