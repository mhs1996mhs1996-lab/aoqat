const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os'),{spawn,execFileSync}=require('node:child_process');
(async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'aoqat-release-'));
 for(const name of ['index.html','js','css','data'])fs.cpSync(name,path.join(dir,name),{recursive:true});
 fs.mkdirSync(path.join(dir,'assets/fonts'),{recursive:true});fs.copyFileSync('assets/fonts/amiri-quran.ttf',path.join(dir,'assets/fonts/amiri-quran.ttf'));
 execFileSync('python3',['android-native/prepare-web-assets.py',dir]);
 const server=spawn('python3',['-m','http.server','8841'],{cwd:dir,stdio:'ignore'});let browser;
 try{
  await new Promise(r=>setTimeout(r,700));browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'/usr/bin/google-chrome',args:['--no-sandbox']});
  const page=await browser.newPage({viewport:{width:390,height:844},serviceWorkers:'block',timezoneId:'Asia/Baghdad'}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));await page.route('**/rest/**',r=>r.abort());
  await page.addInitScript(rows=>{
   window.testNativeCalls=[];window.AndroidNative={configureAdhan:()=>{},readAdhanSettings:()=>'{}',readPrayerAlarmSettings:()=>'{}',readPrayerRows:()=>JSON.stringify(rows),readIqamaAppearance:()=>'transparent',
    readPublishAlarmEnabled:()=>localStorage.testPublish==='1',readPublishSnoozeMinutes:()=>Number(localStorage.testSnooze||10),configurePublishSnoozeMinutes:n=>{localStorage.testSnooze=n},
    enableAlarm:()=>{localStorage.testPublish='1';testNativeCalls.push('enable')},disableAlarm:()=>{localStorage.testPublish='0';testNativeCalls.push('disable')},stopPublishAlarm:()=>{},
    openQibla:()=>{testNativeCalls.push('qibla')},sharePrayerImage:(data,name,id)=>{window.testImage={data,name};window.aoqatImageActionResult(id,true)},savePrayerImage:(data,name,id)=>{window.testSaved={data,name};window.aoqatImageActionResult(id,true)}};
  },JSON.parse(fs.readFileSync('data/prayer-times-offline.json')));
  await page.goto('http://127.0.0.1:8841',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.aoqatUIReady&&window.AoqatCalendars&&document.querySelector('#publishSnoozeMinutes'));
  assert.equal(await page.locator('#interfaceVisibilityControls .interface-visibility-btn.is-on').count(),4);
  assert.equal(await page.locator('#tomorrowAlarmEnable').getAttribute('aria-pressed'),'false');
  assert.deepEqual(await page.evaluate(()=>testNativeCalls),[]);
  await page.locator('#publishSnoozeMinutes').evaluate(el=>{el.value='7';el.dispatchEvent(new Event('change',{bubbles:true}))});assert.equal(await page.evaluate(()=>localStorage.testSnooze),'7');
  await page.locator('#tomorrowAlarmEnable').evaluate(b=>b.click());assert.equal(await page.evaluate(()=>localStorage.testPublish),'1');
  await page.locator('#tomorrowAlarmEnable').evaluate(b=>b.click());assert.equal(await page.evaluate(()=>localStorage.testPublish),'0');
  await page.evaluate(()=>document.body.classList.add('design-menu-open'));await page.locator('[data-drawer="qibla"]').click();assert.ok(await page.evaluate(()=>testNativeCalls.includes('qibla')));
  await page.evaluate(()=>document.body.classList.add('design-menu-open'));await page.locator('[data-drawer="calendar"]').click();
  await page.waitForSelector('[data-calendar-year]');assert.equal(await page.locator('[data-calendar-year]').count(),5);
  await page.locator('[data-calendar-year="2026"]').click();await page.waitForSelector('[data-calendar-month]');assert.equal(await page.locator('[data-calendar-month]').count(),12);
  await page.locator('[data-calendar-month="11"]').click();
  const share=page.getByRole('button',{name:'مشاركة التقويم',exact:true});await share.waitFor();
  await page.waitForFunction(()=>document.querySelector('.mc-preview')?.naturalWidth===1080);
  await share.click();await page.waitForFunction(()=>!!window.testImage);
  assert.ok(await page.evaluate(()=>testImage.data.startsWith('data:image/png;base64,')));
  await page.getByRole('button',{name:'حفظ الصورة على الهاتف',exact:true}).click();await page.waitForFunction(()=>!!window.testSaved);
  assert.equal(await page.evaluate(()=>testImage.data===testSaved.data),true);
  await page.evaluate(()=>localStorage.setItem('aoqatInterfaceVisibilityV1',JSON.stringify({clock:false,date:true,adhan:true,iqama:true})));
  await page.reload({waitUntil:'domcontentloaded'});await page.waitForFunction(()=>window.aoqatUIReady&&document.querySelector('#publishSnoozeMinutes'));
  assert.equal(await page.locator('#interfaceVisibilityControls .interface-visibility-btn').first().getAttribute('aria-pressed'),'false');
  assert.equal(await page.locator('#tomorrowAlarmEnable').getAttribute('aria-pressed'),'false');assert.equal(await page.locator('#publishSnoozeMinutes').inputValue(),'7');
  assert.deepEqual(errors,[]);console.log('APK calendars, native Qibla, default visible interface, persisted custom visibility, publish disabled and configurable snooze passed');
 }finally{await browser?.close();server.kill();}
})().catch(e=>{console.error(e);process.exitCode=1});
