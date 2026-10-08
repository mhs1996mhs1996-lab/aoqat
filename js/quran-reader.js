(function () {
  'use strict';
  if (window.AndroidNative?.configureAdhan) return;
  const markColors={"blue":["أزرق","#5379c3"],"green":["أخضر","#328663"],"amber":["ذهبي","#bd8b25"],"red":["أحمر","#c55050"],"purple":["بنفسجي","#8d60b3"]};
  const KEY='aoqatQuranReaderV1', TOTAL=604;
  const paths={index:'M4 6h16M4 12h16M4 18h16',wird:'M3 5c4-2 7-1 9 1 2-2 5-3 9-1v14c-4-2-7-1-9 1-2-2-5-3-9-1V5zm9 1v14',profile:'M8 7a4 4 0 1 0 8 0 4 4 0 1 0-8 0M4 22v-4c0-5 16-5 16 0v4',settings:'M3 6h18M3 18h18M8 3v6M16 15v6',mushaf:'M3 5c4-2 7-1 9 1 2-2 5-3 9-1v14c-4-2-7-1-9 1-2-2-5-3-9-1V5zm9 1v14',search:'M17 17l5 5M3 10a7 7 0 1 0 14 0 7 7 0 1 0-14 0',audio:'M3 14v-3a9 9 0 0 1 18 0v3M3 12h4v9H3zM17 12h4v9h-4z',library:'M3 3h18v18H3zM7 8h10M7 13h10M7 17h6',more:'M3 3h6v6H3zM15 3h6v6h-6zM3 15h6v6H3zM15 18h6M18 15v6'};
  const icons=Object.fromEntries(Object.entries(paths).map(([k,d])=>[k,`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${d}"/></svg>`]));
  const titles={index:'الفهرس',wird:'وردي',profile:'ملفاتي',settings:'الإعدادات',mushaf:'المصحف',search:'البحث',audio:'التلاوة',library:'المكتبة',more:'المزيد'};
  const readers=[['ar.alafasy','مشاري راشد العفاسي'],['ar.husary','محمود خليل الحصري'],['ar.minshawi','محمد صديق المنشاوي'],['ar.abdulbasitmurattal','عبد الباسط عبد الصمد']];
  let state={page:1,theme:'sepia',font:44,reciter:'ar.alafasy',volume:80,goal:20,name:'',bookmarks:[],notes:[],days:{}};
  try {Object.assign(state,JSON.parse(localStorage.getItem(KEY)||'{}'));}catch(_){}
  state.page=Math.max(1,Math.min(TOTAL,Math.floor(Number(state.page)||1)));
  state.theme=['sepia','white','night'].includes(state.theme)?state.theme:'sepia';
  state.font=Math.max(22,Math.min(46,Number(state.font)||44));
  if(!state.readingRevision && state.font===32)state.font=36;
  if(state.readingRevision===2 && state.font===36 && !state.fontCustomized)state.font=40;
  if(!state.fontCustomized && (state.readingRevision||0)<4)state.font=44;
  state.readingRevision=4;
  state.goal=Math.max(1,Math.min(604,Math.floor(Number(state.goal)||20)));
  state.volume=Math.max(0,Math.min(100,Number(state.volume)||80));
  state.reciter=readers.some(r=>r[0]===state.reciter)?state.reciter:readers[0][0];
  for(const key of ['bookmarks','notes'])if(!Array.isArray(state[key]))state[key]=[];
  if(!state.days || typeof state.days!=='object' || Array.isArray(state.days))state.days={};
  let root,host,quran,meta,verses=[],loading,resize,audio,selected=0,audioIndex=-1,audioOn=false,audioSequence=0,audioRepeat=1,repeated=0,returnFocus,pointer,ignoreClickUntil=0,searchLimit=60,query='',request,pressTimer,turnAnimation,incomingAnimation,dragOffset=0,dragFrame=0,warmTask=0;
  const fittedSizes=new Map(),preparedPages=new Map();
  const pageKey=(paper,page)=>[page,paper.clientWidth,paper.clientHeight,state.font].join(':');
  const $=id=>root?.querySelector('#'+id), esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const arabic=n=>String(n).replace(/\d/g,d=>'٠١٢٣٤٥٦٧٨٩'[d]);
  const plain=s=>String(s).normalize('NFKD').replace(/[\u0610-\u061a\u064b-\u065f\u0670\u06d6-\u06ed\u0640]/g,'').replace(/[ٱأإآ]/g,'ا').replace(/ى/g,'ي');
  function save(){try{localStorage.setItem(KEY,JSON.stringify(state));}catch(_){notice('تعذر حفظ إعدادات القرآن على هذا الجهاز');}}
  function today(){const d=new Date();return `${d.getFullYear()}-${d.getMonth()+1}-${d.getDate()}`;}
  function readToday(){const d=state.days[today()];return Array.isArray(d)?d:[];}
  function pageOf(i){let lo=0,hi=603;while(lo<hi){const m=Math.ceil((lo+hi)/2);if(meta.pages[m].start<=i)lo=m;else hi=m-1;}return lo+1;}
  function juzOf(i){return meta.juzs.filter(j=>j.start<=i).at(-1)?.id||1;}
  function pageItems(p=state.page){return verses.slice(meta.pages[p-1].start,p<604?meta.pages[p].start:verses.length);}
  function notice(text){if($('aqNotice'))$('aqNotice').textContent=text;}
  function barButton(kind){return `<button type="button" data-qr-panel="${kind}" aria-label="${titles[kind]}"${kind==='mushaf'?' class="aq-active" aria-current="page"':''}><span aria-hidden="true">${icons[kind]}</span><small>${titles[kind]}</small></button>`;}
  async function load(){
    if(!loading)loading=Promise.all([fetch('assets/quran.json').then(r=>{if(!r.ok)throw Error();return r.json();}),fetch('assets/quran-pages.json').then(r=>{if(!r.ok)throw Error();return r.json();})]).then(([q,m])=>{
      if(q.length!==114||m.pages.length!==604)throw Error();quran=q;meta=m;
      verses=q.flatMap(s=>s.verses.map(v=>({s:s.id,a:v.id,name:s.name,text:v.text,search:plain(v.text)})));
      if(verses.length!==6236)throw Error();
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
      if(Math.abs(dx)>12&&Math.abs(dx)>Math.abs(dy)*1.4){dragOffset=dx;if(!dragFrame)dragFrame=requestAnimationFrame(()=>{dragFrame=0;if(pointer)previewDrag(dragOffset);});}
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
    if(page>2&&meta.lines?.[page-1])return meta.lines[page-1].map(line=>{
      if(line.s)return `<div class="aq-mushaf-line"><h2 class="aq-surah-banner">سورة ${esc(quran[line.s-1].name)}</h2></div>`;
      if(line.b)return `<div class="aq-mushaf-line aq-centered"><span class="aq-line-ink">${esc(quran[0].verses[0].text)}</span></div>`;
      return `<div class="aq-mushaf-line"><span class="aq-line-ink">${line.v.map(([i,start,end])=>{const v=verses[i],words=v.text.split(/\s+/);return `<span role="button" tabindex="0" data-qr-verse="${i}" class="aq-ayah${audioOn&&audioIndex===i?' aq-playing':''}" aria-label="${esc(v.name)} الآية ${v.a}">${esc(words.slice(start,end).join(' '))}${end===words.length?` <span class="aq-ayah-number">${arabic(v.a)}</span>`:''}</span>`;}).join(' ')}</span></div>`;
    }).join('');
    const items=pageItems(page),start=meta.pages[page-1].start;let html='',group=-1;
    items.forEach((v,n)=>{
      if(group!==v.s){if(group!==-1)html+='</p>';group=v.s;
        if(v.a===1){html+=`<h2 class="aq-surah-banner">سورة ${esc(v.name)}</h2>`;if(v.s!==1&&v.s!==9)html+=`<div class="aq-bismillah">${esc(quran[0].verses[0].text)}</div>`;}
        html+='<p class="aq-verses">';
      }
      html+=`<span role="button" tabindex="0" data-qr-verse="${start+n}" class="aq-ayah${audioOn&&audioIndex===start+n?' aq-playing':''}" aria-label="${esc(v.name)} الآية ${v.a}">${esc(v.text)} <span class="aq-ayah-number">${arabic(v.a)}</span></span> `;
    });html+='</p>';
    return html;
  }
  function inertText(text){text.removeAttribute('id');text.querySelectorAll('[data-qr-verse]').forEach(v=>{v.removeAttribute('data-qr-verse');v.removeAttribute('role');v.removeAttribute('tabindex');});return text;}
  function previewDrag(dx){
    const paper=$('aqPaper'),width=paper.clientWidth,target=state.page+(dx>0?1:-1);
    if(target<1||target>TOTAL){$('adVerses').style.transform='translateX('+Math.max(-35,Math.min(35,dx*.15))+'px)';return;}
    let leaf=paper.querySelector('.aq-drag-preview');
    if(!leaf||Number(leaf.dataset.target)!==target){
      leaf?.remove();leaf=document.createElement('div');leaf.className='aq-leaf aq-drag-preview';leaf.dataset.target=target;leaf.setAttribute('aria-hidden','true');leaf.inert=true;
      const front=document.createElement('div');front.className='aq-leaf-front';const text=$('adVerses').cloneNode(false);const cached=preparedPages.get(pageKey(paper,target));if(cached){text.className=cached.className;text.style.cssText=cached.style.cssText;text.innerHTML=cached.innerHTML;}else{text.innerHTML=pageHTML(target);text.classList.toggle('aq-opening',target<=2);}inertText(text);text.style.transform='';front.append(text);leaf.append(front);paper.append(leaf);fitText(paper,text,target);
    }
    const offset=Math.max(-width,Math.min(width,dx));$('adVerses').style.transform='translateX('+offset+'px)';leaf.style.transform='translateX('+(offset+(dx>0?-width:width))+'px)';
  }
  function renderPage(animate=false){
    const offset=dragOffset;dragOffset=0;const oldPage=Number(root.dataset.page),oldText=animate?$('adVerses').cloneNode(true):null;if(oldText)oldText.style.transform='';
    clearTurn();
    const items=pageItems(),start=meta.pages[state.page-1].start,html=pageHTML(state.page);
    const cached=!audioOn&&preparedPages.get(pageKey($('aqPaper'),state.page));if(cached){const ready=cached.cloneNode(true);ready.id='adVerses';$('adVerses').replaceWith(ready);}else{$('adVerses').innerHTML=html;$('adVerses').classList.toggle('aq-opening',state.page<=2);}
    $('aqSurahName').textContent=items[0].name;$('aqJuz').textContent='الجزء '+arabic(juzOf(start));
    $('aqFolio').textContent=arabic(state.page);$('aqPageNumber').textContent=`${state.page} / 604`;$('aqPageSlider').value=state.page;
    $('aqPrevious').disabled=state.page===1;$('aqNext').disabled=state.page===604;
    const marked=state.bookmarks.some(b=>b.i===start);$('aqBookmark').textContent=marked?'★':'☆';$('aqBookmark').setAttribute('aria-pressed',String(marked));
    root.dataset.page=state.page;root.dataset.theme=state.theme;
    fit();warmAdjacent(animate?200:80);
    if(animate&&oldPage&&Math.abs(oldPage-state.page)===1&&!matchMedia('(prefers-reduced-motion: reduce)').matches){
      const next=state.page>oldPage,paper=$('aqPaper'),leaf=document.createElement('div');
      leaf.className='aq-leaf';leaf.setAttribute('aria-hidden','true');leaf.inert=true;
      oldText.removeAttribute('id');oldText.querySelectorAll('[data-qr-verse]').forEach(v=>{v.removeAttribute('data-qr-verse');v.removeAttribute('role');v.removeAttribute('tabindex');});
      const front=document.createElement('div');front.className='aq-leaf-front';front.append(oldText);leaf.append(front);paper.append(leaf);
      const direction=next?1:-1,width=paper.clientWidth,start=Math.max(-width,Math.min(width,offset)),options={duration:180,easing:'cubic-bezier(.2,.7,.3,1)',fill:'forwards'};
      incomingAnimation=$('adVerses').animate([{transform:'translateX('+(start-direction*width)+'px)'},{transform:'translateX(0px)'}],options);
      const animation=leaf.animate([{transform:'translateX('+start+'px)'},{transform:'translateX('+(direction*width)+'px)'}],options);
      turnAnimation=animation;animation.finished.then(()=>{leaf.remove();if(turnAnimation===animation)turnAnimation=null;incomingAnimation?.cancel();incomingAnimation=null;}).catch(()=>leaf.remove());
    }
  }
  function fit(){
    const paper=$('aqPaper'),text=$('adVerses');if(!paper||!text||paper.clientHeight<1)return;
    fitText(paper,text,state.page);
  }
  function fitText(paper,text,page){
    const height=paper.clientHeight-28,width=paper.clientWidth-20,key=[page,width,height,state.font].join(':');
    if(page>2&&meta.lines?.[page-1]){
      text.classList.add('aq-lined-page');text.style.height=height+'px';
      const inks=[...text.querySelectorAll('.aq-line-ink')],rows=meta.lines[page-1].length;
      const cached=fittedSizes.get(key);
      if(Array.isArray(cached)){inks.forEach((ink,i)=>{ink.style.setProperty('font-size',cached[i][0]+'px','important');ink.style.transform='scaleX('+cached[i][1]+')';});return;}
      inks.forEach(ink=>{ink.style.setProperty('font-size',state.font+'px','important');ink.style.transform='';});
      const widths=inks.map(ink=>ink.scrollWidth);
      const size=Math.min(state.font,height/rows/1.45);
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
    if(Number.isInteger(highlight))root.querySelector(`[data-qr-verse="${highlight}"]`)?.classList.add('aq-selected');
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
    sheet('إعدادات المصحف',`<label>لون المصحف<select id="aqTheme"><option value="sepia">ورقي</option><option value="white">أبيض</option><option value="night">ليلي</option></select></label><label>حجم الخط<input id="aqFont" type="range" min="22" max="46" value="${state.font}"></label><p>المس الصفحة لإظهار الأدوات أو إخفائها. اضغط مطوّلاً على الآية لفتح خدماتها. تقليب الصفحات بالسحب يميناً ويساراً، أو بزرّي السابق والتالي.</p><p>يحفظ المصحف آخر صفحة وملاحظاتك على هذا الجهاز.</p>`);
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
    function playVerse(){if(seq!==audioSequence||!audioOn)return;const p=pageOf(audioIndex);if(state.page!==p){state.page=p;save();renderPage(true);}root.querySelectorAll('.aq-playing').forEach(e=>e.classList.remove('aq-playing'));root.querySelector(`[data-qr-verse="${audioIndex}"]`)?.classList.add('aq-playing');
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
  function sourcesPanel(){sheet('مصادر المصحف',`<p>نص القرآن الموجود بالمشروع: Risan Quran JSON، 114 سورة و6236 آية، دون تغيير النص.</p><a href="https://github.com/risan/quran-json" target="_blank" rel="noopener">مصدر النص وترخيص CC BY-SA 4.0</a><p>حدود صفحات مصحف المدينة والأجزاء: مشروع تنزيل.</p><a href="https://tanzil.net/docs/Quran_Metadata" target="_blank" rel="noopener">بيانات تنزيل · CC BY</a><p>التلاوة والتفسير الميسر: Al Quran Cloud.</p><a href="https://alquran.cloud" target="_blank" rel="noopener">مصدر التلاوة والتفسير</a><p>خط Amiri Quran · ترخيص SIL Open Font License.</p><p>الواجهة مبنية لهذا المشروع؛ الأزرار مستوحاة من ترتيب السكرين المرجعي.</p>`);}
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
    $('aqSharePage').onclick=async()=>{const url=new URL(location.href);url.searchParams.set('quranPage',state.page);try{if(navigator.share)await navigator.share({title:'القرآن الكريم · صفحة '+state.page,url:url.href});else{await navigator.clipboard.writeText(url.href);if($('aqMoreStatus'))$('aqMoreStatus').textContent='تم نسخ رابط الصفحة';}}catch(e){if(e.name!=='AbortError'&&$('aqMoreStatus'))$('aqMoreStatus').textContent='تعذر مشاركة الرابط';}};
  }
  async function open(element){
    host=element;const token=element;document.body.classList.add('quran-reader-open');shell();root.inert=true;notice('تحميل المصحف…');
    try{await load();if(host!==token||!token.isConnected)return;
      const url=new URL(location.href),shared=Number(url.searchParams.get('quranPage'));if(Number.isInteger(shared)&&shared>=1&&shared<=604){state.page=shared;save();url.searchParams.delete('quranPage');history.replaceState(history.state,'',url.href);}
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
  const css=document.createElement('link');css.rel='stylesheet';css.href='css/quran-reader.css';document.head.appendChild(css);
  window.AoqatQuranReader={open,close};
  // Load the packaged text before the user opens its menu; failures remain retryable.
  load().catch(()=>{});
})();
