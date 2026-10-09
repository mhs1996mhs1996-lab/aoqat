const {chromium}=require('playwright');
const {spawn,execFileSync}=require('node:child_process');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),assert=require('node:assert/strict');
(async()=>{
 const apk=fs.mkdtempSync(path.join(os.tmpdir(),'aoqat-modal-apk-'));
 for(const n of ['js','css','assets','data','pages','index.html','manifest.webmanifest'])fs.cpSync(n,path.join(apk,n),{recursive:true});
 execFileSync('python3',['android-native/prepare-web-assets.py',apk]);
 fs.copyFileSync('android-native/apk-overrides/android-ui-fixes.js',path.join(apk,'js/android-ui-fixes.js'));
 const index=path.join(apk,'index.html');fs.writeFileSync(index,fs.readFileSync(index,'utf8').replace('</body>','<script src="js/android-ui-fixes.js"></script></body>'));
 const servers=[spawn('python3',['-m','http.server','8775'],{stdio:'ignore'}),spawn('python3',['-m','http.server','8776'],{cwd:apk,stdio:'ignore'})];let browser;
 try{
  await new Promise(r=>setTimeout(r,700));browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'/usr/bin/google-chrome',args:['--no-sandbox']});
  for(const native of [false,true]){
   const page=await browser.newPage({viewport:{width:390,height:740},hasTouch:true,timezoneId:'Asia/Baghdad',serviceWorkers:'block'});const errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.addInitScript(({native,q,m})=>{
    const rows=[{gregorian_month:10,gregorian_day:7,fajr:'4:49',dhuhr:'11:57',asr:'3:15',maghrib:'5:45',isha:'7:05'},{gregorian_month:10,gregorian_day:8,fajr:'4:50'}];
    const ad={enabled:true,sound:'4',volume:34};const pa={enabled:true,items:{fajr:{enabled:true,label:'الفجر',repeat:'daily',duration:5,snooze:10,count:3}}};
    localStorage.setItem('aoqatAdhanV1',JSON.stringify(ad));localStorage.setItem('aoqatAdhanRows',JSON.stringify(rows));localStorage.setItem('aoqatPrayerAlarmV1',JSON.stringify(pa));
    if(native){window.__nativeAd=ad;window.__nativePa=pa;window.AndroidNative={readAdhanSettings:()=>JSON.stringify(window.__nativeAd),configureAdhan:s=>window.__nativeAd=JSON.parse(s),readPrayerAlarmSettings:()=>JSON.stringify(window.__nativePa),configurePrayerAlarm:s=>window.__nativePa=JSON.parse(s),readPrayerRows:()=>JSON.stringify(rows),cachePrayerRows:()=>{},readQuranAsset:n=>JSON.stringify(n==='quran.json'?q:m),stopAdhan:()=>{},previewAdhan:()=>{},pinPrayerWidget:()=>{},chooseAdhanAudio:()=>{},adhanPermissions:()=>{},openQibla:()=>{},previewPrayerAlarm:()=>{},stopPrayerAlarm:()=>{},choosePrayerAlarmTone:()=>{}};}
   },{native,q:JSON.parse(fs.readFileSync('assets/quran.json')),m:JSON.parse(fs.readFileSync('assets/quran-pages.json'))});
   await page.route('**/rest/v1/annual_prayer_times**',r=>r.fulfill({json:[]}));await page.goto('http://127.0.0.1:'+(native?8776:8775),{waitUntil:'domcontentloaded'});
   await page.waitForSelector('[data-drawer="adhanIqama"]',{state:'attached'});await page.waitForSelector('#paMaster',{state:'attached'});
   await page.evaluate(()=>document.body.classList.add('design-menu-open'));await page.locator('[data-drawer="adhanIqama"]').click();
   await page.getByRole('button',{name:'🔊 الأذان والتنبيه',exact:true}).click();
   assert.equal(await page.locator('#adhanServicesDialog').isVisible(),true);
   assert.equal(await page.locator('#adhanPanel').evaluate(e=>[...e.querySelectorAll('.design-popup-close')].some(b=>b.getClientRects().length)),false);
   assert.equal(await page.locator('#adhanPanel').evaluate(e=>e.closest('#adhanServicesDialog')!==null),true);
   if(await page.locator('#paMethodOpen').count()&&!await page.locator('#paMethodPanel').isVisible())await page.locator('#paMethodOpen').click();await page.locator('#paOpen').click();
   for(const id of ['adEnable','paMaster'])assert.equal(await page.locator('#'+id).evaluate(e=>getComputedStyle(e).backgroundColor),'rgb(39, 128, 82)');
   await page.locator('#paMaster').click();assert.equal(await page.locator('#paMaster').evaluate(e=>getComputedStyle(e).backgroundColor),'rgb(133, 142, 139)');await page.locator('#paMaster').click();
   await page.locator('#prayerAlarmPanel > .ad-leaf-head button').click();
   for(const size of [{width:320,height:640},{width:390,height:740},{width:430,height:860}]){
    await page.setViewportSize(size);
    const layout=await page.locator('#adhanServicesDialog').evaluate(e=>{const r=e.getBoundingClientRect(),p=document.getElementById('adhanPanel'),b=document.getElementById('adhanServicesBody');return {x:r.x,y:r.y,w:r.width,h:r.height,overflow:b.scrollWidth>b.clientWidth+1,panelOverflow:p.scrollWidth>p.clientWidth+1,font:getComputedStyle(document.getElementById('adEnable')).fontSize}});
    assert.deepEqual({x:layout.x,y:layout.y,w:layout.w,h:layout.h},{x:0,y:0,w:size.width,h:size.height});assert.equal(layout.overflow,false);assert.equal(layout.panelOverflow,false);assert.equal(layout.font,'13px');
   }
   if(await page.locator('#paMethodOpen').count()&&!await page.locator('#paMethodPanel').isVisible())await page.locator('#paMethodOpen').click();await page.locator('#paOpen').click();await page.locator('[data-pa-edit="fajr"]').click();assert.equal(await page.locator('#paDays').isVisible(),false);assert.equal(await page.locator('#paDeleteRow').isVisible(),false);
   await page.locator('#paRepeat').selectOption('days');assert.equal(await page.locator('#paDays').isVisible(),true);
   const days=await page.locator('#paDays').boundingBox();assert.ok(days.height<140,JSON.stringify(days));
   const focusedHeader=await page.locator('#adhanServicesBack').boundingBox();assert.ok(focusedHeader.y>=0&&focusedHeader.y+focusedHeader.height<=80,JSON.stringify(focusedHeader));
   assert.equal(await page.locator('#adhanServicesDialog').evaluate(e=>e.scrollTop),0);
   await page.screenshot({path:'/tmp/aoqat-adhan-modal-'+(native?'apk':'web')+'.png'});
   await page.locator('#paRepeat').selectOption('once');assert.equal(await page.locator('#paDays').isVisible(),false);assert.equal(await page.locator('#paDeleteRow').isVisible(),true);
   await page.locator('#paDuration').fill('7');await page.locator('#paSave').click();
   await page.locator('#adhanServicesBody').evaluate(e=>e.scrollTop=e.scrollHeight);
   const header=await page.locator('#adhanServicesBack').boundingBox();assert.ok(header.y>=0&&header.y+header.height<=80,JSON.stringify(header));
   await page.evaluate(()=>window.aoqatCloseSettingsLeaves?.());await page.locator('#adhanServicesBack').click();assert.equal(await page.locator('#adhanServicesDialog').isVisible(),false);
   assert.equal(await page.locator('#webSubTitle').textContent(),'بيانات الاذان والإقامة');assert.equal(await page.locator('aside.sidebar').evaluate(e=>e.inert),false);
   await page.getByRole('button',{name:'🔊 الأذان والتنبيه',exact:true}).click();
   if(await page.locator('#paMethodOpen').count()&&!await page.locator('#paMethodPanel').isVisible())await page.locator('#paMethodOpen').click();await page.locator('#paOpen').click();await page.locator('[data-pa-edit="fajr"]').click();assert.equal(await page.locator('#paDuration').inputValue(),'7');
   assert.equal(await page.locator('[data-setting="volume"]').inputValue(),'34');
   await page.evaluate(()=>window.aoqatCloseSettingsLeaves?.());await page.keyboard.press('Escape');assert.equal(await page.locator('#adhanServicesDialog').isVisible(),false);
   await page.locator('.web-back').click();assert.equal(await page.locator('[data-drawer="datePrayer"]').isVisible(),true);
   assert.deepEqual(errors,[]);await page.close();console.log((native?'APK':'Web')+' full-screen adhan modal, compact controls, hidden repeat fields, fixed back and unchanged settings passed');
  }
 }finally{await browser?.close();servers.forEach(s=>s.kill());fs.rmSync(apk,{recursive:true,force:true});}
})().catch(e=>{console.error(e);process.exitCode=1});
