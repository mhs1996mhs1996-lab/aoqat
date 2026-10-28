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
  async function verifyOpening(n,paperViewportHeight){
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
     heading:container.querySelector('.aq-qcf-opening-top')&&rect(container.querySelector('.aq-qcf-opening-top')),
     title:container.querySelector('.aq-qcf-opening-top .aq-surah-info-name')?.textContent,
     count:container.querySelector('.aq-qcf-opening-top .aq-surah-info-count')?.textContent,
     kind:container.querySelector('.aq-qcf-opening-top .aq-surah-info-kind')?.textContent,
     ornaments:container.querySelectorAll('.aq-qcf-opening-top .aq-qcf-opening-art .aq-qcf-floral').length,
     joinedArtwork:container.querySelector('.aq-qcf-opening-art')&&rect(container.querySelector('.aq-qcf-opening-art')),
     pastedCornerCount:container.querySelectorAll('.aq-qcf-opening-corner').length,
     headerBackground:getComputedStyle(container.querySelector('.aq-qcf-opening-info')).backgroundColor,
     headerCount:container.querySelectorAll('.aq-qcf-opening-top .aq-surah-info-clean').length,
     metadata:[...container.querySelectorAll('.aq-qcf-opening-top .aq-surah-info-clean>span')].map(el=>({
       text:el.textContent,rect:rect(el),scrollWidth:el.scrollWidth,clientWidth:el.clientWidth,visibility:getComputedStyle(el).visibility
     })),
     firstLine:frame?.querySelector('.aq-qcf-line')&&rect(frame.querySelector('.aq-qcf-line')),
     basmala:!!frame?.querySelector('.aq-qcf-bismillah'),
     basmalaStyle:frame?.querySelector('.aq-qcf-bismillah')&&{
       fontSize:parseFloat(getComputedStyle(frame.querySelector('.aq-qcf-bismillah')).fontSize),
       fontWeight:getComputedStyle(frame.querySelector('.aq-qcf-bismillah')).fontWeight,
       stroke:parseFloat(getComputedStyle(frame.querySelector('.aq-qcf-bismillah')).webkitTextStrokeWidth)||0,
       bounds:rect(frame.querySelector('.aq-qcf-bismillah')),
       scrollWidth:frame.querySelector('.aq-qcf-bismillah').scrollWidth,
       clientWidth:frame.querySelector('.aq-qcf-bismillah').clientWidth
     },
     firstLineFont:parseFloat(getComputedStyle(frame.querySelector('.aq-qcf-line')).fontSize),
     wordIds:[...new Set([...frame.querySelectorAll('.aq-qcf-word')].map(el=>Number(el.dataset.qrVerse)))],
     lines:[...frame.querySelectorAll('.aq-qcf-line')].map(line=>({...rect(line),clientW:line.clientWidth,scrollW:line.scrollWidth})),
     frameBackground:getComputedStyle(frame).backgroundColor
    };
   });
   assert.equal(layout.display,'grid','Opening page needs independent top surah header and centered Quran verses');
   assert.equal(layout.rowCount,7,'Keep the seven Quran content rows separate from the top metadata header');
   assert.ok(layout.title.includes(n===1?'الفاتحة':'البقرة'),'Wrong opening surah name');
   assert.equal(layout.count,n===1?'٧ آية':'٢٨٦ آية','Do not delete the authentic number of surah verses');
   assert.equal(layout.kind,n===1?'مكية':'مدنية','Do not delete Makki/Madani classification');
   assert.equal(layout.headerCount,1,'Keep ONE metadata frame at the TOP, never duplicate surah banners');
   assert.equal(layout.metadata.length,3,'Opening header must display all three surah information fields');
   assert.ok(layout.metadata.every(m=>m.rect.w>20&&m.rect.h>10&&m.visibility==='visible'&&
     m.scrollWidth<=m.clientWidth+2),
    'Metadata must be readable and not visually clipped: '+JSON.stringify(layout.metadata));
   const expectedHeaderHeight=h=>h<=600?42:55;
   assert.ok(layout.heading.h<=expectedHeaderHeight(paperViewportHeight)+1,
      'The surah plaque should be compact vertically while retaining full width: '+JSON.stringify(layout));
   assert.equal(layout.ornaments,2,'The integrated ornament must have two mirrored floral wings');
   assert.equal(layout.pastedCornerCount,0,'The banner must not contain pasted-on corner flowers');
   assert.ok(layout.joinedArtwork&&Math.abs(layout.heading.x-layout.joinedArtwork.x)<2&&
     Math.abs(layout.heading.w-layout.joinedArtwork.w)<2&&
     Math.abs(layout.heading.h-layout.joinedArtwork.h)<2,
    'The ornamental artwork must be the entire surah container, not a small sticker: '+JSON.stringify(layout));
   // On tiny phones the three real labels must stay within the central
   // cartouche (19%–81% of the bar), outside the floral wings.
   assert.ok(layout.metadata.every(m=>m.rect.x>=layout.heading.x+layout.heading.w*.18-2&&
     m.rect.x+m.rect.w<=layout.heading.x+layout.heading.w*.82+2),
     'Surah data intrudes into floral wings: '+JSON.stringify(layout.metadata));
   assert.ok(layout.heading.y>=layout.paper.y-2&&layout.heading.y<layout.paper.y+28,
    'Metadata frame MUST stay at the TOP of the Mushaf page, not move to the middle: '+JSON.stringify(layout));
   assert.ok(layout.heading.b+15<layout.firstLine.y,'Opening metadata must stay clear of the centered verses');
   assert.equal(layout.basmala,n===2,'Al-Baqarah needs its own Basmala; Al-Fatiha contains Basmala in first verse');
   if(n===2){
     // The previous 700 synthetic bold + stroke made the Baqarah Basmala
     // visibly much heavier than Al-Fatiha and the actual QCF verse words.
     assert.equal(layout.basmalaStyle.fontWeight,'400',
       'Al-Baqarah Basmala must use regular weight like the Quran lines');
     assert.ok(layout.basmalaStyle.stroke<=.01,
       'Do not artificially outline the Basmala while Quran glyphs have no text stroke');
     assert.ok(layout.basmalaStyle.fontSize>=28&&layout.basmalaStyle.fontSize<=36,
       'Keep Al-Baqarah Basmala proportionate to surrounding QCF verses: '+JSON.stringify(layout.basmalaStyle));
     assert.ok(layout.basmalaStyle.scrollWidth<=layout.basmalaStyle.clientWidth+3,
       'Basmala must remain fully visible on narrow screens');
   }
   assert.equal(layout.wordIds.length,n===1?7:5,'Missing or duplicate Quran verses in opening page '+n);
   assert.ok(Math.abs((layout.frame.y+layout.frame.h/2)-(layout.paper.y+layout.paper.h/2))<layout.paper.h*.15,
    'ONLY the Quran text should be visually centered in the opening page: '+JSON.stringify(layout));
   assert.ok(layout.firstLine.y>layout.heading.b+14,'Opening text must begin below the decorative banner');
   assert.ok(layout.frame.h<layout.paper.h*.93,'Opening text and decoration must not fill or overflow screen');
   assert.ok(layout.frame.b<=layout.paper.b+8,'Opening verses must remain inside the page area');
   for(let i=0;i<layout.lines.length;i++){
    const line=layout.lines[i];
    assert.ok(line.scrollW<=line.clientW+6,'QCF line spills horizontally outside framed opening: '+JSON.stringify({n,i,line}));
    if(i)assert.ok(layout.lines[i-1].b<=line.y+2,
     'QCF opening verses overlap vertically: '+JSON.stringify({n,i,prev:layout.lines[i-1],line}));
   }
   console.log('PASS opening Quran page '+n+' '+layout.title+': top metadata '+layout.count+'/'+layout.kind+', '+layout.wordIds.length+' authentic verses centered, no glyph overflow');
  }
  for(const [w,h] of [[390,844],[412,915],[320,568]]){
   await page.setViewportSize({width:w,height:h});
   await jump(1);await verifyOpening(1,h);
   await page.waitForFunction(()=>!!document.querySelector('#aqPaper .aq-gallery-neighbor'),null,{timeout:30000});
   await swipe(1);await verifyOpening(2,h);
   await jump(2);await verifyOpening(2,h);
   await swipe(1);await ready(3);
   assert.equal(await page.locator('#adVerses .aq-qcf-opening-inner').count(),0,
    'Standard 15-line pages must remain unchanged');
   await swipe(-1);await verifyOpening(2,h);
   console.log('PASS QCF opening 1/2 and normal page 3 swipes on '+w+'x'+h);
  }
  assert.deepEqual(errors,[],'Unexpected browser JavaScript errors');
  console.log('PASS: opening Al-Fatiha and Al-Baqarah keep surah metadata at TOP while only Quran text stays CENTERED at three mobile sizes');
 }finally{await browser?.close();server.kill();}
})().catch(e=>{console.error(e);process.exit(1);});
