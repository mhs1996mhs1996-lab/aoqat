const {chromium}=require('playwright');
const {spawn}=require('node:child_process');
const assert=require('node:assert/strict');
(async()=>{
 const server=spawn('python3',['-m','http.server','8767'],{stdio:'ignore'});let browser;
 try{
  await new Promise(r=>setTimeout(r,700));
  browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'/usr/bin/google-chrome',args:['--no-sandbox']});
  const page=await browser.newPage({viewport:{width:390,height:844}});const errors=[];page.on('pageerror',e=>{errors.push(e.stack);console.log('PAGE ERROR',e.stack);});
  await page.route('**/rest/v1/annual_prayer_times**',r=>r.fulfill({json:[{gregorian_month:10,gregorian_day:1,fajr:'4:43',sunrise:'6:04',dhuhr:'11:59',asr:'3:22',maghrib:'5:53',isha:'7:13'}]}));
  await page.goto('http://127.0.0.1:8767',{waitUntil:'domcontentloaded'});
  await page.waitForSelector('#designRef',{state:'visible'});
  await page.waitForFunction(()=>document.querySelectorAll('[data-unified-dot]').length===4&&document.getElementById('saveDesignAdjustments'));
  await page.waitForTimeout(2200);
  assert.equal(await page.locator('.design-carousel-status').textContent(),'التصميم 1 من 4');
  assert.equal(await page.locator('#designRef .ref-verse-source').evaluate(e=>getComputedStyle(e).fontSize),'19px');
  await page.evaluate(()=>{
   const d=document.getElementById('designRef');
   const card=d.querySelector('.ref-date-card.greg');
   assertBounds=()=>{const c=card.getBoundingClientRect(),p=d.querySelector('.ref-prayers').getBoundingClientRect();if(c.bottom>p.top)throw Error('Date card overlaps prayer rows');};assertBounds();
   const field=d.querySelector('[data-field="gmonth"]');field.style.color='rgb(17, 85, 153)';field.style.fontSize='30px';field.dataset.previewX='4';field.style.transform='translate(4px, 0px)';
   document.getElementById('saveDesignAdjustments').click();
  });
  // Legacy records used a mutable editable-list index. Insert an unrelated styled
  // node and reverse slides before reloading; each record must still match its design.
  await page.evaluate(()=>{
   const key='prayerDesignerUniversalSavedStateV2';const data=JSON.parse(localStorage.getItem(key));
   localStorage.setItem(key,JSON.stringify(data.reverse()));
   localStorage.setItem('aoqatIqamaMinutesV1',JSON.stringify({fajr:25,isha:15}));
   localStorage.setItem('aoqatAfterIqamaMinutesV1',JSON.stringify({fajr:20,isha:30}));
  });
  await page.reload({waitUntil:'domcontentloaded'});await page.waitForSelector('#designRef',{state:'visible'});await page.waitForTimeout(2400);
  const saved=await page.locator('#designRef [data-field="gmonth"]').evaluate(e=>({color:getComputedStyle(e).color,size:getComputedStyle(e).fontSize,transform:e.style.transform}));
  assert.equal(saved.color,'rgb(17, 85, 153)');assert.equal(saved.size,'30px');assert.equal(saved.transform,'translate(4px, 0px)');
  assert.equal(await page.locator('#designRef .ref-verse-source').evaluate(e=>getComputedStyle(e).fontSize),'19px');
  assert.deepEqual(await page.evaluate(()=>JSON.parse(localStorage.aoqatIqamaMinutesV1)),{fajr:25,isha:15});
  assert.deepEqual(await page.evaluate(()=>JSON.parse(localStorage.aoqatAfterIqamaMinutesV1)),{fajr:20,isha:30});
  await page.locator('#designRef').screenshot({path:'/tmp/aoqat-design-restored.png'});
  await page.evaluate(()=>document.querySelector('[data-unified-next]').click());await page.waitForTimeout(200);
  console.log('Navigation state',await page.evaluate(()=>({status:document.querySelector('.design-carousel-status')?.textContent,dirty:window.PrayerFontDesignManager?.isDirty(),active:window.__prayerActiveDesignElement?.id,modal:document.getElementById('fontSaveWarning')?.className,slides:[...document.querySelectorAll('.design-slide')].map(s=>({id:s.firstElementChild.id,style:s.getAttribute('style'),disabled:s.dataset.designDisabled}))})));
  await page.screenshot({path:'/tmp/aoqat-design-navigation.png',fullPage:true});
  assert.equal(await page.locator('#design2').isVisible(),true);
  await page.evaluate(()=>document.querySelector('[data-unified-prev]').click());
  // Saving all designs must not reapply one design's font sizes to another.
  assert.equal(await page.locator('#designRef .ref-verse-source').evaluate(e=>getComputedStyle(e).fontSize),'19px');
  assert.deepEqual(errors,[]);
  console.log('Four existing designs, date layout, semantic saved state and iqama preference preservation passed');
 }finally{await browser?.close();server.kill();}
})().catch(e=>{console.error(e);process.exit(1)});
