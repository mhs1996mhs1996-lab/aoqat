const {chromium}=require('playwright');
const {readFileSync}=require('node:fs');
const {gunzipSync}=require('node:zlib');
const {spawn}=require('node:child_process');
const manifest=JSON.parse(gunzipSync(readFileSync('experiments/qcf604-web-verse-layouts.json.gz')).toString('utf8'));
for(const p of [1,2]){
 console.log('QCF_SOURCE_PAGE_'+p+'='+JSON.stringify(manifest.pages[String(p)].lines.map((row,index)=>({
  index,heading:row.s||null,basmala:!!row.b,
  words:row.v?.map(w=>({verseIndex:w[0],codepoints:[...w[1]].map(c=>c.codePointAt(0).toString(16)),end:!!w[2]}))||[]
 }))));
}
(async()=>{
 let browser,server=spawn('python3',['-m','http.server','8799'],{stdio:'ignore'});
 try{
 await new Promise(r=>setTimeout(r,800));
 browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'/usr/bin/google-chrome',args:['--no-sandbox']});
 const page=await browser.newPage({viewport:{width:390,height:844},serviceWorkers:'block'});
 await page.route('**/rest/v1/annual_prayer_times**',route=>route.fulfill({json:[{gregorian_month:10,gregorian_day:28,fajr:'4:45',sunrise:'6:06',dhuhr:'11:59',asr:'3:20',maghrib:'5:50',isha:'7:10'}]}));
 await page.goto('http://127.0.0.1:8799',{waitUntil:'domcontentloaded'});
 await page.locator('[data-drawer="quran"]').waitFor({state:'attached'});
 await page.evaluate(()=>document.body.classList.add('design-menu-open'));
 await page.locator('[data-drawer="quran"]').click();
 for(const n of [1,2]){
  if(n===2){await page.locator('[data-qr-panel="index"]').click();await page.locator('#aqJump').fill(String(n));await page.locator('#aqJumpForm button').click();}
  await page.waitForFunction(n=>{const r=document.querySelector('#aqReader');return r?.dataset.page===String(n)&&r?.dataset.ready==='true'&&r.dataset.edition==='qcf2-font'&&r.querySelectorAll('#adVerses .aq-qcf-line').length>=6},n,{timeout:45000});
  const data=await page.evaluate(()=>{
   const root=document.querySelector('#adVerses');
   const lines=[...root.querySelectorAll('.aq-qcf-line')];
   return {rows:lines.map((line,index)=>({
    index,fontSize:getComputedStyle(line).fontSize,fontFamily:getComputedStyle(line).fontFamily,
    fontWeight:getComputedStyle(line).fontWeight,width:line.clientWidth,scrollWidth:line.scrollWidth,words:line.children.length,
    text:[...line.children].slice(0,2).map(x=>[...x.textContent].map(c=>c.codePointAt(0).toString(16)))
   })),basmala:(()=>{let e=root.querySelector('.aq-qcf-bismillah');return e?{text:e.textContent,font:getComputedStyle(e).font,fontFamily:getComputedStyle(e).fontFamily,size:getComputedStyle(e).fontSize}:null})(),
    fonts:[...document.fonts].filter(f=>f.family.startsWith('AqQcfV2')).map(f=>({family:f.family,status:f.status}))};
  });
  console.log('QCF_LIVE_PAGE_'+n+'='+JSON.stringify(data));
 }
 }finally{await browser?.close();server.kill();}
})().catch(e=>{console.error(e);process.exit(1);});
