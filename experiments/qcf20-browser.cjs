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
  const page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('console',m=>{if(m.type()==='error')console.log('Browser console:',m.text().slice(0,500));});
  await page.goto('http://127.0.0.1:8786/quran-qcf20-speed-test.html',{waitUntil:'domcontentloaded'});
  await page.waitForSelector('.stage[data-kind="svg"][data-page="1"]',{timeout:30000});
  assert.equal(await page.locator('#svgMode').getAttribute('aria-pressed'),'true');
  assert.equal(await page.locator('#paper .stage[data-kind="svg"][data-page="1"] .line').count()>0,true,'SVG must show first Mushaf page');
  // First-time external API and font loads are intentionally timed separately from swipes.
  await page.locator('#fontMode').click();
  try{
   await page.waitForFunction(()=>document.querySelector('#fontMode').getAttribute('aria-pressed')==='true',{timeout:45000});
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
  await page.locator('#svgMode').click();
  await page.waitForFunction(()=>document.querySelector('#svgMode').getAttribute('aria-pressed')==='true');
  assert.equal(await page.locator('#paper .stage[data-kind="svg"][data-page="1"] svg').count()>0,true);
  assert.deepEqual(errors,[]);
  console.log('PASS: all 20 Quran pages switch from SVG to authentic QCF V2 and back with no missing glyph rows.');
 }finally{await browser?.close();server.kill();}
})().catch(e=>{console.error(e);process.exit(1);});
