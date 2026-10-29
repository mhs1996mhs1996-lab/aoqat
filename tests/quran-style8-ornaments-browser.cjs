const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const {spawn}=require('node:child_process');
const {readFileSync}=require('node:fs');
const {gunzipSync}=require('node:zlib');

(async()=>{
 const manifest=JSON.parse(gunzipSync(readFileSync('experiments/qcf604-web-verse-layouts.json.gz')));
 assert.equal(manifest.pageCount,604,'QCF source 604 pages must remain intact');
 const starts=Object.entries(manifest.pages).flatMap(([page,data])=>
   data.lines.filter(line=>Number.isInteger(line.s)&&line.s>0)
     .map(line=>({page:Number(page),surah:line.s})));
 const uniqueIds=new Set([1,2,...starts.map(x=>x.surah)]);
 assert.ok(uniqueIds.size>=110,'The authentic QCF page data must include all surah openings');
 const sample=[...new Set([1,2,...starts.filter((_,i)=>i%16===2).slice(0,5).map(x=>x.page),starts.at(-1).page])];
 console.log('Style8 QCF surah-opening pages tested:',sample.join(', '),'source surah IDs:',uniqueIds.size);
 const server=spawn('python3',['-m','http.server','8793'],{stdio:'ignore'});
 let browser;
 try{
  await new Promise(r=>setTimeout(r,800));
  browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'/usr/bin/google-chrome',args:['--no-sandbox']});
  const context=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'block'});
  const page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/rest/v1/annual_prayer_times**',r=>r.fulfill({json:[{
   gregorian_month:10,gregorian_day:29,fajr:'4:45',sunrise:'6:06',dhuhr:'11:59',asr:'3:20',maghrib:'5:50',isha:'7:10'
  }]}));
  await page.goto('http://127.0.0.1:8793',{waitUntil:'domcontentloaded'});
  await page.locator('[data-drawer="quran"]').waitFor({state:'attached'});
  await page.evaluate(()=>document.body.classList.add('design-menu-open'));
  await page.locator('[data-drawer="quran"]').click();
  async function ready(n){
   await page.waitForFunction(n=>{
    const r=document.querySelector('#aqReader');
    return r?.dataset.page===String(n)&&r.dataset.edition==='qcf2-font'&&
      r.dataset.ready==='true'&&r.querySelectorAll('#adVerses .aq-qcf-word').length>0;
   },n,{timeout:60000});
  }
  async function jump(n){
   await page.evaluate(()=>document.body.classList.remove('quran-reader-immersive'));
   await page.locator('[data-qr-panel="index"]').click();
   await page.locator('#aqJump').fill(String(n));
   await page.locator('#aqJumpForm button').click();
   await ready(n);
  }
  async function verify(n){
   await ready(n);
   const result=await page.locator('#adVerses').evaluate(text=>{
    const pap=document.querySelector('#aqPaper');
    const plaque=[...text.querySelectorAll('.aq-qcf-surah-plaque')];
    const markers=[...text.querySelectorAll('.aq-qcf-marker')];
    const rect=x=>{const r=x.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height};};
    const headings=plaque.map(header=>{
      const info=header.querySelector('.aq-qcf-opening-info'),name=header.querySelector('.aq-surah-info-name');
      const labels=[...info.querySelectorAll('span')];
      return {name:name?.textContent,labels:labels.map(l=>{
        const range=document.createRange();range.selectNodeContents(l);
        return {text:l.textContent,rect:rect(l),textWidth:range.getBoundingClientRect().width};
      }),rect:rect(header),svg:header.querySelectorAll('svg.aq-qcf-opening-art').length,
        floral:header.querySelectorAll('svg .aq-qcf-floral').length,
        background:getComputedStyle(info).backgroundColor,
        height:header.clientHeight,styles:getComputedStyle(header).display};
    });
    const ink=getComputedStyle(text.querySelector('.aq-qcf-word:not(.aq-qcf-marker)')).color;
    return {w:text.clientWidth,sw:text.scrollWidth,
      lineSizes:[...text.querySelectorAll('.aq-qcf-line')].map(l=>({
        rect:rect(l),scrollWidth:l.scrollWidth,clientWidth:l.clientWidth,
        fontSize:getComputedStyle(l).fontSize,childCount:l.children.length
      })),
      headings,markers:markers.map(m=>({
       text:m.textContent,color:getComputedStyle(m).color,ink,
       pseudo:getComputedStyle(m,'::before').content,
       pseudoDisplay:getComputedStyle(m,'::before').display,
       backdrop:getComputedStyle(m).backgroundImage,
       inkVar:getComputedStyle(m).getPropertyValue('--qcf-rosette-ink').trim(),
       tintVar:getComputedStyle(m).getPropertyValue('--qcf-rosette-tint').trim(),
       rect:rect(m),font:getComputedStyle(m).fontFamily,
       medallion:!!m.querySelector('svg.aq-qcf-selected-ayah-frame'),
       overlay:getComputedStyle(m.querySelector('.aq-qcf-selected-ayah'),'::after').content,
       originalHidden:getComputedStyle(m.querySelector('.aq-qcf-selected-ayah-glyph')).visibility,
       data:m.dataset.qrVerse
      }))};
   });
   assert.ok(result.sw<=result.w+6,'No Quran page text may overflow horizontally: '+n+' '+JSON.stringify({
     scrollWidth:result.sw,availableWidth:result.w,headings:result.headings.map(h=>({name:h.name,rect:h.rect})),
     worstLines:result.lineSizes.filter(l=>l.scrollWidth>l.clientWidth+3).slice(0,4)
   }));
   const original=manifest.pages[String(n)].lines.flatMap(line=>(line.v||[])
     .filter(w=>w[2]).map(w=>w[1]));
   assert.deepEqual(result.markers.map(x=>x.text),original,
     'Do not change original QCF verse-number glyphs or their order: page '+n);
   assert.ok(result.markers.length>0,'Expected original verse-number markers on '+n);
   assert.ok(result.markers.every(m=>m.color!==m.ink&&m.pseudo==='none'&&
       m.pseudoDisplay==='none'&&m.medallion&&m.overlay!=='none'&&
       m.originalHidden==='hidden'&&m.rect.w>4&&m.rect.h>5),
     'Keep the exact QCF codepoint but render the selected single ayah medallion #1 visibly: '+n);
   if(n<=2)assert.equal(result.headings.length,1,'Opening pages should keep exactly one surah bar');
   else assert.equal(result.headings.length,manifest.pages[String(n)].lines.filter(x=>x.s).length,
     'Every real surah title row must have exactly one style8 header on page '+n);
   for(const header of result.headings){
    assert.equal(header.svg,1,'Style8 must be one continuous SVG cartouche');
    assert.equal(header.floral,2,'Style8 requires mirrored floral wings');
    assert.equal(header.labels.length,3,'Full name / verse count / Makki-Madani required');
    assert.ok(header.labels[0].text.includes('آية'),'Number of ayat must remain');
    assert.ok(header.labels[1].text.includes('سورة'),'Surah name must remain');
    assert.ok(['مكية','مدنية'].includes(header.labels[2].text),'Makki/Madani must remain');
    for(const label of header.labels){
      assert.ok(label.textWidth<=label.rect.w+2,
        'Full metadata text must fit in ornamental plaque: '+JSON.stringify({page:n,header:header.name,label}));
      assert.ok(label.rect.w>=18&&label.rect.h>8,
        'All metadata need visible width/height: '+JSON.stringify(header));
    }
    assert.ok(header.rect.w>result.w*.88,'Integrated artwork should span the Quran page width');
    assert.ok(header.height<=56,'Keep ornate header compact and clear of Quran words');
   }
   console.log('PASS style8 page '+n+': '+result.headings.map(h=>h.name).join('|')+
     ', '+result.markers.length+' authentic contrast-marked ayah numbers');
   return result;
  }
  for(const n of sample){await jump(n);await verify(n);}
  for(const [w,h] of [[320,568],[412,915]]){
   await page.setViewportSize({width:w,height:h});
   for(const n of [1,2,sample[3]]){await jump(n);await verify(n);}
   console.log('PASS style8 responsive '+w+'x'+h);
  }
  await jump(2);
  const originals=await page.locator('#adVerses .aq-qcf-marker').allTextContents();
  for(const theme of ['night','green','blue','contrast']){
   const c=await page.locator('#aqReader').evaluate((r,t)=>{
    r.dataset.theme=t;
    const mark=r.querySelector('#adVerses .aq-qcf-marker');
    const medal=mark.querySelector('.aq-qcf-selected-ayah');
    return {ink:getComputedStyle(mark).color,bg:getComputedStyle(mark).backgroundImage,
      frame:!!medal?.querySelector('svg.aq-qcf-selected-ayah-frame'),
      numeral:getComputedStyle(medal,'::after').content,
      pseudo:getComputedStyle(mark,'::before').content};
   },theme);
   assert.ok(c.frame&&c.numeral!=='none'&&c.pseudo==='none'&&c.bg==='none',
     'The user-selected single ayah medallion must remain visible in '+theme);
   assert.deepEqual(await page.locator('#adVerses .aq-qcf-marker').allTextContents(),
     originals,'Theme must never change Quran verse number glyph data');
   console.log('PASS style8 verse number contrast theme '+theme+': '+c.ink);
  }
  await page.locator('#aqReader').evaluate(r=>r.dataset.theme='sepia');
  await jump(1);
  await page.evaluate(()=>document.body.classList.add('quran-reader-immersive'));
  const shot=await page.locator('#aqPaper').screenshot({type:'jpeg',quality:48,animations:'disabled'});
  console.log('STYLE8_PAGE1_IMAGE='+shot.toString('base64'));
  assert.deepEqual(errors,[],'No browser JS errors');
  console.log('PASS: style8 all-QCF-surah heading template, word-safe authentic verse rosettes, dark mode and offline-safe responsive layouts');
 }finally{await browser?.close();server.kill();}
})().catch(e=>{console.error(e);process.exit(1);});
