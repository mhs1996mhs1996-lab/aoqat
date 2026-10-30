const {chromium}=require('playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {spawn,execFileSync}=require('node:child_process');
(async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'aoqat-day-'));
 for(const name of ['index.html','js','css','data'])fs.cpSync(name,path.join(dir,name),{recursive:true});
 execFileSync('python3',['android-native/prepare-web-assets.py',dir]);
 fs.copyFileSync('android-native/apk-overrides/android-ui-fixes.js',path.join(dir,'js/android-ui-fixes.js'));
 fs.appendFileSync(path.join(dir,'index.html'),'<script src="js/android-ui-fixes.js"></script>');
 const rows=JSON.parse(fs.readFileSync('data/prayer-times-offline.json'));
 const server=spawn('python3',['-m','http.server','8793'],{cwd:dir,stdio:'ignore'});let browser;
 try{
 await new Promise(r=>setTimeout(r,700));browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'/usr/bin/google-chrome',args:['--no-sandbox']});
 const page=await browser.newPage({timezoneId:'Asia/Baghdad',serviceWorkers:'block'});
 await page.clock.install({time:new Date('2026-10-12T19:40:00+03:00')});
 await page.addInitScript(rows=>{localStorage.setItem('prayerAutoTomorrowEnabledV1','1');window.AndroidNative={readPrayerRows:()=>JSON.stringify(rows),readIqamaAppearance:()=>localStorage.getItem('testAppearance')||'transparent',configureIqamaAppearance:m=>localStorage.setItem('testAppearance',m)};},rows);
 // Network never returns any prayer row. Both initial load and rollover must be local.
 await page.route('**/rest/**',r=>r.abort());
 await page.goto('http://127.0.0.1:8793',{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>window.aoqatUIReady);
 async function verify(day){
 const expected=rows.find(r=>r.gregorian_month===10&&r.gregorian_day===day);
 await page.waitForFunction(d=>document.getElementById('gregorianDay').value===String(d),day);
 assert.deepEqual(await page.evaluate(()=>['fajr','sunrise','dhuhr','asr','maghrib','isha'].map(id=>document.getElementById(id).value)),['fajr','sunrise','dhuhr','asr','maghrib','isha'].map(id=>expected[id]));
 }
 await verify(13);
 // All next-day values must exist even before the user opens any lazy picker.
 for(const id of ['fajr','sunrise','dhuhr','asr','maghrib','isha'])assert.ok(await page.locator('#'+id+' option').count()<10);
 await page.locator('#iqamaAppearance').evaluate(e=>{e.value='dark';e.dispatchEvent(new Event('change',{bubbles:true}));});
 await page.reload({waitUntil:'domcontentloaded'});await page.waitForFunction(()=>window.aoqatUIReady);await verify(13);
 assert.equal(await page.locator('#iqamaAppearance').inputValue(),'dark');
 await page.clock.setSystemTime(new Date('2026-10-13T00:00:01+03:00'));await page.clock.runFor(60000);await verify(13);
 await page.clock.setSystemTime(new Date('2026-10-13T20:00:00+03:00'));await page.clock.runFor(60000);await verify(14);
 // The APK calendar icon must open all 12 monthly calendars using native offline prayer rows.
 await page.locator('#designSideMenuBtn').click();
 await page.waitForSelector('[data-drawer="calendar"]');
 await page.locator('[data-drawer="calendar"]').click();
 await page.waitForSelector('#monthlyCalendars.mc-home');
 assert.ok(await page.locator('#monthlyCalendars [data-calendar-year]').count()>=5);
 const year=page.locator('#monthlyCalendars [data-calendar-year]').first();
 await year.click();
 await page.waitForSelector('#monthlyCalendars.mc-year-view');
 assert.ok(await page.locator('#monthlyCalendars').innerText().then(t=>t.includes('كانون')||t.includes('شباط')));
 // Prevent the exact APK screenshot regression: no broken image/alt preview
 // may appear while the monthly calendar canvas is still drawing.
 await page.locator('#monthlyCalendars [data-calendar-month="2"]').click();
 await page.waitForSelector('#monthlyCalendars .mc-preview',{state:'attached'});
 assert.equal(await page.locator('#monthlyCalendars .mc-preview').evaluate(img=>!img.getAttribute('src')?getComputedStyle(img).display==='none':true),true);
 await page.waitForFunction(()=>{
   const img=document.querySelector('#monthlyCalendars .mc-preview');
   return img?.complete&&img.naturalWidth>0&&getComputedStyle(img).display!=='none';
 },null,{timeout:45000});
 assert.equal(await page.getByRole('button',{name:'حفظ الصورة على الهاتف'}).isEnabled(),true);
 assert.ok(await page.locator('#monthlyCalendars .mc-preview').evaluate(img=>img.naturalHeight>=1000));

 console.log('APK offline: initial next-day preview, midnight, next rollover, lazy picker values and saved notification appearance passed');
 }finally{if(browser)await browser.close();server.kill();fs.rmSync(dir,{recursive:true,force:true});}
})().catch(e=>{console.error(e);process.exit(1)});
