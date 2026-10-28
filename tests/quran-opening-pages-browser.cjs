const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const {spawn}=require('node:child_process');

(async()=>{
 const server=spawn('python3',['-m','http.server','8797'],{stdio:'ignore'});
 let browser;
 try{
  await new Promise(r=>setTimeout(r,800));
  browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'/usr/bin/google-chrome',args:['--no-sandbox']});
  const context=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'block'});
  const page=await context.newPage(),errors=[];
  page.on('pageerror',err=>errors.push(err.message));
  await page.route('**/rest/v1/annual_prayer_times**',route=>route.fulfill({json:[{
   gregorian_month:10,gregorian_day:28,fajr:'4:45',sunrise:'6:06',dhuhr:'11:59',asr:'3:20',maghrib:'5:50',isha:'7:10'
  }]}));
  await page.goto('http://127.0.0.1:8797',{waitUntil:'domcontentloaded'});
  await page.locator('[data-drawer="quran"]').waitFor({state:'attached'});
  await page.evaluate(()=>document.body.classList.add('design-menu-open'));
  await page.locator('[data-drawer="quran"]').click();
  async function ready(n){
   await page.waitForFunction(n=>{
    const r=document.querySelector('#aqReader');
    return r?.dataset.page===String(n)&&r?.dataset.ready==='true'&&r.dataset.edition==='qcf2-font'&&!!r.querySelector('#adVerses .aq-qcf-word');
   },n,{timeout:45000});
  }
  async function jump(n){
   await page.evaluate(()=>document.body.classList.remove('quran-reader-immersive'));
   await page.locator('[data-qr-panel="index"]').click();
   await page.locator('#aqJump').fill(String(n));
   await page.locator('#aqJumpForm button').click();
   await ready(n);
  }
  async function swipe(direction){
   const bounds=await page.locator('#aqPaper').boundingBox(),y=bounds.y+bounds.height*.5;
   const xs=direction>0?[bounds.x+bounds.width*.18,bounds.x+bounds.width*.48]:
    [bounds.x+bounds.width*.72,bounds.x+bounds.width*.42];
   await page.mouse.move(xs[0],y);await page.mouse.down();
   await page.mouse.move(xs[1],y,{steps:5});await page.mouse.up();
  }
  async function verifyOpening(n){
   await ready(n);
   assert.ok(await page.locator('#adVerses').evaluate(el=>el.classList.contains('aq-qcf-opening')),
    'Opening layout class missing on page '+n);
   const layout=await page.locator('#aqPaper').evaluate(paper=>{
    const container=paper.querySelector('#adVerses');
    const frame=container.querySelector('.aq-qcf-opening-inner');
    const rect=el=>{const r=el.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height,b:r.bottom}};
    return {
     paper:rect(paper),frame:frame&&rect(frame),
     display:getComputedStyle(container).display,
     rowCount:frame?.children.length,
     title:frame?.querySelector('.aq-surah-info-name')?.textContent,
     basmala:!!frame?.querySelector('.aq-qcf-bismillah'),
     wordIds:[...new Set([...frame.querySelectorAll('.aq-qcf-word')].map(el=>Number(el.dataset.qrVerse)))],
     lines:[...frame.querySelectorAll('.aq-qcf-line')].map(line=>({...rect(line),clientW:line.clientWidth,scrollW:line.scrollWidth})),
     frameBackground:getComputedStyle(frame).backgroundColor
    };
   });
   assert.equal(layout.display,'flex','Opening Mushaf must be a vertically centered folio');
   assert.equal(layout.rowCount,8,'The opening pair must preserve the original eight printed rows');
   assert.ok(layout.title.includes(n===1?'الفاتحة':'البقرة'),'Wrong surah opening heading');
   assert.equal(layout.basmala,n===2,'Al-Baqarah needs its own Basmala; Al-Fatiha contains Basmala in first verse');
   assert.equal(layout.wordIds.length,n===1?7:5,'Missing or duplicate Quran verses in opening page '+n);
   assert.ok(Math.abs((layout.frame.y+layout.frame.h/2)-(layout.paper.y+layout.paper.h/2))<layout.paper.h*.075,
    'First two pages should be centered, not glued to the top: '+JSON.stringify(layout));
   assert.ok(layout.frame.h<layout.paper.h*.93,'Opening text and decoration must not fill or overflow screen');
   for(let i=0;i<layout.lines.length;i++){
    const line=layout.lines[i];
    assert.ok(line.scrollW<=line.clientW+6,'QCF line spills horizontally outside framed opening: '+JSON.stringify({n,i,line}));
    if(i)assert.ok(layout.lines[i-1].b<=line.y+2,
     'QCF opening verses overlap vertically: '+JSON.stringify({n,i,prev:layout.lines[i-1],line}));
   }
   console.log('PASS opening Quran page '+n+' '+layout.title+': eight authentic rows centered, '+layout.wordIds.length+' verses, no glyph overflow');
  }
  for(const [w,h] of [[390,844],[412,915],[320,568]]){
   await page.setViewportSize({width:w,height:h});
   await jump(1);await verifyOpening(1);
   await page.waitForFunction(()=>!!document.querySelector('#aqPaper .aq-gallery-neighbor'),null,{timeout:30000});
   await swipe(1);await verifyOpening(2);
   await jump(2);await verifyOpening(2);
   await swipe(1);await ready(3);
   assert.equal(await page.locator('#adVerses .aq-qcf-opening-inner').count(),0,
    'Standard 15-line pages must remain unchanged');
   await swipe(-1);await verifyOpening(2);
   console.log('PASS QCF opening 1/2 and normal page 3 swipes on '+w+'x'+h);
  }
  assert.deepEqual(errors,[],'Unexpected browser JavaScript errors');
  console.log('PASS: opening Al-Fatiha and Al-Baqarah are centered, authentic and legible at three mobile viewport sizes');
 }finally{await browser?.close();server.kill();}
})().catch(e=>{console.error(e);process.exit(1);});
