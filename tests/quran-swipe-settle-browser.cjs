const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const {spawn}=require('node:child_process');
const {readFileSync}=require('node:fs');
const html=readFileSync('index.html','utf8'),sw=readFileSync('sw.js','utf8');
for(const asset of ['css/quran-reader.css?v=opening-folio-qcf-20261028','js/quran-reader.js?v=qcf-raf-swipe-opening-20261028']){
 assert.ok(html.includes(asset)&&sw.includes(asset),'QCF update must bypass old offline caches: '+asset);
}
assert.ok(sw.includes('aoqat-pwa-v170-qcf-opening-raf-20261028'),'Installed web app must refresh cache after a new QCF update');
(async()=>{
 const server=spawn('python3',['-m','http.server','8793'],{stdio:'ignore'});
 let browser;
 try{
  await new Promise(r=>setTimeout(r,800));
  browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'/usr/bin/google-chrome',args:['--no-sandbox']});
  const context=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'block'});
  const page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/rest/v1/annual_prayer_times**',r=>r.fulfill({json:[{
   gregorian_month:10,gregorian_day:28,fajr:'4:45',sunrise:'6:06',dhuhr:'11:59',asr:'3:20',maghrib:'5:50',isha:'7:10'
  }]}));
  await page.goto('http://127.0.0.1:8793',{waitUntil:'domcontentloaded'});
  await page.locator('[data-drawer="quran"]').waitFor({state:'attached'});
  await page.evaluate(()=>document.body.classList.add('design-menu-open'));
  await page.locator('[data-drawer="quran"]').click();
  async function ready(n){
   await page.waitForFunction(n=>{
    const reader=document.querySelector('#aqReader');
    return reader?.dataset.page===String(n)&&reader?.dataset.ready==='true'&&reader?.dataset.edition==='qcf2-font';
   },n,{timeout:40000});
  }
  async function jump(n){
   await page.evaluate(()=>document.body.classList.remove('quran-reader-immersive'));
   await page.locator('[data-qr-panel="index"]').click();
   await page.locator('#aqJump').fill(String(n));
   await page.locator('#aqJumpForm button').click();
   await ready(n);
   await page.waitForFunction(n=>!!document.querySelector('#aqPaper .aq-gallery-neighbor')&&document.querySelector('#aqReader')?.dataset.page===String(n),n,{timeout:40000});
  }
  for(const [width,height] of [[390,844],[393,853],[320,568],[844,390]]){
   await page.setViewportSize({width,height});
   for(const from of [120,450]){
    await jump(from);
    const paper=await page.locator('#aqPaper').boundingBox();
    const before=await page.locator('#adVerses').evaluate(e=>{
     const a=e.getBoundingClientRect(),line=e.querySelector('.aq-qcf-line')?.getBoundingClientRect();
     return {x:a.x,y:a.y,w:a.width,h:a.height,lineY:line?.y,transform:getComputedStyle(e).transform};
    });
    await page.evaluate(()=>{
     window.__qcfStabilityFrames=[];
     window.__qcfRecord=true;
     (function sample(){
      if(!window.__qcfRecord)return;
      const node=document.querySelector('#adVerses');
      const paper=document.querySelector('#aqPaper');
      // Neighbors stay cached after a swipe. Only the one within one page-width
      // of the active sheet is participating in the current transition;
      // other prepainted nodes remain far offscreen at -200vw.
      const candidates=[...paper.querySelectorAll(':scope>.aq-gallery-neighbor')];
      const activeLeft=node?.getBoundingClientRect().x||0;
      const incoming=candidates.find(candidate=>
       Math.abs(candidate.getBoundingClientRect().x-activeLeft)<=paper.clientWidth*1.25)||null;
      const rect=e=>{if(!e)return null;const r=e.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height};};
      window.__qcfStabilityFrames.push({t:performance.now(),page:document.querySelector('#aqReader')?.dataset.page,active:rect(node),incoming:rect(incoming),activeWord:rect(node?.querySelector('.aq-qcf-word')),incomingWord:rect(incoming?.querySelector('.aq-qcf-word')),activeTransform:node?getComputedStyle(node).transform:null,incomingTransform:incoming?getComputedStyle(incoming).transform:null});
      requestAnimationFrame(sample);
     })();
    });
    const cy=paper.y+paper.height*.5;
    await page.mouse.move(paper.x+40,cy);
    await page.mouse.down();
    await page.mouse.move(paper.x+155,cy,{steps:5});
    await page.mouse.up();
    await ready(from+1);
    await page.waitForTimeout(200);
    const samples=await page.evaluate(()=>{
     window.__qcfRecord=false;
     return window.__qcfStabilityFrames;
    });
    const finish=samples.find(f=>Number(f.page)===from+1 && f.active && !f.incoming);
    const lastBefore=samples.filter(f=>Number(f.page)===from && f.incoming &&
      Math.abs(f.incoming.x-before.x)<6).at(-1);
    assert.ok(finish,'No adopted QCF page after turn '+from+' at '+width+'x'+height);
    assert.ok(lastBefore,'Incoming page never visibly settled at the target position, '+from);
    const delta={x:Math.abs(finish.active.x-lastBefore.incoming.x),y:Math.abs(finish.active.y-lastBefore.incoming.y)};
    assert.ok(delta.x<=2&&delta.y<=2,
      'Visible QCF page jumps during DOM adoption: '+JSON.stringify({width,height,from,delta,before,lastBefore,finish}));
    const after=samples.filter(f=>Number(f.page)===from+1&&!f.incoming);
    const first=after[0],last=after.at(-1);
    assert.ok(first&&last,'Missing stable page samples after DOM adoption');
    assert.ok(before.transform!=='none'&&finish.activeTransform!=='none'&&last.activeTransform!=='none',
      'QCF compositor layer was torn down at swipe settle: '+JSON.stringify({before,finish,last}));
    assert.ok(first.activeWord&&last.activeWord,'Missing visible QCF glyph bounds after swipe');
    assert.ok(Math.abs(last.activeWord.x-first.activeWord.x)<=1&&Math.abs(last.activeWord.y-first.activeWord.y)<=1,
      'QCF glyphs move after the page settles: '+JSON.stringify({width,height,from,first,last}));
    assert.ok(Math.abs(last.active.x-first.active.x)<=1&&Math.abs(last.active.y-first.active.y)<=1,
      'QCF page keeps moving after the swipe settles: '+JSON.stringify({width,height,from,first,last}));
    assert.ok(Math.abs(finish.active.x-before.x)<=2&&Math.abs(finish.active.y-before.y)<=2,
      'QCF page origin should remain anchored while changing pages: '+JSON.stringify({width,height,from,before,finish}));
    assert.equal(await page.locator('#adVerses .aq-qcf-word').count()>0,true);
    // Pixel-level verification: the actual Quran ink must not re-rasterize or
    // shimmer after the transition is complete (rect tests alone miss this).
    const inkBefore=await page.locator('#adVerses').screenshot({animations:'disabled'});
    await page.waitForTimeout(120);
    const inkAfter=await page.locator('#adVerses').screenshot({animations:'disabled'});
    assert.equal(Buffer.compare(inkBefore,inkAfter),0,
      'QCF glyph pixels changed after swipe settled at page '+(from+1));
    console.log('PASS QCF stable after swipe: '+from+'->'+(from+1)+', viewport='+width+'x'+height+', handoff delta='+delta.x.toFixed(1)+'px/'+delta.y.toFixed(1)+'px');
   }
  }
  assert.deepEqual(errors,[]);
  console.log('PASS: QCF glyph and page stay on compositor after swipe, 4 viewport sizes and 2 distant page ranges');
 }finally{await browser?.close();server.kill();}
})().catch(e=>{console.error(e);process.exit(1);});
