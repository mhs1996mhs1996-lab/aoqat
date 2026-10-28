const {chromium}=require('playwright');
const {spawn}=require('node:child_process');
(async()=>{
 const server=spawn('python3',['-m','http.server','8798'],{stdio:'ignore'});let browser;
 try{
  await new Promise(r=>setTimeout(r,850));
  browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'/usr/bin/google-chrome',args:['--no-sandbox']});
  const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:1,serviceWorkers:'block'});
  const page=await context.newPage();
  await page.route('**/rest/v1/annual_prayer_times**',r=>r.fulfill({json:[{
   gregorian_month:10,gregorian_day:28,fajr:'4:45',sunrise:'6:06',dhuhr:'11:59',asr:'3:20',maghrib:'5:50',isha:'7:10'
  }]}));
  await page.goto('http://127.0.0.1:8798',{waitUntil:'domcontentloaded'});
  await page.locator('[data-drawer="quran"]').waitFor({state:'attached'});
  await page.evaluate(()=>document.body.classList.add('design-menu-open'));
  await page.locator('[data-drawer="quran"]').click();
  for(const n of [1,2]){
   if(n===2){
    await page.locator('[data-qr-panel="index"]').click();
    await page.locator('#aqJump').fill('2');
    await page.locator('#aqJumpForm button').click();
   }
   await page.waitForFunction(n=>{
    const el=document.querySelector('#aqReader');
    return el?.dataset.page===String(n)&&el.dataset.ready==='true'&&
       el.querySelector('.aq-qcf-opening-inner .aq-qcf-line');
   },n,{timeout:45000});
   await page.evaluate(()=>document.body.classList.add('quran-reader-immersive'));
   await page.locator('#adVerses').screenshot({path:'/tmp/qcf-opening-'+n+'.jpg',type:'jpeg',quality:45,animations:'disabled'});
   const screenshot=await page.locator('#aqPaper').screenshot({type:'jpeg',quality:46,animations:'disabled'});
   console.log('QCF_PAGE_'+n+'_IMAGE='+screenshot.toString('base64'));
   const geometry=await page.locator('#aqPaper').evaluate(p=>{
     const rect=x=>{const r=x.getBoundingClientRect();return {top:r.top,bottom:r.bottom,height:r.height};};
     return {paper:rect(p),block:rect(p.querySelector('.aq-qcf-opening-inner')),heading:rect(p.querySelector('.aq-qcf-opening-top')),count:p.querySelector('.aq-qcf-opening-top .aq-surah-info-count')?.textContent,kind:p.querySelector('.aq-qcf-opening-top .aq-surah-info-kind')?.textContent,first:rect(p.querySelector('.aq-qcf-line')),last:rect([...p.querySelectorAll('.aq-qcf-line')].at(-1))};
   });
   console.log('QCF_PAGE_'+n+'_GEOMETRY='+JSON.stringify(geometry));
   await page.evaluate(()=>document.body.classList.remove('quran-reader-immersive'));
  }
 }finally{await browser?.close();server.kill();}
})().catch(e=>{console.error(e);process.exit(1);});