const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const {spawn}=require('node:child_process');
const {readFileSync}=require('node:fs');
const html=readFileSync('index.html','utf8'),sw=readFileSync('sw.js','utf8');
assert.ok(html.includes('js/quran-reader.js?v=qcf-opening-header-top-20261028'));
assert.ok(sw.includes('js/quran-reader.js?v=qcf-opening-header-top-20261028'));
assert.ok(sw.includes('aoqat-pwa-v173-qcf-metadata-header-top-20261028'));
(async()=>{
 const server=spawn('python3',['-m','http.server','8795'],{stdio:'ignore'});
 let browser;
 try{
  await new Promise(r=>setTimeout(r,750));
  browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'/usr/bin/google-chrome',args:['--no-sandbox']});
  const context=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'block'});
  const page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/rest/v1/annual_prayer_times**',r=>r.fulfill({json:[{
   gregorian_month:10,gregorian_day:28,fajr:'4:45',sunrise:'6:06',dhuhr:'11:59',asr:'3:20',maghrib:'5:50',isha:'7:10'
  }]}));
  await page.goto('http://127.0.0.1:8795',{waitUntil:'domcontentloaded'});
  await page.locator('[data-drawer="quran"]').waitFor({state:'attached'});
  await page.evaluate(()=>document.body.classList.add('design-menu-open'));
  await page.locator('[data-drawer="quran"]').click();
  async function ready(n){
   await page.waitForFunction(n=>{
    const root=document.querySelector('#aqReader');
    return root?.dataset.page===String(n)&&root?.dataset.ready==='true'&&
     root.dataset.edition==='qcf2-font'&&!!root.querySelector('#adVerses .aq-qcf-word');
   },n,{timeout:45000});
  }
  async function jump(n){
   await page.evaluate(()=>document.body.classList.remove('quran-reader-immersive'));
   await page.locator('[data-qr-panel="index"]').click();
   await page.locator('#aqJump').fill(String(n));
   await page.locator('#aqJumpForm button').click();
   await ready(n);
   await page.waitForFunction(()=>document.querySelectorAll('#aqPaper>.aq-gallery-neighbor').length>=2,null,{timeout:40000});
  }
  async function swipe(direction){
   const paper=await page.locator('#aqPaper').boundingBox();
   const y=paper.y+paper.height*.52;
   const x=direction>0?[paper.x+paper.width*.18,paper.x+paper.width*.48]:[paper.x+paper.width*.73,paper.x+paper.width*.40];
   await page.mouse.move(x[0],y);await page.mouse.down();
   await page.mouse.move(x[1],y,{steps:5});
   await page.mouse.up();
  }
  for(const [width,height] of [[390,844],[320,568]]){
   await page.setViewportSize({width,height});
   await jump(120);
   // Both adjacent QCF pages and one lookahead page must exist while idle.
   await page.waitForFunction(()=>document.querySelectorAll('#aqPaper>.aq-gallery-neighbor').length>=3,null,{timeout:40000});
   await page.evaluate(()=>{window.__oldQcfPage=document.querySelector('#adVerses')});
   const paper=await page.locator('#aqPaper').boundingBox();
   const y=paper.y+paper.height*.52;
   await page.evaluate(()=>{
    window.__qcfAdded=0;
    window.__qcfObserver=new MutationObserver(records=>{
     for(const record of records)for(const node of record.addedNodes)
      if(node.nodeType===1&&node.classList.contains('aq-gallery-neighbor'))window.__qcfAdded++;
    });
    window.__qcfObserver.observe(document.querySelector('#aqPaper'),{childList:true});
   });
   // The touchmove path must NOT allocate/reflow a new QCF page.
   await page.mouse.move(paper.x+paper.width*.18,y);
   await page.mouse.down();
   await page.mouse.move(paper.x+paper.width*.48,y,{steps:5});
   const added=await page.evaluate(()=>{
    const observer=window.__qcfObserver;
    for(const record of observer.takeRecords())for(const node of record.addedNodes)
      if(node.nodeType===1&&node.classList.contains('aq-gallery-neighbor'))window.__qcfAdded++;
    const count=window.__qcfAdded;observer.disconnect();return count;
   });
   assert.equal(added,0,'A heavy Quran neighbor was built during pointermove');
   await page.mouse.up();await ready(121);
   assert.ok(await page.evaluate(()=>window.__oldQcfPage.isConnected&&window.__oldQcfPage.classList.contains('aq-gallery-neighbor')),
    'Previous fitted QCF page must be retained as the reverse swipe buffer');
   await swipe(-1);await ready(120);
   assert.ok(await page.evaluate(()=>document.querySelector('#adVerses')===window.__oldQcfPage),
    'Fast reverse swipe must reuse the exact same fitted Quran DOM node');
   for(let n=121;n<=128;n++){
    await swipe(1);
    await ready(n);
    // The page cache is bounded; do not grow 604 DOM trees while reading.
    const count=await page.locator('#aqPaper>.aq-gallery-neighbor').count();
    assert.ok(count<=4,'Too many prepared page DOM trees: '+count);
   }
   await swipe(-1);await ready(127);
   // Rapid consecutive flicks: start the next gesture before the settlement
   // would normally finish. Every flick must still advance one page.
   await jump(120);
   for(let i=0;i<6;i++)await swipe(1);
   await ready(126);
   for(let i=0;i<6;i++)await swipe(-1);
   await ready(120);
   console.log('PASS fast Quran swipe: no touchmove layout, original DOM reused, 9 forward turns and immediate reverse at '+width+'x'+height);
  }
  assert.deepEqual(errors,[],'No Quran JS errors expected');
  console.log('PASS: rapid QCF swipes reuse prepared Quran pages with bounded memory and no re-render during finger drag');
 }finally{await browser?.close();server.kill();}
})().catch(e=>{console.error(e);process.exit(1);});
