const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const {spawn}=require('node:child_process');
const {readFileSync}=require('node:fs');
const zlib=require('node:zlib');

(async()=>{
  const manifest=JSON.parse(zlib.gunzipSync(readFileSync('experiments/qcf604-web-verse-layouts.json.gz')));
  assert.equal(manifest.pageCount,604);
  assert.equal(Object.keys(manifest.pages).length,604);
  for(const n of [1,2,20,102,103,120,450,604]){
    assert.ok(manifest.pages[String(n)].lines.length>=6,'QCF manifest missing page '+n);
    assert.ok(manifest.pages[String(n)].lines.flatMap(l=>l.v||[]).every(w=>Number.isInteger(w[0])&&typeof w[1]==='string'&&w[1]),'Quran word index mismatch');
  }
  const server=spawn('python3',['-m','http.server','8788'],{stdio:'ignore'});
  let browser;
  try{
    await new Promise(r=>setTimeout(r,850));
    browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'/usr/bin/google-chrome',args:['--no-sandbox']});
    const context=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,serviceWorkers:'block'});
    const page=await context.newPage(),errors=[],svgRequests=[];
    page.on('pageerror',e=>errors.push(e.message));
    page.on('request',r=>{
      if(/\/assets\/mushaf-phone-hafs\/\d{3}\.json\.gz/.test(r.url()))svgRequests.push(r.url());
    });
    await page.route('**/rest/v1/annual_prayer_times**',r=>r.fulfill({json:[{
      gregorian_month:10,gregorian_day:28,fajr:'4:45',sunrise:'6:06',dhuhr:'11:59',asr:'3:20',maghrib:'5:50',isha:'7:10'
    }]}));
    await page.goto('http://127.0.0.1:8788',{waitUntil:'domcontentloaded'});
    await page.locator('[data-drawer="quran"]').waitFor({state:'attached'});
    await page.evaluate(()=>document.body.classList.add('design-menu-open'));
    await page.locator('[data-drawer="quran"]').click();
    async function ready(n){
      await page.waitForFunction(n=>{
        const el=document.querySelector('#aqReader');
        return el?.dataset.ready==='true'&&el.dataset.edition==='qcf2-font'&&
               (n==null||el.dataset.page===String(n))&&
               el.querySelectorAll('#adVerses .aq-qcf-word').length>0;
      },n,{timeout:55000});
    }
    async function jump(n){
      await page.evaluate(()=>document.body.classList.remove('quran-reader-immersive'));
      await page.locator('[data-qr-panel="index"]').click();
      await page.locator('#aqJump').fill(String(n));
      await page.locator('#aqJumpForm button').click();
      await ready(n);
      assert.equal(await page.locator('#aqReader').getAttribute('data-page'),String(n));
      const display=await page.locator('#adVerses').evaluate(node=>({
        w:node.clientWidth,sw:node.scrollWidth,h:node.clientHeight,
        sh:node.scrollHeight,rows:node.children.length,fonts:[...node.querySelectorAll('.aq-qcf-line')].map(e=>getComputedStyle(e).fontFamily)
      }));
      assert.ok(display.w>0&&display.h>0&&display.sw<=display.w+3,'QCF page overflows horizontally: '+n+' '+JSON.stringify(display));
      assert.equal(display.rows,manifest.pages[String(n)].lines.length,'Page layout row mismatch '+n);
      assert.ok(display.fonts.every(f=>f.includes('AqQcfV2Page'+n)),'Wrong page-specific font used on '+n);
      console.log('Web Quran reader QCF page ready:',n);
    }
    await ready(1);
    assert.equal(await page.locator('#aqReader').getAttribute('data-edition'),'qcf2-font');
    assert.equal(await page.locator('[data-qr-panel]').count(),9);
    for(const n of [102,450,604,20,120])await jump(n);
    assert.equal(svgRequests.length,0,'QCF page jump must not fetch old bulky SVG outlines');
    await page.waitForFunction(()=>document.querySelectorAll('.aq-gallery-neighbor').length>=1,null,{timeout:30000});
    // Exercise the actual old reader toolbar, verse interaction and persistent state.
    await page.locator('#adVerses [data-qr-verse]').first().press('Enter');
    await page.locator('#aqNote').fill('اختبار القراءة QCF');
    await page.locator('#aqSaveNote').click();
    await page.locator('#aqCloseSheet').click();
    await page.evaluate(()=>document.body.classList.add('quran-reader-immersive'));
    await page.locator('#aqQuickSave').click();
    assert.ok(await page.evaluate(()=>JSON.parse(localStorage.aoqatQuranReaderV1).bookmarks.some(b=>b.quick&&b.page===120)));
    const paper=await page.locator('#aqPaper').boundingBox();
    for(let n=121;n<=123;n++){
      await page.mouse.move(paper.x+40,paper.y+paper.height*.53);
      await page.mouse.down();
      await page.mouse.move(paper.x+140,paper.y+paper.height*.53,{steps:4});
      await page.mouse.up();
      await ready(n);
    }
    console.log('Web Quran QCF fast swipes arrived on page 123');
    await page.evaluate(()=>document.body.classList.remove('quran-reader-immersive'));
    await page.locator('[data-qr-panel="settings"]').click();
    assert.equal(await page.locator('#aqRenderingMode').inputValue(),'qcf');
    await page.locator('#aqRenderingMode').selectOption('svg');
    await page.waitForFunction(()=>document.querySelector('#aqReader')?.dataset.edition==='qcf2-phone'&&document.querySelector('#aqReader')?.dataset.ready==='true',null,{timeout:30000});
    assert.ok(await page.locator('#adVerses .aq-native-line').count()>0,'Original SVG fallback not available');
    await page.locator('[data-qr-panel="settings"]').click();
    await page.locator('#aqRenderingMode').selectOption('qcf');
    await ready(123);
    assert.ok(await page.evaluate(()=>JSON.parse(localStorage.aoqatQuranReaderV1).notes.some(n=>n.text==='اختبار القراءة QCF')),'Verse notes were not retained');
    await page.reload({waitUntil:'domcontentloaded'});
    await page.locator('[data-drawer="quran"]').waitFor({state:'attached'});
    await page.evaluate(()=>document.body.classList.add('design-menu-open'));
    await page.locator('[data-drawer="quran"]').click();
    await ready(123);
    assert.deepEqual(errors,[],'Quran renderer triggered JS page errors');
    console.log('PASS: integrated web QCF V2 — direct jumps (102/450/604), fast swipes, verse notes, bookmarks, SVG fallback and reload');
  }finally{
    if(browser)await browser.close();
    server.kill();
  }
})().catch(e=>{console.error(e);process.exit(1)});
