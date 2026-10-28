const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const {spawn}=require('node:child_process');
(async()=>{
 const server=spawn('python3',['-m','http.server','8786'],{stdio:'ignore'});
 let browser;
 try{
  await new Promise(r=>setTimeout(r,800));
  browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'/usr/bin/google-chrome',args:['--no-sandbox']});
  const context=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'block'});
  const page=await context.newPage(),errors=[],svgRequests=[];
  page.on('request',req=>{if(/\/assets\/mushaf-phone-hafs\/\d{3}\.json\.gz/.test(req.url()))svgRequests.push(req.url());});
  page.on('pageerror',e=>errors.push(e.message));
  page.on('console',m=>{if(m.type()==='error')console.log('Browser console:',m.text().slice(0,500));});
  await page.goto('http://127.0.0.1:8786/quran-qcf20-speed-test.html',{waitUntil:'domcontentloaded'});
  await page.waitForSelector('.stage[data-kind="svg"][data-page="1"]',{timeout:30000});
  assert.equal(await page.locator('#svgMode').getAttribute('aria-pressed'),'true');
  assert.equal(await page.locator('#paper .stage[data-kind="svg"][data-page="1"] .line').count()>0,true,'SVG must show first Mushaf page');
  // First-time external API and font loads are intentionally timed separately from swipes.
  await page.locator('#fontMode').click();
  try{
   await page.waitForFunction(()=>document.querySelector('#fontMode').getAttribute('aria-pressed')==='true',null,{timeout:45000});
  }catch(e){throw Error('QCF V2 failed to load in an actual browser: '+await page.locator('#loading').textContent());}
  assert.equal(await page.locator('#paper .stage[data-kind="qcf"][data-page="1"] .qword').count()>0,true,'QCF page must contain glyphs, not SVG outlines');
  for(let n=2;n<=20;n++){
   await page.locator('#next').click();
   await page.waitForFunction(n=>document.querySelector('#pageNumber').textContent.startsWith(String(n).replace(/[0-9]/g,d=>'٠١٢٣٤٥٦٧٨٩'[+d])),n,{timeout:30000});
   assert.equal(await page.locator('#paper .stage[data-kind="qcf"][data-page="'+n+'"] .qword').count()>0,true,'Missing QCF page '+n);
   console.log('Verified QCF page '+n+' of 20');
  }
  for(let n=19;n>=1;n--){
   await page.locator('#prev').click();
   await page.waitForFunction(n=>document.querySelector('#pageNumber').textContent.startsWith(String(n).replace(/[0-9]/g,d=>'٠١٢٣٤٥٦٧٨٩'[+d])),n,{timeout:30000});
  }
  // Two real, rapid pointer gestures, without waiting for the first slide to settle.
  await page.waitForFunction(()=>!!document.querySelector('.stage[data-kind="qcf"][data-page="2"]'),null,{timeout:10000});
  const box=await page.locator('#paper').boundingBox();
  for(let i=0;i<2;i++){
   await page.mouse.move(box.x+45,box.y+box.height*.52);
   await page.mouse.down();
   await page.mouse.move(box.x+190,box.y+box.height*.52,{steps:4});
   await page.mouse.up();
  }
  await page.waitForFunction(()=>document.querySelector('#pageNumber').textContent.startsWith('٣'),null,{timeout:10000});
  assert.ok(await page.locator('#paper .stage[data-kind="qcf"][data-page="3"] .qword').count()>0,'Rapid swipes must reach page 3');
  await page.locator('#prev').click();await page.waitForFunction(()=>document.querySelector('#pageNumber').textContent.startsWith('٢'));
  await page.locator('#prev').click();await page.waitForFunction(()=>document.querySelector('#pageNumber').textContent.startsWith('١'));
  // Verify true random access: do not traverse 21..101, or download SVG paths
  // just to display QCF text at a remote page.
  async function jump(value,expected){
   await page.locator('#jumpPage').fill(String(value));
   await page.locator('#jumpButton').click();
   await page.waitForFunction(n=>document.querySelector('#pageNumber').textContent.startsWith(String(n).replace(/[0-9]/g,d=>'٠١٢٣٤٥٦٧٨٩'[+d])),expected,{timeout:45000});
   assert.ok(await page.locator('#paper .stage[data-kind="qcf"][data-page="'+expected+'"] .qword').count()>0,'QCF glyphs missing after jump '+expected);
   console.log('Direct QCF jump succeeded:',expected);
  }
  const svgCount=svgRequests.length;
  await jump('١٠٢',102);
  await page.waitForFunction(()=>!!document.querySelector('.stage[data-kind="qcf"][data-page="101"]')&&!!document.querySelector('.stage[data-kind="qcf"][data-page="103"]'),null,{timeout:45000});
  assert.ok(await page.locator('#paper .stage').count()<=3,'Only the active and adjacent pages may retain DOM nodes');
  await jump('450',450);
  await page.waitForFunction(()=>!!document.querySelector('.stage[data-kind="qcf"][data-page="449"]')&&!!document.querySelector('.stage[data-kind="qcf"][data-page="451"]'),null,{timeout:45000});
  assert.ok(await page.locator('#paper .stage').count()<=3);
  await jump('604',604);
  assert.equal(await page.locator('#next').isDisabled(),true);
  await page.locator('#jumpPage').fill('605');await page.locator('#jumpButton').click();
  assert.equal(await page.locator('#pageNumber').textContent(),'٦٠٤ / ٦٠٤','Reject invalid out-of-range pages');
  await jump('1',1);
  assert.equal(svgRequests.length,svgCount,'QCF random jumps must not load heavyweight SVG page files');
  assert.ok(await page.locator('#paper .stage').count()<=3);
  console.log('PASS: jumped directly to page 102, 450, 604 and 1, with adjacent preload and no extra SVG downloads');
  await page.locator('#svgMode').click();
  await page.waitForFunction(()=>document.querySelector('#svgMode').getAttribute('aria-pressed')==='true');
  assert.equal(await page.locator('#paper .stage[data-kind="svg"][data-page="1"] svg').count()>0,true);
  assert.deepEqual(errors,[]);
  console.log('PASS: authentic QCF V2, rapid swipes, and direct access to arbitrary pages 1–604 succeeded.');
 }finally{await browser?.close();server.kill();}
})().catch(e=>{console.error(e);process.exit(1);});
